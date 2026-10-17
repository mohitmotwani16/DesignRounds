import crypto from "node:crypto";
import express from "express";
import { z } from "zod";
import { query, queryOne, transaction } from "../db.js";
import { sendEmail, sendInvitationEmail } from "../email.js";
import { isProduction } from "../flags.js";
import { HttpError, afterResponse, createLimiter, parse, route } from "../http.js";
import { CATEGORIES, topicMeta } from "../../src/learn/catalog.js";
import { LEVELS, SLUG_PATTERN, articleProblems } from "../../src/learn/markdown.js";
import { isAdmin, isBootstrapAdmin, requireAdmin, requireUser } from "./identity.js";
import { planFor } from "./plans.js";

// Community articles for the Learn handbook.
//
//   draft → in_review → (changes_requested ↔ in_review) → published | rejected
//
// Authors edit while the article is a draft or has changes requested. Admins review,
// message the author, publish or reject. Publishing triggers a redeploy (when
// VERCEL_DEPLOY_HOOK_URL is set) so the article is prerendered like every other page.

const EDITABLE = new Set(["draft", "changes_requested"]);
const MAX_OPEN_ARTICLES = 20;
const writeLimiter = createLimiter({ name: "article-write", windowMs: 60 * 60_000, max: 120 });
const submitLimiter = createLimiter({ name: "article-submit", windowMs: 24 * 60 * 60_000, max: 10 });
const invitationLimiter = createLimiter({ name: "admin-invitation", windowMs: 60 * 60_000, max: 20 });

const categoryIds = CATEGORIES.filter((category) => category.id !== "interview").map((category) => category.id);
const fields = {
  title: z.string().trim().max(120),
  shortTitle: z.string().trim().max(60),
  description: z.string().trim().max(220),
  category: z.enum(categoryIds),
  level: z.enum(LEVELS),
  slug: z.string().trim().toLowerCase().max(80).regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens."),
  body: z.string().max(60_000),
};
const createBody = z.object({ ...fields, title: fields.title.min(3, "Give the article a working title.") }).partial({ shortTitle: true, description: true, level: true, body: true }).strict();
const updateBody = z.object(fields).partial().strict();
const messageBody = z.object({ body: z.string().trim().min(2).max(4000) }).strict();
const decisionBody = z.object({ action: z.enum(["request_changes", "reject", "publish", "unpublish"]), message: z.string().trim().max(4000).optional() }).strict();
const adminBody = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();
const membershipBody = z.object({
  plan: z.enum(["free", "plus"]),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid expiry date.").nullable().optional(),
}).strict().refine(({ plan, expiresAt }) => plan === "plus" ? Boolean(expiresAt) : !expiresAt, {
  message: "Plus access requires an expiry date; Free access must not have one.",
});
const invitationBody = z.object({
  email: adminBody.shape.email,
  plan: z.enum(["free", "plus"]),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).strict().refine(({ plan, expiresAt }) => plan === "plus" ? Boolean(expiresAt) : !expiresAt, {
  message: "Plus invitations require an expiry date; Free invitations must not have one.",
}).refine(({ plan, expiresAt }) => {
  if (plan !== "plus" || !expiresAt) return true;
  const date = new Date(`${expiresAt}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === expiresAt
    && expiresAt >= new Date().toISOString().slice(0, 10);
}, { message: "Choose a valid Plus expiry date that is today or later." });

const reservedSlug = (slug) => Boolean(topicMeta(slug)) || ["write", "admin", "submit", "new"].includes(slug);

function present(row) {
  return {
    id: row.id,
    slug: row.slug,
    path: `/learn/${row.slug}`,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description,
    category: row.category,
    level: row.level,
    body: row.body,
    status: row.status,
    authorName: row.author_name || row.display_name || null,
    authorEmail: row.author_email,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// What anyone may see of a published article.
function presentPublic(row, { withBody = false } = {}) {
  return {
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description,
    category: row.category,
    level: row.level,
    authorName: row.author_name,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    ...(withBody ? { body: row.body } : {}),
  };
}

const presentMessage = (row) => ({ id: row.id, role: row.role, body: row.body, authorName: row.display_name || null, createdAt: row.created_at });

const ARTICLE_SELECT = `select a.*, u.email as author_email, u.display_name from articles a join users u on u.id = a.author_id`;

async function loadArticle(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  const row = await queryOne(`${ARTICLE_SELECT} where a.id = $1`, [id]);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  return row;
}

// The author or an admin; anyone else gets a 404 so article ids can't be probed.
async function accessibleArticle(req) {
  const row = await loadArticle(req.params.id);
  if (row.author_id !== req.user.id && !isAdmin(req.user)) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  return row;
}

async function messagesFor(articleId) {
  const rows = await query(
    `select m.*, u.display_name from article_messages m left join users u on u.id = m.user_id
      where m.article_id = $1 order by m.created_at limit 500`,
    [articleId]
  );
  return rows.map(presentMessage);
}

async function addMessage(conn, articleId, userId, role, body) {
  await conn.query("insert into article_messages (article_id, user_id, role, body) values ($1, $2, $3, $4)", [articleId, userId, role, body]);
}

// ---------------------------------------------------------------- notifications

const origin = (req) => (process.env.APP_ORIGIN || "").split(",")[0].trim() || `${req.protocol}://${req.get("host")}`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function notificationEmail({ heading, lines, link, linkLabel }) {
  const text = [heading, "", ...lines, "", `${linkLabel}: ${link}`, "", "DesignRounds"].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2430;max-width:560px">
<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(heading)}</h2>
${lines.map((line) => `<p style="margin:0 0 10px;white-space:pre-wrap">${escapeHtml(line)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="background:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(linkLabel)}</a></p>
<p style="color:#6b7280;font-size:13px">DesignRounds · designrounds.in</p></div>`;
  return { text, html };
}

async function adminEmails() {
  const rows = await query("select email from users where role = 'admin'");
  return [...new Set([...rows.map((row) => row.email), ...(process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)])];
}

function notify(promise) {
  afterResponse(promise.catch((error) => console.error("[articles] email failed:", error.message)));
}

async function emailAdmins(req, article, subject, lines) {
  const to = await adminEmails();
  if (!to.length) return console.warn("[articles] no admins to notify; set ADMIN_EMAILS");
  const { text, html } = notificationEmail({ heading: subject, lines, link: `${origin(req)}/admin/articles/${article.id}`, linkLabel: "Review the article" });
  await sendEmail({ to, subject: `[DesignRounds] ${subject}`, text, html });
}

async function emailAuthor(req, article, subject, lines) {
  const { text, html } = notificationEmail({ heading: subject, lines, link: `${origin(req)}/learn/write/${article.id}`, linkLabel: "Open your article" });
  await sendEmail({ to: article.author_email, subject: `[DesignRounds] ${subject}`, text, html });
}

// Published articles are prerendered at build time, so publishing asks the host to
// rebuild. Only production deployments trigger it.
function triggerRebuild() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook || !isProduction || process.env.VERCEL_ENV === "preview") return;
  afterResponse(fetch(hook, { method: "POST" }).then((response) => console.log(`[articles] rebuild requested (${response.status})`)).catch((error) => console.error("[articles] rebuild hook failed:", error.message)));
}

// ---------------------------------------------------------------- routes

export const articlesRouter = express.Router();

// Public: published articles (sidebar, community pages). Cached briefly at the edge.
articlesRouter.get("/articles/published", route(async (_req, res) => {
  const rows = await query("select * from articles where status = 'published' order by published_at desc limit 500");
  res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json({ articles: rows.map((row) => presentPublic(row)) });
}));

articlesRouter.get("/articles/published/:slug", route(async (req, res) => {
  const row = await queryOne("select * from articles where status = 'published' and slug = $1", [String(req.params.slug).toLowerCase()]);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json({ article: presentPublic(row, { withBody: true }) });
}));

// Is a slug free? Used by the editor while typing.
articlesRouter.get("/articles/slug-available", requireUser, route(async (req, res) => {
  const slug = String(req.query.slug || "").toLowerCase();
  const exceptId = String(req.query.except || "");
  if (!SLUG_PATTERN.test(slug)) return res.json({ available: false, reason: "invalid" });
  if (reservedSlug(slug)) return res.json({ available: false, reason: "handbook" });
  const row = await queryOne("select id from articles where slug = $1", [slug]);
  res.json({ available: !row || row.id === exceptId, reason: row && row.id !== exceptId ? "taken" : null });
}));

articlesRouter.get("/articles/mine", requireUser, route(async (req, res) => {
  const rows = await query(`${ARTICLE_SELECT} where a.author_id = $1 order by a.updated_at desc limit 100`, [req.user.id]);
  res.json({ articles: rows.map((row) => ({ ...present(row), body: undefined })) });
}));

articlesRouter.post("/articles", requireUser, route(async (req, res) => {
  const body = parse(createBody, req.body);
  if (!(await writeLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", "You're saving very often. Wait a moment and try again.");
  if (reservedSlug(body.slug)) throw new HttpError(409, "SLUG_TAKEN", `The URL /learn/${body.slug} is already used by a handbook topic.`);
  const open = await queryOne("select count(*)::int as n from articles where author_id = $1 and status in ('draft', 'in_review', 'changes_requested')", [req.user.id]);
  if (open.n >= MAX_OPEN_ARTICLES) throw new HttpError(403, "TOO_MANY_DRAFTS", `You can have ${MAX_OPEN_ARTICLES} unpublished articles at a time.`);
  try {
    const row = await queryOne(
      `insert into articles (author_id, slug, title, short_title, description, category, level, body)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [req.user.id, body.slug, body.title, body.shortTitle ?? "", body.description ?? "", body.category, body.level ?? "Intermediate", body.body ?? ""]
    );
    res.status(201).json({ article: present(await loadArticle(row.id)), messages: [] });
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "SLUG_TAKEN", `The URL /learn/${body.slug} is already taken. Choose another slug.`);
    throw error;
  }
}));

articlesRouter.get("/articles/:id", requireUser, route(async (req, res) => {
  const row = await accessibleArticle(req);
  res.json({ article: present(row), messages: await messagesFor(row.id), canEdit: row.author_id === req.user.id && EDITABLE.has(row.status) });
}));

articlesRouter.patch("/articles/:id", requireUser, route(async (req, res) => {
  const body = parse(updateBody, req.body);
  const row = await loadArticle(req.params.id);
  if (row.author_id !== req.user.id) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  if (!EDITABLE.has(row.status)) throw new HttpError(409, "NOT_EDITABLE", row.status === "in_review" ? "This article is being reviewed. You can edit it again if changes are requested." : "This article can no longer be edited.");
  if (!(await writeLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", "You're saving very often. Wait a moment and try again.");
  if (body.slug && reservedSlug(body.slug)) throw new HttpError(409, "SLUG_TAKEN", `The URL /learn/${body.slug} is already used by a handbook topic.`);
  const columns = { title: "title", shortTitle: "short_title", description: "description", category: "category", level: "level", slug: "slug", body: "body" };
  const sets = [];
  const values = [row.id];
  for (const [key, column] of Object.entries(columns)) {
    if (body[key] === undefined) continue;
    values.push(body[key]);
    sets.push(`${column} = $${values.length}`);
  }
  if (sets.length) {
    try {
      await query(`update articles set ${sets.join(", ")}, updated_at = now() where id = $1`, values);
    } catch (error) {
      if (error.code === "23505") throw new HttpError(409, "SLUG_TAKEN", `The URL /learn/${body.slug} is already taken. Choose another slug.`);
      throw error;
    }
  }
  res.json({ article: present(await loadArticle(row.id)) });
}));

articlesRouter.delete("/articles/:id", requireUser, route(async (req, res) => {
  const row = await loadArticle(req.params.id);
  if (row.author_id !== req.user.id) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  if (row.status === "published") throw new HttpError(409, "PUBLISHED", "Published articles can't be deleted here. Contact us to take one down.");
  await query("delete from articles where id = $1", [row.id]);
  res.json({ deleted: true });
}));

articlesRouter.post("/articles/:id/submit", requireUser, route(async (req, res) => {
  const row = await loadArticle(req.params.id);
  if (row.author_id !== req.user.id) throw new HttpError(404, "NOT_FOUND", "Article not found.");
  if (!EDITABLE.has(row.status)) throw new HttpError(409, "NOT_EDITABLE", "This article has already been submitted.");
  const problems = articleProblems(
    { title: row.title, shortTitle: row.short_title, description: row.description, category: row.category, level: row.level, slug: row.slug, body: row.body },
    { categories: CATEGORIES.filter((category) => category.id !== "interview"), taken: reservedSlug }
  );
  if (problems.length) return res.status(422).json({ error: { code: "NOT_READY", message: "Fix these before submitting.", problems } });
  if (!(await submitLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", "You've submitted a lot today. Try again tomorrow.");
  const resubmission = row.status === "changes_requested";
  await transaction(async (conn) => {
    await conn.query("update articles set status = 'in_review', submitted_at = now(), updated_at = now() where id = $1", [row.id]);
    await addMessage(conn, row.id, req.user.id, "system", resubmission ? "Resubmitted for review." : "Submitted for review.");
  });
  const updated = await loadArticle(row.id);
  notify(emailAdmins(req, updated, `${resubmission ? "Resubmitted" : "New article submitted"}: ${updated.title}`, [
    `${updated.display_name || updated.author_email} ${resubmission ? "resubmitted" : "submitted"} "${updated.title}" for the ${CATEGORIES.find((category) => category.id === updated.category)?.title ?? updated.category} section.`,
    `Proposed URL: /learn/${updated.slug}`,
    updated.description,
  ]));
  res.json({ article: present(updated), messages: await messagesFor(row.id) });
}));

articlesRouter.post("/articles/:id/messages", requireUser, route(async (req, res) => {
  const { body } = parse(messageBody, req.body);
  const row = await accessibleArticle(req);
  if (!(await writeLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", "You're sending messages very quickly. Wait a moment.");
  const fromAuthor = row.author_id === req.user.id;
  await transaction((conn) => addMessage(conn, row.id, req.user.id, fromAuthor ? "author" : "admin", body));
  if (fromAuthor) notify(emailAdmins(req, row, `Author replied: ${row.title}`, [`${row.display_name || row.author_email} wrote:`, body]));
  else notify(emailAuthor(req, row, `New feedback on "${row.title}"`, ["A DesignRounds reviewer wrote:", body]));
  res.status(201).json({ messages: await messagesFor(row.id) });
}));

// ---------------------------------------------------------------- admin

articlesRouter.get("/admin/articles", requireAdmin, route(async (req, res) => {
  const status = String(req.query.status || "in_review");
  const filter = status === "all" ? "a.status <> 'draft'" : "a.status = $1";
  const rows = await query(`${ARTICLE_SELECT} where ${filter} order by coalesce(a.submitted_at, a.updated_at) desc limit 200`, status === "all" ? [] : [status]);
  const counts = await query("select status, count(*)::int as n from articles where status <> 'draft' group by status");
  res.json({ articles: rows.map((row) => ({ ...present(row), body: undefined })), counts: Object.fromEntries(counts.map((row) => [row.status, row.n])) });
}));

articlesRouter.post("/admin/articles/:id/decision", requireAdmin, route(async (req, res) => {
  const { action, message } = parse(decisionBody, req.body);
  const row = await loadArticle(req.params.id);
  const allowed = {
    request_changes: ["in_review", "published"],
    reject: ["in_review", "changes_requested"],
    publish: ["in_review"],
    unpublish: ["published"],
  };
  if (!allowed[action].includes(row.status)) throw new HttpError(409, "INVALID_STATE", `Can't ${action.replace("_", " ")} an article that is ${row.status.replace("_", " ")}.`);
  if ((action === "request_changes" || action === "reject") && !message) throw new HttpError(400, "MESSAGE_REQUIRED", "Tell the author what to change.");
  if (action === "publish") {
    const problems = articleProblems(
      { title: row.title, shortTitle: row.short_title, description: row.description, category: row.category, level: row.level, slug: row.slug, body: row.body },
      { categories: CATEGORIES, taken: reservedSlug }
    );
    if (problems.length) return res.status(422).json({ error: { code: "NOT_READY", message: "This article can't be published yet.", problems } });
  }
  const next = { request_changes: "changes_requested", reject: "rejected", publish: "published", unpublish: "changes_requested" }[action];
  const note = { request_changes: "Changes requested.", reject: "Rejected.", publish: "Published.", unpublish: "Unpublished for changes." }[action];
  await transaction(async (conn) => {
    await conn.query(
      `update articles set status = $2, reviewed_by = $3, updated_at = now(),
         published_at = case when $2::text = 'published' then now() else published_at end,
         author_name = case when $2::text = 'published' then coalesce(author_name, $4::text) else author_name end
       where id = $1`,
      [row.id, next, req.user.id, row.display_name || row.author_email.split("@")[0]]
    );
    if (message) await addMessage(conn, row.id, req.user.id, "admin", message);
    await addMessage(conn, row.id, req.user.id, "system", note);
  });
  const updated = await loadArticle(row.id);
  const link = `${origin(req)}/learn/${updated.slug}`;
  const emails = {
    request_changes: [`Changes requested: "${updated.title}"`, ["A reviewer has asked for changes before publishing your article.", message, "Edit the article and resubmit it when you're ready."]],
    reject: [`Update on "${updated.title}"`, ["Thanks for writing for DesignRounds. We won't be publishing this article.", message]],
    publish: [`Published: "${updated.title}"`, ["Your article is live on the DesignRounds handbook. It can take a couple of minutes to appear everywhere.", link, ...(message ? [message] : [])]],
    unpublish: [`Unpublished for changes: "${updated.title}"`, ["Your article has been taken down while changes are made.", ...(message ? [message] : [])]],
  }[action];
  notify(emailAuthor(req, updated, emails[0], emails[1].filter(Boolean)));
  if (action === "publish" || action === "unpublish") triggerRebuild();
  res.json({ article: present(updated), messages: await messagesFor(row.id) });
}));

articlesRouter.get("/admin/admins", requireAdmin, route(async (_req, res) => {
  const rows = await query("select id, email, display_name, role from users where role = 'admin' order by email");
  const listed = new Map(rows.map((row) => [row.email, { id: row.id, email: row.email, displayName: row.display_name, fromSettings: isBootstrapAdmin(row.email) }]));
  for (const email of (process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)) {
    if (!listed.has(email)) listed.set(email, { id: null, email, displayName: null, fromSettings: true });
  }
  res.json({ admins: [...listed.values()] });
}));

articlesRouter.post("/admin/admins", requireAdmin, route(async (req, res) => {
  const { email } = parse(adminBody, req.body);
  const row = await queryOne("update users set role = 'admin', updated_at = now() where email = $1 returning id, email", [email]);
  if (!row) throw new HttpError(404, "NOT_FOUND", `No account uses ${email}. Ask them to sign in to DesignRounds once first.`);
  console.log(`[admin] ${req.user.email} granted admin to ${email}`);
  res.status(201).json({ granted: row.email });
}));

articlesRouter.delete("/admin/admins/:id", requireAdmin, route(async (req, res) => {
  const row = await queryOne("select id, email from users where id = $1", [req.params.id]);
  if (!row) throw new HttpError(404, "NOT_FOUND", "User not found.");
  if (row.id === req.user.id) throw new HttpError(409, "SELF", "You can't remove your own admin access.");
  if (isBootstrapAdmin(row.email)) throw new HttpError(409, "FROM_SETTINGS", "This admin comes from the ADMIN_EMAILS setting; remove them there.");
  await query("update users set role = 'user', updated_at = now() where id = $1", [row.id]);
  console.log(`[admin] ${req.user.email} revoked admin from ${row.email}`);
  res.json({ revoked: row.email });
}));

articlesRouter.get("/admin/members", requireAdmin, route(async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (email && !adminBody.shape.email.safeParse(email).success) {
    throw new HttpError(400, "INVALID_EMAIL", "Enter a valid account email.");
  }
  const rows = await query(
    `select id, email, display_name, plan, plan_expires_at, role
       from users
      where ($1::text is null or email = $1)
      order by (plan = 'plus') desc, updated_at desc
      limit 200`,
    [email || null]
  );
  res.json({
    members: rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      plan: planFor(row),
      storedPlan: row.plan,
      planExpiresAt: row.plan_expires_at instanceof Date ? row.plan_expires_at.toISOString().slice(0, 10) : row.plan_expires_at,
      isAdmin: isAdmin(row),
      fromSettings: isBootstrapAdmin(row.email),
    })),
  });
}));

articlesRouter.put("/admin/members/:id/plan", requireAdmin, route(async (req, res) => {
  const { plan, expiresAt } = parse(membershipBody, req.body);
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new HttpError(404, "NOT_FOUND", "User not found.");
  const member = await queryOne(
    `update users set plan = $2, plan_expires_at = $3::date, updated_at = now()
      where id = $1
      returning id, email, display_name, plan, plan_expires_at`,
    [req.params.id, plan, expiresAt || null]
  );
  if (!member) throw new HttpError(404, "NOT_FOUND", "User not found.");
  console.log(`[admin] ${req.user.email} set ${member.email} to ${plan}${expiresAt ? ` through ${expiresAt}` : ""}`);
  res.json({
    member: {
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      plan: member.plan,
      planExpiresAt: member.plan_expires_at instanceof Date ? member.plan_expires_at.toISOString().slice(0, 10) : member.plan_expires_at,
    },
  });
}));

articlesRouter.post("/admin/invitations", requireAdmin, route(async (req, res) => {
  if (!(await invitationLimiter(req.user.id))) {
    throw new HttpError(429, "RATE_LIMITED", "Too many invitations. Try again in an hour.");
  }
  const { email, plan, expiresAt } = parse(invitationBody, req.body);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await queryOne(
    `insert into invitations (email, token_hash, plan, plan_expires_at, created_by)
     values ($1, $2, $3, $4::date, $5)
     returning id`,
    [email, tokenHash, plan, expiresAt || null, req.user.id]
  );
  const appOrigin = (process.env.APP_ORIGIN || "").split(",")[0].trim().replace(/\/+$/, "") || origin(req);
  try {
    await sendInvitationEmail({
      email,
      plan,
      planExpiresAt: expiresAt || null,
      inviteUrl: `${appOrigin}/invite/${token}`,
    });
  } catch (error) {
    await query("update invitations set cancelled_at = now() where id = $1", [invitation.id]);
    console.error("[admin] invitation email failed:", error.message);
    throw new HttpError(502, "EMAIL_FAILED", "The invitation could not be emailed. Check the email provider and try again.");
  }
  console.log(`[admin] ${req.user.email} invited ${email} to ${plan}${expiresAt ? ` through ${expiresAt}` : ""}`);
  res.status(201).json({ invited: email, plan, expiresAt: expiresAt || null });
}));

articlesRouter.get("/invitations/:token", route(async (req, res) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const invitation = await queryOne(
    `select email, plan, plan_expires_at, expires_at, accepted_at, cancelled_at
       from invitations where token_hash = $1`,
    [tokenHash]
  );
  if (!invitation || invitation.cancelled_at) throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
  res.json({
    email: invitation.email,
    plan: invitation.plan,
    planExpiresAt: invitation.plan_expires_at instanceof Date ? invitation.plan_expires_at.toISOString().slice(0, 10) : invitation.plan_expires_at,
    expiresAt: invitation.expires_at,
    accepted: Boolean(invitation.accepted_at),
    expired: new Date(invitation.expires_at).getTime() <= Date.now(),
  });
}));

articlesRouter.post("/invitations/:token/accept", requireUser, route(async (req, res) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const result = await transaction(async ({ queryOne: txQueryOne, query: txQuery }) => {
    const invitation = await txQueryOne(
      `select * from invitations where token_hash = $1 for update`,
      [tokenHash]
    );
    if (!invitation || invitation.cancelled_at) throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
    if (invitation.email !== req.user.email) {
      throw new HttpError(403, "INVITATION_EMAIL_MISMATCH", `Sign in as ${invitation.email} to accept this invitation.`);
    }
    if (invitation.accepted_at) {
      if (invitation.accepted_by === req.user.id) return { accepted: true, alreadyAccepted: true };
      throw new HttpError(409, "INVITATION_USED", "This invitation has already been accepted.");
    }
    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw new HttpError(410, "INVITATION_EXPIRED", "This invitation has expired. Ask the inviter for a new one.");
    }
    if (invitation.plan === "plus") {
      await txQuery(
        `update users
            set plan = 'plus',
                plan_expires_at = case
                  when plan = 'plus' and (plan_expires_at is null or plan_expires_at >= $2::date) then plan_expires_at
                  else $2::date
                end,
                updated_at = now()
          where id = $1`,
        [req.user.id, invitation.plan_expires_at]
      );
    }
    await txQuery(
      `update invitations set accepted_at = now(), accepted_by = $2 where id = $1`,
      [invitation.id, req.user.id]
    );
    return { accepted: true, alreadyAccepted: false };
  });
  res.json(result);
}));
