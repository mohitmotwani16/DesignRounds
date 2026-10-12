// Runs the final-review prompt against the evaluation cases and checks calibration.
//   npm run ai:eval                       all cases once
//   npm run ai:eval -- --case url-strong  one case
//   npm run ai:eval -- --repeat 2         run each case twice and check score stability
// Results are saved to .data/eval/ for comparing prompt versions. Uses the configured
// provider (free-tier Gemini in development); nothing is written to the app database.
import "../server/env.js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prompts } from "../src/data/prompts.js";
import { reviewCases } from "../server/content/eval/review-cases.js";
import { describeAi } from "../server/modules/ai/config.js";
import { describeDiagram } from "../server/modules/ai/context.js";
import { guideFor } from "../server/modules/ai/guides.js";
import { runTask } from "../server/modules/ai/run.js";
import { reviewTask, reviewTemplateVersion } from "../server/modules/ai/tasks/review.js";
import { normalize } from "../server/modules/reviews.js";

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const only = option("case");
const repeat = Math.max(1, Number(option("repeat") || 1));
const MAX_SPREAD = 15;
const PAUSE_MS = 1500; // stay friendly to free-tier rate limits

const cases = reviewCases.filter((entry) => !only || entry.id === only);
if (!cases.length) { console.error(`No case named "${only}".`); process.exit(1); }
console.log(`Evaluating ${cases.length} case(s) x${repeat} with ${describeAi()}\n`);

const allText = (value) => JSON.stringify(value);
const results = [];
let failed = 0;
let quotaHit = false;

for (const entry of cases) {
  if (quotaHit) break;
  const prompt = prompts.find((candidate) => candidate.id === entry.promptId);
  const guide = guideFor(prompt.id);
  const design = describeDiagram(entry.diagram);
  const runs = [];
  for (let attempt = 0; attempt < repeat; attempt += 1) {
    const started = Date.now();
    try {
      const { data } = await runTask(reviewTask, { prompt, design, guide }, { meter: false });
      const review = normalize(data, design);
      const problems = [];
      const [low, high] = entry.expect.overall;
      if (review.overall.score < low || review.overall.score > high) problems.push(`overall ${review.overall.score} outside ${low}-${high}`);
      for (const [id, max] of Object.entries(entry.expect.dimensionMax || {})) {
        const score = review.dimensions.find((dimension) => dimension.id === id).score;
        if (score > max) problems.push(`${id} ${score} > ${max}`);
      }
      const decisions = review.reasoning?.decisions ?? [];
      if (!decisions.length) problems.push("no decision analysis");
      for (const key of ["sizing", "explanation"]) {
        if (entry.expect[key] && !decisions.some((decision) => decision[key] === entry.expect[key])) problems.push(`no decision rated ${key}=${entry.expect[key]}`);
      }
      if (entry.expect.mention && !entry.expect.mention.test(allText([review.risks, review.dimensions, review.nextSteps]))) problems.push(`never mentions ${entry.expect.mention}`);
      const rawIds = allText([data.summary, data.strengths, data.risks, data.dimensions, data.nextSteps]).match(/\[[\w-]+\]/g)?.filter((match) => design.componentIds.has(match.slice(1, -1)));
      if (rawIds?.length) problems.push(`raw ids in text: ${[...new Set(rawIds)].join(" ")}`);
      const refs = [...data.strengths, ...data.risks].flatMap((item) => item.nodeIds);
      const unknownRefs = refs.filter((id) => !design.componentIds.has(id));
      if (unknownRefs.length) problems.push(`unknown nodeIds: ${unknownRefs.join(" ")}`);
      runs.push({ score: review.overall.score, dimensions: Object.fromEntries(review.dimensions.map((dimension) => [dimension.id, dimension.score])), problems, ms: Date.now() - started, review });
    } catch (error) {
      if (error.code === "RATE_LIMITED") { quotaHit = true; break; }
      runs.push({ score: null, problems: [`error ${error.code || ""} ${error.message}`], ms: Date.now() - started });
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  if (!runs.length) break;
  const scores = runs.map((run) => run.score).filter((score) => score !== null);
  const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;
  const problems = [...new Set(runs.flatMap((run) => run.problems))];
  if (spread > MAX_SPREAD) problems.push(`unstable: scores ${scores.join(", ")} (spread ${spread} > ${MAX_SPREAD})`);
  const ok = problems.length === 0;
  if (!ok) failed += 1;
  const dims = runs[0]?.dimensions ? Object.values(runs[0].dimensions).join("/") : "-";
  console.log(`${ok ? "PASS" : "FAIL"}  ${entry.id.padEnd(18)} score ${scores.join(",").padEnd(8)} dims ${dims.padEnd(18)} ${Math.round(runs.reduce((sum, run) => sum + run.ms, 0) / runs.length)}ms`);
  for (const problem of problems) console.log(`      - ${problem}`);
  results.push({ id: entry.id, ok, problems, runs });
}

const version = reviewTemplateVersion(null).split("/").slice(0, 2).join("/");
const outDir = path.resolve(".data", "eval");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `review-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(outFile, JSON.stringify({ provider: describeAi(), template: version, results }, null, 2));
if (quotaHit) console.log("\nStopped: the provider's rate limit or free-tier quota was reached. Results so far are kept; rerun later.");
const notRun = cases.length - results.length;
console.log(`\n${results.length - failed}/${results.length} evaluated cases passed${notRun ? ` (${notRun} not run)` : ""}. Full output: ${path.relative(process.cwd(), outFile)}`);
process.exit(failed || quotaHit ? 1 : 0);
