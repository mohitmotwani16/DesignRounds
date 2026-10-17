import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Layers2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Logo } from "../components/site.jsx";
import { TurnstileWidget } from "../components/Turnstile.jsx";
import { Link, navigate, safeNext } from "../router.js";

const GOOGLE_ERRORS = {
  google_unconfigured: "Google sign-in isn't set up yet. Use email, or add Google OAuth credentials to .env.",
  google_cancelled: "Google sign-in was cancelled. You can try again or use email.",
  google_failed: "Google sign-in failed. Try again, or use email instead.",
  google_state: "Google sign-in expired. Please try again.",
  google_unverified: "Google didn't verify that email address. Use a verified Google account, or sign in with email.",
  google_link_conflict: "This email is already linked to a different Google account. Sign in with email instead.",
  rate_limited: "Too many sign-in attempts. Try again in a few minutes.",
  turnstile_required: "Confirm you're human, then continue with Google.",
};

function GoogleMark() {
  return (
    <svg className="google-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function SignInPage({ next, error: initialError, email: initialEmail = "" }) {
  const { setUser, googleAuth, turnstileSiteKey, noteLaunch } = useAuth();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => (initialError && GOOGLE_ERRORS[initialError]) || "");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [devCode, setDevCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);
  const destination = safeNext(next);
  const googleHref = `/api/v1/auth/google?next=${encodeURIComponent(destination)}`;
  const humanReady = !turnstileSiteKey || Boolean(turnstileToken);

  function consumeHumanCheck() {
    setTurnstileToken("");
    setTurnstileReset((value) => value + 1);
  }

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  async function sendCode(event) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.requestCode(email, turnstileToken);
      setDevCode(result.devCode || "");
      setCooldown(result.resendAfterSeconds || 45);
      setCode("");
      setStep("code");
      consumeHumanCheck();
    } catch (requestError) {
      setError(requestError.message);
      // Cooldown and rate limits are decided before the token is checked, so the
      // visitor can retry with the same confirmation once the wait is over.
      if (requestError.status !== 429) consumeHumanCheck();
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (!turnstileSiteKey) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await api.startGoogle(destination, turnstileToken);
      window.location.assign(url);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status !== 429) consumeHumanCheck();
      setBusy(false);
    }
  }

  async function verify(event) {
    event?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const { user, launchId } = await api.verifyCode(email, code);
      if (launchId) noteLaunch(launchId);
      setUser(user);
      navigate(user.onboarded ? destination : `/welcome?next=${encodeURIComponent(destination)}`, { replace: true });
    } catch (verifyError) {
      setError(verifyError.message);
      if (verifyError.code === "CODE_LOCKED") setCode("");
      setBusy(false);
    }
  }

  // Submit automatically once all six digits are entered.
  useEffect(() => {
    if (step === "code" && code.length === 6 && !busy) verify();
  }, [code]);

  return (
    <main className="auth-page site">
      <div className="auth-topbar"><Logo onClick={() => navigate("/")} /></div>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-icon">{step === "email" ? <Mail size={20} /> : <ShieldCheck size={20} />}</span>
        {step === "email" ? (
          <>
            <h1 id="auth-title">Sign in to practice</h1>
            <p className="auth-lede">{googleAuth
              ? "Continue with Google, or use a one-time email code. New here? Either option creates your account."
              : "Enter your email and we'll send you a 6-digit code. No password needed. New here? This also creates your account."}</p>
            {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} resetKey={turnstileReset} onToken={setTurnstileToken} />}
            {googleAuth && (
              <>
                {turnstileSiteKey ? (
                  <button type="button" className="btn btn-google btn-lg auth-submit" disabled={busy || !humanReady} onClick={continueWithGoogle}>
                    <GoogleMark /> Continue with Google
                  </button>
                ) : (
                  <a className="btn btn-google btn-lg auth-submit" href={googleHref}>
                    <GoogleMark /> Continue with Google
                  </a>
                )}
                <div className="auth-divider" role="separator" aria-label="or"><span>or use email</span></div>
              </>
            )}
            <form onSubmit={sendCode}>
              <label className="field-label" htmlFor="signin-email">Email address</label>
              <input id="signin-email" className="text-input" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn btn-ghost btn-lg auth-submit" disabled={busy || !email || !humanReady}>{busy ? <LoaderCircle size={16} className="spin" /> : null}Email me a code <ArrowRight size={15} /></button>
            </form>
          </>
        ) : (
          <form onSubmit={verify}>
            <h1 id="auth-title">Check your email</h1>
            <p className="auth-lede">We sent a code to <strong>{email}</strong>. It expires in 10 minutes.</p>
            {devCode && <p className="dev-code-note"><Layers2 size={14} />Local development: no email provider is configured, so your code is <strong>{devCode}</strong>.</p>}
            <label className="field-label" htmlFor="signin-code">6-digit code</label>
            <input
              id="signin-code"
              ref={codeRef}
              className="text-input code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              placeholder="••••••"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg auth-submit" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={15} />}Verify and continue</button>
            {turnstileSiteKey && (
              <>
                <p className="turnstile-resend-note">Confirm you're human again only if you need another code.</p>
                <TurnstileWidget siteKey={turnstileSiteKey} resetKey={turnstileReset} onToken={setTurnstileToken} />
              </>
            )}
            <div className="auth-secondary">
              <button type="button" className="text-button" onClick={() => { setStep("email"); setError(""); }}><ArrowLeft size={13} /> Use a different email</button>
              <button type="button" className="text-button" disabled={cooldown > 0 || busy || !humanReady} onClick={sendCode}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
            </div>
          </form>
        )}
      </section>
      <p className="auth-footnote">Signing in keeps your designs saved to your account so you can resume on any device. By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
    </main>
  );
}
