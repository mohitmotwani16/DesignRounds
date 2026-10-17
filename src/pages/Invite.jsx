import { useEffect, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Logo } from "../components/site.jsx";
import { Link, navigate } from "../router.js";

const invitePath = (token) => `/invite/${encodeURIComponent(token)}`;

function dateLabel(value) {
  if (!value) return "";
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function InvitePage({ token }) {
  const { status, user, refresh, signOut } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getInvitation(token)
      .then((result) => { if (!cancelled) setInvitation(result); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await api.acceptInvitation(token);
      await refresh();
      setAccepted(true);
    } catch (acceptError) {
      setError(acceptError.message);
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    await signOut();
    const query = new URLSearchParams({ email: invitation.email, next: invitePath(token) });
    navigate(`/signin?${query}`);
  }

  const matchesAccount = user?.email === invitation?.email;

  return (
    <main className="invite-page site">
      <div className="auth-topbar"><Logo onClick={() => navigate("/")} /></div>
      <section className="invite-card" aria-labelledby="invite-title">
        <span className="auth-icon">{accepted || invitation?.accepted ? <Check size={20} /> : <Mail size={20} />}</span>
        {loading ? (
          <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Loading your invitation…</p>
        ) : error && !invitation ? (
          <>
            <h1 id="invite-title">Invitation unavailable</h1>
            <p className="auth-lede">{error}</p>
            <Link to="/learn">Explore the handbook</Link>
          </>
        ) : invitation?.accepted || accepted ? (
          <>
            <h1 id="invite-title">Invitation accepted</h1>
            <p className="auth-lede">You're all set. Your DesignRounds account is ready to use.</p>
            <button className="btn btn-primary btn-lg auth-submit" onClick={() => navigate("/library")}>Explore practice rounds <ArrowRight size={15} /></button>
          </>
        ) : invitation?.expired ? (
          <>
            <h1 id="invite-title">This invitation has expired</h1>
            <p className="auth-lede">Ask the person who invited you to send a new invitation.</p>
          </>
        ) : (
          <>
            <h1 id="invite-title">You're invited to DesignRounds</h1>
            <p className="auth-lede">
              {invitation.plan === "plus"
                ? `Your invitation includes Plus access through ${dateLabel(invitation.planExpiresAt)}.`
                : "Your invitation includes a free DesignRounds account."}
            </p>
            <p className="invite-recipient"><Mail size={15} /> Invitation for <strong>{invitation.email}</strong></p>
            {status === "loading" ? (
              <p className="learn-loading"><LoaderCircle size={16} className="spin" /> Checking your account…</p>
            ) : !user ? (
              <>
                <p className="auth-lede">Sign in or create an account with this email to accept. The invitation expires in 14 days.</p>
                <button className="btn btn-primary btn-lg auth-submit" onClick={() => {
                  const query = new URLSearchParams({ email: invitation.email, next: invitePath(token) });
                  navigate(`/signin?${query}`);
                }}>Sign in to accept <ArrowRight size={15} /></button>
              </>
            ) : matchesAccount ? (
              <>
                <p className="auth-lede">You're signed in as <strong>{user.email}</strong>. Accept to activate this invitation.</p>
                <button className="btn btn-primary btn-lg auth-submit" disabled={busy} onClick={accept}>
                  {busy ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}
                  Accept invitation
                </button>
              </>
            ) : (
              <>
                <p className="auth-lede">You're signed in as <strong>{user.email}</strong>. Sign in with the invited email to continue.</p>
                <button className="btn btn-primary btn-lg auth-submit" onClick={switchAccount}>Switch account <ArrowRight size={15} /></button>
              </>
            )}
          </>
        )}
        {error && invitation && !loading && <p className="form-error" role="alert">{error}</p>}
      </section>
      <p className="auth-footnote"><Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy Policy</Link></p>
    </main>
  );
}
