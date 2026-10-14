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
  const html = page(ssr.render(url), ssr.metaHtml(meta));
  write(url === "/" ? "index.html" : `${url.slice(1)}.html`, html);
}

// 3. Not-found page.
write("404.html", page(ssr.renderNotFound(), ssr.metaHtml(ssr.routeMeta("/this-page-does-not-exist"))));

// 4. Sitemap.
const priority = (url) => (url === "/" ? "1.0" : url === "/library" || url.startsWith("/guide/") ? "0.9" : url.startsWith("/library/") ? "0.8" : "0.7");
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

## Guides

${ssr.GUIDES.map((guide) => `- [${guide.title}](${ssr.SITE.url}${guide.path}): ${guide.description}`).join("\n")}
- [About DesignRounds](${ssr.SITE.url}/about): what it is, who it's for, how it works and pricing.

## Practice rounds

${byTrack}
`);

rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
console.log(`[prerender] ${paths.length} pages, app.html, 404.html, sitemap.xml, robots.txt, llms.txt`);
