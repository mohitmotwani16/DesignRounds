// Plan entitlements. The limits themselves live in src/data/plans.js, shared with the
// client; they are enforced here, on the server, before any model call.
import { aiLimits } from "../../src/data/plans.js";

export { aiLimits };

export function limitsFor(user) {
  return aiLimits[user.plan] || aiLimits.free;
}

export const hasFullFeedback = (user) => user.plan === "plus";
export const hasInterviewer = (user) => limitsFor(user).interviewTurnsPerRound > 0;
