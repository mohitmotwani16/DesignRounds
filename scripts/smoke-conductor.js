// End-to-end test of the v3 interviewer (the Interview Conductor) over HTTP, on a
// throwaway embedded database with the fake AI provider: an admin builds and publishes
// a Problem Pack, then a Plus learner runs a whole round on it.
//   npm run test:smoke:v3
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "designrounds-conductor-"));
Object.assign(process.env, {
  PGLITE_DIR: dataDir,
  AI_PROVIDER: "fake",
  INTERVIEWER_V3: "true",
  PROBLEM_PACKS: "off",
  DEV_TOOLS: "true",
  ADMIN_EMAILS: "admin@example.com",
  GROQ_API_KEY: "",
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  TURNSTILE_SITE_KEY: " ",
  TURNSTILE_SECRET_KEY: " ",
});
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "VERTEX_PROJECT_ID", "NODE_ENV", "VERCEL", "VERCEL_ENV", "VOICE_ANSWERS", "PROBLEM_PACKS_AUTOPUBLISH"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close, query, queryOne } = await import("../server/db.js");
const { readPackFiles } = await import("../server/modules/pks/index.js");
const { fullPrompts } = await import("../server/modules/rounds.js");
const { guideFor } = await import("../server/modules/ai/guides.js");
const { isAnonymousKind } = await import("../server/modules/ai/components.js");
const { canvasComponents, itemDrawn } = await import("../server/modules/conductor/canvas.js");

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;

let cookie = "";
async function call(method, url, body) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const sessionCookie = setCookies.find((value) => /^(?:__Host-)?dr_session=/.test(value));
  if (sessionCookie) cookie = sessionCookie.split(";")[0];
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function signIn(email) {
  cookie = "";
  const requested = await call("POST", "/api/v1/auth/request-code", { email });
  assert.equal(requested.status, 200, JSON.stringify(requested.body));
  assert.equal((await call("POST", "/api/v1/auth/verify-code", { email, code: requested.body.devCode })).status, 200);
}

const steps = [];
async function step(name, fn) {
  const started = Date.now();
  await fn();
  steps.push(name);
  console.log(`  ok  ${name} (${Date.now() - started}ms)`);
}
const waitFor = async (check, what) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`timed out waiting for ${what}`);
};

// A question with a guide and no hand-authored pack, so this run builds its own.
const filePacks = new Set(readPackFiles().map((entry) => entry.promptId));
const prompt = fullPrompts.find((entry) => entry.access === "free" && guideFor(entry.id) && !filePacks.has(entry.id));
let failed = false;
let round;
let packVersion;
const sendMessage = (content, intent = "message") => call("POST", `/api/v1/sessions/${round.id}/interview/messages`, { requestId: crypto.randomUUID(), content, intent });
const items = () => query("select * from interview_agenda_items where session_id = $1 order by position", [round.id]);
const stateRow = () => queryOne("select * from interview_state where session_id = $1", [round.id]);

try {
  await step("startup published hand-authored packs and queued the rest", async () => {
    const published = await query("select prompt_id, builder from problem_packs where status = 'published'");
    assert.equal(published.length, filePacks.size);
    assert.ok(published.every((row) => row.builder === "manual"));
    const job = await queryOne("select status from problem_pack_jobs where prompt_id = $1", [prompt.id]);
    assert.equal(job?.status, "pending", "a question without a pack is queued");
    assert.ok(await queryOne("select 1 from ucs_versions limit 1"), "the interviewer context version is retained");
  });

  await step("admin builds a draft pack, reviews it and publishes it", async () => {
    await signIn("learner@example.com");
    assert.equal((await call("GET", "/api/v1/admin/packs")).status, 403, "packs are admin-only");
    await signIn("admin@example.com");
    const list = await call("GET", "/api/v1/admin/packs");
    assert.equal(list.status, 200);
    assert.ok(list.body.packs.some((entry) => entry.promptId === prompt.id && !entry.publishedVersion));
    assert.equal((await call("POST", `/api/v1/admin/packs/${prompt.id}/build`, {})).status, 202);
    const detail = await waitFor(async () => {
      const response = await call("GET", `/api/v1/admin/packs/${prompt.id}`);
      return response.body.versions.find((version) => version.status === "draft") ? response.body : null;
    }, "a draft pack");
    const draft = detail.versions.find((version) => version.status === "draft");
    assert.match(draft.version, /^pack-[0-9a-f]{8}$/);
    assert.ok(draft.builder.startsWith("pack-builder-v1/"));
    assert.equal(detail.publishedVersion, null, "a built pack waits for review");

    const edited = structuredClone(draft.pack);
    edited.agenda[0].probes = [...edited.agenda[0].probes, "(Edited) What numbers are you designing for?"];
    const broken = structuredClone(edited);
    broken.pacing.wrap_up = 0.9;
    assert.equal((await call("POST", `/api/v1/admin/packs/${prompt.id}/drafts`, { pack: broken })).status, 422, "an edit that breaks a rule is refused");
    const saved = await call("POST", `/api/v1/admin/packs/${prompt.id}/drafts`, { pack: edited });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.notEqual(saved.body.version, draft.version, "an edit is a new version");

    assert.equal((await call("POST", `/api/v1/admin/packs/${prompt.id}/versions/${saved.body.version}/publish`, {})).status, 200);
    packVersion = saved.body.version;
    const published = await queryOne("select version, reviewed_by from problem_packs where prompt_id = $1 and status = 'published'", [prompt.id]);
    assert.equal(published.version, packVersion);
    assert.ok(published.reviewed_by);
  });

  await step("a round on a published pack opens on the Conductor, pinned and vague", async () => {
    await signIn("candidate@example.com");
    assert.equal((await call("POST", "/api/v1/dev/plan", { plan: "plus" })).status, 200);
    const created = await call("POST", "/api/v1/sessions", { promptId: prompt.id, interviewMode: "realistic" });
    assert.equal(created.status, 201);
    round = created.body.session;
    const opened = await call("GET", `/api/v1/sessions/${round.id}/interview`);
    assert.equal(opened.status, 200);
    assert.deepEqual([opened.body.state.engine, opened.body.state.mode, opened.body.state.stage, opened.body.state.focusArea], ["v3", "realistic", "requirements", "Requirements"]);
    assert.equal(opened.body.state.clock.budgetMs, prompt.minutes * 60_000);
    assert.equal(opened.body.turns.length, 1);
    assert.equal(opened.body.turns[0].kind, "opening");
    const state = await stateRow();
    assert.equal(state.pack_version, packVersion);
    assert.match(state.ucs_version, /^ucs-/);
    assert.ok(state.candidate_snapshot && !JSON.stringify(state.candidate_snapshot).includes("@"), "the snapshot holds no email");
    const ledger = await items();
    assert.ok(ledger.length >= 6);
    assert.equal(ledger.filter((item) => item.status === "open").length, 1, "the first requirements item is opened silently");
    assert.equal(ledger.find((item) => item.status === "open").stage, "requirements");
    assert.equal((await query("select 1 from interview_events where session_id = $1 and type = 'round_started'", [round.id])).length, 1);
  });

  await step("the mode can change only before the learner speaks", async () => {
    const changed = await call("POST", `/api/v1/sessions/${round.id}/interview/mode`, { mode: "guided" });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.state.mode, "guided");
    assert.match(changed.body.turns[0].content, /guided round/);
  });

  await step("learner turns: one move each, budgets enforced in code, evidence verified", async () => {
    const before = await items();
    const focusId = before.find((item) => item.status === "open").item_id;
    const first = await sendMessage("I think we need around ten million users a day, mostly reads, and links should never expire.");
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const [mine, reply] = first.body.turns;
    assert.equal(mine.role, "learner");
    assert.equal(reply.role, "interviewer");
    assert.equal(first.body.state.engine, "v3");
    const learnerRow = await queryOne("select assessment, communication, answer_context from interview_turns where id = $1", [mine.id]);
    assert.equal(learnerRow.assessment[0].itemId, focusId);
    assert.ok(learnerRow.assessment[0].turnSeq, "the quote was matched to the learner's turn");
    const replyRow = await queryOne("select move, agenda_item_id from interview_turns where id = $1", [reply.id]);
    assert.equal(replyRow.move, "probe");
    assert.equal((await items()).find((item) => item.item_id === focusId).follow_ups, 1);

    // Guided mode allows 3 follow-ups; then the planner forbids probing and the item closes.
    for (let n = 0; n < 3; n += 1) assert.equal((await sendMessage(`More detail number ${n}: we expect about one hundred redirects per created link.`)).status, 201);
    const after = await items();
    const closed = after.find((item) => item.item_id === focusId);
    assert.equal(closed.follow_ups, 3, "never more follow-ups than the budget");
    assert.equal(closed.status, "answered");
    assert.equal(closed.band, "adequate");
    assert.ok(closed.evidence.length >= 1);
    assert.equal(after.filter((item) => item.status === "open").length, 1, "the next item is open");
    assert.ok((await stateRow()).ledger_version >= 4);
    const moves = (await query("select move from interview_turns where session_id = $1 and role = 'interviewer' order by seq", [round.id])).map((row) => row.move);
    assert.deepEqual(moves, ["open", "probe", "probe", "probe", "acknowledge_advance"]);
  });

  await step("hints follow the focus item's ladder and count against the round", async () => {
    const hint = await sendMessage("", "hint");
    assert.equal(hint.status, 201, JSON.stringify(hint.body));
    assert.equal(hint.body.turns[1].kind, "hint");
    assert.equal((await stateRow()).hints_used, 1);
    assert.equal((await items()).find((item) => item.status === "open").hint_level, 1);
  });

  await step("nothing private reaches the browser", async () => {
    const visible = JSON.stringify((await call("GET", `/api/v1/sessions/${round.id}/interview`)).body);
    const ledger = await items();
    for (const item of ledger) assert.ok(!visible.includes(`"${item.item_id}"`), `item id ${item.item_id} leaked`);
    for (const secret of ["assessment", "evidence", "moveOnSummary", "agenda_item_id", "communication", "answer_context"]) assert.ok(!visible.includes(secret), `${secret} leaked`);
  });

  await step("ticks: time checks once, a canvas question, idle nudges, and a rate limit", async () => {
    const budget = prompt.minutes * 60_000;
    const tick = (body) => call("POST", `/api/v1/sessions/${round.id}/interview/tick`, { reason: "visible", ...body });
    assert.equal((await tick({ typing: true })).body.action, "none");
    await query("update interview_state set active_ms = $2, last_activity_at = now() where session_id = $1", [round.id, Math.round(budget * 0.52)]);
    const half = await tick();
    assert.equal(half.body.action, "say", JSON.stringify(half.body));
    assert.equal(half.body.turn.kind, "time_check");
    assert.equal((await tick()).body.action, "none", "a threshold is announced once");

    // A significant, unexplained component on the canvas maps to an agenda item.
    const session = await call("GET", `/api/v1/sessions/${round.id}`);
    const diagram = { nodes: [{ id: "n1", type: "systemNode", position: { x: 0, y: 0 }, data: { kind: "cache", label: "Hot links cache" } }], edges: [] };
    assert.equal((await call("PUT", `/api/v1/sessions/${round.id}/diagram`, { version: session.body.session.diagramVersion, diagram })).status, 200);
    await query("update interview_state set last_proactive_at = null where session_id = $1", [round.id]);
    await query("update interview_turns set created_at = now() - interval '10 minutes' where session_id = $1", [round.id]);
    const asked = await tick({ reason: "canvas_quiet" });
    assert.equal(asked.body.action, "ask", JSON.stringify(asked.body));
    assert.equal(asked.body.turn.trigger, "tick");
    assert.ok((await stateRow()).proactive_checks >= 1);

    // At most 6 ticks a minute per learner; the rest are quiet no-ops.
    let limited = false;
    for (let n = 0; n < 8 && !limited; n += 1) limited = (await tick()).body.reason === "rate_limited";
    assert.ok(limited, "ticks are rate limited");
    await query("delete from rate_limits where key like 'interview-tick:%'");
  });

  await step("a thumbs-down with a reason on an interviewer message", async () => {
    const turn = await queryOne("select id from interview_turns where session_id = $1 and role = 'interviewer' order by seq desc limit 1", [round.id]);
    assert.equal((await call("POST", `/api/v1/sessions/${round.id}/interview/turns/${turn.id}/feedback`, { rating: "down", reason: "already_asked" })).status, 200);
    assert.equal((await call("POST", `/api/v1/sessions/${round.id}/interview/turns/${crypto.randomUUID()}/feedback`, { rating: "down", reason: "other" })).status, 404);
  });

  await step("at time the round wraps up and unreached items are recorded as such", async () => {
    await query("update interview_state set active_ms = $2, last_activity_at = now() where session_id = $1", [round.id, prompt.minutes * 60_000 + 1000]);
    const wrap = await call("POST", `/api/v1/sessions/${round.id}/interview/tick`, { reason: "visible" });
    assert.equal(wrap.body.turn?.kind, "wrap_up", JSON.stringify(wrap.body));
    assert.equal(wrap.body.state.stage, "wrap_up");
    const ledger = await items();
    assert.ok(ledger.every((item) => !["pending", "open"].includes(item.status)), "everything is closed");
    assert.ok(ledger.some((item) => item.status === "not_reached"));
  });

  await step("the review reads the notepad; the debrief explains each item; one realism rating", async () => {
    const session = await call("GET", `/api/v1/sessions/${round.id}`);
    const diagram = {
      nodes: ["client", "api-gateway", "app-server", "cache", "sql-database"].map((kind, index) => ({ id: `r${index}`, type: "systemNode", position: { x: index * 120, y: 0 }, data: { kind, label: kind } })),
      edges: [0, 1, 2, 3].map((index) => ({ id: `e${index}`, source: `r${index}`, target: `r${index + 1}` })),
    };
    assert.equal((await call("PUT", `/api/v1/sessions/${round.id}/diagram`, { version: session.body.session.diagramVersion, diagram })).status, 200);
    assert.equal((await call("PATCH", `/api/v1/sessions/${round.id}`, { status: "completed" })).status, 200);
    const review = await call("POST", `/api/v1/sessions/${round.id}/reviews`, { requestId: crypto.randomUUID() });
    assert.equal(review.status, 201, JSON.stringify(review.body));
    const stored = await queryOne("select template_version from ai_reviews where session_id = $1", [round.id]);
    assert.ok(stored.template_version.endsWith(packVersion), "the review records the pack it was judged with");

    const listed = await call("GET", `/api/v1/sessions/${round.id}/reviews`);
    assert.ok(listed.body.debrief?.items.length >= 6);
    const answered = listed.body.debrief.items.find((item) => item.status === "answered");
    assert.ok(answered.strongAnswer && answered.quotes.length >= 1);
    const pack = (await queryOne("select pack from problem_packs where version = $1", [packVersion])).pack;
    const debriefText = JSON.stringify(listed.body.debrief);
    for (const exemplar of pack.exemplars) assert.ok(!debriefText.includes(exemplar.outline), "no exemplar outlines in the debrief");

    assert.equal((await call("POST", `/api/v1/sessions/${round.id}/interview/rating`, { realism: 4, comment: "Felt real." })).status, 201);
    assert.equal((await call("POST", `/api/v1/sessions/${round.id}/interview/rating`, { realism: 5 })).status, 409);
    const rating = await queryOne("select engine, realism from interview_ratings where session_id = $1", [round.id]);
    assert.deepEqual([rating.engine, rating.realism], ["v3", 4]);
  });

  await step("events record the round without any prompt text", async () => {
    const types = new Set((await query("select type from interview_events where session_id = $1", [round.id])).map((row) => row.type));
    for (const type of ["round_started", "mode_changed", "move_planned", "item_status_changed", "stage_changed", "time_warning", "tick_model", "tick_rate_limited"]) assert.ok(types.has(type), `missing event ${type}`);
    const usage = await query("select task, outcome from ai_usage where session_id = $1 and task = 'interviewer'", [round.id]);
    assert.ok(usage.length >= 6 && usage.every((row) => row.outcome === "ok"));
  });

  await step("the canvas: a deep dive waits for its part to be drawn, then opens on it", async () => {
    const created = await call("POST", "/api/v1/sessions", { promptId: prompt.id, interviewMode: "realistic" });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    round = created.body.session;
    await call("GET", `/api/v1/sessions/${round.id}/interview`);
    // Skip ahead: requirements and high-level are done, nothing is on the canvas.
    await query("update interview_agenda_items set status = 'answered', band = 'adequate' where session_id = $1 and stage <> 'deep_dive'", [round.id]);
    await query("update interview_state set stage = 'deep_dive', focus_item_id = null where session_id = $1", [round.id]);

    const talked = await sendMessage("So that's the whole design: the services, the storage and the cache, all talked through.");
    assert.equal(talked.status, 201, JSON.stringify(talked.body));
    const ask = await queryOne("select move, agenda_item_id from interview_turns where id = $1", [talked.body.turns[1].id]);
    assert.equal(ask.move, "ask_to_draw", "an empty canvas gets a request to draw, not a deep dive");
    assert.equal(talked.body.turns[1].asksToDraw, true, "the request is labelled in the conversation");
    let ledger = await items();
    assert.ok(ledger.filter((item) => item.stage === "deep_dive").every((item) => item.status === "pending"), "no deep dive opened on an undrawn part");
    const target = ledger.find((item) => item.item_id === ask.agenda_item_id);
    assert.ok(target && target.draw_requests >= 1, "the request is counted against the part it asks for");
    assert.ok((await stateRow()).last_draw_ask_seq >= 1);

    // They draw the part (and enough around it to review), and the deep dive opens on it.
    const meta = (await queryOne("select pack from problem_packs where version = (select pack_version from interview_state where session_id = $1)", [round.id])).pack.agenda.find((item) => item.id === target.item_id);
    const kind = meta.triggers.componentKinds.find((entry) => !isAnonymousKind(entry)) ?? meta.triggers.componentKinds[0];
    const nodes = [["client", "Users"], ["api-gateway", "API gateway"], [kind, meta.triggers.keywords[0]]].map(([nodeKind, label], index) => ({ id: `d${index}`, type: "systemNode", position: { x: index * 140, y: 0 }, data: { kind: nodeKind, label } }));
    const diagram = { nodes, edges: [{ id: "de0", source: "d0", target: "d1" }, { id: "de1", source: "d1", target: "d2" }] };
    assert.ok(itemDrawn(meta, canvasComponents(diagram)));
    const session = await call("GET", `/api/v1/sessions/${round.id}`);
    assert.equal((await call("PUT", `/api/v1/sessions/${round.id}/diagram`, { version: session.body.session.diagramVersion, diagram })).status, 200);
    const drew = await sendMessage("Done, it's on the canvas now.");
    assert.equal(drew.status, 201, JSON.stringify(drew.body));
    const opened = await queryOne("select move, agenda_item_id from interview_turns where id = $1", [drew.body.turns[1].id]);
    assert.equal(opened.move, "open");
    assert.equal(opened.agenda_item_id, target.item_id, "the deep dive opens on the part just drawn");
    ledger = await items();
    assert.equal(ledger.find((item) => item.item_id === target.item_id).status, "open");
    const types = new Set((await query("select type from interview_events where session_id = $1", [round.id])).map((row) => row.type));
    assert.ok(types.has("draw_requested"));
  });
} catch (error) {
  failed = true;
  console.error(`\nconductor smoke FAILED after ${steps.length} step(s):`, error);
} finally {
  server.close();
  await close();
}
if (failed) process.exit(1);
console.log(`\nconductor smoke: ${steps.length} checks passed`);
