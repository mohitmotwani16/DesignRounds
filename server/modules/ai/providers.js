import { aiConfig } from "./config.js";
import { AiError } from "./errors.js";

const MAX_TRANSPORT_RETRIES = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelay(response, attempt) {
  const header = Number(response?.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0 && header <= 20) return header * 1000;
  return 1000 * 3 ** attempt + Math.random() * 400;
}

// One chat completion against an OpenAI-compatible endpoint (Gemini, Groq, OpenRouter, ...),
// constrained to `jsonSchema`. Retries rate limits, 5xx and network failures; never
// retries a timeout, since the provider may still be working on (and billing) it.
async function openAiCompatible({ messages, jsonSchema, effort, maxTokens, timeoutMs }) {
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

export async function complete(request) {
  if (aiConfig.provider === "openai-compat") return openAiCompatible(request);
  throw new AiError("DISABLED", "No AI provider is configured.");
}
