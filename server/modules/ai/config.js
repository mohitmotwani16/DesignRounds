import { isProduction } from "../../flags.js";

// AI provider and per-task settings, resolved once from the environment.
//
//   AI_PROVIDER=openai-compat  any OpenAI-compatible chat API (default: Google Gemini)
//   AI_PROVIDER=fake           canned, schema-valid output for tests and offline development
//
// With no AI_PROVIDER set, a configured AI_API_KEY selects openai-compat; otherwise
// development falls back to fake and production runs with AI disabled.

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-3.8-flash";
const PROVIDERS = new Set(["openai-compat", "fake", "none"]);

const env = process.env;

const provider = env.AI_PROVIDER || (env.AI_API_KEY ? "openai-compat" : isProduction ? "none" : "fake");
if (!PROVIDERS.has(provider)) throw new Error(`AI_PROVIDER must be one of: ${[...PROVIDERS].join(", ")}.`);
if (provider === "fake" && isProduction) throw new Error("AI_PROVIDER=fake is not allowed in production.");
if (provider === "openai-compat" && !env.AI_API_KEY) throw new Error("AI_PROVIDER=openai-compat needs AI_API_KEY.");

const baseUrl = (env.AI_BASE_URL || GEMINI_BASE_URL).replace(/\/+$/, "");

function vendorFor(url) {
  const host = new URL(url).hostname;
  if (host.endsWith("googleapis.com")) return "gemini";
  if (host.endsWith("groq.com")) return "groq";
  if (host.endsWith("openrouter.ai")) return "openrouter";
  return host;
}

export const aiConfig = {
  provider,
  enabled: provider !== "none",
  baseUrl,
  apiKey: env.AI_API_KEY || "",
  model: provider === "fake" ? "fake" : env.AI_MODEL || DEFAULT_MODEL,
  vendor: provider === "openai-compat" ? vendorFor(baseUrl) : provider,
  tasks: {
    review: {
      effort: env.AI_REVIEW_EFFORT || "medium",
      // Thinking tokens count against this on reasoning models, so leave headroom.
      maxTokens: Number(env.AI_REVIEW_MAX_TOKENS || 12_000),
      timeoutMs: Number(env.AI_REVIEW_TIMEOUT_MS || 120_000),
    },
    // Conversational turns skip the hidden thinking pass when the model allows it,
    // so the first word of a streamed reply is not stuck behind that pass. A model
    // that rejects "none" is retried at "low" (see providers.js).
    interviewer: {
      effort: env.AI_INTERVIEWER_EFFORT || "none",
      maxTokens: Number(env.AI_INTERVIEWER_MAX_TOKENS || 4_000),
      timeoutMs: Number(env.AI_INTERVIEWER_TIMEOUT_MS || 45_000),
    },
    interview_summary: { effort: "low", maxTokens: 3_000, timeoutMs: 45_000 },
    // Runs alongside the review, so it must finish well within the review's time.
    communication: { effort: "low", maxTokens: 4_000, timeoutMs: 90_000 },
  },
};

export function describeAi() {
  return aiConfig.enabled ? `${aiConfig.vendor}/${aiConfig.model}` : "disabled";
}
