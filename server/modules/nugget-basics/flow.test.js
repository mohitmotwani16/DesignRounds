// Guest Nugget-basics API: happy paths, auth merge, Turnstile, and adversarial inputs.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { publicPaths } from "../../../src/seo.js";
import { prompts } from "../../../src/data/prompts.js";

const ONBOARDING = "nugget-basics/onboarding-1";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dr-basics-flow-"));
Object.assign(process.env, {
  PGLITE_DIR: dataDir,
  AI_PROVIDER: "fake",
  INTERVIEWER_VERSION: "v2",
  CRON_SECRET: "basics-flow-secret",
  DEV_TOOLS: "true",
  GROQ_API_KEY: "",
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  TURNSTILE_SITE_KEY: " ",
  TURNSTILE_SECRET_KEY: " ",
});
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV"]) delete process.env[key];

const { createApp } = await import("../../app.js");
const { close, query, queryOne } = await import("../../db.js");
const { hashGuestToken, GUEST_SYSTEM_USER_ID } = await import("../guest.js");

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const jar = new Map();
function absorbCookies(response) {
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const headers = setCookies.length ? setCookies : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
  for (const header of headers) {
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function clearJar() {
  jar.clear();
}

async function call(method, url, body, headers = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(jar.size ? { Cookie: [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ") } : {}),
      Origin: `http://127.0.0.1:${server.address().port}`,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  absorbCookies(response);
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, body: parsed, headers: response.headers };
}

async function signIn(email = "basics-flow@example.com") {
  const requested = await call("POST", "/api/v1/auth/request-code", { email });
  assert.equal(requested.status, 200, requested.body?.error?.message);
  const verified = await call("POST", "/api/v1/auth/verify-code", { email, code: requested.body.devCode });
  assert.equal(verified.status, 200, verified.body?.error?.message);
  const me = await call("GET", "/api/v1/me");
  return me.body.user;
}

test.after(async () => {
  server.close();
  await close();
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
});

test("SEO and library catalog omit the synthetic nugget-basics parent", () => {
  assert.ok(publicPaths().includes("/nugget-basics"));
  const parent = prompts.find((entry) => entry.id === "nugget-basics");
  assert.ok(parent?.nuggetBasicsOnly);
  assert.equal(prompts.filter((entry) => entry.nuggetBasicsOnly).length, 1);
});

test("basics catalog is public and lists onboarding plus track drills", async () => {
  const catalog = await call("GET", "/api/v1/nugget-basics/catalog");
  assert.equal(catalog.status, 200);
  assert.ok(catalog.body.items.length >= 100);
  assert.ok(catalog.body.items.some((item) => item.id === ONBOARDING));
  assert.ok(catalog.body.tracks?.length >= 4);
  assert.match(catalog.headers.get("cache-control") || "", /max-age/);
  assert.equal((await call("GET", "/api/v1/catalog/prompts?q=nugget-basics")).body.items.some((item) => item.id === "nugget-basics"), false);
});

test("anonymous guest can start, resume, and open interview without sign-in", async () => {
  clearJar();
  const first = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: ONBOARDING });
  assert.equal(first.status, 201, first.body?.error?.message);
  assert.equal(first.body.session.guest, true);
  assert.equal(first.body.session.basicsOnly, true);
  assert.ok(jar.get("dr_guest"));
  const sessionId = first.body.session.id;

  const resume = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: ONBOARDING });
  assert.equal(resume.status, 200);
  assert.equal(resume.body.resumed, true);
  assert.equal(resume.body.session.id, sessionId);

  const row = await queryOne("select user_id, guest_token_hash from practice_sessions where id = $1", [sessionId]);
  assert.equal(row.user_id, GUEST_SYSTEM_USER_ID);
  assert.ok(row.guest_token_hash);

  const interview = await call("GET", `/api/v1/sessions/${sessionId}/interview`);
  assert.equal(interview.status, 200);
  assert.notEqual(interview.body.access, "locked");

  const getS = await call("GET", `/api/v1/sessions/${sessionId}`);
  assert.equal(getS.status, 200);
  const version = getS.body.session.diagramVersion;
  const save = await call("PUT", `/api/v1/sessions/${sessionId}/diagram`, { version, diagram: getS.body.session.diagram });
  assert.equal(save.status, 200, save.body?.error?.message);
  const finish = await call("PATCH", `/api/v1/sessions/${sessionId}`, { status: "completed" });
  assert.equal(finish.status, 200);
});

test("claim moves guest sessions to the signed-in user on verify-code", async () => {
  clearJar();
  const started = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: ONBOARDING });
  assert.equal(started.status, 201);
  const guestToken = jar.get("dr_guest");
  const sessionId = started.body.session.id;
  const guestHash = hashGuestToken(guestToken);

  await call("GET", `/api/v1/sessions/${sessionId}/interview`);

  const user = await signIn("claim-basics@example.com");
  const claimed = await queryOne("select user_id, guest_token_hash from practice_sessions where id = $1", [sessionId]);
  assert.equal(claimed.user_id, user.id);
  assert.equal(claimed.guest_token_hash, null);

  const turns = await query("select distinct user_id from interview_turns where session_id = $1", [sessionId]);
  assert.ok(turns.every((row) => row.user_id === user.id));

  // Guest hash alone must no longer reach the session.
  clearJar();
  jar.set("dr_guest", guestToken);
  const denied = await call("GET", `/api/v1/nugget-basics/sessions/${sessionId}`);
  assert.equal(denied.status, 404);
});

test("claim drops a guest in-progress drill when the user already has one on the same nugget", async () => {
  const user = await signIn("conflict-basics@example.com");
  const owned = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: ONBOARDING });
  assert.equal(owned.status, 201);
  const ownedId = owned.body.session.id;

  clearJar();
  const guest = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: ONBOARDING });
  assert.equal(guest.status, 201);
  const guestId = guest.body.session.id;
  const guestHash = (await queryOne("select guest_token_hash from practice_sessions where id = $1", [guestId])).guest_token_hash;

  const { claimGuestBasicsSessions } = await import("./claim.js");
  const result = await claimGuestBasicsSessions(user.id, guestHash);
  assert.equal(result.dropped, 1);
  assert.equal(result.claimed, 0);
  assert.equal(await queryOne("select 1 from practice_sessions where id = $1", [guestId]), null);
  assert.ok(await queryOne("select 1 from practice_sessions where id = $1", [ownedId]));
});

test("adversarial and malformed session starts", async () => {
  clearJar();
  const cases = [
    [{}, 400],
    [{ nuggetId: "" }, 400],
    [{ nuggetId: "x".repeat(121) }, 400],
    [{ nuggetId: "'; drop table practice_sessions; --" }, 404],
    [{ nuggetId: "nuggets/onboarding-1" }, 404],
    [{ nuggetId: ONBOARDING, extra: "🐒".repeat(50) }, 201],
    [{ nuggetId: 12345 }, 400],
    [{ nuggetId: null }, 400],
  ];
  for (const [payload, expect] of cases) {
    const response = await call("POST", "/api/v1/nugget-basics/sessions", payload);
    assert.equal(response.status, expect, `payload ${JSON.stringify(payload)} -> ${response.status} ${response.body?.error?.code}`);
    if (expect === 201) await query("delete from practice_sessions where id = $1", [response.body.session.id]);
  }

  const malformed = await fetch(`${base}/api/v1/nugget-basics/sessions`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Origin: `http://127.0.0.1:${server.address().port}` },
    body: "not-json",
  });
  assert.ok(malformed.status === 400 || malformed.status === 415);

  const badCookie = await fetch(`${base}/api/v1/nugget-basics/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "dr_guest=not-a-uuid",
      Origin: `http://127.0.0.1:${server.address().port}`,
    },
    body: JSON.stringify({ nuggetId: "nugget-basics/onboarding-2" }),
  });
  assert.equal(badCookie.status, 201, "invalid guest cookie is ignored and a new guest is minted");
});

test("guest cannot read another guest's session", async () => {
  clearJar();
  const a = await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: "nugget-basics/onboarding-2" });
  const aId = a.body.session.id;
  clearJar();
  await call("POST", "/api/v1/nugget-basics/sessions", { nuggetId: "nugget-basics/onboarding-3" });
  const cross = await call("GET", `/api/v1/nugget-basics/sessions/${aId}`);
  assert.equal(cross.status, 404);
});
