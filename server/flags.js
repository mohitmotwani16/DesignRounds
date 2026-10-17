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
