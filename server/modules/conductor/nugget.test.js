import assert from "node:assert/strict";
import { test } from "node:test";
import { plan as makePlan } from "./plan.js";
import { nuggetDebriefSent, nuggetIncidentResolved, nuggetInterviewerExplainedFix, nuggetWrapMessage } from "./nugget.js";
import { decideTick } from "./ticks.js";

const conventions = { maxFollowUpsPerItem: 2, maxChallengesPerMisconception: 1, hintsPerRound: 3, stageOverrunFactor: 1.5, wrapUpAt: 0.95, maxAssessmentsPerTurn: 4, minCanvasComponents: 3, minCanvasConnections: 2, drawCooldownTurns: 2, maxDrawRequestsPerItem: 2, timeWarnings: [0.8], idleNudgeMs: 180_000, drawingWithoutTalkingMs: 240_000, proactiveCooldownMs: 90_000 };

test("nuggetIncidentResolved when band is adequate", () => {
  assert.equal(nuggetIncidentResolved({ status: "open", band: "adequate" }), true);
  assert.equal(nuggetIncidentResolved({ status: "open", band: "weak" }), false);
  assert.equal(nuggetIncidentResolved({ status: "answered", band: "adequate" }), true);
});

test("nuggetWrapMessage includes reference debrief", () => {
  const text = nuggetWrapMessage({ miniPack: { agenda: [{ referenceFix: "Use CRDT merge." }] } });
  assert.match(text, /Quick debrief: Use CRDT merge\./);
});

test("plan: incident drill with adequate focus allows wrap_up only", () => {
  const agenda = new Map([["incident.fix", { id: "incident.fix", stage: "deep_dive", triggers: { keywords: [], componentKinds: [] } }]]);
  const items = [{ itemId: "incident.fix", position: 0, stage: "deep_dive", dimension: "x", weight: 3, required: true, status: "open", band: "adequate", followUps: 0, hintLevel: 0, challenges: 0, misconceptions: [], evidence: [], openedSeq: 1, closedSeq: null, drawRequests: 0 }];
  const state = { stage: "deep_dive", focusItemId: "incident.fix", assumptions: [], activeMs: 60_000, stageStartedMs: 0, hintsUsed: 0, clarificationsAsked: [], ledgerVersion: 0, lastDrawAskSeq: null, componentsAtDrawAsk: null };
  const result = makePlan({ items, state, conventions, agenda, pacing: { deep_dive: 0.85, wrap_up: 0.15 }, minutes: 4, incidentDrill: true });
  assert.ok(result.allowedMoves.includes("wrap_up"));
  assert.ok(!result.allowedMoves.includes("move_on"));
  assert.ok(!result.allowedMoves.includes("curveball"));
});

test("decideTick: incident drill skips canvas proactive questions", () => {
  const clock = { roundElapsedMs: 60_000, roundBudgetMs: 240_000, stageElapsedMs: 30_000, stageBudgetMs: 200_000 };
  const none = decideTick({
    typing: false, pending: false, now: Date.now(), mode: "realistic", conventions, clock, timeWarnings: [],
    stage: "deep_dive", lastTurn: null, idleSinceAt: null, lastIdleHintAt: null, lastLearnerAt: null,
    lastProactiveAt: null, lastNudgeAt: null, proactiveLeft: 3, focusExhausted: false,
    canvas: { unexplained: true, itemId: "n-app", major: false, changedSinceLearner: false },
    incidentDrill: true, debriefDone: false,
  });
  assert.equal(none.action, "none");
});

test("nuggetDebriefSent detects debrief in turns", () => {
  assert.equal(nuggetDebriefSent([{ role: "interviewer", content: "Quick debrief: fix it." }]), true);
  assert.equal(nuggetDebriefSent([{ role: "interviewer", content: "Tell me more." }]), false);
});

test("nuggetInterviewerExplainedFix matches reference language", () => {
  const ref = "Use a distributed lock with lease renewal and fencing tokens.";
  assert.equal(nuggetInterviewerExplainedFix("You need distributed lock with lease renewal and fencing tokens on the writer.", ref), true);
  assert.equal(nuggetInterviewerExplainedFix("Can you say more about latency?", ref), false);
});
