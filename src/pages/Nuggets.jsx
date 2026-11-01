import { useCallback, useEffect, useMemo, useState } from "react";
import { Dices, LayoutGrid, LoaderCircle } from "lucide-react";
import { nuggets } from "../data/nuggets.js";
import { findPrompt, getTrack, prompts, tracks } from "../data/prompts.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { NuggetCard, NuggetParentCard, SiteFooter } from "../components/site.jsx";
import { promptIcon, trackIcon } from "../components/ui.jsx";
import { Link, navigate, useRoute } from "../router.js";

function nuggetsHref({ track = "all", parent = "" } = {}) {
  const query = new URLSearchParams();
  if (track && track !== "all") query.set("track", track);
  if (parent) query.set("q", parent);
  const qs = query.toString();
  return qs ? `/nuggets?${qs}` : "/nuggets";
}

const validTrackId = (id) => (tracks.some((track) => track.id === id) ? id : "all");

function groupByParent(items) {
  const map = new Map();
  for (const item of items) {
    const list = map.get(item.parentPromptId) ?? [];
    list.push(item);
    map.set(item.parentPromptId, list);
  }
  return map;
}

export default function NuggetsPage({ onLockRound }) {
  const { params } = useRoute();
  const parentFilter = params.get("q") || "";
  const trackFilter = validTrackId(params.get("track") || "all");
  const activeTrack = tracks.find((item) => item.id === trackFilter);
  const { status, user, humanCheckRequired, humanLaunch, humanVisible } = useAuth();
  const [parents, setParents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const signedIn = status === "signed-in";
  const authReady = status !== "loading";
  const needsHuman = signedIn && humanCheckRequired && !humanLaunch;
  const canStart = authReady && signedIn && !needsHuman && !starting;
  const startDisabled = !authReady || (signedIn && !canStart);

  useEffect(() => {
    let cancelled = false;
    api.nuggetParents()
      .then(({ parents: list }) => { if (!cancelled) setParents(list); })
      .catch(() => { if (!cancelled) setParents([]); })
      .finally(() => { if (!cancelled) setLoadingParents(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let items = nuggets;
    if (parentFilter) items = items.filter((item) => item.parentPromptId === parentFilter);
    else if (trackFilter !== "all") items = items.filter((item) => item.track === trackFilter);
    return items;
  }, [parentFilter, trackFilter]);
  const grouped = useMemo(() => groupByParent(filtered), [filtered]);
  const parentMeta = parentFilter ? findPrompt(parentFilter) : null;
  const visibleParents = useMemo(() => (
    trackFilter === "all" ? parents : parents.filter((parent) => parent.track === trackFilter)
  ), [parents, trackFilter]);
  const tabTrack = parentMeta?.track ? validTrackId(parentMeta.track) : trackFilter;
  const showQuestionGrid = !parentFilter && !loadingParents && visibleParents.length > 0;
  const showDrillGrid = Boolean(parentFilter) || trackFilter === "all";

  const start = useCallback(async (body) => {
    if (status === "loading") return;
    if (status !== "signed-in") {
      navigate(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (needsHuman) {
      setError(humanVisible
        ? "Complete the security check on screen, then try again."
        : "Waiting for a quick security check… If nothing happens in a few seconds, refresh the page.");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const { session } = await api.startNuggetSession(body);
      const dest = `/workspace/${session.id}`;
      if (!user?.onboarded) {
        navigate(`/welcome?next=${encodeURIComponent(dest)}`, { replace: true });
      } else {
        navigate(dest, { replace: true });
      }
    } catch (startError) {
      setError(startError.message || "Could not start this drill.");
    } finally {
      setStarting(false);
    }
  }, [status, needsHuman, humanVisible, user?.onboarded]);

  const startNugget = useCallback((nuggetId) => start({ nuggetId }), [start]);

  const startRandom = useCallback(() => {
    if (parentFilter) {
      start({ parentPromptId: parentFilter, pick: "random_nugget" });
      return;
    }
    if (trackFilter !== "all" && filtered.length) {
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      start({ nuggetId: pick.id });
      return;
    }
    start({ pick: "random_nugget" });
  }, [parentFilter, trackFilter, filtered, start]);

  const primaryLabel = !authReady
    ? "Loading…"
    : !signedIn
      ? "Sign in to start"
      : starting
        ? "Starting…"
        : "Random nugget";

  let cardIndex = 0;

  return (
    <main className="library nuggets-catalog">
      <section className="lib-hero wrap">
        <span className="kicker">Incident drills</span>
        <h1>Two- to five-minute nuggets</h1>
        <p>A pre-drawn architecture is already failing. Talk through what broke and how you would fix it with the AI interviewer.</p>
        <p className="lib-hero-note">Drills follow the same access as their parent question in the library — free rounds stay free; Plus rounds need Plus to start.</p>
        {needsHuman && (
          <p className="form-hint" role="status">
            {humanVisible ? "Complete the security check to start a drill." : "Finishing a quick security check…"}
          </p>
        )}
        <div className="hero-ctas" style={{ marginTop: "1.25rem" }}>
          <button type="button" className="btn btn-primary btn-lg" disabled={!authReady || (signedIn && !canStart) || !filtered.length} onClick={startRandom}>
            {starting ? <LoaderCircle size={18} className="spin" /> : <Dices size={18} />}
            {primaryLabel}
          </button>
          {!parentFilter && <Link className="btn btn-ghost btn-lg" to="/library">Full design rounds</Link>}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <div className="lib-tabs-bar">
        <div className="wrap">
          <div className="lib-tabs" role="toolbar" aria-label="Discipline">
            <Link className="lib-tab tone-slate" to={nuggetsHref({ track: "all" })} aria-current={tabTrack === "all" ? "page" : undefined}>
              <i><LayoutGrid size={13} /></i>All
            </Link>
            {tracks.map((item) => {
              const Icon = trackIcon(item.icon);
              return (
                <Link
                  key={item.id}
                  className={`lib-tab tone-${item.color}`}
                  to={nuggetsHref({ track: item.id })}
                  aria-current={tabTrack === item.id ? "page" : undefined}
                >
                  <i><Icon size={13} /></i>{item.shortLabel}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="wrap lib-body lib-body-solo">
        <section aria-label="Incident drills">
          {!parentFilter && trackFilter !== "all" && activeTrack && (
            <header className="nuggets-section-head">
              <p className="lib-count" aria-live="polite">
                <strong>{activeTrack.shortLabel}</strong> drills · {filtered.length} total
              </p>
              <h2>{activeTrack.shortLabel} questions</h2>
              <p className="nuggets-section-lede">Pick a library question to browse its incident drills.</p>
            </header>
          )}

          {parentFilter && parentMeta && (() => {
            const track = getTrack(parentMeta.track);
            const Icon = promptIcon(parentMeta.icon);
            return (
              <div className={`nuggets-focus tone-${track.color}`}>
                <div className="nuggets-focus-main">
                  <span className="round-icon"><Icon size={20} strokeWidth={1.9} /></span>
                  <div>
                    <span className="nuggets-focus-kicker">{track.shortLabel} · {filtered.length} drill{filtered.length === 1 ? "" : "s"}</span>
                    <h2>{parentMeta.title}</h2>
                    <p>Pick a scenario or roll random from this question.</p>
                  </div>
                </div>
                <div className="nuggets-focus-actions">
                  <button type="button" className="btn btn-primary" disabled={!authReady || (signedIn && !canStart)} onClick={() => start({ parentPromptId: parentFilter, pick: "random_nugget" })}>
                    <Dices size={16} /> Random drill
                  </button>
                  <Link className="btn btn-ghost btn-sm" to={nuggetsHref({ track: parentMeta.track || trackFilter })}>All questions</Link>
                </div>
              </div>
            );
          })()}

          {showQuestionGrid && (
            <div className="nuggets-parent-picker">
              {trackFilter === "all" && (
                <header className="nuggets-section-head nuggets-section-head-compact">
                  <h2>Browse by question</h2>
                  <p className="nuggets-section-lede">Each design round includes a handful of short incident drills.</p>
                </header>
              )}
              <div className="rounds nuggets-parent-rounds">
                {visibleParents.map((parent, index) => (
                  <NuggetParentCard
                    key={parent.id}
                    parent={parent}
                    index={index}
                    to={nuggetsHref({ track: trackFilter, parent: parent.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {showDrillGrid && trackFilter === "all" && !parentFilter && grouped.size > 0 && (
            <header className="nuggets-section-head nuggets-section-head-compact" style={{ marginTop: 40 }}>
              <h2>All incident drills</h2>
              <p className="nuggets-section-lede">Or start any drill directly — grouped by parent question.</p>
            </header>
          )}

          {showDrillGrid && [...grouped.entries()].map(([parentId, items]) => {
            const prompt = prompts.find((entry) => entry.id === parentId);
            const track = tracks.find((entry) => entry.id === prompt?.track);
            return (
              <div key={parentId} className="nuggets-group">
                {!parentFilter && (
                  <div className="row-head">
                    <h2>{prompt?.title ?? parentId}{track ? ` · ${track.shortLabel}` : ""}</h2>
                    <Link className="btn btn-ghost btn-sm" to={nuggetsHref({ track: trackFilter, parent: parentId })}>View all</Link>
                  </div>
                )}
                <div className="rounds">
                  {items.map((item) => {
                    const index = cardIndex;
                    cardIndex += 1;
                    return (
                      <NuggetCard
                        key={item.id}
                        nugget={item}
                        index={index}
                        disabled={startDisabled}
                        onStart={startNugget}
                        onLockRound={onLockRound}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="lib-empty">
              <p>{trackFilter !== "all" && !parentFilter
                ? `No incident drills for ${activeTrack?.shortLabel ?? "this discipline"} yet. Try another tab or check back soon.`
                : "No published nuggets yet. Check back soon."}</p>
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
