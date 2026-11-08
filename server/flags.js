// Runtime environment flags, resolved once. Every server module reads these instead
// of inspecting NODE_ENV itself.
//
// Vercel deployments (production and preview) always count as production, so their
// security posture never depends on NODE_ENV, which must stay unset in Vercel's
// project settings (setting it makes the build skip devDependencies).
const vercelEnv = process.env.VERCEL_ENV;

export const isProduction = process.env.NODE_ENV === "production" || vercelEnv === "production" || vercelEnv === "preview";

// "production" | "preview" | "development"
export const deploymentEnv = vercelEnv || (isProduction ? "production" : "development");

// Developer tools (e.g. switching your own account between Free and Plus) are on in
// development and can be turned off with DEV_TOOLS=false. They are always off in
// production, where their routes are not mounted at all.
export const devToolsEnabled = !isProduction && process.env.DEV_TOOLS !== "false";

// Voice answers in the live interview (transcribed with speech-to-text, see
// server/modules/ai/speech.js). On in development; opt-in elsewhere with
// VOICE_ANSWERS=true, and only effective when speech-to-text is configured.
export const voiceAnswersEnabled = process.env.VOICE_ANSWERS ? process.env.VOICE_ANSWERS === "true" : !isProduction;

const INTERVIEWER_ENGINES = new Set(["v2", "v3"]);

function defaultInterviewerVersion() {
  return isProduction ? "v2" : "v3";
}

function parseInterviewerVersion(raw) {
  const value = String(raw).trim().toLowerCase();
  if (value === "auto") return defaultInterviewerVersion();
  if (INTERVIEWER_ENGINES.has(value)) return value;
  console.warn(`[flags] Unknown INTERVIEWER_VERSION="${raw}"; expected v2, v3, or auto. Using v2.`);
  return "v2";
}

function resolveInterviewerVersion() {
  if (process.env.INTERVIEWER_VERSION) {
    return parseInterviewerVersion(process.env.INTERVIEWER_VERSION);
  }
  if (process.env.INTERVIEWER_V3 !== undefined) {
    console.warn("[flags] INTERVIEWER_V3 is deprecated; set INTERVIEWER_VERSION=v2, v3, or auto.");
    return process.env.INTERVIEWER_V3 === "true" ? "v3" : "v2";
  }
  return defaultInterviewerVersion();
}

// Which interviewer stack new rounds may use (docs/design/interview-conductor.md).
// v3: Interview Conductor when a published Problem Pack (or nugget mini-pack) is available.
// v2: legacy free-form interviewer (opening + interviewerTask).
// Unset env: auto — v3 in development, v2 in production/preview (same as INTERVIEWER_VERSION=auto).
// A session's engine is pinned at open time and never changes mid-round.
export const interviewerVersion = resolveInterviewerVersion();

export function conductorEnabledForNewRounds() {
  return interviewerVersion === "v3";
}
