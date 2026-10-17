import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { toJsonSchema } from "./schema.js";
import { interviewerTask } from "./tasks/interviewer.js";
import { reasoningPlan } from "./providers.js";
import { createMessageExtractor } from "./message-stream.js";
import { contentFromChunk, takeStreamLines } from "./openai-stream.js";
import { openSse } from "./sse.js";
import { createInterviewStream, readServerEvents } from "../../../src/sse.js";

const sample = {
  action: "respond",
  intent: "answer",
  message: "Hello \"there\"\nNext line A",
  nodeIds: [],
  stage: "requirements",
  coveredNodeIds: [],
  communication: { signals: [], note: "They said \"message\": \"secret note\"" },
};

function collect(chunks) {
  const extractor = createMessageExtractor();
  return chunks.map((chunk) => extractor.push(chunk)).join("");
}

test("the interviewer message is the first schema field", () => {
  assert.equal(toJsonSchema(interviewerTask.output).required[0], "message");
});

test("a rejected fast reasoning setting falls back to low once", () => {
  const rejected = new Set();
  assert.deepEqual(reasoningPlan("none", rejected), ["none", "low"]);
  rejected.add("none");
  assert.deepEqual(reasoningPlan("none", rejected), ["low"]);
  assert.deepEqual(reasoningPlan("low", rejected), ["low"]);
  assert.deepEqual(reasoningPlan(undefined, rejected), [undefined]);
});

test("message text streams without private notes", () => {
  const json = JSON.stringify(sample);
  assert.equal(collect([json]), "Hello \"there\"\nNext line A");
  assert.equal(collect([...json]), "Hello \"there\"\nNext line A");
});

test("a message after nested objects is still the only text emitted", () => {
  const json = JSON.stringify({
    action: "respond",
    communication: { note: "message: secret" },
    message: "Visible reply",
  });
  const extractor = createMessageExtractor();
  let text = "";
  for (let i = 0; i < json.length; i += 3) text += extractor.push(json.slice(i, i + 3));
  assert.equal(text, "Visible reply");
  assert.equal(extractor.done, true);
});

test("escapes split across chunks decode once", () => {
  const json = '{"message":"Hello\\nThere\\u0041"}';
  const slash = json.indexOf("\\\\n");
  assert.equal(collect([json.slice(0, slash + 1), json.slice(slash + 1)]), "Hello\nThereA");
});

test("provider stream frames can split mid-line", () => {
  const payload = JSON.stringify({ choices: [{ delta: { content: "{\"message\":\"Hi\"}" }, finish_reason: null }] });
  const frame = `data: ${payload}\n\n`;
  const splitAt = Math.floor(frame.length / 2);
  let buffer = frame.slice(0, splitAt);
  const first = takeStreamLines(buffer);
  buffer = first.rest + frame.slice(splitAt);
  const second = takeStreamLines(buffer);
  const data = [...first.data, ...second.data];
  assert.equal(data.length, 1);
  assert.equal(contentFromChunk(JSON.parse(data[0])).text, "{\"message\":\"Hi\"}");
  assert.equal(contentFromChunk({ choices: [{ delta: { content: [{ text: "A" }, { text: "B" }] }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 4 }, model: "m" }).outputTokens, 4);
});

test("event stream reaches the client before the reply is finished", async () => {
  const app = express();
  app.get("/stream", (_req, res) => {
    const sse = openSse(res);
    sse.send("delta", { text: "Hello" });
    setTimeout(() => {
      sse.send("reset", {});
      sse.send("delta", { text: "Bye" });
      sse.send("done", { turns: [{ id: "1", content: "Bye" }] });
      sse.end();
    }, 120);
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const started = Date.now();
    let firstDeltaAt = 0;
    const pieces = [];
    let resets = 0;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/stream`);
    const stream = createInterviewStream();
    await readServerEvents(response, {
      onEvent(event, raw) {
        if (event === "delta" && !firstDeltaAt) firstDeltaAt = Date.now() - started;
        if (event === "delta") pieces.push(JSON.parse(raw).text);
        if (event === "reset") resets += 1;
        stream.onEvent(event, raw);
      },
    });
    assert.equal(resets, 1);
    assert.equal(pieces.join(""), "HelloBye");
    assert.equal(stream.reply, "Bye");
    assert.equal(stream.result.turns[0].content, "Bye");
    assert.ok(firstDeltaAt < 80, `first delta took ${firstDeltaAt}ms`);
    assert.ok(Date.now() - started >= 100, "the response ended before the delayed events");
  } finally {
    server.close();
  }
});

test("fake interviewer streams the message in more than one piece", async () => {
  const { aiConfig } = await import("./config.js");
  if (aiConfig.provider !== "fake") return;
  const { runTaskStream } = await import("./run.js");
  const { interviewerTask } = await import("./tasks/interviewer.js");
  const pieces = [];
  const { data } = await runTaskStream(interviewerTask, {
    trigger: "reply",
    turns: [{ role: "learner", kind: "message", content: "I would put a cache in front of the database." }],
    state: { stage: "requirements" },
    candidates: [],
  }, { meter: false, onDelta: (text) => pieces.push(text) });
  assert.ok(pieces.length > 1);
  assert.equal(pieces.join(""), data.message);
  assert.equal(pieces.some((piece) => piece.includes(data.communication.note)), false);
});
