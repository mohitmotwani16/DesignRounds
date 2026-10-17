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
Object.assign(process.env, { PGLITE_DIR: dataDir, AI_PROVIDER: "fake", CRON_SECRET: "smoke-secret", DEV_TOOLS: "true", GROQ_API_KEY: "" });
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV", "VOICE_ANSWERS"]) delete process.env[key];

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

  await step("voice answers: transcribed, answered, never served back", async () => {
    const prompt = prompts.find((entry) => entry.access === "free");
    const round = (await call("POST", "/api/v1/sessions", { promptId: prompt.id })).body.session;
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), crypto.getRandomValues(Buffer.alloc(4000))]);
    const audio = (overrides = {}) => ({ requestId: crypto.randomUUID(), mimeType: "audio/webm;codecs=opus", durationMs: 9000, data: webm.toString("base64"), ...overrides });
    const url = `/api/v1/sessions/${round.id}/interview/audio`;

    assert.equal((await call("POST", url, audio())).status, 403, "the interviewer, and so voice, is Plus-only");
    assert.equal((await call("POST", "/api/v1/dev/plan", { plan: "plus" })).status, 200);
    const opened = await call("GET", `/api/v1/sessions/${round.id}/interview`);
    assert.equal(opened.body.voice, true);
    const usedBefore = opened.body.allowance.turns.used;

    const body = audio();
    const sending = call("POST", url, body);
    let reserved = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await query("select id from interview_turns where request_id = $1", [body.requestId])).length) {
        reserved = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(reserved, "the first request reserves its turn");
    const inProgress = await call("POST", url, body);
    assert.equal(inProgress.status, 409);
    assert.equal(inProgress.body.error.code, "INTERVIEWER_BUSY");

    const sent = await sending;
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const [mine, reply] = sent.body.turns;
    assert.deepEqual([mine.role, mine.kind, mine.content, mine.audio], ["learner", "audio", "", { durationMs: 9000 }], "the learner sees only the duration");
    assert.equal(reply.role, "interviewer", "the interviewer replies to a voice answer");
    assert.equal(sent.body.allowance.turns.used, usedBefore + 1, "a voice answer is one reply");

    const [stored] = await query(
      `select t.content, a.mime_type, a.size_bytes, octet_length(a.data) as bytes, a.stt_model, a.delivery, a.transcribed_at
         from interview_turns t join interview_audio a on a.turn_id = t.id where t.id = $1`, [mine.id]);
    assert.match(stored.content, /shard by user id/, "the transcript is the turn's content server-side");
    assert.deepEqual([stored.mime_type, stored.size_bytes, Number(stored.bytes), stored.stt_model], ["audio/webm", webm.length, webm.length, "fake"]);
    assert.ok(stored.transcribed_at);
    const delivery = typeof stored.delivery === "string" ? JSON.parse(stored.delivery) : stored.delivery;
    assert.deepEqual([delivery.hesitations, delivery.repeats, delivery.longPauses], [2, 1, 1], "delivery numbers come from the word timings");
    assert.ok(delivery.wordsPerMinute > 0);

    const replay = await call("POST", url, body);
    assert.equal(replay.body.replayed, true);
    assert.deepEqual(replay.body.turns.map((turn) => turn.id), [mine.id, reply.id], "a retried upload is answered once");

    const thread = JSON.stringify((await call("GET", `/api/v1/sessions/${round.id}/interview`)).body);
    assert.ok(!thread.includes("shard by user id"), "the transcript is never sent to the client");
    assert.ok(!thread.includes(body.data.slice(0, 40)), "nor is the recording");

    const long = Buffer.concat([webm, Buffer.alloc(1024 * 1024)]).toString("base64");
    assert.equal((await call("POST", url, audio({ data: long, durationMs: 115_000 }))).status, 201, "a near-limit recording is over the general 600kb body limit but accepted");
    const ogg = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(4000)]).toString("base64");
    assert.equal((await call("POST", url, audio({ data: ogg }))).body.error.code, "INVALID_AUDIO", "declared type must match the bytes");
    assert.equal((await call("POST", url, audio({ mimeType: "video/mp4" }))).status, 400);
    assert.equal((await call("POST", url, audio({ durationMs: 10 * 60_000 }))).status, 400, "longer than the limit");

    const text = await call("POST", `/api/v1/sessions/${round.id}/interview/messages`, { requestId: crypto.randomUUID(), content: "I'd shard by user id." });
    assert.equal(text.status, 201, "text still works after a voice answer");

    // The interviewer's private communication notes are kept on each answer, never sent.
    const notes = await query("select kind, communication from interview_turns where session_id = $1 and role = 'learner' and kind in ('audio', 'message') order by seq", [round.id]);
    const signalsOf = (row) => (typeof row.communication === "string" ? JSON.parse(row.communication) : row.communication)?.signals ?? [];
    assert.ok(signalsOf(notes[0]).includes("hedging"), "a hesitant spoken answer is noted");
    assert.ok(signalsOf(notes.at(-1)).includes("clear"), "a clear typed answer is noted");
    const visible = JSON.stringify((await call("GET", `/api/v1/sessions/${round.id}/interview`)).body);
    assert.ok(!visible.includes("Sample note") && !visible.includes("hedging"), "notes never reach the client during the round");

    // The final review adds communication feedback, separate from the design score.
    const node = (id, kind, label) => ({ id, type: "systemNode", position: { x: 0, y: 0 }, data: { kind, label, note: "" } });
    const diagram = { nodes: [node("n1", "client", "Client"), node("n2", "service", "API"), node("n3", "postgres", "DB")], edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }] };
    const current = (await call("GET", `/api/v1/sessions/${round.id}`)).body.session;
    assert.equal((await call("PUT", `/api/v1/sessions/${round.id}/diagram`, { version: current.diagramVersion, diagram })).status, 200);
    assert.equal((await call("PATCH", `/api/v1/sessions/${round.id}`, { status: "completed" })).status, 200);
    const reviewed = await call("POST", `/api/v1/sessions/${round.id}/reviews`, { requestId: crypto.randomUUID() });
    assert.equal(reviewed.status, 201, JSON.stringify(reviewed.body));
    const communication = reviewed.body.review.communication;
    assert.ok(communication && communication.summary && communication.workOn.length, "the review has a communication section");
    assert.deepEqual([communication.stats.spokenAnswers, communication.stats.typedAnswers], [2, 1]);
    assert.ok(communication.stats.wordsPerMinute > 0 && communication.stats.hesitationsPerMinute > 0);

    // Recordings are cleared after 30 days; the transcript and numbers stay.
    await query("update interview_audio set transcribed_at = now() - interval '31 days' where turn_id = $1", [mine.id]);
    assert.ok((await call("GET", "/api/v1/internal/maintenance", undefined, { Authorization: "Bearer smoke-secret" })).body.deleted.voiceRecordings >= 1);
    const [purged] = await query("select data, purged_at, delivery from interview_audio where turn_id = $1", [mine.id]);
    assert.ok(purged.data === null && purged.purged_at && purged.delivery);

    assert.equal((await call("DELETE", `/api/v1/sessions/${round.id}`)).status, 200);
    assert.equal((await query("select 1 from interview_audio where turn_id = $1", [mine.id])).length, 0, "deleting the round deletes the recording");
    assert.equal((await call("POST", "/api/v1/dev/plan", { plan: "free" })).status, 200);
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
