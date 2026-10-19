import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth.jsx";
import { Logo } from "./site.jsx";
import { TurnstileWidget } from "./Turnstile.jsx";
import { navigate } from "../router.js";

const COPY = {
  launch: "Confirm you're human to continue. This runs once per browser session while you're signed in. Reloading the page doesn't ask again.",
  network: "Your connection changed — for example Wi-Fi to mobile data, another network, or a VPN. Confirm you're human to continue.",
};

export function HumanCheck() {
  const { turnstileSiteKey, humanReason, confirmHuman, signOut } = useAuth();
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Continue as soon as Turnstile passes; no extra click.
  useEffect(() => {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    confirmHuman(token).catch((requestError) => {
      setError(requestError.message);
      setToken("");
      setResetKey((value) => value + 1);
      setBusy(false);
    });
  }, [token, busy, confirmHuman]);

  return (
    <main className="auth-page site">
      <div className="auth-topbar"><Logo onClick={() => navigate("/")} /></div>
      <section className="auth-card" aria-labelledby="human-title">
        <span className="auth-icon"><ShieldCheck size={20} /></span>
        <h1 id="human-title">Confirm you're human</h1>
        <p className="auth-lede">{COPY[humanReason] || COPY.launch}</p>
        <div>
          {turnstileSiteKey ? (
            <TurnstileWidget siteKey={turnstileSiteKey} action="continue" resetKey={resetKey} onToken={setToken} />
          ) : (
            <p className="form-error" role="alert">Human verification isn't configured yet.</p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {busy && (
            <p className="auth-submit" aria-live="polite">
              <LoaderCircle size={16} className="spin" /> Continuing…
            </p>
          )}
        </div>
        <div className="auth-secondary">
          <button type="button" className="text-button" onClick={() => signOut()}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
