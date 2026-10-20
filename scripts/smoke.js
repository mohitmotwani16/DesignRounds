// End-to-end smoke test: boots the real app on a throwaway embedded database and walks
// the critical paths over HTTP (sign-in, profile, a practice round, a review, security
// checks, maintenance). Runs in CI on every push; `npm run test:smoke` locally.
//
// Uses the console email provider and the fake AI provider, so it needs no secrets.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "designrounds-smoke-"));
Object.assign(process.env, {
  PGLITE_DIR: dataDir,
  AI_PROVIDER: "fake",
  // This run covers the v2 interviewer; scripts/smoke-conductor.js covers v3.
  INTERVIEWER_V3: "false",
  CRON_SECRET: "smoke-secret",
  DEV_TOOLS: "true",
  ADMIN_EMAILS: "admin@example.com",
  GROQ_API_KEY: "",
  // A developer's .env must not turn Google sign-in on for this test. Blank
  // values are kept by loadEnvFile, which does not override existing variables.
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  // A developer's .env may enable Turnstile. Blank values block loadEnvFile
  // from turning the human check on for the rest of this run.
  TURNSTILE_SITE_KEY: " ",
  TURNSTILE_SECRET_KEY: " ",
});
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV", "VOICE_ANSWERS"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close, query } = await import("../server/db.js");
const { prompts } = await import("../src/data/prompts.js");
const { aiLimits } = await import("../src/data/plans.js");
const { recommendedFreeRound } = await import("../src/data/free-rounds.js");
const { filterFillerWords } = await import("../server/modules/ai/communication.js");
const { interviewerTask } = await import("../server/modules/ai/tasks/interviewer.js");
const { communicationInput, interviewTranscript } = await import("../server/modules/interviews.js");

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
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const sessionCookie = setCookies.find((value) => /^(?:__Host-)?dr_session=/.test(value));
  if (sessionCookie) cookie = sessionCookie.split(";")[0];
  else if (!setCookies.length) {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
  }
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
  await step("answer context preserves verbatim text and filters fillers", async () => {
    const original = "Um, so I would I would put a cache in front of the database, and, uh, shard by user id.";
    assert.equal(filterFillerWords(original), "so I would I would put a cache in front of the database, and shard by user id.");
    assert.match(original, /\bum\b.*\buh\b/i, "the original answer remains available for exact quotes");

    const prompt = interviewerTask.buildUser({
      prompt: { title: "Cache design", difficulty: "Intermediate", description: "Design a cache.", requirements: [] },
      guide: null,
      design: { text: "Components (0): none" },
      state: { stage: "high_level", covered: [], summary: "" },
      turns: [{
        role: "learner",
        kind: "audio",
        content: "Um, we'd use Redis, uh, to cache hot reads.",
        delivery: { hesitations: 2, fillerPhrases: 0, longPauses: 0, repeats: 0 },
        audio_duration_ms: 5000,
        answer_context: JSON.stringify({ filteredContent: "we'd use Redis to cache hot reads", technicalContext: "Use Redis for hot-read caching." }),
      }],
      trigger: "reply",
      selected: null,
      changes: null,
      candidates: [],
      hints: { used: 0, limit: 3 },
    });
    assert.match(prompt, /Previously extracted technical context: Use Redis for hot-read caching\./);
    assert.match(prompt, /Learner \(spoken answer/);
    assert.match(prompt, /we'd use Redis to cache hot reads/);
    assert.doesNotMatch(prompt, /Um, we'd use Redis/);
  });

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

  await step("free-round recommendations follow profile discipline and level", async () => {
    const recommendation = recommendedFreeRound({ targetRole: "Data engineer", experienceLevel: "6–10 years" });
    assert.equal(recommendation.track, "data-engineering");
    assert.equal(recommendation.access, "free");
    assert.equal(recommendedFreeRound({ targetRole: "Other" }).track, "software-engineering");
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
    assert.equal(anonymous.body.turnstileSiteKey, null);
  });

  await step("google sign-in redirects when unconfigured", async () => {
    const response = await fetch(`${base}/api/v1/auth/google?next=/library`, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.match(response.headers.get("location") || "", /error=google_unconfigured/);

    // "/\evil.com" is protocol-relative in browsers and must fall back to the library.
    const sneaky = await fetch(`${base}/api/v1/auth/google?next=${encodeURIComponent("/\\evil.com")}`, { redirect: "manual" });
    assert.match(sneaky.headers.get("location") || "", /next=%2Flibrary&/);
  });

  await step("turnstile gates sign-in codes when configured", async () => {
    process.env.TURNSTILE_SITE_KEY = "3x00000000000000000000FF";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    try {
      const session = await call("GET", "/api/v1/session");
      assert.equal(session.body.turnstileSiteKey, "3x00000000000000000000FF");
      assert.equal((await call("POST", "/api/v1/auth/request-code", { email: "bot@example.com" })).status, 403);
      const passed = await call("POST", "/api/v1/auth/request-code", {
        email: "bot@example.com",
        turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
      });
      assert.equal(passed.status, 200);
      assert.match(passed.body.devCode, /^\d{6}$/);

      const verified = await call("POST", "/api/v1/auth/verify-code", { email: "bot@example.com", code: passed.body.devCode });
      assert.equal(verified.status, 200);
      assert.ok(verified.body.launchId, "this page load is checked because the code was requested on the same network");
      assert.equal((await call("GET", "/api/v1/me")).status, 403, "a saved login is not enough on its own");
      assert.equal((await call("GET", "/api/v1/me", undefined, { "X-Human-Launch": verified.body.launchId })).status, 200);
      await query("update auth_sessions set human_ip = '203.0.113.50' where human_launch = $1", [verified.body.launchId]);
      const moved = await call("GET", "/api/v1/me", undefined, { "X-Human-Launch": verified.body.launchId });
      assert.equal(moved.status, 403);
      assert.equal(moved.body.error.code, "NETWORK_CHANGED");
      assert.equal((await call("POST", "/api/v1/auth/sign-out", {})).status, 200);
    } finally {
      process.env.TURNSTILE_SITE_KEY = " ";
      process.env.TURNSTILE_SECRET_KEY = " ";
    }
  });

  await step("cross-site and non-JSON writes are rejected", async () => {
    const crossSite = await call("POST", "/api/v1/auth/request-code", { email: "a@example.com" }, { Origin: "https://evil.example" });
    assert.equal(crossSite.status, 403);
    const form = await fetch(`${base}/api/v1/auth/request-code`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "email=a@example.com" });
    assert.equal(form.status, 415);
  });

  await step("visitors join the Plus waitlist", async () => {
    cookie = "";
    const joined = await call("POST", "/api/v1/plus/waitlist", { email: "Waitlist@Example.com" });
    assert.equal(joined.status, 201);
    assert.deepEqual(joined.body, { joined: true });
    const again = await call("POST", "/api/v1/plus/waitlist", { email: "waitlist@example.com" });
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, { joined: true }, "a visitor can't tell whether an address was already listed");
    const [row] = await query("select email, user_id from plus_waitlist where email = 'waitlist@example.com'");
    assert.equal(row.user_id, null);
    assert.equal((await call("POST", "/api/v1/plus/waitlist", {})).status, 400);
    assert.equal((await call("POST", "/api/v1/plus/waitlist", { email: "not-an-email" })).status, 400);
    assert.equal((await call("GET", "/api/v1/plus/waitlist")).status, 401);
    assert.equal((await call("GET", "/api/v1/admin/plus-waitlist")).status, 401);

    process.env.TURNSTILE_SITE_KEY = "3x00000000000000000000FF";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    try {
      assert.equal((await call("POST", "/api/v1/plus/waitlist", { email: "bot-waitlist@example.com" })).status, 403, "visitors pass the human check");
      const human = await call("POST", "/api/v1/plus/waitlist", { email: "bot-waitlist@example.com", turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
      assert.equal(human.status, 201);
    } finally {
      process.env.TURNSTILE_SITE_KEY = " ";
      process.env.TURNSTILE_SECRET_KEY = " ";
    }
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

  await step("completed onboarding persists across sign-in", async () => {
    await query("update login_codes set created_at = now() - interval '2 hours' where email = $1", [email]);
    assert.equal((await call("POST", "/api/v1/auth/sign-out", {})).status, 200);
    const requested = await call("POST", "/api/v1/auth/request-code", { email });
    assert.equal(requested.status, 200);
    assert.equal((await call("POST", "/api/v1/auth/verify-code", { email, code: requested.body.devCode })).status, 200);
    assert.equal((await call("GET", "/api/v1/session")).body.user.onboarded, true);
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
      `select t.content, t.answer_context, a.mime_type, a.size_bytes, octet_length(a.data) as bytes, a.storage_key, a.stt_model, a.delivery, a.transcribed_at
         from interview_turns t join interview_audio a on a.turn_id = t.id where t.id = $1`, [mine.id]);
    assert.match(stored.content, /shard by user id/, "the transcript is the turn's content server-side");
    const answerContext = typeof stored.answer_context === "string" ? JSON.parse(stored.answer_context) : stored.answer_context;
    assert.ok(answerContext.technicalContext.includes("shard by user id"), "technical context is extracted for later interviewer turns");
    assert.ok(answerContext.communicationGaps.includes("hedging"), "communication gaps are stored separately");
    assert.ok(!/\bum\b|\buh\b/i.test(answerContext.filteredContent), "the interviewer-facing copy removes common spoken fillers");
    assert.match(stored.content, /\bum\b.*\buh\b/i, "filler filtering never overwrites the verbatim transcript");
    assert.deepEqual([stored.mime_type, stored.size_bytes, stored.stt_model], ["audio/webm", webm.length, "fake"]);
    if (stored.storage_key) assert.equal(stored.bytes, null, "with R2 configured, bytes live in object storage");
    else assert.equal(Number(stored.bytes), webm.length, "without R2, bytes stay in Postgres");
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
    assert.ok(!thread.includes("technicalContext") && !thread.includes("communicationGaps"), "private segregated context is never sent to the client");

    const long = Buffer.concat([webm, Buffer.alloc(1024 * 1024)]).toString("base64");
    assert.equal((await call("POST", url, audio({ data: long, durationMs: 115_000 }))).status, 201, "a near-limit recording is over the general 600kb body limit but accepted");
    const ogg = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(4000)]).toString("base64");
    assert.equal((await call("POST", url, audio({ data: ogg }))).body.error.code, "INVALID_AUDIO", "declared type must match the bytes");
    assert.equal((await call("POST", url, audio({ mimeType: "video/mp4" }))).status, 400);
    assert.equal((await call("POST", url, audio({ durationMs: 10 * 60_000 }))).status, 400, "longer than the limit");

    const text = await call("POST", `/api/v1/sessions/${round.id}/interview/messages`, { requestId: crypto.randomUUID(), content: "I'd shard by user id." });
    assert.equal(text.status, 201, "text still works after a voice answer");
    const typedTurn = await query("select answer_context from interview_turns where session_id = $1 and kind = 'message' order by seq desc limit 1", [round.id]);
    const typedContext = typeof typedTurn[0].answer_context === "string" ? JSON.parse(typedTurn[0].answer_context) : typedTurn[0].answer_context;
    assert.equal(typedContext.filteredContent, "I'd shard by user id.", "typed text is preserved by the filler filter");

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
    const contextInput = await communicationInput(round.id);
    const spokenContext = contextInput.answers.find((answer) => answer.spoken);
    assert.match(spokenContext.technicalContext, /shard by user id/);
    assert.ok(spokenContext.communicationGaps.includes("hedging"));
    assert.match(spokenContext.filteredContent, /shard by user id/);
    assert.match(await interviewTranscript(round.id), /Extracted technical context:.*shard by user id/);

    // Recordings are cleared after 30 days; the transcript and numbers stay.
    await query("update interview_audio set transcribed_at = now() - interval '31 days' where turn_id = $1", [mine.id]);
    assert.ok((await call("GET", "/api/v1/internal/maintenance", undefined, { Authorization: "Bearer smoke-secret" })).body.deleted.voiceRecordings >= 1);
    const [purged] = await query("select data, storage_key, purged_at, delivery from interview_audio where turn_id = $1", [mine.id]);
    assert.ok(purged.data === null && purged.storage_key === null && purged.purged_at && purged.delivery);
    const [transcriptRow] = await query("select content from interview_turns where id = $1", [mine.id]);
    assert.match(transcriptRow.content, /shard by user id/, "the verbatim transcript outlives the recording");

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

  await step("new questions are queued for a reference answer pool", async () => {
    const rows = await query("select status, count(*)::int as n from answer_pools group by status");
    const pending = rows.find((row) => row.status === "pending");
    assert.equal(pending?.n, prompts.length);
    assert.equal((await call("GET", "/api/v1/internal/maintenance", undefined, { Authorization: "Bearer smoke-secret" })).body.answerPools.built, 0);
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
    assert.equal((await call("GET", "/api/v1/admin/members")).status, 403, "only admins can list users");
    assert.equal((await call("POST", "/api/v1/admin/invitations", { email: "nope@example.com", plan: "free" })).status, 403, "only admins can invite accounts");

    // ADMIN_EMAILS makes admin@example.com an admin.
    const adminCookie = await signInAs("admin@example.com");
    assert.equal((await call("GET", "/api/v1/session")).body.user.isAdmin, true);
    const ownerCookie = await signInAs("designrounds.app@gmail.com");
    cookie = ownerCookie;
    assert.equal((await call("GET", "/api/v1/session")).body.user.isAdmin, true, "the requested owner account is an admin");
    cookie = adminCookie;
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
    const writerStatus = await call("GET", "/api/v1/admin/members?email=writer%40example.com");
    assert.equal(writerStatus.status, 200);
    assert.equal(writerStatus.body.members[0].isAdmin, false);
    assert.equal((await call("PUT", `/api/v1/admin/members/${writer[0].id}/plan`, { plan: "plus" })).status, 400, "Plus requires an expiry date");
    assert.equal((await call("PUT", `/api/v1/admin/members/${writer[0].id}/plan`, { plan: "plus", expiresAt: "2028-02-30" })).status, 400, "invalid calendar dates are rejected");
    const today = new Date().toISOString().slice(0, 10);
    const pastDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    assert.equal((await call("PUT", `/api/v1/admin/members/${writer[0].id}/plan`, { plan: "plus", expiresAt: today })).status, 200);
    cookie = authorCookie;
    assert.equal((await call("GET", "/api/v1/me")).body.user.plan, "plus", "expiry is inclusive through its UTC date");
    const paidPrompt = prompts.find((entry) => entry.access === "paid");
    assert.equal((await call("GET", `/api/v1/rounds/${paidPrompt.id}`)).status, 200);
    const plusSession = (await call("POST", "/api/v1/sessions", { promptId: paidPrompt.id })).body.session;
    assert.equal((await call("GET", `/api/v1/sessions/${plusSession.id}/reviews`)).body.allowance.plan, "plus");
    cookie = adminCookie;
    assert.equal((await call("PUT", `/api/v1/admin/members/${writer[0].id}/plan`, { plan: "plus", expiresAt: pastDate })).status, 200);
    const expiredMember = (await call("GET", "/api/v1/admin/members?email=writer%40example.com")).body.members[0];
    assert.equal(expiredMember.plan, "free", "expired Plus is shown as Free");
    assert.equal(expiredMember.storedPlan, "plus", "the stored expiry remains visible to admins");
    cookie = authorCookie;
    assert.equal((await call("GET", "/api/v1/me")).body.user.plan, "free");
    assert.equal((await call("GET", `/api/v1/rounds/${paidPrompt.id}`)).status, 403);
    assert.equal((await call("POST", "/api/v1/sessions", { promptId: paidPrompt.id })).status, 403);
    assert.equal((await call("GET", `/api/v1/sessions/${plusSession.id}/reviews`)).body.allowance.plan, "free");
    cookie = adminCookie;
    assert.equal((await call("POST", "/api/v1/admin/admins", { email: "writer@example.com" })).status, 201);
    assert.ok((await call("GET", "/api/v1/admin/admins")).body.admins.some((admin) => admin.email === "writer@example.com"));
    assert.equal((await call("GET", "/api/v1/admin/members?email=writer%40example.com")).body.members[0].isAdmin, true, "the user list reflects role changes");
    assert.equal((await call("DELETE", `/api/v1/admin/admins/${writer[0].id}`)).status, 200);
    assert.equal((await call("GET", "/api/v1/admin/members?email=writer%40example.com")).body.members[0].isAdmin, false);
    assert.equal((await call("POST", "/api/v1/admin/admins", { email: "nobody@example.com" })).status, 404);

    const inviteSend = await call("POST", "/api/v1/admin/invitations", { email: "invite-send@example.com", plan: "free", expiresAt: null });
    assert.equal(inviteSend.status, 201, JSON.stringify(inviteSend.body));
    assert.equal(inviteSend.body.plan, "free");
    assert.equal((await call("POST", "/api/v1/admin/invitations", { email: "missing-date@example.com", plan: "plus" })).status, 400);

    const invitationToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(invitationToken).digest("hex");
    const [admin] = await query("select id from users where email = 'admin@example.com'");
    await query(
      `insert into users (email) values ('invited@example.com') on conflict (email) do nothing`
    );
    await query(
      `insert into invitations (email, token_hash, plan, plan_expires_at, created_by)
       values ('invited@example.com', $1, 'plus', $2::date, $3)`,
      [tokenHash, new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10), admin.id]
    );
    cookie = "";
    const invitation = await call("GET", `/api/v1/invitations/${invitationToken}`);
    assert.equal(invitation.status, 200);
    assert.equal(invitation.body.email, "invited@example.com");
    assert.equal(invitation.body.plan, "plus");
    assert.equal((await call("POST", `/api/v1/invitations/${invitationToken}/accept`, {})).status, 401);
    const inviteeCookie = await signInAs("invited@example.com");
    cookie = authorCookie;
    assert.equal((await call("POST", `/api/v1/invitations/${invitationToken}/accept`, {})).status, 403, "another account cannot accept the invitation");
    cookie = inviteeCookie;
    const accepted = await call("POST", `/api/v1/invitations/${invitationToken}/accept`, {});
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal((await call("POST", `/api/v1/invitations/${invitationToken}/accept`, {})).body.alreadyAccepted, true, "acceptance retries are idempotent");
    assert.equal((await call("GET", "/api/v1/me")).body.user.plan, "plus");
    const [welcomed] = await query("select welcome_email_sent_at, welcome_email_claimed_at from users where email = 'invited@example.com'");
    assert.ok(welcomed.welcome_email_sent_at || welcomed.welcome_email_claimed_at, "a new account is queued for its first-login welcome email");
    cookie = authorCookie;
  });

  await step("members join the Plus waitlist and admins see it", async () => {
    const previousCookie = cookie;
    const signInAs = async (address) => {
      cookie = "";
      // Earlier steps signed some of these in; skip the resend cooldown.
      await query("delete from login_codes where email = $1", [address]);
      const { body } = await call("POST", "/api/v1/auth/request-code", { email: address });
      assert.equal((await call("POST", "/api/v1/auth/verify-code", { email: address, code: body.devCode })).status, 200);
      return cookie;
    };
    await signInAs("plus-curious@example.com");
    assert.equal((await call("GET", "/api/v1/plus/waitlist")).body.joined, false);
    const joined = await call("POST", "/api/v1/plus/waitlist", { email: "someone-else@example.com" });
    assert.equal(joined.status, 201);
    assert.equal(joined.body.alreadyJoined, false);
    assert.equal((await query("select 1 from plus_waitlist where email = 'someone-else@example.com'")).length, 0, "members join with their account email only");
    assert.equal((await call("GET", "/api/v1/plus/waitlist")).body.joined, true);
    assert.equal((await call("POST", "/api/v1/plus/waitlist", {})).body.alreadyJoined, true, "joining twice is idempotent");
    assert.equal((await call("GET", "/api/v1/admin/plus-waitlist")).status, 403, "only admins can list the waitlist");

    // A visitor who signs up later is linked to the account when they join again.
    await signInAs("waitlist@example.com");
    assert.equal((await call("GET", "/api/v1/plus/waitlist")).body.joined, true);
    assert.equal((await call("POST", "/api/v1/plus/waitlist", {})).body.alreadyJoined, true);
    const [linked] = await query("select user_id from plus_waitlist where email = 'waitlist@example.com'");
    assert.ok(linked.user_id);

    await signInAs("admin@example.com");
    const list = await call("GET", "/api/v1/admin/plus-waitlist");
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 3);
    assert.equal(list.body.entries.length, 3);
    const member = list.body.entries.find((entry) => entry.email === "plus-curious@example.com");
    assert.equal(member.hasAccount, true);
    assert.equal(list.body.entries.find((entry) => entry.email === "bot-waitlist@example.com").hasAccount, false);

    // Deleting the account removes the address from the list.
    await signInAs("plus-curious@example.com");
    assert.equal((await call("DELETE", "/api/v1/me", { confirmEmail: "plus-curious@example.com" })).status, 200);
    assert.equal((await query("select 1 from plus_waitlist where email = 'plus-curious@example.com'")).length, 0);
    cookie = previousCookie;
  });

  // Signs in as another address for a step; the caller restores `cookie` afterwards.
  const signInAs = async (address) => {
    cookie = "";
    await query("delete from login_codes where email = $1", [address]);
    const { body } = await call("POST", "/api/v1/auth/request-code", { email: address });
    assert.equal((await call("POST", "/api/v1/auth/verify-code", { email: address, code: body.devCode })).status, 200);
  };

  await step("one free interviewer round per email, on a free question", async () => {
    const previousCookie = cookie;
    const [first, second, third] = prompts.filter((entry) => entry.access === "free");
    await signInAs("trial@example.com");
    const round = (await call("POST", "/api/v1/sessions", { promptId: first.id })).body.session;
    assert.equal(round.interviewerTrial, false);
    const locked = await call("GET", `/api/v1/sessions/${round.id}/interview`);
    assert.equal(locked.body.access, "locked");
    assert.equal(locked.body.trial, "available");

    const started = await call("POST", `/api/v1/sessions/${round.id}/interview/trial`, {});
    assert.equal(started.status, 201);
    assert.equal((await call("POST", `/api/v1/sessions/${round.id}/interview/trial`, {})).body.started, false, "starting it again on the same round is a no-op");
    const open = await call("GET", `/api/v1/sessions/${round.id}/interview`);
    assert.equal(open.body.access, "full");
    assert.equal(open.body.allowance.turns.limit, aiLimits.trial.interviewTurnsPerRound);
    assert.equal((await call("GET", `/api/v1/sessions/${round.id}`)).body.session.interviewerTrial, true);
    const reviews = await call("GET", `/api/v1/sessions/${round.id}/reviews`);
    assert.equal(reviews.body.allowance.trial, true);
    assert.equal(reviews.body.allowance.round.limit, aiLimits.trial.reviewsPerRound, "review counts stay on the free plan");

    const other = (await call("POST", "/api/v1/sessions", { promptId: second.id })).body.session;
    assert.equal((await call("GET", `/api/v1/sessions/${other.id}/interview`)).body.trial, "used");
    const again = await call("POST", `/api/v1/sessions/${other.id}/interview/trial`, {});
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "TRIAL_USED");

    // The trial is tied to the address, so a fresh account for it doesn't get another.
    assert.equal((await call("DELETE", "/api/v1/me", { confirmEmail: "trial@example.com" })).status, 200);
    await signInAs("trial@example.com");
    const fresh = (await call("POST", "/api/v1/sessions", { promptId: third.id })).body.session;
    assert.equal((await call("GET", `/api/v1/sessions/${fresh.id}/interview`)).body.trial, "used");
    assert.equal((await query("select count(*)::int as n from interviewer_trials"))[0].n, 1);
    cookie = previousCookie;
  });

  await step("anyone can report a problem; admins see and resolve it", async () => {
    const previousCookie = cookie;
    cookie = "";
    const message = "The review button does nothing when I click it.";
    const visitor = await call("POST", "/api/v1/reports", { email: "Reporter@Example.com", message, page: "/library" });
    assert.equal(visitor.status, 201);
    assert.equal((await call("POST", "/api/v1/reports", { email: "reporter@example.com", message: "too short" })).status, 400);
    assert.equal((await call("POST", "/api/v1/reports", { message })).status, 400, "visitors give an email");
    assert.equal((await call("POST", "/api/v1/reports", { email: "reporter@example.com", message, page: "https://example.com/x" })).status, 400, "only a path is stored");
    assert.equal((await call("GET", "/api/v1/admin/reports")).status, 401);

    process.env.TURNSTILE_SITE_KEY = "3x00000000000000000000FF";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    try {
      assert.equal((await call("POST", "/api/v1/reports", { email: "bot@example.com", message })).status, 403, "visitors pass the human check");
      assert.equal((await call("POST", "/api/v1/reports", { email: "bot@example.com", message, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" })).status, 201);
    } finally {
      process.env.TURNSTILE_SITE_KEY = " ";
      process.env.TURNSTILE_SECRET_KEY = " ";
    }

    await signInAs("reporter-member@example.com");
    assert.equal((await call("POST", "/api/v1/reports", { email: "someone-else@example.com", message, page: "/profile" })).status, 201);
    const [row] = await query("select email, user_id, user_agent from problem_reports where page = '/profile'");
    assert.equal(row.email, "reporter-member@example.com", "members report with their account email");
    assert.ok(row.user_id);
    assert.equal((await call("GET", "/api/v1/admin/reports")).status, 403, "only admins can list reports");

    await signInAs("admin@example.com");
    const list = await call("GET", "/api/v1/admin/reports");
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 3);
    assert.equal(list.body.open, 3);
    const report = list.body.reports.find((entry) => entry.page === "/library");
    assert.equal(report.email, "reporter@example.com");
    const resolved = await call("PATCH", `/api/v1/admin/reports/${report.id}`, { status: "resolved" });
    assert.equal(resolved.body.status, "resolved");
    assert.ok(resolved.body.resolvedAt);
    assert.equal((await call("GET", "/api/v1/admin/reports")).body.open, 2);
    assert.equal((await call("PATCH", `/api/v1/admin/reports/${crypto.randomUUID()}`, { status: "resolved" })).status, 404);

    // Deleting the account removes the reports sent from it.
    await signInAs("reporter-member@example.com");
    assert.equal((await call("DELETE", "/api/v1/me", { confirmEmail: "reporter-member@example.com" })).status, 200);
    assert.equal((await query("select 1 from problem_reports where email = 'reporter-member@example.com'")).length, 0);
    cookie = previousCookie;
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
