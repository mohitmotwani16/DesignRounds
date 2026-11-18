import crypto from "node:crypto";
import { HttpError, createLimiter } from "../http.js";

export const GUEST_COOKIE = "dr_guest";
const guestCreateHour = createLimiter({ name: "guest-basics-session-hour", windowMs: 60 * 60_000, max: 15 });
const guestCreateDay = createLimiter({ name: "guest-basics-session-day", windowMs: 24 * 60 * 60_000, max: 40 });
const guestMessageMinute = createLimiter({ name: "guest-basics-message", windowMs: 60_000, max: 10 });

export const NUGGET_BASICS_PARENT = "nugget-basics";
/** FK target for interview_turns while the learner is still anonymous. */
export const GUEST_SYSTEM_USER_ID = "00000000-0000-4000-8000-000000000001";

export function hashGuestToken(token) {
  return crypto.createHash("sha256").update(`guest:${token}`).digest("hex");
}

export function newGuestToken() {
  return crypto.randomUUID();
}

export function guestCookieOptions() {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const base = { httpOnly: true, sameSite: "lax", maxAge, path: "/" };
  if (process.env.VERCEL || process.env.NODE_ENV === "production") base.secure = true;
  return base;
}

export function readGuestToken(req) {
  const raw = req.cookies?.[GUEST_COOKIE];
  if (!raw || typeof raw !== "string") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) return null;
  return raw;
}

/** Attach guest token hash when a dr_guest cookie is present. */
export function loadGuest(req, _res, next) {
  const token = readGuestToken(req);
  if (token) {
    req.guestToken = token;
    req.guestTokenHash = hashGuestToken(token);
  }
  next();
}

export function isBasicsPrompt(promptId) {
  return promptId === NUGGET_BASICS_PARENT;
}

export function isBasicsSession(session) {
  return session?.prompt_id === NUGGET_BASICS_PARENT || session?.session_kind === "nugget" && session?.nugget_id?.startsWith(`${NUGGET_BASICS_PARENT}/`);
}

export function sessionActorKey(req) {
  if (req.user?.id) return `user:${req.user.id}`;
  if (req.guestTokenHash) return `guest:${req.guestTokenHash}`;
  return null;
}

export async function assertGuestCanCreate(req) {
  const key = req.ip || "unknown";
  if (!(await guestCreateHour(key)) || !(await guestCreateDay(key))) {
    throw new HttpError(429, "RATE_LIMITED", "Too many Nugget-basics sessions from this network. Try again later or sign in.");
  }
}

export async function assertGuestCanMessage(req) {
  const key = req.guestTokenHash || req.ip || "unknown";
  if (!(await guestMessageMinute(key))) {
    throw new HttpError(429, "RATE_LIMITED", "Slow down a moment before sending another message.");
  }
}

/** Stable rate-limit subject for anonymous actors (per guest cookie, not shared GUEST_SYSTEM_USER_ID). */
export function guestRateKey(req) {
  return req.guestTokenHash ? `guest:${req.guestTokenHash}` : `guest-ip:${req.ip || "unknown"}`;
}