import { clean } from "../ai/context.js";
import { aiConfig } from "../ai/config.js";
import { runTask } from "../ai/run.js";
import { deterministicPool, poolOutput } from "./task.js";

const TEMPLATE = "answer-pool-v1";

export function answerPoolTemplateVersion() {
  return TEMPLATE;
}

const system = `You aggregate public explanations of one system design interview question into private calibration notes for DesignRounds reviewers.

You receive the question and short excerpts from blogs, docs, forums, and video transcripts. Write one original pool of answers a reviewer can later compare a candidate against. System design has several valid answers; show that spread.

Rules:
- Do not copy sentences from the excerpts. Name approaches in your own words.
- Do not produce a diagram or a solution the product could show to a learner. These notes stay on the server.
- Prefer themes that show up in more than one source. If sources disagree, say so in uncertainty.
- A strong answer states requirements, a scale assumption, data flow, and at least one trade-off. A weak answer names technologies without tying them to the problem.
- If the excerpts are thin, lean on the brief and say that the pool is mostly from the question itself.`;

function buildUser({ prompt, sources }) {
  const sourceText = sources.length
    ? sources.map((source, index) => [
      `Source ${index + 1} (${source.kind}): ${clean(source.title || "Untitled", 180)}`,
      clean(source.url, 300),
      clean(source.excerpt, 900),
    ].join("\n")).join("\n\n")
    : "No public page could be fetched. Build the pool from the brief alone and say so in uncertainty.";
  return `<question>
Title: ${clean(prompt.title, 200)}
Track: ${clean(prompt.track, 60)}. Difficulty: ${clean(prompt.difficulty, 40)}.
Description: ${clean(prompt.description, 400)}
Requirements:
${(prompt.requirements ?? []).map((requirement) => `- ${clean(requirement, 300)}`).join("\n")}
Considerations: ${(prompt.considerations ?? []).map((item) => clean(item, 80)).join("; ")}
Expected work: ${clean(prompt.expectedOutcome, 400)}
</question>

<public_excerpts>
${sourceText}
</public_excerpts>

Aggregate these excerpts into one JSON object matching the schema.`;
}

function fake(input) {
  return deterministicPool(input.prompt, input.sources);
}

export const answerPoolTask = { name: "answer_pool", system, buildUser, output: poolOutput, fake };

// One model call per question version. The stored pool is what reviews read later.
// With no provider, the deterministic pool keeps the queue moving.
export async function aggregateSources(prompt, sources) {
  if (!aiConfig.enabled) {
    return { pool: poolOutput.parse(deterministicPool(prompt, sources)), model: "deterministic" };
  }
  const output = await runTask(answerPoolTask, { prompt, sources }, { meter: true });
  return { pool: output.data, model: output.model };
}
