import assert from "node:assert/strict";
import test from "node:test";
import { applyTurn } from "./apply.js";
import { candidateItems, clockOf, nextPendingItem, plan, tickPlan } from "./plan.js";
import { accrueActiveMs, decideTick } from "./ticks.js";
import { matchQuote, questionCount, validateOutput } from "./validate.js";

const pack = {
  agenda: [
    { id: "req.scale", stage: "requirements", dimension: "requirements", weight: 2, required: true, triggers: { componentKinds: [], keywords: ["traffic", "qps"] }, misconceptions: [], moveOnSummary: "Assume about a hundred million new links a month and a read heavy mix." },
    { id: "req.api", stage: "requirements", dimension: "requirements", weight: 1, required: false, triggers: { componentKinds: [], keywords: ["api", "endpoint"] }, misconceptions: [] },
    { id: "hl.flow", stage: "high_level", dimension: "architecture", weight: 3, required: true, triggers: { componentKinds: ["load-balancer"], keywords: ["redirect"] }, misconceptions: [] },
    { id: "deep.codegen", stage: "deep_dive", dimension: "data", weight: 3, required: true, triggers: { componentKinds: ["kv-store"], keywords: ["base62", "short code"] }, misconceptions: [{ id: "md5-unique" }] },
    { id: "deep.cache", stage: "deep_dive", dimension: "scalability", weight: 2, required: true, triggers: { componentKinds: ["cache"], keywords: ["cache"] }, misconceptions: [] },
    { id: "deep.hotkey", stage: "deep_dive", dimension: "scalability", weight: 2, required: false, triggers: { componentKinds: [], keywords: [] }, misconceptions: [] },
    { id: "wrap.tradeoffs", stage: "wrap_up", dimension: "tradeoffs", weight: 2, required: true, triggers: { componentKinds: [], keywords: [] }, misconceptions: [] },
  ].map((item) => ({ moveOnSummary: "", ...item })),
  curveballs: [{ id: "viral", after: "deep.cache", prompt: "One link goes viral.", agendaItemId: "deep.hotkey" }],
  clarifications: [{ id: "scale.writes", topics: ["scale"], answer: "About 100M new links a month." }],
  exemplars: [{ band: "strong", label: "x", outline: "Range allocated counters per instance encoded in base sixty two with a cache in front." }],
  pacing: { requirements: 0.2, high_level: 0.3, deep_dive: 0.35, wrap_up: 0.15 },
};
const agenda = new Map(pack.agenda.map((item) => [item.id, item]));
const conventions = { maxFollowUpsPerItem: 2, maxChallengesPerMisconception: 1, hintsPerRound: 3, stageOverrunFactor: 1.5, wrapUpAt: 0.95, maxAssessmentsPerTurn: 4, timeWarnings: [0.8], idleNudgeMs: 180_000, drawingWithoutTalkingMs: 240_000, proactiveCooldownMs: 90_000 };

function ledger(overrides = {}) {
  return pack.agenda.map((item, position) => ({
    itemId: item.id, position, stage: item.stage, dimension: item.dimension, weight: item.weight, required: item.required,
    status: "pending", band: null, followUps: 0, hintLevel: 0, challenges: 0, misconceptions: [], evidence: [], openedSeq: null, closedSeq: null,
    ...overrides[item.id],
  }));
}
const baseState = (overrides = {}) => ({ stage: "requirements", focusItemId: "req.scale", assumptions: [], activeMs: 60_000, stageStartedMs: 0, hintsUsed: 0, clarificationsAsked: [], ledgerVersion: 0, ...overrides });
const planFor = (items, state, extra = {}) => plan({ items, state, conventions, agenda, curveballs: pack.curveballs, pacing: pack.pacing, minutes: 40, turn: { kind: "message", text: "" }, ...extra });

test("plan: the open item is the focus; budgets come from the conventions", () => {
  const items = ledger({ "req.scale": { status: "open", followUps: 1 } });
  const result = planFor(items, baseState());
  assert.equal(result.focusItemId, "req.scale");
  assert.equal(result.nextItemId, "req.api");
  assert.equal(result.budget.followUps, 1);
  assert.equal(result.budget.hints, 3);
  assert.deepEqual(result.allowedMoves, ["probe", "listen", "challenge", "clarify", "explain", "acknowledge_advance", "move_on", "redirect"]);
});

test("plan: letting the candidate keep going is allowed, but never twice in a row", () => {
  const items = ledger({ "req.scale": { status: "open" } });
  assert.ok(planFor(items, baseState(), { conversation: { lastMove: "probe", questionStreak: 3 } }).allowedMoves.includes("listen"));
  assert.equal(planFor(items, baseState(), { conversation: { lastMove: "probe", questionStreak: 3 } }).questionStreak, 3);
  assert.ok(!planFor(items, baseState(), { conversation: { lastMove: "listen", questionStreak: 0 } }).allowedMoves.includes("listen"));
});

test("plan: no follow-ups left means no probe; a used challenge means no challenge", () => {
  const items = ledger({ "deep.codegen": { status: "open", followUps: 2, challenges: 1 } });
  const result = planFor(items, baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }));
  assert.ok(!result.allowedMoves.includes("probe"));
  assert.ok(!result.allowedMoves.includes("challenge"));
  assert.ok(result.allowedMoves.includes("move_on"));
});

test("plan: a hint request allows only a hint", () => {
  const result = planFor(ledger({ "req.scale": { status: "open" } }), baseState(), { turn: { kind: "hint_request", text: "" } });
  assert.deepEqual(result.allowedMoves, ["hint"]);
});

test("plan: a stage 50% over budget must advance", () => {
  // requirements budget = 40 min * 0.2 = 8 min; 13 min elapsed is over 1.5x.
  const result = planFor(ledger({ "req.scale": { status: "open" } }), baseState({ activeMs: 13 * 60_000 }));
  assert.deepEqual(result.allowedMoves, ["acknowledge_advance", "move_on", "clarify", "explain"]);
});

test("plan: past 95% of the round only wrap-up, clarify and explain", () => {
  const result = planFor(ledger({ "req.scale": { status: "open" } }), baseState({ activeMs: 39 * 60_000, stageStartedMs: 38 * 60_000 }));
  assert.deepEqual(result.allowedMoves, ["wrap_up", "clarify", "explain"]);
});

test("plan: a pending focus can only be opened (or a question answered)", () => {
  const result = planFor(ledger(), baseState({ focusItemId: null }));
  assert.equal(result.focusItemId, "req.scale");
  assert.deepEqual(result.allowedMoves, ["open", "clarify", "explain", "redirect"]);
});

test("plan: a curveball only on a strong deep dive with time left", () => {
  const closed = { "req.scale": { status: "answered" }, "req.api": { status: "answered" }, "hl.flow": { status: "answered" }, "deep.codegen": { status: "answered" } };
  const state = baseState({ stage: "deep_dive", focusItemId: "deep.cache", activeMs: 22 * 60_000, stageStartedMs: 20 * 60_000 });
  const strong = planFor(ledger({ ...closed, "deep.cache": { status: "open", band: "strong" } }), state);
  assert.ok(strong.allowedMoves.includes("curveball"));
  assert.equal(strong.curveball.id, "viral");
  const adequate = planFor(ledger({ ...closed, "deep.cache": { status: "open", band: "adequate" } }), state);
  assert.ok(!adequate.allowedMoves.includes("curveball"));
});

test("plan: nothing left to open turns advancing into wrap-up", () => {
  const items = ledger(Object.fromEntries(pack.agenda.map((item) => [item.id, { status: item.id === "wrap.tradeoffs" ? "open" : "answered" }])));
  const result = planFor(items, baseState({ stage: "wrap_up", focusItemId: "wrap.tradeoffs" }));
  assert.ok(!result.allowedMoves.includes("acknowledge_advance"));
  assert.ok(result.allowedMoves.includes("wrap_up"));
});

test("plan: candidates come from keywords and canvas kinds, never the focus", () => {
  const items = ledger({ "req.scale": { status: "open" } });
  assert.deepEqual(candidateItems({ items, agenda, focusId: "req.scale", text: "I'd add a cache and base62 codes", addedKinds: ["load-balancer"] }), ["hl.flow", "deep.codegen", "deep.cache"]);
});

test("plan: next item never goes back a stage", () => {
  const items = ledger({ "req.api": { status: "pending" } });
  assert.equal(nextPendingItem(items, "high_level").itemId, "hl.flow");
  assert.equal(clockOf({ state: baseState({ activeMs: 90_000, stageStartedMs: 30_000 }), pacing: pack.pacing, minutes: 40 }).stageElapsedMs, 60_000);
});

test("tickPlan: a canvas question opens or probes the mapped item, or stays silent", () => {
  const items = ledger({ "req.scale": { status: "open" } });
  const base = planFor(items, baseState());
  assert.deepEqual(tickPlan({ base, kind: "canvas", itemId: "deep.cache", items }).allowedMoves, ["open", "stay_silent"]);
  assert.deepEqual(tickPlan({ base, kind: "canvas", itemId: "req.scale", items }).allowedMoves, ["probe", "stay_silent"]);
  assert.deepEqual(tickPlan({ base, kind: "stage", items }).allowedMoves, ["move_on"]);
});

const sources = [
  { turnSeq: 4, kind: "message", text: "I'd use a counter per server and encode it in base62 so codes stay short." },
  { turnSeq: 6, kind: "audio", spoken: true, text: "so um we put a redis cache in front of the the database for redirects" },
  { turnSeq: null, kind: "note", text: "Cache: 24h TTL on hot links" },
];
const output = (overrides = {}) => ({ move: "probe", focusItemId: "deep.codegen", message: "How do two servers avoid the same code?", classification: "answer", assessment: [], clarificationIds: [], newAssumption: "", nodeIds: [], coveredNodeIds: [], ...overrides });
const validate = (out, planOverrides = {}, items = ledger({ "deep.codegen": { status: "open" } })) => validateOutput({
  output: out, items, pack, sources, designIds: new Set(["n1"]), mode: "realistic", conventions,
  plan: { focusItemId: "deep.codegen", nextItemId: "deep.cache", allowedMoves: ["probe", "acknowledge_advance", "move_on"], curveball: null, ...planOverrides },
});

test("quotes: typed text needs a substring; voice tolerates transcription noise", () => {
  assert.equal(matchQuote("encode it in Base62, so codes stay short", sources).turnSeq, 4);
  assert.equal(matchQuote("we put a Redis cache in front of the database", sources).turnSeq, 6);
  assert.equal(matchQuote("24h TTL on hot links", sources).kind, "note");
  assert.equal(matchQuote("I would shard by user id", sources), null);
  assert.equal(matchQuote("ok", sources), null);
});

test("validate: unverified quotes and unknown items are dropped", () => {
  const result = validate(output({ assessment: [
    { itemId: "deep.codegen", band: "adequate", quote: "a counter per server and encode it in base62", missing: "range allocation", misconceptionId: "md5-unique" },
    { itemId: "deep.codegen", band: "strong", quote: "we use snowflake ids", missing: "", misconceptionId: "" },
    { itemId: "made.up", band: "strong", quote: "base62", missing: "", misconceptionId: "" },
  ] }));
  assert.equal(result.assessments.length, 1);
  assert.equal(result.assessments[0].turnSeq, 4);
  assert.equal(result.assessments[0].misconceptionId, "md5-unique");
  assert.equal(result.droppedAssessments, 2);
});

test("validate: disallowed moves are flagged; opening moves need a pending item", () => {
  assert.equal(validate(output({ move: "hint" })).moveAllowed, false);
  assert.equal(validate(output({ move: "move_on", focusItemId: "req.scale" }), {}, ledger({ "deep.codegen": { status: "open" }, "req.scale": { status: "answered" } })).focusItemId, "deep.cache");
  assert.equal(validate(output({ move: "acknowledge_advance", focusItemId: "deep.hotkey" })).focusItemId, "deep.hotkey");
  assert.equal(validate(output({ move: "probe", focusItemId: "hl.flow" })).focusItemId, "deep.codegen");
});

test("validate: acknowledging needs a quoted, adequate answer for the focus item", () => {
  const ack = output({ move: "acknowledge_advance", focusItemId: "deep.cache" });
  const praiseOfNothing = validate(ack);
  assert.equal(praiseOfNothing.unearned, true);
  assert.equal(praiseOfNothing.moveAllowed, false);
  const earned = validate({ ...ack, assessment: [{ itemId: "deep.codegen", band: "adequate", quote: "a counter per server and encode it in base62", missing: "", misconceptionId: "" }] });
  assert.equal(earned.moveAllowed, true);
  const earlier = validate(ack, {}, ledger({ "deep.codegen": { status: "open", band: "strong" } }));
  assert.equal(earlier.moveAllowed, true, "an answer from an earlier turn counts");
  const weakOnly = validate({ ...ack, assessment: [{ itemId: "deep.codegen", band: "weak", quote: "a counter per server and encode it in base62", missing: "", misconceptionId: "" }] });
  assert.equal(weakOnly.unearned, true, "a weak answer doesn't earn an acknowledgement; move_on is the honest move");
});

test("validate: counts questions outside quotes, filters ids, flags leaks", () => {
  assert.equal(questionCount('You said "why not?" earlier. What breaks first?'), 1);
  assert.equal(validate(output({ message: "What breaks? And why?" })).multipleQuestions, true);
  const result = validate(output({ nodeIds: ["n1", "n9"], clarificationIds: ["scale.writes", "nope"], message: "Range allocated counters per instance encoded in base sixty two with a cache in front." }));
  assert.deepEqual(result.nodeIds, ["n1"]);
  assert.deepEqual(result.clarificationIds, ["scale.writes"]);
  assert.equal(result.leakSuspected, true);
});

const apply = (items, state, verified, planOverrides = {}) => applyTurn({
  items, state, turn: { learnerSeq: 10, interviewerSeq: 11 },
  plan: { focusItemId: state.focusItemId, nextItemId: "deep.cache", allowedMoves: [verified.move], ...planOverrides },
  verified: { assessments: [], clarificationIds: [], newAssumption: "", ...verified },
});
const item = (result, id) => result.items.find((entry) => entry.itemId === id);

test("apply: a probe spends a follow-up and keeps the item open", () => {
  const result = apply(ledger({ "deep.codegen": { status: "open" } }), baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }), { move: "probe", focusItemId: "deep.codegen" });
  assert.equal(item(result, "deep.codegen").followUps, 1);
  assert.equal(item(result, "deep.codegen").status, "open");
  assert.equal(result.state.ledgerVersion, 1);
});

test("apply: listening spends no follow-up and keeps the item open", () => {
  const result = apply(ledger({ "deep.codegen": { status: "open" } }), baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }), { move: "listen", focusItemId: "deep.codegen" });
  assert.equal(item(result, "deep.codegen").followUps, 0);
  assert.equal(item(result, "deep.codegen").status, "open");
  assert.equal(result.state.focusItemId, "deep.codegen");
});

test("apply: acknowledge closes an adequately answered item and opens the next", () => {
  const result = apply(ledger({ "deep.codegen": { status: "open" } }), baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }), {
    move: "acknowledge_advance", focusItemId: "deep.cache",
    assessments: [{ itemId: "deep.codegen", band: "adequate", quote: "base62", missing: "", misconceptionId: null, turnSeq: 10, source: "message" }],
  });
  assert.equal(item(result, "deep.codegen").status, "answered");
  assert.equal(item(result, "deep.codegen").band, "adequate");
  assert.equal(item(result, "deep.cache").status, "open");
  assert.equal(result.state.focusItemId, "deep.cache");
});

test("apply: moving on from weak is partial, from nothing is missed", () => {
  const state = baseState({ stage: "deep_dive", focusItemId: "deep.codegen" });
  assert.equal(item(apply(ledger({ "deep.codegen": { status: "open", band: "weak" } }), state, { move: "move_on", focusItemId: "deep.cache" }), "deep.codegen").status, "partial");
  assert.equal(item(apply(ledger({ "deep.codegen": { status: "open" } }), state, { move: "move_on", focusItemId: "deep.cache" }), "deep.codegen").status, "missed");
});

test("apply: the best band wins, and later good answers resolve misconceptions", () => {
  const items = ledger({ "deep.codegen": { status: "open", band: "strong", misconceptions: [{ id: "md5-unique", resolved: false }] } });
  const result = apply(items, baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }), {
    move: "probe", focusItemId: "deep.codegen",
    assessments: [{ itemId: "deep.codegen", band: "adequate", quote: "x", missing: "", misconceptionId: null, turnSeq: 10, source: "message" }],
  });
  assert.equal(item(result, "deep.codegen").band, "strong");
  assert.deepEqual(item(result, "deep.codegen").misconceptions, [{ id: "md5-unique", resolved: true }]);
});

test("apply: an item covered out of order is credited and won't be re-asked", () => {
  const result = apply(ledger({ "req.scale": { status: "open" } }), baseState(), {
    move: "probe", focusItemId: "req.scale",
    assessments: [{ itemId: "deep.cache", band: "adequate", quote: "redis cache", missing: "", misconceptionId: null, turnSeq: 10, source: "message" }],
  });
  assert.equal(item(result, "deep.cache").status, "answered");
  assert.equal(item(result, "req.scale").status, "open");
});

test("apply: facts are pinned once; the stage only moves forward", () => {
  const state = baseState({ assumptions: [{ clarificationId: "scale.writes", turnSeq: 3 }] });
  const result = apply(ledger({ "req.scale": { status: "open", band: "strong" } }), state, { move: "acknowledge_advance", focusItemId: "hl.flow", clarificationIds: ["scale.writes"], newAssumption: "Links never expire." });
  assert.equal(result.state.assumptions.length, 2);
  assert.equal(result.state.stage, "high_level");
  assert.equal(result.state.stageStartedMs, state.activeMs);
  assert.ok(result.events.some((event) => event.type === "stage_changed"));
});

test("apply: wrap-up closes everything and marks the rest not reached", () => {
  const result = apply(ledger({ "req.scale": { status: "answered" }, "deep.codegen": { status: "open", band: "weak" } }), baseState({ stage: "deep_dive", focusItemId: "deep.codegen" }), { move: "wrap_up", focusItemId: null });
  assert.equal(item(result, "deep.codegen").status, "partial");
  assert.equal(item(result, "deep.cache").status, "not_reached");
  assert.equal(result.state.stage, "wrap_up");
  assert.equal(result.state.focusItemId, null);
});

test("apply: a hint raises the hint level and the round's hint count", () => {
  const result = apply(ledger({ "req.scale": { status: "open" } }), baseState(), { move: "hint", focusItemId: "req.scale" });
  assert.equal(item(result, "req.scale").hintLevel, 1);
  assert.equal(result.state.hintsUsed, 1);
});

const now = Date.parse("2026-10-18T10:00:00Z");
const ago = (ms) => new Date(now - ms).toISOString();
const tick = (overrides = {}) => decideTick({
  typing: false, pending: false, now, mode: "realistic", conventions, stage: "high_level", timeWarnings: [],
  clock: { roundElapsedMs: 10 * 60_000, roundBudgetMs: 40 * 60_000, stageElapsedMs: 60_000, stageBudgetMs: 12 * 60_000 },
  lastTurn: { role: "learner", kind: "message", at: ago(30_000) }, lastLearnerAt: ago(30_000), lastProactiveAt: null, lastNudgeAt: null,
  proactiveLeft: 5, focusExhausted: false, canvas: null, ...overrides,
});

test("ticks: busy or typing does nothing", () => {
  assert.equal(tick({ pending: true }).why, "busy");
  assert.equal(tick({ typing: true }).why, "typing");
});

test("ticks: each time threshold is announced once, then wrap-up at 100%", () => {
  const at = (minutes, warned = []) => tick({ clock: { roundElapsedMs: minutes * 60_000, roundBudgetMs: 40 * 60_000, stageElapsedMs: 0, stageBudgetMs: 1 }, timeWarnings: warned });
  assert.equal(at(33).move, "time_check");
  assert.equal(at(33, [0.8]).action, "none");
  assert.equal(at(41, [0.8]).move, "wrap_up");
});

test("ticks: an unexplained canvas change mapped to the agenda calls the model, unless cooling down", () => {
  assert.deepEqual(tick({ canvas: { unexplained: true, itemId: "deep.cache" } }), { action: "model", kind: "canvas", itemId: "deep.cache" });
  assert.equal(tick({ canvas: { unexplained: true, itemId: "deep.cache" }, lastProactiveAt: ago(30_000) }).action, "none");
  assert.equal(tick({ canvas: { unexplained: true, itemId: "deep.cache" }, lastTurn: { role: "interviewer", kind: "question", at: ago(60_000) } }).action, "none");
});

test("ticks: an overrun stage with an exhausted focus moves on through the model", () => {
  assert.deepEqual(tick({ focusExhausted: true, clock: { roundElapsedMs: 10 * 60_000, roundBudgetMs: 40 * 60_000, stageElapsedMs: 20 * 60_000, stageBudgetMs: 12 * 60_000 } }), { action: "model", kind: "stage" });
});

test("ticks: nudges for silence after a question, and for drawing without talking", () => {
  assert.equal(tick({ lastTurn: { role: "interviewer", kind: "question", at: ago(200_000) } }).move, "nudge");
  assert.equal(tick({ lastTurn: { role: "interviewer", kind: "question", at: ago(200_000) }, lastNudgeAt: ago(60_000) }).action, "none");
  assert.match(tick({ canvas: { changedSinceLearner: true }, lastLearnerAt: ago(300_000), lastTurn: { role: "learner", kind: "message", at: ago(300_000) } }).text, /drawn/);
});

test("clock: active time counts gaps only up to the cap", () => {
  assert.equal(accrueActiveMs({ activeMs: 1000, lastActivityAt: ago(60_000), now, capMs: 300_000 }), 61_000);
  assert.equal(accrueActiveMs({ activeMs: 1000, lastActivityAt: ago(3_600_000), now, capMs: 300_000 }), 301_000);
  assert.equal(accrueActiveMs({ activeMs: 1000, lastActivityAt: null, now, capMs: 300_000 }), 1000);
});
