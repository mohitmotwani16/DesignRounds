import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { candidateSnapshot, conventions, defaultMode, loadContent, renderUniversal, ucsVersion } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(here, "..", "..", "content", "interviewer");
const fixture = path.join(here, "fixtures", "ucs-core.txt");

function withCopy(edit) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ucs-"));
  try {
    cpSync(contentDir, dir, { recursive: true });
    edit(dir);
    return loadContent(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the version is a content hash and rendering is deterministic", () => {
  assert.match(ucsVersion(), /^ucs-[0-9a-f]{8}$/);
  const first = loadContent(contentDir);
  const second = loadContent(contentDir);
  assert.equal(first.version, second.version);
  assert.deepEqual(first.texts, second.texts);
  assert.equal(first.version, ucsVersion());
});

test("a missing file fails loading", () => {
  assert.throws(() => withCopy((dir) => rmSync(path.join(dir, "moves.md"))), /missing content files: moves\.md/);
});

test("an unknown placeholder fails loading", () => {
  assert.throws(() => withCopy((dir) => writeFileSync(path.join(dir, "persona.md"), "Ask {{questionsPerTurn}} questions.")), /persona\.md uses \{\{questionsPerTurn\}\}/);
});

test("a mode number can't leak into the shared core", () => {
  assert.throws(() => withCopy((dir) => writeFileSync(path.join(dir, "format.md"), "Up to {{maxFollowUpsPerItem}} follow-ups.")), /format\.md uses \{\{maxFollowUpsPerItem\}\}/);
});

test("any content change produces a new version", () => {
  const changed = withCopy((dir) => writeFileSync(path.join(dir, "persona.md"), `${readFileSync(path.join(dir, "persona.md"), "utf8")}\nOne more line.`));
  assert.notEqual(changed.version, ucsVersion());
});

test("global blocks hold nothing volatile", async () => {
  for (const mode of ["guided", "realistic"]) {
    for (const block of await renderUniversal({ task: "interviewer", mode })) {
      assert.equal(block.stability, "global");
      assert.doesNotMatch(block.text, /\d{4}-\d{2}-\d{2}|\b[0-9a-f]{8}-[0-9a-f]{4}-|\d{10,}/, `${block.id} looks volatile`);
      assert.doesNotMatch(block.text, /\{\{/, `${block.id} has an unfilled placeholder`);
    }
  }
});

test("interviewer blocks: core, mode, then the candidate as a session block", async () => {
  const candidate = candidateSnapshot({ interests: ["software-engineering", "student"], experience_level: "1–3 years" }, { roundsCompleted: 2 });
  const blocks = await renderUniversal({ task: "interviewer", mode: "realistic", candidate });
  assert.deepEqual(blocks.map((block) => [block.id, block.role, block.stability]), [
    ["ucs.core", "system", "global"],
    ["ucs.mode.realistic", "system", "global"],
    ["ucs.candidate", "context", "session"],
  ]);
  assert.match(blocks[1].text, /Follow-ups per item: up to 2\./);
  assert.match(blocks[2].text, /software engineering/);
  assert.match(blocks[2].text, /Rounds completed on DesignRounds: 1-3/);
  for (const block of blocks) assert.ok(block.tokens > 0 && block.version.startsWith(ucsVersion()));
});

test("two candidates in the same mode share every byte up to the candidate block", async () => {
  const a = await renderUniversal({ task: "interviewer", mode: "guided", candidate: candidateSnapshot({ interests: ["data-engineering"] }) });
  const b = await renderUniversal({ task: "interviewer", mode: "guided", candidate: candidateSnapshot({ interests: ["machine-learning"], experience_level: "10+ years" }) });
  assert.deepEqual(a.slice(0, 2), b.slice(0, 2));
  assert.notEqual(a[2].text, b[2].text);
});

test("the interviewer needs a mode; other tasks get their addendum", async () => {
  await assert.rejects(renderUniversal({ task: "interviewer" }), /needs a mode/);
  const [build] = await renderUniversal({ task: "pack_build" });
  assert.equal(build.id, "ucs.task.pack_build");
  assert.match(build.text, /build a Problem Pack/);
  const review = await renderUniversal({ task: "review", mode: "realistic" });
  assert.deepEqual(review.map((block) => block.id), ["ucs.task.review", "ucs.mode.realistic"]);
});

test("conventions differ by mode and carry the plan's hints", async () => {
  const guided = await conventions({ mode: "guided", hintsPerRound: 3 });
  const realistic = await conventions({ mode: "realistic", hintsPerRound: 3 });
  assert.equal(guided.maxFollowUpsPerItem, 3);
  assert.equal(realistic.maxFollowUpsPerItem, 2);
  assert.deepEqual(guided.timeWarnings, [0.5, 0.8]);
  assert.deepEqual(realistic.timeWarnings, [0.8]);
  assert.equal(guided.hintsPerRound, 3);
  assert.ok(Object.isFrozen(guided));
});

test("the candidate snapshot keeps no personal data", () => {
  const snapshot = candidateSnapshot({ email: "a@b.c", display_name: "Asha", headline: "Lead at X", interests: ["frontend-mobile", "engineering-manager"], experience_level: "Student / new grad" }, { roundsCompleted: 14 });
  assert.deepEqual(snapshot, { targetTracks: ["frontend-mobile"], level: "student", roundsCompleted: "10+" });
  assert.equal(defaultMode({ difficulty: "Advanced", candidate: snapshot }), "guided");
  assert.equal(defaultMode({ difficulty: "Advanced", candidate: candidateSnapshot({}) }), "realistic");
  assert.equal(defaultMode({ difficulty: "Beginner", candidate: null }), "guided");
});

// The rendered core prompt is committed, so a reviewer sees the exact prompt diff.
// Regenerate with UPDATE_FIXTURES=1 npm run test:conductor.
test("the rendered core matches the committed snapshot", async () => {
  const [core] = await renderUniversal({ task: "interviewer", mode: "realistic" });
  if (process.env.UPDATE_FIXTURES) writeFileSync(fixture, `${core.text}\n`);
  assert.equal(`${core.text}\n`, readFileSync(fixture, "utf8").replace(/\r\n/g, "\n"));
});
