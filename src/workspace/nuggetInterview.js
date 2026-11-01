export function nuggetDebriefInTurns(turns) {
  return turns.some((turn) => turn.role === "interviewer" && String(turn.content ?? "").includes("Quick debrief:"));
}
