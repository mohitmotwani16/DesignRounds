import { z } from "zod";
import { TOPICS } from "../../../src/learn/catalog.js";
import { componentKinds } from "../ai/components.js";
import { clean } from "../ai/context.js";
import { rubric } from "../ai/rubric.js";
import { runTask } from "../ai/run.js";
import { list, text } from "../ai/schema.js";
import { renderPool } from "../answers/task.js";
import { renderUniversal } from "../ucs/index.js";
import { finishPack, packContent, sanitizeContent, validatePack } from "./schema.js";

// Builds a draft pack from a question's inputs with one strong-model call (task
// pack_build), then validates it in code. A pack that breaks a structural rule gets
// up to two repair calls that edit it; after that the job fails and the question
// stays on the guide-only interviewer.

export const BUILDER = "pack-builder-v1";
// One build, then up to two repairs that edit the previous pack.
const MAX_ROUNDS = 3;

function section(guideText, name) {
  const match = guideText?.match(new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[1].trim() : "";
}

function buildUser({ inputs, problems, previous }) {
  const { brief, guide, pool } = inputs;
  return [
    "<brief>",
    `Title: ${clean(brief.title, 200)}. Difficulty: ${clean(brief.difficulty, 40)}. Time: ${brief.minutes} minutes.`,
    `Description: ${clean(brief.description, 600)}`,
    "Requirements:",
    ...brief.requirements.map((requirement) => `- ${clean(requirement, 400)}`),
    brief.considerations.length ? `Considerations: ${brief.considerations.map((item) => clean(item, 120)).join("; ")}` : "",
    brief.expectedOutcome ? `Expected outcome: ${clean(brief.expectedOutcome, 600)}` : "",
    "</brief>",
    "",
    "<interviewer_guide>",
    guide?.text ?? "(none)",
    "</interviewer_guide>",
    pool ? `\n<answer_pool>\n${renderPool(pool)}\n</answer_pool>` : "",
    "",
    "<rubric_dimensions>",
    ...rubric.dimensions.map((dimension) => `- ${dimension.id}: ${dimension.name}. ${dimension.guide}`),
    "</rubric_dimensions>",
    "",
    `<component_kinds>\n${[...componentKinds()].sort().join(", ")}\n</component_kinds>`,
    "",
    "<learn_topics>",
    ...TOPICS.map((topic) => `- ${topic.slug}: ${topic.short ?? topic.title}`),
    "</learn_topics>",
    // A repair edits the previous pack: regenerating from scratch tends to fix one rule
    // and break another.
    previous ? `\n<previous_pack>\n${JSON.stringify(previous)}\n</previous_pack>` : "",
    problems?.length ? `\n<previous_problems>\nThe previous pack above broke these rules. Return the same pack with only what's needed to fix every one of them changed; keep everything else as it is:\n${problems.map((problem) => `- ${problem}`).join("\n")}\n</previous_problems>` : "",
  ].filter((part) => part !== "").join("\n");
}

// Offline stand-in: a small, valid, clearly labelled pack shaped by the brief and the
// guide's scope section, so the whole Conductor runs without a provider.
export function fakePackContent({ inputs }) {
  const scope = section(inputs.guide?.text, "Scope and scale").split("\n").map((part) => part.replace(/^[-*]\s*/, "").trim()).filter(Boolean).slice(0, 5);
  const facts = scope.length ? scope : ["Assume a few million daily users and a read-heavy workload."];
  const item = (id, stage, dimension, weight, required, goal, opener, kinds = []) => ({
    id, stage, dimension, weight, required,
    triggers: { componentKinds: kinds.filter((kind) => componentKinds().has(kind)), keywords: [] },
    goal: `(Sample) ${goal}`,
    opener: `(Sample) ${opener}`,
    evidence: { strong: "(Sample) Specific, justified and tied to the requirements.", adequate: "(Sample) Plausible but missing a key detail.", weak: "(Sample) Vague or contradicts the requirements." },
    misconceptions: [],
    probes: ["(Sample) Can you be more specific about that?"],
    hints: ["(Sample) Think about which part is under the most load.", "(Sample) Consider what happens when one machine isn't enough."],
    moveOnSummary: "(Sample) A standard answer exists for this part.",
    learnTopics: [],
  });
  return {
    opening: `(Sample interviewer) Let's design ${inputs.brief.title.replace(/^Design (a |an )?/i, "a ")}. Where would you like to start?`,
    clarifications: facts.map((fact, index) => ({ id: `fact.${index + 1}`, topics: ["scale", "traffic", "users", "scope"].slice(0, 1 + (index % 4)), answer: clean(fact, 300) })),
    clarificationPolicy: "(Sample) Decide anything unlisted in a way that keeps the problem at the brief's difficulty.",
    agenda: [
      item("req.scope", "requirements", "requirements", 2, true, "Pin down users, core operations and scale.", "Who uses this, and what are the core operations?"),
      item("req.nfr", "requirements", "requirements", 1, false, "State latency, availability and consistency needs.", "What matters most: latency, availability or consistency?"),
      item("hl.flow", "high_level", "architecture", 3, true, "An end-to-end flow for the core operations.", "Walk me through a request end to end.", ["api-gateway", "load-balancer"]),
      item("hl.api", "high_level", "architecture", 1, false, "A clear API for the core operations.", "What does the API look like?"),
      item("deep.data", "deep_dive", "data", 3, true, "Storage that fits the access patterns.", "How do you store the core data, and why that store?", ["sql-database", "nosql-database"]),
      item("deep.scale", "deep_dive", "scalability", 3, true, "Handle the expected load and hot spots.", "What breaks first at ten times the traffic?", ["cache"]),
      item("deep.failure", "deep_dive", "reliability", 2, false, "Survive the failure of any one component.", "What happens when a database node fails?"),
      item("wrap.tradeoffs", "wrap_up", "tradeoffs", 2, true, "Name the main trade-offs and what to improve.", "What are the biggest trade-offs in your design?"),
    ],
    curveballs: [],
    vocabulary: [],
    alternatives: [],
    exemplars: [],
    pacing: { requirements: 0.15, high_level: 0.3, deep_dive: 0.4, wrap_up: 0.15 },
  };
}

async function packBuildTask() {
  const system = (await renderUniversal({ task: "pack_build" })).map((block) => block.text).join("\n\n");
  return { name: "pack_build", system, buildUser, output: packContent, fake: fakePackContent };
}

const consistencyOutput = z.object({
  consistent: z.boolean().describe("True when every hidden fact agrees with the guide's scope and scale."),
  conflicts: list(text(300, "One disagreement, naming the fact id."), { max: 8 }, "Disagreements; empty when consistent."),
});

const consistencyTask = {
  name: "pack_consistency",
  system: "You check an interviewer's hidden facts for a system design question against the question's reference guide. Report a conflict only when a fact contradicts a number or scope statement in the guide; a fact the guide doesn't mention is not a conflict. Reply with a single JSON object that matches the provided schema.",
  buildUser: ({ guideScope, clarifications }) => `<guide_scope_and_scale>\n${guideScope || "(none)"}\n</guide_scope_and_scale>\n\n<hidden_facts>\n${clarifications.map((fact) => `- ${fact.id}: ${clean(fact.answer, 300)}`).join("\n")}\n</hidden_facts>`,
  output: consistencyOutput,
  fake: () => ({ consistent: true, conflicts: [] }),
};

// Builds and validates one pack. Returns { pack, warnings, consistency } or throws.
export async function buildPack(inputs) {
  const task = await packBuildTask();
  let problems = [];
  let previous = null;
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const { data, model } = await runTask(task, { inputs, problems, previous }, { meter: true });
    const { content, warnings } = sanitizeContent(data);
    previous = content;
    const pack = finishPack(content, { promptId: inputs.promptId, inputsFingerprint: inputs.fingerprint, builder: `${BUILDER}/${model}` });
    problems = validatePack(pack);
    if (!problems.length) {
      let consistency = null;
      try {
        const { data: check } = await runTask(consistencyTask, { guideScope: section(inputs.guide?.text, "Scope and scale"), clarifications: pack.clarifications });
        consistency = check;
      } catch (error) {
        warnings.push(`consistency check failed: ${error.code || error.message}`);
      }
      return { pack, warnings, consistency };
    }
    console.warn(`[pks] ${inputs.promptId} build round ${round} broke ${problems.length} rule(s): ${problems.slice(0, 3).join("; ")}`);
  }
  const error = new Error(`Pack for ${inputs.promptId} broke structural rules: ${problems.slice(0, 5).join("; ")}`);
  error.code = "INVALID_PACK";
  throw error;
}
