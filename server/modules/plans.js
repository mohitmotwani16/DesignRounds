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

export function limitsFor(user) {
  return aiLimits[planFor(user)] || aiLimits.free;
}

export const hasFullFeedback = (user) => isPlus(user);
export const hasInterviewer = (user) => limitsFor(user).interviewTurnsPerRound > 0;
