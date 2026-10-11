import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Clock3, LayoutGrid, ListFilter, Search, SlidersHorizontal, X } from "lucide-react";
import { getTrack, prompts, topics, tracks } from "../data/prompts.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Footer, PromptCard, promptIcon, trackIcon } from "../components/ui.jsx";

const levels = ["Beginner", "Intermediate", "Advanced"];
const durations = [
  { id: "short", label: "Up to 35 min", test: (minutes) => minutes <= 35 },
  { id: "medium", label: "36–45 min", test: (minutes) => minutes > 35 && minutes <= 45 },
  { id: "long", label: "46+ min", test: (minutes) => minutes > 45 },
];
const levelRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const sorts = {
  recommended: { label: "Recommended", compare: () => 0 },
  shortest: { label: "Shortest first", compare: (a, b) => a.minutes - b.minutes },
  easiest: { label: "Easiest first", compare: (a, b) => levelRank[a.difficulty] - levelRank[b.difficulty] || a.minutes - b.minutes },
  hardest: { label: "Hardest first", compare: (a, b) => levelRank[b.difficulty] - levelRank[a.difficulty] || b.minutes - a.minutes },
  title: { label: "A–Z", compare: (a, b) => a.title.localeCompare(b.title) },
};

const toggle = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export default function LibraryPage({ onStart, initialTrack }) {
  const { status: authStatus } = useAuth();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState(() => (tracks.some((item) => item.id === initialTrack) ? initialTrack : "all"));
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [access, setAccess] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    if (tracks.some((item) => item.id === initialTrack)) setTrack(initialTrack);
  }, [initialTrack]);

  useEffect(() => {
    if (authStatus !== "signed-in") { setSessions([]); return; }
    let cancelled = false;
    api.listSessions().then(({ sessions: list }) => { if (!cancelled) setSessions(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [authStatus]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const statusByPrompt = useMemo(() => {
    const map = {};
    for (const session of sessions) {
      if (session.status === "in_progress" || !map[session.promptId]) map[session.promptId] = session.status;
    }
    return map;
  }, [sessions]);

  // Everything except the track filter, so the sidebar can show per-track counts.
  const baseFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return prompts.filter((prompt) => {
      if (needle) {
        const haystack = `${prompt.title} ${prompt.description} ${prompt.category} ${getTrack(prompt.track).label} ${prompt.requirements.join(" ")} ${prompt.considerations.join(" ")} ${prompt.prerequisites.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (selectedLevels.length && !selectedLevels.includes(prompt.difficulty)) return false;
      if (selectedDurations.length && !durations.some((duration) => selectedDurations.includes(duration.id) && duration.test(prompt.minutes))) return false;
      if (selectedTopics.length && !selectedTopics.includes(prompt.category)) return false;
      if (access !== "all" && prompt.access !== access) return false;
      return true;
    });
  }, [search, selectedLevels, selectedDurations, selectedTopics, access]);

  const filtered = useMemo(() => {
    const list = baseFiltered.filter((prompt) => track === "all" || prompt.track === track);
    return [...list].sort(sorts[sort].compare);
  }, [baseFiltered, track, sort]);

  const trackCounts = useMemo(() => {
    const counts = { all: baseFiltered.length };
    for (const prompt of baseFiltered) counts[prompt.track] = (counts[prompt.track] || 0) + 1;
    return counts;
  }, [baseFiltered]);

  const topicCounts = useMemo(() => {
    const counts = {};
    for (const prompt of prompts) if (track === "all" || prompt.track === track) counts[prompt.category] = (counts[prompt.category] || 0) + 1;
    return counts;
  }, [track]);
  const visibleTopics = topics.filter((topic) => topicCounts[topic] || selectedTopics.includes(topic));
  const shownTopics = showAllTopics ? visibleTopics : visibleTopics.slice(0, 10);

  const activeTrack = tracks.find((item) => item.id === track);
  const freeCount = prompts.filter((prompt) => prompt.access === "free").length;
  const activeFilterCount = selectedLevels.length + selectedDurations.length + selectedTopics.length + (access !== "all" ? 1 : 0);
  const inProgress = sessions.filter((session) => session.status === "in_progress").slice(0, 3);

  function clearFilters() {
    setSearch("");
    setSelectedLevels([]);
    setSelectedDurations([]);
    setSelectedTopics([]);
    setAccess("all");
  }

  const pills = [
    ...selectedLevels.map((value) => ({ key: `l-${value}`, label: value, remove: () => setSelectedLevels((list) => toggle(list, value)) })),
    ...selectedDurations.map((value) => ({ key: `d-${value}`, label: durations.find((item) => item.id === value).label, remove: () => setSelectedDurations((list) => toggle(list, value)) })),
    ...selectedTopics.map((value) => ({ key: `t-${value}`, label: value, remove: () => setSelectedTopics((list) => toggle(list, value)) })),
    ...(access !== "all" ? [{ key: "access", label: access === "free" ? "Free rounds" : "Plus rounds", remove: () => setAccess("all") }] : []),
  ];

  return (
    <main className="library-page page-width">
      <div className="breadcrumbs"><span>Practice</span><ChevronRight size={14} /><span className="breadcrumb-current">{activeTrack ? activeTrack.label : "Practice library"}</span></div>

      <header className="library-hero">
        <div>
          <div className="section-kicker">{activeTrack ? activeTrack.label.toUpperCase() : "THE PRACTICE LIBRARY"}</div>
          <h1>{activeTrack ? `Practice ${activeTrack.shortLabel}.` : "Choose your next design round."}</h1>
          <p>{activeTrack ? activeTrack.description : "Clear briefs, realistic constraints, and room to explain your design. Filter by discipline, level, time, or topic."}</p>
        </div>
        <dl className="library-stats">
          <div><dt>Rounds</dt><dd>{prompts.length}</dd></div>
          <div><dt>Free</dt><dd>{freeCount}</dd></div>
          <div><dt>Disciplines</dt><dd>{tracks.length}</dd></div>
          <div><dt>Topics</dt><dd>{topics.length}</dd></div>
        </dl>
      </header>

      {inProgress.length > 0 && (
        <section className="continue-strip" aria-label="Continue practicing">
          <div className="continue-heading"><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span></div>
          <div className="continue-items">
            {inProgress.map((session) => {
              const prompt = prompts.find((item) => item.id === session.promptId);
              if (!prompt) return null;
              const Icon = promptIcon(prompt.icon);
              return (
                <button key={session.id} className="continue-item" onClick={() => onStart(prompt.id)}>
                  <span className={`prompt-icon icon-${prompt.color}`}><Icon size={16} /></span>
                  <span className="continue-copy"><strong>{prompt.title}</strong><span>{session.componentCount} components · edited {relativeTime(session.updatedAt)}</span></span>
                  <ArrowRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="library-layout">
        <aside className={`library-filters ${filtersOpen ? "open" : ""}`} aria-label="Filters">
          <div className="filter-group">
            <h2 className="filter-title">Discipline</h2>
            <div className="track-filter-list">
              <button className={`track-filter ${track === "all" ? "selected" : ""}`} onClick={() => setTrack("all")}>
                <span className="track-filter-icon icon-slate"><LayoutGrid size={14} /></span><span>All disciplines</span><span className="track-filter-count">{trackCounts.all || 0}</span>
              </button>
              {tracks.map((item) => {
                const Icon = trackIcon(item.icon);
                return (
                  <button key={item.id} className={`track-filter ${track === item.id ? "selected" : ""}`} onClick={() => setTrack(item.id)}>
                    <span className={`track-filter-icon icon-${item.color}`}><Icon size={14} /></span><span>{item.shortLabel}</span><span className="track-filter-count">{trackCounts[item.id] || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filter-group">
            <h2 className="filter-title">Access</h2>
            <div className="segmented" role="radiogroup" aria-label="Access">
              {[["all", "All"], ["free", "Free"], ["paid", "Plus"]].map(([value, label]) => (
                <button key={value} role="radio" aria-checked={access === value} className={access === value ? "selected" : ""} onClick={() => setAccess(value)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h2 className="filter-title">Level</h2>
            <div className="chip-set">
              {levels.map((level) => (
                <button key={level} aria-pressed={selectedLevels.includes(level)} className={`filter-chip ${selectedLevels.includes(level) ? "selected" : ""}`} onClick={() => setSelectedLevels((list) => toggle(list, level))}>
                  <span className={`level-dot level-${level.toLowerCase()}`} />{level}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h2 className="filter-title">Time</h2>
            <div className="chip-set">
              {durations.map((duration) => (
                <button key={duration.id} aria-pressed={selectedDurations.includes(duration.id)} className={`filter-chip ${selectedDurations.includes(duration.id) ? "selected" : ""}`} onClick={() => setSelectedDurations((list) => toggle(list, duration.id))}>
                  <Clock3 size={12} />{duration.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h2 className="filter-title">Topic</h2>
            <div className="chip-set">
              {shownTopics.map((topic) => (
                <button key={topic} aria-pressed={selectedTopics.includes(topic)} className={`filter-chip ${selectedTopics.includes(topic) ? "selected" : ""}`} onClick={() => setSelectedTopics((list) => toggle(list, topic))}>
                  {topic}<span className="chip-count">{topicCounts[topic] || 0}</span>
                </button>
              ))}
            </div>
            {visibleTopics.length > 10 && (
              <button className="text-button" onClick={() => setShowAllTopics((value) => !value)}>
                {showAllTopics ? "Show fewer" : `Show all ${visibleTopics.length} topics`} <ChevronDown size={13} className={showAllTopics ? "flip" : ""} />
              </button>
            )}
          </div>

          {activeFilterCount > 0 && <button className="button button-outline button-small filter-clear" onClick={clearFilters}>Clear filters</button>}
        </aside>

        <section className="library-results">
          <div className="library-toolbar">
            <label className="search-field">
              <Search size={17} />
              <input ref={searchRef} aria-label="Search practice rounds" placeholder="Search by system, requirement, or concept…" value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
              <kbd>Ctrl K</kbd>
            </label>
            <div className="filter-select">
              <ListFilter size={15} />
              <select aria-label="Sort rounds" value={sort} onChange={(event) => setSort(event.target.value)}>
                {Object.entries(sorts).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
              </select>
              <ChevronDown size={14} />
            </div>
            <button className="button button-outline filters-toggle" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
              <SlidersHorizontal size={15} /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          <div className="results-summary">
            <span><strong>{filtered.length}</strong> {filtered.length === 1 ? "round" : "rounds"}{activeTrack ? ` in ${activeTrack.shortLabel}` : ""}</span>
            {pills.map((pill) => <button key={pill.key} className="active-pill" onClick={pill.remove}>{pill.label}<X size={12} /></button>)}
            <span className="access-legend"><i className="free-key-dot" />Free: canvas + one final review <i className="plus-key-dot" />Plus: more rounds + AI coaching</span>
          </div>

          {filtered.length > 0 ? (
            <div className="prompt-grid library-grid">
              {filtered.map((prompt, index) => <PromptCard key={prompt.id} prompt={prompt} onStart={onStart} index={index} status={statusByPrompt[prompt.id]} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={22} />
              <h3>No rounds match those filters.</h3>
              <p>Try a different search term or remove a filter.</p>
              <button className="button button-outline" onClick={() => { clearFilters(); setTrack("all"); }}>Reset filters</button>
            </div>
          )}
        </section>
      </div>
      <Footer />
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
