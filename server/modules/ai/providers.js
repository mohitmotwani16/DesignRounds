import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";
import { contentFromChunk, takeStreamLines } from "./openai-stream.js";

const MAX_TRANSPORT_RETRIES = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rejectedReasoning = new Set();

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

async function openAiCompatibleOnce({ messages, jsonSchema, effort, maxTokens, timeoutMs }) {
  const body = {
    model: aiConfig.model,
    messages,
    max_tokens: maxTokens,
    response_format: { type: "json_schema", json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true } },
  };
  if (effort) body.reasoning_effort = effort;

  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiConfig.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
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
        model: payload.model || aiConfig.model,
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
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

// Same completion as `openAiCompatible`, but tokens are yielded as they arrive.
// A failure before the first token is retried; a stream that breaks after that is not,
// because the caller may already have shown the text.
export async function* streamComplete(request) {
  if (aiConfig.provider !== "openai-compat") throw new AiError("DISABLED", "No AI provider is configured.");
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
  const { messages, jsonSchema, effort, maxTokens, timeoutMs } = request;
  const body = {
    model: aiConfig.model,
    messages,
    max_tokens: maxTokens,
    stream: true,
    response_format: { type: "json_schema", json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true } },
  };
  if (effort) body.reasoning_effort = effort;

  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiConfig.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
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
      yield { type: "end", finishReason: piece.finishReason, model: piece.model || aiConfig.model, inputTokens: piece.inputTokens, outputTokens: piece.outputTokens, attempts: attempt + 1 };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let finishReason = null;
    let model = aiConfig.model;
    let inputTokens = null;
    let outputTokens = null;
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
            yield { type: "delta", text: piece.text };
          }
          if (piece.finishReason) finishReason = piece.finishReason;
          if (piece.model) model = piece.model;
          if (piece.inputTokens != null) inputTokens = piece.inputTokens;
          if (piece.outputTokens != null) outputTokens = piece.outputTokens;
        }
        if (done) break;
      }
    } catch (error) {
      if (error.name === "TimeoutError") throw new AiError("TIMEOUT", "AI request timed out.", { attempts: attempt + 1 });
      if (!yielded && attempt < MAX_TRANSPORT_RETRIES) { await sleep(retryDelay(null, attempt)); continue; }
      throw new AiError("NETWORK", "The AI reply was interrupted.", { cause: error.message, attempts: attempt + 1 });
    }

    yield { type: "end", finishReason, model, inputTokens, outputTokens, attempts: attempt + 1 };
    return;
  }
}

export async function complete(request) {
  if (aiConfig.provider === "openai-compat") return openAiCompatible(request);
  throw new AiError("DISABLED", "No AI provider is configured.");
}
