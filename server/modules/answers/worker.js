import { prompts } from "../../../src/data/prompts.js";
import { gatherSources } from "./gather.js";
import { aggregateSources } from "./aggregate.js";
import { claimAnswerPool, failAnswerPool, saveAnswerPool, syncAnswerPools } from "./store.js";
import { deterministicPool, poolOutput } from "./task.js";

const byId = new Map(prompts.map((prompt) => [prompt.id, prompt]));

// One question per call. Returns "ready", "failed", or "idle".
export async function processNextAnswerPool(promptId = null) {
  const job = await claimAnswerPool(promptId);
  if (!job) return "idle";
  const prompt = byId.get(job.prompt_id);
  if (!prompt) {
    await failAnswerPool(job.prompt_id, "UNKNOWN_PROMPT");
    return "failed";
  }
  try {
    const sources = await gatherSources(prompt);
    const { pool, model } = await aggregateSources(prompt, sources);
    const saved = await saveAnswerPool({ promptId: job.prompt_id, fingerprint: job.prompt_fingerprint, pool, model, sources });
    console.log(`[answers] ${job.prompt_id} ${saved ? "ready" : "stale"} sources=${sources.length} model=${model}`);
    return saved ? "ready" : "failed";
  } catch (error) {
    console.error(`[answers] ${job.prompt_id} failed:`, error.message);
    await failAnswerPool(job.prompt_id, error.code || "FAILED");
    return "failed";
  }
}

export async function processAnswerPools({ limit = 1, promptId = null } = {}) {
  let built = 0;
  let failed = 0;
  for (let n = 0; n < limit; n += 1) {
    const outcome = await processNextAnswerPool(promptId);
    if (outcome === "idle") break;
    if (outcome === "ready") built += 1;
    else failed += 1;
    if (promptId) break;
  }
  return { built, failed };
}

// Drains the queue on a long-running process. New and edited questions are
// picked up because startup sync marks them pending, and this loop prefers
// the most recently queued row.
export function startAnswerPoolWorker() {
  let stopped = false;
  let timer;
  const tick = async () => {
    if (stopped) return;
    let wait = 60_000;
    try {
      const outcome = await processNextAnswerPool();
      if (outcome === "ready") wait = 2_000;
      else if (outcome === "failed") wait = 15_000;
    } catch (error) {
      console.error("[answers] worker:", error.message);
      wait = 30_000;
    }
    if (!stopped) timer = setTimeout(tick, wait);
  };
  console.log("[answers] reference pools will build for new questions (ANSWER_POOLS=off to pause)");
  timer = setTimeout(tick, 3_000);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

export { syncAnswerPools };
