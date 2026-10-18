import { isProduction } from "../../flags.js";
import { processNextPack } from "./index.js";

// Builds call the strong model, so they never run by accident: only with
// PROBLEM_PACKS=build (any environment). Queuing new questions is always on and free.
export const buildPacksEnabled = () => process.env.PROBLEM_PACKS === "build";
export const describePacks = () => (buildPacksEnabled() ? "build" : isProduction ? "queue-only" : "queue-only (PROBLEM_PACKS=build to build)");

// Drains the pack queue on a long-running process, one question at a time.
export function startPackWorker() {
  let stopped = false;
  let timer;
  const tick = async () => {
    if (stopped) return;
    let wait = 120_000;
    try {
      const outcome = await processNextPack();
      if (outcome === "built") wait = 5_000;
      else if (outcome === "failed") wait = 30_000;
      else if (outcome === "deferred") wait = 15_000;
    } catch (error) {
      console.error("[pks] worker:", error.message);
      wait = 60_000;
    }
    if (!stopped) timer = setTimeout(tick, wait);
  };
  console.log("[pks] Problem Packs will build for queued questions (PROBLEM_PACKS=build)");
  timer = setTimeout(tick, 5_000);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
