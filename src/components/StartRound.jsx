import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { prompts, tracks } from "../data/prompts.js";
import { DEFAULT_TRACK, levelForUser, recommendRounds, trackForUser } from "../data/free-rounds.js";
import { Link, navigate } from "../router.js";
import { trackPath } from "../seo.js";
import { trackIcon } from "./ui.jsx";

const TRACK_KEY = "designrounds:start-track";

// "Design a URL shortener" -> "URL shortener"
const shortTitle = (title) => title.replace(/^Design (a |an )?/i, "").replace(/^./, (char) => char.toUpperCase());

function readStoredTrack() {
  try { return window.localStorage.getItem(TRACK_KEY); } catch { return null; }
}

// "Start a free round": resumes a round in progress, otherwise opens a small picker
// (discipline, then two or three suggested free rounds) so nobody is dropped into a
// problem that doesn't match what they're preparing for.
export function StartRoundButton({ onStart, className = "btn btn-primary btn-lg" }) {
  const { status, user } = useAuth();
  const signedIn = status === "signed-in";
  const [sessions, setSessions] = useState(null);
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState(DEFAULT_TRACK);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!signedIn) { setSessions(null); return undefined; }
    let cancelled = false;
    api.listSessions().then(({ sessions: list }) => { if (!cancelled) setSessions(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [signedIn]);

  // Close on a click outside or Escape, returning focus to the button.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const findPrompt = (id) => prompts.find((prompt) => prompt.id === id);
  const resumable = (sessions ?? [])
    .filter((session) => session.status === "in_progress")
    .map((session) => ({ session, prompt: findPrompt(session.promptId) }))
    .filter(({ prompt }) => prompt && (prompt.access === "free" || user?.plan === "plus"))
    .sort((a, b) => new Date(b.session.updatedAt) - new Date(a.session.updatedAt))[0];

  if (resumable) {
    return (
      <button className={className} onClick={() => onStart(resumable.prompt.id)}>
        Resume: {shortTitle(resumable.prompt.title)} <ArrowRight size={17} className="nudge" />
      </button>
    );
  }

  function toggle() {
    if (!signedIn) {
      navigate(`/signin?next=${encodeURIComponent("/start-free")}`);
      return;
    }
    if (!open) {
      // The learner's last pick, else their profile's discipline, else backend.
      const preferred = readStoredTrack() || trackForUser(user);
      setTrack(tracks.some((item) => item.id === preferred) ? preferred : DEFAULT_TRACK);
    }
    setOpen(!open);
  }

  function choose(id) {
    setTrack(id);
    try { window.localStorage.setItem(TRACK_KEY, id); } catch { /* a convenience only */ }
  }

  const done = new Set((sessions ?? []).filter((session) => session.status === "completed").map((session) => session.promptId));
  const level = levelForUser(user);
  const rounds = recommendRounds(track, { done, level });
  const current = tracks.find((item) => item.id === track);
  const freeInTrack = prompts.filter((prompt) => prompt.track === track && prompt.access === "free").length;

  return (
    <div className="start-picker" ref={wrapRef}>
      <button ref={buttonRef} className={className} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        Start a free round <ArrowRight size={17} className="nudge" />
      </button>
      {open && (
        <div className="start-panel" id={panelId} role="dialog" aria-label="Choose a free round">
          <p className="start-panel-title">What are you preparing for?</p>
          <div className="start-tracks">
            {tracks.map((item) => {
              const Icon = trackIcon(item.icon);
              return (
                <button key={item.id} className={`start-track ${item.id === track ? "active" : ""}`} aria-pressed={item.id === track} onClick={() => choose(item.id)}>
                  <Icon size={14} /> {item.shortLabel}
                </button>
              );
            })}
          </div>
          <ul className="start-rounds">
            {rounds.map((prompt, index) => (
              <li key={prompt.id}>
                <button className="start-round" onClick={() => onStart(prompt.id)} autoFocus={index === 0}>
                  <span className="start-round-main">
                    <span className="start-round-title">
                      {shortTitle(prompt.title)}
                      {index === 0 && <em><Sparkles size={11} /> Recommended</em>}
                      {done.has(prompt.id) && <em className="done"><Check size={11} /> Done before</em>}
                    </span>
                    <span className="start-round-meta">{prompt.difficulty} · <Clock3 size={11} /> {prompt.minutes} min</span>
                  </span>
                  <ArrowRight size={15} className="nudge" />
                </button>
              </li>
            ))}
          </ul>
          <Link className="start-panel-more" to={trackPath(track)} onClick={() => setOpen(false)}>
            Browse all {current?.shortLabel ?? ""} rounds ({freeInTrack} free) <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
