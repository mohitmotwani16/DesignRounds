import express from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { deliveryMode, sendPlusWaitlistEmail } from "../email.js";
import { afterResponse, createLimiter, HttpError, parse, route } from "../http.js";
import { assertHuman } from "../turnstile.js";
import { requireAdmin, requireUser } from "./identity.js";

// The Plus early-access list. Visitors join with an email and pass the human check;
// a signed-in learner joins with their account email in one click. Joining is
// idempotent, and the confirmation email goes out only the first time an address joins.

const TURNSTILE_ACTION = "plus-waitlist";
const ADMIN_LIST_LIMIT = 5000;

const ipWaitlistLimiter = createLimiter({ name: "ip-waitlist", windowMs: 15 * 60_000, max: 10 });
const userWaitlistLimiter = createLimiter({ name: "user-waitlist", windowMs: 15 * 60_000, max: 10 });

const joinBody = z.object({
  email: z.string().trim().toLowerCase().max(254).email().optional(),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
});

export const waitlistRouter = express.Router();

waitlistRouter.get("/plus/waitlist", requireUser, route(async (req, res) => {
  const row = await queryOne("select created_at from plus_waitlist where email = $1", [req.user.email]);
  res.json({ joined: Boolean(row), joinedAt: row?.created_at ?? null });
}));

waitlistRouter.post("/plus/waitlist", route(async (req, res) => {
  const body = parse(joinBody, req.body);
  const signedIn = Boolean(req.user);
  const allowed = signedIn ? await userWaitlistLimiter(req.user.id) : await ipWaitlistLimiter(req.ip);
  if (!allowed) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Try again in a few minutes.");

  // A signed-in learner always joins with the account email, whatever the form sent.
  const email = signedIn ? req.user.email : body.email;
  if (!email) throw new HttpError(400, "INVALID_REQUEST", "email: Required");
  // Visitors only: a signed-in page load has already passed the human check.
  if (!signedIn) await assertHuman(req, body.turnstileToken, TURNSTILE_ACTION, { email });

  const inserted = await queryOne(
    `insert into plus_waitlist (email, user_id) values ($1, $2)
     on conflict (email) do nothing
     returning email`,
    [email, req.user?.id ?? null]
  );
  if (!inserted && signedIn) {
    await query("update plus_waitlist set user_id = $2 where email = $1 and user_id is null", [email, req.user.id]);
  }
  if (inserted) {
    console.log(`[waitlist] ${signedIn ? "member" : "visitor"} joined the Plus list`);
    if (deliveryMode() !== "unconfigured") {
      afterResponse(sendPlusWaitlistEmail(email).catch((error) => console.error("[email] Plus waitlist confirmation failed:", error.message)));
    }
  }

  // Visitors get the same answer whether or not the address was already listed, so
  // the form can't be used to check who has signed up.
  res.status(inserted ? 201 : 200).json(signedIn ? { joined: true, alreadyJoined: !inserted } : { joined: true });
}));

waitlistRouter.get("/admin/plus-waitlist", requireAdmin, route(async (_req, res) => {
  const [rows, totals] = await Promise.all([
    query(
      `select w.email, w.created_at, w.notified_at, u.id as user_id, u.display_name, u.plan
         from plus_waitlist w
         left join users u on u.id = w.user_id or (w.user_id is null and u.email = w.email)
        order by w.created_at desc
        limit $1`,
      [ADMIN_LIST_LIMIT]
    ),
    queryOne(
      `select count(*)::int as total,
              count(*) filter (where created_at > now() - interval '7 days')::int as last_week
         from plus_waitlist`
    ),
  ]);
  res.json({
    total: totals.total,
    lastWeek: totals.last_week,
    entries: rows.map((row) => ({
      email: row.email,
      joinedAt: row.created_at,
      notifiedAt: row.notified_at,
      hasAccount: Boolean(row.user_id),
      displayName: row.display_name ?? null,
      plan: row.plan ?? null,
    })),
  });
}));
