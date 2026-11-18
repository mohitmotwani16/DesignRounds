// Turnstile gate for anonymous Nugget-basics session starts (isolated DB).
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const ONBOARDING = "nugget-basics/onboarding-1";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dr-basics-turnstile-"));
Object.assign(process.env, {
  PGLITE_DIR: dataDir,
  AI_PROVIDER: "fake",
  INTERVIEWER_VERSION: "v2",
  CRON_SECRET: "basics-turnstile-secret",
  DEV_TOOLS: "true",
  GROQ_API_KEY: "",
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  TURNSTILE_SITE_KEY: "3x00000000000000000000FF",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  TURNSTILE_DUMMY_LOCAL: "true",
});
for (const key of ["DATABASE_URL", "SMTP_HOST", "RESEND_API_KEY", "AI_API_KEY", "NODE_ENV", "VERCEL", "VERCEL_ENV"]) delete process.env[key];

const { createApp } = await import("../../app.js");
const { close } = await import("../../db.js");

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/api/v1/nugget-basics/sessions`;

test.after(async () => {
  server.close();
  await close();
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
});

test("anonymous start without token is rejected", async () => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ nuggetId: ONBOARDING }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.code, "HUMAN_CHECK_REQUIRED");
});

test("anonymous start with dummy token succeeds and sets guest cookie", async () => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ nuggetId: ONBOARDING, turnstileToken: TEST_TOKEN }),
  });
  assert.equal(response.status, 201);
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  assert.ok(setCookies.some((value) => value.startsWith("dr_guest=")), "dr_guest cookie is set");
});