import assert from "node:assert/strict";
import test from "node:test";
import middleware, { config } from "../middleware.js";
import { articleProblems } from "../src/learn/markdown.js";
import { postgresOptions } from "./db-ssl.js";
import { sameOriginWrites } from "./http.js";
import { isPrivateAddress } from "./modules/answers/extract.js";
import { mailboxOf, trialEmailHash } from "./modules/trial.js";

const REMOTE = "postgresql://user:secret@db.example.com:6543/postgres";
const PEM = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";

test("database TLS verifies the server once a CA is configured", () => {
  const options = postgresOptions(REMOTE, { DATABASE_CA_CERT: PEM });
  assert.deepEqual(options.ssl, { ca: PEM, rejectUnauthorized: true });
  assert.equal(options.verified, true);
});

test("the CA can be given as base64 or with escaped newlines", () => {
  const encoded = Buffer.from(PEM).toString("base64");
  assert.equal(postgresOptions(REMOTE, { DATABASE_CA_CERT: encoded }).ssl.ca, PEM);
  assert.equal(postgresOptions(REMOTE, { DATABASE_CA_CERT: PEM.replaceAll("\n", "\\n") }).ssl.ca, PEM);
});

test("sslmode in the URL can't override a configured CA", () => {
  const env = { DATABASE_CA_CERT: PEM };
  assert.equal(postgresOptions(`${REMOTE}?sslmode=require`, env).connectionString, REMOTE);
  assert.equal(postgresOptions(`${REMOTE}?sslmode=require&a=1`, env).connectionString, `${REMOTE}?a=1`);
  assert.equal(postgresOptions(`${REMOTE}?a=1&sslmode=require`, env).connectionString, `${REMOTE}?a=1`);
});

test("without a CA the connection stays encrypted and reports that it isn't verified", () => {
  assert.deepEqual(postgresOptions(REMOTE, {}), { connectionString: REMOTE, ssl: { rejectUnauthorized: false }, verified: false });
});

test("only a local host skips TLS, not a URL that merely mentions one", () => {
  assert.equal(postgresOptions("postgresql://u:p@localhost:5432/db", {}).ssl, false);
  assert.equal(postgresOptions("postgresql://u:p@127.0.0.1:5432/db", {}).ssl, false);
  assert.notEqual(postgresOptions("postgresql://localhost:p@db.example.com/db", {}).ssl, false);
  assert.notEqual(postgresOptions("postgresql://u:p@db.example.com/localhost", {}).ssl, false);
  assert.notEqual(postgresOptions("postgresql://u:p#ss@localhost.example.com/db", {}).ssl, false);
});

test("cookies are removed before /ingest is proxied to PostHog", () => {
  assert.equal(config.matcher, "/ingest/:path*");
  const request = new Request("https://designrounds.in/ingest/e/", { method: "POST", headers: { cookie: "__Host-dr_session=secret", "content-type": "application/json" } });
  const { headers } = middleware(request);
  assert.equal(headers.get("x-middleware-next"), "1");
  const forwarded = headers.get("x-middleware-override-headers").split(",");
  assert.ok(forwarded.includes("content-type"), "other headers are forwarded");
  assert.ok(!forwarded.includes("cookie"), "the cookie is dropped");
  assert.equal(headers.get("x-middleware-request-cookie"), null);
});

test("addresses that aren't on the public internet are refused", () => {
  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "fe80::1", "fc00::1", "fd12::1", "fec0::1", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "2002:7f00:1::",
    "localhost", "not-an-ip", "",
  ]) assert.equal(isPrivateAddress(address), true, address);
});

test("public addresses are allowed", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});

test("article links can't leave the site by posing as a site path", () => {
  const body = (href) => `## One\n\n## Two\n\n[link](${href}) ${"word ".repeat(200)}`;
  const article = (href) => ({ title: "A long enough title", shortTitle: "Short", description: "d".repeat(60), category: "x", level: "Beginner", slug: "valid-slug", body: body(href) });
  const flagged = (href) => articleProblems(article(href)).some((problem) => problem.includes("isn't allowed"));
  assert.equal(flagged("/learn/caching"), false);
  assert.equal(flagged("https://example.com/a"), false);
  assert.equal(flagged("//evil"), true);
  assert.equal(flagged("javascript:alert(1)"), true);
  assert.equal(flagged("data:text/html,x"), true);
});

test("one mailbox gets one interviewer trial, however the address is spelled", () => {
  assert.equal(mailboxOf(" Me+trial@Example.com "), "me@example.com");
  assert.equal(mailboxOf("m.e+1@gmail.com"), "me@gmail.com");
  assert.equal(mailboxOf("m.e@googlemail.com"), "me@gmail.com");
  assert.equal(mailboxOf("m.e@example.com"), "m.e@example.com", "dots only collapse on Gmail");
  assert.equal(trialEmailHash("me+1@gmail.com"), trialEmailHash("m.e@gmail.com"));
  assert.notEqual(trialEmailHash("me@gmail.com"), trialEmailHash("you@gmail.com"));
});

function writeFrom(origin) {
  const req = { method: "POST", is: () => true, get: (name) => ({ origin, host: "designrounds.in" })[name] };
  let result;
  sameOriginWrites(req, null, (error) => { result = error?.code || "allowed"; });
  return result;
}

test("a mistyped APP_ORIGIN can't break writes or widen who may send them", (t) => {
  t.after(() => { delete process.env.APP_ORIGIN; });
  process.env.APP_ORIGIN = "designrounds.in, https://www.designrounds.in/";
  assert.equal(writeFrom("https://designrounds.in"), "allowed");
  assert.equal(writeFrom("https://www.designrounds.in"), "allowed");
  assert.equal(writeFrom("https://evil.example"), "BAD_ORIGIN");
  assert.equal(writeFrom("null"), "BAD_ORIGIN");
});
