// Validates Learn content: every catalog topic has a body, every body has a catalog
// entry, and every internal link, related topic, practice round and diagram edge points
// at something that exists. Run by `npm run check:build`; also usable on its own.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { TOPICS } = await import(pathToFileURL(path.join(root, "src", "learn", "catalog.js")).href);
const { prompts } = await import(pathToFileURL(path.join(root, "src", "data", "prompts.js")).href);

const topicSlugs = new Set(TOPICS.map((topic) => topic.slug));
const roundIds = new Set(prompts.map((prompt) => prompt.id));
const dir = path.join(root, "src", "learn", "topics");
const files = readdirSync(dir).filter((file) => file.endsWith(".js"));
const problems = [];

for (const slug of topicSlugs) if (!files.includes(`${slug}.js`)) problems.push(`${slug}: in the catalog but has no body`);

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
function checkText(slug, text) {
  for (const [, , href] of text.matchAll(LINK)) {
    const learn = /^\/learn\/([a-z0-9-]+)$/.exec(href)?.[1];
    const round = /^\/system-design\/([a-z0-9-]+)$/.exec(href)?.[1];
    if (learn && !topicSlugs.has(learn)) problems.push(`${slug}: link to unknown topic ${href}`);
    else if (round && !roundIds.has(round)) problems.push(`${slug}: link to unknown round ${href}`);
    else if (!learn && !round && !/^\/(learn|library(\/[a-z-]+)?|about|)(#[a-z0-9-]+)?$/.test(href)) problems.push(`${slug}: unexpected link ${href}`);
  }
}

let diagrams = 0;
for (const file of files) {
  const slug = file.slice(0, -3);
  if (!topicSlugs.has(slug)) { problems.push(`${slug}: has a body but no catalog entry`); continue; }
  const body = (await import(pathToFileURL(path.join(dir, file)).href)).default;
  if (!Array.isArray(body.blocks) || !body.blocks.length) problems.push(`${slug}: no blocks`);
  for (const block of body.blocks ?? []) {
    for (const text of [block.text, ...(block.items ?? []), ...(block.rows?.flat() ?? [])].filter(Boolean)) checkText(slug, text);
    if (block.type === "diagram") {
      diagrams += 1;
      if (!block.caption) problems.push(`${slug}: diagram without a caption`);
      if (block.kind === "flow" || !block.kind) {
        const ids = new Set(block.nodes.map((node) => node.id));
        if (ids.size !== block.nodes.length) problems.push(`${slug}: duplicate node ids in a diagram`);
        for (const edge of block.edges ?? []) if (!ids.has(edge.from) || !ids.has(edge.to)) problems.push(`${slug}: diagram edge ${edge.from} -> ${edge.to} references a missing node`);
      }
      if (block.kind === "sequence") {
        for (const step of block.steps) {
          const indexes = step.note ? step.over : [step.from, step.to];
          if (indexes.some((index) => index < 0 || index >= block.actors.length)) problems.push(`${slug}: sequence step out of range`);
        }
      }
    }
  }
  for (const use of body.uses ?? []) checkText(slug, use.text);
  for (const tip of body.interview ?? []) checkText(slug, tip);
  for (const related of body.related ?? []) if (!topicSlugs.has(related)) problems.push(`${slug}: unknown related topic ${related}`);
  for (const round of body.practice ?? []) if (!roundIds.has(round)) problems.push(`${slug}: unknown practice round ${round}`);
}

const pending = [...topicSlugs].filter((slug) => !files.includes(`${slug}.js`));
if (process.argv.includes("--allow-missing")) problems.splice(0, problems.length, ...problems.filter((problem) => !problem.endsWith("has no body")));
if (problems.length) {
  console.error(`check-learn: ${problems.length} problem(s)\n${problems.map((problem) => ` - ${problem}`).join("\n")}`);
  process.exit(1);
}
console.log(`check-learn: ${files.length} topics, ${diagrams} diagrams, all links and references valid${pending.length ? ` (${pending.length} topics still to write)` : ""}`);
