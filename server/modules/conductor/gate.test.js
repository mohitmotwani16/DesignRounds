import assert from "node:assert/strict";
import test from "node:test";

process.env.AI_PROVIDER = "fake";
const { buildParams } = await import("../ai/anthropic-vertex.js");
const { plainMessages } = await import("../ai/providers.js");
const { leadingFields, messagesFromBlocks, runTaskStream } = await import("../ai/run.js");
const { conductorOutput, fakeConductorReply } = await import("./task.js");

const block = (id, stability, role = "context") => ({ id, role, text: `<${id}/>`, stability, version: "v", tokens: 2 });
const blocks = [
  block("conductor.plan", "turn"),
  block("ucs.candidate", "session"),
  block("pks.brief", "problem"),
  block("ucs.core", "global", "system"),
  block("pks.agenda", "problem"),
  block("ucs.mode.realistic", "global", "system"),
  block("conductor.assumptions", "session"),
  block("conductor.ledger", "turn"),
];

test("blocks are ordered global, problem, session, turn, keeping order within a layer", () => {
  const [system, user] = messagesFromBlocks(blocks);
  assert.deepEqual(system.content.map((part) => part.text), ["<ucs.core/>", "<ucs.mode.realistic/>"]);
  assert.deepEqual(user.content.map((part) => part.text), ["<pks.brief/>", "<pks.agenda/>", "<ucs.candidate/>", "<conductor.assumptions/>", "<conductor.plan/>", "<conductor.ledger/>"]);
  // The last block of each stable layer is a cache boundary; turn blocks never are.
  assert.deepEqual(system.content.map((part) => part.cache), [false, true]);
  assert.deepEqual(user.content.map((part) => part.cache), [false, true, false, true, false, false]);
});

test("Claude gets a breakpoint at each stable layer; OpenAI-style APIs get the same text joined", () => {
  const messages = messagesFromBlocks(blocks);
  const params = buildParams({ model: "claude-haiku-5-5", messages, jsonSchema: { name: "x", schema: { type: "object", properties: {}, required: [], additionalProperties: false } }, effort: "low", maxTokens: 100 });
  const marked = [...params.system, ...params.messages[0].content].filter((entry) => entry.cache_control).map((entry) => entry.text);
  assert.deepEqual(marked, ["<ucs.mode.realistic/>", "<pks.agenda/>", "<conductor.assumptions/>"]);
  const plain = plainMessages(messages);
  assert.equal(plain[0].content, "<ucs.core/>\n\n<ucs.mode.realistic/>");
  assert.ok(plain[1].content.startsWith("<pks.brief/>\n\n<pks.agenda/>"));
});

test("leading fields are read from partial JSON before the message", () => {
  assert.deepEqual(leadingFields('{"move":"probe","focusItemId":"deep.codegen","message":"How'), { move: "probe", focusItemId: "deep.codegen" });
  assert.deepEqual(leadingFields('{"move":"pro'), { move: null, focusItemId: null });
});

const plan = { allowedMoves: ["probe", "move_on"], focusItemId: "a", nextItemId: "b", curveball: null };
const task = (reply) => ({ name: "interviewer", blocks: () => blocks, output: conductorOutput, fake: () => reply });

test("the gate lets an allowed move stream", async () => {
  const pieces = [];
  const reply = fakeConductorReply({ plan, learnerText: "we shard by user id across ten nodes", trigger: "reply", openers: {} });
  const { data } = await runTaskStream(task(reply), {}, { meter: false, onDelta: (text) => pieces.push(text), gate: (raw) => (plan.allowedMoves.includes(leadingFields(raw).move) ? null : "no") });
  assert.equal(data.move, "probe");
  assert.equal(pieces.join(""), data.message);
});

test("the gate cancels a disallowed move before any text is shown", async () => {
  const pieces = [];
  const reply = { ...fakeConductorReply({ plan, learnerText: "", trigger: "reply", openers: {} }), move: "curveball", message: "One link goes viral. What breaks?" };
  await assert.rejects(
    runTaskStream(task(reply), {}, { meter: false, onDelta: (text) => pieces.push(text), gate: (raw) => (plan.allowedMoves.includes(leadingFields(raw).move) ? null : `move ${leadingFields(raw).move}`) }),
    (error) => error.code === "GATE_REJECTED" && error.detail.move === "curveball",
  );
  assert.deepEqual(pieces, [], "nothing reached the learner");
});

test("the fake reply always stays inside the plan", () => {
  for (const allowedMoves of [["hint"], ["open", "clarify"], ["wrap_up", "clarify", "explain"], ["move_on"], ["open", "stay_silent"]]) {
    const reply = fakeConductorReply({ plan: { ...plan, allowedMoves }, learnerText: "a reasonable answer here", trigger: allowedMoves.includes("stay_silent") ? "tick:canvas" : "reply", openers: { b: "Next?" } });
    assert.ok(allowedMoves.includes(reply.move), `${reply.move} not in ${allowedMoves}`);
    conductorOutput.parse(reply);
  }
});
