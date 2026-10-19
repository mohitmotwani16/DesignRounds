import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import { TurnstileWidget } from "./Turnstile.jsx";

// Re-run Turnstile after a reload without blocking the app shell.
export function BackgroundHumanCheck() {
  const { turnstileSiteKey, silentHumanRecheck, humanCheckRequired, humanLaunch, confirmHuman, requireHuman } = useAuth();
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const active = Boolean(
    turnstileSiteKey && humanCheckRequired && humanLaunch && silentHumanRecheck
  );

  useEffect(() => {
    if (!active || !token || busy) return;
    setBusy(true);
    confirmHuman(token).catch((error) => {
      requireHuman(error.code === "NETWORK_CHANGED" ? "network" : "launch");
      setToken("");
      setResetKey((value) => value + 1);
      setBusy(false);
    });
  }, [active, token, busy, confirmHuman, requireHuman]);

  if (!active) return null;

  return (
    <div className="turnstile-background" aria-hidden="true">
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        action="continue"
        invisible
        resetKey={resetKey}
        onToken={setToken}
      />
    </div>
  );
}
