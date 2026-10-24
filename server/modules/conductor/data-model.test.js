import assert from "node:assert/strict";
import test from "node:test";
import { diffSnapshots, snapshotOf } from "../ai/canvas.js";
import { describeDiagram } from "../ai/context.js";
import { DATA_MODEL_HOW_TO, isDataModelKind } from "../ai/data-model.js";
import { interviewerTask } from "../ai/tasks/interviewer.js";
import { needsDataModel as questionNeedsDataModel } from "../pks/index.js";
import { cleanColumns, columnsFromText, columnsToText } from "../../../src/workspace/columns.js";
import { renderPlan } from "./assemble.js";
import { canvasSignals, itemDrawn, needsDataModel } from "./canvas.js";
import { plan } from "./plan.js";
import { fakeConductorReply } from "./task.js";

// Data model tables on the canvas, and when the interviewer asks for one.

const meta = (id, stage, kinds, keywords, extra = {}) => ({ id, stage, dimension: "data", weight: 2, required: false, triggers: { componentKinds: kinds, keywords }, misconceptions: [], ...extra });
const agendaList = [
  meta("req.scope", "requirements", [], ["analysts", "freshness"], { required: true }),
  meta("hl.pipeline", "high_level", ["etl", "warehouse"], ["extract", "staging", "pipeline"], { required: true }),
  meta("hl.star", "high_level", ["fact-table", "dimension-table", "warehouse"], ["star schema", "fact table", "dimension"], { required: true }),
  meta("deep.grain", "deep_dive", ["fact-table", "warehouse"], ["grain", "order line", "shipping fee"], { required: true }),
  meta("deep.incremental", "deep_dive", ["etl", "orchestrator"], ["incremental", "rerun", "idempotent"], { required: true }),
  meta("deep.layout", "deep_dive", ["storage"], ["partition", "cluster", "prune"]),
  meta("deep.quality", "deep_dive", ["data-quality"], ["checks", "reconcile", "row count"]),
  meta("wrap.tradeoffs", "wrap_up", [], ["trade-off"], { required: true }),
];
const agenda = new Map(agendaList.map((item) => [item.id, item]));
const conventions = { maxFollowUpsPerItem: 2, maxChallengesPerMisconception: 1, hintsPerRound: 3, stageOverrunFactor: 1.5, wrapUpAt: 0.95, maxAssessmentsPerTurn: 4, minCanvasComponents: 3, minCanvasConnections: 2, drawCooldownTurns: 2, maxDrawRequestsPerItem: 2 };
const ledger = (overrides = {}) => agendaList.map((item, position) => ({
  itemId: item.id, position, stage: item.stage, dimension: item.dimension, weight: item.weight, required: item.required,
  status: "pending", band: null, followUps: 0, hintLevel: 0, challenges: 0, misconceptions: [], evidence: [], openedSeq: null, closedSeq: null, drawRequests: 0,
  ...overrides[item.id],
}));
const state = (overrides = {}) => ({ stage: "high_level", focusItemId: "hl.star", assumptions: [], activeMs: 12 * 60_000, stageStartedMs: 8 * 60_000, hintsUsed: 0, clarificationsAsked: [], ledgerVersion: 3, lastDrawAskSeq: null, componentsAtDrawAsk: null, ...overrides });
const node = (id, kind, label) => ({ id, type: "systemNode", position: { x: 0, y: 0 }, data: { kind, label } });
const table = (id, kind, label, columns = [], extra = {}) => ({ id, type: "tableNode", position: { x: 0, y: 0 }, data: { kind, label, columns, ...extra } });
const edge = (source, target, label) => ({ id: `${source}-${target}`, source, target, ...(label ? { label } : {}) });
const pipeline = [node("db", "replica", "Orders replica"), node("etl", "etl", "Nightly load"), node("wh", "warehouse", "Snowflake")];
const pipelineEdges = [edge("db", "etl"), edge("etl", "wh")];
const signals = (nodes, edges = pipelineEdges, texts = []) => canvasSignals({ agenda: agendaList, diagram: { nodes, edges }, learnerTexts: texts, seed: "round-1", learnerTurnsSinceAsk: 0 });
const planWith = (items, st, canvas) => plan({ items, state: st, conventions, agenda, curveballs: [], pacing: { requirements: 0.15, high_level: 0.3, deep_dive: 0.45, wrap_up: 0.1 }, minutes: 40, turn: { kind: "message", text: "" }, canvas });

const factColumns = [
  { name: "order_line_id", type: "bigint", keys: ["pk"] },
  { name: "customer_key", type: "bigint", keys: ["fk"], ref: "dim_customer.customer_key" },
  { name: "order_date", type: "date", keys: ["part"] },
  { name: "amount", type: "decimal(12,2)" },
];

test("data model kinds come from the canvas catalog", () => {
  for (const kind of ["table", "fact-table", "dimension-table", "collection", "event-schema"]) assert.equal(isDataModelKind(kind), true, kind);
  assert.equal(isDataModelKind("warehouse"), false);
  assert.equal(isDataModelKind("database"), false);
});

test("an item about the data model is drawn only by a table, not by a warehouse box", () => {
  const star = agenda.get("hl.star");
  assert.equal(needsDataModel(star), true);
  assert.equal(needsDataModel(agenda.get("hl.pipeline")), false);
  assert.equal(itemDrawn(star, [{ kind: "warehouse", text: "snowflake star schema", table: false }]), false, "a warehouse named for the schema is not a schema");
  assert.equal(itemDrawn(star, [{ kind: "fact-table", text: "fact_order_lines", table: true }]), true);
  assert.equal(itemDrawn(star, [{ kind: "table", text: "orders", table: true }]), true, "any table kind is a data model");
  const withTable = signals([...pipeline, table("t1", "fact-table", "fact_order_lines", factColumns)]);
  assert.equal(withTable.tables, 1);
  assert.equal(withTable.components, 4, "tables count as drawn parts of the design");
  assert.ok(withTable.drawn.has("hl.star") && withTable.drawn.has("deep.grain"));
  assert.ok(withTable.dataModelItems.has("deep.grain") && !withTable.dataModelItems.has("deep.layout"));
});

test("a table's columns are evidence for the items they name", () => {
  const canvas = signals([...pipeline, table("t1", "fact-table", "fact_orders", [{ name: "shipping_fee", type: "decimal" }, { name: "grain_check", type: "int" }])]);
  assert.ok((canvas.emphasis.get("deep.grain") ?? 0) > 0, "a shipping_fee column points at the grain item");
});

test("the plan asks for the data model only for a data model item with no table drawn", () => {
  const items = ledger({ "req.scope": { status: "answered" }, "hl.pipeline": { status: "answered" }, "hl.star": { status: "open" } });
  const noTable = planWith(items, state(), signals(pipeline));
  assert.ok(noTable.allowedMoves.includes("ask_to_draw"));
  assert.equal(noTable.dataModelItemId, "hl.star");
  const lines = renderPlan({ plan: noTable, trigger: "reply", items, selected: null, changes: "", rejection: "" });
  assert.match(lines, /hl\.star is about the data model/);
  assert.ok(lines.includes(DATA_MODEL_HOW_TO), "the plan carries the how-to wording");

  const drawn = planWith(items, state(), signals([...pipeline, table("t1", "fact-table", "fact_order_lines", factColumns)]));
  assert.equal(drawn.dataModelItemId, null, "once a table is on the canvas nobody asks again");
  assert.match(renderPlan({ plan: drawn, trigger: "reply", items, selected: null, changes: "", rejection: "" }), /1 of them data model tables/);

  // On the pipeline item, the schema item is next: if the interviewer asks for tables now, it says how.
  const onPipeline = planWith(ledger({ "req.scope": { status: "answered" }, "hl.pipeline": { status: "open" } }), state({ focusItemId: "hl.pipeline" }), signals([node("wh", "warehouse", "Snowflake")], []));
  assert.equal(onPipeline.dataModelItemId, "hl.star", "the upcoming schema item carries the how-to");

  // A question with no data model items never mentions one.
  const backend = agendaList.map((item) => ({ ...item, triggers: { ...item.triggers, componentKinds: item.triggers.componentKinds.filter((kind) => !isDataModelKind(kind)) } }));
  const backendCanvas = canvasSignals({ agenda: backend, diagram: { nodes: pipeline, edges: pipelineEdges }, learnerTexts: [], seed: "round-1", learnerTurnsSinceAsk: 0 });
  const backendPlan = plan({ items, state: state(), conventions, agenda: new Map(backend.map((item) => [item.id, item])), curveballs: [], pacing: { requirements: 0.15, high_level: 0.3, deep_dive: 0.45, wrap_up: 0.1 }, minutes: 40, turn: { kind: "message", text: "" }, canvas: backendCanvas });
  assert.equal(backendPlan.dataModelItemId, null);
  assert.doesNotMatch(renderPlan({ plan: backendPlan, trigger: "reply", items, selected: null, changes: "", rejection: "" }), /data model/);
});

test("a deep dive about the data model waits for a table, then stops insisting", () => {
  const answeredHighLevel = { "req.scope": { status: "answered" }, "hl.pipeline": { status: "answered" }, "hl.star": { status: "answered" } };
  const st = state({ stage: "deep_dive", focusItemId: "deep.grain", stageStartedMs: 11 * 60_000 });
  const waiting = planWith(ledger({ ...answeredHighLevel, "deep.incremental": { status: "answered" }, "deep.layout": { status: "answered" }, "deep.quality": { status: "answered" } }), st, signals(pipeline));
  assert.equal(waiting.focusItemId, "deep.grain");
  assert.deepEqual(waiting.allowedMoves.slice(0, 1), ["ask_to_draw"]);
  assert.equal(waiting.drawTarget, "deep.grain");
  assert.equal(waiting.dataModelItemId, "deep.grain");
  const reply = fakeConductorReply({ plan: waiting });
  assert.equal(reply.move, "ask_to_draw");
  assert.ok(reply.message.includes("Data model"), "the sample reply tells the candidate where to find it");

  const ignoredTwice = planWith(ledger({ ...answeredHighLevel, "deep.grain": { drawRequests: 2 }, "deep.incremental": { status: "answered" }, "deep.layout": { status: "answered" }, "deep.quality": { status: "answered" } }), st, signals(pipeline));
  assert.equal(ignoredTwice.dataModelItemId, null, "after the cap the deep dive opens without a table");
  assert.ok(ignoredTwice.allowedMoves.includes("open"));
});

test("the design text lists tables with their columns and keys, apart from the components", () => {
  const diagram = {
    nodes: [...pipeline, table("t1", "fact-table", "fact_order_lines", factColumns, { subtitle: "one row per order line", note: "Line grain so units add up" }), table("t2", "dimension-table", "dim_customer", [{ name: "customer_key", type: "bigint", keys: ["pk"] }])],
    edges: [...pipelineEdges, edge("t2", "t1", "1:N")],
  };
  const design = describeDiagram(diagram);
  assert.equal(design.componentCount, 3, "tables are not services");
  assert.equal(design.tableCount, 2);
  assert.equal(design.columnCount, 5);
  assert.ok(design.componentIds.has("t1"), "the model may point at a table");
  assert.match(design.text, /Data model \(2 tables\):/);
  assert.match(design.text, /fact-table "fact_order_lines" \(grain: one row per order line\)/);
  assert.match(design.text, /order_line_id bigint \[PK\]; customer_key bigint \[FK\] -> dim_customer\.customer_key; order_date date \[partition key\]; amount decimal\(12,2\)/);
  assert.match(design.text, /why: "Line grain so units add up"/);
  assert.match(design.text, /- t2 -> t1 "1:N"/);
  assert.equal(design.isolatedCount, 0);
});

test("adding a table is a canvas change the interviewer sees, with its column count", () => {
  const before = snapshotOf({ nodes: pipeline, edges: pipelineEdges });
  const diagram = { nodes: [...pipeline, table("t1", "table", "orders", factColumns.slice(0, 2))], edges: pipelineEdges };
  const { added } = diffSnapshots(before, snapshotOf(diagram), diagram);
  assert.deepEqual(added, [{ id: "t1", kind: "table", label: "orders", hasNote: false, columns: 2 }]);
});

test("columns typed as text become structured columns and back", () => {
  const typed = columnsFromText("order_id bigint pk\ncustomer_id bigint fk -> customers.id\norder_date: date partition\namount decimal(12,2)\nregion string sort key,\n\nsku varchar(32) references products.sku");
  assert.deepEqual(typed.map(({ id: _id, ...column }) => column), [
    { name: "order_id", type: "bigint", keys: ["pk"], ref: "" },
    { name: "customer_id", type: "bigint", keys: ["fk"], ref: "customers.id" },
    { name: "order_date", type: "date", keys: ["part"], ref: "" },
    { name: "amount", type: "decimal(12,2)", keys: [], ref: "" },
    { name: "region", type: "string", keys: ["sort"], ref: "" },
    { name: "sku", type: "varchar(32)", keys: ["fk"], ref: "products.sku" },
  ]);
  const saved = cleanColumns([...typed, { name: "  ", type: "int" }, { name: "x", keys: ["pk", "bogus", "pk"], ref: "ignored without fk" }]);
  assert.equal(saved.length, 7, "unnamed columns are dropped");
  assert.deepEqual(saved.at(-1), { name: "x", type: undefined, keys: ["pk"], ref: undefined });
  assert.equal(columnsToText(saved.slice(0, 2)), "order_id bigint pk\ncustomer_id bigint fk -> customers.id");
});

test("questions whose pack has a data model item are the ones that need one", () => {
  for (const id of ["ecommerce-warehouse", "scd2-warehouse", "lakehouse-platform", "feature-store"]) assert.equal(questionNeedsDataModel(id), true, id);
  for (const id of ["url-shortener", "rate-limiter", "log-analytics", "iot-telemetry", "chat-system", "cdc-pipeline"]) assert.equal(questionNeedsDataModel(id), false, id);
});

test("the v2 interviewer is told whether the question needs a data model", () => {
  const base = {
    prompt: { title: "Design a data warehouse for an online store", difficulty: "Beginner", description: "Model orders.", requirements: ["Load orders daily."] },
    guide: null,
    design: describeDiagram({ nodes: pipeline, edges: pipelineEdges }),
    state: { stage: "high_level", covered: [], summary: "" },
    turns: [],
    trigger: "reply",
    selected: null,
    changes: "",
    hints: { used: 0, limit: 3 },
  };
  assert.match(interviewerTask.buildUser({ ...base, dataModel: { needed: true } }), /data model is part of a good answer\. Data model tables on the canvas: 0\./);
  assert.match(interviewerTask.buildUser(base), /doesn't need a data model/);
  assert.ok(interviewerTask.system.includes(DATA_MODEL_HOW_TO));
});
