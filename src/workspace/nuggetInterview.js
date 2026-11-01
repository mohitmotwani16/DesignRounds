export function nuggetDebriefInTurns(turns) {
  return turns.some((turn) => turn.role === "interviewer" && String(turn.content ?? "").includes("Quick debrief:"));
}

export function nuggetDebriefBody(turns) {
  const turn = turns.find((entry) => entry.role === "interviewer" && String(entry.content ?? "").includes("Quick debrief:"));
  if (!turn) return null;
  const marker = "Quick debrief:";
  const index = String(turn.content).indexOf(marker);
  return index >= 0 ? String(turn.content).slice(index + marker.length).trim() : null;
}
