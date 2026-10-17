import crypto from "node:crypto";
import express from "express";
import { query } from "../db.js";
import { HttpError, route } from "../http.js";

// Housekeeping run by the scheduler (Vercel Cron, daily). It deletes rows nothing reads
// any more. The run also counts as database activity, which keeps free-tier databases
// that pause when idle (e.g. Supabase) awake.
//
// The scheduler authenticates with `Authorization: Bearer <CRON_SECRET>`. Without
// CRON_SECRET the endpoint doesn't exist.
const LOGIN_CODE_RETENTION = "1 day";
// Voice recordings: kept for debugging and re-processing, then cleared. The transcript
// and delivery numbers stay with the round.
const VOICE_RETENTION = "30 days";

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.get("authorization") || "");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function runMaintenance() {
  const count = async (sql) => (await query(`with deleted as (${sql} returning 1) select count(*)::int as n from deleted`))[0].n;
  return {
    loginCodes: await count(`delete from login_codes where created_at < now() - interval '${LOGIN_CODE_RETENTION}'`),
    authSessions: await count("delete from auth_sessions where expires_at < now()"),
    rateLimits: await count("delete from rate_limits where reset_at < now()"),
    voiceRecordings: await count(`update interview_audio set data = null, purged_at = now()
      where data is not null and coalesce(transcribed_at, created_at) < now() - interval '${VOICE_RETENTION}'`),
  };
}

export const maintenanceRouter = express.Router();

maintenanceRouter.get("/internal/maintenance", route(async (req, res) => {
  if (!authorized(req)) throw new HttpError(404, "NOT_FOUND", "No such endpoint.");
  const started = Date.now();
  const deleted = await runMaintenance();
  console.log(`[maintenance] deleted ${JSON.stringify(deleted)} in ${Date.now() - started}ms`);
  res.json({ ok: true, deleted });
}));
