// SEO and safety checks on the production build (dist/). Run after `npm run build`;
// CI runs it on every push. Exits non-zero with a list of problems.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const problems = [];
const fail = (message) => problems.push(message);

// Every text file in dist, for leak checks.
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(html|js|css|txt|xml|json)$/.test(name)) files.push(full);
  }
})(dist);

// 1. Private interviewer-guide sections must never ship to the browser.
for (const secret of ["## What strong looks like", "What strong looks like", "## Key decisions and trade-offs", "## Core components"]) {
  for (const file of files) if (readFileSync(file, "utf8").includes(secret)) fail(`private guide text "${secret}" found in ${path.relative(root, file)}`);
}

// 1b. Plus rounds' details (brief and guide excerpts) exist only on the server.
const { plusBriefs } = await import(pathToFileURL(path.join(root, "server", "content", "round-briefs.js")).href);
const { loadGuideExcerpts } = await import(pathToFileURL(path.join(root, "server", "content", "guide-excerpts.js")).href);
const allExcerpts = loadGuideExcerpts();
// Text that is public by design (a Plus round's teaser: title, description, concepts).
const { prompts: publicPrompts } = await import(pathToFileURL(path.join(root, "src", "data", "prompts.js")).href);
// Handbook topic names are public too, and a round's prerequisite can name one.
const { TOPICS } = await import(pathToFileURL(path.join(root, "src", "learn", "catalog.js")).href);
const publicTexts = new Set([
  ...publicPrompts.flatMap((prompt) => [prompt.title, prompt.description, prompt.category, ...prompt.considerations]),
  ...TOPICS.flatMap((topic) => [topic.title, topic.short]),
]);
const plusTexts = Object.entries(plusBriefs).flatMap(([id, brief]) => [
  ...(brief.requirements ?? []), ...(brief.prerequisites ?? []), brief.expectedOutcome,
  allExcerpts[id]?.scale, ...(allExcerpts[id]?.questions ?? []), ...(allExcerpts[id]?.mistakes ?? []),
].filter((text) => text && text.length > 24 && !publicTexts.has(text)).map((text) => [id, text]));
const contents = files.map((file) => [file, readFileSync(file, "utf8")]);
for (const [id, text] of plusTexts) {
  // JSON escaping can change quotes and slashes; compare on a stable inner slice.
  const probe = text.slice(0, 40);
  for (const [file, content] of contents) if (content.includes(probe)) fail(`Plus round "${id}" content found in ${path.relative(root, file)}: "${probe}…"`);
}
if (plusTexts.length < 100) fail(`expected many Plus texts to check, found ${plusTexts.length}`);

// 1c. Interviewer context (UCS) and Problem Packs are server-only: no prompt text, and
// nothing a pack holds back from the learner (probes, hints, evidence, exemplars).
const interviewerDir = path.join(root, "server", "content", "interviewer");
const interviewerTexts = readdirSync(interviewerDir, { recursive: true })
  .filter((file) => file.endsWith(".md"))
  .flatMap((file) => readFileSync(path.join(interviewerDir, file), "utf8").split("\n"))
  .map((line) => line.replace(/^[-#\d.\s]+/, "").trim())
  .filter((line) => line.length > 60 && !line.includes("{{"));
const packsDir = path.join(root, "server", "content", "packs");
const packTexts = (existsSync(packsDir) ? readdirSync(packsDir).filter((file) => file.endsWith(".json")) : []).flatMap((file) => {
  const pack = JSON.parse(readFileSync(path.join(packsDir, file), "utf8"));
  return [
    ...pack.agenda.flatMap((item) => [...item.probes, ...item.hints, item.moveOnSummary, item.evidence.strong, item.evidence.adequate, item.evidence.weak, ...item.misconceptions.map((entry) => entry.challenge)]),
    ...pack.clarifications.map((fact) => fact.answer),
    ...pack.exemplars.map((exemplar) => exemplar.outline),
  ];
}).filter((text) => text && text.length > 40);
for (const text of [...interviewerTexts, ...packTexts]) {
  const probe = text.slice(0, 40);
  for (const [file, content] of contents) if (content.includes(probe)) fail(`server-only interviewer text found in ${path.relative(root, file)}: "${probe}…"`);
}
if (interviewerTexts.length < 30) fail(`expected many interviewer texts to check, found ${interviewerTexts.length}`);

// 2. Every sitemap URL has a prerendered page with sound metadata.
const sitemap = readFileSync(path.join(dist, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urls.length < 50) fail(`sitemap has only ${urls.length} URLs`);
const titles = new Map();
const descriptions = new Map();
for (const url of urls) {
  const route = new URL(url).pathname;
  const file = path.join(dist, route === "/" ? "index.html" : `${route.slice(1)}.html`);
  if (!existsSync(file)) { fail(`${route}: in sitemap but no page at ${path.relative(root, file)}`); continue; }
  const html = readFileSync(file, "utf8");
  const one = (re) => [...html.matchAll(re)].map((match) => match[1]);
  const title = one(/<title>([^<]*)<\/title>/g);
  const description = one(/<meta name="description" content="([^"]*)"/g);
  const canonical = one(/<link rel="canonical" href="([^"]*)"/g);
  const h1 = html.match(/<h1[\s>]/g) ?? [];
  if (title.length !== 1) fail(`${route}: ${title.length} <title> tags`);
  else if (title[0].length > 70) fail(`${route}: title is ${title[0].length} chars`);
  if (description.length !== 1) fail(`${route}: ${description.length} meta descriptions`);
  else if (description[0].length < 70 || description[0].length > 170) fail(`${route}: description is ${description[0].length} chars`);
  if (canonical.length !== 1 || canonical[0] !== url.replace(/\/$/, "") && canonical[0] !== url) fail(`${route}: canonical ${JSON.stringify(canonical)} != ${url}`);
  if (h1.length !== 1) fail(`${route}: ${h1.length} <h1> elements`);
  if (!/<meta name="robots" content="index, follow"/.test(html)) fail(`${route}: not indexable`);
  if (!html.includes('<div id="root"><')) fail(`${route}: root is empty (not prerendered)`);
  for (const json of one(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json.replace(/\\u003c/g, "<")); } catch { fail(`${route}: invalid JSON-LD`); }
  }
  if (title[0]) titles.set(title[0], [...(titles.get(title[0]) ?? []), route]);
  if (description[0]) descriptions.set(description[0], [...(descriptions.get(description[0]) ?? []), route]);
}
for (const [title, routes] of titles) if (routes.length > 1) fail(`duplicate title "${title}" on ${routes.join(", ")}`);
for (const [description, routes] of descriptions) if (routes.length > 1) fail(`duplicate description on ${routes.join(", ")}`);

// 3. Supporting files.
for (const file of ["404.html", "app.html", "robots.txt", "llms.txt", "og.png", "favicon.svg", "favicon.ico", "favicon-96x96.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "site.webmanifest"]) {
  if (!existsSync(path.join(dist, file))) fail(`missing dist/${file}`);
}
// IndexNow key file: public/<key>.txt containing exactly the key.
const indexNowKey = readdirSync(dist).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!indexNowKey) fail("missing IndexNow key file (dist/<32 hex>.txt)");
else if (readFileSync(path.join(dist, indexNowKey), "utf8").trim() !== indexNowKey.slice(0, -4)) fail("IndexNow key file content does not match its name");
if (existsSync(path.join(dist, "404.html")) && !/<meta name="robots" content="noindex"/.test(readFileSync(path.join(dist, "404.html"), "utf8"))) fail("404.html is indexable");
if (existsSync(path.join(dist, "app.html")) && !/noindex/.test(readFileSync(path.join(dist, "app.html"), "utf8"))) fail("app.html is indexable");

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)\n - ${problems.join("\n - ")}`);
  process.exit(1);
}
console.log(`check-build: ${urls.length} pages OK (titles, descriptions, canonicals, h1, JSON-LD), no private guide text, ${plusTexts.length} Plus-only texts absent, supporting files present`);
