import { transaction } from "../../db.js";
import { GUEST_SYSTEM_USER_ID, NUGGET_BASICS_PARENT } from "../guest.js";

/**
 * Reassign anonymous Nugget-basics sessions (and their interview data) to a signed-in user.
 * Drops guest in-progress drills when the user already has one open on the same nugget.
 */
export async function claimGuestBasicsSessions(userId, guestTokenHash) {
  if (!userId || !guestTokenHash) return { claimed: 0, dropped: 0 };

  return transaction(async (conn) => {
    const guestRows = await conn.query(
      `select id, nugget_id, status from practice_sessions
       where guest_token_hash = $1 and prompt_id = $2
       for update`,
      [guestTokenHash, NUGGET_BASICS_PARENT],
    );
    if (!guestRows.length) return { claimed: 0, dropped: 0 };

    let claimed = 0;
    let dropped = 0;
    const claimedIds = [];

    for (const row of guestRows) {
      if (row.status === "in_progress" && row.nugget_id) {
        const conflict = await conn.queryOne(
          `select id from practice_sessions
           where user_id = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'
             and guest_token_hash is null and id <> $3
           limit 1
           for update`,
          [userId, row.nugget_id, row.id],
        );
        if (conflict) {
          await conn.query("delete from practice_sessions where id = $1", [row.id]);
          dropped += 1;
          continue;
        }
      }

      await conn.query(
        `update practice_sessions set user_id = $1, guest_token_hash = null, updated_at = now() where id = $2`,
        [userId, row.id],
      );
      claimedIds.push(row.id);
      claimed += 1;
    }

    if (claimedIds.length) {
      await conn.query(
        `update interview_turns set user_id = $1
         where session_id = any($2::uuid[]) and user_id = $3`,
        [userId, claimedIds, GUEST_SYSTEM_USER_ID],
      );
      await conn.query(
        `update ai_credits set user_id = $1, updated_at = now()
         where session_id = any($2::uuid[]) and user_id = $3`,
        [userId, claimedIds, GUEST_SYSTEM_USER_ID],
      );
    }

    return { claimed, dropped };
  });
}