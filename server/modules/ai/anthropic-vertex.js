import Anthropic from "@anthropic-ai/sdk";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";
import { vertexCredentials } from "./gcp-auth.js";
import { toClaudeSchema } from "./schema.js";

// Claude on Google Cloud Vertex AI, behind the same contract as the OpenAI-compatible
// provider: OpenAI-style messages in, schema-constrained JSON text out.
//
// Every call streams, so a long review never sits on an idle connection. One deadline
// covers the whole call, retries included. Rate limits, overload, 5xx and network
// failures are retried; a timeout never is, since Vertex may still be working on (and
// billing) it. A streamed reply that breaks after its first visible token is not
// retried either, because the learner may already be reading it.

const MAX_TRANSPORT_RETRIES = 2;
const claudeSchemas = new WeakMap();
let client;

function vertexClient() {
  client ??= new AnthropicVertex({
    projectId: aiConfig.vertex.projectId,
    region: aiConfig.vertex.region,
    maxRetries: 0,
    ...vertexCredentials().options,
  });
  return client;
}

// Tests swap in a stub with the same `messages.stream` surface.
export function setVertexClientForTests(stub) {
  client = stub;
}

function claudeSchemaFor(jsonSchema) {
  if (!claudeSchemas.has(jsonSchema)) claudeSchemas.set(jsonSchema, toClaudeSchema(jsonSchema.schema));
  return claudeSchemas.get(jsonSchema);
}

// "none" asks for no thinking pass. Each model spells that differently; Opus and
// Fable can't turn thinking off at all, so low effort is the closest they get.
function thinkingOff(model) {
  if (model.startsWith("claude-sonnet-5-5")) return { type: "between_tools" };
  if (/^claude-(opus-5-5|fable|mythos)/.test(model)) return undefined;
  return { type: "disabled" };
}

// Content given as parts (run.js messagesFromBlocks) keeps its stability boundaries:
// each part marked `cache` ends a stable layer and gets a cache breakpoint. Claude
// allows four; context blocks use at most three.
const MAX_BREAKPOINTS = 4;

function textBlocks(content, budget) {
  const parts = Array.isArray(content) ? content : [{ text: content, cache: false }];
  return parts.filter((part) => part.text).map((part) => {
    const blockParam = { type: "text", text: part.text };
    if (part.cache && budget.left > 0) {
      blockParam.cache_control = { type: "ephemeral" };
      budget.left -= 1;
    }
    return blockParam;
  });
}

export function buildParams({ model, messages, jsonSchema, effort, maxTokens }) {
  const budget = { left: MAX_BREAKPOINTS };
  const systemMessages = messages.filter((message) => message.role === "system");
  // A plain-string system prompt is identical on every call of its task, so it is
  // cached as a whole: repeat turns and reviews read it at a tenth of the input price.
  const system = systemMessages.flatMap((message) => textBlocks(Array.isArray(message.content) ? message.content : [{ text: message.content, cache: true }], budget));
  const params = {
    model,
    max_tokens: maxTokens,
    messages: messages.filter((message) => message.role !== "system").map(({ role, content }) => ({
      role,
      content: Array.isArray(content) ? textBlocks(content, budget) : content,
    })),
    output_config: { format: { type: "json_schema", schema: claudeSchemaFor(jsonSchema) } },
  };
  if (system.length) params.system = system;
  if (effort === "none") {
    const thinking = thinkingOff(model);
    if (thinking) params.thinking = thinking;
    params.output_config.effort = "low";
  } else if (effort) {
    params.output_config.effort = effort;
  }
  return params;
}

function isRetryable(error) {
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) return false;
  if (error instanceof Anthropic.APIConnectionError) return true;
  return error instanceof Anthropic.APIError && (error.status === 429 || error.status >= 500);
}

function retryDelay(error, attempt) {
  const header = Number(error?.headers?.get?.("retry-after"));
  if (Number.isFinite(header) && header > 0 && header <= 20) return header * 1000;
  return 1000 * 3 ** attempt + Math.random() * 400;
}

function toAiError(error, deadline, attempts) {
  if (error instanceof AiError) {
    error.detail = { ...error.detail, attempts };
    return error;
  }
  if (deadline.aborted || error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiError("TIMEOUT", "AI request timed out.", { attempts });
  }
  if (error instanceof Anthropic.APIError && error.status) {
    const { status } = error;
    // 404 on Vertex means the model isn't enabled in Model Garden for this project or region.
    const code = status === 429 || status === 529 ? "RATE_LIMITED"
      : status === 401 || status === 403 ? "AUTH"
        : status === 404 ? "MISCONFIGURED"
          : "PROVIDER_ERROR";
    return new AiError(code, `AI provider returned ${status}.`, { status, body: String(error.message).slice(0, 600), requestId: error.requestID, attempts });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiError("NETWORK", "Could not reach the AI provider.", { cause: error.message, attempts });
  }
  // Anything else comes from google-auth-library: missing, malformed or rejected credentials.
  return new AiError("AUTH", "Could not authenticate with Google Cloud.", { cause: String(error?.message || error).slice(0, 600), attempts });
}

function endEvent(message) {
  if (message.stop_reason === "refusal") {
    throw new AiError("REFUSED", "The model declined this request.", { category: message.stop_details?.category ?? null });
  }
  const usage = message.usage;
  const cached = usage.cache_read_input_tokens ?? 0;
  return {
    type: "end",
    finishReason: ["max_tokens", "model_context_window_exceeded"].includes(message.stop_reason) ? "length" : message.stop_reason,
    model: message.model,
    inputTokens: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + cached,
    cachedInputTokens: cached,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    // Claude's output_tokens already include thinking.
    outputTokens: usage.output_tokens,
    reasoningTokens: 0,
  };
}

// Yields { type: "delta", text } for each piece of visible text and finally
// { type: "end", ... }. With `restartable`, a stream that breaks mid-reply is
// retried after a { type: "reset" } event tells the caller to drop what it has.
async function* run(request, { restartable }) {
  const params = buildParams(request);
  const deadline = AbortSignal.timeout(request.timeoutMs);
  const expires = Date.now() + request.timeoutMs;

  for (let attempt = 0; ; attempt += 1) {
    let yielded = false;
    try {
      const stream = vertexClient().messages.stream(params, { signal: deadline });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
          yielded = true;
          yield { type: "delta", text: event.delta.text };
        }
      }
      yield { ...endEvent(await stream.finalMessage()), attempts: attempt + 1 };
      return;
    } catch (error) {
      const delay = retryDelay(error, attempt);
      const canRetry = isRetryable(error) && attempt < MAX_TRANSPORT_RETRIES && Date.now() + delay < expires && (!yielded || restartable);
      if (!canRetry) throw toAiError(error, deadline, attempt + 1);
      console.warn(`[ai] ${request.model} attempt ${attempt + 1} failed (${error.status || error.constructor.name}); retrying in ${Math.round(delay)} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (yielded) yield { type: "reset" };
    }
  }
}

export async function* streamComplete(request) {
  yield* run(request, { restartable: false });
}

export async function complete(request) {
  let text = "";
  let end;
  for await (const event of run(request, { restartable: true })) {
    if (event.type === "delta") text += event.text;
    else if (event.type === "reset") text = "";
    else end = event;
  }
  const { type, ...result } = end;
  return { text, ...result };
}
