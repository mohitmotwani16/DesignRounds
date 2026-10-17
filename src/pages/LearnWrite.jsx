import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Eye, FileText, LoaderCircle, MessageSquare, PenLine, Plus, Send, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { CATEGORIES, LEARN_PATH, WRITABLE_CATEGORY_IDS, categoryById } from "../learn/catalog.js";
import { ARTICLE_LIMITS, LEVELS, articleProblems, slugify } from "../learn/markdown.js";
import { SITE } from "../seo.js";
import { Link, navigate } from "../router.js";
import { ArticleBody, CommunityArticleHeader } from "./Learn.jsx";
import { SiteFooter } from "../components/site.jsx";

const WRITABLE_CATEGORIES = CATEGORIES.filter((category) => WRITABLE_CATEGORY_IDS.includes(category.id));
const STATUS = {
  draft: ["Draft", "muted"],
  in_review: ["In review", "accent"],
  changes_requested: ["Changes requested", "warning"],
  published: ["Published", "ok"],
  rejected: ["Not accepted", "danger"],
};

export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] ?? [status, "muted"];
  return <span className={`article-status article-status-${tone}`}>{label}</span>;
}

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

// ------------------------------------------------------------------ my articles

export default function LearnWritePage({ id }) {
  if (id === "new") return <ArticleEditor key="new" />;
  if (id) return <ArticleEditor key={id} id={id} />;
  return <MyArticles />;
}

function MyArticles() {
  const [state, setState] = useState({ status: "loading", articles: [] });
  useEffect(() => {
    api.myArticles().then(({ articles }) => setState({ status: "ready", articles })).catch((error) => setState({ status: "error", error, articles: [] }));
  }, []);
  return (
    <main className="write-page">
      <div className="wrap write-wrap">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to={LEARN_PATH}>Learn</Link><span>/</span><span aria-current="page">Write</span></nav>
        <header className="write-head">
          <div>
            <h1>Write for the handbook</h1>
            <p>Share what you know about system design. Draft your article with a live preview, submit it for review, and our editors will work with you before it's published under your name.</p>
          </div>
          <Link className="btn btn-primary btn-lg" to="/learn/write/new"><Plus size={16} /> New article</Link>
        </header>
        <ol className="write-steps">
          <li><strong>Write</strong> in Markdown and check the live preview.</li>
          <li><strong>Submit</strong> for review. Editors get an email right away.</li>
          <li><strong>Revise</strong> if an editor asks for changes. You'll get their notes by email.</li>
          <li><strong>Publish</strong>: your article goes live in the handbook with your name.</li>
        </ol>
        {state.status === "loading" && <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading your articles…</p>}
        {state.status === "error" && <p className="form-error">{state.error.message}</p>}
        {state.status === "ready" && (state.articles.length ? (
          <ul className="write-list">
            {state.articles.map((article) => (
              <li key={article.id}>
                <Link to={`/learn/write/${article.id}`}>
                  <FileText size={16} />
                  <span className="write-list-title">{article.title}<small>/learn/{article.slug}</small></span>
                  <StatusBadge status={article.status} />
                  <span className="write-list-date">{formatDate(article.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="write-empty">You haven't written anything yet. Start with a topic you've designed or operated in real life.</p>)}
      </div>
      <SiteFooter />
    </main>
  );
}

// ------------------------------------------------------------------ editor

const EMPTY = { title: "", shortTitle: "", description: "", category: "architecture", level: "Intermediate", slug: "", body: "" };
const STARTER = `## The problem

Explain what problem this solves and when engineers run into it.

## How it works

Walk through the mechanism step by step. Use **bold** for key terms and \`code\` for names.

- A bullet point
- Another one

## Trade-offs

| Option | Good for | Watch out for |
|---|---|---|
| Option A | … | … |

## Where it's used

Real systems that use this, and what they gained.

> Tip: link related handbook topics, like [caching](/learn/caching).
`;

function ArticleEditor({ id }) {
  const { user } = useAuth();
  const [article, setArticle] = useState(id ? null : { ...EMPTY, body: STARTER, status: "draft" });
  const [saved, setSaved] = useState(id ? null : { ...EMPTY });
  const [messages, setMessages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [problems, setProblems] = useState([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [slugState, setSlugState] = useState(null);
  const [tab, setTab] = useState("write");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getArticle(id)
      .then(({ article: loaded, messages: thread }) => { setArticle(loaded); setSaved(loaded); setMessages(thread); })
      .catch((loadFailure) => setLoadError(loadFailure));
  }, [id]);

  const editable = article && (article.status === "draft" || article.status === "changes_requested") && (!article.id || saved);
  const dirty = article && saved && ["title", "shortTitle", "description", "category", "level", "slug", "body"].some((key) => article[key] !== saved[key]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Check the slug as the author types.
  const slugTimer = useRef(0);
  useEffect(() => {
    if (!article?.slug) { setSlugState(null); return undefined; }
    window.clearTimeout(slugTimer.current);
    slugTimer.current = window.setTimeout(() => {
      api.slugAvailable(article.slug, article.id).then(setSlugState).catch(() => setSlugState(null));
    }, 400);
    return () => window.clearTimeout(slugTimer.current);
  }, [article?.slug, article?.id]);

  const set = (key) => (event) => {
    const value = event.target.value;
    setArticle((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(value);
      return next;
    });
    setNotice("");
  };

  const save = useCallback(async () => {
    setError(null);
    setBusy("save");
    try {
      if (!article.id) {
        const { article: created } = await api.createArticle({
          title: article.title || "Untitled article", slug: article.slug || slugify(article.title) || `article-${Date.now()}`,
          category: article.category, level: article.level, shortTitle: article.shortTitle, description: article.description, body: article.body,
        });
        setArticle(created); setSaved(created); setSlugTouched(true);
        navigate(`/learn/write/${created.id}`, { replace: true });
        setNotice("Draft saved.");
        return created;
      }
      const changes = Object.fromEntries(["title", "shortTitle", "description", "category", "level", "slug", "body"].filter((key) => article[key] !== saved[key]).map((key) => [key, article[key]]));
      if (!Object.keys(changes).length) return article;
      const { article: updated } = await api.updateArticle(article.id, changes);
      setArticle(updated); setSaved(updated);
      setNotice("Draft saved.");
      return updated;
    } catch (saveError) {
      setError(saveError.message);
      return null;
    } finally {
      setBusy("");
    }
  }, [article, saved]);

  async function submit() {
    const local = articleProblems(article, { categories: WRITABLE_CATEGORIES, taken: () => slugState?.reason === "handbook" });
    setProblems(local);
    if (local.length) { setError("A few things need fixing before you can submit."); return; }
    const current = await save();
    if (!current) return;
    setBusy("submit");
    try {
      const result = await api.submitArticle(current.id);
      setArticle(result.article); setSaved(result.article); setMessages(result.messages); setProblems([]);
      setNotice("Submitted! We've emailed our editors. You'll hear back by email.");
    } catch (submitError) {
      setError(submitError.message);
      if (submitError.problems) setProblems(submitError.problems);
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    await api.deleteArticle(article.id);
    navigate("/learn/write");
  }

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "s" && editable) { event.preventDefault(); save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, save]);

  if (loadError) return <main className="write-page"><div className="wrap write-wrap"><p className="form-error">{loadError.message}</p><Link to="/learn/write">Back to your articles</Link></div></main>;
  if (!article) return <main className="write-page"><div className="wrap write-wrap"><p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p></div></main>;

  const category = categoryById(article.category);
  const counter = (key) => {
    const [min, max] = ARTICLE_LIMITS[key];
    const n = article[key].trim().length;
    return <span className={`write-counter ${n && (n < min || n > max) ? "bad" : ""}`}>{n}/{max}</span>;
  };
  const latestFeedback = [...messages].reverse().find((message) => message.role === "admin");

  return (
    <main className="write-page write-editor-page">
      <div className="write-editor-head">
        <Link to="/learn/write" className="write-back"><ArrowLeft size={14} /> Your articles</Link>
        <StatusBadge status={article.status} />
        <div className="write-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}><PenLine size={14} /> Write</button>
          <button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}><Eye size={14} /> Preview</button>
        </div>
        <div className="write-actions">
          {notice && <span className="write-notice"><Check size={14} /> {notice}</span>}
          {editable && article.id && article.status === "draft" && <button className="btn btn-ghost" onClick={remove} title="Delete draft"><Trash2 size={15} /></button>}
          {editable && <button className="btn btn-ghost" disabled={Boolean(busy) || (article.id && !dirty)} onClick={save}>{busy === "save" ? <LoaderCircle size={15} className="spin" /> : null} Save draft</button>}
          {editable && <button className="btn btn-primary" disabled={Boolean(busy)} onClick={submit}>{busy === "submit" ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />} {article.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}</button>}
          {article.status === "published" && <Link className="btn btn-primary" to={`/learn/${article.slug}`}>View live article</Link>}
        </div>
      </div>

      {article.status === "in_review" && <p className="write-banner">Your article is with our editors. We'll email you when they've reviewed it; you can still message them below.</p>}
      {article.status === "changes_requested" && latestFeedback && <p className="write-banner warning"><strong>An editor asked for changes:</strong> {latestFeedback.body}</p>}
      {article.status === "rejected" && <p className="write-banner danger">This article wasn't accepted. See the editor's notes below.</p>}
      {(error || problems.length > 0) && (
        <div className="write-problems" role="alert">
          <AlertTriangle size={16} />
          <div>
            {error && <p>{error}</p>}
            {problems.length > 0 && <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
          </div>
          <button aria-label="Dismiss" onClick={() => { setError(null); setProblems([]); }}><X size={14} /></button>
        </div>
      )}

      <div className={`write-columns show-${tab}`}>
        <section className="write-form" aria-label="Article details">
          <fieldset disabled={!editable}>
            <label className="field-label" htmlFor="a-title">Title {counter("title")}</label>
            <input id="a-title" className="text-input" value={article.title} onChange={set("title")} placeholder="Designing a Feature Flag Service" maxLength={120} />

            <div className="write-row">
              <div>
                <label className="field-label" htmlFor="a-category">Section</label>
                <select id="a-category" className="text-input" value={article.category} onChange={set("category")}>
                  {WRITABLE_CATEGORIES.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="a-level">Level</label>
                <select id="a-level" className="text-input" value={article.level} onChange={set("level")}>
                  {LEVELS.map((level) => <option key={level}>{level}</option>)}
                </select>
              </div>
            </div>

            <label className="field-label" htmlFor="a-short">Sidebar label {counter("shortTitle")}</label>
            <input id="a-short" className="text-input" value={article.shortTitle} onChange={set("shortTitle")} placeholder="Feature flags" maxLength={60} />

            <label className="field-label" htmlFor="a-description">Summary <small>shown under the title and in Google results</small> {counter("description")}</label>
            <textarea id="a-description" className="text-input" rows={2} value={article.description} onChange={set("description")} placeholder="One or two sentences on what the reader will learn." maxLength={220} />

            <label className="field-label" htmlFor="a-slug">URL</label>
            <div className="write-slug">
              <span>{SITE.url.replace("https://", "")}/learn/</span>
              <input id="a-slug" value={article.slug} onChange={(event) => { setSlugTouched(true); setArticle((current) => ({ ...current, slug: slugify(event.target.value) || event.target.value.toLowerCase() })); }} maxLength={80} />
              {slugState && <em className={slugState.available ? "ok" : "bad"}>{slugState.available ? "available" : slugState.reason === "handbook" ? "used by the handbook" : slugState.reason === "invalid" ? "invalid" : "taken"}</em>}
            </div>

            <label className="field-label" htmlFor="a-body">Article <small>Markdown: ## headings, - lists, | tables |, ``` code, &gt; callouts, **bold**, [links](/learn/caching)</small> {counter("body")}</label>
            <textarea id="a-body" className="text-input write-body" value={article.body} onChange={set("body")} spellCheck />
          </fieldset>
        </section>

        <section className="write-preview" aria-label="Preview">
          <div className="write-placement">
            <span><strong>URL</strong> {SITE.url.replace("https://", "")}/learn/{article.slug || "…"}</span>
            <span><strong>Sidebar</strong> {category?.title ?? "—"} › {article.shortTitle || article.title || "…"}</span>
          </div>
          <article className="prose learn-article write-preview-article">
            <CommunityArticleHeader article={{ ...article, authorName: user?.displayName || user?.email?.split("@")[0] }} category={category} />
            <ArticleBody markdown={article.body} />
          </article>
        </section>
      </div>

      {article.id && <ArticleThread articleId={article.id} messages={messages} onMessages={setMessages} placeholder="Message the editors…" />}
      <SiteFooter />
    </main>
  );
}

// ------------------------------------------------------------------ review conversation

export function ArticleThread({ articleId, messages, onMessages, placeholder }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const visible = useMemo(() => messages, [messages]);

  async function send() {
    if (draft.trim().length < 2) return;
    setBusy(true); setError(null);
    try {
      const { messages: updated } = await api.sendArticleMessage(articleId, draft.trim());
      onMessages(updated); setDraft("");
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="article-thread" aria-label="Review conversation">
      <h2><MessageSquare size={16} /> Review conversation</h2>
      {visible.length === 0 && <p className="write-empty">No messages yet.</p>}
      <ol>
        {visible.map((message) => (
          <li key={message.id} className={`thread-${message.role}`}>
            {message.role === "system" ? (
              <span className="thread-system">{message.body} · {formatDate(message.createdAt)}</span>
            ) : (
              <>
                <span className="thread-meta">{message.role === "admin" ? "Editor" : message.authorName || "Author"} · {formatDate(message.createdAt)}</span>
                <p>{message.body}</p>
              </>
            )}
          </li>
        ))}
      </ol>
      <div className="thread-compose">
        <textarea className="text-input" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} maxLength={4000} />
        <button className="btn btn-ghost" disabled={busy || draft.trim().length < 2} onClick={send}>{busy ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />} Send</button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
