import { z } from "zod";
import { list, oneOf, text } from "../ai/schema.js";

export const poolOutput = z.object({
  answers: list(z.object({
    label: text(80, "Short name of this approach, e.g. 'Cache-aside short codes'."),
    band: oneOf(["strong", "adequate", "weak"], "How this answer would land in a system design interview."),
    outline: text(700, "Original outline of what a candidate giving this answer would say. Do not quote sources."),
    covers: list(text(120, "A theme this answer handles."), { min: 1, max: 5 }, "Themes this answer handles."),
    risks: list(text(160, "A gap or trade-off this answer leaves open."), { max: 4 }, "Gaps a reviewer should still probe."),
  }), { min: 2, max: 4 }, "Two to four distinct answers a reviewer can compare a candidate against. Include one strong and one weak."),
  mustCover: list(z.object({
    topic: text(80, "A theme a strong answer usually addresses."),
    why: text(220, "Why this theme matters for this question."),
  }), { min: 2, max: 8 }, "Themes worth noticing if missing. Not a checklist of the only valid design."),
  alternatives: list(z.object({
    choice: text(120, "A credible alternative."),
    whenBetter: text(220, "When this alternative is the better choice."),
  }), { min: 1, max: 5 }, "Real alternatives, with the condition that makes each one better."),
  weakPatterns: list(text(200, "A common weak pattern, stated originally."), { min: 1, max: 5 }, "Patterns that look plausible but fail this question."),
  followUps: list(text(200, "One interviewer follow-up."), { min: 2, max: 5 }, "Questions that distinguish a strong answer from a recited one."),
  uncertainty: text(400, "Where public explanations disagree, or 'Public sources broadly agree.'"),
}).superRefine((value, ctx) => {
  const bands = new Set(value.answers.map((answer) => answer.band));
  if (!bands.has("strong") || !bands.has("weak")) {
    ctx.addIssue({ code: "custom", path: ["answers"], message: "must include one strong answer and one weak answer" });
  }
});

// Stable for a given question. Scraped pages are stored beside this pool;
// aggregation of those pages is a separate step.
export function deterministicPool(prompt, sources = []) {
  const topics = [...(prompt.considerations ?? []), ...(prompt.requirements ?? [])].filter(Boolean);
  const unique = [...new Set(topics.map((topic) => String(topic).replace(/\s+/g, " ").trim()))];
  const must = unique.slice(0, 4);
  while (must.length < 2) must.push(prompt.title);
  const sourceNote = sources.length
    ? `${sources.length} public page(s) were collected; this pool was composed from the brief without a model.`
    : "No public pages were available, and no model was configured. This pool is composed from the brief only.";
  return {
    answers: [
      {
        label: "Requirements-first design",
        band: "strong",
        outline: `Clarify ${must[0]} and ${must[1]}, state a scale assumption, then draw the write path and the read path separately. Name the data model and one trade-off that would change the design if the assumption is wrong.`,
        covers: must.slice(0, 3),
        risks: ["Leaves the concrete technology choice open until the constraint is clear."],
      },
      {
        label: "Technology list",
        band: "weak",
        outline: `Names a load balancer, a cache, a queue, and a database for ${prompt.title} without saying which requirement needs each one or what fails if one of them is removed.`,
        covers: [must[0]],
        risks: ["No scale assumption.", "No trade-off.", "Extra components that the brief does not require."],
      },
    ],
    mustCover: must.slice(0, 4).map((topic) => ({
      topic: topic.slice(0, 80),
      why: "The question brief treats this as part of a complete answer.",
    })),
    alternatives: [{
      choice: "A smaller design that meets the stated scale",
      whenBetter: "When the brief's traffic does not require the extra component.",
    }],
    weakPatterns: ["Listing products (Kafka, Redis, Kubernetes) with no requirement attached."],
    followUps: [
      "What breaks first if traffic grows tenfold?",
      "Which part of this design could you delete and still meet the brief?",
    ],
    uncertainty: sourceNote,
  };
}

function fence(value) {
  return String(value ?? "").replace(/[<>]/g, (char) => (char === "<" ? "‹" : "›"));
}

// Compact text passed into a candidate review. Excerpts stay in the database.
export function renderPool(pool) {
  const answers = pool.answers.map((answer) => [
    `- ${answer.band}: ${fence(answer.label)}`,
    `  Outline: ${fence(answer.outline)}`,
    `  Covers: ${answer.covers.map(fence).join("; ")}`,
    answer.risks.length ? `  Still open: ${answer.risks.map(fence).join("; ")}` : "",
  ].filter(Boolean).join("\n")).join("\n");
  const must = pool.mustCover.map((item) => `- ${fence(item.topic)}: ${fence(item.why)}`).join("\n");
  const alternatives = pool.alternatives.map((item) => `- ${fence(item.choice)} — ${fence(item.whenBetter)}`).join("\n");
  return [
    "Answer pool:",
    answers,
    "Themes a strong answer usually touches:",
    must,
    "Credible alternatives:",
    alternatives,
    "Weak patterns:",
    pool.weakPatterns.map((pattern) => `- ${fence(pattern)}`).join("\n"),
    "Follow-ups:",
    pool.followUps.map((question) => `- ${fence(question)}`).join("\n"),
    `Uncertainty: ${fence(pool.uncertainty)}`,
  ].join("\n");
}
