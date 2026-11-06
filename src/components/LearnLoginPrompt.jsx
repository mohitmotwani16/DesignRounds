import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { track } from "../analytics.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { prompts } from "../data/prompts.js";
import { RULES, isReading, loadState, nextAsk, rememberClick, saveState, takeClick, withAsk, withRead } from "../learn/login-prompt.js";
import { Link, navigate } from "../router.js";
import { GoogleMark } from "../pages/SignIn.jsx";
import { TurnstileWidget } from "./Turnstile.jsx";

// Asks signed-out readers to sign in while they read the handbook. How often is decided in
// src/learn/login-prompt.js, along with why this is a dialog and what that risks.
//
// Nothing renders until a real reader has been active for a while, so prerendered pages,
// crawlers and the first paint are unaffected.

const INPUTS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"];
const TICK_MS = 1000;
// How long the hidden human check may take before the sign-in page takes over.
const CHECK_STALL_MS = 10_000;

const freeRounds = prompts.filter((prompt) => prompt.access === "free").length;

function articleProgress() {
  const box = document.querySelector(".learn-article")?.getBoundingClientRect();
  if (!box || box.height <= 0) return 0;
  return Math.min(1, Math.max(0, (window.innerHeight - box.top) / box.height));
}

// This page at the heading being read, so sign-in brings the reader back to the same spot.
function returnPath() {
  const headings = document.querySelectorAll(".learn-article h2[id]");
  let current = "";
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > 120) break;
    current = heading.id;
  }
  return `${window.location.pathname}${current ? `#${current}` : ""}`;
}

const signInPath = (destination) => `/signin?next=${encodeURIComponent(destination)}`;

function titleFor(ask, topic, readCount) {
  if (ask.number >= 3) return readCount >= 2 ? `You're ${readCount} guides in` : "Welcome back";
  if (ask.moment === "finished") return "Finished? See how you'd do in an interview";
  if (ask.number === 1) return topic ? `Put ${topic} into practice` : "Put this into practice";
  return "Reading is the easy part";
}

// While the dialog is open: the page behind can't scroll (without the scrollbar's width
// shifting the article), focus stays inside, and it returns to where it was afterwards.
function useDialogFocus(ref, open) {
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    const before = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    const returnTo = document.activeElement;
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      root.style.overflow = before.overflow;
      root.style.scrollbarGutter = before.gutter;
      if (returnTo instanceof HTMLElement && returnTo !== document.body) returnTo.focus({ preventScroll: true });
    };
  }, [ref, open]);
}

function keepTabInside(event, dialog) {
  if (event.key !== "Tab" || !dialog) return;
  const items = [...dialog.querySelectorAll("a[href], button:not([disabled])")];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const at = document.activeElement;
  if (event.shiftKey && (at === first || at === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && at === last) {
    event.preventDefault();
    first.focus();
  }
}

// One click for most people: the human check runs hidden and only after they choose
// Google, so passive readers never load it. If it needs them or fails, the sign-in page
// has the visible check.
function GoogleButton({ onChoose }) {
  const { turnstileSiteKey } = useAuth();
  const [starting, setStarting] = useState(null);
  const started = useRef(false);

  const fallBack = (destination) => navigate(signInPath(destination));

  useEffect(() => {
    if (!starting) return undefined;
    const timer = window.setTimeout(() => { if (!started.current) fallBack(starting); }, CHECK_STALL_MS);
    return () => window.clearTimeout(timer);
  }, [starting]);

  // The back button from Google can restore this page exactly as it was left, mid-spinner.
  useEffect(() => {
    const onShow = (event) => {
      if (!event.persisted) return;
      started.current = false;
      setStarting(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const start = async (destination, token) => {
    if (started.current) return;
    started.current = true;
    try {
      const { url } = await api.startGoogle(destination, token);
      window.location.assign(url);
    } catch {
      fallBack(destination);
    }
  };

  const choose = () => {
    const destination = returnPath();
    onChoose("google");
    setStarting(destination);
    if (!turnstileSiteKey) start(destination);
  };

  return (
    <>
      <button type="button" className="btn btn-google btn-lg" disabled={Boolean(starting)} onClick={choose}>
        {starting ? <LoaderCircle size={15} className="spin" /> : <GoogleMark />} Continue with Google
      </button>
      {starting && turnstileSiteKey && (
        <div className="turnstile-background" aria-hidden="true">
          <TurnstileWidget siteKey={turnstileSiteKey} invisible onToken={(token) => { if (token) start(starting, token); }} onError={() => fallBack(starting)} />
        </div>
      )}
    </>
  );
}

function SignInActions({ onChoose }) {
  const { googleAuth } = useAuth();
  const toSignIn = (event) => {
    onChoose("email");
    event.preventDefault();
    navigate(signInPath(returnPath()));
  };
  if (!googleAuth) {
    return <a className="btn btn-primary btn-lg" href="/signin" onClick={toSignIn}>Sign in free <ArrowRight size={15} /></a>;
  }
  return (
    <>
      <GoogleButton onChoose={onChoose} />
      <a className="btn btn-ghost btn-lg" href="/signin" onClick={toSignIn}>Use email</a>
    </>
  );
}

export function LearnLoginPrompt({ slug, topic, ready }) {
  const { status, error } = useAuth();
  const [ask, setAsk] = useState(null);
  const open = useRef(false);
  const dialog = useRef(null);
  useDialogFocus(dialog, Boolean(ask));
  // A failed session check can't tell a member from a visitor, so nobody is asked.
  const eligible = status === "signed-out" && !error && ready;

  useEffect(() => {
    if (!eligible) return undefined;
    let engagedMs = 0;
    let furthest = 0;
    let screens = 0;
    let lastInput = 0;
    let lastTick = Date.now();
    let counted = false;
    const onInput = () => { lastInput = Date.now(); };
    INPUTS.forEach((type) => window.addEventListener(type, onInput, { capture: true, passive: true }));

    const timer = window.setInterval(() => {
      const now = Date.now();
      const active = document.visibilityState === "visible" && lastInput > 0 && now - lastInput < RULES.idleAfterMs;
      if (active) engagedMs += now - lastTick;
      lastTick = now;
      if (!active) return;
      furthest = Math.max(furthest, articleProgress());
      screens = Math.max(screens, window.scrollY / window.innerHeight);

      // Read from storage each time: another tab may have asked or read since.
      let state = loadState();
      if (!counted && isReading({ progress: furthest, screens, engagedMs })) {
        counted = true;
        state = withRead(state, slug);
        saveState(state);
      }
      if (open.current || document.querySelector(".learn-sidebar.open")) return;
      const next = nextAsk(state, { slug, progress: furthest, screens, engagedMs, now });
      if (!next) return;
      saveState(withAsk(state, next, slug, now));
      open.current = true;
      const details = { ask: next.number, moment: next.moment, slug, articles_read: state.read.length };
      setAsk({ ...next, details, readCount: state.read.length });
      track("learn_prompt_shown", details);
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
      INPUTS.forEach((type) => window.removeEventListener(type, onInput, true));
    };
  }, [eligible, slug]);

  if (!ask) return null;

  const dismiss = () => {
    track("learn_prompt_dismissed", ask.details);
    open.current = false;
    setAsk(null);
  };
  const choose = (method) => {
    const details = { ...ask.details, surface: "prompt", method };
    rememberClick(details);
    track("learn_prompt_clicked", details);
  };

  return (
    <div className="learn-prompt-backdrop" role="presentation">
      <section
        ref={dialog}
        className="learn-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-prompt-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") dismiss();
          keepTabInside(event, dialog.current);
        }}
      >
        <button type="button" className="learn-prompt-close" aria-label="Close" onClick={dismiss}><X size={20} /></button>
        <h2 id="learn-prompt-title">{titleFor(ask, topic, ask.readCount)}</h2>
        <p>The handbook stays free. A free account also gets you:</p>
        <ul>
          <li>{freeRounds} design rounds on a real canvas</li>
          <li>An AI review of your design, with a score</li>
          <li>Your first round with the live AI interviewer</li>
        </ul>
        <div className="learn-prompt-actions">
          <SignInActions onChoose={choose} />
        </div>
        <small>No password or card. You'll come back to this spot.</small>
      </section>
    </div>
  );
}

// The ask that is always there at the end of an article. It sits in the page, so it covers
// nothing and doesn't count against the ladder.
export function LearnEndCta({ slug }) {
  const { status, error } = useAuth();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(status === "signed-out" && !error); }, [status, error]);
  if (!visible) return null;

  const click = (event) => {
    const details = { surface: "end_of_article", method: "signin_page", slug };
    rememberClick(details);
    track("learn_prompt_clicked", details);
    event.preventDefault();
    navigate(signInPath(returnPath()));
  };

  return (
    <aside className="learn-signin-cta">
      <div>
        <h2>Can you defend this in an interview?</h2>
        <p>Build the design on a canvas and get an AI review with a score. {freeRounds} rounds are free, and so is your first round with the live AI interviewer.</p>
      </div>
      <Link className="btn btn-primary" to="/signin" onClick={click}>Sign in free <ArrowRight size={15} /></Link>
    </aside>
  );
}

// Called once the visitor is signed in: credits the prompt that brought them here.
export function reportLearnPromptSignIn() {
  const details = takeClick();
  if (details) track("learn_prompt_signed_in", details);
}
