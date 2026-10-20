import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleCheck, Clock3, Crown, LoaderCircle, LogOut, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../api.js";
import { isPlus, useAuth } from "../auth.jsx";
import { interestLabel } from "../data/interests.js";
import { findPrompt, getTrack } from "../data/prompts.js";
import { Avatar, promptIcon } from "../components/ui.jsx";
import { SiteFooter } from "../components/site.jsx";
import { Link, navigate } from "../router.js";
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
        <Avatar user={user} size="lg" />
        <div className="profile-identity">
          <h1>{user.displayName || "Your profile"}</h1>
          <p>{[user.headline, interestSummary(user), user.experienceLevel].filter(Boolean).join(" · ") || user.email}</p>
        </div>
        <PlanStatus user={user} />
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

// The one place a member sees their plan's details. Plus is granted for a fixed
// period (there's no billing yet), so it shows when it ends rather than a renewal,
// and turns into a warning in the last two weeks.
function PlanStatus({ user }) {
  if (!isPlus(user)) return <span className="plan-badge">Free plan</span>;
  const daysLeft = user.planExpiresAt ? daysUntil(user.planExpiresAt) : null;
  const ending = daysLeft !== null && daysLeft <= 14;
  return (
    <span className={`plan-badge plan-badge-plus ${ending ? "ending" : ""}`}>
      <Crown size={13} /> <b>Plus</b>
      {user.planExpiresAt && <><span aria-hidden="true">·</span>{ending ? endingLabel(daysLeft) : `Active through ${formatDate(user.planExpiresAt)}`}</>}
      <span aria-hidden="true">·</span><Link to="/plus">What's included</Link>
    </span>
  );
}

// Whole days from today (local) to an inclusive YYYY-MM-DD end date.
function daysUntil(date) {
  const [year, month, day] = date.split("-").map(Number);
  const today = new Date();
  return Math.round((new Date(year, month - 1, day) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}

function endingLabel(daysLeft) {
  if (daysLeft <= 0) return "Ends today";
  return daysLeft === 1 ? "Ends tomorrow" : `Ends in ${daysLeft} days`;
}

function formatDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
