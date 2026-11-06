// When to ask a signed-out reader of the handbook to sign in. Every number that decides
// how often someone is asked lives here. The UI is src/components/LearnLoginPrompt.jsx.
//
// The handbook stays free to read. Each ask is a centred dialog the reader has to answer:
// sign in, or close it with the cross.
//
// That is a product decision made knowing the cost. Google's guidance excuses login dialogs
// only on content that isn't publicly indexable, and these pages are indexed, so the dialog
// can count against them in search. To keep the risk small it never appears on page load
// or for crawlers, and the article stays in the page. If Learn's search traffic falls after
// this ships, this dialog is the first thing to look at.
//
// The ladder, per browser:
//   1. Once they are clearly reading.
//   2. When they finish an article, open another one, or stay on a long one.
//   3. Once they have read two articles (or come back the next day).
//   After that, once every two weeks.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const RULES = {
  // "Clearly reading". Articles run to many screens, so a share of the article alone would
  // miss someone who spends minutes on the first few sections and then leaves.
  engagedMs: 20_000, // visible, recently active time on this article
  readingAt: 0.3, // share of the article on screen or scrolled past
  readingScreens: 1.5, // or this many screens scrolled
  engagedAloneMs: MINUTE, // or this long active at any depth
  finishedAt: 0.85,
  idleAfterMs: MINUTE, // no scroll, tap or key for this long stops the engaged clock
  secondAskGapMs: MINUTE,
  secondAskEngagedMs: 3 * MINUTE, // still on one long article, nowhere near its end
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

export function isReading({ progress, screens = 0, engagedMs }) {
  if (engagedMs >= RULES.engagedAloneMs) return true;
  return engagedMs >= RULES.engagedMs && (progress >= RULES.readingAt || screens >= RULES.readingScreens);
}

// Decides the ask for this moment, or null. Pure, so the ladder can be tested.
export function nextAsk(state, { slug, progress, screens, engagedMs, now }) {
  if (!isReading({ progress, screens, engagedMs })) return null;
  const since = now - state.lastAskAt;
  if (state.asks === 0) return { number: 1, moment: "reading" };
  if (state.asks === 1) {
    if (since < RULES.secondAskGapMs) return null;
    if (progress >= RULES.finishedAt) return { number: 2, moment: "finished" };
    return slug !== state.lastAskSlug || engagedMs >= RULES.secondAskEngagedMs ? { number: 2, moment: "reading" } : null;
  }
  if (state.asks === 2) {
    const readEnough = state.read.length >= RULES.thirdAskMinRead && since >= RULES.thirdAskGapMs;
    return readEnough || since >= RULES.thirdAskReturnGapMs ? { number: 3, moment: "reading" } : null;
  }
  return since >= RULES.repeatEveryMs ? { number: state.asks + 1, moment: "reading" } : null;
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
