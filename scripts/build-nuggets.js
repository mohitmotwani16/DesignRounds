// Builds nugget JSON files for questions with a Problem Pack.
//   npm run nuggets:build -- url-shortener
//   npm run nuggets:build -- --all --fake --publish   (offline scaffold for every pack file)
//   npm run nuggets:build -- --all --publish          (model-generated; needs AI configured)
//   npm run nuggets:build -- --force --all ...        (overwrite existing JSON files)
import "../server/env.js";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { close, connect } from "../server/db.js";
import { describeAi } from "../server/modules/ai/config.js";
import { importPackFiles, readPackFiles } from "../server/modules/pks/index.js";
import { buildNuggetsForPrompt } from "../server/modules/nuggets/builder.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "server", "content", "nuggets");
const args = process.argv.slice(2);
const fake = args.includes("--fake");
const all = args.includes("--all");
const publish = args.includes("--publish");
const force = args.includes("--force");
const ids = args.filter((arg) => !arg.startsWith("--"));

await connect();
await importPackFiles();
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let targets = ids;
if (all) {
  targets = readPackFiles().map((entry) => entry.promptId).sort();
}
if (!targets.length) {
  console.error("Usage: npm run nuggets:build -- [--fake] [--publish] [--force] [--all] <prompt-id> [...]");
  process.exit(1);
}

function shouldSkip(promptId) {
  const outPath = path.join(outDir, `${promptId}.json`);
  if (!existsSync(outPath)) return false;
  try {
    const existing = JSON.parse(readFileSync(outPath, "utf8"));
    if (existing.nuggets?.some((nugget) => nugget.source === "hand" && nugget.status === "published")) {
      return "hand-authored";
    }
    if (!force && existing.nuggets?.length) return "exists";
  } catch {
    return false;
  }
  return false;
}

console.log(`Building nuggets for ${targets.length} question(s)${fake ? " (fake)" : ""}${publish ? " (publish)" : ""} with ${describeAi()}\n`);
let failed = 0;
let skipped = 0;
const failedIds = [];

async function buildOne(id) {
  const attempts = fake ? 1 : 4;
  let lastError;
  for (let round = 0; round < attempts; round += 1) {
    try {
      return await buildNuggetsForPrompt(id, { fake, publish: publish || fake });
    } catch (error) {
      lastError = error;
      const retryable = !fake && round < attempts - 1 && /503|429|rate|demand|unavailable|timeout|provider/i.test(String(error.message));
      if (!retryable) throw error;
      const waitMs = 20_000 * (round + 1);
      console.log(`  retry ${id} in ${waitMs / 1000}s (${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

for (const id of targets) {
  const skip = shouldSkip(id);
  if (skip) {
    skipped += 1;
    console.log(`  skip ${id}: ${skip}`);
    continue;
  }
  try {
    const file = await buildOne(id);
    writeFileSync(path.join(outDir, `${id}.json`), `${JSON.stringify(file, null, 2)}\n`);
    console.log(`  ok  ${id}: ${file.nuggets.length} nugget(s)`);
  } catch (error) {
    failed += 1;
    failedIds.push(id);
    console.error(`  fail ${id}: ${error.message}`);
  }
}
await close();
console.log(`\nDone. ${targets.length - failed - skipped} written, ${skipped} skipped, ${failed} failed.`);
if (failedIds.length) console.log(`Failed: ${failedIds.join(", ")}`);
process.exit(failed ? 1 : 0);
