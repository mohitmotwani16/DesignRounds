import assert from "node:assert/strict";
import test from "node:test";

// Config is resolved at import time, so the environment is set first.
process.env.AI_PROVIDER = "gemini-vertex";
process.env.VERTEX_PROJECT_ID = "demo-project";
process.env.VERTEX_REGION = "global";
delete process.env.AI_CHAT_MODEL;
delete process.env.AI_REVIEW_MODEL;

const { aiConfig } = await import("./config.js");
const { setTokenClientForTests } = await import("./gcp-auth.js");
const { complete } = await import("./providers.js");

const schema = { name: "check", schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false } };

test("tasks use Flash for chat and Pro for the final submission", () => {
  assert.equal(aiConfig.tasks.interviewer.model, "gemini-3.8-flash");
  assert.equal(aiConfig.tasks.interview_summary.model, "gemini-3.8-flash");
  assert.equal(aiConfig.tasks.review.model, "gemini-3.1-pro-preview");
  assert.equal(aiConfig.tasks.communication.model, "gemini-3.1-pro-preview");
  assert.equal(aiConfig.vendor, "vertex-gemini");
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
