import express from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { deliveryMode, sendEmail } from "../email.js";
import { afterResponse, createLimiter, HttpError, parse, route } from "../http.js";
import { assertHuman } from "../turnstile.js";
import { isBootstrapAdmin, requireAdmin } from "./identity.js";

// "Report a problem" (issue #71): a short form linked from the footer, the account
// menu and the workspace. Anyone can report. A visitor gives an email and passes the
// human check; a signed-in learner reports with their account email. The page and the
// browser are captured with the report so a bug can be reproduced. Admins are emailed
// and work through reports on the admin page.

const TURNSTILE_ACTION = "problem-report";
const ADMIN_LIST_LIMIT = 500;
const APP_URL = (process.env.APP_ORIGIN || "https://designrounds.in").split(",")[0].trim().replace(/\/+$/, "");

const ipReportLimiter = createLimiter({ name: "ip-report", windowMs: 60 * 60_000, max: 5 });
const userReportLimiter = createLimiter({ name: "user-report", windowMs: 60 * 60_000, max: 10 });

const reportBody = z.object({
  email: z.string().trim().toLowerCase().max(254).email().optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
  // The path the learner was on, never the full URL: query strings can carry tokens.
  page: z.string().trim().max(300).regex(/^\//).optional(),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
});
const statusBody = z.object({ status: z.enum(["open", "resolved"]) }).strict();
const uuid = z.string().uuid();

export const reportsRouter = express.Router();

reportsRouter.post("/reports", route(async (req, res) => {
  const body = parse(reportBody, req.body);
  const signedIn = Boolean(req.user);
  const allowed = signedIn ? await userReportLimiter(req.user.id) : await ipReportLimiter(req.ip);
  if (!allowed) throw new HttpError(429, "RATE_LIMITED", "You've sent several reports in a short time. Try again in an hour.");

  // A signed-in learner always reports with the account email, whatever the form sent.
  const email = signedIn ? req.user.email : body.email;
  if (!email) throw new HttpError(400, "INVALID_REQUEST", "email: Required");
  if (!signedIn) await assertHuman(req, body.turnstileToken, TURNSTILE_ACTION);

  const report = await queryOne(
    `insert into problem_reports (email, user_id, message, page, user_agent)
     values ($1, $2, $3, $4, $5) returning id, created_at`,
    [email, req.user?.id ?? null, body.message, body.page ?? null, (req.get("user-agent") || "").slice(0, 400) || null]
  );
  console.log(`[reports] ${signedIn ? "member" : "visitor"} reported a problem on ${body.page ?? "an unknown page"}`);
  if (deliveryMode() !== "unconfigured") {
    afterResponse(notifyAdmins({ email, message: body.message, page: body.page }).catch((error) => console.error("[email] problem report alert failed:", error.message)));
  }
  res.status(201).json({ id: report.id });
}));

// A plain-text alert, so nothing a reporter writes is ever rendered as HTML.
async function notifyAdmins({ email, message, page }) {
  const rows = await query("select email from users where role = 'admin'");
  const recipients = [...new Set([...rows.map((row) => row.email), ...(process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(isBootstrapAdmin)])];
  if (!recipients.length) return;
  await sendEmail({
    to: recipients,
    subject: `Problem report from ${email}`,
    text: [
      `From: ${email}`,
      `Page: ${page ? `${APP_URL}${page}` : "not captured"}`,
      "",
      message,
      "",
      `All reports: ${APP_URL}/admin`,
    ].join("\n"),
  });
}

reportsRouter.get("/admin/reports", requireAdmin, route(async (_req, res) => {
  const [rows, totals] = await Promise.all([
    query(
      `select r.id, r.email, r.message, r.page, r.user_agent, r.status, r.created_at, r.resolved_at,
              u.display_name, u.id as user_id
         from problem_reports r
         left join users u on u.id = r.user_id
        order by (r.status = 'open') desc, r.created_at desc
        limit $1`,
      [ADMIN_LIST_LIMIT]
    ),
    queryOne("select count(*)::int as total, count(*) filter (where status = 'open')::int as open from problem_reports"),
  ]);
  res.json({
    total: totals.total,
    open: totals.open,
    reports: rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name ?? null,
      hasAccount: Boolean(row.user_id),
      message: row.message,
      page: row.page,
      userAgent: row.user_agent,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
  });
}));

reportsRouter.patch("/admin/reports/:id", requireAdmin, route(async (req, res) => {
  const id = parse(uuid, req.params.id);
  const { status } = parse(statusBody, req.body);
  const row = await queryOne(
    `update problem_reports set status = $2, resolved_at = case when $2 = 'resolved' then now() else null end
      where id = $1 returning id, status, resolved_at`,
    [id, status]
  );
  if (!row) throw new HttpError(404, "NOT_FOUND", "No such report.");
  res.json({ id: row.id, status: row.status, resolvedAt: row.resolved_at });
}));
