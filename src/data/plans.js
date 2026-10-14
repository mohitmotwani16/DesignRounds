// AI allowances per plan, shared by the server (which enforces them before any model
// call) and the client (which describes them on the pricing section). Product
// entitlements are never decided by the client or the model.
export const aiLimits = {
  free: { reviewsPerRound: 1, reviewsPerMonth: 5, interviewTurnsPerRound: 0, interviewTurnsPerMonth: 0, hintsPerRound: 0, proactiveChecksPerRound: 0 },
  plus: { reviewsPerRound: 3, reviewsPerMonth: 60, interviewTurnsPerRound: 40, interviewTurnsPerMonth: 800, hintsPerRound: 3, proactiveChecksPerRound: 25 },
};
