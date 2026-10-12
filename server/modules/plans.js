// AI allowances per plan. These are product entitlements: they are enforced on
// the server before any model call and never decided by the client or the model.
export const aiLimits = {
  free: { reviewsPerRound: 1, reviewsPerMonth: 5, interviewTurnsPerRound: 0, interviewTurnsPerMonth: 0, hintsPerRound: 0, proactiveChecksPerRound: 0 },
  plus: { reviewsPerRound: 3, reviewsPerMonth: 60, interviewTurnsPerRound: 40, interviewTurnsPerMonth: 800, hintsPerRound: 3, proactiveChecksPerRound: 25 },
};

export function limitsFor(user) {
  return aiLimits[user.plan] || aiLimits.free;
}

export const hasFullFeedback = (user) => user.plan === "plus";
export const hasInterviewer = (user) => limitsFor(user).interviewTurnsPerRound > 0;
