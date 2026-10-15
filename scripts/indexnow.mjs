// Tells IndexNow search engines (Bing, Yandex, Naver, Seznam, Yep; they share
// submissions) which public pages changed, right after a production deploy.
// Run by .github/workflows/indexnow.yml; Google does not use IndexNow.
//
//   node scripts/indexnow.mjs [--state <file>] [--dry-run]
//
// IndexNow asks for changed URLs only, so the script fetches every URL in the live
// sitemap, fingerprints its content (title, description and body, not asset links,
// which change on every build) and compares against the previous run's state file.
// New, changed and removed URLs are submitted; the state is saved only after a
// successful submission, so a failed run is retried on the next deploy.
import crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = process.env.SITE_URL || "https://designrounds.in";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const stateFile = path.resolve(args.includes("--state") ? args[args.indexOf("--state") + 1] : ".indexnow-state.json");
const dryRun = args.includes("--dry-run");

// The key is the name (and content) of public/<key>.txt, served at the site root.
const keyFile = readdirSync(path.join(root, "public")).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt) found.");
const key = keyFile.slice(0, -4);

async function get(url, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "DesignRounds-IndexNow/1.0" }, signal: AbortSignal.timeout(20_000) });
      return { status: response.status, text: await response.text() };
    } catch (error) {
      if (attempt >= attempts) throw new Error(`GET ${url} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// What a reader or crawler sees: title, description and body text, minus scripts.
function fingerprint(html) {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  const body = (/<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? html).replace(/<script[\s\S]*?<\/script>/g, "");
  // Whitespace and line endings are not content (a build on another OS changes them).
  const text = `${title}\n${description}\n${body}`.replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(text).digest("hex");
}

// The live key file must match, or the engines reject the submission (403).
const live = await get(`${SITE}/${key}.txt`);
if (live.status !== 200 || live.text.trim() !== key) throw new Error(`Key file ${SITE}/${key}.txt is not live (status ${live.status}). Deploy it first.`);

const sitemap = await get(`${SITE}/sitemap.xml`);
const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (!urls.length) throw new Error("The live sitemap lists no URLs.");

const current = {};
for (const url of urls) {
  // Fetch from SITE (the sitemap's URLs are canonical; SITE can point elsewhere for tests).
  const page = await get(`${SITE}${new URL(url).pathname}`);
  if (page.status === 200) current[url] = fingerprint(page.text);
  else console.warn(`[indexnow] ${url} returned ${page.status}; not fingerprinted`);
}

const previous = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
const changed = Object.keys(current).filter((url) => previous[url] !== current[url]);
const removed = Object.keys(previous).filter((url) => !(url in current));
const urlList = [...changed, ...removed];

console.log(`[indexnow] ${urls.length} URLs in sitemap; ${changed.length} new or changed, ${removed.length} removed${Object.keys(previous).length ? "" : " (first run: submitting all)"}`);
if (!urlList.length) process.exit(0);
for (const url of urlList.slice(0, 20)) console.log(`  ${url}`);
if (urlList.length > 20) console.log(`  … and ${urlList.length - 20} more`);
if (dryRun) { console.log("[indexnow] dry run: nothing submitted"); process.exit(0); }

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urlList.slice(0, 10_000) }),
  signal: AbortSignal.timeout(30_000),
});
const detail = (await response.text()).slice(0, 300);
// 200 = received, 202 = received with key validation pending.
if (response.status !== 200 && response.status !== 202) {
  console.error(`[indexnow] submission refused: ${response.status} ${detail}`);
  process.exit(1);
}
writeFileSync(stateFile, JSON.stringify(current, null, 2));
console.log(`[indexnow] submitted ${urlList.length} URLs (HTTP ${response.status})`);
