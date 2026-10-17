// Builds reference answer pools for questions that do not have one yet.
// Usage: node scripts/build-answer-pools.js [--limit 5] [--prompt url-shortener]
import "../server/env.js";
import { close, connect } from "../server/db.js";
import { processAnswerPools, syncAnswerPools } from "../server/modules/answers/worker.js";

const args = process.argv.slice(2);
const limitAt = args.indexOf("--limit");
const promptAt = args.indexOf("--prompt");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : 3;
const promptId = promptAt >= 0 ? args[promptAt + 1] : null;
if (!Number.isInteger(limit) || limit < 1) {
  console.error("[answers] --limit must be a positive integer");
  process.exit(1);
}

await connect();
const queued = await syncAnswerPools();
console.log(`[answers] ${queued.pending} question(s) queued (${queued.total} in the bank)`);
const result = await processAnswerPools({ limit: promptId ? 1 : limit, promptId });
console.log(`[answers] built ${result.built}, failed ${result.failed}`);
await close();
