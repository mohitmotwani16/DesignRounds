import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// What each AI call cost, priced when it is recorded (server/content/pricing.json) so a
// later price change doesn't rewrite history. Every row in ai_usage keeps its full token
// breakdown too, so a corrected price table can re-price old rows.

const pricingFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "pricing.json");
const table = JSON.parse(readFileSync(pricingFile, "utf8"));
export const PRICE_VERSION = table.version;

// "google/gemini-3.8-flash", "publishers/google/models/gemini-3.8-flash@001" -> "gemini-3.8-flash"
export function modelKey(model) {
  return String(model ?? "").toLowerCase().replace(/^.*\//, "").replace(/@.*$/, "");
}

export function priceFor(model, at = new Date()) {
  const periods = table.models[modelKey(model)];
  if (!periods) return null;
  const day = new Date(at).toISOString().slice(0, 10);
  return periods.find((period) => (!period.from || period.from <= day) && (!period.until || day < period.until)) ?? null;
}

// Token usage from an OpenAI-compatible response. Vertex Gemini reports thinking tokens
// apart from completion_tokens (total = prompt + completion + thinking), OpenAI counts them
// inside completion_tokens (total = prompt + completion); total - prompt - completion is
// right for both, so thinking is never dropped or double-counted.
export function usageFrom(usage) {
  if (!usage) return {};
  const inputTokens = usage.prompt_tokens ?? null;
  const outputTokens = usage.completion_tokens ?? null;
  const reported = usage.completion_tokens_details?.reasoning_tokens ?? null;
  const reasoningTokens = usage.total_tokens != null && inputTokens != null && outputTokens != null
    ? Math.max(0, usage.total_tokens - inputTokens - outputTokens)
    : reported;
  return { inputTokens, cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? null, outputTokens, reasoningTokens };
}

// A rough token count for text we sent or received but got no usage for (an aborted
// call); such rows are flagged cost_estimated.
export const estimateTokens = (chars) => Math.ceil(chars / 4);

// { costUsd, priceVersion } or { costUsd: null } when the model has no price or the
// usage needed to price it is missing.
export function costOf({ model, at = new Date(), inputTokens, cachedInputTokens, cacheWriteTokens, outputTokens, reasoningTokens, audioMs }) {
  const price = priceFor(model, at);
  if (!price) return { costUsd: null, priceVersion: null };
  if (price.unit === "audio") {
    if (audioMs == null) return { costUsd: null, priceVersion: null };
    const seconds = Math.max(audioMs / 1000, price.minSeconds ?? 0);
    return { costUsd: round((seconds / 3600) * price.perHour), priceVersion: PRICE_VERSION };
  }
  if (inputTokens == null || outputTokens == null) return { costUsd: null, priceVersion: null };
  const tier = price.longContext && inputTokens > price.longContext.above ? { ...price, ...price.longContext } : price;
  const cached = Math.min(cachedInputTokens ?? 0, inputTokens);
  const written = Math.min(cacheWriteTokens ?? 0, inputTokens - cached);
  const fresh = inputTokens - cached - written;
  const dollars = fresh * tier.input
    + cached * (tier.cachedInput ?? tier.input)
    + written * (tier.cacheWrite ?? tier.input)
    + (outputTokens + (reasoningTokens ?? 0)) * tier.output;
  return { costUsd: round(dollars / 1_000_000), priceVersion: PRICE_VERSION };
}

const round = (value) => Math.round(value * 1e8) / 1e8;
