import { useEffect, useState } from "react";
import { reportHumanCheck } from "../api.js";
import { useAuth } from "../auth.jsx";
import { TurnstileWidget } from "./Turnstile.jsx";

// How long the invisible check may take before the visible one takes over.
const ESCALATE_AFTER_MS = 15_000;

// Renews the human-check pass invisibly while the app keeps working. If Cloudflare
// wants interaction, or the check fails or stalls, the visible check page takes over.
export function BackgroundHumanCheck() {
  const { turnstileSiteKey, humanBackgroundCheck, confirmHuman, escalateHuman } = useAuth();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!humanBackgroundCheck) return undefined;
    const timer = window.setTimeout(() => {
      reportHumanCheck({ action: "continue", outcome: "stalled", detail: { invisible: true, elapsedMs: ESCALATE_AFTER_MS } });
      escalateHuman();
    }, ESCALATE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [humanBackgroundCheck, escalateHuman]);

  useEffect(() => {
    if (!humanBackgroundCheck || !token || busy) return;
    setBusy(true);
    confirmHuman(token)
      .catch(() => escalateHuman())
      .finally(() => {
        setToken("");
        setBusy(false);
      });
  }, [humanBackgroundCheck, token, busy, confirmHuman, escalateHuman]);

  if (!humanBackgroundCheck) return null;

  return (
    <div className="turnstile-background" aria-hidden="true">
      <TurnstileWidget siteKey={turnstileSiteKey} action="continue" invisible onToken={setToken} onError={escalateHuman} />
    </div>
  );
}
