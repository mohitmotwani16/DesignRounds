// TICKS (section 6): pure decisions for the background calls the workspace makes while
// the learner is quiet. Most ticks end with nothing, or a template; only two cases call
// the model (and reserve a credit).

const QUESTION_KINDS = new Set(["opening", "question", "probe", "challenge", "hint", "clarification", "redirect", "wrap_up"]);
// An unanswered question older than this no longer blocks a question about the canvas.
const OPEN_QUESTION_MS = 3 * 60_000;

export const timeCheckText = (share, mode) => {
  const percent = Math.round(share * 100);
  if (percent >= 100) return "We're at time.";
  if (percent <= 55) {
    return mode === "guided"
      ? "Quick time check: we're about halfway through. If you haven't sketched the main flow yet, now's a good time to."
      : "Quick time check: we're about halfway through.";
  }
  return mode === "guided"
    ? `We're about ${percent}% of the way through. Make sure you leave time to go deep on the hardest part, and to wrap up.`
    : `We're about ${percent}% of the way through.`;
};

export const WRAP_UP_TEXT = "We're about at time, so let's wrap up. Give me a short summary of your design, the biggest bottleneck or risk you see in it, and what you'd improve with more time. Any questions for me?";
export const IDLE_NUDGE_TEXT = "Take your time. Want to talk me through what you're thinking so far, or would a hint help?";
export const DRAWING_NUDGE_TEXT = "Talk me through what you've drawn so far. What's the flow for the main request?";

const since = (at, now) => (at ? now - new Date(at).getTime() : Infinity);

// `context` is everything the decision needs, gathered by the caller:
//   typing, pending, now, mode, conventions, clock, timeWarnings, stage
//   lastTurn { role, kind, at }, lastLearnerAt, lastProactiveAt, lastNudgeAt,
//   proactiveLeft, focusExhausted, canvas { itemId, unexplained, major, changedSinceLearner }
export function decideTick(context) {
  const { typing, pending, now, mode, conventions, clock, timeWarnings, stage, lastTurn, lastLearnerAt, lastProactiveAt, lastNudgeAt, proactiveLeft, focusExhausted, canvas } = context;
  if (pending) return { action: "none", why: "busy" };
  if (typing) return { action: "none", why: "typing" };

  // Time thresholds, each announced once. At 100% the round moves to wrap-up.
  const share = clock.roundElapsedMs / clock.roundBudgetMs;
  if (share >= 1 && stage !== "wrap_up") return { action: "template", move: "wrap_up", text: WRAP_UP_TEXT, threshold: 1 };
  const due = conventions.timeWarnings.filter((threshold) => share >= threshold && !timeWarnings.includes(threshold));
  if (due.length && stage !== "wrap_up") {
    const threshold = Math.max(...due);
    return { action: "template", move: "time_check", text: timeCheckText(threshold, mode), threshold, alsoRecord: due };
  }

  const cooling = since(lastProactiveAt, now) < conventions.proactiveCooldownMs;
  const questionOpen = lastTurn?.role === "interviewer" && QUESTION_KINDS.has(lastTurn.kind) && since(lastTurn.at, now) < OPEN_QUESTION_MS;

  // A stage that ran well over its budget, with nothing more to get from the focus item.
  if (clock.stageElapsedMs > clock.stageBudgetMs * conventions.stageOverrunFactor && focusExhausted && !cooling && !questionOpen && proactiveLeft > 0 && stage !== "wrap_up") {
    return { action: "model", kind: "stage" };
  }
  // Something significant appeared on the canvas, unexplained, and it maps to the agenda.
  if (canvas?.unexplained && canvas.itemId && !cooling && !questionOpen && proactiveLeft > 0) {
    return { action: "model", kind: "canvas", itemId: canvas.itemId };
  }
  const nudgedRecently = since(lastNudgeAt, now) < conventions.idleNudgeMs;
  // Silent for a while with a question waiting.
  if (lastTurn?.role === "interviewer" && QUESTION_KINDS.has(lastTurn.kind) && since(lastTurn.at, now) >= conventions.idleNudgeMs && !nudgedRecently) {
    return { action: "template", move: "nudge", text: IDLE_NUDGE_TEXT };
  }
  // Drawing for a while without saying anything.
  if (canvas?.changedSinceLearner && since(lastLearnerAt, now) >= conventions.drawingWithoutTalkingMs && !nudgedRecently && lastTurn?.kind !== "nudge") {
    return { action: "template", move: "nudge", text: DRAWING_NUDGE_TEXT };
  }
  return { action: "none", why: canvas?.major || canvas?.unexplained ? "not_now" : "nothing_to_ask" };
}

// Active time: the gap since the last activity, capped so a paused round doesn't eat
// its clock.
export function accrueActiveMs({ activeMs, lastActivityAt, now, capMs }) {
  if (!lastActivityAt) return activeMs;
  const gap = now - new Date(lastActivityAt).getTime();
  return activeMs + Math.max(0, Math.min(gap, capMs));
}
