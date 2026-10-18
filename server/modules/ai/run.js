import { query } from "../../db.js";
import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";
import { createMessageExtractor } from "./message-stream.js";
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

async function recordUsage(entry) {
  if (entry.meter === false) return;
  try {
    await query(
      `insert into ai_usage (user_id, session_id, task, provider, model, outcome, attempts, input_tokens, output_tokens, latency_ms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [entry.userId ?? null, entry.sessionId ?? null, entry.task, aiConfig.vendor, entry.model, entry.outcome,
        entry.attempts ?? 1, entry.inputTokens ?? null, entry.outputTokens ?? null, entry.latencyMs]
    );
  } catch (error) {
    console.error("[ai] could not record usage:", error.message);
  }
  const cached = entry.cachedInputTokens ? ` cached=${entry.cachedInputTokens}` : "";
  console.log(`[ai] ${entry.task} ${entry.outcome} model=${entry.model} in=${entry.inputTokens ?? "?"}${cached} out=${entry.outputTokens ?? "?"} ${entry.latencyMs}ms`);
}

// Runs one AI task: builds its messages, calls the provider for schema-constrained
// JSON, validates the result, and gives the model one chance to repair invalid
// output. Every call is metered in ai_usage; no prompt or output text is logged.
//
// A task is { name, system, buildUser(input), output: zodSchema, fake(input) }.
export async function runTask(task, input, { userId, sessionId, meter = true } = {}) {
  const settings = aiConfig.tasks[task.name];
  const meta = { task: task.name, userId, sessionId, meter };

  if (aiConfig.provider === "fake") {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
    const data = task.output.parse(task.fake(input));
    await recordUsage({ ...meta, model: "fake", outcome: "ok", latencyMs: FAKE_LATENCY_MS });
    return { data, model: "fake" };
  }
  if (!aiConfig.enabled) throw new AiError("DISABLED", "No AI provider is configured.");

  const messages = [
    { role: "system", content: task.system },
    { role: "user", content: task.buildUser(input) },
  ];
  for (let round = 1; round <= 2; round += 1) {
    const started = Date.now();
    let completion;
    try {
      completion = await complete({ model: settings.model, messages, jsonSchema: jsonSchemaFor(task), effort: settings.effort, maxTokens: settings.maxTokens, timeoutMs: settings.timeoutMs });
    } catch (error) {
      await recordUsage({ ...meta, model: settings.model, outcome: (error.code || "error").toLowerCase(), attempts: error.detail?.attempts, latencyMs: Date.now() - started });
      if (error.detail) console.error(`[ai] ${task.name} ${error.code}:`, JSON.stringify(error.detail));
      throw error;
    }
    const usage = { model: completion.model, attempts: completion.attempts, inputTokens: completion.inputTokens, cachedInputTokens: completion.cachedInputTokens, outputTokens: completion.outputTokens, latencyMs: Date.now() - started };
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
export async function runTaskStream(task, input, { userId, sessionId, meter = true, onDelta, onReset } = {}) {
  const settings = aiConfig.tasks[task.name];
  const meta = { task: task.name, userId, sessionId, meter };

  if (aiConfig.provider === "fake") {
    const started = Date.now();
    const data = task.output.parse(task.fake(input));
    await emitInChunks(data.message ?? "", onDelta);
    await recordUsage({ ...meta, model: "fake", outcome: "ok", latencyMs: Date.now() - started });
    return { data, model: "fake" };
  }
  if (!aiConfig.enabled) throw new AiError("DISABLED", "No AI provider is configured.");

  const messages = [
    { role: "system", content: task.system },
    { role: "user", content: task.buildUser(input) },
  ];
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
    let inputTokens = null;
    let cachedInputTokens = null;
    let outputTokens = null;
    try {
      for await (const event of streamComplete({ model: settings.model, messages, jsonSchema: jsonSchemaFor(task), effort: settings.effort, maxTokens: settings.maxTokens, timeoutMs: settings.timeoutMs })) {
        if (event.type === "delta") {
          text += event.text;
          forward(extractor.push(event.text));
        } else {
          finishReason = event.finishReason;
          model = event.model;
          attempts = event.attempts;
          inputTokens = event.inputTokens;
          cachedInputTokens = event.cachedInputTokens;
          outputTokens = event.outputTokens;
        }
      }
    } catch (error) {
      await recordUsage({ ...meta, model: settings.model, outcome: (error.code || "error").toLowerCase(), attempts: error.detail?.attempts, latencyMs: Date.now() - started });
      if (error.detail) console.error(`[ai] ${task.name} ${error.code}:`, JSON.stringify(error.detail));
      throw error;
    }
    const usage = { model, attempts, inputTokens, cachedInputTokens, outputTokens, latencyMs: Date.now() - started };
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
