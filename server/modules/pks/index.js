import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isProduction } from "../../flags.js";
import { promptById } from "../rounds.js";
import { buildPack } from "./builder.js";
import { briefOf, inputsFor, packableQuestions } from "./inputs.js";
import { blocksFrom, renderPack } from "./render.js";
import { checkPack, finishPack, sanitizeContent, validatePack } from "./schema.js";
import * as store from "./store.js";

// Problem Knowledge Service (docs/design/problem-knowledge-service.md): one versioned
// Problem Pack per question, read by key at request time and built offline. No model
// call ever happens on a learner's request path.

// PROBLEM_PACKS_DIR points at another folder of pack files (the smoke test uses one with a
// question left out, to exercise building a pack).
const defaultPacksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "packs");
const packsDir = () => process.env.PROBLEM_PACKS_DIR || defaultPacksDir;
const PUBLISHED_TTL_MS = 60_000;
const MEMO_LIMIT = 200;

// Packs are immutable per version, so this memo never needs invalidation.
const memo = new Map();
const publishedCache = new Map();

function remember(key, value) {
  memo.delete(key);
  memo.set(key, value);
  if (memo.size > MEMO_LIMIT) memo.delete(memo.keys().next().value);
  return value;
}

export async function publishedVersion(promptId) {
  const cached = publishedCache.get(promptId);
  if (cached && Date.now() - cached.at < PUBLISHED_TTL_MS) return cached.version;
  const row = await store.publishedRow(promptId);
  publishedCache.set(promptId, { version: row?.version ?? null, at: Date.now() });
  if (row) remember(`${promptId}@${row.version}`, { pack: row.pack, rendered: row.rendered });
  return row?.version ?? null;
}

// { pack, rendered } for one version. Throws if the version doesn't exist.
export async function getPack(promptId, version) {
  const key = `${promptId}@${version}`;
  if (memo.has(key)) return memo.get(key);
  const row = await store.packRow(promptId, version);
  if (!row) throw new Error(`PKS: no pack ${version} for ${promptId}`);
  return remember(key, { pack: row.pack, rendered: row.rendered });
}

// Context blocks for a task from a loaded pack record.
export function renderProblem(record, { task, focusItemId = null }) {
  return blocksFrom(record.rendered, record.pack.version, { task, focusItemId });
}

export async function packStatus(promptId) {
  const row = await store.publishedRow(promptId);
  return row ? { status: "published", version: row.version, builtAt: row.created_at } : { status: "none", version: null, builtAt: null };
}

function renderedFor(pack) {
  const prompt = promptById.get(pack.promptId);
  if (!prompt) throw new Error(`PKS: pack for unknown question ${pack.promptId}`);
  return renderPack(pack, briefOf(prompt));
}

// Hand-authored packs (server/content/packs/<prompt-id>.json) are validated like built
// ones and land as published. Their version is the content hash, computed here.
export function readPackFiles(dir = packsDir()) {
  let files = [];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith(".json")).sort();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const promptId = path.basename(file, ".json");
    if (raw.promptId && raw.promptId !== promptId) throw new Error(`PKS: ${file} says promptId ${raw.promptId}`);
    if (!promptById.has(promptId)) throw new Error(`PKS: ${file} is for an unknown question`);
    const { schemaVersion: _s, promptId: _p, version: _v, inputsFingerprint: _i, builder: _b, ...content } = raw;
    return { promptId, file, content };
  });
}

export async function importPackFiles(dir = packsDir()) {
  let imported = 0;
  for (const { promptId, file, content } of readPackFiles(dir)) {
    const inputs = await inputsFor(promptId);
    const pack = finishPack(content, { promptId, inputsFingerprint: inputs.fingerprint, builder: "manual" });
    const problems = validatePack(pack);
    if (problems.length) throw new Error(`PKS: ${file} is invalid: ${problems.join("; ")}`);
    const existing = await store.packRow(promptId, pack.version);
    if (existing?.status === "published") continue;
    // A file only takes over if nothing newer was published by an admin.
    const published = await store.publishedRow(promptId);
    if (published && published.builder !== "manual" && existing?.status !== "retired") {
      await store.savePack({ pack, rendered: renderedFor(pack), status: "draft", validation: { source: file } });
      continue;
    }
    await store.savePack({ pack, rendered: renderedFor(pack), status: "published", validation: { source: file } });
    publishedCache.delete(promptId);
    imported += 1;
  }
  return imported;
}

// Queues a build for every question whose inputs have no pack yet. Cheap; safe on boot.
export async function syncPackJobs() {
  let queued = 0;
  for (const promptId of packableQuestions()) {
    const inputs = await inputsFor(promptId);
    if (await store.queueJob(promptId, inputs.fingerprint)) queued += 1;
  }
  return queued;
}

const POOL_WAIT_MS = 24 * 60 * 60_000;
const autopublish = () => !isProduction && process.env.PROBLEM_PACKS_AUTOPUBLISH === "on";

// Builds one queued pack. Returns "built", "failed", "deferred" or "idle".
export async function processNextPack(promptId = null) {
  const job = await store.claimJob(promptId);
  if (!job) return "idle";
  try {
    const inputs = await inputsFor(job.prompt_id);
    if (!inputs) {
      await store.failJob(job.prompt_id, "UNKNOWN_PROMPT");
      return "failed";
    }
    // The pool is an input: wait for it, but not forever.
    const poolAge = inputs.poolQueuedAt ? Date.now() - new Date(inputs.poolQueuedAt).getTime() : Infinity;
    if (!promptId && !inputs.pool && ["pending", "building"].includes(inputs.poolStatus) && poolAge < POOL_WAIT_MS) {
      await store.deferJob(job.prompt_id);
      return "deferred";
    }
    const { pack, warnings, consistency } = await buildPack(inputs);
    await store.savePack({ pack, rendered: renderedFor(pack), status: autopublish() ? "published" : "draft", validation: { warnings, consistency } });
    await store.finishJob(job.prompt_id);
    publishedCache.delete(job.prompt_id);
    console.log(`[pks] ${job.prompt_id} built ${pack.version} (${pack.agenda.length} items, ${warnings.length} warnings)`);
    return "built";
  } catch (error) {
    console.error(`[pks] ${job.prompt_id} build failed:`, error.code || error.message);
    await store.failJob(job.prompt_id, error.code || "FAILED");
    return "failed";
  }
}

export async function processPackJobs({ limit = 1, promptId = null } = {}) {
  const outcome = { built: 0, failed: 0, deferred: 0 };
  for (let n = 0; n < limit; n += 1) {
    const result = await processNextPack(promptId);
    if (result === "idle") break;
    outcome[result] += 1;
    if (promptId) break;
  }
  return outcome;
}

// Admin views and actions (routes in ./routes.js).
export async function listPacks() {
  const overview = new Map((await store.overviewRows()).map((row) => [row.prompt_id, row]));
  const jobs = new Map((await store.jobRows()).map((row) => [row.prompt_id, row]));
  return packableQuestions().map((promptId) => {
    const prompt = promptById.get(promptId);
    const row = overview.get(promptId);
    const job = jobs.get(promptId);
    return {
      promptId,
      title: prompt.title,
      track: prompt.track,
      access: prompt.access,
      publishedVersion: row?.published_version ?? null,
      publishedAt: row?.published_at ?? null,
      drafts: row?.drafts ?? 0,
      lastBuiltAt: row?.last_built_at ?? null,
      job: job ? { status: job.status, attempts: job.attempts, errorCode: job.error_code, updatedAt: job.updated_at } : null,
    };
  });
}

export async function packDetail(promptId) {
  const prompt = promptById.get(promptId);
  if (!prompt) return null;
  const inputs = await inputsFor(promptId);
  const versions = await store.packRows(promptId);
  const published = versions.find((row) => row.status === "published") ?? null;
  const full = await Promise.all(versions.slice(0, 5).map(async (row) => ({ ...row, pack: (await getPack(promptId, row.version)).pack })));
  return {
    promptId,
    title: prompt.title,
    inputs: { fingerprint: inputs.fingerprint, guide: inputs.guide?.text ?? null, poolStatus: inputs.poolStatus },
    publishedVersion: published?.version ?? null,
    versions: full.map((row) => ({
      version: row.version,
      status: row.status,
      builder: row.builder,
      validation: row.validation,
      stale: row.inputs_fingerprint !== inputs.fingerprint,
      createdAt: row.created_at,
      publishedAt: row.published_at,
      pack: row.pack,
    })),
  };
}

export async function publishPack(promptId, version, adminId) {
  const record = await getPack(promptId, version);
  const problems = checkPack(record.pack);
  if (problems.length) return { ok: false, problems };
  const row = await store.setStatus(promptId, version, "published", adminId);
  publishedCache.delete(promptId);
  return { ok: Boolean(row) };
}

export async function retirePack(promptId, version, adminId) {
  const row = await store.setStatus(promptId, version, "retired", adminId);
  publishedCache.delete(promptId);
  return { ok: Boolean(row) };
}

// An admin's edit of a draft becomes a new version, built by "manual".
export async function saveEditedPack(promptId, content, adminId) {
  const inputs = await inputsFor(promptId);
  const { content: clean, warnings } = sanitizeContent(content);
  const pack = finishPack(clean, { promptId, inputsFingerprint: inputs.fingerprint, builder: "manual" });
  const problems = validatePack(pack);
  if (problems.length) return { ok: false, problems };
  await store.savePack({ pack, rendered: renderedFor(pack), status: "draft", validation: { warnings, editedBy: adminId }, reviewedBy: adminId });
  return { ok: true, version: pack.version };
}

export async function requestBuild(promptId) {
  const inputs = await inputsFor(promptId);
  if (!inputs) return false;
  await store.forceJob(promptId, inputs.fingerprint);
  return true;
}

export { store as packStore };
