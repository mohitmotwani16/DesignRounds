// Community articles are written in a small, safe Markdown subset and turned into the
// same blocks the handbook renders (see src/pages/Learn.jsx). Shared by the editor's
// live preview and the server's validation, so what authors see is what gets published.
//
//   ## Heading / ### Subheading     paragraphs separated by blank lines
//   - bullet / 1. numbered          > callout
//   | table | rows |                ``` code fences ```
//   inline: **bold**, `code`, [label](https://… or /learn/…)
//
// No raw HTML or images: output is plain text that React escapes.

export function markdownToBlocks(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  const flush = () => { if (paragraph.length) { blocks.push({ type: "p", text: paragraph.join(" ") }); paragraph = []; } };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flush();
      const code = [];
      for (i += 1; i < lines.length && !lines[i].trim().startsWith("```"); i += 1) code.push(lines[i]);
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }
    if (!trimmed) { flush(); continue; }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ type: heading[1].length === 3 ? "h3" : "h2", text: heading[2].trim() });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      flush();
      const ordered = /^\d/.test(trimmed);
      const items = [];
      for (; i < lines.length; i += 1) {
        const item = lines[i].trim();
        const match = ordered ? /^\d+[.)]\s+(.*)$/.exec(item) : /^[-*]\s+(.*)$/.exec(item);
        if (!match) { i -= 1; break; }
        items.push(match[1]);
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    if (trimmed.startsWith(">")) {
      flush();
      const quote = [];
      for (; i < lines.length && lines[i].trim().startsWith(">"); i += 1) quote.push(lines[i].trim().replace(/^>\s?/, ""));
      i -= 1;
      blocks.push({ type: "callout", text: quote.join(" ") });
      continue;
    }
    if (trimmed.startsWith("|")) {
      flush();
      const rows = [];
      for (; i < lines.length && lines[i].trim().startsWith("|"); i += 1) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
        if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;   // the --- separator row
        rows.push(cells);
      }
      i -= 1;
      if (rows.length) {
        const [head, ...body] = rows;
        blocks.push({ type: "table", head, rows: body });
      }
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

export const ARTICLE_LIMITS = {
  title: [10, 90],
  shortTitle: [3, 40],
  description: [50, 170],
  body: [800, 40_000],
};

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugify = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

// Problems that block submitting for review (drafts can be saved incomplete).
// `taken(slug)` reports whether a slug is already used by the handbook.
export function articleProblems(article, { categories, taken = () => false } = {}) {
  const problems = [];
  const length = (value) => String(value || "").trim().length;
  const check = (field, label) => {
    const [min, max] = ARTICLE_LIMITS[field];
    const n = length(article[field]);
    if (n < min) problems.push(`${label} needs at least ${min} characters (has ${n}).`);
    if (n > max) problems.push(`${label} can be at most ${max} characters (has ${n}).`);
  };
  check("title", "Title");
  check("shortTitle", "Sidebar label");
  check("description", "Summary");
  check("body", "Article");
  if (!SLUG_PATTERN.test(article.slug || "") || article.slug.length < 3 || article.slug.length > 80) problems.push("URL slug must be 3–80 lowercase letters, numbers and hyphens.");
  else if (taken(article.slug)) problems.push(`The URL /learn/${article.slug} is already used by a handbook topic. Choose another slug.`);
  if (categories && !categories.some((category) => category.id === article.category)) problems.push("Choose a category.");
  if (!LEVELS.includes(article.level)) problems.push("Choose a level.");
  const blocks = markdownToBlocks(article.body);
  if (length(article.body) >= ARTICLE_LIMITS.body[0] && blocks.filter((block) => block.type === "h2").length < 2) problems.push("Use at least two ## section headings so readers can navigate the article.");
  for (const block of blocks) {
    for (const text of [block.text, ...(block.items ?? []), ...(block.rows?.flat() ?? [])].filter(Boolean)) {
      for (const [, , href] of String(text).matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        if (!/^(https?:\/\/[^\s]+|\/[a-z0-9/#-]*)$/i.test(href)) problems.push(`Link "${href}" isn't allowed: use https:// links or site paths like /learn/caching.`);
      }
    }
  }
  return problems;
}
