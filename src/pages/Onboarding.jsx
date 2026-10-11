import { useState } from "react";
import { ArrowRight, LoaderCircle, UserRound } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Brand } from "../components/ui.jsx";
import { navigate, safeNext } from "../router.js";

export const roleOptions = ["Software engineer", "Data engineer", "ML / AI engineer", "Platform / SRE", "Frontend / mobile engineer", "Engineering manager", "Student", "Other"];
export const experienceOptions = ["Student / new grad", "1–3 years", "3–6 years", "6–10 years", "10+ years"];

export function ProfileFields({ values, onChange }) {
  const set = (key) => (event) => onChange({ ...values, [key]: event.target.value });
  return (
    <div className="profile-fields">
      <div className="field">
        <label className="field-label" htmlFor="profile-name">Name <span className="required-mark">required</span></label>
        <input id="profile-name" className="text-input" required maxLength={60} autoComplete="name" value={values.displayName} onChange={set("displayName")} placeholder="How should we address you?" />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="profile-role">Target role</label>
          <select id="profile-role" className="text-input" value={values.targetRole} onChange={set("targetRole")}>
            <option value="">Choose…</option>
            {roleOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="profile-experience">Experience</label>
          <select id="profile-experience" className="text-input" value={values.experienceLevel} onChange={set("experienceLevel")}>
            <option value="">Choose…</option>
            {experienceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="profile-headline">Headline</label>
        <input id="profile-headline" className="text-input" maxLength={120} value={values.headline} onChange={set("headline")} placeholder="e.g. Backend engineer preparing for senior interviews" />
      </div>
    </div>
  );
}

export const profileValues = (user) => ({
  displayName: user?.displayName || "",
  targetRole: user?.targetRole || "",
  experienceLevel: user?.experienceLevel || "",
  headline: user?.headline || "",
});

export default function OnboardingPage({ next }) {
  const { user, setUser } = useAuth();
  const [values, setValues] = useState(() => profileValues(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user: updated } = await api.updateProfile(values);
      setUser(updated);
      navigate(safeNext(next), { replace: true });
    } catch (saveError) {
      setError(saveError.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar"><Brand onClick={() => navigate("/")} /></div>
      <section className="auth-card auth-card-wide" aria-labelledby="welcome-title">
        <span className="auth-icon"><UserRound size={20} /></span>
        <form onSubmit={submit}>
          <h1 id="welcome-title">Set up your profile</h1>
          <p className="auth-lede">Signed in as <strong>{user?.email}</strong>. Tell us a little about you. Your role and experience will help the interviewer pitch questions at the right level once it launches.</p>
          <ProfileFields values={values} onChange={setValues} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark auth-submit" disabled={busy || !values.displayName.trim()}>{busy && <LoaderCircle size={16} className="spin" />}Continue <ArrowRight size={15} /></button>
        </form>
      </section>
    </main>
  );
}
