const DEBRIEF_MARKER = "Quick debrief:";

export function nuggetDebriefInTurns(turns) {
  return turns.some((turn) => turn.role === "interviewer" && String(turn.content ?? "").includes(DEBRIEF_MARKER));
}

export function nuggetDebriefBody(turns) {
  const turn = turns.find((entry) => entry.role === "interviewer" && String(entry.content ?? "").includes(DEBRIEF_MARKER));
  if (!turn) return null;
  const index = String(turn.content).indexOf(DEBRIEF_MARKER);
  return index >= 0 ? String(turn.content).slice(index + DEBRIEF_MARKER.length).trim() : null;
}

/** Wrap-up line shown in chat; the full debrief lives on the Review tab. */
export function nuggetWrapLead(content) {
  const text = String(content ?? "");
  if (!text.includes(DEBRIEF_MARKER)) return text;
  return text.slice(0, text.indexOf(DEBRIEF_MARKER)).trim();
}

export function nuggetTurnHasDebrief(content) {
  return String(content ?? "").includes(DEBRIEF_MARKER);
}
