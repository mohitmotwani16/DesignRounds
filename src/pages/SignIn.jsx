import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Layers2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Brand } from "../components/ui.jsx";
import { navigate, safeNext } from "../router.js";

export default function SignInPage({ next }) {
  const { setUser } = useAuth();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);
  const destination = safeNext(next);

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
      const result = await api.requestCode(email);
      setDevCode(result.devCode || "");
      setCooldown(result.resendAfterSeconds || 45);
      setCode("");
      setStep("code");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event) {
    event?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const { user } = await api.verifyCode(email, code);
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
    <main className="auth-page">
      <div className="auth-topbar"><Brand onClick={() => navigate("/")} /></div>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-icon">{step === "email" ? <Mail size={20} /> : <ShieldCheck size={20} />}</span>
        {step === "email" ? (
          <form onSubmit={sendCode}>
            <h1 id="auth-title">Sign in to practice</h1>
            <p className="auth-lede">Enter your email and we'll send you a 6-digit code. No password needed. New here? This also creates your account.</p>
            <label className="field-label" htmlFor="signin-email">Email address</label>
            <input id="signin-email" className="text-input" type="email" autoComplete="email" inputMode="email" required autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-dark auth-submit" disabled={busy || !email}>{busy ? <LoaderCircle size={16} className="spin" /> : null}Email me a code <ArrowRight size={15} /></button>
          </form>
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
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-dark auth-submit" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={15} />}Verify and continue</button>
            <div className="auth-secondary">
              <button type="button" className="text-button" onClick={() => { setStep("email"); setError(""); }}><ArrowLeft size={13} /> Use a different email</button>
              <button type="button" className="text-button" disabled={cooldown > 0 || busy} onClick={sendCode}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
            </div>
          </form>
        )}
      </section>
      <p className="auth-footnote">Signing in keeps your designs saved to your account so you can resume on any device.</p>
    </main>
  );
}
