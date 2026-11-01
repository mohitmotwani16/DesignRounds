import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPackFiles } from "../pks/index.js";
import { buildNuggetsForPrompt } from "./builder.js";
import { nuggetsForParent, reloadNuggets } from "./index.js";

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "nuggets");

/** Placeholder text from `npm run nuggets:build -- --fake`. */
export const SCAFFOLD_MARKER = "Production metrics degraded on";

export function isScaffoldNugget(nugget) {
  return String(nugget?.scenario?.symptoms ?? "").includes(SCAFFOLD_MARKER);
}

export function parentHasScaffoldNuggets(promptId) {
  return nuggetsForParent(promptId).some(isScaffoldNugget);
}

export function nuggetFileExists(promptId) {
  return existsSync(path.join(contentDir, `${promptId}.json`));
}

export function parentsMissingNuggetFiles() {
  return readPackFiles()
    .map((entry) => entry.promptId)
    .filter((promptId) => !nuggetFileExists(promptId));
}

const inflight = new Map();

/** One Gemini call per parent: writes server/content/nuggets/<promptId>.json and reloads the catalog. */
export async function rebuildParentNuggetsLive(promptId, { publish = true } = {}) {
  if (inflight.has(promptId)) return inflight.get(promptId);
  const job = (async () => {
    const file = await buildNuggetsForPrompt(promptId, { fake: false, publish });
    writeFileSync(path.join(contentDir, `${promptId}.json`), `${JSON.stringify(file, null, 2)}\n`);
    reloadNuggets();
    console.log(`[nuggets] live-built ${promptId}: ${file.nuggets.length} nugget(s)`);
    return file;
  })();
  inflight.set(promptId, job);
  try {
    return await job;
  } finally {
    inflight.delete(promptId);
  }
}

let queue = Promise.resolve();
let queued = new Set();

function enqueue(promptId) {
  if (queued.has(promptId) || inflight.has(promptId)) return;
  queued.add(promptId);
  queue = queue.then(async () => {
    try {
      await rebuildParentNuggetsLive(promptId);
    } catch (error) {
      console.error(`[nuggets] live build failed for ${promptId}:`, error.message);
    } finally {
      queued.delete(promptId);
    }
  });
}

/** Background Gemini builds for parents with no JSON file yet (new packs). */
export function scheduleMissingNuggetFiles() {
  if (process.env.NUGGETS_LIVE_BUILD === "false") return;
  for (const promptId of parentsMissingNuggetFiles()) enqueue(promptId);
}

/** Upgrade placeholder drills via Gemini when a learner starts one (optional). */
export function maybeUpgradeScaffoldParent(parentPromptId) {
  if (process.env.NUGGETS_UPGRADE_SCAFFOLDS !== "true") return;
  if (process.env.NUGGETS_LIVE_BUILD === "false") return;
  if (!parentHasScaffoldNuggets(parentPromptId)) return;
  enqueue(parentPromptId);
}
