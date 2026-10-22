import assert from "node:assert/strict";
import test from "node:test";
import { describeDiagram } from "./context.js";
import { overallScore } from "./rubric.js";
import { constrainScores, hasStorage } from "./scoring.js";
import { reviewTask } from "./tasks/review.js";

function diagram(nodes, edges) {
  return describeDiagram({
    nodes: nodes.map(([id, kind, label, note], index) => ({ id, type: "systemNode", position: { x: index * 300, y: 0 }, data: { kind, label, ...(note ? { note } : {}) } })),
    edges: edges.map(([source, target, label], index) => ({ id: `e${index}`, source, target, ...(label ? { label } : {}) })),
  });
}

const solid = diagram(
  [
    ["client", "client", "Clients"],
    ["lb", "load-balancer", "Load balancer"],
    ["api", "service", "API", "Stateless so it scales out behind the LB."],
    ["cache", "redis", "Redis cache", "Reads dominate, so hot keys are cached."],
    ["db", "postgres", "Main DB", "Relational, keyed by id."],
    ["queue", "kafka", "Events", "Async fan-out so writes stay fast."],
  ],
  [["client", "lb"], ["lb", "api", "HTTPS"], ["api", "cache"], ["api", "db"], ["api", "queue", "publish"]],
);

const scores = (value) => ({ requirements: value, architecture: value, data: value, scalability: value, reliability: value, tradeoffs: value });
const decision = (explanation, extra = {}) => ({ explanation, necessity: "essential", sizing: "right-sized", ...extra });
const justified = [decision("well-justified"), decision("well-justified"), decision("partly-justified")];

test("a well-evidenced design keeps the model's scores", () => {
  const result = constrainScores(scores(8), { design: solid, decisions: justified, risks: [] });
  assert.deepEqual(result.scores, scores(8));
  assert.deepEqual(result.adjustments, []);
});

test("thin designs can't reach the top bands", () => {
  const three = diagram([["a", "client", "App"], ["b", "service", "API"], ["c", "postgres", "DB"]], [["a", "b"], ["b", "c"]]);
  const four = diagram([["a", "client", "App"], ["b", "service", "API"], ["c", "postgres", "DB"], ["d", "redis", "Cache"]], [["a", "b"], ["b", "c"], ["b", "d"]]);
  assert.equal(constrainScores(scores(9), { design: three, decisions: justified }).scores.architecture, 5);
  assert.equal(constrainScores(scores(9), { design: four, decisions: justified }).scores.architecture, 7);
  const adjustment = constrainScores(scores(9), { design: three, decisions: justified }).adjustments[0];
  assert.equal(adjustment.rule, "thin-design");
  assert.match(adjustment.reason, /3 components/);
});

test("disconnected components cap architecture", () => {
  const loose = diagram(
    [["a", "client", "App"], ["b", "service", "API"], ["c", "postgres", "DB"], ["d", "redis", "Cache"], ["e", "kafka", "Queue"], ["f", "cdn", "CDN"]],
    [["a", "b"], ["b", "c"]],
  );
  assert.equal(loose.isolatedCount, 3);
  const result = constrainScores(scores(8), { design: loose, decisions: justified });
  assert.equal(result.scores.architecture, 5);
  assert.equal(result.scores.data, 8);
});

test("components inside a connected zone are not isolated", () => {
  const zoned = describeDiagram({
    nodes: [
      { id: "zone", type: "groupNode", position: { x: 0, y: 0 }, width: 600, height: 300, data: { label: "Backend" } },
      { id: "a", type: "systemNode", position: { x: 10, y: 10 }, data: { kind: "service", label: "API" } },
      { id: "b", type: "systemNode", position: { x: 200, y: 10 }, data: { kind: "postgres", label: "DB" } },
      { id: "c", type: "systemNode", position: { x: 900, y: 10 }, data: { kind: "client", label: "App" } },
    ],
    edges: [{ id: "e0", source: "c", target: "zone" }],
  });
  assert.equal(zoned.isolatedCount, 0);
});

test("no data store caps the data dimension, recognising stores by kind or label", () => {
  assert.equal(hasStorage([{ kind: "service", label: "User DB" }]), true);
  assert.equal(hasStorage([{ kind: "document-db", label: "Profiles" }]), true);
  assert.equal(hasStorage([{ kind: "mobile", label: "App with IndexedDB" }]), true);
  assert.equal(hasStorage([{ kind: "t-consul", label: "Consul" }]), true);
  assert.equal(hasStorage([{ kind: "service", label: "Notifier" }, { kind: "client", label: "Web app" }]), false);
  const stateless = diagram(
    [["a", "client", "App"], ["b", "load-balancer", "LB"], ["c", "service", "API"], ["d", "service", "Worker"], ["e", "kafka", "Queue"]],
    [["a", "b"], ["b", "c"], ["c", "e"], ["e", "d"]],
  );
  const result = constrainScores(scores(8), { design: stateless, decisions: justified });
  assert.equal(result.scores.data, 4);
  assert.equal(result.adjustments.find((entry) => entry.dimension === "data").rule, "no-storage");
});

test("no stated reasoning anywhere caps trade-offs unless the learner explained out loud", () => {
  const silent = diagram(
    [["a", "client", "App"], ["b", "load-balancer", "LB"], ["c", "service", "API"], ["d", "redis", "Cache"], ["e", "postgres", "DB"]],
    [["a", "b"], ["b", "c"], ["c", "d"], ["c", "e"]],
  );
  assert.equal(constrainScores(scores(7), { design: silent, decisions: [] }).scores.tradeoffs, 3);
  assert.equal(constrainScores(scores(7), { design: silent, decisions: [], spoke: true }).scores.tradeoffs, 7);
});

test("trade-offs follow the review's own decision ratings", () => {
  const unexplained = [decision("unexplained"), decision("unexplained"), decision("partly-justified"), decision("incorrect")];
  const capped = constrainScores(scores(8), { design: solid, decisions: unexplained });
  // justification = 0.5 / 4 = 0.125 -> cap round(3 + 0.875) = 4
  assert.equal(capped.scores.tradeoffs, 4);
  assert.match(capped.adjustments[0].reason, /0 of 4 key decisions were well justified and 1 partly/);
  const allWell = [decision("well-justified"), decision("well-justified"), decision("well-justified")];
  const raised = constrainScores(scores(3), { design: solid, decisions: allWell });
  assert.equal(raised.scores.tradeoffs, 6);
  assert.equal(raised.adjustments.find((entry) => entry.dimension === "tradeoffs").to, 6);
});

test("a mostly over-engineered design caps architecture; an under-built one caps scalability", () => {
  const heavy = [decision("well-justified", { sizing: "over-engineered" }), decision("well-justified", { necessity: "unnecessary" }), decision("well-justified")];
  assert.equal(constrainScores(scores(9), { design: solid, decisions: heavy }).scores.architecture, 6);
  const light = [decision("well-justified", { sizing: "under-engineered" }), decision("well-justified", { sizing: "under-engineered" }), decision("well-justified")];
  assert.equal(constrainScores(scores(9), { design: solid, decisions: light }).scores.scalability, 6);
});

test("high-severity gaps rule out the top bands of their dimension", () => {
  const one = [{ severity: "high", dimension: "reliability" }, { severity: "medium", dimension: "data" }];
  const result = constrainScores(scores(9), { design: solid, decisions: justified, risks: one });
  assert.equal(result.scores.reliability, 7);
  assert.equal(result.scores.data, 8);
  const two = [{ severity: "high", dimension: "data" }, { severity: "high", dimension: "data" }];
  assert.equal(constrainScores(scores(9), { design: solid, decisions: justified, risks: two }).scores.data, 5);
});

test("on interviewer rounds scores stay within a band of the notepad, ignoring unreached items", () => {
  const ledgerItems = [
    { dimension: "data", weight: 2, status: "missed", band: null },
    { dimension: "data", weight: 1, status: "partial", band: "weak" },
    { dimension: "scalability", weight: 1, status: "answered", band: "strong" },
    { dimension: "reliability", weight: 1, status: "not_reached", band: null },
  ];
  const result = constrainScores({ ...scores(9), scalability: 2 }, { design: solid, decisions: justified, ledgerItems });
  // data implied = (1*2 + 4*1) / 3 = 2 -> cap 3; scalability implied 9 -> floor 6; reliability untouched
  assert.equal(result.scores.data, 3);
  assert.equal(result.scores.scalability, 6);
  assert.equal(result.scores.reliability, 9);
  assert.match(result.adjustments.find((entry) => entry.dimension === "data").reason, /answered 0 of the 2 questions/);
});

test("any gap keeps its area off the top of the scale", () => {
  const risks = [{ severity: "medium", dimension: "data" }, { severity: "low", dimension: "scalability" }];
  const result = constrainScores(scores(10), { design: solid, decisions: justified, risks });
  assert.equal(result.scores.data, 8);
  assert.equal(result.scores.scalability, 9);
  // A medium gap means the round isn't exceptional, so nothing reaches 10.
  assert.equal(result.scores.requirements, 9);
  assert.equal(result.adjustments.find((entry) => entry.dimension === "requirements").rule, "top-band");
});

test("10 stays possible in an exceptional round with only minor gaps", () => {
  const risks = [{ severity: "low", dimension: "data" }, { severity: "low", dimension: "data" }];
  const ledgerItems = [{ dimension: "scalability", weight: 1, status: "answered", band: "strong" }];
  const result = constrainScores(scores(10), { design: solid, decisions: justified, risks, ledgerItems });
  assert.equal(result.scores.requirements, 10);
  assert.equal(result.scores.scalability, 10);
  assert.equal(result.scores.data, 9);
});

test("an item the candidate needed help with caps its area a band above adequate and rules out 10s", () => {
  const ledgerItems = [{ dimension: "reliability", weight: 1, status: "answered", band: "adequate", helped: true }];
  const result = constrainScores(scores(10), { design: solid, decisions: justified, ledgerItems });
  assert.equal(result.scores.reliability, 8);
  assert.equal(result.scores.requirements, 9);
  assert.match(result.adjustments.find((entry) => entry.dimension === "reliability").reason, /1 of them only after help/);
});

test("decisions reached only after a correction count as partly justified", () => {
  const corrected = justified.map((entry) => ({ ...entry, reached: "corrected" }));
  const result = constrainScores(scores(10), { design: solid, decisions: corrected });
  // every decision counts 0.5 -> cap 3 + 7 * 0.5 = 6.5, rounded to 7
  assert.equal(result.scores.tradeoffs, 7);
});

test("caps win over floors", () => {
  const stateless = diagram(
    [["a", "client", "App"], ["b", "load-balancer", "LB"], ["c", "service", "API"], ["d", "service", "Worker"], ["e", "kafka", "Queue"]],
    [["a", "b"], ["b", "c"], ["c", "e"], ["e", "d"]],
  );
  const ledgerItems = [{ dimension: "data", weight: 1, status: "answered", band: "strong" }];
  const result = constrainScores(scores(2), { design: stateless, decisions: justified, ledgerItems });
  assert.equal(result.scores.data, 4);
});

test("the review is normalised with constrained scores and an audit trail", async () => {
  const { normalize } = await import("../reviews.js");
  const data = reviewTask.fake({ design: solid });
  data.dimensions = data.dimensions.map((dimension) => ({ ...dimension, score: 9 }));
  data.risks = [{ point: "No replication", whyItMatters: "Data loss", severity: "high", dimension: "reliability", nodeIds: ["[db]", "ghost"] }];
  data.decisions = justified.map((entry, index) => ({ ...entry, choice: `Choice ${index}`, nodeIds: [], assessment: "", alternatives: "", probe: "" }));
  const review = normalize(data, solid);
  const reliability = review.dimensions.find((dimension) => dimension.id === "reliability");
  assert.equal(reliability.score, 7);
  assert.equal(reliability.adjustment.from, 9);
  assert.equal(reliability.adjustment.rule, "high-severity-gaps");
  assert.ok(reliability.description, "each dimension carries its learner-facing description");
  assert.equal(review.overall.score, overallScore({ ...scores(9), reliability: 7 }));
  assert.equal(review.scoring.modelScore, 90);
  assert.equal(review.scoring.adjustments.length, 1);
  assert.deepEqual(review.risks[0].nodeIds, ["db"]);
});

test("communication strengths never quote an answer the interviewer judged weak or mistaken", async () => {
  const { withoutUnsoundExamples } = await import("./tasks/communication.js");
  const answers = [
    { content: "If Redis goes down, we should fail closed and reject all incoming requests.", unsound: true },
    { content: "A single global Redis would add 100+ ms cross-continent, which breaks our budget.", unsound: false },
  ];
  const data = { strengths: [
    { point: "Decisive", example: "If Redis goes down... we should fail closed and reject all" },
    { point: "Ties choices to numbers", example: "A single global Redis would add 100+ ms cross-continent" },
    { point: "General", example: "" },
  ] };
  assert.deepEqual(withoutUnsoundExamples(data, answers).strengths.map((entry) => entry.point), ["Ties choices to numbers", "General"]);
});
