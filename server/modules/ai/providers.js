import * as vertex from "./anthropic-vertex.js";
import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";
import { googleAccessToken } from "./gcp-auth.js";
import { contentFromChunk, takeStreamLines } from "./openai-stream.js";
import { usageFrom } from "./pricing.js";

const MAX_TRANSPORT_RETRIES = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rejectedReasoning = new Set();
const OPENAI_STYLE = new Set(["openai-compat", "gemini-vertex"]);

// Gemini on Vertex signs in with a short-lived Google Cloud token; other
// OpenAI-compatible APIs take a static key.
async function requestHeaders() {
  if (aiConfig.provider !== "gemini-vertex") return { Authorization: `Bearer ${aiConfig.apiKey}`, "Content-Type": "application/json" };
  try {
    return { Authorization: `Bearer ${await googleAccessToken()}`, "Content-Type": "application/json" };
  } catch (error) {
    throw new AiError("AUTH", "Could not authenticate with Google Cloud.", { cause: String(error?.message || error).slice(0, 600) });
  }
}

// Messages may carry content as cache-marked parts (see run.js messagesFromBlocks).
// OpenAI-style APIs cache by prefix on their own, so the parts are joined in order.
export function plainMessages(messages) {
  return messages.map((message) => (Array.isArray(message.content)
    ? { role: message.role, content: message.content.map((part) => part.text).join("\n\n") }
    : message));
}

// Vertex's OpenAI-compatible endpoint names Google's models with a publisher prefix.
function apiModel(model) {
  return aiConfig.provider === "gemini-vertex" && !model.includes("/") ? `google/${model}` : model;
}

// Tries the requested effort, then "low", when a model rejects a faster setting
// such as "none". A rejection is remembered so the next reply does not pay for it.
export function reasoningPlan(effort, rejected = rejectedReasoning) {
  if (!effort) return [undefined];
  if (rejected.has(effort) || effort === "low") return ["low"];
  return [effort, "low"];
}

function reasoningWasRejected(error) {
  const body = `${error.detail?.body || ""} ${error.message || ""}`;
  return error.detail?.status === 400 && /reasoning_effort|thinking level|thinking_level/i.test(body);
}

function retryDelay(response, attempt) {
  const header = Number(response?.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0 && header <= 20) return header * 1000;
  return 1000 * 3 ** attempt + Math.random() * 400;
}

// One chat completion against an OpenAI-compatible endpoint (Gemini, Groq, OpenRouter, ...),
// constrained to `jsonSchema`. Retries rate limits, 5xx and network failures; never
// retries a timeout, since the provider may still be working on (and billing) it.
async function openAiCompatible(request) {
  let lastError;
  const plans = reasoningPlan(request.effort);
  for (let index = 0; index < plans.length; index += 1) {
    try {
      return await openAiCompatibleOnce({ ...request, effort: plans[index] });
    } catch (error) {
      lastError = error;
      if (index < plans.length - 1 && reasoningWasRejected(error)) {
        rejectedReasoning.add(plans[index]);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function openAiCompatibleOnce({ model, baseUrl = aiConfig.baseUrl, messages, jsonSchema, effort, maxTokens, timeoutMs }) {
  const body = {
    model: apiModel(model),
    messages: plainMessages(messages),
    max_tokens: maxTokens,
    response_format: { type: "json_schema", json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true } },
  };
  if (effort) body.reasoning_effort = effort;

  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: await requestHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (error.name === "TimeoutError") throw new AiError("TIMEOUT", "AI request timed out.", { attempts: attempt + 1 });
      if (attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(null, attempt)); continue; }
      throw new AiError("NETWORK", "Could not reach the AI provider.", { cause: error.message, attempts: attempt + 1 });
    }

    if (response.ok) {
      const payload = await response.json();
      const choice = payload.choices?.[0];
      return {
        text: typeof choice?.message?.content === "string" ? choice.message.content : "",
        finishReason: choice?.finish_reason ?? null,
        model: payload.model || model,
        ...usageFrom(payload.usage),
        attempts: attempt + 1,
      };
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(response, attempt)); continue; }
    const detail = (await response.text().catch(() => "")).slice(0, 600);
    const code = response.status === 429 ? "RATE_LIMITED" : [401, 403].includes(response.status) ? "AUTH" : "PROVIDER_ERROR";
    throw new AiError(code, `AI provider returned ${response.status}.`, { status: response.status, body: detail, attempts: attempt + 1 });
  }
}

function providerFailure(response, detail, attempts) {
  const code = response.status === 429 ? "RATE_LIMITED" : [401, 403].includes(response.status) ? "AUTH" : "PROVIDER_ERROR";
  return new AiError(code, `AI provider returned ${response.status}.`, { status: response.status, body: detail, attempts });
}

// A task may name a fallback { model, baseUrl, afterMs }: when the primary model has
// not started answering within `afterMs`, or fails before showing any text, the same
// request goes to the fallback inside what is left of the task's time budget. Shared
// pay-as-you-go capacity for new models can stall for tens of seconds; a learner
// should get a slightly older model's answer rather than wait.
const FALLBACK_CODES = new Set(["SLOW_START", "TIMEOUT", "RATE_LIMITED", "PROVIDER_ERROR", "NETWORK"]);
const MIN_FALLBACK_MS = 5_000;

function fallbackAllowed(error, remaining) {
  return error instanceof AiError && FALLBACK_CODES.has(error.code) && remaining >= MIN_FALLBACK_MS;
}

function fallbackRequest(request, error, elapsed) {
  const { fallback } = request;
  console.warn(`[ai] ${request.model} ${error.code} after ${elapsed}ms; answering with ${fallback.model} instead`);
  return { ...request, model: fallback.model, baseUrl: fallback.baseUrl, timeoutMs: request.timeoutMs - elapsed, fallback: undefined };
}

async function completeWithFallback(request) {
  const { fallback } = request;
  if (!fallback) return openAiCompatible(request);
  const started = Date.now();
  try {
    // Without streaming there is no first token to watch, so the primary gets a shorter leash.
    return await openAiCompatible({ ...request, timeoutMs: Math.min(request.timeoutMs, fallback.afterMs * 3) });
  } catch (error) {
    const elapsed = Date.now() - started;
    if (!fallbackAllowed(error, request.timeoutMs - elapsed)) throw error;
    const completion = await openAiCompatible(fallbackRequest(request, error, elapsed));
    return { ...completion, abandoned: [{ model: request.model, code: error.code, latencyMs: elapsed }] };
  }
}

// Same completion as `openAiCompatible`, but tokens are yielded as they arrive.
// A failure before the first token is retried; a stream that breaks after that is not,
// because the caller may already have shown the text.
export async function* streamComplete(request) {
  if (aiConfig.provider === "anthropic-vertex") {
    yield* vertex.streamComplete(request);
    return;
  }
  if (!OPENAI_STYLE.has(aiConfig.provider)) throw new AiError("DISABLED", "No AI provider is configured.");
  const { fallback } = request;
  if (!fallback) {
    yield* streamWithPlans(request);
    return;
  }
  const started = Date.now();
  let shown = false;
  try {
    for await (const event of streamWithPlans({ ...request, firstTokenMs: fallback.afterMs })) {
      if (event.type === "delta") shown = true;
      yield event;
    }
  } catch (error) {
    const elapsed = Date.now() - started;
    if (shown || !fallbackAllowed(error, request.timeoutMs - elapsed)) throw error;
    yield { type: "abandoned", model: request.model, code: error.code, latencyMs: elapsed };
    yield* streamWithPlans(fallbackRequest(request, error, elapsed));
  }
}

async function* streamWithPlans(request) {
  let lastError;
  const plans = reasoningPlan(request.effort);
  for (let index = 0; index < plans.length; index += 1) {
    try {
      yield* streamCompleteOnce({ ...request, effort: plans[index] });
      return;
    } catch (error) {
      lastError = error;
      if (index < plans.length - 1 && reasoningWasRejected(error)) {
        rejectedReasoning.add(plans[index]);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function* streamCompleteOnce(request) {
  const { model: requestedModel, baseUrl = aiConfig.baseUrl, firstTokenMs, messages, jsonSchema, effort, maxTokens, timeoutMs } = request;
  const body = {
    model: apiModel(requestedModel),
    messages: plainMessages(messages),
    max_tokens: maxTokens,
    stream: true,
    // Without this an OpenAI-style stream may end with no usage, and the call can't be priced.
    stream_options: { include_usage: true },
    response_format: { type: "json_schema", json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true } },
  };
  if (effort) body.reasoning_effort = effort;

  // `firstTokenMs` cuts the call off if no content has arrived by then.
  const slow = new AbortController();
  const timer = firstTokenMs ? setTimeout(() => slow.abort(), firstTokenMs) : null;
  const slowStart = (attempts) => new AiError("SLOW_START", `No reply within ${firstTokenMs} ms.`, { attempts });
  const signal = timer ? AbortSignal.any([AbortSignal.timeout(timeoutMs), slow.signal]) : AbortSignal.timeout(timeoutMs);
  // A consumer that stops early (the Conductor's move gate) must not leave the
  // provider streaming into nowhere: the open body is cancelled on the way out.
  let activeReader = null;

  try {
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: await requestHeaders(),
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (slow.signal.aborted) throw slowStart(attempt + 1);
      if (error.name === "TimeoutError") throw new AiError("TIMEOUT", "AI request timed out.", { attempts: attempt + 1 });
      if (attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(null, attempt)); continue; }
      throw new AiError("NETWORK", "Could not reach the AI provider.", { cause: error.message, attempts: attempt + 1 });
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(response, attempt)); continue; }
      const detail = (await response.text().catch(() => "")).slice(0, 600);
      throw providerFailure(response, detail, attempt + 1);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const payload = await response.json();
      const piece = contentFromChunk(payload);
      if (piece.text) yield { type: "delta", text: piece.text };
      yield { type: "end", finishReason: piece.finishReason, model: piece.model || requestedModel, ...piece.usage, attempts: attempt + 1 };
      return;
    }

    const reader = response.body.getReader();
    activeReader = reader;
    const decoder = new TextDecoder();
    let pending = "";
    let finishReason = null;
    let model = requestedModel;
    let usage = {};
    let yielded = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value || new Uint8Array(), { stream: !done });
        const parsed = takeStreamLines(pending);
        pending = parsed.rest;
        for (const data of parsed.data) {
          if (!data || data === "[DONE]") continue;
          let json;
          try { json = JSON.parse(data); } catch { continue; }
          const piece = contentFromChunk(json);
          if (piece.text) {
            yielded = true;
            if (timer) clearTimeout(timer);
            yield { type: "delta", text: piece.text };
          }
          if (piece.finishReason) finishReason = piece.finishReason;
          if (piece.model) model = piece.model;
          if (piece.usage) usage = piece.usage;
        }
        if (done) { activeReader = null; break; }
      }
    } catch (error) {
      activeReader = null;
      if (slow.signal.aborted && !yielded) throw slowStart(attempt + 1);
      if (error.name === "TimeoutError") throw new AiError("TIMEOUT", "AI request timed out.", { attempts: attempt + 1 });
      if (!yielded && attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(null, attempt)); continue; }
      throw new AiError("NETWORK", "The AI reply was interrupted.", { cause: error.message, attempts: attempt + 1 });
    }

    yield { type: "end", finishReason, model, ...usage, attempts: attempt + 1 };
    return;
  }
  } finally {
    if (timer) clearTimeout(timer);
    activeReader?.cancel().catch(() => {});
  }
}

// `request` is { model, messages, jsonSchema, effort, maxTokens, timeoutMs, fallback? }.
export async function complete(request) {
  if (aiConfig.provider === "anthropic-vertex") return vertex.complete(request);
  if (OPENAI_STYLE.has(aiConfig.provider)) return completeWithFallback(request);
  throw new AiError("DISABLED", "No AI provider is configured.");
}
