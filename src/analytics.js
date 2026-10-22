// Product analytics (issue #92): PostHog for page views, events and funnels, Microsoft
// Clarity for heatmaps and session recordings.
//
// Both load once the page is idle, so they never compete with the first paint. They run
// in production builds (or in dev with VITE_ANALYTICS_DEV=true) and only when their keys
// are set. PostHog is reached through our own /ingest path (vercel.json, vite.config.js),
// so the CSP stays 'self' and blockers that list posthog.com don't drop events.
//
// Consent: until the visitor accepts, PostHog keeps its anonymous id in memory only
// (nothing stored on the device, a new id per tab) and records nothing. Accepting turns
// on its cookie, its session recording and Clarity. Declining keeps the memory-only mode.
//
// Recordings never show what people write or who they are:
// - Signed-in pages with their content (workspace, profile, onboarding, drafts, admin) sit
//   inside PRIVATE_ZONE: PostHog blocks them from recordings and autocapture
//   (.ph-no-capture) and Clarity masks them.
// - A name or email shown elsewhere carries the "ph-mask" class and data-clarity-mask.
// - Any email address left in page text is masked in PostHog recordings regardless.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;
const CONSENT_KEY = "designrounds:analytics-consent";
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const LOAD_DELAY_MS = 4000;

export const analyticsEnabled = typeof window !== "undefined"
  && (import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_DEV === "true")
  && Boolean(POSTHOG_KEY || CLARITY_ID);

// Props for a layout-neutral wrapper (display: contents) around a private area.
export const PRIVATE_ZONE = { className: "ph-no-capture", "data-clarity-mask": "true", style: { display: "contents" } };

let posthog = null;
let queue = []; // calls made before PostHog finished loading
let clarityLoaded = false;
let currentUser = null;
let identified = false;
const listeners = new Set();

export function readConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* applies to this tab only */ }
  if (analyticsEnabled) applyConsent(value);
  for (const listener of listeners) listener(value);
}

// Clears the choice so the banner asks again (the privacy page's "Change" button).
export function resetConsent() {
  try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* nothing stored */ }
  if (analyticsEnabled) applyConsent(null);
  for (const listener of listeners) listener(null);
}

export function onConsentChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Called once from main.jsx after the first render.
export function startAnalytics() {
  if (!analyticsEnabled) return;
  const start = () => {
    if (POSTHOG_KEY) loadPostHog();
    if (readConsent() === "granted") loadClarity();
  };
  // A few seconds after load, then at the next idle moment: PostHog's setup is a few
  // hundred ms of script on a slow phone, so it waits until the page has settled.
  const whenIdle = () => window.setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 4000 }) : start()), LOAD_DELAY_MS);
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

// A product event. Properties are ids, names and counts only, never user-written text.
export function track(event, properties) {
  withPostHog((client) => client.capture(event, properties));
}

// Links events to the signed-in account by its internal id; no email or name is sent.
export function identifyUser(user) {
  if (!analyticsEnabled) return;
  currentUser = user;
  if (user) {
    identified = true;
    withPostHog((client) => client.identify(user.id, { plan: user.plan, admin: Boolean(user.isAdmin) }));
    if (clarityLoaded) window.clarity("identify", user.id);
  } else if (identified) {
    // Signing out starts a fresh anonymous visitor, so two accounts on one browser don't merge.
    identified = false;
    withPostHog((client) => client.reset());
  }
}

function withPostHog(call) {
  if (!analyticsEnabled || !POSTHOG_KEY) return;
  if (posthog) call(posthog);
  else queue.push(call);
}

async function loadPostHog() {
  const { default: client } = await import("posthog-js");
  const granted = readConsent() === "granted";
  client.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: POSTHOG_HOST.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-08-30",
    persistence: granted ? "localStorage+cookie" : "memory",
    disable_session_recording: !granted,
    person_profiles: "identified_only",
    disable_surveys: true,
    // Starts autocapture and recording after yielding, so setup isn't one long task.
    __preview_deferred_init_extensions: true,
    session_recording: {
      maskAllInputs: true,
      // Every text node passes through maskTextFn: .ph-mask text is starred out, and
      // email addresses are removed from the rest.
      maskTextSelector: "*",
      maskTextFn: (text, element) => (element?.closest?.(".ph-mask") ? text.replace(/\S/g, "*") : text.replace(EMAIL, "•••")),
    },
  });
  client.register({ environment: import.meta.env.MODE });
  posthog = client;
  for (const call of queue) call(client);
  queue = [];
}

function applyConsent(value) {
  if (posthog) {
    if (value === "granted") {
      posthog.set_config({ persistence: "localStorage+cookie" });
      posthog.startSessionRecording();
    } else {
      posthog.stopSessionRecording();
      posthog.set_config({ persistence: "memory" });
    }
  }
  if (value === "granted") loadClarity();
  // Clarity's documented way to withdraw: it ends the session and erases its cookies.
  else if (clarityLoaded) window.clarity("consent", false);
}

// Microsoft's tag snippet, written out so it needs no inline script under the CSP.
function loadClarity() {
  if (!CLARITY_ID) return;
  if (clarityLoaded) {
    window.clarity("consent");
    return;
  }
  clarityLoaded = true;
  window.clarity = window.clarity || function clarity(...args) { (window.clarity.q = window.clarity.q || []).push(args); };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(script);
  window.clarity("consent");
  if (currentUser) window.clarity("identify", currentUser.id);
}
