// Plan entitlements. The limits themselves live in src/data/plans.js, shared with the
// client; they are enforced here, on the server, before any model call.
import { aiLimits } from "../../src/data/plans.js";

export { aiLimits };

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  return typeof value === "string" ? value.slice(0, 10) : null;
}

export function isPlus(user) {
  if (user?.plan !== "plus") return false;
  const expiresAt = dateOnly(user.plan_expires_at);
  return Boolean(expiresAt && expiresAt >= new Date().toISOString().slice(0, 10));
}

export const planFor = (user) => isPlus(user) ? "plus" : "free";

// A free learner's interviewer trial round (practice_sessions.interviewer_trial) gets
// the trial allowances; every other round follows the learner's plan. Pass the session
// wherever one is in hand, so a trial round is recognised.
export const onTrial = (user, session) => !isPlus(user) && Boolean(session?.interviewer_trial);

export function limitsFor(user, session = null) {
  if (onTrial(user, session)) return aiLimits.trial;
  return aiLimits[planFor(user)] || aiLimits.free;
}

export const hasFullFeedback = (user, session = null) => isPlus(user) || onTrial(user, session);
export const hasInterviewer = (user, session = null) => limitsFor(user, session).interviewTurnsPerRound > 0;
