import crypto from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Interviewer guides: curated, per-prompt reference notes that calibrate the AI.
// They live under server/content (never under src/, which ships to the browser),
// one Markdown file per track. Each guide starts with "# guide: <prompt-id>" and
// must contain every section in `SECTIONS`, in any order.
const guidesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "guides");

export const SECTIONS = [
  "Scope and scale",
  "Core components",
  "Key decisions and trade-offs",
  "Common mistakes",
  "Deep-dive questions",
  "What strong looks like",
];

function parse(file) {
  const source = readFileSync(path.join(guidesDir, file), "utf8").replace(/\r\n/g, "\n");
  const guides = new Map();
  for (const block of source.split(/^# guide: /m).slice(1)) {
    const [idLine, ...rest] = block.split("\n");
    const id = idLine.trim();
    const text = rest.join("\n").trim();
    const missing = SECTIONS.filter((section) => !text.includes(`## ${section}`));
    if (missing.length) throw new Error(`Guide "${id}" in ${file} is missing sections: ${missing.join(", ")}`);
    if (guides.has(id)) throw new Error(`Guide "${id}" appears twice in ${file}`);
    guides.set(id, { id, text, version: crypto.createHash("sha256").update(text).digest("hex").slice(0, 8) });
  }
  return guides;
}

function load() {
  const all = new Map();
  let files = [];
  try {
    files = readdirSync(guidesDir).filter((file) => file.endsWith(".md")).sort();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const file of files) {
    for (const [id, guide] of parse(file)) {
      if (all.has(id)) throw new Error(`Guide "${id}" is defined in more than one file`);
      all.set(id, guide);
    }
  }
  return all;
}

const guides = load();

export function guideFor(promptId) {
  return guides.get(promptId) ?? null;
}

export function guideIds() {
  return [...guides.keys()];
}
