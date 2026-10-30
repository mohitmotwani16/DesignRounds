import express from "express";
import { z } from "zod";
import { query } from "../db.js";
import { createLimiter, parse, route } from "../http.js";
import { recordHumanCheck } from "../turnstile.js";
import { requireAdmin } from "./identity.js";

// Human-check diagnostics (issue #103). Most Turnstile failures happen in the browser
// (the widget's error codes, a blocked script, an unsupported browser, a background
// check that stalls) and never reach siteverify, so the page reports them here.
// Server-side outcomes are recorded by assertHuman. Admins search both by email,
// reference (the browser's diagnostic id), Cloudflare error code or request id.

const ADMIN_LIST_LIMIT = 300;
const ipBeaconLimiter = createLimiter({ name: "ip-human-beacon", windowMs: 60 * 60_000, max: 30 });

const beaconBody = z.object({
  action: z.string().trim().regex(/^[a-z][a-z-]{0,39}$/),
  outcome: z.enum(["load-failed", "widget-error", "unsupported", "timeout", "interactive", "stalled"]),
  // Turnstile client error codes are numeric (e.g. 110200, 600010).
  errorCode: z.string().trim().regex(/^[0-9a-z_-]{1,20}$/i).optional(),
  // The path only, never the full URL: query strings can carry tokens.
  page: z.string().trim().max(300).regex(/^\//).optional(),
  detail: z.object({
    invisible: z.boolean().optional(),
    elapsedMs: z.number().int().min(0).max(3_600_000).optional(),
    online: z.boolean().optional(),
  }).strict().optional(),
}).strict();

const listQuery = z.object({
  q: z.string().trim().max(254).optional(),
  problems: z.enum(["0", "1"]).optional(),
});

export const humanChecksRouter = express.Router();

// Fire-and-forget from the page. Over the limit, it is dropped quietly: the page
// never retries, and a flood of reports shouldn't become a flood of rows.
humanChecksRouter.post("/diagnostics/human-check", route(async (req, res) => {
  const body = parse(beaconBody, req.body);
  if (!(await ipBeaconLimiter(req.ip))) return res.status(204).end();
  await recordHumanCheck(req, {
    source: "client",
    action: body.action,
    outcome: body.outcome,
    errorCodes: body.errorCode ? [body.errorCode] : [],
    page: body.page ?? null,
    detail: body.detail ?? {},
  });
  res.status(204).end();
}));

humanChecksRouter.get("/admin/human-checks", requireAdmin, route(async (req, res) => {
  const { q, problems = "1" } = parse(listQuery, req.query);
  const search = q || null;
  const [events, summary] = await Promise.all([
    query(
      `select e.id, e.created_at, e.source, e.action, e.outcome, e.error_codes, e.email, e.client_id,
              e.page, e.country, e.user_agent, e.request_id, e.detail, u.email as user_email
         from human_check_events e
         left join users u on u.id = e.user_id
        where ($1::text is null
               or e.client_id = upper($1) or e.email = lower($1) or u.email = lower($1)
               or $1 = any(e.error_codes) or e.request_id = $1)
          and ($2::boolean is false or e.outcome <> 'passed')
        order by e.created_at desc
        limit $3`,
      [search, problems === "1", ADMIN_LIST_LIMIT]
    ),
    query(
      `select source, outcome, count(*)::int as count
         from human_check_events
        where created_at > now() - interval '24 hours'
        group by source, outcome
        order by count desc`
    ),
  ]);
  res.json({
    summary: summary.map((row) => ({ source: row.source, outcome: row.outcome, count: row.count })),
    limit: ADMIN_LIST_LIMIT,
    events: events.map((row) => ({
      id: String(row.id),
      createdAt: row.created_at,
      source: row.source,
      action: row.action,
      outcome: row.outcome,
      errorCodes: row.error_codes || [],
      email: row.user_email || row.email || null,
      reference: row.client_id,
      page: row.page,
      country: row.country,
      userAgent: row.user_agent,
      requestId: row.request_id,
      detail: row.detail || {},
    })),
  });
}));
