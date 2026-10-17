// Build-time prerendering. Runs after `vite build` (client) and `vite build --ssr`.
//
// Writes, into dist/:
//   - <route>.html for every public page, with its content and its own title,
//     description, canonical URL, Open Graph tags and JSON-LD (served with clean URLs)
//   - app.html: the unrendered app shell for signed-in pages (sign-in, workspace, ...)
//   - 404.html: a real "not found" page, served with status 404
//   - sitemap.xml, robots.txt and llms.txt
//
// The browser then renders the same app over the prerendered HTML.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrEntry = path.join(root, "dist-ssr", "entry-server.js");
if (!existsSync(ssrEntry)) throw new Error("Run `vite build --ssr src/entry-server.jsx --outDir dist-ssr` first.");
const ssr = await import(pathToFileURL(ssrEntry).href);
// Learn topics are lazy chunks in the app; load them all so every page renders complete.
await ssr.preloadAllTopics();

// Published community articles live in the database. Deploy builds have DATABASE_URL
// (and publishing an article triggers a rebuild); local and CI builds skip them.
let community = [];
if (process.env.DATABASE_URL) {
  try {
    const { default: pg } = await import("pg");
    const url = process.env.DATABASE_URL;
    const db = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false } });
    await db.connect();
    const { rows } = await db.query("select a.slug, a.title, a.short_title, a.description, a.category, a.level, a.body, a.author_name, a.published_at, a.updated_at from articles a where a.status = 'published' order by a.published_at");
    await db.end();
    community = rows.map((row) => ({ slug: row.slug, title: row.title, shortTitle: row.short_title, description: row.description, category: row.category, level: row.level, body: row.body, authorName: row.author_name, publishedAt: row.published_at?.toISOString?.() ?? row.published_at, updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at }));
    console.log(`[prerender] ${community.length} community articles`);
  } catch (error) {
    // Before the articles migration runs, or without database access: build without them.
    console.warn(`[prerender] community articles skipped: ${error.message}`);
  }
}
ssr.setCommunityArticles(community);
const communityMeta = community.map(({ body, ...meta }) => meta);
// Learn pages carry the community list (and an article page its own body) as JSON, so
// the browser renders the same sidebar and article before its first API call.
const communityScript = (url) => {
  if (!url.startsWith("/learn")) return "";
  const own = community.find((article) => `/learn/${article.slug}` === url);
  const data = own ? communityMeta.map((meta) => (meta.slug === own.slug ? own : meta)) : communityMeta;
  return `<script type="application/json" id="community-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
};

const template = readFileSync(path.join(dist, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) throw new Error("dist/index.html has no empty #root to render into.");

// Head tags the prerenderer owns; the template's generic copies are replaced.
const OWNED = /\s*<(title|meta name="description"|meta name="robots"|link rel="canonical"|meta property="og:[^"]+"|meta name="twitter:[^"]+")[^>]*>(?:[^<]*<\/title>)?/g;
const page = (bodyHtml, headHtml) => template
  .replace(OWNED, "")
  .replace("</head>", `    ${headHtml}\n  </head>`)
  .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);

function write(file, contents) {
  const target = path.join(dist, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

// 1. App shell for signed-in routes (never indexed).
write("app.html", template.replace(OWNED, "").replace("</head>", `    <title>DesignRounds</title>\n    <meta name="robots" content="noindex, nofollow" />\n  </head>`));

// 2. Every public page.
const paths = ssr.publicPaths();
for (const url of paths) {
  const meta = ssr.routeMeta(url);
  if (meta.notFound) throw new Error(`Public path ${url} resolves to "not found".`);
  const html = page(ssr.render(url), ssr.metaHtml(meta)).replace("</body>", `${communityScript(url)}</body>`);
  write(url === "/" ? "index.html" : `${url.slice(1)}.html`, html);
}

// 3. Not-found page.
write("404.html", page(ssr.renderNotFound(), ssr.metaHtml(ssr.routeMeta("/this-page-does-not-exist"))));

// 4. Sitemap.
const priority = (url) => (url === "/" ? "1.0" : url === "/library" || url.startsWith("/learn") ? "0.9" : url.startsWith("/library/") ? "0.8" : "0.7");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((url) => `  <url><loc>${ssr.SITE.url}${url === "/" ? "/" : url}</loc><priority>${priority(url)}</priority></url>`).join("\n")}
</urlset>
`);

// 5. robots.txt: everything public is crawlable; signed-in areas and the API are not.
write("robots.txt", `User-agent: *
Allow: /
Disallow: /api/
Disallow: /signin
Disallow: /welcome
Disallow: /profile
Disallow: /start/
Disallow: /workspace/
Disallow: /learn/write
Disallow: /admin

Sitemap: ${ssr.SITE.url}/sitemap.xml
`);

// 6. llms.txt: a plain summary for AI assistants and crawlers (llmstxt.org format).
const free = ssr.prompts.filter((prompt) => prompt.access === "free").length;
const byTrack = ssr.tracks.map((track) => {
  const rounds = ssr.prompts.filter((prompt) => prompt.track === track.id);
  return `### ${ssr.TRACK_SEO[track.id].h1}\n\n- [${track.label} rounds](${ssr.SITE.url}${ssr.trackPath(track.id)}): ${ssr.TRACK_SEO[track.id].description}\n${rounds.map((prompt) => `- [${prompt.title}](${ssr.SITE.url}${ssr.roundPath(prompt.id)}): ${prompt.description} (${prompt.difficulty}, ${prompt.minutes} min, ${prompt.access === "free" ? "free" : "Plus"})`).join("\n")}`;
}).join("\n\n");
write("llms.txt", `# DesignRounds

> DesignRounds (designrounds.in) is a system design interview practice platform. Learners pick a realistic design problem, build the architecture on a canvas, defend their choices to an AI interviewer, and get a rubric-based review scored on six dimensions: requirements and scope, high-level architecture, data model and storage, scale and performance, reliability and security, and trade-offs and reasoning.

- Who it's for: software engineers preparing for system design interviews, across backend, data engineering, machine learning, platform and infrastructure, distributed systems, and frontend and mobile roles.
- Pricing: Free plan with ${free} practice rounds and ${ssr.aiLimits.free.reviewsPerRound} AI review per round (up to ${ssr.aiLimits.free.reviewsPerMonth} a month), no credit card. Plus (coming soon) adds every round, a live AI interviewer and full coaching.
- Sign-in: email one-time code; no password.

## System design handbook

${ssr.CATEGORIES.map((category) => `### ${category.title}\n\n${category.topics.map((topic) => `- [${topic.title}](${ssr.SITE.url}${ssr.topicPath(topic.slug)}): ${topic.description}`).join("\n")}`).join("\n\n")}

## More

- [About DesignRounds](${ssr.SITE.url}/about): what it is, who it's for, how it works and pricing.

## Practice rounds

${byTrack}
`);

rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
console.log(`[prerender] ${paths.length} pages, app.html, 404.html, sitemap.xml, robots.txt, llms.txt`);
