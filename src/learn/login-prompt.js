// When to ask a signed-out reader of the handbook to sign in. Every number that decides
// how often someone is asked lives here. The UI is src/components/LearnLoginPrompt.jsx.
//
// The handbook stays free to read. These pages are indexed, so the asks must never cover
// the article: Google's guidance excuses login dialogs only on content that isn't publicly
// indexable, and accepts banners that use a reasonable amount of screen and are easy to
// dismiss. So every ask is a dismissible banner, and the article is always fully readable.
//
// The ladder, per browser:
//   1. A small card once they are clearly reading.
//   2. A small card when they finish an article, or when they open another one.
//   3. A larger banner with what an account gets them, once they have read two articles
//      (or come back the next day).
//   After that, the larger banner once every two weeks.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const RULES = {
  readingAt: 0.3, // share of the article scrolled past
  engagedMs: 20_000, // visible, recently active time on this article
  finishedAt: 0.85,
  idleAfterMs: MINUTE, // no scroll, tap or key for this long stops the engaged clock
  secondAskGapMs: MINUTE,
  thirdAskGapMs: 30 * MINUTE,
  thirdAskReturnGapMs: DAY, // a reader who sticks to one article still reaches the third ask
  thirdAskMinRead: 2,
  repeatEveryMs: 14 * DAY,
};

const STORAGE_KEY = "designrounds:learn-prompt";
const CLICK_KEY = "designrounds:learn-prompt-click";
const MAX_READ_KEPT = 40;

const freshState = () => ({ asks: 0, lastAskAt: 0, lastAskSlug: null, read: [] });

// Tolerates anything in storage: a bad value only means asking from the start.
export function parseState(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return freshState();
    return {
      asks: Number.isInteger(value.asks) && value.asks > 0 ? value.asks : 0,
      lastAskAt: Number.isFinite(value.lastAskAt) ? value.lastAskAt : 0,
      lastAskSlug: typeof value.lastAskSlug === "string" ? value.lastAskSlug : null,
      read: Array.isArray(value.read) ? value.read.filter((slug) => typeof slug === "string").slice(-MAX_READ_KEPT) : [],
    };
  } catch {
    return freshState();
  }
}

// Decides the ask for this moment, or null. Pure, so the ladder can be tested.
export function nextAsk(state, { slug, progress, engagedMs, now }) {
  if (progress < RULES.readingAt || engagedMs < RULES.engagedMs) return null;
  const since = now - state.lastAskAt;
  if (state.asks === 0) return { number: 1, style: "card", moment: "reading" };
  if (state.asks === 1) {
    if (since < RULES.secondAskGapMs) return null;
    if (progress >= RULES.finishedAt) return { number: 2, style: "card", moment: "finished" };
    return slug !== state.lastAskSlug ? { number: 2, style: "card", moment: "reading" } : null;
  }
  if (state.asks === 2) {
    const readEnough = state.read.length >= RULES.thirdAskMinRead && since >= RULES.thirdAskGapMs;
    return readEnough || since >= RULES.thirdAskReturnGapMs ? { number: 3, style: "banner", moment: "reading" } : null;
  }
  return since >= RULES.repeatEveryMs ? { number: state.asks + 1, style: "banner", moment: "reading" } : null;
}

export function withRead(state, slug) {
  if (state.read.includes(slug)) return state;
  return { ...state, read: [...state.read, slug].slice(-MAX_READ_KEPT) };
}

export function withAsk(state, ask, slug, now) {
  return { ...state, asks: ask.number, lastAskAt: now, lastAskSlug: slug };
}

// With storage blocked, the ladder still holds for this page load.
let memoryState = null;

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return parseState(raw);
  } catch { /* falls back to memory */ }
  return memoryState ?? freshState();
}

export function saveState(state) {
  memoryState = state;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* kept in memory */ }
}

// Sign-in may leave the page (Google) and analytics may hold its anonymous id in memory
// only, so the sign-in is credited to the prompt through this tab's session storage.
export function rememberClick(details) {
  try { window.sessionStorage.setItem(CLICK_KEY, JSON.stringify(details)); } catch { /* not credited */ }
}

export function takeClick() {
  try {
    const raw = window.sessionStorage.getItem(CLICK_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(CLICK_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
