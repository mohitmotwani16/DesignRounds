import assert from "node:assert/strict";
import test from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { buildParams, complete, setVertexClientForTests, streamComplete } from "./anthropic-vertex.js";
import { toClaudeSchema, toJsonSchema } from "./schema.js";
import { communicationTask } from "./tasks/communication.js";
import { interviewerTask, interviewSummaryTask } from "./tasks/interviewer.js";
import { reviewTask } from "./tasks/review.js";

const schema = { name: "check", schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false } };
const request = (extra = {}) => ({
  model: "claude-haiku-5-5",
  messages: [{ role: "system", content: "Be brief." }, { role: "user", content: "Say ok." }],
  jsonSchema: schema,
  effort: "low",
  maxTokens: 500,
  timeoutMs: 5_000,
  ...extra,
});

function message(text, overrides = {}) {
  return {
    model: "claude-haiku-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    content: [{ type: "text", text }],
    usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 90, output_tokens: 5 },
    ...overrides,
  };
}

// A stub whose `messages.stream` plays one scripted outcome per call: a final
// message (streamed in two halves), or an error thrown before or after the first delta.
function stubClient(outcomes) {
  const calls = [];
  return {
    calls,
    messages: {
      stream(params, options) {
        const outcome = outcomes[calls.length];
        calls.push({ params, options });
        return {
          async *[Symbol.asyncIterator]() {
            if (outcome.error && !outcome.afterText) throw outcome.error;
            const text = outcome.message?.content[0]?.text ?? "partial";
            const half = Math.ceil(text.length / 2);
            yield { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } };
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(0, half) } };
            if (outcome.error) throw outcome.error;
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(half) } };
          },
          async finalMessage() {
            return outcome.message;
          },
        };
      },
    },
  };
}

const overloaded = () => Anthropic.APIError.generate(529, { type: "error", error: { type: "overloaded_error" } }, "Overloaded", new Headers({ "retry-after": "0.01" }));
const dropped = () => new Anthropic.APIConnectionError({ message: "socket hang up" });

test("every task schema converts without bounds Claude rejects", () => {
  for (const task of [reviewTask, interviewerTask, interviewSummaryTask, communicationTask]) {
    const text = JSON.stringify(toClaudeSchema(toJsonSchema(task.output)));
    assert.doesNotMatch(text, /"(minimum|maximum)":/, task.name);
    assert.doesNotMatch(text, /"minItems":([2-9]|\d\d)/, task.name);
  }
});

test("bounds move into the description", () => {
  const converted = toClaudeSchema({ type: "object", properties: { score: { type: "integer", description: "Score.", minimum: 1, maximum: 5 }, tips: { type: "array", minItems: 3, items: { type: "string" } } }, required: ["score", "tips"], additionalProperties: false });
  assert.equal(converted.properties.score.description, "Score. Between 1 and 5.");
  assert.equal(converted.properties.tips.description, "At least 3 items.");
  assert.equal(converted.properties.tips.minItems, undefined);
});

test("request shape: cached system prompt, JSON format, effort", () => {
  const params = buildParams(request());
  assert.equal(params.model, "claude-haiku-5-5");
  assert.deepEqual(params.system, [{ type: "text", text: "Be brief.", cache_control: { type: "ephemeral" } }]);
  assert.deepEqual(params.messages, [{ role: "user", content: "Say ok." }]);
  assert.equal(params.output_config.format.type, "json_schema");
  assert.equal(params.output_config.effort, "low");
  assert.equal(params.thinking, undefined);
});

test('effort "none" turns thinking off the way each model accepts', () => {
  assert.deepEqual(buildParams(request({ effort: "none" })).thinking, { type: "disabled" });
  assert.deepEqual(buildParams(request({ effort: "none", model: "claude-sonnet-5-5" })).thinking, { type: "between_tools" });
  assert.equal(buildParams(request({ effort: "none", model: "claude-opus-5-5" })).thinking, undefined);
  assert.equal(buildParams(request({ effort: "none" })).output_config.effort, "low");
});

test("complete returns text and usage including cached input", async () => {
  setVertexClientForTests(stubClient([{ message: message('{"ok":true}') }]));
  const result = await complete(request());
  assert.equal(result.text, '{"ok":true}');
  assert.equal(result.finishReason, "end_turn");
  assert.equal(result.inputTokens, 100);
  assert.equal(result.cachedInputTokens, 90);
  assert.equal(result.attempts, 1);
});

test("overload is retried", async () => {
  const stub = stubClient([{ error: overloaded() }, { message: message('{"ok":true}') }]);
  setVertexClientForTests(stub);
  const result = await complete(request());
  assert.equal(result.text, '{"ok":true}');
  assert.equal(result.attempts, 2);
  assert.equal(stub.calls.length, 2);
});

test("a stream that breaks after visible text is not retried", async () => {
  const stub = stubClient([{ error: dropped(), afterText: true }, { message: message('{"ok":true}') }]);
  setVertexClientForTests(stub);
  const seen = [];
  await assert.rejects(async () => {
    for await (const event of streamComplete(request())) seen.push(event);
  }, (error) => error.code === "NETWORK");
  assert.equal(stub.calls.length, 1);
  assert.equal(seen[0].type, "delta");
});

test("complete restarts a broken stream from scratch", async () => {
  setVertexClientForTests(stubClient([{ error: dropped(), afterText: true }, { message: message('{"ok":true}') }]));
  const result = await complete(request());
  assert.equal(result.text, '{"ok":true}');
});

test("max_tokens maps to length so run.js asks for a shorter reply", async () => {
  setVertexClientForTests(stubClient([{ message: message('{"ok":', { stop_reason: "max_tokens" }) }]));
  assert.equal((await complete(request())).finishReason, "length");
});

test("a refusal becomes REFUSED and is not retried", async () => {
  const stub = stubClient([{ message: message("", { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" } }) }]);
  setVertexClientForTests(stub);
  await assert.rejects(complete(request()), (error) => error.code === "REFUSED" && error.detail.category === "cyber");
  assert.equal(stub.calls.length, 1);
});

test("HTTP errors map to stable codes", async () => {
  const cases = [[429, "RATE_LIMITED"], [403, "AUTH"], [404, "MISCONFIGURED"], [400, "PROVIDER_ERROR"]];
  for (const [status, code] of cases) {
    setVertexClientForTests(stubClient([0, 1, 2].map(() => ({ error: Anthropic.APIError.generate(status, {}, `status ${status}`, new Headers({ "retry-after": "0.01" })) }))));
    await assert.rejects(complete(request()), (error) => error.code === code && error.detail.status === status, String(status));
  }
});

test("the deadline becomes TIMEOUT and is not retried", async () => {
  const stub = {
    calls: 0,
    messages: {
      stream(params, { signal }) {
        stub.calls += 1;
        return {
          async *[Symbol.asyncIterator]() {
            await new Promise((resolve) => signal.addEventListener("abort", resolve));
            throw new Anthropic.APIUserAbortError();
          },
          finalMessage: async () => null,
        };
      },
    },
  };
  setVertexClientForTests(stub);
  await assert.rejects(complete(request({ timeoutMs: 50 })), (error) => error.code === "TIMEOUT");
  assert.equal(stub.calls, 1);
});
