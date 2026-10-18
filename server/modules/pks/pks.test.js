import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { fakePackContent } from "./builder.js";
import { readPackFiles } from "./index.js";
import { briefOf } from "./inputs.js";
import { blocksFrom, renderPack } from "./render.js";
import { checkPack, finishPack, packVersion, sanitizeContent, validatePack } from "./schema.js";
import { promptById } from "../rounds.js";

const prompt = promptById.get("url-shortener");
const inputs = { promptId: prompt.id, brief: briefOf(prompt), guide: { text: "## Scope and scale\n- 100M new links a month.\n- Reads outnumber writes 100 to 1.\n" }, fingerprint: "f".repeat(64) };
const exemplarOutline = "Range-allocated counters per instance, encoded in base62, with a cache in front of the store for redirects.";

function validContent() {
  const content = fakePackContent({ inputs });
  content.exemplars = [{ band: "strong", label: "Counter ranges", outline: exemplarOutline }];
  content.agenda[4].misconceptions = [{ id: "md5-unique", pattern: "Believes truncating a hash guarantees uniqueness.", challenge: "What happens when two URLs share the first seven characters of their hash?" }];
  content.agenda[4].learnTopics = ["unique-id-generation"];
  return content;
}

const build = (content) => finishPack(content, { promptId: prompt.id, inputsFingerprint: inputs.fingerprint, builder: "test" });
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

test("a valid pack passes every rule and gets a content-hash version", () => {
  const pack = build(validContent());
  assert.deepEqual(validatePack(pack), []);
  assert.deepEqual(checkPack(pack), []);
  assert.match(pack.version, /^pack-[0-9a-f]{8}$/);
  assert.equal(build(validContent()).version, pack.version, "same content, same version");
  const edited = validContent();
  edited.opening = "Let's build a link shortener. Go ahead.";
  assert.notEqual(build(edited).version, pack.version);
});

test("each structural rule is enforced", () => {
  const cases = [
    ["stage wrap_up has no required item", (c) => { c.agenda.find((item) => item.stage === "wrap_up").required = false; }],
    ["is not unique", (c) => { c.agenda[1].id = c.agenda[0].id; }],
    ["must be a short lowercase slug", (c) => { c.agenda[0].id = "Req Scope"; }],
    ["pacing shares must sum to 1", (c) => { c.pacing.deep_dive = 0.6; }],
    ["opens unknown item", (c) => { c.curveballs = [{ id: "viral", after: "deep.scale", prompt: "One link goes viral.", agendaItemId: "deep.hotkey" }]; }],
    ["links unknown Learn topic", (c) => { c.agenda[0].learnTopics = ["not-a-topic"]; }],
    ["triggers on unknown component kind", (c) => { c.agenda[0].triggers.componentKinds = ["teleporter"]; }],
    ["copies exemplar or move-on text", (c) => { c.agenda[2].hints = [`Try this: ${exemplarOutline}`]; }],
    ["must open a different item than the one it follows", (c) => { c.curveballs = [{ id: "viral", after: "deep.failure", prompt: "One link goes viral.", agendaItemId: "deep.failure" }]; }],
    ["must open an optional deep_dive item", (c) => { c.curveballs = [{ id: "viral", after: "deep.failure", prompt: "One link goes viral.", agendaItemId: "deep.scale" }]; }],
    ["reveals hidden fact 100m", (c) => { c.clarifications = [{ id: "scale.writes", topics: ["scale"], answer: "Assume about 100 million new links a month." }]; c.agenda[0].probes = ["With 100 million links a month, what is the write rate?"]; }],
  ];
  for (const [expected, edit] of cases) {
    const content = validContent();
    edit(content);
    const problems = validatePack(build(content));
    assert.ok(problems.some((problem) => problem.includes(expected)), `expected "${expected}" in ${JSON.stringify(problems)}`);
  }
});

test("the schema rejects missing evidence, probes and hints", () => {
  const content = validContent();
  content.agenda[0].probes = [];
  assert.throws(() => build(content));
});

test("sanitize drops unknown references a model may invent, with warnings", () => {
  const content = validContent();
  content.agenda[0].learnTopics = ["unique-id-generation", "made-up-topic"];
  content.agenda[0].triggers.componentKinds = ["teleporter"];
  const { content: clean, warnings } = sanitizeContent(content);
  assert.deepEqual(clean.agenda[0].learnTopics, ["unique-id-generation"]);
  assert.deepEqual(clean.agenda[0].triggers.componentKinds, []);
  assert.equal(warnings.length, 2);
  assert.deepEqual(validatePack(build(clean)), []);
});

test("checkPack catches a tampered version", () => {
  const pack = { ...build(validContent()), opening: "Something else entirely, said differently." };
  assert.ok(checkPack(pack).some((problem) => problem.includes("does not match the content hash")));
  assert.equal(packVersion(build(validContent())), build(validContent()).version);
});

test("rendering is deterministic and the interviewer never sees exemplars", () => {
  const pack = build(validContent());
  const a = renderPack(pack, inputs.brief);
  const b = renderPack(structuredClone(pack), inputs.brief);
  assert.equal(sha(JSON.stringify(a)), sha(JSON.stringify(b)));
  const blocks = blocksFrom(a, pack.version, { task: "interviewer", focusItemId: "deep.data" });
  assert.deepEqual(blocks.map((block) => [block.id, block.stability]), [["pks.brief", "problem"], ["pks.agenda", "problem"], ["pks.focus.deep.data", "turn"]]);
  for (const block of blocks) assert.ok(!block.text.includes(exemplarOutline), `${block.id} leaks an exemplar`);
  assert.match(blocks[2].text, /md5-unique/);
  assert.match(blocks[1].text, /req\.scope · requirements · requirements · weight 2 · required/);
  const review = blocksFrom(a, pack.version, { task: "review" });
  assert.ok(review[1].text.includes(exemplarOutline), "the review does get exemplars");
});

test("a focus change leaves the cached prefix untouched", () => {
  const rendered = renderPack(build(validContent()), inputs.brief);
  const one = blocksFrom(rendered, "v", { task: "interviewer", focusItemId: "req.scope" });
  const two = blocksFrom(rendered, "v", { task: "interviewer", focusItemId: "deep.scale" });
  assert.deepEqual(one.slice(0, 2), two.slice(0, 2));
  assert.notEqual(one[2].text, two[2].text);
});

test("committed pack files are valid", () => {
  for (const { promptId, file, content } of readPackFiles()) {
    const pack = finishPack(content, { promptId, inputsFingerprint: "x", builder: "manual" });
    assert.deepEqual(validatePack(pack), [], `${file} is invalid`);
    assert.ok(pack.agenda.length >= 8 && pack.agenda.length <= 14, `${file} should have 8-14 agenda items`);
  }
});
