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

// Small in-memory fixed-window limiter. Good enough for a single process; move to
// a shared store (e.g. Redis) only when running several API instances.
export function createLimiter({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();
  return function check(key) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
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
