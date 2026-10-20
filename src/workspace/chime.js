import { useState } from "react";

// A short, soft two-note "pop" when the interviewer speaks, so a learner who is busy on
// the canvas notices a reply or a question. Synthesised with Web Audio, so there is no
// file to load. Learners can turn it off; the choice is kept per browser.

const KEY = "designrounds:interviewer-sound";
const MIN_GAP_MS = 1500;
let context = null;
let suppressed = false;
let lastPlayed = 0;

export function soundEnabled() {
  try { return window.localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function useInterviewerSound() {
  const [enabled, setEnabled] = useState(soundEnabled);
  const toggle = () => {
    const next = !enabled;
    try { window.localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* preference only */ }
    setEnabled(next);
    // A preview, so turning it on confirms what it sounds like.
    if (next) playChime({ force: true });
  };
  return [enabled, toggle];
}

// While the learner records a voice answer, a chime would end up in the recording.
export function suppressChime(value) {
  suppressed = value;
}

function audioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context ??= new AudioContextClass();
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

// Browsers only allow audio after the learner has interacted with the page; the first
// click or key press in the workspace unlocks it so later replies can play.
export function primeChime() {
  try { audioContext(); } catch { /* no audio */ }
}

export function playChime({ force = false } = {}) {
  if (typeof window === "undefined" || suppressed || (!force && !soundEnabled())) return;
  if (Date.now() - lastPlayed < MIN_GAP_MS) return;
  lastPlayed = Date.now();
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [frequency, at] of [[660, 0], [990, 0.085]]) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.1, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.2);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + at);
      oscillator.stop(now + at + 0.22);
    }
  } catch {
    // Sound is a nicety; never let it break the interview.
  }
}
