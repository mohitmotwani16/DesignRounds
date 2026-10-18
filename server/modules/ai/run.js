import { query } from "../../db.js";
import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";
import { createMessageExtractor } from "./message-stream.js";
import { costOf, estimateTokens } from "./pricing.js";
import { complete, streamComplete } from "./providers.js";
import { describeIssues, toJsonSchema } from "./schema.js";

const FAKE_LATENCY_MS = 1200;
const FAKE_CHUNK_CHARS = 18;
const FAKE_CHUNK_MS = 35;
const jsonSchemas = new WeakMap();

function jsonSchemaFor(task) {
  if (!jsonSchemas.has(task)) jsonSchemas.set(task, { name: task.name, schema: toJsonSchema(task.output) });
  return jsonSchemas.get(task);
}

function parseOutput(task, raw) {
  let value;
  try {
    // Some providers wrap JSON in a code fence even in JSON mode.
    value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, problem: "the reply was not valid JSON" };
  }
  const result = task.output.safeParse(value);
  return result.success ? { ok: true, data: result.data } : { ok: false, problem: describeIssues(result.error) };
}

// Provider errors that are never billed: the request was refused before any work.
const UNBILLED = new Set(["rate_limited", "auth", "provider_error", "disabled", "refused"]);

// Size of a request in characters (messages plus the schema we send with it), for
// estimating the tokens of a call that ended without a usage report.
function requestChars(messages, task) {
  const text = (content) => (typeof content === "string" ? content.length : content.reduce((sum, part) => sum + String(part.text ?? "").length, 0));
  return messages.reduce((sum, message) => sum + text(message.content), 0) + JSON.stringify(jsonSchemaFor(task).schema).length;
}

// An aborted call (timed out, stalled, cut off by the move gate) may still be billed for
// what the provider processed; with no usage report its tokens are estimated and flagged.
function abortedUsage(outcome, { chars, outputChars = 0 }) {
  if (UNBILLED.has(outcome)) return { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  return { inputTokens: estimateTokens(chars), outputTokens: estimateTokens(outputChars), reasoningTokens: 0, estimated: true };
}

async function recordUsage(entry) {
  if (entry.meter === false) return;
  const { costUsd, priceVersion } = costOf(entry);
  try {
    await query(
      `insert into ai_usage (user_id, session_id, task, provider, model, outcome, attempts, input_tokens, output_tokens, latency_ms, cached_input_tokens,
                             reasoning_tokens, cache_write_tokens, cost_usd, price_version, cost_estimated)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [entry.userId ?? null, entry.sessionId ?? null, entry.task, aiConfig.vendor, entry.model, entry.outcome,
        entry.attempts ?? 1, entry.inputTokens ?? null, entry.outputTokens ?? null, entry.latencyMs, entry.cachedInputTokens ?? null,
        entry.reasoningTokens ?? null, entry.cacheWriteTokens ?? null, costUsd, priceVersion, Boolean(entry.estimated)]
    );
  } catch (error) {
    console.error("[ai] could not record usage:", error.message);
  }
  const cached = entry.cachedInputTokens ? ` cached=${entry.cachedInputTokens}` : "";
  const thinking = entry.reasoningTokens ? ` thinking=${entry.reasoningTokens}` : "";
  const cost = costUsd == null ? "" : ` cost=${costUsd.toFixed(6)}${entry.estimated ? "~" : ""}`;
  console.log(`[ai] ${entry.task} ${entry.outcome} model=${entry.model} in=${entry.inputTokens ?? "?"}${cached} out=${entry.outputTokens ?? "?"}${thinking}${cost} ${entry.latencyMs}ms`);
}

// The primary model that stalled before a fallback answered.
async function recordAbandoned(meta, abandoned, chars) {
  for (const entry of abandoned ?? []) {
    const outcome = `abandoned_${String(entry.code || "error").toLowerCase()}`;
    await recordUsage({ ...meta, model: entry.model, outcome, latencyMs: entry.latencyMs, ...abortedUsage(String(entry.code || "").toLowerCase(), { chars }) });
  }
}

const STABILITY_ORDER = { global: 0, problem: 1, session: 2, turn: 3 };

// Context blocks (docs/design/README.md, section 3) become one system message and one
// user message, ordered global -> problem -> session -> turn so the longest possible
// prefix repeats from turn to turn and across learners. The last block of each stable
// layer is marked `cache`: providers with explicit breakpoints (Claude) cache there,
// prefix-caching providers just see the same text in the same order.
export function messagesFromBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => STABILITY_ORDER[a.stability] - STABILITY_ORDER[b.stability]);
  const parts = (list) => list.map((block, index) => ({
    text: block.text,
    cache: block.stability !== "turn" && list[index + 1]?.stability !== block.stability,
  }));
  return [
    { role: "system", content: parts(sorted.filter((block) => block.role === "system")) },
    { role: "user", content: parts(sorted.filter((block) => block.role !== "system")) },
  ];
}

function messagesFor(task, input) {
  if (task.blocks) return messagesFromBlocks(task.blocks(input));
  return [
    { role: "system", content: task.system },
    { role: "user", content: task.buildUser(input) },
  ];
}

// The streamed reply's leading fields, read from the raw JSON before `message` starts.
export function leadingFields(rawJson) {
  const field = (name) => rawJson.match(new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`))?.[1] ?? null;
  return { move: field("move"), focusItemId: field("focusItemId") };
}

// Runs one AI task: builds its messages, calls the provider for schema-constrained
// JSON, validates the result, and gives the model one chance to repair invalid
// output. Every call is metered in ai_usage; no prompt or output text is logged.
//
// A task is { name, output: zodSchema, fake(input) } plus either { system, buildUser(input) }
// or { blocks(input) } returning context blocks.
export async function runTask(task, input, { userId, sessionId, meter = true } = {}) {
  const settings = aiConfig.tasks[task.name];
  const meta = { task: task.name, userId, sessionId, meter };

  if (aiConfig.provider === "fake") {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
    const data = task.output.parse(task.fake(input));
    await recordUsage({ ...meta, model: "fake", outcome: "ok", inputTokens: 0, outputTokens: 0, latencyMs: FAKE_LATENCY_MS });
    return { data, model: "fake" };
  }
  if (!aiConfig.enabled) throw new AiError("DISABLED", "No AI provider is configured.");

  const messages = messagesFor(task, input);
  for (let round = 1; round <= 2; round += 1) {
    const started = Date.now();
    const chars = requestChars(messages, task);
    let completion;
    try {
      completion = await complete({ model: settings.model, baseUrl: settings.baseUrl, fallback: settings.fallback, messages, jsonSchema: jsonSchemaFor(task), effort: settings.effort, maxTokens: settings.maxTokens, timeoutMs: settings.timeoutMs });
    } catch (error) {
      const outcome = (error.code || "error").toLowerCase();
      await recordUsage({ ...meta, model: settings.model, outcome, attempts: error.detail?.attempts, latencyMs: Date.now() - started, ...abortedUsage(outcome, { chars }) });
      if (error.detail) console.error(`[ai] ${task.name} ${error.code}:`, JSON.stringify(error.detail));
      throw error;
    }
    await recordAbandoned(meta, completion.abandoned, chars);
    const usage = { model: completion.model, attempts: completion.attempts, inputTokens: completion.inputTokens, cachedInputTokens: completion.cachedInputTokens, cacheWriteTokens: completion.cacheWriteTokens, outputTokens: completion.outputTokens, reasoningTokens: completion.reasoningTokens, latencyMs: Date.now() - started };
    const parsed = completion.finishReason === "length"
      ? { ok: false, problem: "the reply was cut off before the JSON was complete; be more concise" }
      : parseOutput(task, completion.text);
    if (parsed.ok) {
      await recordUsage({ ...meta, ...usage, outcome: "ok" });
      return { data: parsed.data, model: completion.model };
    }
    await recordUsage({ ...meta, ...usage, outcome: "invalid_output" });
    console.warn(`[ai] ${task.name} invalid output (round ${round}): ${parsed.problem}`);
    messages.push(
      { role: "assistant", content: completion.text.slice(0, 30_000) },
      { role: "user", content: `Your reply could not be used because ${parsed.problem}. Reply again with only the corrected JSON object that matches the schema.` }
    );
  }
  throw new AiError("INVALID_OUTPUT", "The model did not return valid output.");
}

async function emitInChunks(text, onDelta) {
  if (!text || !onDelta) return;
  for (let index = 0; index < text.length; index += FAKE_CHUNK_CHARS) {
    onDelta(text.slice(index, index + FAKE_CHUNK_CHARS));
    if (index + FAKE_CHUNK_CHARS < text.length) await new Promise((resolve) => setTimeout(resolve, FAKE_CHUNK_MS));
  }
}

// Like `runTask`, but calls `onDelta` with each newly visible piece of the top-level
// `message` string while the model is still writing. `onReset` runs before a repair
// attempt so a partial reply can be replaced. Other fields, including private notes,
// are never passed to `onDelta`.
//
// `gate(rawJsonSoFar)` runs once, just before the first piece of `message` would be
// shown, when the fields written before it (for the Conductor: move and focusItemId)
// are complete. Returning a reason cancels the stream with GATE_REJECTED, so nothing
// the learner can see was produced by a move the application doesn't allow.
function gateRejection(gate, raw) {
  const reason = gate?.(raw);
  return reason ? new AiError("GATE_REJECTED", String(reason), { ...leadingFields(raw), reason: String(reason) }) : null;
}

export async function runTaskStream(task, input, { userId, sessionId, meter = true, onDelta, onReset, gate } = {}) {
  const settings = aiConfig.tasks[task.name];
  const meta = { task: task.name, userId, sessionId, meter };

  if (aiConfig.provider === "fake") {
    const started = Date.now();
    const data = task.output.parse(task.fake(input));
    const rejected = gateRejection(gate, JSON.stringify(data));
    if (rejected) throw rejected;
    await emitInChunks(data.message ?? "", onDelta);
    await recordUsage({ ...meta, model: "fake", outcome: "ok", inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started });
    return { data, model: "fake" };
  }
  if (!aiConfig.enabled) throw new AiError("DISABLED", "No AI provider is configured.");

  const messages = messagesFor(task, input);
  let streamed = false;
  const forward = (text) => {
    if (!text) return;
    streamed = true;
    onDelta?.(text);
  };

  for (let round = 1; round <= 2; round += 1) {
    if (round > 1 && streamed) onReset?.();
    streamed = false;
    const started = Date.now();
    const extractor = createMessageExtractor();
    let text = "";
    let finishReason = null;
    let model = settings.model;
    let attempts = 1;
    let reported = {};
    const chars = requestChars(messages, task);
    let gated = !gate;
    try {
      for await (const event of streamComplete({ model: settings.model, baseUrl: settings.baseUrl, fallback: settings.fallback, messages, jsonSchema: jsonSchemaFor(task), effort: settings.effort, maxTokens: settings.maxTokens, timeoutMs: settings.timeoutMs })) {
        if (event.type === "delta") {
          text += event.text;
          const piece = extractor.push(event.text);
          if (piece && !gated) {
            const rejected = gateRejection(gate, text);
            if (rejected) throw rejected;
            gated = true;
          }
          forward(piece);
        } else if (event.type === "abandoned") {
          await recordAbandoned(meta, [event], chars);
        } else {
          finishReason = event.finishReason;
          model = event.model;
          attempts = event.attempts;
          reported = event;
        }
      }
    } catch (error) {
      const outcome = (error.code || "error").toLowerCase();
      await recordUsage({ ...meta, model, outcome, attempts: error.detail?.attempts, latencyMs: Date.now() - started, ...abortedUsage(outcome, { chars, outputChars: text.length }) });
      if (error.detail) console.error(`[ai] ${task.name} ${error.code}:`, JSON.stringify(error.detail));
      throw error;
    }
    const usage = { model, attempts, inputTokens: reported.inputTokens, cachedInputTokens: reported.cachedInputTokens, cacheWriteTokens: reported.cacheWriteTokens, outputTokens: reported.outputTokens, reasoningTokens: reported.reasoningTokens, latencyMs: Date.now() - started };
    const parsed = finishReason === "length"
      ? { ok: false, problem: "the reply was cut off before the JSON was complete; be more concise" }
      : parseOutput(task, text);
    if (parsed.ok) {
      await recordUsage({ ...meta, ...usage, outcome: "ok" });
      return { data: parsed.data, model };
    }
    await recordUsage({ ...meta, ...usage, outcome: "invalid_output" });
    console.warn(`[ai] ${task.name} invalid output (round ${round}): ${parsed.problem}`);
    messages.push(
      { role: "assistant", content: text.slice(0, 30_000) },
      { role: "user", content: `Your reply could not be used because ${parsed.problem}. Reply again with only the corrected JSON object that matches the schema.` }
    );
  }
  throw new AiError("INVALID_OUTPUT", "The model did not return valid output.");
}
