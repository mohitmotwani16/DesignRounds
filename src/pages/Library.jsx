import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check, ChevronDown, LayoutGrid, PlayCircle, RotateCcw, Search, SearchX, SlidersHorizontal, WifiOff, X } from "lucide-react";
import { prompts, topics, tracks } from "../data/prompts.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { RoundCard, RoundCardSkeleton, SiteFooter } from "../components/site.jsx";
import { promptIcon, trackIcon } from "../components/ui.jsx";

const PAGE_SIZE = 12;
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const DURATIONS = [
  { id: "short", label: "Up to 35 min" },
  { id: "medium", label: "36–45 min" },
  { id: "long", label: "46+ min" },
];
const SORTS = [
  ["recommended", "Recommended"],
  ["shortest", "Shortest first"],
  ["easiest", "Easiest first"],
  ["hardest", "Hardest first"],
  ["title", "A–Z"],
];
const TOPICS_COLLAPSED = 10;

const toggle = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
const validTrack = (id) => (tracks.some((track) => track.id === id) ? id : "all");

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Loads the catalog page by page. A change of query resets the list (and aborts any
// request still in flight); loadMore appends the next page.
function useCatalog(query) {
  const key = JSON.stringify(query);
  const [state, setState] = useState({ key, items: [], total: null, facets: null, nextCursor: null, status: "loading", error: null });
  const controller = useRef(null);

  const fetchPage = useCallback(async (cursor) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState((current) => (cursor
      ? { ...current, status: "more", error: null }
      : { key, items: [], total: current.key === key ? current.total : null, facets: current.facets, nextCursor: null, status: "loading", error: null }));
    try {
      const page = await api.catalog({ ...query, limit: PAGE_SIZE, cursor }, { signal: abort.signal });
      setState((current) => ({
        key,
        items: cursor ? [...current.items, ...page.items] : page.items,
        total: page.total,
        facets: page.facets,
        nextCursor: page.nextCursor,
        status: "idle",
        error: null,
      }));
    } catch (error) {
      if (error.name === "AbortError") return;
      setState((current) => ({ ...current, status: "error", error }));
    }
  }, [key]);

  useEffect(() => {
    fetchPage(null);
    return () => controller.current?.abort();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (state.status === "idle" && state.nextCursor) fetchPage(state.nextCursor);
  }, [state.status, state.nextCursor, fetchPage]);
  const retry = useCallback(() => fetchPage(state.items.length ? state.nextCursor : null), [fetchPage, state.items.length, state.nextCursor]);

  return { ...state, loadMore, retry };
}

export default function LibraryPage({ onStart, initialTrack }) {
  const { status: authStatus } = useAuth();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState(() => validTrack(initialTrack));
  const [levels, setLevels] = useState([]);
  const [durations, setDurations] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [access, setAccess] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showTop, setShowTop] = useState(false);
  const searchRef = useRef(null);
  const sentinelRef = useRef(null);
  const q = useDebounced(search.trim(), 250);

  const query = useMemo(() => ({ q, track, level: levels, duration: durations, topic: selectedTopics, access, sort }), [q, track, levels, durations, selectedTopics, access, sort]);
  const catalog = useCatalog(query);

  useEffect(() => { setTrack(validTrack(initialTrack)); }, [initialTrack]);

  // Keep the discipline in the address so the view can be shared and survives reloads.
  useEffect(() => {
    window.history.replaceState(null, "", `#/library${track !== "all" ? `?track=${track}` : ""}`);
  }, [track]);

  useEffect(() => {
    if (authStatus !== "signed-in") { setSessions([]); return undefined; }
    let cancelled = false;
    api.listSessions().then(({ sessions: list }) => { if (!cancelled) setSessions(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [authStatus]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const onScroll = () => setShowTop(window.scrollY > 1200);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Infinite scroll: fetch the next page as the sentinel nears the viewport.
  const loadMoreRef = useRef(catalog.loadMore);
  loadMoreRef.current = catalog.loadMore;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); }, { rootMargin: "900px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  // On tall screens a page may not fill the viewport, and the observer won't fire
  // again while the sentinel stays visible, so check after every page lands.
  useEffect(() => {
    if (catalog.status !== "idle" || !catalog.nextCursor || !sentinelRef.current) return;
    if (sentinelRef.current.getBoundingClientRect().top < window.innerHeight + 900) catalog.loadMore();
  }, [catalog.status, catalog.nextCursor, catalog.items.length, catalog.loadMore]);

  const statusByPrompt = useMemo(() => {
    const map = {};
    for (const session of sessions) if (session.status === "in_progress" || !map[session.promptId]) map[session.promptId] = session.status;
    return map;
  }, [sessions]);
  const inProgress = sessions.filter((session) => session.status === "in_progress").slice(0, 3);

  const trackCounts = catalog.facets?.tracks ?? {};
  const topicCounts = catalog.facets?.topics ?? {};
  const visibleTopics = topics.filter((topic) => topicCounts[topic] || selectedTopics.includes(topic));
  const shownTopics = showAllTopics ? visibleTopics : visibleTopics.slice(0, TOPICS_COLLAPSED);
  const activeTrack = tracks.find((item) => item.id === track);
  const filterCount = levels.length + durations.length + selectedTopics.length + (access !== "all" ? 1 : 0);

  function clearFilters() {
    setLevels([]);
    setDurations([]);
    setSelectedTopics([]);
    setAccess("all");
  }
  function resetAll() {
    clearFilters();
    setSearch("");
    setTrack("all");
  }

  const pills = [
    ...levels.map((value) => ({ key: `l-${value}`, label: value, remove: () => setLevels((list) => toggle(list, value)) })),
    ...durations.map((value) => ({ key: `d-${value}`, label: DURATIONS.find((item) => item.id === value).label, remove: () => setDurations((list) => toggle(list, value)) })),
    ...selectedTopics.map((value) => ({ key: `t-${value}`, label: value, remove: () => setSelectedTopics((list) => toggle(list, value)) })),
    ...(access !== "all" ? [{ key: "access", label: access === "free" ? "Free" : "Plus", remove: () => setAccess("all") }] : []),
  ];

  const loading = catalog.status === "loading";
  const total = catalog.total;

  return (
    <main className="library">
      <section className="lib-hero wrap">
        <span className="kicker">{activeTrack ? activeTrack.label : "Practice library"}</span>
        <h1>{activeTrack ? <>Practice {activeTrack.shortLabel}.</> : <>Find your next <span className="serif-accent">design round.</span></>}</h1>
        <p>{activeTrack ? activeTrack.description : "Interview-grade design rounds across six disciplines. Filter by level, time, or topic, or search for a system, requirement, or concept."}</p>
        <label className="lib-search">
          <Search size={20} />
          <span className="sr-only">Search practice rounds</span>
          <input ref={searchRef} type="search" placeholder="Search “rate limiter”, “Kafka”, “exactly-once”…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search ? <button type="button" className="clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }} aria-label="Clear search"><X size={15} /></button> : <kbd>Ctrl K</kbd>}
        </label>
      </section>

      <div className="lib-tabs-bar">
        <div className="wrap">
          <div className="lib-tabs" role="toolbar" aria-label="Discipline">
            <button className="lib-tab tone-slate" aria-pressed={track === "all"} onClick={() => setTrack("all")}>
              <i><LayoutGrid size={13} /></i>All<small>{trackCounts.all ?? "–"}</small>
            </button>
            {tracks.map((item) => {
              const Icon = trackIcon(item.icon);
              return (
                <button key={item.id} className={`lib-tab tone-${item.color}`} aria-pressed={track === item.id} onClick={() => setTrack(item.id)}>
                  <i><Icon size={13} /></i>{item.shortLabel}<small>{trackCounts[item.id] ?? 0}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="wrap lib-body">
        <div className={`drawer-backdrop ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
        <aside className={`lib-filters ${drawerOpen ? "open" : ""}`} aria-label="Filters">
          <div className="drawer-head"><h2>Filters</h2><button className="btn btn-quiet btn-sm" onClick={() => setDrawerOpen(false)} aria-label="Close filters"><X size={16} /></button></div>

          <div className="f-group">
            <h2>Access</h2>
            <div className="seg" role="radiogroup" aria-label="Access">
              {[["all", "All"], ["free", "Free"], ["paid", "Plus"]].map(([value, label]) => (
                <button key={value} role="radio" aria-checked={access === value} onClick={() => setAccess(value)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h2>Level</h2>
            <div className="checks">
              {LEVELS.map((level) => (
                <button key={level} className="check" aria-pressed={levels.includes(level)} onClick={() => setLevels((list) => toggle(list, level))}>
                  <span className="box"><Check size={11} strokeWidth={3} /></span>{level}
                </button>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h2>Time</h2>
            <div className="checks">
              {DURATIONS.map((duration) => (
                <button key={duration.id} className="check" aria-pressed={durations.includes(duration.id)} onClick={() => setDurations((list) => toggle(list, duration.id))}>
                  <span className="box"><Check size={11} strokeWidth={3} /></span>{duration.label}
                </button>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h2>Topic</h2>
            <div className="chips">
              {shownTopics.map((topic) => (
                <button key={topic} className="chip-btn" aria-pressed={selectedTopics.includes(topic)} onClick={() => setSelectedTopics((list) => toggle(list, topic))}>
                  {topic}<small>{topicCounts[topic] || 0}</small>
                </button>
              ))}
            </div>
            {visibleTopics.length > TOPICS_COLLAPSED && (
              <button className="link-btn" onClick={() => setShowAllTopics((value) => !value)}>
                {showAllTopics ? "Show fewer" : `Show all ${visibleTopics.length}`} <ChevronDown size={13} style={{ transform: showAllTopics ? "rotate(180deg)" : "none" }} />
              </button>
            )}
          </div>

          {filterCount > 0 && <button className="btn btn-ghost btn-sm" onClick={clearFilters}><RotateCcw size={13} /> Clear filters</button>}
        </aside>

        <section aria-label="Practice rounds">
          {inProgress.length > 0 && (
            <div className="continue">
              <h2><PlayCircle size={16} style={{ color: "var(--accent-text)" }} /> Pick up where you left off</h2>
              <div className="continue-list">
                {inProgress.map((session) => {
                  const prompt = prompts.find((item) => item.id === session.promptId);
                  if (!prompt) return null;
                  const Icon = promptIcon(prompt.icon);
                  return (
                    <button key={session.id} className={`resume-item tone-${prompt.color}`} onClick={() => onStart(prompt.id)}>
                      <span className="round-icon" style={{ width: 34, height: 34 }}><Icon size={16} /></span>
                      <span><strong>{prompt.title}</strong><span>{session.componentCount} components · {relativeTime(session.updatedAt)}</span></span>
                      <ArrowRight size={15} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="lib-toolbar">
            <span className="lib-count" aria-live="polite">
              {catalog.status === "error" && total === null ? "Library unavailable" : total === null ? "Loading rounds…" : <><strong>{total}</strong> {total === 1 ? "round" : "rounds"}{activeTrack ? ` in ${activeTrack.shortLabel}` : ""}{q ? ` matching “${q}”` : ""}</>}
            </span>
            <div className="lib-tools">
              <button className="btn btn-ghost btn-sm lib-filter-toggle" onClick={() => setDrawerOpen(true)}><SlidersHorizontal size={14} /> Filters{filterCount ? ` · ${filterCount}` : ""}</button>
              <label className="select">
                <span className="sr-only">Sort rounds</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>

          {pills.length > 0 && (
            <div className="active-pills">
              {pills.map((pill) => <button key={pill.key} onClick={pill.remove} aria-label={`Remove filter ${pill.label}`}>{pill.label}<X size={12} /></button>)}
              <button className="clear-all" onClick={clearFilters}>Clear all</button>
            </div>
          )}

          {catalog.status === "error" && !catalog.items.length ? (
            <div className="lib-error">
              <WifiOff size={26} />
              <h3>Couldn't load the library</h3>
              <p>{catalog.error?.message || "Check your connection and try again."}</p>
              <button className="btn btn-ghost" onClick={catalog.retry}><RotateCcw size={14} /> Try again</button>
            </div>
          ) : !loading && total === 0 ? (
            <div className="lib-empty">
              <SearchX size={26} />
              <h3>No rounds match that</h3>
              <p>Try a broader search, or remove a filter or two.</p>
              <button className="btn btn-ghost" onClick={resetAll}><RotateCcw size={14} /> Reset everything</button>
            </div>
          ) : (
            <div className="rounds">
              {catalog.items.map((round, index) => <RoundCard key={round.id} round={round} onStart={onStart} status={statusByPrompt[round.id]} index={index} />)}
              {(loading || catalog.status === "more") && Array.from({ length: loading ? 6 : 3 }, (_, index) => <RoundCardSkeleton key={`sk-${index}`} />)}
            </div>
          )}

          <div ref={sentinelRef} className="lib-more">
            {catalog.items.length > 0 && total !== null && (
              catalog.status === "error" ? (
                <button className="btn btn-ghost btn-sm" onClick={catalog.retry}><RotateCcw size={13} /> Couldn't load more. Retry</button>
              ) : catalog.nextCursor ? (
                <>
                  <span>Showing {catalog.items.length} of {total}</span>
                  <span className="progress-line"><b style={{ width: `${(catalog.items.length / total) * 100}%` }} /></span>
                </>
              ) : total > PAGE_SIZE ? (
                <span>You've seen all {total} rounds.</span>
              ) : null
            )}
          </div>
        </section>
      </div>

      <button className={`to-top ${showTop ? "show" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><ArrowUp size={18} /></button>
      <SiteFooter />
    </main>
  );
}

export function relativeTime(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(value).toLocaleDateString();
}
