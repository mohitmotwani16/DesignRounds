import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleCheck, Clock3, LoaderCircle, LogOut, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { interestLabel } from "../data/interests.js";
import { findPrompt, getTrack } from "../data/prompts.js";
import { promptIcon } from "../components/ui.jsx";
import { SiteFooter } from "../components/site.jsx";
import { navigate } from "../router.js";
import { ProfileFields, profileValues } from "./Onboarding.jsx";
import { relativeTime } from "./Library.jsx";

export default function ProfilePage({ onStart }) {
  const { user, setUser, signOut } = useAuth();
  const [values, setValues] = useState(() => profileValues(user));
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState(null);
  const [sessionsError, setSessionsError] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(profileValues(user));

  useEffect(() => {
    api.listSessions().then(({ sessions: list }) => setSessions(list)).catch((loadError) => setSessionsError(loadError.message));
  }, []);

  const stats = useMemo(() => {
    const list = sessions || [];
    return {
      total: list.length,
      completed: list.filter((session) => session.status === "completed").length,
      active: list.filter((session) => session.status === "in_progress").length,
      tracks: new Set(list.map((session) => session.track).filter(Boolean)).size,
    };
  }, [sessions]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaveState("saving");
    setError("");
    try {
      const { user: updated } = await api.updateProfile(values);
      setUser(updated);
      setValues(profileValues(updated));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (saveError) {
      setError(saveError.message);
      setSaveState("idle");
    }
  }

  async function setStatus(session, status) {
    try {
      const { session: updated } = await api.updateSession(session.id, { status });
      setSessions((list) => list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    } catch (updateError) {
      window.alert(updateError.message);
    }
  }

  async function removeSession(session) {
    if (!window.confirm(`Delete your attempt at “${session.promptTitle}”? This permanently removes its diagram.`)) return;
    try {
      await api.deleteSession(session.id);
      setSessions((list) => list.filter((item) => item.id !== session.id));
    } catch (deleteError) {
      window.alert(deleteError.message);
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    setDeleting(true);
    try {
      await api.deleteAccount(confirmEmail.trim().toLowerCase());
      setUser(null);
      navigate("/", { replace: true });
    } catch (deleteError) {
      window.alert(deleteError.message);
      setDeleting(false);
    }
  }

  return (
    <main className="profile-page page-width">
      <header className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initials(user.displayName || user.email)}</span>
        <div className="profile-identity">
          <h1>{user.displayName || "Your profile"}</h1>
          <p>{[user.headline, interestSummary(user), user.experienceLevel].filter(Boolean).join(" · ") || user.email}</p>
        </div>
        <span className="plan-badge">{user.plan === "plus" ? "Plus plan" : "Free plan"}</span>
      </header>

      <dl className="profile-stats">
        <div><dt>Rounds started</dt><dd>{stats.total}</dd></div>
        <div><dt>In progress</dt><dd>{stats.active}</dd></div>
        <div><dt>Completed</dt><dd>{stats.completed}</dd></div>
        <div><dt>Disciplines practiced</dt><dd>{stats.tracks}</dd></div>
      </dl>

      <div className="profile-layout">
        <section className="profile-section" aria-labelledby="history-title">
          <div className="profile-section-head">
            <h2 id="history-title">Practice history</h2>
            <button className="button button-outline button-small" onClick={() => navigate("/library")}>Find a round <ArrowRight size={14} /></button>
          </div>
          {sessions === null && !sessionsError && <div className="history-empty"><LoaderCircle size={18} className="spin" /> Loading your rounds…</div>}
          {sessionsError && <div className="history-empty form-error">{sessionsError}</div>}
          {sessions?.length === 0 && (
            <div className="history-empty">
              <p>You haven't started a round yet.</p>
              <button className="button button-dark button-small" onClick={() => navigate("/library")}>Browse the library <ArrowRight size={14} /></button>
            </div>
          )}
          {sessions?.length > 0 && (
            <ul className="history-list">
              {sessions.map((session) => {
                const prompt = findPrompt(session.promptId);
                const Icon = promptIcon(prompt?.icon);
                return (
                  <li key={session.id} className="history-item">
                    <span className={`prompt-icon icon-${prompt?.color || "slate"}`}><Icon size={16} /></span>
                    <div className="history-copy">
                      <strong>{session.promptTitle}</strong>
                      <span>{prompt ? getTrack(prompt.track).shortLabel : "Retired round"} · {session.componentCount} components · <Clock3 size={11} /> {relativeTime(session.updatedAt)}</span>
                    </div>
                    <span className={`status-tag status-${session.status}`}>{session.status === "in_progress" ? "In progress" : "Completed"}</span>
                    <div className="history-actions">
                      {session.status === "in_progress" ? (
                        <>
                          <button className="button button-dark button-small" onClick={() => navigate(`/workspace/${session.id}`)}>Resume</button>
                          <button className="icon-button" title="Mark as completed" aria-label="Mark as completed" onClick={() => setStatus(session, "completed")}><CircleCheck size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button className="button button-outline button-small" onClick={() => navigate(`/workspace/${session.id}`)}>View</button>
                          {prompt && <button className="icon-button" title="Start a new attempt" aria-label="Start a new attempt" onClick={() => onStart(prompt.id)}><RotateCcw size={15} /></button>}
                        </>
                      )}
                      <button className="icon-button danger" title="Delete attempt" aria-label="Delete attempt" onClick={() => removeSession(session)}><Trash2 size={15} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="profile-side">
          <section className="profile-section" aria-labelledby="details-title">
            <h2 id="details-title">Profile details</h2>
            <form onSubmit={saveProfile}>
              <ProfileFields values={values} onChange={setValues} />
              <div className="field">
                <span className="field-label">Email</span>
                <div className="readonly-field">{user.email}</div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-dark button-small" disabled={!dirty || saveState === "saving" || !values.displayName.trim()}>
                {saveState === "saving" ? <LoaderCircle size={14} className="spin" /> : saveState === "saved" ? <Check size={14} /> : null}
                {saveState === "saved" ? "Saved" : "Save changes"}
              </button>
            </form>
          </section>

          <section className="profile-section" aria-labelledby="account-title">
            <h2 id="account-title">Account</h2>
            <div className="account-actions">
              <button className="button button-outline button-small" onClick={async () => { await signOut(); navigate("/"); }}><LogOut size={14} /> Sign out</button>
              <button className="button button-outline button-small" onClick={async () => { await api.signOutEverywhere(); setUser(null); navigate("/"); }}>Sign out of all devices</button>
            </div>
            <form className="danger-zone" onSubmit={deleteAccount}>
              <h3><TriangleAlert size={14} /> Delete account</h3>
              <p>This permanently deletes your profile, practice rounds, and saved diagrams. Type <strong>{user.email}</strong> to confirm.</p>
              <input className="text-input" aria-label="Confirm your email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} placeholder={user.email} />
              <button className="button button-danger button-small" disabled={deleting || confirmEmail.trim().toLowerCase() !== user.email}>{deleting && <LoaderCircle size={14} className="spin" />}Delete my account</button>
            </form>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function interestSummary(user) {
  const labels = (user.interests ?? []).map(interestLabel).filter(Boolean);
  return labels.length ? labels.join(", ") : user.targetRole;
}

function initials(name) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
