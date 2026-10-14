import { waitUntil } from "@vercel/functions";
import { queryOne } from "./db.js";

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Wraps an async route so rejected promises reach the error middleware.
export const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, "INVALID_REQUEST", issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request.");
  }
  return result.data;
}

// Runs work after the response has been sent. Serverless platforms freeze an instance
// once its response is done, so the work is registered with the platform to keep the
// instance alive until it settles; a long-running server just lets it run.
export function afterResponse(promise) {
  waitUntil(promise);
}

// Fixed-window limiter backed by the rate_limits table, so a limit holds across every
// API instance. One atomic upsert per check: it starts a new window when the old one
// has expired, otherwise counts the hit. Resolves to true while under `max`.
export function createLimiter({ name, windowMs, max }) {
  return async function check(subject) {
    const row = await queryOne(
      `insert into rate_limits (key, count, reset_at) values ($1, 1, now() + make_interval(secs => $2::double precision))
       on conflict (key) do update set
         count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
         reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
       returning count`,
      [`${name}:${subject}`, windowMs / 1000]
    );
    return row.count <= max;
  };
}

// Rejects cross-site state-changing requests. Browsers cannot send a JSON
// content type cross-origin without a CORS preflight (which we never approve),
// and when an Origin header is present it must match this host.
export function sameOriginWrites(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin) {
    const allowed = new Set([req.get("host"), ...(process.env.APP_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean).map((value) => new URL(value).host)]);
    let host;
    try { host = new URL(origin).host; } catch { host = null; }
    if (!allowed.has(host)) return next(new HttpError(403, "BAD_ORIGIN", "Cross-site request rejected."));
  }
  if (req.method !== "DELETE" && !req.is("application/json")) {
    return next(new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON."));
  }
  next();
}
