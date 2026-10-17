import { useEffect, useMemo, useRef, useState } from "react";
import { SearchBox, ShortcutHint, useSearchShortcut } from "../components/SearchBox.jsx";
import { ArrowLeft, ArrowRight, Blocks, BookOpen, Bot, Boxes, Braces, Brain, ChevronDown, ChevronRight, Clock3, Database, ExternalLink, Gauge, ListOrdered, LoaderCircle, Lock, Map as MapIcon, Menu, MessageSquare, Network, PenLine, Search, Server, Share2, ShieldCheck, Smartphone, Users, Workflow, X, Zap } from "lucide-react";
import { getTrack, prompts, tracks } from "../data/prompts.js";
import { CATEGORIES, DISCIPLINES, GROUPS, LEARN_PATH, LEARN_UPDATED, categoryById, neighbours, topicMeta, topicPath } from "../learn/catalog.js";
import { Diagram } from "../learn/Diagram.jsx";
import { Roadmap } from "../learn/Roadmap.jsx";
import { ROADMAPS, roadmapsFor } from "../learn/roadmaps.js";
import { useTopic } from "../learn/topics.js";
import { communityArticle, communityInCategory, loadCommunityArticle, loadedCommunityArticle, useCommunityArticles } from "../learn/community.js";
import { markdownToBlocks } from "../learn/markdown.js";
import { Rich, plainText } from "../components/rich.jsx";
import { LevelMeter, SiteFooter } from "../components/site.jsx";
import { Link, useRoute } from "../router.js";
import { roundPath, trackPath, TRACK_SEO } from "../seo.js";

const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"];
const formatDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const headingId = (text) => plainText(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function LevelTag({ level }) {
  return <span className={`learn-level learn-level-${level.toLowerCase()}`}>{level}</span>;
}

// ------------------------------------------------------------------ sidebar

// Topics and published community articles of one category, for navigation lists.
function categoryEntries(category) {
  const community = communityInCategory(category.id).map((article) => ({
    slug: article.slug,
    title: article.title,
    short: article.shortTitle || article.title,
    description: article.description,
    level: article.level,
    category: category.id,
    community: true,
  }));
  return [...category.topics.map((topic) => ({ ...topic, category: category.id })), ...community];
}

// The handbook's map, grouped the same way as the hub: four families of categories,
// each category collapsible. Only the category being read starts open.
export function LearnSidebar({ currentSlug }) {
  useCommunityArticles();
  const currentCategory = currentSlug ? (topicMeta(currentSlug) ?? communityArticle(currentSlug))?.category : null;
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  useSearchShortcut(searchRef);
  const [open, setOpen] = useState(() => new Set(currentCategory ? [currentCategory] : []));
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
    if (currentCategory) setOpen((previous) => new Set([...previous, currentCategory]));
  }, [currentSlug, currentCategory]);

  const needle = query.trim().toLowerCase();
  const matches = (topic) => !needle || `${topic.title} ${topic.short} ${topic.description}`.toLowerCase().includes(needle);
  const toggle = (id) => setOpen((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const families = GROUPS.map((group) => ({
    group,
    visible: group.categories.map(categoryById).filter(Boolean).map((category) => [category, categoryEntries(category).filter(matches)]).filter(([, list]) => list.length),
  })).filter(({ visible }) => visible.length);

  return (
    <aside className={`learn-sidebar ${drawer ? "open" : ""}`} aria-label="Handbook contents">
      <button className="learn-drawer-toggle" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
        {drawer ? <X size={16} /> : <Menu size={16} />} {drawer ? "Close contents" : "Handbook contents"}
      </button>
      <div className="learn-sidebar-inner">
        <Link className="learn-home-link" to={LEARN_PATH}><BookOpen size={15} /> System design handbook</Link>
        <label className="learn-search">
          <Search size={14} />
          <input ref={searchRef} type="search" name="q" autoComplete="off" placeholder="Search guides…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search guides" />
          {!query && <ShortcutHint />}
        </label>
        <nav>
          {families.map(({ group, visible }) => (
            <div key={group.id} className="learn-nav-family">
              <p className="learn-nav-family-title">{group.title}</p>
              {visible.map(([category, list]) => {
                const expanded = Boolean(needle) || open.has(category.id);
                return (
                  <div key={category.id} className="learn-nav-group">
                    <button className="learn-nav-heading" aria-expanded={expanded} onClick={() => toggle(category.id)}>
                      <ChevronDown size={14} className={expanded ? "" : "collapsed"} /> {category.title}
                    </button>
                    <ul hidden={!expanded}>
                      {list.map((topic) => (
                        <li key={topic.slug}>
                          <Link to={topicPath(topic.slug)} aria-current={topic.slug === currentSlug ? "page" : undefined}>{topic.short}{topic.community && <Users size={11} className="learn-community-mark" aria-label="Community article" />}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
          {!families.length && <p className="learn-search-empty">No guides match “{query.trim()}”.</p>}
        </nav>
        <Link className="learn-write-link" to="/learn/write"><PenLine size={14} /> Write an article</Link>
      </div>
    </aside>
  );
}

// ------------------------------------------------------------------ on this page

export function OnThisPage({ headings }) {
  const [active, setActive] = useState(headings[0]?.id);
  useEffect(() => {
    const elements = headings.map((heading) => document.getElementById(heading.id)).filter(Boolean);
    if (!elements.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-80px 0px -70% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);
  if (headings.length < 3) return null;
  return (
    <nav className="learn-toc" aria-label="On this page">
      <p>On this page</p>
      <ul>{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`} className={heading.id === active ? "active" : ""}>{heading.text}</a></li>)}</ul>
    </nav>
  );
}

// ------------------------------------------------------------------ blocks

export function Block({ block }) {
  switch (block.type) {
    case "h2": return <h2 id={headingId(block.text)}>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "p": return <p><Rich text={block.text} /></p>;
    case "ul": return <ul>{block.items.map((item, index) => <li key={index}><Rich text={item} /></li>)}</ul>;
    case "ol": return <ol>{block.items.map((item, index) => <li key={index}><Rich text={item} /></li>)}</ol>;
    case "callout": return <p className={`callout ${block.tone ? `callout-${block.tone}` : ""}`}><Rich text={block.text} /></p>;
    case "code": return <pre className="learn-code"><code>{block.code.trim()}</code></pre>;
    case "diagram": return <Diagram spec={block} />;
    case "table": return (
      <div className="table-wrap">
        <table>
          <thead><tr>{block.head.map((cell, cellIndex) => <th key={cellIndex} scope="col">{cell}</th>)}</tr></thead>
          <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}><Rich text={cell} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    case "rounds": return <RoundLinks ids={block.ids} />;
    case "roadmap": return <Roadmap id={block.id} />;
    case "questions-by-track": return <QuestionsByTrack />;
    default: return null;
  }
}

function RoundLinks({ ids }) {
  return (
    <ul className="round-links">
      {ids.map((id) => prompts.find((prompt) => prompt.id === id)).filter(Boolean).map((prompt) => (
        <li key={prompt.id}>
          <Link to={roundPath(prompt.id)}>{prompt.title}</Link>
          <span>{getTrack(prompt.track).shortLabel} · {prompt.difficulty} · {prompt.minutes} min{prompt.access === "free" ? " · Free" : ""}</span>
        </li>
      ))}
    </ul>
  );
}

// The interview-questions guide: every round, grouped by discipline, then level.
function QuestionsByTrack() {
  return tracks.map((track) => {
    const rounds = prompts.filter((prompt) => prompt.track === track.id)
      .sort((a, b) => LEVEL_ORDER.indexOf(a.difficulty) - LEVEL_ORDER.indexOf(b.difficulty));
    return (
      <section key={track.id}>
        <h2 id={headingId(TRACK_SEO[track.id].h1)}>{TRACK_SEO[track.id].h1}</h2>
        <p>{TRACK_SEO[track.id].intro[0]} <Link to={trackPath(track.id)}>Practice all {track.shortLabel} rounds</Link>.</p>
        <ol className="question-list">
          {rounds.map((prompt) => (
            <li key={prompt.id}>
              <h3><Link to={roundPath(prompt.id)}>{prompt.title}</Link></h3>
              <p>{prompt.description} <strong>Tests:</strong> {prompt.considerations.join(", ").toLowerCase()}.</p>
              <span className="question-facts"><LevelMeter level={prompt.difficulty} /> <span><Clock3 size={13} /> {prompt.minutes} min</span>{prompt.access === "free" ? <span className="badge badge-free">Free</span> : <span className="badge badge-plus">Plus</span>}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  });
}

// Words in a topic, for its reading time.
function wordCount(body) {
  const texts = [];
  for (const block of body.blocks) {
    if (block.text) texts.push(block.text);
    if (block.items) texts.push(...block.items);
    if (block.rows) texts.push(...block.rows.flat());
  }
  for (const use of body.uses ?? []) texts.push(use.name, use.text);
  texts.push(...(body.interview ?? []));
  return texts.join(" ").split(/\s+/).length;
}

// ------------------------------------------------------------------ topic page

export function LearnTopicPage({ slug }) {
  const meta = topicMeta(slug);
  const { body, loadError, retry } = useTopic(slug);
  const category = categoryById(meta.category);
  const { previous, next } = neighbours(slug);
  const onRoadmaps = meta.category === "roadmaps" ? [] : roadmapsFor(slug);

  const headings = useMemo(() => {
    if (!body) return [];
    const list = body.blocks.filter((block) => block.type === "h2").map((block) => ({ id: headingId(block.text), text: block.text }));
    if (body.generated === "questions") list.push(...tracks.map((track) => ({ id: headingId(TRACK_SEO[track.id].h1), text: TRACK_SEO[track.id].h1 })));
    if (body.uses?.length) list.push({ id: "where-its-used", text: "Where it’s used" });
    if (body.interview?.length) list.push({ id: "in-an-interview", text: "In an interview" });
    if (body.reading?.length) list.push({ id: "further-reading", text: "Further reading" });
    return list;
  }, [body]);

  return (
    <main className="learn-page">
      <div className="learn-layout">
        <LearnSidebar currentSlug={slug} />
        <article className="prose learn-article">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><ChevronRight size={13} />
            <Link to={LEARN_PATH}>Learn</Link><ChevronRight size={13} />
            <Link to={`${LEARN_PATH}#${category.id}`}>{category.title}</Link><ChevronRight size={13} />
            <span aria-current="page">{meta.short}</span>
          </nav>
          <header>
            <h1>{meta.title}</h1>
            <p className="learn-lede">{meta.description}</p>
            <p className="guide-meta">
              <LevelTag level={meta.level} />
              {body && <><Clock3 size={14} /> {Math.max(3, Math.round(wordCount(body) / 220))} min read ·</>} Updated <time dateTime={LEARN_UPDATED}>{formatDate(LEARN_UPDATED)}</time>
            </p>
          </header>

          {loadError ? (
            <div className="learn-load-error" role="alert">
              <p>Article content couldn’t be loaded. Reload the page to try again.</p>
              <button className="btn btn-ghost" onClick={retry}>Reload page</button>
            </div>
          ) : !body ? (
            <p className="learn-loading" role="status"><LoaderCircle size={16} className="spin" /> Loading…</p>
          ) : (
            <>
              {body.blocks.map((block, index) => <Block key={index} block={block} />)}
              {body.generated === "questions" && <QuestionsByTrack />}

              {body.uses?.length > 0 && (
                <section>
                  <h2 id="where-its-used">Where it’s used</h2>
                  <div className="learn-uses">
                    {body.uses.map((use) => (
                      <div key={use.name} className="learn-use">
                        <strong>{use.name}</strong>
                        <p><Rich text={use.text} /></p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {body.interview?.length > 0 && (
                <section>
                  <h2 id="in-an-interview">In an interview</h2>
                  <ul>{body.interview.map((tip) => <li key={tip}><Rich text={tip} /></li>)}</ul>
                </section>
              )}

              {body.practice?.length > 0 && (
                <aside className="learn-practice">
                  <h2>Practice it</h2>
                  <p>These design rounds lean on {meta.short.toLowerCase()}. Build the design on a canvas and defend it to an AI interviewer.</p>
                  <RoundLinks ids={body.practice} />
                </aside>
              )}

              {body.reading?.length > 0 && (
                <section className="learn-reading">
                  <h2 id="further-reading">Further reading</h2>
                  <ul>
                    {body.reading.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={12} aria-hidden="true" /></a>
                        <span>{source.publisher}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {onRoadmaps.length > 0 && (
                <aside className="learn-on-roadmap" aria-label="Roadmaps that include this topic">
                  <MapIcon size={15} aria-hidden="true" />
                  <p>On the roadmap: {onRoadmaps.map((entry, index) => (
                    <span key={entry.page}>{index > 0 && " · "}<Link to={topicPath(entry.page)}>{entry.title}</Link> (step {entry.stage}: {entry.stageTitle.toLowerCase()})</span>
                  ))}</p>
                </aside>
              )}

              {body.related?.length > 0 && (
                <nav className="learn-related" aria-label="Related topics">
                  <h2>Related topics</h2>
                  <ul>
                    {body.related.map(topicMeta).filter(Boolean).map((topic) => (
                      <li key={topic.slug}><Link to={topicPath(topic.slug)}>{topic.short}</Link><p>{topic.description}</p></li>
                    ))}
                  </ul>
                </nav>
              )}

              <nav className="learn-pager" aria-label="Previous and next topic">
                {previous ? <Link to={topicPath(previous.slug)}><span><ArrowLeft size={13} /> Previous</span>{previous.short}</Link> : <span />}
                {next ? <Link className="next" to={topicPath(next.slug)}><span>Next <ArrowRight size={13} /></span>{next.short}</Link> : <span />}
              </nav>

              <aside className="learn-write-cta compact">
                <p><PenLine size={15} /> Know a topic well? Write an article for the handbook and get credited for it.</p>
                <Link to="/learn/write">Submit your own article <ArrowRight size={14} /></Link>
              </aside>
            </>
          )}
        </article>
        <OnThisPage headings={headings} />
      </div>
      <SiteFooter />
    </main>
  );
}

// ------------------------------------------------------------------ hub

// A picture for each category, so the index can be scanned by shape as well as by name.
const CATEGORY_ICONS = {
  foundations: Gauge, networking: Network, databases: Database, caching: Zap, messaging: ListOrdered,
  distributed: Share2, reliability: ShieldCheck, architecture: Boxes, security: Lock,
  "building-blocks": Blocks, "low-level-design": Braces, "data-engineering": Workflow, "machine-learning": Brain,
  "ai-architecture": Bot, operations: Server, "frontend-mobile": Smartphone, interview: MessageSquare, roadmaps: MapIcon,
};
const TILE_SHOWN = 5;
const PREP = ["system-design-interview", "system-design-interview-questions", "how-to-practice-system-design"];

// The handbook's front door, modelled on documentation home pages: one search, then two
// ways in. Roadmaps for readers who want an order to follow; topic tiles for readers who
// know what they're looking for. Each tile shows its first guides and opens to the rest.
export function LearnHubPage() {
  useCommunityArticles();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const all = CATEGORIES.flatMap(categoryEntries);
  const results = needle ? all.filter((entry) => `${entry.title} ${entry.short} ${entry.description} ${categoryById(entry.category)?.title || ""}`.toLowerCase().includes(needle)) : [];
  const general = ROADMAPS["system-design"];
  const families = GROUPS.filter((group) => group.id !== "start");

  // Links such as a topic's breadcrumb ("/learn#caching") land on that category.
  const { hash } = useRoute();
  useEffect(() => {
    if (!hash) return undefined;
    const timer = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <main className="learn-page lh-page dot-ground">
      <div className="lh wrap">
        <header className="lh-head">
          <h1>System design handbook</h1>
          <p className="lh-lede">Free guides with diagrams, from the first building blocks to distributed systems, and roadmaps that put them in order for your role.</p>
          <SearchBox className="lh-search" value={query} onChange={setQuery} label="Search the handbook" placeholder="Search guides: caching, Kafka, consistent hashing…" />
          <p className="sr-only" role="status">{needle ? (results.length ? "Showing matching guides" : "No guides match") : ""}</p>
        </header>

        {needle ? (
          <section className="lh-results" aria-label="Search results">
            <p className="lh-results-count">{results.length ? `Guides matching “${query.trim()}”` : `No guides match “${query.trim()}”`}</p>
            {results.length > 0 ? (
              <ul>
                {results.map((entry) => (
                  <li key={entry.slug}>
                    <Link to={topicPath(entry.slug)}>
                      <strong>{entry.title}{entry.community && <Users size={13} className="learn-community-mark" aria-label="Community article" />}</strong>
                      <span>{entry.description}</span>
                    </Link>
                    <small>{categoryById(entry.category)?.title}{entry.level ? ` · ${entry.level}` : ""}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lh-empty">Try a broader word such as “cache”, “queue” or “database”.</p>
            )}
          </section>
        ) : (
          <>
            <section className="lh-section" id="roadmaps" aria-labelledby="lh-roadmaps-title">
              <div className="lh-section-head">
                <h2 id="lh-roadmaps-title">Follow a roadmap</h2>
                <p>Start with the core, then go deeper for your role.</p>
              </div>
              <div className="lh-core">
                <div className="lh-core-copy">
                  <MapIcon size={24} aria-hidden="true" />
                  <h3><Link to={topicPath(general.page)}>Core system design roadmap</Link></h3>
                  <p>Every role starts here: the building blocks every design round uses. For backend and full-stack interviews, it's most of what's tested.</p>
                  <span className="lh-path-go">Start the core roadmap <ArrowRight size={15} /></span>
                </div>
                <ol className="lh-core-stages" aria-label="Stages of the core roadmap">
                  {general.stages.map((item) => <li key={item.title}>{item.title}</li>)}
                </ol>
              </div>
              <h3 className="lh-then">Then go deeper for your role</h3>
              <ul className="lh-paths">
                {tracks.map((track) => {
                  const page = DISCIPLINES[track.id].roadmap;
                  const roadmap = Object.values(ROADMAPS).find((entry) => entry.page === page);
                  // Lower-case the first word unless it is an acronym ("APIs in depth").
                  const covers = roadmap.stages.slice(0, 3).map((item) => item.title.replace(/^([A-Z])(?![A-Z])/, (first) => first.toLowerCase())).join(", ");
                  return (
                    <li key={track.id} className={`lh-path tone-${track.color}`}>
                      <span className="lh-path-dot" aria-hidden="true" />
                      <h3><Link to={topicPath(page)}>{track.label}</Link></h3>
                      <p>{roadmap.basedOn ? `After the core: ${covers} and more.` : `Its own path, separate from the core: ${covers} and more.`}</p>
                      <span className="lh-path-go">Open roadmap <ArrowRight size={15} /></span>
                    </li>
                  );
                })}
              </ul>
              <p className="lh-prep">
                <MessageSquare size={16} aria-hidden="true" />
                <span>Interview soon? Read</span>
                {PREP.map(topicMeta).filter(Boolean).map((topic, index) => (
                  <span key={topic.slug}>{index > 0 && (index === PREP.length - 1 ? " and " : ", ")}<Link to={topicPath(topic.slug)}>{topic.short.toLowerCase()}</Link></span>
                ))}
              </p>
            </section>

            <section className="lh-section" id="topics" aria-labelledby="lh-topics-title">
              <div className="lh-section-head">
                <h2 id="lh-topics-title">Browse by topic</h2>
                <p>Every guide, grouped the way the sidebar groups them.</p>
              </div>
              {families.map((group) => (
                <div key={group.id} className="lh-family">
                  <h3 className="lh-family-title">{group.title}</h3>
                  <div className="lh-tiles">
                    {group.categories.map(categoryById).filter(Boolean).map((category) => {
                      const list = categoryEntries(category);
                      const Icon = CATEGORY_ICONS[category.id] ?? BookOpen;
                      const shown = list.slice(0, TILE_SHOWN);
                      const more = list.slice(TILE_SHOWN);
                      return (
                        <section key={category.id} id={category.id} className="lh-tile" aria-labelledby={`lh-cat-${category.id}`}>
                          <div className="lh-tile-head">
                            <span className="lh-tile-icon" aria-hidden="true"><Icon size={20} /></span>
                            <h4 id={`lh-cat-${category.id}`}>{category.title}</h4>
                          </div>
                          {category.blurb && <p className="lh-tile-blurb">{category.blurb}</p>}
                          <TopicList list={shown} />
                          {more.length > 0 && (
                            <details className="lh-more">
                              <summary>More guides <ChevronDown size={14} aria-hidden="true" /></summary>
                              <TopicList list={more} />
                            </details>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="lh-close" aria-label="Practise and contribute">
              <div>
                <h2>Reading is half of it</h2>
                <p>Interviews test whether you can apply these ideas under time pressure and defend your choices. Practise on a design round with an AI interviewer that asks why.</p>
                <Link className="btn btn-primary btn-lg" to="/library">Browse design rounds <ArrowRight size={16} className="nudge" /></Link>
              </div>
              <div>
                <h2>Know a topic well?</h2>
                <p>Write an article for the handbook. Draft it with a live preview and our editors will help you polish it before it goes live with your name on it.</p>
                <Link className="lp-text-link" to="/learn/write"><PenLine size={15} /> Write an article</Link>
              </div>
            </section>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

function TopicList({ list }) {
  return (
    <ul className="lh-topics">
      {list.map((topic) => (
        <li key={topic.slug}>
          <Link to={topicPath(topic.slug)} title={topic.description}>{topic.short}</Link>
          {topic.community && <Users size={12} className="learn-community-mark" aria-label="Community article" />}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ community articles

// The body of a community article: blocks from its Markdown. Shared by the published
// page and the editor's preview, so authors see exactly what will be published.
export function ArticleBody({ markdown }) {
  const blocks = useMemo(() => markdownToBlocks(markdown), [markdown]);
  return blocks.map((block, index) => <Block key={index} block={block} />);
}

export const articleHeadings = (markdown) => markdownToBlocks(markdown).filter((block) => block.type === "h2").map((block) => ({ id: headingId(block.text), text: block.text }));

// Header shared by published community articles and the editor's preview.
export function CommunityArticleHeader({ article, category }) {
  const minutes = Math.max(3, Math.round(String(article.body || "").split(/\s+/).length / 220));
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><ChevronRight size={13} />
        <Link to={LEARN_PATH}>Learn</Link><ChevronRight size={13} />
        {category && <><Link to={`${LEARN_PATH}#${category.id}`}>{category.title}</Link><ChevronRight size={13} /></>}
        <span aria-current="page">{article.shortTitle || article.title}</span>
      </nav>
      <header>
        <h1>{article.title || "Untitled article"}</h1>
        {article.description && <p className="learn-lede">{article.description}</p>}
        <p className="guide-meta">
          {article.level && <LevelTag level={article.level} />}
          <span className="learn-byline"><Users size={13} /> Community article{article.authorName ? ` by ${article.authorName}` : ""}</span>
          <Clock3 size={14} /> {minutes} min read
        </p>
      </header>
    </>
  );
}

export function CommunityArticlePage({ slug }) {
  useCommunityArticles();
  const [article, setArticle] = useState(() => loadedCommunityArticle(slug));
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (loadedCommunityArticle(slug)) { setArticle(loadedCommunityArticle(slug)); return undefined; }
    loadCommunityArticle(slug).then((loaded) => { if (cancelled) return; if (loaded) setArticle(loaded); else setMissing(true); });
    return () => { cancelled = true; };
  }, [slug]);
  const headings = useMemo(() => (article ? articleHeadings(article.body) : []), [article]);
  const category = article ? categoryById(article.category) : null;

  return (
    <main className="learn-page">
      <div className="learn-layout">
        <LearnSidebar currentSlug={slug} />
        <article className="prose learn-article">
          {missing ? (
            <header><h1>Article not found</h1><p className="learn-lede">This article doesn’t exist or isn’t published. <Link to={LEARN_PATH}>Back to the handbook</Link>.</p></header>
          ) : !article ? (
            <p className="learn-loading" role="status"><LoaderCircle size={16} className="spin" /> Loading…</p>
          ) : (
            <>
              <CommunityArticleHeader article={article} category={category} />
              <ArticleBody markdown={article.body} />
              <aside className="learn-write-cta compact">
                <p><PenLine size={15} /> Written by a member of the DesignRounds community and reviewed by our editors.</p>
                <Link to="/learn/write">Write your own article <ArrowRight size={14} /></Link>
              </aside>
            </>
          )}
        </article>
        <OnThisPage headings={headings} />
      </div>
      <SiteFooter />
    </main>
  );
}
