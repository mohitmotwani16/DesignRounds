import crypto from "node:crypto";
import { isPlus } from "./plans.js";
import { promptById } from "./rounds.js";

// The one free live-interviewer round each email address gets (issue #75). The
// learner chooses which round to spend it on, and only free questions qualify; the
// round then runs with the trial allowances (see limitsFor in plans.js).

// The ledger outlives the account (see migration 021), so it stores a hash, not the
// address itself.
export const trialEmailHash = (email) => crypto.createHash("sha256").update(`interviewer-trial:${email.trim().toLowerCase()}`).digest("hex");

// Whether this round can start the trial. "available" and "used" are the states the
// workspace shows; the rest explain why the offer doesn't apply.
export async function trialStatus(conn, user, session) {
  if (isPlus(user)) return "not_needed";
  if (session.interviewer_trial) return "active";
  if (promptById.get(session.prompt_id)?.access !== "free") return "not_eligible";
  if (session.status !== "in_progress") return "round_finished";
  const used = await conn.queryOne("select 1 from interviewer_trials where email_hash = $1", [trialEmailHash(user.email)]);
  return used ? "used" : "available";
}

// Claims the trial for this round. The insert is the lock: the primary key on the
// email hash means two rounds racing for it can't both win. Returns false when the
// address has already had its trial.
export async function claimTrial(conn, user, session) {
  const claimed = await conn.queryOne(
    "insert into interviewer_trials (email_hash, user_id, session_id) values ($1, $2, $3) on conflict (email_hash) do nothing returning email_hash",
    [trialEmailHash(user.email), user.id, session.id]
  );
  if (!claimed) return false;
  await conn.query("update practice_sessions set interviewer_trial = true where id = $1", [session.id]);
  return true;
}
