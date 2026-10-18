import { query } from "../../db.js";
import { isProduction } from "../../flags.js";
import { costOf, PRICE_VERSION } from "./pricing.js";

// Speech-to-text for voice answers, via any OpenAI-compatible transcription API
// (default: Groq Whisper). With no key, development uses a fake transcriber and
// production has no speech-to-text, which turns voice answers off.
//
//   GROQ_API_KEY   enables Groq; STT_MODEL / STT_BASE_URL override the defaults.
const env = process.env;
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "whisper-large-v3-turbo";
const TIMEOUT_MS = 30_000;
// Whisper tends to drop hesitations; a disfluent prompt nudges it to keep them, and
// technical vocabulary helps with system design terms.
const PROMPT = "Um, so, uh, I'd put a load balancer in front of the API, like, and then, hmm, shard the Postgres database. Kafka, Redis, CDN, p99 latency, QPS.";

const provider = env.GROQ_API_KEY ? "groq" : isProduction ? "none" : "fake";

export const speechConfig = {
  provider,
  enabled: provider !== "none",
  model: provider === "fake" ? "fake" : env.STT_MODEL || DEFAULT_MODEL,
  baseUrl: (env.STT_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
};

export class SpeechError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

const EXTENSIONS = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/wav": "wav" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callProvider({ bytes, mimeType }) {
  for (let attempt = 0; ; attempt += 1) {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), `answer.${EXTENSIONS[mimeType] || "webm"}`);
    form.append("model", speechConfig.model);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("language", "en");
    form.append("temperature", "0");
    form.append("prompt", PROMPT);

    let response;
    try {
      response = await fetch(`${speechConfig.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      if (error.name === "TimeoutError") throw new SpeechError("TIMEOUT", "Speech-to-text timed out.");
      if (attempt < 1) { await sleep(800); continue; }
      throw new SpeechError("NETWORK", "Could not reach the speech-to-text service.", error.message);
    }
    if (response.ok) return { payload: await response.json(), attempts: attempt + 1 };

    // One quick retry for a brief rate limit or a provider hiccup; longer waits would
    // keep the learner staring at a spinner, so those fail fast with a clear message.
    const wait = Number(response.headers.get("retry-after"));
    const retryable = response.status >= 500 || (response.status === 429 && Number.isFinite(wait) && wait <= 5);
    if (retryable && attempt < 1) { await sleep(response.status === 429 ? wait * 1000 : 800); continue; }
    const detail = (await response.text().catch(() => "")).slice(0, 400);
    const code = response.status === 429 ? "RATE_LIMITED" : [401, 403].includes(response.status) ? "AUTH" : response.status === 400 ? "UNREADABLE" : "PROVIDER_ERROR";
    throw new SpeechError(code, `Speech-to-text returned ${response.status}.`, detail);
  }
}

// A deterministic stand-in: a hesitation, a repeat and one long pause, so the
// delivery numbers have something to count in development and tests.
function fakeTranscription(durationMs) {
  const text = "Um, so I would I would put a cache in front of the database, and, uh, shard by user id.";
  const tokens = text.split(" ");
  const seconds = Math.max(durationMs / 1000, tokens.length * 0.3 + 2.5);
  const step = (seconds - 2.5) / tokens.length;
  let at = 0;
  const words = tokens.map((word, index) => {
    if (index === 10) at += 2.5;
    const entry = { word, start: at, end: at + step * 0.8 };
    at += step;
    return entry;
  });
  return { text, words, duration: seconds };
}

const HESITATIONS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "hmm", "mm", "mhm"]);
const FILLER_PHRASES = ["you know", "i mean", "kind of", "sort of", "basically", "literally"];
const LONG_PAUSE_S = 2;

const normalize = (word) => word.toLowerCase().replace(/[^a-z0-9']/g, "");

// Delivery numbers from the word timings: plain arithmetic, no model judgment.
export function deliveryFrom({ text, words }) {
  const tokens = (words?.length ? words : text.split(/\s+/).map((word) => ({ word }))).filter((entry) => normalize(entry.word));
  const normalized = tokens.map((entry) => normalize(entry.word));
  const spoken = normalized.filter((word) => !HESITATIONS.has(word));
  const timed = tokens.filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end));
  const speakingMs = timed.length ? Math.round((timed.at(-1).end - timed[0].start) * 1000) : null;

  let longPauses = 0;
  let longestPauseMs = 0;
  for (let index = 1; index < timed.length; index += 1) {
    const gap = timed[index].start - timed[index - 1].end;
    if (gap >= LONG_PAUSE_S) longPauses += 1;
    longestPauseMs = Math.max(longestPauseMs, Math.round(gap * 1000));
  }

  let repeats = 0;
  for (let index = 1; index < spoken.length; index += 1) if (spoken[index] === spoken[index - 1]) repeats += 1;
  // Two-word restarts like "I would I would".
  for (let index = 3; index < spoken.length; index += 1) {
    if (spoken[index - 3] === spoken[index - 1] && spoken[index - 2] === spoken[index] && spoken[index - 1] !== spoken[index]) repeats += 1;
  }

  const lower = ` ${normalized.join(" ")} `;
  const fillerPhrases = FILLER_PHRASES.reduce((sum, phrase) => sum + (lower.split(` ${phrase} `).length - 1), 0);

  return {
    words: spoken.length,
    speakingMs,
    wordsPerMinute: speakingMs && speakingMs > 3000 ? Math.round(spoken.length / (speakingMs / 60_000)) : null,
    hesitations: normalized.length - spoken.length,
    fillerPhrases,
    longPauses,
    longestPauseMs,
    repeats,
  };
}

async function recordUsage({ userId, sessionId, outcome, attempts, latencyMs, durationMs }) {
  // Billed by audio length; a request refused before transcribing costs nothing.
  const billed = outcome === "ok" || outcome === "timeout" || outcome === "invalid_output";
  const audioMs = Number.isFinite(durationMs) ? Math.round(durationMs) : null;
  const { costUsd, priceVersion } = billed ? costOf({ model: speechConfig.model, audioMs }) : { costUsd: 0, priceVersion: PRICE_VERSION };
  try {
    await query(
      `insert into ai_usage (user_id, session_id, task, provider, model, outcome, attempts, latency_ms, audio_ms, cost_usd, price_version)
       values ($1, $2, 'transcribe', $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId ?? null, sessionId ?? null, speechConfig.provider, speechConfig.model, outcome, attempts, latencyMs, audioMs, costUsd, priceVersion]
    );
  } catch (error) {
    console.error("[stt] could not record usage:", error.message);
  }
  console.log(`[stt] transcribe ${outcome} model=${speechConfig.model} audio=${Math.round(durationMs / 1000)}s ${latencyMs}ms`);
}

// Transcribes one recording. Returns { text, delivery, model }; the text is verbatim,
// fillers included, so it reads like the learner typed what they said.
export async function transcribe({ bytes, mimeType, durationMs, userId, sessionId }) {
  if (!speechConfig.enabled) throw new SpeechError("DISABLED", "Speech-to-text is not configured.");
  const started = Date.now();
  let result;
  let attempts = 1;
  try {
    if (speechConfig.provider === "fake") {
      await sleep(300);
      result = fakeTranscription(durationMs);
    } else {
      const response = await callProvider({ bytes, mimeType });
      attempts = response.attempts;
      result = { text: String(response.payload.text || ""), words: Array.isArray(response.payload.words) ? response.payload.words : [] };
    }
  } catch (error) {
    await recordUsage({ userId, sessionId, outcome: (error.code || "error").toLowerCase(), attempts, latencyMs: Date.now() - started, durationMs });
    if (error instanceof SpeechError) console.error(`[stt] ${error.code}:`, error.detail || error.message);
    throw error;
  }
  await recordUsage({ userId, sessionId, outcome: "ok", attempts, latencyMs: Date.now() - started, durationMs });
  const text = result.text.replace(/\s+/g, " ").trim();
  return { text, delivery: deliveryFrom({ text, words: result.words }), model: speechConfig.model };
}

export function describeSpeech() {
  return speechConfig.enabled ? `${speechConfig.provider}/${speechConfig.model}` : "disabled";
}
