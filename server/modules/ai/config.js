import { isProduction } from "../../flags.js";

// AI provider and per-task settings, resolved once from the environment.
//
//   AI_PROVIDER=gemini-vertex     Gemini on Google Cloud Vertex AI (OpenAI-compatible endpoint)
//   AI_PROVIDER=anthropic-vertex  Claude on Google Cloud Vertex AI
//   AI_PROVIDER=openai-compat     any OpenAI-compatible chat API with a key (default: Gemini AI Studio)
//   AI_PROVIDER=fake              canned, schema-valid output for tests and offline development
//
// Both Vertex providers need VERTEX_PROJECT_ID and Google Cloud credentials
// (gcp-auth.js), and must be chosen explicitly. With no AI_PROVIDER set, AI_API_KEY
// selects openai-compat; otherwise development falls back to fake and production
// runs with AI disabled.
//
// Conversational turns use the fast "chat" model; the final submission (review and
// communication feedback) uses the stronger "review" model.

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_MODELS = {
  "gemini-vertex": { chat: "gemini-3.8-flash", review: "gemini-3.1-pro-preview" },
  "anthropic-vertex": { chat: "claude-haiku-5-5", review: "claude-sonnet-5-5" },
};
const PROVIDERS = new Set(["gemini-vertex", "anthropic-vertex", "openai-compat", "fake", "none"]);

const env = process.env;

function inferProvider() {
  if (env.VERTEX_PROJECT_ID) throw new Error("VERTEX_PROJECT_ID is set: choose AI_PROVIDER=gemini-vertex or AI_PROVIDER=anthropic-vertex.");
  if (env.AI_API_KEY) return "openai-compat";
  return isProduction ? "none" : "fake";
}

const provider = env.AI_PROVIDER || inferProvider();
const onVertex = provider === "gemini-vertex" || provider === "anthropic-vertex";
if (!PROVIDERS.has(provider)) throw new Error(`AI_PROVIDER must be one of: ${[...PROVIDERS].join(", ")}.`);
if (provider === "fake" && isProduction) throw new Error("AI_PROVIDER=fake is not allowed in production.");
if (provider === "openai-compat" && !env.AI_API_KEY) throw new Error("AI_PROVIDER=openai-compat needs AI_API_KEY.");
if (onVertex && !env.VERTEX_PROJECT_ID) throw new Error(`AI_PROVIDER=${provider} needs VERTEX_PROJECT_ID.`);

const claude = provider === "anthropic-vertex";
const vertex = { projectId: env.VERTEX_PROJECT_ID || "", region: env.VERTEX_REGION || "global" };

// Vertex's OpenAI-compatible endpoint; the global location has no regional host prefix.
// The "us" and "eu" multi-regions have their own hosts.
function vertexOpenAiUrl({ projectId, region }) {
  const host = region === "global" ? "aiplatform.googleapis.com"
    : region === "us" || region === "eu" ? `aiplatform.${region}.rep.googleapis.com`
      : `${region}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${projectId}/locations/${region}/endpoints/openapi`;
}

const baseUrl = provider === "gemini-vertex" ? vertexOpenAiUrl(vertex) : (env.AI_BASE_URL || GEMINI_BASE_URL).replace(/\/+$/, "");

function vendorFor(url) {
  const host = new URL(url).hostname;
  if (host.endsWith("googleapis.com")) return "gemini";
  if (host.endsWith("groq.com")) return "groq";
  if (host.endsWith("openrouter.ai")) return "openrouter";
  return host;
}

function models() {
  if (provider === "fake") return { chat: "fake", review: "fake" };
  if (onVertex) {
    const defaults = DEFAULT_MODELS[provider];
    return { chat: env.AI_CHAT_MODEL || defaults.chat, review: env.AI_REVIEW_MODEL || defaults.review };
  }
  const model = env.AI_MODEL || DEFAULT_MODEL;
  return { chat: model, review: model };
}

const model = models();
const number = (value, fallback) => Number(value || fallback);

// Chat on Gemini answers from a generally available model in Mumbai (next to the
// Vercel functions in bom1) when the newest model on the shared global endpoint has
// not started replying within a few seconds. AI_CHAT_FALLBACK_MODEL=off disables it.
function chatFallback() {
  if (provider !== "gemini-vertex" || env.AI_CHAT_FALLBACK_MODEL === "off") return undefined;
  const fallbackModel = env.AI_CHAT_FALLBACK_MODEL || "gemini-3.5-flash";
  if (fallbackModel === model.chat) return undefined;
  return {
    model: fallbackModel,
    baseUrl: vertexOpenAiUrl({ projectId: vertex.projectId, region: env.AI_CHAT_FALLBACK_REGION || "asia-south1" }),
    // A healthy primary starts within about 3 s, so 4 s without a token means it stalled.
    afterMs: number(env.AI_CHAT_FALLBACK_AFTER_MS, 4_000),
    // The fallback only runs once the learner has already waited, so it skips the hidden
    // thinking pass: 3.5 Flash spent 200-600 thinking tokens at "low", which made a
    // fallback reply take 8-11 s. "minimal" is the lowest level Vertex accepts for it.
    effort: env.AI_CHAT_FALLBACK_EFFORT || "minimal",
  };
}
const fallback = chatFallback();

// The review model is a preview served only from the shared global pool, where a call
// can stall with no output until it times out (about one in twenty in testing). A
// learner who finished a round should get a review from a generally available model
// rather than an error after three minutes, so a review still running after
// `leashMs` (or failing outright) is answered by the fallback within the time left.
// AI_REVIEW_FALLBACK_MODEL=off disables it.
function reviewFallback(leashMs) {
  if (provider !== "gemini-vertex" || env.AI_REVIEW_FALLBACK_MODEL === "off") return undefined;
  const fallbackModel = env.AI_REVIEW_FALLBACK_MODEL || "gemini-3.5-flash";
  if (fallbackModel === model.review) return undefined;
  return {
    model: fallbackModel,
    baseUrl: vertexOpenAiUrl({ projectId: vertex.projectId, region: env.AI_CHAT_FALLBACK_REGION || "asia-south1" }),
    leashMs,
  };
}

// Gemini 3.8 Flash is also served from the "us" multi-region, a separate capacity pool
// that stayed responsive while the shared global pool stalled for tens of seconds.
// Chat runs there; the review model (3.1 Pro preview) is global-only.
const chatBaseUrl = provider === "gemini-vertex"
  ? vertexOpenAiUrl({ projectId: vertex.projectId, region: env.AI_CHAT_REGION || "us" })
  : undefined;

export const aiConfig = {
  provider,
  enabled: provider !== "none",
  baseUrl,
  apiKey: env.AI_API_KEY || "",
  vertex,
  models: model,
  vendor: provider === "openai-compat" ? vendorFor(baseUrl) : provider === "gemini-vertex" ? "vertex-gemini" : claude ? "vertex-claude" : provider,
  tasks: {
    // The final review. Thinking tokens count against maxTokens, so leave headroom.
    review: {
      model: model.review,
      effort: env.AI_REVIEW_EFFORT || "medium",
      maxTokens: number(env.AI_REVIEW_MAX_TOKENS, onVertex ? 16_000 : 12_000),
      timeoutMs: number(env.AI_REVIEW_TIMEOUT_MS, onVertex ? 180_000 : 120_000),
      // Reviews take 30-80 s; one still running at 100 s has usually stalled.
      fallback: reviewFallback(number(env.AI_REVIEW_FALLBACK_AFTER_MS, 100_000)),
    },
    // Conversational turns skip or shorten the hidden thinking pass so the first word
    // of a streamed reply is not stuck behind it. On OpenAI-style APIs a model that
    // rejects "none" is retried at "low" (see providers.js).
    interviewer: {
      model: model.chat,
      baseUrl: chatBaseUrl,
      fallback,
      // Vertex rejects "none" for Gemini (400), and Claude thinks briefly at "low".
      effort: env.AI_INTERVIEWER_EFFORT || (onVertex ? "low" : "none"),
      maxTokens: number(env.AI_INTERVIEWER_MAX_TOKENS, 4_000),
      timeoutMs: number(env.AI_INTERVIEWER_TIMEOUT_MS, 45_000),
    },
    interview_summary: { model: model.chat, baseUrl: chatBaseUrl, fallback, effort: "low", maxTokens: 3_000, timeoutMs: 45_000 },
    // Part of the final submission and runs alongside the review, so it must finish
    // well within the review's time.
    communication: { model: model.review, effort: "low", maxTokens: onVertex ? 6_000 : 4_000, timeoutMs: onVertex ? 150_000 : 90_000, fallback: reviewFallback(number(env.AI_COMMUNICATION_FALLBACK_AFTER_MS, 60_000)) },
    // Offline Problem Pack builds (server/modules/pks): the strong model, never on a
    // learner's request path, so it gets room to think and a long deadline.
    pack_build: { model: model.review, effort: "medium", maxTokens: 32_000, timeoutMs: 280_000 },
    // Checks a built pack's hidden facts against its guide; a short, cheap call.
    pack_consistency: { model: model.chat, baseUrl: chatBaseUrl, effort: "low", maxTokens: 3_000, timeoutMs: 60_000 },
    // Evaluation only (scripts/interview-sim.js): plays a candidate persona.
    candidate_sim: { model: model.chat, baseUrl: chatBaseUrl, fallback, effort: "low", maxTokens: 2_000, timeoutMs: 60_000 },
  },
};

export function describeAi() {
  if (!aiConfig.enabled) return "disabled";
  const { chat, review } = aiConfig.models;
  return chat === review ? `${aiConfig.vendor}/${chat}` : `${aiConfig.vendor}/chat=${chat},review=${review}`;
}
