import { useEffect, useState } from "react";
import { analyticsEnabled, onConsentChange, readConsent, setConsent } from "../analytics.js";
import { useRoute } from "../router.js";

// Asks once whether analytics may set cookies and record sessions (src/analytics.js).
// "Necessary only" and an unticked Analytics switch both mean "denied". It appears after
// the first render only, so prerendered pages hydrate unchanged, and stays off the
// workspace so it never covers the canvas.
export function ConsentBanner() {
  const { path } = useRoute();
  const [choice, setChoice] = useState("unknown");
  const [options, setOptions] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  // Shown on the first scroll, tap or key press. Chrome stops looking for the largest
  // paint (LCP) at the first input, so a late banner can't become the page's LCP.
  useEffect(() => {
    if (!analyticsEnabled) return undefined;
    const events = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"];
    const show = () => {
      events.forEach((type) => window.removeEventListener(type, show, true));
      setChoice(readConsent());
    };
    events.forEach((type) => window.addEventListener(type, show, { capture: true, passive: true }));
    const stop = onConsentChange((value) => {
      setChoice(value);
      setOptions(false);
    });
    return () => {
      events.forEach((type) => window.removeEventListener(type, show, true));
      stop();
    };
  }, []);

  if (choice !== null || path.startsWith("/workspace/")) return null;
  return (
    <section className="consent-banner" aria-labelledby="consent-title">
      <h2 id="consent-title">Analytics</h2>
      <p>We use analytics cookies to improve DesignRounds. <a href="/privacy#analytics">Privacy policy</a></p>
      {options && (
        <div className="consent-options">
          <div className="consent-option">
            <div>
              <strong>Necessary</strong>
              <span>Sign-in, security and your preferences.</span>
            </div>
            <span className="consent-always">Always on</span>
          </div>
          <label className="consent-option">
            <div>
              <strong>Analytics</strong>
              <span>PostHog and Clarity: page usage, heatmaps and recordings. Your designs are never recorded.</span>
            </div>
            <input type="checkbox" role="switch" className="consent-switch" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
          </label>
        </div>
      )}
      <div className="consent-actions">
        {options ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setConsent(analytics ? "granted" : "denied")}>Save my choices</button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOptions(true)}>More options</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConsent("denied")}>Necessary only</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setConsent("granted")}>Accept</button>
          </>
        )}
      </div>
    </section>
  );
}
