import crypto from "node:crypto";
import express from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { devToolsEnabled, isProduction } from "../flags.js";
import { deliveryMode, sendLoginCode } from "../email.js";
import { HttpError, createLimiter, parse, route } from "../http.js";

const SESSION_DAYS = 30;
const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_CODES_PER_EMAIL_PER_HOUR = 6;

// "__Host-" makes browsers reject the cookie unless it is Secure, host-only and path=/.
const COOKIE_NAME = isProduction ? "__Host-dr_session" : "dr_session";
const codeSecret = process.env.AUTH_SECRET || (() => {
  if (isProduction) throw new Error("AUTH_SECRET must be set in production.");
  return crypto.randomBytes(32).toString("hex");
})();

const ipCodeLimiter = createLimiter({ name: "ip-code", windowMs: 15 * 60_000, max: 20 });
const ipVerifyLimiter = createLimiter({ name: "ip-verify", windowMs: 15 * 60_000, max: 40 });

const emailSchema = z.string().trim().toLowerCase().max(254).email();
const requestCodeBody = z.object({ email: emailSchema });
const verifyCodeBody = z.object({ email: emailSchema, code: z.string().trim().regex(/^\d{6}$/, "must be 6 digits") });
const optionalText = (max) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const profileBody = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  headline: optionalText(120),
  targetRole: optionalText(60),
  experienceLevel: optionalText(40),
}).strict();
const deleteAccountBody = z.object({ confirmEmail: emailSchema });

const hashCode = (email, code) => crypto.createHmac("sha256", codeSecret).update(`${email}:${code}`).digest("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    headline: row.headline,
    targetRole: row.target_role,
    experienceLevel: row.experience_level,
    plan: row.plan,
    devTools: devToolsEnabled,
    onboarded: Boolean(row.onboarded_at),
    createdAt: row.created_at,
  };
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/", maxAge: SESSION_DAYS * 86_400_000 };
}

// Resolves the signed-in user from the session cookie, if any.
export const loadUser = route(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token && token.length <= 128) {
    const row = await queryOne(
      `select u.*, s.id as auth_session_id, s.last_seen_at as session_seen_at
         from auth_sessions s join users u on u.id = s.user_id
        where s.token_hash = $1 and s.expires_at > now()`,
      [hashToken(token)]
    );
    if (row) {
      req.user = row;
      req.authSessionId = row.auth_session_id;
      if (Date.now() - new Date(row.session_seen_at).getTime() > 60 * 60_000) {
        await query("update auth_sessions set last_seen_at = now() where id = $1", [row.auth_session_id]);
      }
    }
  }
  next();
});

export function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, "AUTH_REQUIRED", "Sign in to continue."));
  next();
}

export const identityRouter = express.Router();

identityRouter.post("/auth/request-code", route(async (req, res) => {
  const { email } = parse(requestCodeBody, req.body);
  if (!(await ipCodeLimiter(req.ip))) throw new HttpError(429, "RATE_LIMITED", "Too many code requests. Try again in a few minutes.");
  if (deliveryMode() === "unconfigured") throw new HttpError(503, "EMAIL_UNAVAILABLE", "Email sign-in is temporarily unavailable.");

  const recent = await queryOne(
    `select count(*)::int as count,
            max(created_at) as last_sent
       from login_codes where email = $1 and created_at > now() - interval '1 hour'`,
    [email]
  );
  if (recent.last_sent && Date.now() - new Date(recent.last_sent).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    throw new HttpError(429, "RESEND_COOLDOWN", `Wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`);
  }
  if (recent.count >= MAX_CODES_PER_EMAIL_PER_HOUR) {
    throw new HttpError(429, "RATE_LIMITED", "Too many codes requested for this email. Try again later.");
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await query("update login_codes set consumed_at = now() where email = $1 and consumed_at is null", [email]);
  await query(
    `insert into login_codes (email, code_hash, expires_at, request_ip)
     values ($1, $2, now() + make_interval(mins => $3::int), $4)`,
    [email, hashCode(email, code), CODE_TTL_MINUTES, req.ip]
  );
  try {
    await sendLoginCode(email, code, { expiresInMinutes: CODE_TTL_MINUTES });
  } catch (error) {
    console.error("[email] failed to send sign-in code:", error.message);
    throw new HttpError(502, "EMAIL_FAILED", "We couldn't send the email. Check the address and try again.");
  }

  const body = { ok: true, expiresInMinutes: CODE_TTL_MINUTES, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
  // Local development without an email provider: surface the code so sign-in is testable.
  if (deliveryMode() === "console") body.devCode = code;
  res.json(body);
}));

identityRouter.post("/auth/verify-code", route(async (req, res) => {
  const { email, code } = parse(verifyCodeBody, req.body);
  if (!(await ipVerifyLimiter(req.ip))) throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again in a few minutes.");

  const invalid = () => new HttpError(400, "INVALID_CODE", "That code is incorrect or has expired.");
  const pending = await queryOne(
    `select id from login_codes
      where email = $1 and consumed_at is null and expires_at > now()
      order by created_at desc limit 1`,
    [email]
  );
  if (!pending) throw invalid();

  // Count the attempt atomically before comparing, so parallel guesses can't exceed the cap.
  const attempt = await queryOne(
    `update login_codes set attempts = attempts + 1
      where id = $1 and attempts < $2 and consumed_at is null
      returning code_hash, attempts`,
    [pending.id, MAX_CODE_ATTEMPTS]
  );
  if (!attempt) throw new HttpError(400, "CODE_LOCKED", "Too many incorrect attempts. Request a new code.");
  if (!safeEqual(attempt.code_hash, hashCode(email, code))) {
    if (attempt.attempts >= MAX_CODE_ATTEMPTS) throw new HttpError(400, "CODE_LOCKED", "Too many incorrect attempts. Request a new code.");
    throw invalid();
  }
  const consumed = await queryOne("update login_codes set consumed_at = now() where id = $1 and consumed_at is null returning id", [pending.id]);
  if (!consumed) throw invalid();

  const user = await queryOne(
    `insert into users (email, last_login_at) values ($1, now())
     on conflict (email) do update set last_login_at = now()
     returning *`,
    [email]
  );
  const token = crypto.randomBytes(32).toString("base64url");
  await query(
    `insert into auth_sessions (user_id, token_hash, user_agent, expires_at)
     values ($1, $2, $3, now() + make_interval(days => $4::int))`,
    [user.id, hashToken(token), (req.get("user-agent") || "").slice(0, 300), SESSION_DAYS]
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ user: toPublicUser(user) });
}));

identityRouter.post("/auth/sign-out", route(async (req, res) => {
  if (req.authSessionId) await query("delete from auth_sessions where id = $1", [req.authSessionId]);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
}));

identityRouter.post("/auth/sign-out-everywhere", requireUser, route(async (req, res) => {
  await query("delete from auth_sessions where user_id = $1", [req.user.id]);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
}));

// Who is signed in, if anyone. Unlike /me, a visitor without a session is a normal
// answer (user: null), not an error, so page loads don't log failed requests.
identityRouter.get("/session", (req, res) => {
  res.json({ user: req.user ? toPublicUser(req.user) : null });
});

identityRouter.get("/me", requireUser, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

identityRouter.patch("/me", requireUser, route(async (req, res) => {
  const body = parse(profileBody, req.body);
  const columns = { displayName: "display_name", headline: "headline", targetRole: "target_role", experienceLevel: "experience_level" };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (body[key] === undefined) continue;
    values.push(body[key]);
    sets.push(`${column} = $${values.length}`);
  }
  if (body.displayName) sets.push("onboarded_at = coalesce(onboarded_at, now())");
  if (!sets.length) return res.json({ user: toPublicUser(req.user) });
  values.push(req.user.id);
  const user = await queryOne(`update users set ${sets.join(", ")}, updated_at = now() where id = $${values.length} returning *`, values);
  res.json({ user: toPublicUser(user) });
}));

identityRouter.delete("/me", requireUser, route(async (req, res) => {
  const { confirmEmail } = parse(deleteAccountBody, req.body);
  if (confirmEmail !== req.user.email) throw new HttpError(400, "CONFIRMATION_MISMATCH", "Type your account email to confirm deletion.");
  // Sessions, practice rounds, and diagram versions cascade with the user row.
  await query("delete from users where id = $1", [req.user.id]);
  await query("delete from login_codes where email = $1", [req.user.email]);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
}));
