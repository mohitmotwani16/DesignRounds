import crypto from "node:crypto";
import { queryOne } from "../../db.js";
import { guideFor } from "../ai/guides.js";
import { fullPrompts, promptById } from "../rounds.js";
import { canonicalJson } from "./schema.js";

// One normalised record per question: what the PKS builds a pack from. It doesn't care
// who wrote these (a person today, the Problem Setter later); only this function knows
// where they live.

const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

export function briefOf(prompt) {
  return {
    title: prompt.title,
    description: prompt.description,
    difficulty: prompt.difficulty,
    minutes: prompt.minutes,
    requirements: prompt.requirements ?? [],
    considerations: prompt.considerations ?? [],
    expectedOutcome: prompt.expectedOutcome ?? "",
    prerequisites: prompt.prerequisites ?? [],
  };
}

export async function inputsFor(promptId) {
  const prompt = promptById.get(promptId);
  if (!prompt) return null;
  const brief = briefOf(prompt);
  const guide = guideFor(promptId);
  const row = await queryOne("select status, pool, created_at from answer_pools where prompt_id = $1", [promptId]);
  const pool = row?.status === "ready" ? row.pool : null;
  const fingerprint = sha(canonicalJson({ brief, guide: guide?.version ?? null, pool: pool ? sha(canonicalJson(pool)) : null }));
  return {
    promptId,
    track: prompt.track,
    brief,
    guide: guide ? { text: guide.text, version: guide.version } : null,
    pool,
    poolStatus: row?.status ?? "missing",
    poolQueuedAt: row?.created_at ?? null,
    fingerprint,
  };
}

// Questions a pack can be built for: everything with an interviewer guide.
export function packableQuestions() {
  return fullPrompts.filter((prompt) => guideFor(prompt.id)).map((prompt) => prompt.id);
}
