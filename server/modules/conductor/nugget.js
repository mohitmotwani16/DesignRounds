import { bandAtLeast } from "./moves.js";

export function nuggetWrapMessage(nugget, lead = "Good — that addresses this incident.") {
  const reference = nugget?.miniPack?.agenda?.[0]?.referenceFix;
  const debrief = reference ? `\n\nQuick debrief: ${reference}` : "";
  return `${lead}${debrief}`.slice(0, 4000);
}

export function nuggetDebriefSent(turns) {
  return turns.some((turn) => turn.role === "interviewer" && String(turn.content ?? "").includes("Quick debrief:"));
}

/** Tighter pacing for short incident drills. */
export function nuggetDrillConventions(conventions) {
  return {
    ...conventions,
    maxFollowUpsPerItem: Math.min(conventions.maxFollowUpsPerItem, 1),
    wrapUpAt: Math.min(conventions.wrapUpAt ?? 0.95, 0.9),
  };
}

/** The learner (or ledger) has covered the fix well enough to close the drill. */
export function nuggetIncidentResolved(focus) {
  if (!focus) return false;
  if (focus.status === "answered") return true;
  if (focus.status === "partial" && bandAtLeast(focus.band, "adequate")) return true;
  return focus.status === "open" && bandAtLeast(focus.band, "adequate");
}

export function nuggetReferenceFix(record) {
  return record?.pack?.agenda?.[0]?.referenceFix ?? record?.nugget?.miniPack?.agenda?.[0]?.referenceFix ?? null;
}

/** True when text substantially overlaps the reference fix (same ballpark). */
export function nuggetTextMatchesReferenceFix(text, referenceFix) {
  if (!referenceFix || !text) return false;
  const ref = String(referenceFix).trim();
  const body = String(text).trim();
  if (ref.length >= 24 && body.toLowerCase().includes(ref.slice(0, Math.min(48, ref.length)).toLowerCase())) return true;
  const words = (value) => String(value).toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 3);
  const refWords = new Set(words(ref));
  if (refWords.size < 2) return false;
  const hits = words(body).filter((word) => refWords.has(word)).length;
  return hits >= Math.min(4, Math.max(2, Math.ceil(refWords.size * 0.3)));
}

/** True when interviewer text substantially matches the reference fix (explained the solution). */
export function nuggetInterviewerExplainedFix(text, referenceFix) {
  return nuggetTextMatchesReferenceFix(text, referenceFix);
}

/** True when the learner's answer is in the same ballpark as the reference fix. */
export function nuggetLearnerNearFix(text, referenceFix) {
  return nuggetTextMatchesReferenceFix(text, referenceFix);
}
