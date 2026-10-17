import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { toJsonSchema } from "../ai/schema.js";
import { reviewTask, reviewTemplateVersion } from "../ai/tasks/review.js";
import {
  captionText,
  excerptFrom,
  htmlToText,
  isPrivateAddress,
  robotsAllows,
  searchResultUrls,
  youtubeCaptionTracks,
} from "./extract.js";
import { promptFingerprint } from "./fingerprint.js";
import { gatherSources, searchQueries } from "./gather.js";
import { deterministicPool, poolOutput, renderPool } from "./task.js";

const prompt = {
  id: "url-shortener",
  title: "Design a URL shortener",
  description: "Build a service that turns long links into short, shareable URLs.",
  track: "software-engineering",
  difficulty: "Beginner",
  requirements: ["A user submits a long URL and receives a short link.", "Opening a short link redirects to its destination with low latency."],
  considerations: ["Read-heavy traffic", "Unique short codes", "Link expiration"],
  expectedOutcome: "A request/redirect architecture and a short-code strategy.",
};

test("question fingerprint changes when the brief changes", () => {
  const original = promptFingerprint(prompt);
  assert.equal(promptFingerprint({ ...prompt }), original);
  assert.notEqual(promptFingerprint({ ...prompt, requirements: ["Something else."] }), original);
});

test("page text drops scripts and keeps a short excerpt", () => {
  const html = `<html><script>secret()</script><title>A design</title><body><nav>Home</nav><p>${"This paragraph explains the redirect path in enough detail to be useful as a calibration excerpt for reviewers looking at a URL shortener. ".repeat(3)}</p></body></html>`;
  const text = htmlToText(html);
  assert.equal(text.includes("secret"), false);
  assert.equal(text.includes("Home"), false);
  assert.ok(excerptFrom(text).includes("redirect path"));
});

test("search results keep public links and drop the search engine", () => {
  const html = `
    <a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Furl-shortener&amp;rut=1">One</a>
    <a href="https://educative.io/courses/secret">Skip</a>
    <a href="https://example.com/url-shortener">Dup</a>`;
  assert.deepEqual(searchResultUrls(html), ["https://example.com/url-shortener"]);
});

test("private addresses and robots rules are rejected", () => {
  assert.equal(isPrivateAddress("127.0.0.1"), true);
  assert.equal(isPrivateAddress("10.1.2.3"), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("::ffff:169.254.169.254"), true);
  const robots = "User-agent: *\nDisallow: /private\nUser-agent: other\nDisallow: /";
  assert.equal(robotsAllows(robots, "/private/post"), false);
  assert.equal(robotsAllows(robots, "/blog/post"), true);
});

test("video captions become an excerpt", () => {
  const html = `{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc","languageCode":"en"},{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc&lang=fr","languageCode":"fr"}]}`;
  const tracks = youtubeCaptionTracks(html);
  assert.equal(tracks[0].languageCode, "en");
  const xml = `<transcript><text start="0">Hello &amp; welcome to the design.</text><text>${"The second line of the transcript continues long enough to pass the excerpt minimum for a stored source. ".repeat(3)}</text></transcript>`;
  assert.ok(captionText(xml).includes("Hello & welcome"));
});

test("gather follows search results and keeps a transcript excerpt", async () => {
  const pages = new Map();
  const blog = `<title>URL shortener notes</title><p>${"The write path stores the code and the long URL, and the read path redirects. ".repeat(8)}</p>`;
  const watch = `<title>Talk</title><script>{"captionTracks":[{"baseUrl":"https://cdn.example/captions","languageCode":"en"}]}</script>`;
  const captions = `<transcript><text>${"The speaker walks through cache aside for redirects and what happens when a code expires. ".repeat(4)}</text></transcript>`;
  const search = `<a href="https://notes.example/blog">B</a><a href="https://www.youtube.com/watch?v=abc">V</a>`;
  pages.set("https://html.duckduckgo.com/html/?q=URL%20shortener%20system%20design%20interview", search);
  pages.set("https://html.duckduckgo.com/html/?q=URL%20shortener%20system%20design%20architecture%20transcript", search);
  pages.set("https://notes.example/robots.txt", "User-agent: *\nDisallow:");
  pages.set("https://notes.example/blog", blog);
  pages.set("https://www.youtube.com/watch?v=abc", watch);
  pages.set("https://cdn.example/captions", captions);
  const calls = [];
  const fetchImpl = async (url) => {
    const key = url.toString();
    calls.push(key);
    const body = pages.get(key);
    if (!body) return { ok: false, status: 404, headers: { get: () => "text/html" }, body: null };
    return {
      ok: true,
      status: 200,
      headers: { get: (name) => (name === "content-type" ? "text/html" : null) },
      body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(body)); controller.close(); } }),
    };
  };
  const sources = await gatherSources(prompt, {
    fetchImpl,
    pauseMs: 0,
    lookupImpl: async () => [{ address: "93.184.216.34", family: 4 }],
  });
  assert.equal(sources.length, 2);
  assert.equal(sources.find((source) => source.kind === "transcript").url.includes("youtube.com"), true);
  assert.ok(sources.every((source) => source.excerpt.length <= 900));
  assert.equal(calls.some((url) => url.includes("169.254")), false);
  assert.deepEqual(searchQueries(prompt)[0].includes("URL shortener"), true);
});

test("the answer pool schema is provider-ready and renders without excerpts", () => {
  const schema = toJsonSchema(poolOutput);
  assert.equal(schema.type, "object");
  assert.ok(schema.properties.answers);
  const pool = poolOutput.parse(deterministicPool(prompt, []));
  const text = renderPool(pool);
  assert.match(text, /strong: Requirements-first design/);
  assert.match(text, /weak: Technology list/);
  assert.equal(text.includes("http"), false);
});

test("a queued question can be claimed, saved, and loaded for review", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "designrounds-pools-"));
  process.env.PGLITE_DIR = dir;
  delete process.env.DATABASE_URL;
  const db = await import("../../db.js");
  try {
    await db.connect({ migrate: true });
    const store = await import("./store.js");
    const first = await store.syncAnswerPools();
    assert.equal(first.pending, first.total);
    assert.equal((await store.syncAnswerPools()).pending, 0);
    const job = await store.claimAnswerPool("url-shortener");
    assert.equal(job.prompt_id, "url-shortener");
    const pool = poolOutput.parse(deterministicPool(prompt, []));
    assert.equal(await store.saveAnswerPool({
      promptId: job.prompt_id,
      fingerprint: job.prompt_fingerprint,
      pool,
      model: "test",
      sources: [{ url: "https://notes.example/blog", title: "Notes", kind: "blog", excerpt: pool.answers[0].outline }],
    }), true);
    const loaded = await store.referencePoolFor("url-shortener");
    assert.equal(loaded.fingerprint, job.prompt_fingerprint);
    assert.match(loaded.text, /Requirements-first design/);
    assert.equal(await store.claimAnswerPool("url-shortener"), null);
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("reviews receive the pool as private calibration and ignore it when absent", () => {
  const withPool = reviewTask.buildUser({
    prompt,
    design: { text: "Components (0):" },
    guide: null,
    transcript: "",
    pool: { fingerprint: "abc123", text: "Answer pool:\n- strong: example" },
  });
  assert.match(withPool, /<reference_pool version="abc123">/);
  assert.match(withPool, /strong: example/);
  const without = reviewTask.buildUser({ prompt, design: { text: "Components (0):" }, guide: null, transcript: "" });
  assert.equal(without.includes("reference_pool"), false);
  assert.equal(reviewTemplateVersion(null, { fingerprint: "abc123" }).endsWith("pool-abc123"), true);
  assert.equal(reviewTemplateVersion(null, null).endsWith("no-pool"), true);
});
