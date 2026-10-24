import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme.js";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise;
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Cloudflare Turnstile widget. `invisible` runs it hidden for background checks. Managed widgets pass most people silently
// and show a checkbox when Cloudflare wants a human to confirm. The token is
// single-use: pass a new resetKey after each submission so the next attempt
// gets a fresh one.
export function TurnstileWidget({ siteKey, resetKey = 0, action = "sign-in", invisible = false, onToken, onError }) {
  const slot = useRef(null);
  const widgetId = useRef(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const { theme } = useTheme();
  const [problem, setProblem] = useState("");
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let renderedId = null;
    onTokenRef.current("");
    setProblem("");
    loadTurnstile().then(() => {
      if (cancelled || !slot.current || !window.turnstile) return;
      renderedId = window.turnstile.render(slot.current, {
        sitekey: siteKey,
        theme: theme === "dark" ? "dark" : "light",
        // Background checks stay hidden unless Cloudflare wants the person to interact,
        // and then hand over to the visible check (before-interactive-callback).
        appearance: invisible ? "interaction-only" : "always",
        action,
        callback: (token) => {
          setProblem("");
          onTokenRef.current(token);
        },
        "expired-callback": () => onTokenRef.current(""),
        "timeout-callback": () => onTokenRef.current(""),
        "before-interactive-callback": () => {
          if (invisible) onErrorRef.current?.();
        },
        "unsupported-callback": () => onErrorRef.current?.(),
        "error-callback": () => {
          onTokenRef.current("");
          setProblem("Human verification failed. Refresh the page and try again.");
          onErrorRef.current?.();
        },
      });
      widgetId.current = renderedId;
    }).catch(() => {
      if (cancelled) return;
      setProblem("Human verification couldn't load. Check your connection and refresh.");
      onErrorRef.current?.();
    });
    return () => {
      cancelled = true;
      if (renderedId != null && window.turnstile) window.turnstile.remove(renderedId);
      widgetId.current = null;
    };
  }, [siteKey, theme, action, invisible]);

  useEffect(() => {
    if (!resetKey || widgetId.current == null || !window.turnstile) return;
    onTokenRef.current("");
    window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  return (
    <div className="turnstile-field">
      <div ref={slot} className="turnstile-slot" />
      {problem && <p className="form-error" role="alert">{problem}</p>}
    </div>
  );
}
