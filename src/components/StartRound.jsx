import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { prompts } from "../data/prompts.js";
import { recommendedFreeRound, trackForUser } from "../data/free-rounds.js";
import { navigate } from "../router.js";

const shortTitle = (title) => title.replace(/^Design (a |an )?/i, "").replace(/^./, (char) => char.toUpperCase());

export function StartRoundButton({ onStart, className = "btn btn-primary btn-lg", compact = false }) {
  const { status, user } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (status !== "signed-in") {
      setSessions([]);
      return undefined;
    }
    let cancelled = false;
    api.listSessions()
      .then(({ sessions: list }) => { if (!cancelled) setSessions(list); })
      .catch((error) => { if (!cancelled) console.error("[start-round] couldn't load practice history:", error); });
    return () => { cancelled = true; };
  }, [status]);

  const track = trackForUser(user);
  const promptFor = (id) => prompts.find((prompt) => prompt.id === id);
  const resumable = sessions
    .filter((session) => session.status === "in_progress")
    .map((session) => ({ session, prompt: promptFor(session.promptId) }))
    .filter(({ prompt }) => prompt && prompt.track === track && prompt.access === "free")
    .sort((a, b) => new Date(b.session.updatedAt) - new Date(a.session.updatedAt))[0];
  const recommended = recommendedFreeRound(user);

  function start() {
    if (status !== "signed-in") {
      navigate(`/signin?next=${encodeURIComponent("/start-free")}`);
      return;
    }
    if (!user?.onboarded) {
      navigate(`/welcome?next=${encodeURIComponent("/start-free")}`);
      return;
    }
    onStart(resumable?.prompt.id ?? recommended.id);
  }

  const label = resumable
    ? (compact ? "Resume" : `Resume: ${shortTitle(resumable.prompt.title)}`)
    : "Start free round";
  const arrow = compact ? 15 : 17;

  return (
    <button className={className} onClick={start}>
      {label}
      <ArrowRight size={arrow} className="nudge" />
    </button>
  );
}
