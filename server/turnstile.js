import { query } from "./db.js";
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

// A random id the browser keeps for diagnostics and sends as X-Diagnostic-Id. People
// see it as the "reference" in human-check errors, so a report can be matched to the
// recorded events. It identifies nothing on its own.
const DIAGNOSTIC_ID = /^[A-Z0-9]{8,32}$/;
export function diagnosticId(req) {
  const value = (req.get("x-diagnostic-id") || "").trim().toUpperCase();
  return DIAGNOSTIC_ID.test(value) ? value : null;
}

const withReference = (req, message) => {
  const id = diagnosticId(req);
  return id ? `${message} Reference: ${id}.` : message;
};

// The path of the page that sent this request. Never the query string: it can carry tokens.
function refererPath(req) {
  try {
    const url = new URL(req.get("referer") || "");
    return url.host === req.get("host") ? url.pathname.slice(0, 300) : null;
  } catch {
    return null;
  }
}

// Records one human-check event (issue #103) in human_check_events and the log. Vercel
// keeps runtime logs only briefly, so the table is what answers "why couldn't this
// person sign in" a day later. Recording never fails the request it describes.
export async function recordHumanCheck(req, { source = "server", action, outcome, errorCodes = [], userId = req.user?.id ?? null, email = null, page, detail = {} }) {
  const codes = errorCodes.filter((code) => typeof code === "string" && code).map((code) => code.slice(0, 60)).slice(0, 10);
  const clientId = diagnosticId(req);
  const requestId = req.get("x-vercel-id") || null;
  const who = userId ? `user=${userId}` : email ? "visitor(email)" : "visitor";
  const line = `[human-check] ${source} ${action} ${outcome}${codes.length ? ` codes=${codes.join(",")}` : ""} ${who} ref=${clientId || "-"}${requestId ? ` request=${requestId}` : ""}`;
  if (outcome === "passed") console.log(line);
  else console.warn(line, Object.keys(detail).length ? JSON.stringify(detail) : "");
  try {
    await query(
      `insert into human_check_events (source, action, outcome, error_codes, user_id, email, client_id, page, country, user_agent, request_id, detail)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        source,
        action.slice(0, 40),
        outcome.slice(0, 40),
        codes,
        userId,
        email ? email.toLowerCase() : null,
        clientId,
        page === undefined ? refererPath(req) : page,
        (req.get("x-vercel-ip-country") || "").slice(0, 8) || null,
        (req.get("user-agent") || "").slice(0, 400) || null,
        requestId ? requestId.slice(0, 200) : null,
        JSON.stringify(detail),
      ]
    );
  } catch (error) {
    console.error("[human-check] could not record event:", error.message);
  }
}

// Confirms the visitor passed the sign-in widget. Tokens are single-use and
// expire after five minutes; the secret never leaves the server. `email` is the
// address being signed in, when there is one, so a failed attempt can be found later.
export async function assertHuman(req, token, action = "sign-in", { email = null } = {}) {
  if (!turnstileRequired()) return;
  const record = (outcome, extra = {}) => recordHumanCheck(req, { action, outcome, email, ...extra });
  const { siteKey, secret } = credentials();
  if (!siteKey || !secret) {
    await record("not-configured");
    throw new HttpError(503, "HUMAN_CHECK_UNAVAILABLE", "Human verification isn't configured yet. Try again later.");
  }
  if (!token || typeof token !== "string") {
    await record("missing-token");
    throw new HttpError(403, "HUMAN_CHECK_REQUIRED", "Confirm you're human, then try again.");
  }

  // The documented dummy token is not a secret. Accept it only with the dummy
  // secret, and only outside production, so automated tests don't call Cloudflare.
  if (!isProduction && secret === TEST_SECRET && token === TEST_TOKEN) {
    await record("passed", { detail: { test: true } });
    return;
  }

  const started = Date.now();
  let result;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: req.ip || undefined }),
      signal: AbortSignal.timeout(10_000),
    });
    result = await response.json().catch(() => ({}));
    if (!response.ok) result = { success: false, "error-codes": ["siteverify-unavailable"], status: response.status };
  } catch (error) {
    await record("unavailable", { errorCodes: [error.name === "TimeoutError" ? "siteverify-timeout" : "siteverify-unreachable"], detail: { message: error.message, elapsedMs: Date.now() - started } });
    throw new HttpError(503, "HUMAN_CHECK_UNAVAILABLE", withReference(req, "Human verification is temporarily unavailable. Try again in a moment."));
  }

  const hostname = typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
  const expectedHost = (req.hostname || "").toLowerCase();
  const actionOk = !result.action || result.action === action;
  const elapsedMs = Date.now() - started;
  if (!result.success || !actionOk || !hostname || hostname !== expectedHost) {
    const codes = Array.isArray(result["error-codes"]) ? [...result["error-codes"]] : [];
    if (result.success && !actionOk) codes.push("action-mismatch");
    if (result.success && hostname !== expectedHost) codes.push("hostname-mismatch");
    await record("rejected", {
      errorCodes: codes,
      detail: { hostname: hostname || null, expectedHost, widgetAction: result.action ?? null, expectedAction: action, challengeTs: result.challenge_ts ?? null, status: result.status, elapsedMs },
    });
    throw new HttpError(403, "HUMAN_CHECK_FAILED", withReference(req, "Confirm you're human, then try again."));
  }
  await record("passed", { detail: { challengeTs: result.challenge_ts ?? null, elapsedMs } });
}
