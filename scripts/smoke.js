// End-to-end smoke test: boots the real app on a throwaway embedded database and walks
// the critical paths over HTTP (sign-in, profile, a practice round, a review, security
// checks, maintenance). Runs in CI on every push; `npm run test:smoke` locally.
//
// Uses the console email provider and the fake AI provider, so it needs no secrets.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "designrounds-smoke-"));
Object.assign(process.env, { PGLITE_DIR: dataDir, AI_PROVIDER: "fake", CRON_SECRET: "smoke-secret", DEV_TOOLS: "true", ADMIN_EMAILS: "admin@example.com" });
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close, query } = await import("../server/db.js");
const { prompts } = await import("../src/data/prompts.js");

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;

let cookie = "";
async function call(method, url, body, headers = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: response.status, body: await response.json().catch(() => null), headers: response.headers };
}

const steps = [];
async function step(name, fn) {
  const started = Date.now();
  await fn();
  steps.push(name);
  console.log(`  ok  ${name} (${Date.now() - started}ms)`);
}

let failed = false;
try {
  await step("health and readiness", async () => {
    assert.equal((await call("GET", "/api/health")).status, 200);
    const ready = await call("GET", "/api/health/ready");
    assert.equal(ready.status, 200);
    assert.equal(ready.body.database, "up");
  });

  await step("catalog pages, filters, and facets", async () => {
    const first = await call("GET", "/api/v1/catalog/prompts?limit=12");
    assert.equal(first.status, 200);
    assert.equal(first.body.items.length, 12);
    assert.equal(first.body.total, prompts.length);
    assert.match(first.headers.get("cache-control"), /s-maxage/);
    const second = await call("GET", `/api/v1/catalog/prompts?limit=12&cursor=${first.body.nextCursor}`);
    assert.notEqual(second.body.items[0].id, first.body.items[0].id, "the next page continues after the first");
    let seen = 0;
    for (let cursor = ""; ; ) {
      const page = await call("GET", `/api/v1/catalog/prompts?limit=24${cursor ? `&cursor=${cursor}` : ""}`);
      seen += page.body.items.length;
      if (!page.body.nextCursor) break;
      cursor = page.body.nextCursor;
    }
    assert.equal(seen, prompts.length, "paging visits every prompt exactly once");
    const free = await call("GET", "/api/v1/catalog/prompts?access=free&level=Beginner");
    assert.ok(free.body.items.every((item) => item.access === "free" && item.difficulty === "Beginner"));
    assert.equal(free.body.facets.tracks.all, free.body.total);
    const search = await call("GET", "/api/v1/catalog/prompts?q=url%20shortener");
    assert.equal(search.body.items[0].id, "url-shortener");
    assert.equal((await call("GET", "/api/v1/catalog/prompts?track=nope")).status, 400);
    assert.equal((await call("GET", "/api/v1/catalog/prompts?limit=500")).status, 400);
  });

  // The fake AI provider never builds the JSON Schema sent to real providers, so check
  // the conversion directly: a validation-library upgrade must not break real AI calls.
  await step("AI output schemas convert for real providers", async () => {
    const { toJsonSchema } = await import("../server/modules/ai/schema.js");
    const { reviewTask } = await import("../server/modules/ai/tasks/review.js");
    const { interviewerTask, interviewSummaryTask } = await import("../server/modules/ai/tasks/interviewer.js");
    for (const task of [reviewTask, interviewerTask, interviewSummaryTask]) {
      const schema = toJsonSchema(task.output);
      assert.equal(schema.type, "object", `${task.name} output must be a JSON object schema`);
      assert.ok(Object.keys(schema.properties ?? {}).length > 0, `${task.name} schema has properties`);
    }
  });

  await step("Plus round content is locked to Plus", async () => {
    const plusRound = prompts.find((entry) => entry.access === "paid");
    const freeRound = prompts.find((entry) => entry.access === "free");
    assert.equal(plusRound.requirements, undefined, "the public catalog must not carry Plus briefs");
    assert.equal((await call("GET", `/api/v1/rounds/${plusRound.id}`)).status, 401);
    const open = await call("GET", `/api/v1/rounds/${freeRound.id}`);
    assert.equal(open.status, 200);
    assert.ok(open.body.round.requirements.length > 0);
    assert.equal((await call("GET", "/api/v1/rounds/nope")).status, 404);
  });

  await step("anonymous requests are rejected", async () => {
    assert.equal((await call("GET", "/api/v1/me")).status, 401);
    const anonymous = await call("GET", "/api/v1/session");
    assert.equal(anonymous.status, 200);
    assert.equal(anonymous.body.user, null);
    assert.equal(anonymous.body.googleAuth, false);
  });

  await step("google sign-in redirects when unconfigured", async () => {
    const response = await fetch(`${base}/api/v1/auth/google?next=/library`, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.match(response.headers.get("location") || "", /error=google_unconfigured/);

    // "/\evil.com" is protocol-relative in browsers and must fall back to the library.
    const sneaky = await fetch(`${base}/api/v1/auth/google?next=${encodeURIComponent("/\\evil.com")}`, { redirect: "manual" });
    assert.match(sneaky.headers.get("location") || "", /next=%2Flibrary&/);
  });

  await step("cross-site and non-JSON writes are rejected", async () => {
    const crossSite = await call("POST", "/api/v1/auth/request-code", { email: "a@example.com" }, { Origin: "https://evil.example" });
    assert.equal(crossSite.status, 403);
    const form = await fetch(`${base}/api/v1/auth/request-code`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "email=a@example.com" });
    assert.equal(form.status, 415);
  });

  const email = "smoke@example.com";
  await step("email sign-in", async () => {
    const requested = await call("POST", "/api/v1/auth/request-code", { email });
    assert.equal(requested.status, 200);
    assert.match(requested.body.devCode, /^\d{6}$/);
    assert.equal((await call("POST", "/api/v1/auth/verify-code", { email, code: requested.body.devCode === "000000" ? "111111" : "000000" })).status, 400);
    const verified = await call("POST", "/api/v1/auth/verify-code", { email, code: requested.body.devCode });
    assert.equal(verified.status, 200);
    assert.ok(cookie.startsWith("dr_session="));
    assert.equal((await call("GET", "/api/v1/me")).body.user.email, email);
    assert.equal((await call("GET", "/api/v1/session")).body.user.email, email);
    assert.equal((await call("GET", "/api/v1/nope")).status, 404);
  });

  await step("resend cooldown is enforced", async () => {
    assert.equal((await call("POST", "/api/v1/auth/request-code", { email })).status, 429);
  });

  await step("Plus round content needs Plus", async () => {
    const plusRound = prompts.find((entry) => entry.access === "paid");
    assert.equal((await call("GET", `/api/v1/rounds/${plusRound.id}`)).status, 403, "a Free member is refused");
    assert.equal((await call("POST", "/api/v1/sessions", { promptId: plusRound.id })).status, 403, "and can't start it");
    assert.equal((await call("POST", "/api/v1/dev/plan", { plan: "plus" })).status, 200);
    const unlocked = await call("GET", `/api/v1/rounds/${plusRound.id}`);
    assert.equal(unlocked.status, 200);
    assert.ok(unlocked.body.round.requirements.length > 0 && unlocked.body.round.guide.questions.length > 0);
    const started = await call("POST", "/api/v1/sessions", { promptId: plusRound.id });
    assert.equal(started.status, 201);
    assert.ok(started.body.session.brief.requirements.length > 0, "the session carries the brief");
    assert.equal((await call("DELETE", `/api/v1/sessions/${started.body.session.id}`)).status, 200);
    assert.equal((await call("POST", "/api/v1/dev/plan", { plan: "free" })).status, 200);
  });

  await step("profile update", async () => {
    const updated = await call("PATCH", "/api/v1/me", { displayName: "Smoke Test", targetRole: "Backend engineer" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.user.onboarded, true);
  });

  let session;
  await step("start, save, and finish a round", async () => {
    const prompt = prompts.find((entry) => entry.access === "free");
    const started = await call("POST", "/api/v1/sessions", { promptId: prompt.id });
    assert.equal(started.status, 201);
    session = started.body.session;
    const node = (id, kind, label) => ({ id, type: "systemNode", position: { x: 0, y: 0 }, data: { kind, label, note: `Why ${label}` } });
    const diagram = {
      nodes: [node("n1", "client", "Web client"), node("n2", "api-gateway", "Gateway"), node("n3", "service", "App service"), node("n4", "postgres", "Database")],
      edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }, { id: "e3", source: "n3", target: "n4" }],
    };
    const saved = await call("PUT", `/api/v1/sessions/${session.id}/diagram`, { version: session.diagramVersion, diagram });
    assert.equal(saved.status, 200);
    const stale = await call("PUT", `/api/v1/sessions/${session.id}/diagram`, { version: session.diagramVersion, diagram });
    assert.equal(stale.status, 409, "a stale version must not overwrite newer work");
    assert.equal((await call("PATCH", `/api/v1/sessions/${session.id}`, { status: "completed" })).status, 200);
  });

  await step("AI review (fake provider) and idempotent retry", async () => {
    const requestId = crypto.randomUUID();
    const review = await call("POST", `/api/v1/sessions/${session.id}/reviews`, { requestId });
    assert.equal(review.status, 201, JSON.stringify(review.body));
    assert.equal(review.body.review.status, "succeeded");
    const replay = await call("POST", `/api/v1/sessions/${session.id}/reviews`, { requestId });
    assert.equal(replay.body.reused, true);
    assert.equal(replay.body.review.id, review.body.review.id);
  });

  await step("maintenance requires the cron secret", async () => {
    assert.equal((await call("GET", "/api/v1/internal/maintenance")).status, 404);
    const run = await call("GET", "/api/v1/internal/maintenance", undefined, { Authorization: "Bearer smoke-secret" });
    assert.equal(run.status, 200);
    assert.equal(typeof run.body.deleted.rateLimits, "number");
  });

  await step("community articles: write, review, request changes, publish", async () => {
    const signInAs = async (email) => {
      cookie = "";
      const { body } = await call("POST", "/api/v1/auth/request-code", { email });
      assert.equal((await call("POST", "/api/v1/auth/verify-code", { email, code: body.devCode })).status, 200);
      return cookie;
    };
    const authorCookie = await signInAs("writer@example.com");
    await call("PATCH", "/api/v1/me", { displayName: "Asha Writer" });

    // Drafts can be incomplete; the handbook's own URLs are reserved.
    assert.equal((await call("POST", "/api/v1/articles", { title: "Caching", category: "caching", slug: "caching" })).status, 409, "handbook slugs are reserved");
    const created = await call("POST", "/api/v1/articles", { title: "Designing a feature flag service", category: "architecture", slug: "feature-flag-service" });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.article.id;
    const notReady = await call("POST", `/api/v1/articles/${id}/submit`, {});
    assert.equal(notReady.status, 422);
    assert.ok(notReady.body.error.problems.length >= 3, "submitting an incomplete draft lists what's missing");

    const body = [
      "## Why feature flags", "Flags separate deploying code from releasing a feature. ".repeat(8),
      "## Evaluating flags fast", "Clients cache rules and evaluate locally so a flag check costs microseconds. ".repeat(6),
      "- rules are versioned", "- updates stream to clients",
      "| Option | Latency |", "|---|---|", "| Local evaluation | microseconds |", "| Remote call | milliseconds |",
      "Read more about [caching](/learn/caching).",
    ].join("\n\n");
    const saved = await call("PATCH", `/api/v1/articles/${id}`, { shortTitle: "Feature flag service", description: "How to design a feature flag service: rule storage, fast local evaluation, streaming updates and safe rollouts.", level: "Intermediate", body });
    assert.equal(saved.status, 200);
    const submitted = await call("POST", `/api/v1/articles/${id}/submit`, {});
    assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
    assert.equal(submitted.body.article.status, "in_review");
    assert.equal((await call("PATCH", `/api/v1/articles/${id}`, { title: "Sneaky edit during review" })).status, 409, "no edits while in review");
    assert.equal((await call("GET", "/api/v1/admin/articles")).status, 403, "authors aren't admins");

    // ADMIN_EMAILS makes admin@example.com an admin.
    const adminCookie = await signInAs("admin@example.com");
    assert.equal((await call("GET", "/api/v1/session")).body.user.isAdmin, true);
    const queue = await call("GET", "/api/v1/admin/articles?status=in_review");
    assert.ok(queue.body.articles.some((article) => article.id === id), "the submission is in the review queue");
    assert.equal((await call("POST", `/api/v1/admin/articles/${id}/decision`, { action: "request_changes" })).status, 400, "feedback is required");
    const changes = await call("POST", `/api/v1/admin/articles/${id}/decision`, { action: "request_changes", message: "Add a section on rollout safety." });
    assert.equal(changes.body.article.status, "changes_requested");

    cookie = authorCookie;
    const thread = await call("GET", `/api/v1/articles/${id}`);
    assert.ok(thread.body.messages.some((message) => message.role === "admin" && message.body.includes("rollout safety")), "the author sees the feedback");
    assert.equal(thread.body.canEdit, true);
    await call("PATCH", `/api/v1/articles/${id}`, { body: `${body}\n\n## Rolling out safely\n\nStart with internal users, then 1%, then everyone, watching error rates.` });
    assert.equal((await call("POST", `/api/v1/articles/${id}/messages`, { body: "Added the rollout section, thanks!" })).status, 201);
    assert.equal((await call("POST", `/api/v1/articles/${id}/submit`, {})).body.article.status, "in_review");

    cookie = adminCookie;
    const published = await call("POST", `/api/v1/admin/articles/${id}/decision`, { action: "publish" });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.equal(published.body.article.status, "published");

    cookie = "";
    const list = await call("GET", "/api/v1/articles/published");
    assert.ok(list.body.articles.some((article) => article.slug === "feature-flag-service" && article.authorName === "Asha Writer"), "published articles are public");
    const page = await call("GET", "/api/v1/articles/published/feature-flag-service");
    assert.match(page.body.article.body, /Rolling out safely/);

    // Admins can grant and revoke admin access.
    cookie = adminCookie;
    const writer = await query("select id from users where email = 'writer@example.com'");
    assert.equal((await call("POST", "/api/v1/admin/admins", { email: "writer@example.com" })).status, 201);
    assert.ok((await call("GET", "/api/v1/admin/admins")).body.admins.some((admin) => admin.email === "writer@example.com"));
    assert.equal((await call("DELETE", `/api/v1/admin/admins/${writer[0].id}`)).status, 200);
    assert.equal((await call("POST", "/api/v1/admin/admins", { email: "nobody@example.com" })).status, 404);
    cookie = authorCookie;
  });

  await step("sign out ends the session", async () => {
    assert.equal((await call("POST", "/api/v1/auth/sign-out", {})).status, 200);
    assert.equal((await call("GET", "/api/v1/me")).status, 401);
  });

  console.log(`\nsmoke: ${steps.length} checks passed`);
} catch (error) {
  failed = true;
  console.error(`\nsmoke: FAILED after ${steps.length} checks\n`, error);
} finally {
  server.close();
  await close();
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
  process.exitCode = failed ? 1 : 0;
}
