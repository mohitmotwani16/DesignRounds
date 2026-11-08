import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "nugget-interview-"));
Object.assign(process.env, {
  PGLITE_DIR: dataDir,
  AI_PROVIDER: "fake",
  INTERVIEWER_VERSION: "v3",
  DEV_TOOLS: "true",
  ADMIN_EMAILS: "admin@example.com",
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  TURNSTILE_SITE_KEY: " ",
  TURNSTILE_SECRET_KEY: " ",
});
for (const key of ["DATABASE_URL", "NODE_ENV", "VERCEL"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close } = await import("../server/db.js");

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;

let cookie = "";
async function call(method, url, body) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const sessionCookie = setCookies.find((value) => /^(?:__Host-)?dr_session=/.test(value));
  if (sessionCookie) cookie = sessionCookie.split(";")[0];
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

try {
  const requested = await call("POST", "/api/v1/auth/request-code", { email: "nugget@test.local", turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
  const verify = await call("POST", "/api/v1/auth/verify-code", { email: "nugget@test.local", code: requested.body.devCode });
  console.log("verify", verify.status, verify.body?.error?.message || verify.body?.user?.email);
  if (verify.status !== 200) {
    console.log("full verify body", verify.body);
    process.exit(1);
  }

  const start = await call("POST", "/api/v1/sessions", { pick: "random_nugget" });
  console.log("start", start.status, start.body?.error?.message || start.body?.session?.id);
  assert.equal(start.status, 201);
  const sessionId = start.body.session.id;

  const interview = await call("GET", `/api/v1/sessions/${sessionId}/interview`);
  console.log("interview", interview.status, interview.body?.error?.message || { access: interview.body?.access, turns: interview.body?.turns?.length });
  if (interview.status !== 200) {
    console.log("interview body", interview.body);
    process.exit(1);
  }
  assert.equal(interview.body.access, "full");
  assert.ok(interview.body.turns.length >= 1);
  console.log("ok");
} finally {
  server.close();
  await close();
}
