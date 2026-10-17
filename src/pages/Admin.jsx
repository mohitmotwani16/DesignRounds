import { useEffect, useState } from "react";
import { ArrowLeft, Check, ExternalLink, LoaderCircle, Save, Search, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { CATEGORIES, categoryById } from "../learn/catalog.js";
import { SITE } from "../seo.js";
import { Link } from "../router.js";
import { ArticleBody, CommunityArticleHeader } from "./Learn.jsx";
import { ArticleThread, StatusBadge } from "./LearnWrite.jsx";

const FILTERS = [["in_review", "In review"], ["changes_requested", "Changes requested"], ["published", "Published"], ["rejected", "Not accepted"], ["all", "All"]];
const formatDate = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <main className="write-page"><div className="wrap write-wrap">
        <h1>Admins only</h1>
        <p>This area is for DesignRounds editors. If you should have access, ask an existing admin to add your account.</p>
        <Link to="/learn">Back to the handbook</Link>
      </div></main>
    );
  }
  return children;
}

export default function AdminPage({ articleId }) {
  return <AdminOnly>{articleId ? <ReviewArticle id={articleId} /> : <AdminHome />}</AdminOnly>;
}

// ------------------------------------------------------------------ queue + admins

function AdminHome() {
  const [tab, setTab] = useState("articles");
  return (
    <main className="write-page">
      <div className="wrap write-wrap">
        <header className="write-head">
          <div>
            <h1><ShieldCheck size={24} /> Admin</h1>
            <p>Review community articles, manage admins, and grant expiring Plus access.</p>
          </div>
        </header>
        <div className="admin-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "articles"} onClick={() => setTab("articles")}>Articles</button>
          <button role="tab" aria-selected={tab === "admins"} onClick={() => setTab("admins")}>Admins</button>
          <button role="tab" aria-selected={tab === "members"} onClick={() => setTab("members")}>Memberships</button>
        </div>
        {tab === "articles" ? <ArticleQueue /> : tab === "admins" ? <AdminList /> : <MemberList />}
      </div>
    </main>
  );
}

function ArticleQueue() {
  const [filter, setFilter] = useState("in_review");
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    setState({ status: "loading" });
    api.adminArticles(filter).then((result) => setState({ status: "ready", ...result })).catch((error) => setState({ status: "error", error }));
  }, [filter]);
  return (
    <>
      <div className="admin-filters">
        {FILTERS.map(([id, label]) => (
          <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}{state.counts && id !== "all" && state.counts[id] ? <span>{state.counts[id]}</span> : null}
          </button>
        ))}
      </div>
      {state.status === "loading" && <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>}
      {state.status === "error" && <p className="form-error">{state.error.message}</p>}
      {state.status === "ready" && (state.articles.length ? (
        <ul className="write-list">
          {state.articles.map((article) => (
            <li key={article.id}>
              <Link to={`/admin/articles/${article.id}`}>
                <span className="write-list-title">{article.title}<small>{article.authorName || article.authorEmail} · {categoryById(article.category)?.title} · /learn/{article.slug}</small></span>
                <StatusBadge status={article.status} />
                <span className="write-list-date">{formatDate(article.submittedAt || article.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="write-empty">Nothing here right now.</p>)}
    </>
  );
}

function MemberList() {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load(search = "") {
    setLoading(true);
    setError("");
    try {
      const { members: list } = await api.adminMembers(search);
      setMembers(list);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(member, plan, expiresAt) {
    setBusyId(member.id);
    setError("");
    setNotice("");
    try {
      await api.setMemberPlan(member.id, plan, expiresAt || null);
      setNotice(`${member.email} now has ${plan === "plus" ? `Plus through ${expiresAt}` : "Free"} access.`);
      await load(email.trim().toLowerCase());
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-members">
      <form className="admin-grant" onSubmit={(event) => { event.preventDefault(); load(email.trim().toLowerCase()); }}>
        <label className="field-label" htmlFor="member-email">Find an account by email</label>
        <div>
          <input id="member-email" className="text-input" type="email" placeholder="person@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="btn btn-primary"><Search size={15} /> Find</button>
          {email && <button type="button" className="btn btn-ghost" onClick={() => { setEmail(""); load(); }}>Clear</button>}
        </div>
        <small>Plus access must have an expiry date. It remains active through that UTC date.</small>
      </form>
      {notice && <p className="write-notice"><Check size={14} /> {notice}</p>}
      {error && <p className="form-error">{error}</p>}
      {loading && <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p>}
      {!loading && members?.length === 0 && <p className="write-empty">No account found. They need to sign in once before you can grant access.</p>}
      {!loading && members?.length > 0 && (
        <ul className="write-list">
          {members.map((member) => <MemberRow key={member.id} member={member} busy={busyId === member.id} onSave={save} />)}
        </ul>
      )}
    </section>
  );
}

function MemberRow({ member, busy, onSave }) {
  const [plan, setPlan] = useState(member.plan);
  const [expiresAt, setExpiresAt] = useState(member.planExpiresAt || "");
  useEffect(() => {
    setPlan(member.plan);
    setExpiresAt(member.planExpiresAt || "");
  }, [member]);

  return (
    <li className="membership-row">
      <div className="membership-identity">
        <strong>{member.displayName || member.email}</strong>
        <small>{member.email}{member.plan === "plus" && !member.planExpiresAt ? " · expiry missing" : ""}</small>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onSave(member, plan, expiresAt); }}>
        <select className="text-input" aria-label={`Plan for ${member.email}`} value={plan} onChange={(event) => setPlan(event.target.value)}>
          <option value="free">Free</option>
          <option value="plus">Plus</option>
        </select>
        {plan === "plus" && <input className="text-input" aria-label={`Plus expiry for ${member.email}`} type="date" required value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />}
        <button className="btn btn-ghost" disabled={busy || (plan === "plus" && !expiresAt)}><Save size={14} /> Save</button>
      </form>
    </li>
  );
}

function AdminList() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const load = () => api.adminList().then(({ admins: list }) => setAdmins(list)).catch((error) => setMessage({ error: error.message }));
  useEffect(() => { load(); }, []);

  async function grant(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const { granted } = await api.grantAdmin(email.trim());
      setMessage({ ok: `${granted} is now an admin.` }); setEmail(""); load();
    } catch (error) {
      setMessage({ error: error.message });
    }
  }
  async function revoke(admin) {
    if (!window.confirm(`Remove admin access for ${admin.email}?`)) return;
    try {
      await api.revokeAdmin(admin.id);
      setMessage({ ok: `${admin.email} is no longer an admin.` }); load();
    } catch (error) {
      setMessage({ error: error.message });
    }
  }

  return (
    <section className="admin-admins">
      <form className="admin-grant" onSubmit={grant}>
        <label className="field-label" htmlFor="grant-email">Give admin access</label>
        <div>
          <input id="grant-email" className="text-input" type="email" required placeholder="person@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="btn btn-primary"><UserPlus size={15} /> Make admin</button>
        </div>
        <small>They need to have signed in to DesignRounds at least once.</small>
      </form>
      {message?.ok && <p className="write-notice"><Check size={14} /> {message.ok}</p>}
      {message?.error && <p className="form-error">{message.error}</p>}
      {!admins ? <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p> : (
        <ul className="write-list">
          {admins.map((admin) => (
            <li key={admin.email}>
              <div className="admin-row">
                <span className="write-list-title">{admin.displayName || admin.email}<small>{admin.email}{admin.fromSettings ? " · from ADMIN_EMAILS setting" : ""}</small></span>
                {admin.id && !admin.fromSettings && admin.email !== user.email && <button className="btn btn-ghost" onClick={() => revoke(admin)}><Trash2 size={14} /> Remove</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ review one article

function ReviewArticle({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getArticle(id).then(setData).catch(setError);
  }, [id]);

  async function decide(action) {
    if ((action === "request_changes" || action === "reject") && note.trim().length < 2) { setResult({ error: "Write a note telling the author what to change." }); return; }
    if (action === "publish" && !window.confirm(`Publish "${data.article.title}" at /learn/${data.article.slug}?`)) return;
    setBusy(action); setResult(null);
    try {
      const updated = await api.adminDecision(id, action, note.trim() || undefined);
      setData((current) => ({ ...current, ...updated }));
      setNote("");
      setResult({ ok: { request_changes: "Changes requested. The author has been emailed.", reject: "Rejected. The author has been emailed.", publish: "Published! The site rebuilds and the article is live in about two minutes.", unpublish: "Unpublished. The author has been emailed." }[action] });
    } catch (decisionError) {
      setResult({ error: decisionError.message, problems: decisionError.problems });
    } finally {
      setBusy("");
    }
  }

  if (error) return <main className="write-page"><div className="wrap write-wrap"><p className="form-error">{error.message}</p><Link to="/admin">Back to admin</Link></div></main>;
  if (!data) return <main className="write-page"><div className="wrap write-wrap"><p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading…</p></div></main>;
  const { article, messages } = data;
  const category = categoryById(article.category);

  return (
    <main className="write-page write-editor-page">
      <div className="write-editor-head">
        <Link to="/admin" className="write-back"><ArrowLeft size={14} /> Review queue</Link>
        <StatusBadge status={article.status} />
        <span className="admin-author">by {article.authorName || "—"} ({article.authorEmail})</span>
        {article.status === "published" && <Link className="btn btn-ghost" to={`/learn/${article.slug}`}><ExternalLink size={14} /> View live</Link>}
      </div>

      <div className="write-columns admin-columns">
        <section className="write-preview" aria-label="Article">
          <div className="write-placement">
            <span><strong>URL</strong> {SITE.url.replace("https://", "")}/learn/{article.slug}</span>
            <span><strong>Sidebar</strong> {category?.title ?? article.category} › {article.shortTitle || article.title}</span>
          </div>
          <article className="prose learn-article write-preview-article">
            <CommunityArticleHeader article={article} category={category} />
            <ArticleBody markdown={article.body} />
          </article>
        </section>

        <aside className="admin-decision">
          <h2>Decision</h2>
          <label className="field-label" htmlFor="review-note">Note to the author</label>
          <textarea id="review-note" className="text-input" rows={6} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What should change, or what's great about it. Required when requesting changes or rejecting." maxLength={4000} />
          <div className="admin-buttons">
            {article.status === "in_review" && <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => decide("publish")}>{busy === "publish" ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} Publish</button>}
            {["in_review", "published"].includes(article.status) && <button className="btn btn-ghost" disabled={Boolean(busy)} onClick={() => decide("request_changes")}>Request changes</button>}
            {["in_review", "changes_requested"].includes(article.status) && <button className="btn btn-ghost danger" disabled={Boolean(busy)} onClick={() => decide("reject")}><X size={15} /> Reject</button>}
            {article.status === "published" && <button className="btn btn-ghost danger" disabled={Boolean(busy)} onClick={() => decide("unpublish")}>Unpublish</button>}
          </div>
          {result?.ok && <p className="write-notice"><Check size={14} /> {result.ok}</p>}
          {result?.error && <div className="form-error"><p>{result.error}</p>{result.problems && <ul>{result.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}</div>}
          <p className="admin-hint">Requesting changes sends your note to the author by email and lets them edit and resubmit. Publishing makes it live at its URL and in the {CATEGORIES.find((item) => item.id === article.category)?.title ?? ""} section.</p>
        </aside>
      </div>

      <ArticleThread articleId={article.id} messages={messages} onMessages={(updated) => setData((current) => ({ ...current, messages: updated }))} placeholder="Message the author without changing the status…" />
    </main>
  );
}
