import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronRight, Clock3, LoaderCircle, Menu, PenLine, Search, Users, X } from "lucide-react";
import { getTrack, prompts, tracks } from "../data/prompts.js";
import { CATEGORIES, LEARN_PATH, LEARN_UPDATED, START_HERE, TOPICS, categoryById, neighbours, topicMeta, topicPath } from "../learn/catalog.js";
import { Diagram } from "../learn/Diagram.jsx";
import { useTopic } from "../learn/topics.js";
import { communityArticle, communityInCategory, loadCommunityArticle, loadedCommunityArticle, useCommunityArticles } from "../learn/community.js";
import { markdownToBlocks } from "../learn/markdown.js";
import { Rich, plainText } from "../components/rich.jsx";
import { LevelMeter, SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";
import { roundPath, trackPath, TRACK_SEO } from "../seo.js";

const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"];
const formatDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const headingId = (text) => plainText(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function LevelTag({ level }) {
  return <span className={`learn-level learn-level-${level.toLowerCase()}`}>{level}</span>;
}

// ------------------------------------------------------------------ sidebar

export function LearnSidebar({ currentSlug }) {
  useCommunityArticles();
  const currentCategory = currentSlug ? (topicMeta(currentSlug) ?? communityArticle(currentSlug))?.category : null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => new Set(currentCategory ? [currentCategory] : CATEGORIES.map((category) => category.id)));
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
    if (currentCategory) setOpen((previous) => new Set([...previous, currentCategory]));
  }, [currentSlug, currentCategory]);

  const needle = query.trim().toLowerCase();
  const matches = (topic) => !needle || `${topic.title} ${topic.short} ${topic.description}`.toLowerCase().includes(needle);

  return (
    <aside className={`learn-sidebar ${drawer ? "open" : ""}`} aria-label="Learn topics">
      <button className="learn-drawer-toggle" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
        {drawer ? <X size={16} /> : <Menu size={16} />} {drawer ? "Close topics" : "Browse topics"}
      </button>
      <div className="learn-sidebar-inner">
        <Link className="learn-home-link" to={LEARN_PATH} aria-current={currentSlug ? undefined : "page"}><BookOpen size={15} /> System Design Handbook</Link>
        <label className="learn-search">
          <Search size={14} />
          <input type="search" placeholder={`Search ${TOPICS.length} topics`} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search topics" />
        </label>
        <Link className="learn-write-link" to="/learn/write"><PenLine size={14} /> Write an article</Link>
        <nav>
          {CATEGORIES.map((category) => {
            const community = communityInCategory(category.id).map((article) => ({ slug: article.slug, title: article.title, short: article.shortTitle, description: article.description, community: true }));
            const topics = [...category.topics, ...community].filter(matches);
            if (!topics.length) return null;
            const expanded = Boolean(needle) || open.has(category.id);
            return (
              <div key={category.id} className="learn-nav-group">
                <button
                  className="learn-nav-heading"
                  aria-expanded={expanded}
                  onClick={() => setOpen((previous) => { const next = new Set(previous); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next; })}
                >
                  <ChevronDown size={14} className={expanded ? "" : "collapsed"} /> {category.title} <span>{category.topics.length + community.length}</span>
                </button>
                <ul hidden={!expanded}>
                  {topics.map((topic) => (
                    <li key={topic.slug}>
                      <Link to={topicPath(topic.slug)} aria-current={topic.slug === currentSlug ? "page" : undefined}>{topic.short}{topic.community && <Users size={11} className="learn-community-mark" aria-label="Community article" />}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {needle && !TOPICS.some(matches) && <p className="learn-search-empty">No topics match "{query}".</p>}
        </nav>
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

  const headings = useMemo(() => {
    if (!body) return [];
    const list = body.blocks.filter((block) => block.type === "h2").map((block) => ({ id: headingId(block.text), text: block.text }));
    if (body.generated === "questions") list.push(...tracks.map((track) => ({ id: headingId(TRACK_SEO[track.id].h1), text: TRACK_SEO[track.id].h1 })));
    if (body.uses?.length) list.push({ id: "where-its-used", text: "Where it's used" });
    if (body.interview?.length) list.push({ id: "in-an-interview", text: "In an interview" });
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
            <span className="kicker">{category.title}</span>
            <h1>{meta.title}</h1>
            <p className="learn-lede">{meta.description}</p>
            <p className="guide-meta">
              <LevelTag level={meta.level} />
              {body && <><Clock3 size={14} /> {Math.max(3, Math.round(wordCount(body) / 220))} min read ·</>} Updated <time dateTime={meta.published ? LEARN_UPDATED : LEARN_UPDATED}>{formatDate(LEARN_UPDATED)}</time>
            </p>
          </header>

          {loadError ? (
            <div className="learn-load-error" role="alert">
              <p>Article content couldn't be loaded. Reload the page to try again.</p>
              <button className="btn btn-ghost" onClick={retry}>Reload page</button>
            </div>
          ) : !body ? (
            <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>
          ) : (
            <>
              {body.blocks.map((block, index) => <Block key={index} block={block} />)}
              {body.generated === "questions" && <QuestionsByTrack />}

              {body.uses?.length > 0 && (
                <section>
                  <h2 id="where-its-used">Where it's used</h2>
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

const DOMAIN_GUIDES = {
  "software-engineering": ["system-design-interview", "caching", "message-queues"],
  "data-engineering": ["data-engineering-architecture", "batch-vs-stream-processing", "event-streaming-kafka"],
  "machine-learning": ["machine-learning-system-architecture", "ai-application-architecture", "batch-vs-stream-processing"],
  "platform-infrastructure": ["observability", "service-mesh", "health-checks-failover"],
  "distributed-systems": ["consistency-models", "replication", "event-streaming-kafka"],
  "frontend-mobile": ["cdn", "real-time-communication", "authentication-authorization"],
};

export function LearnHubPage() {
  useCommunityArticles();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const needle = query.trim().toLowerCase();
  const community = CATEGORIES.flatMap((category) => communityInCategory(category.id).map((article) => ({
    slug: article.slug,
    title: article.title,
    short: article.shortTitle || article.title,
    description: article.description,
    level: article.level,
    category: category.id,
    community: true,
  })));
  const entries = [...TOPICS, ...community];
  const matches = (topic) => !needle || `${topic.title} ${topic.short} ${topic.description} ${categoryById(topic.category)?.title || ""}`.toLowerCase().includes(needle);
  const start = START_HERE.slice(0, 4).map(topicMeta).filter(Boolean);

  return (
    <main className="learn-page">
      <div className="learn-layout learn-layout-hub">
        <LearnSidebar currentSlug={null} />
        <div className="learn-hub">
          <header className="learn-hub-head learn-hub-hero">
            <span className="kicker">Learn by domain · {entries.length} free guides</span>
            <h1>Build system design knowledge that sticks.</h1>
            <p className="learn-lede">Start with the fundamentals, explore the discipline you work in, then go deeper into the patterns behind real production systems. Read a guide or put the ideas into practice with a design round.</p>
            <div className="learn-hub-stats" aria-label="Handbook overview">
              <span><strong>{tracks.length}</strong> interview domains</span>
              <span><strong>{CATEGORIES.length}</strong> topic categories</span>
              <span><strong>{entries.length}</strong> practical guides</span>
            </div>
            <label className="learn-hub-search">
              <Search size={17} />
              <input type="search" placeholder="Search concepts, domains, or technologies" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search handbook guides" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
            </label>
          </header>

          <section className="learn-domain-section" aria-labelledby="learn-domains-title">
            <div className="learn-section-heading">
              <div><span className="kicker">Choose your path</span><h2 id="learn-domains-title">Explore by interview domain</h2></div>
              <Link to="/library">Browse all practice rounds <ArrowRight size={14} /></Link>
            </div>
            <div className="learn-domain-grid">
              {tracks.map((track) => {
                const guides = (DOMAIN_GUIDES[track.id] || []).map(topicMeta).filter(Boolean);
                return (
                  <article key={track.id} className={`learn-domain-card learn-domain-${track.color}`}>
                    <div className="learn-domain-title"><span><BookOpen size={17} /></span><h3>{track.label}</h3></div>
                    <p>{track.description}</p>
                    <ul aria-label={`${track.label} reading suggestions`}>
                      {guides.map((topic) => <li key={topic.slug}><Link to={topicPath(topic.slug)}>{topic.short}<ArrowRight size={12} /></Link></li>)}
                    </ul>
                    <Link className="learn-domain-practice" to={trackPath(track.id)}>Practice {track.shortLabel} rounds <ArrowRight size={14} /></Link>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="learn-topic-browser" aria-labelledby="learn-topics-title">
            <div className="learn-section-heading learn-topic-browser-heading">
              <div><span className="kicker">Go deeper</span><h2 id="learn-topics-title">Browse the handbook</h2></div>
              <p>{needle ? `${entries.filter(matches).length} matching guides` : `${entries.length} guides across ${CATEGORIES.length} categories`}</p>
            </div>
            <div className="learn-category-filters" aria-label="Filter topics by category">
              <button type="button" aria-pressed={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>All topics</button>
              {CATEGORIES.map((category) => (
                <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)}>
                  {category.title}<span>{category.topics.length + communityInCategory(category.id).length}</span>
                </button>
              ))}
            </div>
            {selectedCategory === "all" && !needle && (
              <section className="learn-start">
                <div><span className="kicker">New to system design?</span><h3>Start with the essentials</h3><p>Understand the interview, then build up from scale and latency.</p></div>
                <ol>{start.map((topic) => <li key={topic.slug}><Link to={topicPath(topic.slug)}>{topic.short}</Link><LevelTag level={topic.level} /></li>)}</ol>
              </section>
            )}
            <div className="learn-categories">
            {CATEGORIES.map((category) => (
              (selectedCategory === "all" || selectedCategory === category.id) && (() => {
                const categoryEntries = [...category.topics, ...communityInCategory(category.id).map((article) => ({
                  slug: article.slug,
                  title: article.title,
                  short: article.shortTitle || article.title,
                  description: article.description,
                  level: article.level,
                  category: category.id,
                  community: true,
                }))].filter(matches);
                if (!categoryEntries.length) return null;
                const expanded = Boolean(needle) || selectedCategory === category.id;
                const visible = expanded ? categoryEntries : categoryEntries.slice(0, 4);
                return (
              <section key={category.id} id={category.id} className="learn-category">
                <div className="learn-category-heading"><h3>{category.title}</h3><span>{categoryEntries.length} {categoryEntries.length === 1 ? "guide" : "guides"}</span></div>
                <p>{category.blurb}</p>
                <ul>
                  {visible.map((topic) => (
                    <li key={topic.slug} className="learn-topic-item">
                      <Link to={topicPath(topic.slug)}>
                        <strong>{topic.title}{topic.community && <Users size={12} className="learn-community-mark" aria-label="Community article" />}</strong>
                        <span>{topic.description}</span>
                      </Link>
                      <LevelTag level={topic.level} />
                    </li>
                  ))}
                </ul>
                {!expanded && categoryEntries.length > visible.length && (
                  <button className="learn-category-more" type="button" onClick={() => setSelectedCategory(category.id)}>Browse all {categoryEntries.length} guides <ArrowRight size={13} /></button>
                )}
              </section>
                );
              })()
            ))}
            </div>
            {entries.filter(matches).length === 0 && <p className="learn-no-results">No guides match “{query}”. Try a broader term or clear your search.</p>}
          </section>

          <aside className="learn-write-cta">
            <div>
              <h2><PenLine size={18} /> Know something worth sharing?</h2>
              <p>Write an article for the handbook. Draft it with a live preview, submit it for review, and our editors will help you polish it before it goes live with your name on it.</p>
            </div>
            <Link className="btn btn-ghost btn-lg" to="/learn/write">Write an article <ArrowRight size={16} /></Link>
          </aside>

          <aside className="guide-cta">
            <h2>Reading is half of it</h2>
            <p>Interviews test whether you can apply these ideas under time pressure and defend your choices. Practise on a real design round with an AI interviewer that asks why.</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" to="/library">Browse design rounds <ArrowRight size={16} className="nudge" /></Link>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
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
        <span className="kicker">{category?.title ?? "Community"}</span>
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
            <header><h1>Article not found</h1><p className="learn-lede">This article doesn't exist or isn't published. <Link to={LEARN_PATH}>Back to the handbook</Link>.</p></header>
          ) : !article ? (
            <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>
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
