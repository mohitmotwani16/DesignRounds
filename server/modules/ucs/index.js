import crypto from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "../../db.js";

// Universal Context Setter (docs/design/universal-context-setter.md): the context
// that is true for every interview whatever the question. Who the interviewer is,
// how a round runs, the rules, and a short safe description of the candidate.
//
// Content is config-as-code under server/content/interviewer, versioned by a hash
// of every file. It never calls a model and never reads problem or session data.
// The only thing it writes is its own rendered text, at boot, so rounds pinned to an
// older version can finish on the text they started with.

const DEFAULT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "interviewer");
export const MODES = ["guided", "realistic"];
export const UCS_TASKS = ["interviewer", "interview_summary", "review", "pack_build"];
const CORE_PARTS = ["policy.md", "persona.md", "format.md", "behaviours.md", "moves.md", "output.md"];
const TASK_PARTS = { interview_summary: ["policy.md", "tasks/summary.md"], review: ["tasks/review.md"], pack_build: ["policy.md", "tasks/pack_build.md"] };
const REQUIRED = [...CORE_PARTS, ...MODES.map((mode) => `modes/${mode}.md`), "tasks/summary.md", "tasks/review.md", "tasks/pack_build.md", "conventions.json"];
const PLACEHOLDER = /\{\{\s*([A-Za-z]\w*)\s*\}\}/g;

// Rough budget estimate; providers report the real count.
export const estimateTokens = (text) => Math.ceil(text.length / 4);

function listFiles(dir, prefix = "") {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    return statSync(full).isDirectory() ? listFiles(full, relative) : [relative];
  });
}

function fill(template, values, file) {
  return template.replace(PLACEHOLDER, (_match, key) => {
    if (!(key in values)) throw new Error(`UCS: ${file} uses {{${key}}}, which is not in conventions.json for that context`);
    const value = values[key];
    return Array.isArray(value) ? value.map((part) => `${Math.round(part * 100)}%`).join(" and ") : String(value);
  });
}

// Loads, validates and renders every block of one content directory. Throws on a
// missing file or an unresolvable placeholder, which fails startup.
export function loadContent(dir = DEFAULT_DIR) {
  const files = new Map();
  for (const file of listFiles(dir).filter((name) => /\.(md|json)$/.test(name)).sort()) {
    files.set(file, readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n").trim());
  }
  const missing = REQUIRED.filter((file) => !files.has(file));
  if (missing.length) throw new Error(`UCS: missing content files: ${missing.join(", ")}`);

  const conventions = JSON.parse(files.get("conventions.json"));
  for (const key of ["shared", ...MODES]) {
    if (!conventions[key] || typeof conventions[key] !== "object") throw new Error(`UCS: conventions.json has no "${key}" section`);
  }
  const hash = crypto.createHash("sha256");
  for (const [file, text] of files) hash.update(`${file}\0${text}\0`);
  const version = `ucs-${hash.digest("hex").slice(0, 8)}`;

  const join = (parts, values) => parts.map((file) => fill(files.get(file), values, file)).join("\n\n");
  const texts = {
    "core|any": join(CORE_PARTS, conventions.shared),
    ...Object.fromEntries(MODES.map((mode) => [`mode|${mode}`, join([`modes/${mode}.md`], { ...conventions.shared, ...conventions[mode] })])),
    ...Object.fromEntries(Object.entries(TASK_PARTS).map(([task, parts]) => [`${task}|any`, join(parts, conventions.shared)])),
    "conventions|any": JSON.stringify(conventions),
  };
  return { version, texts };
}

const current = loadContent();
// Texts by version, so rounds pinned to an older version keep their exact text.
const versions = new Map([[current.version, current.texts]]);

export function ucsVersion() {
  return current.version;
}

// Writes this deploy's rendered text, once per version. Insert-only and idempotent,
// so concurrent cold starts are harmless.
export async function persistUcsVersion() {
  for (const [key, text] of Object.entries(current.texts)) {
    const [task, mode] = key.split("|");
    await query("insert into ucs_versions (version, task, mode, text) values ($1, $2, $3, $4) on conflict do nothing", [current.version, task, mode, text]);
  }
}

async function textsFor(version) {
  if (versions.has(version)) return versions.get(version);
  const rows = await query("select task, mode, text from ucs_versions where version = $1", [version]);
  if (!rows.length) throw new Error(`UCS: version ${version} is not retained`);
  const texts = Object.fromEntries(rows.map((row) => [`${row.task}|${row.mode}`, row.text]));
  versions.set(version, texts);
  return texts;
}

const block = (id, role, text, stability, version) => ({ id, role, text, stability, version, tokens: estimateTokens(text) });
const blockVersion = (version, text) => `${version}:${crypto.createHash("sha256").update(text).digest("hex").slice(0, 8)}`;

const TRACK_NAMES = {
  "software-engineering": "software engineering",
  "data-engineering": "data engineering",
  "machine-learning": "machine learning",
  "platform-infrastructure": "platform and infrastructure",
  "distributed-systems": "distributed systems",
  "frontend-mobile": "frontend and mobile",
};
const LEVEL_NAMES = { student: "student or new graduate", early: "early career (1-3 years)", mid: "mid-level (3-6 years)", senior: "senior (6+ years)" };

export function renderCandidate(candidate) {
  if (!candidate) return "";
  const tracks = candidate.targetTracks.map((track) => TRACK_NAMES[track]).filter(Boolean);
  return [
    "<candidate>",
    `Target roles: ${tracks.length ? tracks.join(", ") : "not given"}`,
    `Experience: ${LEVEL_NAMES[candidate.level] ?? "not given"}`,
    `Rounds completed on DesignRounds: ${candidate.roundsCompleted}`,
    "</candidate>",
    "Pitch your wording to this candidate, but judge every answer by the same evidence descriptors.",
  ].join("\n");
}

// The context blocks for one task, from the pinned version. `mode` is required for the
// interviewer; `candidate` adds the session block. Blocks are labelled by stability;
// the caller orders the final prompt (global -> problem -> session -> turn).
export async function renderUniversal({ version = current.version, task, candidate = null, mode = null }) {
  if (!UCS_TASKS.includes(task)) throw new Error(`UCS: unknown task ${task}`);
  const texts = await textsFor(version);
  const blocks = [];
  if (task === "interviewer") {
    if (!MODES.includes(mode)) throw new Error(`UCS: the interviewer needs a mode, got ${mode}`);
    blocks.push(block("ucs.core", "system", texts["core|any"], "global", blockVersion(version, texts["core|any"])));
    blocks.push(block(`ucs.mode.${mode}`, "system", texts[`mode|${mode}`], "global", blockVersion(version, texts[`mode|${mode}`])));
  } else {
    const text = texts[`${task}|any`];
    blocks.push(block(`ucs.task.${task}`, "system", text, "global", blockVersion(version, text)));
    if (task === "review" && MODES.includes(mode)) blocks.push(block(`ucs.mode.${mode}`, "system", texts[`mode|${mode}`], "global", blockVersion(version, texts[`mode|${mode}`])));
  }
  const candidateText = renderCandidate(candidate);
  if (candidateText) blocks.push(block("ucs.candidate", "context", candidateText, "session", blockVersion(version, candidateText)));
  return blocks;
}

// The numbers the Conductor's code enforces, from the same file the prompt renders, so
// the model and the code can't disagree. `hintsPerRound` comes from plans.js.
export async function conventions({ version = current.version, mode, hintsPerRound = 0 }) {
  if (!MODES.includes(mode)) throw new Error(`UCS: unknown mode ${mode}`);
  const all = JSON.parse((await textsFor(version))["conventions|any"]);
  return Object.freeze({ ...all.shared, ...all[mode], hintsPerRound });
}

const EXPERIENCE_LEVELS = { "Student / new grad": "student", "1–3 years": "early", "3–6 years": "mid", "6–10 years": "senior", "10+ years": "senior" };

function bucket(count) {
  if (count <= 0) return "0";
  if (count <= 3) return "1-3";
  if (count <= 10) return "4-10";
  return "10+";
}

// What the interviewer may know about the candidate, taken once at round start.
// Deliberately excluded: name, email, organisation, free-text bio and past scores.
export function candidateSnapshot(user, { roundsCompleted = 0 } = {}) {
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  return {
    targetTracks: interests.filter((id) => id in TRACK_NAMES).sort(),
    level: EXPERIENCE_LEVELS[user?.experience_level ?? user?.experienceLevel] ?? null,
    roundsCompleted: bucket(roundsCompleted),
  };
}

// The default mode when the learner didn't choose: guided for beginner rounds and students.
export function defaultMode({ difficulty, candidate }) {
  return difficulty === "Beginner" || candidate?.level === "student" ? "guided" : "realistic";
}

// Old versions no in-progress round pins, kept 14 days for safety.
export async function pruneUcsVersions() {
  const rows = await query(
    `with deleted as (
       delete from ucs_versions v
        where v.version <> $1 and v.created_at < now() - interval '14 days'
          and not exists (
            select 1 from interview_state s join practice_sessions p on p.id = s.session_id
             where s.ucs_version = v.version and p.status = 'in_progress')
       returning 1)
     select count(*)::int as n from deleted`,
    [current.version]
  );
  return rows[0].n;
}
