import { useEffect, useRef, useState } from "react";
import { Bug, Check, LoaderCircle, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { TurnstileWidget } from "./Turnstile.jsx";

// "Report a problem" (issue #71). One dialog for the whole app, opened from the footer,
// the account menu and the workspace with openReportProblem(). It asks for as little
// as possible, what went wrong and, for visitors, an email to reply to, and sends the
// current page along so the problem can be reproduced.

const MAX_MESSAGE = 4000;
const listeners = new Set();

export function openReportProblem() {
  for (const listener of listeners) listener(true);
}

// Mounted once, near the root (App.jsx).
export function ReportProblemHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    listeners.add(setOpen);
    return () => listeners.delete(setOpen);
  }, []);
  return open ? <ReportProblemDialog onClose={() => setOpen(false)} /> : null;
}

function ReportProblemDialog({ onClose }) {
  const { user, turnstileSiteKey } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const messageRef = useRef(null);
  const needsHumanCheck = !user && Boolean(turnstileSiteKey);
  // Only the path: a query string can carry tokens (invitation links, sign-in errors).
  const [page] = useState(() => window.location.pathname);
  useEffect(() => {
    messageRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    if (state === "sending" || (needsHumanCheck && !token)) return;
    setState("sending");
    setError("");
    try {
      await api.reportProblem({
        message: message.trim(),
        page,
        ...(user ? {} : { email: email.trim().toLowerCase() }),
        ...(!user && token ? { turnstileToken: token } : {}),
      });
      setState("sent");
    } catch (sendError) {
      setError(sendError.message);
      setState("idle");
      if (needsHumanCheck) {
        setToken("");
        setResetKey((value) => value + 1);
      }
    }
  }

  return (
    <div className="lock-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="lock-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button className="lock-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {state === "sent" ? (
          <div className="report-sent" role="status">
            <span className="report-icon report-icon-done"><Check size={20} /></span>
            <h2 id="report-title">Thanks, we've got it</h2>
            <p>We read every report. If we need more detail, we'll email {user ? user.email : "you"}.</p>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="report-icon"><Bug size={20} /></span>
            <h2 id="report-title">Report a problem</h2>
            <p className="lock-lede">Something broken, confusing or wrong? Tell us what happened and what you expected instead.</p>
            {!user && (
              <label className="report-field">
                <span>Your email</span>
                <input type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            )}
            <label className="report-field">
              <span>What went wrong?</span>
              <textarea ref={messageRef} required minLength={10} maxLength={MAX_MESSAGE} rows={5} value={message} onChange={(event) => setMessage(event.target.value)}
                placeholder="I clicked Get my review and nothing happened…" />
            </label>
            <p className="report-meta">We'll include the page you're on ({page}) and your browser version{user ? `, and reply to ${user.email}` : ""}.</p>
            {needsHumanCheck && <TurnstileWidget siteKey={turnstileSiteKey} resetKey={resetKey} action="problem-report" onToken={setToken} />}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="lock-actions">
              <button className="btn btn-primary" disabled={state === "sending" || message.trim().length < 10 || (needsHumanCheck && !token)}>
                {state === "sending" && <LoaderCircle size={16} className="spin" />} Send report
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
