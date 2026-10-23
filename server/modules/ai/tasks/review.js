import { z } from "zod";
import { clean } from "../context.js";
import { policy, policyVersion } from "../prompts/policy.js";
import { dimensionIds, rubric } from "../rubric.js";
import { scoringVersion } from "../scoring.js";
import { integer, list, oneOf, text } from "../schema.js";

const TEMPLATE = "review-v9";

// Identifies everything that shaped a review's instructions, stored with each review.
// The pool fingerprint is part of it so a newly built reference pool calibrates the
// next review instead of being ignored behind a cached one.
// A v3 round adds its pinned pack version: the review also reads the interview notepad.
// The scoring rules are part of it too, since they shape the stored scores.
export function reviewTemplateVersion(guide, pool = null, ledger = null) {
  const base = `${TEMPLATE}/${scoringVersion}/${policyVersion}/${guide ? `guide-${guide.version}` : "no-guide"}/${pool ? `pool-${pool.fingerprint}` : "no-pool"}`;
  return ledger ? `${base}/${ledger.packVersion}` : base;
}

const nodeRefs = list(z.string(), { max: 6 }, "Ids (the bracketed values) of the components this point is about; empty if none.");

const output = z.object({
  summary: text(700, "Two to four sentences: what the design does and its overall quality, written to the learner as 'you'."),
  dimensions: list(z.object({
    id: oneOf(dimensionIds, "Rubric dimension id."),
    score: integer(0, 10, "Score for this dimension using the calibration scale."),
    evidence: list(text(280, "One observation from the design."), { min: 1, max: 4 }, "What in the design supports this score: specific components, connections, or notes."),
    improvement: text(400, "The single most valuable improvement for this dimension, concrete and actionable."),
  }), { min: dimensionIds.length, max: dimensionIds.length }, "Exactly one entry per rubric dimension, in rubric order."),
  strengths: list(z.object({
    point: text(220, "A strength, stated specifically."),
    detail: text(400, "Why it matters for this prompt."),
    nodeIds: nodeRefs,
  }), { min: 1, max: 4 }, "Most important strengths first."),
  risks: list(z.object({
    point: text(220, "A gap, risk, or mistake, stated specifically."),
    whyItMatters: text(400, "The concrete consequence for this system."),
    severity: oneOf(["high", "medium", "low"], "How much this would hurt the design in practice."),
    dimension: oneOf(dimensionIds, "The rubric dimension this gap mainly affects."),
    nodeIds: nodeRefs,
  }), { min: 2, max: 5 }, "Most severe first. At least two real gaps, even in a strong design (a minor refinement may be low severity); never invent a requirement to fill the list."),
  nextSteps: list(text(300, "One action."), { min: 2, max: 4 }, "Prioritised actions the learner should take to improve this design."),
  followUpQuestions: list(text(240, "One question."), { min: 1, max: 4 }, "Questions an interviewer would ask next about this design."),
  assumptions: list(text(240, "One assumption."), { max: 3 }, "Anything you had to assume because the design did not say. Empty if none."),
  reasoningSummary: text(700, "Two to four sentences on how well the learner explained and justified the design overall: whether reasons are present and correct, whether they show how and when each choice works, and whether the design is proportionate to the problem."),
  decisions: list(z.object({
    choice: text(160, "The design decision, named with the learner's labels, e.g. 'Redis cache in front of the Links DB'."),
    nodeIds: nodeRefs,
    explanation: oneOf(["well-justified", "partly-justified", "unexplained", "incorrect"], "Quality of the learner's own stated reasoning for this choice. 'unexplained' when they gave none; 'incorrect' when the stated reason is wrong."),
    reached: oneOf(["own", "corrected"], "'corrected' when the learner first chose something else, or got it wrong, and arrived at this choice only after the interviewer pointed out a problem, gave a hint or challenged them; 'own' otherwise."),
    necessity: oneOf(["essential", "helpful", "premature", "unnecessary"], "Whether this problem at its stated scale needs this choice."),
    sizing: oneOf(["right-sized", "over-engineered", "under-engineered"], "Whether the choice's complexity fits the problem and its stated scale."),
    assessment: text(500, "Your judgement of the choice and of the learner's reasoning: what is right, what is missing or wrong, and how and when it would or would not work."),
    alternatives: text(400, "The realistic alternatives a strong candidate would weigh, and when each would be the better choice."),
    probe: text(240, "One question an interviewer would ask to test whether the learner really understands this choice."),
  }), { min: 1, max: 8 }, "The most significant design decisions (data stores, caches, queues, load balancers, gateways, specialised services, protocols, partitioning), most important first."),
}).superRefine((value, ctx) => {
  const seen = value.dimensions.map((dimension) => dimension.id);
  for (const id of dimensionIds) {
    if (seen.filter((entry) => entry === id).length !== 1) ctx.addIssue({ code: "custom", path: ["dimensions"], message: `must contain dimension "${id}" exactly once` });
  }
});

const instructions = `## Your task: final review
The learner has finished the round. Review the design they built against the brief and the rubric, as a senior interviewer would in a debrief.

How to review:
- Judge only from the evidence provided. Do not reward things that are absent. When something is ambiguous, record it under assumptions rather than guessing in the learner's favour or against them.
- Reasoning matters as much as boxes. A good component with no stated rationale scores lower on trade-offs than a justified one. Never score from how tidy the diagram looks.
- In all text, name components by the learner's label (for example "the Redis cache"), never by their bracketed id; the learner never sees ids. Put the ids only in nodeIds.
- Calibrate to the prompt's difficulty and scope. Don't penalise omissions the brief doesn't call for, and don't invent requirements.
- Use the interviewer guide and, when present, the reference answer pool to judge depth and spot gaps. Credit valid alternatives neither one mentions. The pool is a spread of answers, not a checklist, and the learner must never see it.
- Improvements and next steps say what to address and why, not a complete solution to copy.
- A mistake the learner fixed during the round is a gap in catching it themselves, not in the final design: say what happened ("You first read and then wrote the counter, and made it atomic only after the interviewer asked about concurrent requests") and rate it medium. High severity is for problems still in the final design.
- Every review names at least two real gaps to work on, however good the round. Prefer what the learner missed or needed help with; never pad the list with requirements the brief doesn't have. Never suggest something the learner already covered: check the transcript first.

Judging the learner's reasoning (as important as the diagram, just as in a real interview):
- The learner's explanations are the "why" notes on components, decision notes, connection labels, and, when present, what they said in the interview conversation (<interview_transcript>). Credit reasoning given in the conversation exactly as if it were written in a note; judge the interviewer's lines only as context, never as the learner's work. Hints the learner asked for are fine but the reasoning they then gave should be their own. For every significant decision, judge whether a reason is given, whether it is technically correct, and whether it shows how the choice works and when it would be the wrong choice.
- Interview transcripts may include a filler-reduced copy and structured technical context extracted from an answer. Use these as navigation aids, but verify every decision and rationale against the learner's verbatim answer; never treat an interviewer suggestion or an uncertain transcription as the learner's own decision.
- Judge necessity and proportionality. Ask whether each component is needed for this problem at its stated scale. Unjustified complexity (extra services, queues, databases, or technologies that the requirements don't need) is a weakness, not a strength, especially for beginner prompts; say so plainly. Equally, flag designs that are too simple for the stated scale.
- Name-dropping a technology is not a justification. "Kafka for scalability" is a partial reason at best; a strong reason connects the choice to a requirement, a number, or a trade-off.
- Reflect reasoning quality mainly in the trade-offs dimension and proportionality in the architecture dimension.

Scoring scale for each dimension (integers 0-10). Be strict, like a bar-raiser: the scale is anchored to real interview outcomes, and inflated scores teach the learner nothing.
- 10: exceptional and essentially flawless; a senior interviewer would add nothing. Very rare.
- 9: a strong senior candidate: complete, well justified, and the key issues in this area were raised by the candidate, not the interviewer. Uncommon.
- 7-8: solid; the important points are covered, with gaps a senior interviewer would note, or reached partly with the interviewer's help.
- 5-6: partially addressed; noticeable gaps, unjustified choices, or mostly reached with help.
- 3-4: major gaps; only touched on.
- 0-2: absent or incorrect.
Most good rounds land between 6 and 8 per dimension; an overall above 90 should be rare. A mistake the learner corrected only after the interviewer's hint, challenge or follow-up is credited at most in the 7-8 range for that area, and it belongs in risks so they learn to catch it themselves. A design with only a few components should score low on most dimensions. Score each dimension independently.

Keep the numbers consistent with your own judgements; they are checked in code after you reply. A dimension with a high-severity gap can't be strong. The trade-offs score must agree with how you rated each decision's explanation, and the architecture score with how many decisions you found over-engineered or unnecessary. Tag every risk with the dimension it mainly affects.

Reply with a single JSON object that matches the provided schema.`;

const system = `${policy}\n\n${instructions}`;

function buildUser({ prompt, design, guide, transcript, pool, ledger = null }) {
  const dimensions = rubric.dimensions.map((dimension) => `- ${dimension.id} (${dimension.name}): ${dimension.guide}`).join("\n");
  return `<brief>
Title: ${clean(prompt.title, 200)}
Track: ${clean(prompt.track, 60)}. Difficulty: ${clean(prompt.difficulty, 40)}. Suggested time: ${prompt.minutes} minutes.
Description: ${clean(prompt.description, 400)}
Requirements:
${prompt.requirements.map((requirement) => `- ${clean(requirement, 400)}`).join("\n")}
Areas that usually shape a strong answer: ${prompt.considerations.map((item) => clean(item, 120)).join("; ")}
What the learner is practicing: ${clean(prompt.expectedOutcome, 500)}
</brief>

<rubric version="${rubric.version}">
${dimensions}
</rubric>
${guide ? `
<interviewer_guide>
${guide.text}
</interviewer_guide>
` : ""}
${pool ? `
<reference_pool version="${clean(pool.fingerprint, 32)}">
Original calibration notes distilled from public explanations of this question. Compare the learner with the spread of answers. Do not quote this block and do not treat it as the only correct design.
${pool.text}
</reference_pool>
` : ""}
<learner_design>
${design.text}
</learner_design>
${transcript ? `
<interview_transcript>
${transcript}
</interview_transcript>
` : ""}${ledger ? `
${ledger.packReview}

${ledger.addendum}

${ledger.text}
` : ""}
Review this design against the brief and rubric.`;
}

// Offline stand-in: a deterministic, clearly labelled sample built from the design's shape.
function fake({ design }) {
  const lower = design.text.toLowerCase();
  const has = (...words) => words.some((word) => lower.includes(word));
  const base = Math.min(7, 2 + Math.floor(design.componentCount / 2));
  const scoreFor = {
    requirements: base - 1,
    architecture: base + (design.edgeCount >= design.componentCount - 1 ? 1 : -1),
    data: base + (has("database", "postgres", "mysql", "dynamo", "cassandra", "mongo") ? 1 : -2),
    scalability: base + (has("cache", "redis", "load-balancer", "cdn", "queue", "kafka") ? 1 : -2),
    reliability: base - 1 + (has("replica", "queue", "monitor", "retry") ? 1 : 0),
    tradeoffs: has("why:") ? base : 2,
  };
  const ids = [...design.componentIds];
  const clamp = (value) => Math.max(0, Math.min(10, value));
  return {
    summary: `Sample review generated without an AI provider (AI_PROVIDER=fake). Your design has ${design.componentCount} components and ${design.edgeCount} connections. Configure AI_API_KEY to get a real review.`,
    dimensions: rubric.dimensions.map((dimension) => ({
      id: dimension.id,
      score: clamp(scoreFor[dimension.id]),
      evidence: [`Sample evidence for ${dimension.name.toLowerCase()}.`],
      improvement: `Sample improvement for ${dimension.name.toLowerCase()}.`,
    })),
    strengths: [{ point: "Sample strength.", detail: "Shown so the review screen can be developed offline.", nodeIds: ids.slice(0, 1) }],
    risks: [
      { point: "Sample high-severity risk.", whyItMatters: "Placeholder text.", severity: "high", dimension: "reliability", nodeIds: ids.slice(1, 2) },
      { point: "Sample medium-severity risk.", whyItMatters: "Placeholder text.", severity: "medium", dimension: "scalability", nodeIds: [] },
    ],
    nextSteps: ["Sample next step one.", "Sample next step two."],
    followUpQuestions: ["Sample follow-up question?"],
    assumptions: [],
    reasoningSummary: "Sample reasoning summary.",
    decisions: ids.slice(0, 2).map((id, index) => ({
      choice: `Sample decision about ${id}`,
      nodeIds: [id],
      explanation: index ? "unexplained" : "partly-justified",
      necessity: "helpful",
      sizing: "right-sized",
      reached: "own",
      assessment: "Sample assessment of this choice.",
      alternatives: "Sample alternatives.",
      probe: "Sample interviewer probe?",
    })),
  };
}

export const reviewTask = { name: "review", system, buildUser, output, fake };
