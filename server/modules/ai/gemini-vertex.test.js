import assert from "node:assert/strict";
import test from "node:test";

// Config is resolved at import time, so the environment is set first.
process.env.AI_PROVIDER = "gemini-vertex";
process.env.VERTEX_PROJECT_ID = "demo-project";
process.env.VERTEX_REGION = "global";
process.env.AI_CHAT_FALLBACK_AFTER_MS = "300";
delete process.env.AI_CHAT_MODEL;
delete process.env.AI_REVIEW_MODEL;
delete process.env.AI_CHAT_FALLBACK_MODEL;

const { aiConfig } = await import("./config.js");
const { setTokenClientForTests } = await import("./gcp-auth.js");
const { complete, streamComplete } = await import("./providers.js");

const schema = { name: "check", schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false } };

test("tasks use Flash for chat and Pro for the final submission", () => {
  assert.equal(aiConfig.tasks.interviewer.model, "gemini-3.8-flash");
  assert.equal(aiConfig.tasks.interview_summary.model, "gemini-3.8-flash");
  assert.equal(aiConfig.tasks.review.model, "gemini-3.1-pro-preview");
  assert.equal(aiConfig.tasks.communication.model, "gemini-3.1-pro-preview");
  assert.equal(aiConfig.vendor, "vertex-gemini");
});

test("chat runs on the us multi-region; the review model stays global", () => {
  assert.equal(aiConfig.tasks.interviewer.baseUrl, "https://aiplatform.us.rep.googleapis.com/v1/projects/demo-project/locations/us/endpoints/openapi");
  assert.equal(aiConfig.tasks.interview_summary.baseUrl, aiConfig.tasks.interviewer.baseUrl);
  assert.equal(aiConfig.tasks.review.baseUrl, undefined);
  assert.equal(aiConfig.baseUrl, "https://aiplatform.googleapis.com/v1/projects/demo-project/locations/global/endpoints/openapi");
});

test("calls Vertex's OpenAI endpoint with a Google token and the publisher-prefixed model", async (t) => {
  setTokenClientForTests({ getAccessToken: async () => ({ token: "ya29.test" }) });
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    seen.push({ url, init });
    return new Response(JSON.stringify({
      model: "google/gemini-3.8-flash",
      choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  });

  const result = await complete({ model: "gemini-3.8-flash", messages: [{ role: "user", content: "ok?" }], jsonSchema: schema, effort: "low", maxTokens: 500, timeoutMs: 5_000 });

  assert.equal(result.text, '{"ok":true}');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "https://aiplatform.googleapis.com/v1/projects/demo-project/locations/global/endpoints/openapi/chat/completions");
  assert.equal(seen[0].init.headers.Authorization, "Bearer ya29.test");
  const body = JSON.parse(seen[0].init.body);
  assert.equal(body.model, "google/gemini-3.8-flash");
  assert.equal(body.response_format.type, "json_schema");
});

test("a credentials failure is AUTH and is not retried", async (t) => {
  setTokenClientForTests({ getAccessToken: async () => { throw new Error("invalid_grant"); } });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("should not be called"); });
  await assert.rejects(
    complete({ model: "gemini-3.8-flash", messages: [{ role: "user", content: "ok?" }], jsonSchema: schema, effort: "low", maxTokens: 500, timeoutMs: 5_000 }),
    (error) => error.code === "AUTH" && /invalid_grant/.test(error.detail.cause),
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

const sse = (...chunks) => new Response(new ReadableStream({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
    controller.close();
  },
}), { status: 200, headers: { "content-type": "text/event-stream" } });
const piece = (model, text, finish = null) => ({ model, choices: [{ delta: { content: text }, finish_reason: finish }] });
// A response whose headers arrive but whose body never sends a byte, until aborted.
const stalled = (init) => new Response(new ReadableStream({
  start(controller) { init.signal.addEventListener("abort", () => controller.error(init.signal.reason)); },
}), { status: 200, headers: { "content-type": "text/event-stream" } });
const chatRequest = () => ({ ...aiConfig.tasks.interviewer, messages: [{ role: "user", content: "hi" }], jsonSchema: schema });

test("chat falls back to 3.5 Flash in Mumbai when 3.8 Flash has not started answering", async (t) => {
  setTokenClientForTests({ getAccessToken: async () => ({ token: "ya29.test" }) });
  assert.equal(aiConfig.tasks.interviewer.fallback.model, "gemini-3.5-flash");
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    urls.push({ url, model: JSON.parse(init.body).model });
    if (urls.length === 1) return stalled(init);
    return sse(piece("google/gemini-3.5-flash", '{"ok":'), piece("google/gemini-3.5-flash", "true}", "stop"));
  });

  const started = Date.now();
  let text = "";
  let end;
  for await (const event of streamComplete(chatRequest())) {
    if (event.type === "delta") text += event.text;
    else end = event;
  }
  assert.equal(text, '{"ok":true}');
  assert.equal(end.model, "google/gemini-3.5-flash");
  assert.ok(Date.now() - started < 3_000, "fallback should start right after the first-token deadline");
  assert.equal(urls[0].model, "google/gemini-3.8-flash");
  assert.equal(urls[0].url, "https://aiplatform.us.rep.googleapis.com/v1/projects/demo-project/locations/us/endpoints/openapi/chat/completions");
  assert.equal(urls[1].model, "google/gemini-3.5-flash");
  assert.match(urls[1].url, /^https:\/\/asia-south1-aiplatform\.googleapis\.com\/v1\/projects\/demo-project\/locations\/asia-south1\//);
});

test("no fallback once the primary has shown text", async (t) => {
  setTokenClientForTests({ getAccessToken: async () => ({ token: "ya29.test" }) });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    let sent = false;
    return new Response(new ReadableStream({
      pull(controller) {
        if (sent) return controller.error(new Error("socket hang up"));
        sent = true;
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(piece("google/gemini-3.8-flash", '{"ok":'))}\n\n`));
      },
    }), { status: 200, headers: { "content-type": "text/event-stream" } });
  });
  await assert.rejects(async () => {
    for await (const event of streamComplete(chatRequest())) void event;
  }, (error) => error.code === "NETWORK");
  assert.equal(calls, 1);
});

test("a fast primary is used as is", async (t) => {
  setTokenClientForTests({ getAccessToken: async () => ({ token: "ya29.test" }) });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => sse(piece("google/gemini-3.8-flash", '{"ok":true}', "stop")));
  let end;
  for await (const event of streamComplete(chatRequest())) if (event.type === "end") end = event;
  assert.equal(end.model, "google/gemini-3.8-flash");
  assert.equal(fetchMock.mock.callCount(), 1);
});
