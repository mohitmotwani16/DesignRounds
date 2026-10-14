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
Object.assign(process.env, { PGLITE_DIR: dataDir, AI_PROVIDER: "fake", CRON_SECRET: "smoke-secret", DEV_TOOLS: "true" });
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close } = await import("../server/db.js");
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

  await step("anonymous requests are rejected", async () => {
    assert.equal((await call("GET", "/api/v1/me")).status, 401);
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
    assert.equal((await call("GET", "/api/v1/nope")).status, 404);
  });

  await step("resend cooldown is enforced", async () => {
    assert.equal((await call("POST", "/api/v1/auth/request-code", { email })).status, 429);
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
