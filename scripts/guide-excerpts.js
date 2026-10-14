// Public excerpts of the interviewer guides (server/content/guides/*.md).
//
// The guides calibrate the AI interviewer and are otherwise server-only. The public
// round pages show exactly three sections, which help learners prepare without
// giving away the answer: "Scope and scale", "Common mistakes" and "Deep-dive
// questions". "Core components", "Key decisions and trade-offs" and "What strong
// looks like" never leave the server.
//
// Exposed to the frontend as the virtual module "virtual:guide-excerpts" (see
// vite.config.js), so the excerpts are always built from the current guides.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const guidesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "content", "guides");
export const PUBLIC_SECTIONS = { scale: "Scope and scale", mistakes: "Common mistakes", questions: "Deep-dive questions" };

function section(text, heading) {
  const match = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m").exec(text);
  return match ? match[1].trim() : "";
}

// "What happens on X? How would you Y?" -> ["What happens on X?", "How would you Y?"]
const questions = (text) => text.match(/[^?]+\?/g)?.map((q) => q.trim()).filter(Boolean) ?? [];
// "A; B; C." or "- A\n- B" -> ["A", "B", "C"]
const items = (text) => text.split(/\n-\s+|^-\s+|;\s+/m).map((item) => item.replace(/^-\s+/, "").replace(/\.$/, "").trim()).filter(Boolean)
  .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

export function loadGuideExcerpts() {
  const excerpts = {};
  for (const file of readdirSync(guidesDir).filter((name) => name.endsWith(".md")).sort()) {
    const source = readFileSync(path.join(guidesDir, file), "utf8").replace(/\r\n/g, "\n");
    for (const block of source.split(/^# guide: /m).slice(1)) {
      const [idLine, ...rest] = block.split("\n");
      const text = rest.join("\n");
      excerpts[idLine.trim()] = {
        scale: section(text, PUBLIC_SECTIONS.scale),
        mistakes: items(section(text, PUBLIC_SECTIONS.mistakes)),
        questions: questions(section(text, PUBLIC_SECTIONS.questions)),
      };
    }
  }
  return excerpts;
}

export function guideExcerptsPlugin() {
  const id = "virtual:guide-excerpts";
  const resolved = `\0${id}`;
  return {
    name: "designrounds-guide-excerpts",
    resolveId: (source) => (source === id ? resolved : null),
    load(source) {
      if (source !== resolved) return null;
      for (const file of readdirSync(guidesDir)) this.addWatchFile(path.join(guidesDir, file));
      return `export default ${JSON.stringify(loadGuideExcerpts())};`;
    },
  };
}
