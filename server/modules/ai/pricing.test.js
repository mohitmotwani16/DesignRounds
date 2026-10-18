import assert from "node:assert/strict";
import { test } from "node:test";
import { contentFromChunk } from "./openai-stream.js";
import { costOf, modelKey, priceFor, usageFrom } from "./pricing.js";

test("Vertex Gemini thinking tokens are counted (reported apart from completion_tokens)", () => {
  // A real gemini-3.1-pro-preview response: total = prompt + completion + thinking.
  const usage = usageFrom({ completion_tokens: 27, completion_tokens_details: { reasoning_tokens: 424 }, prompt_tokens: 3615, total_tokens: 4066 });
  assert.deepEqual(usage, { inputTokens: 3615, cachedInputTokens: null, outputTokens: 27, reasoningTokens: 424 });
  // Flash reports no details; the total still shows there was none.
  assert.equal(usageFrom({ completion_tokens: 25, prompt_tokens: 3615, total_tokens: 3640 }).reasoningTokens, 0);
});

test("OpenAI-style usage (thinking inside completion_tokens) is not double-counted", () => {
  const usage = usageFrom({ prompt_tokens: 100, completion_tokens: 500, total_tokens: 600, completion_tokens_details: { reasoning_tokens: 400 }, prompt_tokens_details: { cached_tokens: 60 } });
  assert.equal(usage.reasoningTokens, 0);
  assert.equal(usage.cachedInputTokens, 60);
});

test("a stream chunk carries its usage", () => {
  const piece = contentFromChunk({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 20 } });
  assert.equal(piece.usage.reasoningTokens, 8);
});

test("model names from any endpoint map to one price entry", () => {
  assert.equal(modelKey("google/gemini-3.8-flash"), "gemini-3.8-flash");
  assert.equal(modelKey("publishers/google/models/gemini-3.1-pro-preview@001"), "gemini-3.1-pro-preview");
  assert.equal(priceFor("unknown-model"), null);
});

test("calls are priced by the period they fall in", () => {
  const usage = { model: "google/gemini-3.8-flash", inputTokens: 1_000_000, outputTokens: 1_000_000, reasoningTokens: 0 };
  assert.equal(costOf({ ...usage, at: new Date("2026-10-18") }).costUsd, 0.75 + 3.75);
  assert.equal(costOf({ ...usage, at: new Date("2027-02-01") }).costUsd, 1.5 + 7.5);
});

test("thinking is billed as output, cache hits at the cached rate, long prompts at the long-context rate", () => {
  const at = new Date("2026-10-18");
  const pro = { model: "gemini-3.1-pro-preview", at };
  assert.equal(costOf({ ...pro, inputTokens: 3615, outputTokens: 27, reasoningTokens: 424 }).costUsd, (3615 * 2 + 451 * 12) / 1e6);
  assert.equal(costOf({ ...pro, inputTokens: 1000, cachedInputTokens: 800, outputTokens: 0 }).costUsd, (200 * 2 + 800 * 0.2) / 1e6);
  assert.equal(costOf({ ...pro, inputTokens: 300_000, outputTokens: 1000 }).costUsd, (300_000 * 4 + 1000 * 18) / 1e6);
});

test("missing usage or an unknown model is unpriced, never guessed", () => {
  assert.equal(costOf({ model: "gemini-3.8-flash", inputTokens: null, outputTokens: 5 }).costUsd, null);
  assert.equal(costOf({ model: "some-new-model", inputTokens: 5, outputTokens: 5 }).costUsd, null);
});

test("transcription is billed by audio length with the provider's minimum", () => {
  assert.equal(costOf({ model: "whisper-large-v3-turbo", audioMs: 3_600_000 }).costUsd, 0.04);
  assert.equal(costOf({ model: "whisper-large-v3-turbo", audioMs: 2000 }).costUsd, Math.round((10 / 3600) * 0.04 * 1e8) / 1e8);
});
