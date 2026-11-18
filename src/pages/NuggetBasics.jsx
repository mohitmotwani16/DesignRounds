import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { api } from "../api.js";
import { tracks } from "../data/prompts.js";
import { Link, navigate } from "../router.js";
import { SiteFooter } from "../components/site.jsx";
import { TurnstileWidget } from "../components/Turnstile.jsx";
import { trackIcon } from "../components/ui.jsx";
import { useAuth } from "../auth.jsx";

const DIFFICULTIES = ["easy", "medium", "hard"];

function groupItems(items) {
  const byTrack = new Map();
  for (const item of items) {
    if (item.basicsOnboardingOrder) continue;
    const list = byTrack.get(item.track) ?? new Map();
    const comp = item.basicsComponentId ?? "other";
    const bucket = list.get(comp) ?? [];
    bucket.push(item);
    list.set(comp, bucket);
    byTrack.set(item.track, list);
  }
  return byTrack;
}

export default function NuggetBasicsPage() {
  const { status, turnstileSiteKey } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(null);
  const [humanCheck, setHumanCheck] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const startingRef = useRef(false);
  const [track, setTrack] = useState("software-engineering");
  const signedIn = status === "signed-in";
  const needsHumanCheck = !signedIn && Boolean(turnstileSiteKey);

  useEffect(() => {
    api.basicsCatalog()
      .then(setCatalog)
      .catch((err) => setError(err.message || "Could not load drills."));
  }, []);

  const onboarding = useMemo(
    () => (catalog?.items ?? []).filter((item) => item.basicsOnboardingOrder).sort((a, b) => a.basicsOnboardingOrder - b.basicsOnboardingOrder),
    [catalog],
  );

  const grouped = useMemo(() => groupItems(catalog?.items ?? []), [catalog]);
  const componentLabels = useMemo(() => {
    const trackMeta = catalog?.tracks?.find((item) => item.id === track);
    return new Map((trackMeta?.components ?? []).map((item) => [item.id, item.label]));
  }, [catalog, track]);

  const components = useMemo(() => {
    const map = grouped.get(track);
    if (!map) return [];
    return [...map.entries()].map(([id, drills]) => ({
      id,
      label: componentLabels.get(id) ?? id.replace(/-/g, " "),
      drills: DIFFICULTIES.map((d) => drills.find((row) => row.basicsDifficulty === d)).filter(Boolean),
    }));
  }, [grouped, track, componentLabels]);

  const start = useCallback(async (nuggetId, turnstileToken) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(nuggetId);
    setError("");
    setHumanCheck(null);
    try {
      const body = { nuggetId, ...(turnstileToken ? { turnstileToken } : {}) };
      const { session } = await api.startBasicsSession(body);
      navigate(`/workspace/${session.id}`);
    } catch (err) {
      setError(err.message || "Could not start the drill.");
      setStarting(null);
      startingRef.current = false;
      if (needsHumanCheck) {
        setTurnstileReset((value) => value + 1);
        setHumanCheck(nuggetId);
      }
    }
  }, [needsHumanCheck]);

  const requestStart = useCallback((nuggetId) => {
    if (status === "loading") return;
    if (!needsHumanCheck) {
      start(nuggetId);
      return;
    }
    setHumanCheck(nuggetId);
  }, [needsHumanCheck, start, status]);

  const activeTrack = tracks.find((item) => item.id === track);

  return (
    <main className="library-page wrap" id="main-content">
      <header className="library-hero">
        <span className="kicker">Nugget-basics</span>
        <h1>Learn the Nugget flow in small steps</h1>
        <p className="lede">
          Five text-only warm-ups, then short incident drills with tiny diagrams. No sign-in required for your first tries;
          sign in after a drill to save progress and unlock the full drill review.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" to="/nuggets">Full Nuggets library</Link>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {onboarding.length > 0 && (
        <section className="nugget-basics-onboarding">
          <h2>Start here (text only)</h2>
          <ol className="nugget-basics-onboarding-list">
            {onboarding.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.symptomsPreview}</p>
                </div>
                <button type="button" className="button button-dark" disabled={starting === item.id} onClick={() => requestStart(item.id)}>
                  {starting === item.id ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />} Start
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!catalog && !error && <p className="muted"><LoaderCircle size={16} className="spin" /> Loading drills…</p>}

      {catalog && (
        <section className="nugget-basics-tracks">
          <div className="nugget-basics-tabs" role="tablist" aria-label="Track">
            {tracks.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={track === item.id}
                className={track === item.id ? "active" : ""}
                onClick={() => setTrack(item.id)}
              >
                {trackIcon(item.icon)} {item.shortLabel}
              </button>
            ))}
          </div>

          <p className="muted" style={{ marginTop: "1rem" }}>
            {activeTrack?.description} Each component has easy, medium, and hard drills (diagram from drill 6 onward).
          </p>

          <div className="nugget-basics-grid">
            {components.map((row) => (
              <article key={row.id} className="nugget-basics-card">
                <h3>{row.label}</h3>
                <div className="nugget-basics-pills">
                  {row.drills.map((drill) => (
                    <button
                      key={drill.id}
                      type="button"
                      className={`pill pill-${drill.basicsDifficulty}`}
                      disabled={starting === drill.id}
                      onClick={() => requestStart(drill.id)}
                      title={drill.title}
                    >
                      {drill.basicsDifficulty}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {humanCheck && turnstileSiteKey && (
        <div className="turnstile-background" aria-hidden="true">
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            action="nugget-basics-start"
            resetKey={turnstileReset}
            invisible
            onToken={(token) => { if (token) start(humanCheck, token); }}
            onError={() => {
              setError("Human verification failed. Try again.");
              setHumanCheck(null);
              setStarting(null);
              startingRef.current = false;
            }}
          />
        </div>
      )}

      <SiteFooter />
    </main>
  );
}