import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prompts } from "../../../src/data/prompts.js";
import { isPlus } from "../plans.js";
import { canAccessRound, promptById } from "../rounds.js";
import { briefOf } from "../pks/inputs.js";
import { renderPack } from "../pks/render.js";
import { miniPackAsProblemPack, nuggetContentVersion, validateNuggetFile } from "./schema.js";

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "nuggets");

const byId = new Map();
const byParent = new Map();
let loaded = false;

function loadAll() {
  if (loaded) return;
  loaded = true;
  if (!existsSync(contentDir)) return;
  for (const name of readdirSync(contentDir).filter((file) => file.endsWith(".json"))) {
    const raw = JSON.parse(readFileSync(path.join(contentDir, name), "utf8"));
    const file = validateNuggetFile(raw);
    const published = file.nuggets.filter((nugget) => nugget.status === "published");
    if (!published.length) continue;
    byParent.set(file.promptId, published.map((nugget) => ({ ...nugget, parentPromptId: file.promptId, version: nuggetContentVersion(nugget) })));
    for (const nugget of published) {
      byId.set(nugget.id, { ...nugget, parentPromptId: file.promptId, version: nuggetContentVersion(nugget) });
    }
  }
}

export function reloadNuggets() {
  loaded = false;
  byId.clear();
  byParent.clear();
  loadAll();
}

export function getNugget(nuggetId) {
  loadAll();
  return byId.get(nuggetId) ?? null;
}

export function nuggetsForParent(parentPromptId) {
  loadAll();
  return byParent.get(parentPromptId) ?? [];
}

export function allPublishedNuggets() {
  loadAll();
  return [...byId.values()];
}

export function getNuggetRecord(nuggetId) {
  const nugget = getNugget(nuggetId);
  if (!nugget) return null;
  const version = nugget.version;
  const pack = { ...miniPackAsProblemPack(nugget), version };
  const parent = promptById.get(nugget.parentPromptId);
  const brief = parent ? { ...briefOf(parent), minutes: nugget.minutes, description: nugget.scenario.symptoms } : {
    title: nugget.title,
    description: nugget.scenario.symptoms,
    difficulty: "Intermediate",
    minutes: nugget.minutes,
    requirements: [],
    considerations: [],
    expectedOutcome: "",
    prerequisites: [],
  };
  const rendered = renderPack(pack, brief);
  return { nugget, pack, version, rendered };
}

/** Parents with at least one published nugget, optionally filtered for random pool. */
export function eligibleParents(user, { forRandomPool = false } = {}) {
  loadAll();
  const parents = [...byParent.keys()].filter((id) => (byParent.get(id)?.length ?? 0) > 0);
  if (!forRandomPool) return parents.map((id) => promptById.get(id)).filter(Boolean);
  return parents
    .map((id) => promptById.get(id))
    .filter((prompt) => prompt && (isPlus(user) || prompt.access === "free"));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickNugget(user, { nuggetId, parentPromptId, random = false } = {}) {
  loadAll();
  if (nuggetId) {
    const nugget = getNugget(nuggetId);
    if (!nugget) throw new Error("NOT_FOUND");
    const parent = promptById.get(nugget.parentPromptId);
    if (!parent || !canAccessRound(user, parent)) throw new Error("PLAN_REQUIRED");
    return nugget;
  }
  if (parentPromptId) {
    const parent = promptById.get(parentPromptId);
    if (!parent) throw new Error("NOT_FOUND");
    if (!canAccessRound(user, parent)) throw new Error("PLAN_REQUIRED");
    const pool = nuggetsForParent(parentPromptId);
    if (!pool.length) throw new Error("NO_NUGGETS");
    return pickRandom(pool);
  }
  if (random) {
    const parents = eligibleParents(user, { forRandomPool: true });
    if (!parents.length) throw new Error("NO_NUGGETS");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const parent = pickRandom(parents);
      const pool = nuggetsForParent(parent.id);
      if (pool.length) return pickRandom(pool);
    }
    throw new Error("NO_NUGGETS");
  }
  throw new Error("INVALID_PICK");
}

export function publicNuggetSummary(nugget) {
  const parent = promptById.get(nugget.parentPromptId);
  return {
    id: nugget.id,
    title: nugget.title,
    minutes: nugget.minutes,
    parentPromptId: nugget.parentPromptId,
    parentTitle: parent?.title ?? nugget.parentPromptId,
    track: parent?.track ?? null,
    access: parent?.access ?? "free",
    icon: parent?.icon ?? null,
    symptomsPreview: nugget.scenario.symptoms.slice(0, 160),
  };
}

export function publicNuggetCatalog() {
  loadAll();
  return allPublishedNuggets().map(publicNuggetSummary);
}

/** Sync public metadata into src/data/nuggets.js for prerender (run from check script). */
export function publicCatalogJson() {
  return JSON.stringify(publicNuggetCatalog(), null, 2);
}

export function importNuggetFiles() {
  reloadNuggets();
  const count = byId.size;
  if (count) console.log(`[nuggets] loaded ${count} published nugget(s) for ${byParent.size} parent(s)`);
}
