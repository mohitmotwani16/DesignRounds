import { isProduction } from "./flags.js";
import { HttpError } from "./http.js";

// Cloudflare's published dummy credentials. They only prove the wiring:
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SECRET = "1x0000000000000000000000000000000AA";
const TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function credentials() {
  return {
    siteKey: (process.env.TURNSTILE_SITE_KEY || "").trim(),
    secret: (process.env.TURNSTILE_SECRET_KEY || "").trim(),
  };
}

// Public site key for the sign-in widget. Null until both keys are set, so the
// client never renders a widget the server will not check.
export function turnstileSiteKey() {
  const { siteKey, secret } = credentials();
  return siteKey && secret ? siteKey : null;
}

// Off in local development until keys are set (smoke tests and first-run sign-in).
// On in production even when keys are missing, so sign-in fails closed.
export function turnstileRequired() {
  return Boolean(turnstileSiteKey()) || isProduction;
}

// Stable id for the visitor's current network. IPv4 is the whole address, so a
// move from Wi-Fi to mobile data (or a VPN) no longer matches. IPv6 keeps the
// /64 prefix: the interface id rotates on its own and would nag people who
// never changed networks.
export function networkKey(ip) {
  if (!ip || typeof ip !== "string") return "";
  let value = ip.trim().toLowerCase();
  if (value.startsWith("::ffff:")) value = value.slice("::ffff:".length);
  if (value.includes(".")) return value;
  const halves = value.split("::");
  const head = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const tail = halves.length > 1 && halves[1] ? halves[1].split(":").filter(Boolean) : [];
  const groups = halves.length > 1
    ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail]
    : head;
  return groups.slice(0, 4).map((group) => group.replace(/^0+/, "") || "0").join(":");
}

export function describeTurnstile() {
  const { siteKey, secret } = credentials();
  if (siteKey && secret) return siteKey.startsWith("1x") || siteKey.startsWith("2x") || siteKey.startsWith("3x") ? "test" : "on";
  if (!siteKey && !secret) return isProduction ? "missing" : "off";
  return "misconfigured";
}

// Confirms the visitor passed the sign-in widget. Tokens are single-use and
// expire after five minutes; the secret never leaves the server.
export async function assertHuman(req, token, action = "sign-in") {
  if (!turnstileRequired()) return;
  const { siteKey, secret } = credentials();
  if (!siteKey || !secret) {
    throw new HttpError(503, "HUMAN_CHECK_UNAVAILABLE", "Human verification isn't configured yet. Try again later.");
  }
  if (!token || typeof token !== "string") {
    throw new HttpError(403, "HUMAN_CHECK_REQUIRED", "Confirm you're human, then try again.");
  }

  // The documented dummy token is not a secret. Accept it only with the dummy
  // secret, and only outside production, so automated tests don't call Cloudflare.
  if (!isProduction && secret === TEST_SECRET && token === TEST_TOKEN) return;

  let result;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: req.ip || undefined }),
      signal: AbortSignal.timeout(10_000),
    });
    result = await response.json().catch(() => ({}));
    if (!response.ok) result = { success: false, "error-codes": ["siteverify-unavailable"] };
  } catch (error) {
    console.error("[turnstile] siteverify failed:", error.message);
    throw new HttpError(503, "HUMAN_CHECK_UNAVAILABLE", "Human verification is temporarily unavailable. Try again in a moment.");
  }

  const hostname = typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
  const expectedHost = (req.hostname || "").toLowerCase();
  const actionOk = !result.action || result.action === action;
  if (!result.success || !actionOk || !hostname || hostname !== expectedHost) {
    console.error("[turnstile] rejected:", (result["error-codes"] || []).join(",") || "mismatch");
    throw new HttpError(403, "HUMAN_CHECK_FAILED", "Confirm you're human, then try again.");
  }
}
