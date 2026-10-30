import crypto from "node:crypto";
import express from "express";
import { query } from "../db.js";
import { isProduction } from "../flags.js";
import { HttpError, route } from "../http.js";
import { purgeInterviewAudioObjects } from "../object-storage.js";
import { processAnswerPools } from "./answers/worker.js";
import { packStore, processPackJobs } from "./pks/index.js";
import { buildPacksEnabled } from "./pks/worker.js";
import { pruneUcsVersions } from "./ucs/index.js";

// Housekeeping run by the scheduler (Vercel Cron, daily). It deletes rows nothing reads
// any more. The run also counts as database activity, which keeps free-tier databases
// that pause when idle (e.g. Supabase) awake.
//
// The scheduler authenticates with `Authorization: Bearer <CRON_SECRET>`. Without
// CRON_SECRET the endpoint doesn't exist.
const LOGIN_CODE_RETENTION = "1 day";
// Human-check diagnostics (issue #103): long enough to look into a report a few weeks later.
const HUMAN_CHECK_EVENT_RETENTION = "30 days";
// Raw voice recordings (Postgres bytea or R2 objects): 30-day TTL from transcription.
// interview_turns.content (verbatim transcript), answer_context, communication, and
// interview_audio.delivery stay until the round or account is deleted — never purged here.
const VOICE_RECORDING_TTL = "30 days";

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.get("authorization") || "");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function purgeVoiceRecordings() {
  const stale = await query(
    `select turn_id, storage_key from interview_audio
      where (data is not null or storage_key is not null)
        and transcribed_at is not null
        and transcribed_at < now() - interval '${VOICE_RECORDING_TTL}'`
  );
  await purgeInterviewAudioObjects(stale);
  const count = async (sql) => (await query(`with deleted as (${sql} returning 1) select count(*)::int as n from deleted`))[0].n;
  return count(`update interview_audio set data = null, storage_key = null, purged_at = now()
    where (data is not null or storage_key is not null)
      and transcribed_at is not null
      and transcribed_at < now() - interval '${VOICE_RECORDING_TTL}'`);
}

export async function runMaintenance() {
  const count = async (sql) => (await query(`with deleted as (${sql} returning 1) select count(*)::int as n from deleted`))[0].n;
  return {
    ucsVersions: await pruneUcsVersions(),
    retiredPacks: await packStore.pruneRetiredPacks(),
    loginCodes: await count(`delete from login_codes where created_at < now() - interval '${LOGIN_CODE_RETENTION}'`),
    authSessions: await count("delete from auth_sessions where expires_at < now()"),
    rateLimits: await count("delete from rate_limits where reset_at < now()"),
    humanCheckEvents: await count(`delete from human_check_events where created_at < now() - interval '${HUMAN_CHECK_EVENT_RETENTION}'`),
    voiceRecordings: await purgeVoiceRecordings(),
  };
}

export const maintenanceRouter = express.Router();

maintenanceRouter.get("/internal/maintenance", route(async (req, res) => {
  if (!authorized(req)) throw new HttpError(404, "NOT_FOUND", "No such endpoint.");
  const started = Date.now();
  const deleted = await runMaintenance();
  // Production cron is what drains the queue on Vercel. Local maintenance and
  // tests stay offline unless ANSWER_POOLS=build.
  const answerPools = process.env.ANSWER_POOLS === "build" || (isProduction && process.env.ANSWER_POOLS !== "off")
    ? await processAnswerPools({ limit: 2 })
    : { built: 0, failed: 0 };
  // Problem Pack builds call the strong model, so the cron builds only when asked to.
  const packs = buildPacksEnabled() ? await processPackJobs({ limit: 1 }) : { built: 0, failed: 0, deferred: 0 };
  console.log(`[maintenance] deleted ${JSON.stringify(deleted)} pools=${JSON.stringify(answerPools)} packs=${JSON.stringify(packs)} in ${Date.now() - started}ms`);
  res.json({ ok: true, deleted, answerPools, packs });
}));
