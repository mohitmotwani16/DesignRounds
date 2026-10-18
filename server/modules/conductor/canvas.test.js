import assert from "node:assert/strict";
import test from "node:test";
import { applyTurn } from "./apply.js";
import { canvasSignals, emphasisScores, itemDrawn, needsDrawing, seededJitter } from "./canvas.js";
import { nextPendingItem, plan } from "./plan.js";

const meta = (id, stage, kinds, keywords, extra = {}) => ({ id, stage, dimension: "data", weight: 2, required: false, triggers: { componentKinds: kinds, keywords }, misconceptions: [], ...extra });
const agendaList = [
  meta("req.scale", "requirements", [], ["qps", "traffic"], { required: true }),
  meta("hl.flow", "high_level", ["api-gateway", "load-balancer"], ["gateway", "load balancer", "flow"], { required: true }),
  meta("deep.cache", "deep_dive", ["cache"], ["cache", "redis", "eviction"], { required: true }),
  meta("deep.storage", "deep_dive", ["database", "kv-store"], ["database", "schema", "partition"]),
  meta("deep.capacity", "deep_dive", ["database"], ["qps", "storage per day", "peak", "back of the envelope"]),
  meta("deep.queue", "deep_dive", ["queue"], ["queue", "kafka", "async"]),
  meta("deep.redirects", "deep_dive", [], ["301", "302"]),
  meta("wrap.risks", "wrap_up", [], ["bottleneck"], { required: true }),
];
const agenda = new Map(agendaList.map((item) => [item.id, item]));
const node = (id, kind, label, note = "") => ({ id, type: "systemNode", position: { x: 0, y: 0 }, data: { kind, label, note } });
const edge = (source, target) => ({ id: `${source}-${target}`, source, target });
const conventions = { maxFollowUpsPerItem: 2, maxChallengesPerMisconception: 1, hintsPerRound: 3, stageOverrunFactor: 1.5, wrapUpAt: 0.95, maxAssessmentsPerTurn: 4, minCanvasComponents: 3, minCanvasConnections: 2, drawCooldownTurns: 2, maxDrawRequestsPerItem: 3 };
const ledger = (overrides = {}) => agendaList.map((item, position) => ({
  itemId: item.id, position, stage: item.stage, dimension: item.dimension, weight: item.weight, required: item.required,
  status: "pending", band: null, followUps: 0, hintLevel: 0, challenges: 0, misconceptions: [], evidence: [], openedSeq: null, closedSeq: null, drawRequests: 0,
  ...overrides[item.id],
}));
const state = (overrides = {}) => ({ stage: "high_level", focusItemId: "hl.flow", assumptions: [], activeMs: 10 * 60_000, stageStartedMs: 5 * 60_000, hintsUsed: 0, clarificationsAsked: [], ledgerVersion: 3, lastDrawAskSeq: null, componentsAtDrawAsk: null, ...overrides });
const signals = ({ nodes = [], edges = [], texts = [], seed = "round-1", since = 0 } = {}) => canvasSignals({ agenda: agendaList, diagram: { nodes, edges }, learnerTexts: texts, seed, learnerTurnsSinceAsk: since });
const planWith = (items, st, canvas, extra = {}) => plan({ items, state: st, conventions, agenda, curveballs: [], pacing: { requirements: 0.15, high_level: 0.3, deep_dive: 0.4, wrap_up: 0.15 }, minutes: 45, turn: { kind: "message", text: "" }, canvas, ...extra });
const fullCanvas = [node("g", "api-gateway", "Gateway"), node("c", "cache", "Redis cache"), node("d", "database", "Links DB")];
const fullEdges = [edge("g", "c"), edge("c", "d")];

test("an item is drawn by a specific kind, or by a generic one only when its label names it", () => {
  const cacheItem = agenda.get("deep.cache");
  assert.equal(itemDrawn(cacheItem, [{ kind: "cache", text: "hot links" }]), true);
  assert.equal(itemDrawn(cacheItem, [{ kind: "service", text: "user service" }]), false, "a generic service isn't a cache");
  assert.equal(itemDrawn(cacheItem, [{ kind: "service", text: "redis wrapper" }]), false, "generic kinds never count by keyword alone");
  assert.equal(itemDrawn(cacheItem, [{ kind: "kv-store", text: "redis for hot links" }]), true, "a specific component named for the part counts");
  assert.equal(needsDrawing(agenda.get("deep.redirects")), false, "a decision with no component needs no drawing");
  assert.equal(needsDrawing(agenda.get("req.scale")), false);
});

test("emphasis follows what the candidate said, drew and noted", () => {
  const scores = emphasisScores(agendaList, ["We'd see about 4k qps at peak, so storage per day is around 50 GB"], []);
  assert.ok(scores.get("deep.capacity") > scores.get("deep.queue"));
  const drawn = emphasisScores(agendaList, [], [{ kind: "queue", text: "kafka for clicks" }]);
  assert.ok(drawn.get("deep.queue") > 0);
});

test("the deep dive follows the candidate's focus", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "answered" } });
  const capacityTalk = signals({ nodes: fullCanvas, edges: fullEdges, texts: ["peak qps is 10k, storage per day 40 GB, back of the envelope says 15 TB a year"] });
  assert.equal(nextPendingItem(items, "deep_dive", null, capacityTalk).itemId, "deep.capacity");
  const queueWork = signals({ nodes: [...fullCanvas, node("q", "queue", "Kafka clicks")], edges: fullEdges, texts: ["the async kafka queue for click events is where it gets hard", "the queue consumers can lag"] });
  assert.equal(nextPendingItem(items, "deep_dive", null, queueWork).itemId, "deep.queue");
});

test("without a strong signal, rounds differ but each round is stable", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "answered" } });
  const firsts = new Set();
  for (let round = 0; round < 40; round += 1) {
    const canvas = signals({ nodes: fullCanvas, edges: fullEdges, seed: `round-${round}` });
    const first = nextPendingItem(items, "deep_dive", null, canvas).itemId;
    assert.equal(nextPendingItem(items, "deep_dive", null, signals({ nodes: fullCanvas, edges: fullEdges, seed: `round-${round}` })).itemId, first, "same round, same choice");
    firsts.add(first);
  }
  assert.ok(firsts.size >= 2, `deep dives should vary across rounds, got ${[...firsts]}`);
  assert.ok(seededJitter("a", "x") >= 0 && seededJitter("a", "x") < 1);
});

test("a deep dive whose part isn't drawn waits: the interviewer asks for the drawing", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "open", band: "adequate" } });
  const canvas = signals({ nodes: [node("g", "api-gateway", "Gateway"), node("s", "service", "App"), node("d", "database", "Links DB")], edges: fullEdges, texts: ["the cache is where it gets interesting, redis with lru eviction"] });
  const result = planWith(items, state(), canvas);
  assert.equal(result.nextItemId, "deep.cache");
  assert.equal(result.drawTarget, "deep.cache");
  assert.ok(result.allowedMoves.includes("ask_to_draw"));
  assert.ok(!result.allowedMoves.includes("acknowledge_advance") && !result.allowedMoves.includes("move_on"), "no opening an undrawn deep dive");
  assert.deepEqual(result.canvas.undrawn, ["deep.cache", "deep.queue"]);

  // Once it's drawn, the deep dive can open.
  const asked = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "answered" }, "deep.cache": { drawRequests: 1 } });
  const waiting = planWith(asked, state({ stage: "deep_dive", focusItemId: "deep.cache" }), canvas);
  assert.equal(waiting.focusItemId, "deep.cache");
  assert.deepEqual(waiting.allowedMoves, ["ask_to_draw", "clarify", "explain", "redirect"]);
  const drawn = planWith(asked, state({ stage: "deep_dive", focusItemId: "deep.cache" }), signals({ nodes: fullCanvas, edges: fullEdges }));
  assert.deepEqual(drawn.allowedMoves, ["open", "clarify", "explain", "redirect"]);
});

test("after repeated ignored requests the interviewer stops insisting", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "answered" }, "deep.cache": { drawRequests: 3 } });
  const result = planWith(items, state({ stage: "deep_dive", focusItemId: "deep.cache" }), signals({ nodes: [node("g", "api-gateway", "G"), node("d", "database", "D"), node("s", "service", "S")], edges: fullEdges }));
  assert.ok(result.allowedMoves.includes("open"));
});

test("talking without drawing: asked to draw every couple of turns, never twice in a row", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "open" } });
  const empty = (since, extra = {}) => planWith(items, state(extra), signals({ since }));
  assert.deepEqual(empty(2).allowedMoves, ["ask_to_draw", "clarify", "explain"]);
  assert.ok(!empty(1, { lastDrawAskSeq: 9, componentsAtDrawAsk: 0 }).allowedMoves.every((move) => ["ask_to_draw", "clarify", "explain"].includes(move)), "just asked: let them answer");
  assert.ok(empty(1).allowedMoves.includes("probe"));
  // Requirements talk doesn't need a drawing yet.
  assert.ok(planWith(ledger({ "req.scale": { status: "open" } }), state({ stage: "requirements", focusItemId: "req.scale" }), signals({ since: 5 })).allowedMoves.includes("probe"));
  // Progress since the last ask earns twice the wait.
  const progressed = planWith(items, state({ lastDrawAskSeq: 5, componentsAtDrawAsk: 0 }), signals({ nodes: [node("g", "api-gateway", "G")], since: 2 }));
  assert.ok(progressed.allowedMoves.includes("probe"));
});

test("no wrap-up on a canvas too thin to review", () => {
  const closed = Object.fromEntries(agendaList.map((item) => [item.id, { status: item.id === "wrap.risks" ? "open" : "answered" }]));
  const thin = planWith(ledger(closed), state({ stage: "wrap_up", focusItemId: "wrap.risks" }), signals({ nodes: [node("g", "api-gateway", "G")], since: 0 }));
  assert.ok(!thin.allowedMoves.includes("wrap_up"));
  assert.ok(thin.allowedMoves.includes("ask_to_draw"));
  const ready = planWith(ledger(closed), state({ stage: "wrap_up", focusItemId: "wrap.risks" }), signals({ nodes: fullCanvas, edges: fullEdges }));
  assert.ok(ready.allowedMoves.includes("wrap_up"));
});

test("asking to draw the next deep dive closes the current item and focuses the drawing", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "open", band: "adequate" } });
  const p = { focusItemId: "hl.flow", nextItemId: "deep.cache", drawTarget: "deep.cache", allowedMoves: ["ask_to_draw"], canvas: { components: 2, connections: 1 } };
  const result = applyTurn({ items, state: state(), plan: p, verified: { move: "ask_to_draw", focusItemId: "deep.cache", assessments: [], clarificationIds: [], newAssumption: "" }, turn: { learnerSeq: 10, interviewerSeq: 11 } });
  const byId = new Map(result.items.map((item) => [item.itemId, item]));
  assert.equal(byId.get("hl.flow").status, "answered");
  assert.equal(byId.get("deep.cache").status, "pending", "the deep dive hasn't started");
  assert.equal(byId.get("deep.cache").drawRequests, 1);
  assert.equal(result.state.focusItemId, "deep.cache");
  assert.equal(result.state.stage, "deep_dive");
  assert.equal(result.state.lastDrawAskSeq, 11);
  assert.equal(result.state.componentsAtDrawAsk, 2);
});

test("asking to draw in place keeps the focus and opens nothing", () => {
  const items = ledger({ "req.scale": { status: "answered" }, "hl.flow": { status: "open" } });
  const p = { focusItemId: "hl.flow", nextItemId: "deep.cache", drawTarget: null, allowedMoves: ["ask_to_draw"], canvas: { components: 0, connections: 0 } };
  const result = applyTurn({ items, state: state(), plan: p, verified: { move: "ask_to_draw", focusItemId: "hl.flow", assessments: [], clarificationIds: [], newAssumption: "" }, turn: { learnerSeq: 10, interviewerSeq: 11 } });
  const byId = new Map(result.items.map((item) => [item.itemId, item]));
  assert.equal(byId.get("hl.flow").status, "open");
  assert.equal(byId.get("hl.flow").drawRequests, 1);
  assert.equal(result.state.focusItemId, "hl.flow");
  assert.equal(result.state.stage, "high_level");
});
