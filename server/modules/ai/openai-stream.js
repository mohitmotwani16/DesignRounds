import { usageFrom } from "./pricing.js";

// Incremental reader for an OpenAI-compatible server-sent event stream.
// A chunk may end mid-line; the remainder is returned and must be passed back.
export function takeStreamLines(buffer) {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() ?? "";
  const data = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    data.push(trimmed.slice(5).trim());
  }
  return { rest, data };
}

export function contentFromChunk(payload) {
  const choice = payload.choices?.[0];
  const delta = choice?.delta?.content ?? choice?.message?.content;
  let text = "";
  if (typeof delta === "string") text = delta;
  else if (Array.isArray(delta)) text = delta.map((part) => (typeof part === "string" ? part : part?.text || "")).join("");
  return {
    text,
    finishReason: choice?.finish_reason ?? null,
    model: payload.model || null,
    inputTokens: payload.usage?.prompt_tokens ?? null,
    outputTokens: payload.usage?.completion_tokens ?? null,
    usage: payload.usage ? usageFrom(payload.usage) : null,
  };
}
