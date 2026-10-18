import { estimateTokens } from "../ucs/index.js";
import { STAGES } from "./schema.js";

// Deterministic rendering of a pack into prompt text (section 7 of the PKS design).
// Same pack -> same bytes, on every instance and every deploy, so the provider's
// prompt cache stays warm. Rendered once at publish and stored with the pack.

const line = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const entry = (text) => ({ text, tokens: estimateTokens(text) });

function renderBrief(brief) {
  return [
    "<brief>",
    `Title: ${line(brief.title)}. Difficulty: ${line(brief.difficulty)}. Time: ${brief.minutes} minutes.`,
    `Description: ${line(brief.description)}`,
    "Requirements:",
    ...brief.requirements.map((requirement) => `- ${line(requirement)}`),
    brief.considerations?.length ? `Considerations: ${brief.considerations.map(line).join("; ")}` : "",
    "</brief>",
  ].filter(Boolean).join("\n");
}

function agendaLine(item) {
  return `- ${item.id} · ${item.stage} · ${item.dimension} · weight ${item.weight} · ${item.required ? "required" : "optional"} · ${line(item.goal)}`;
}

function renderInterviewerAgenda(pack) {
  const byStage = STAGES.flatMap((stage) => pack.agenda.filter((item) => item.stage === stage));
  return [
    "<agenda>",
    "Your private notepad for this question, one line per item: id · stage · rubric dimension · weight · required or optional · goal.",
    ...byStage.map(agendaLine),
    "</agenda>",
    "",
    "<clarifications>",
    "Hidden facts. Give one only when the candidate asks about its topic, and then give exactly this fact.",
    ...pack.clarifications.map((fact) => `- ${fact.id} (${fact.topics.map(line).join(", ")}): ${line(fact.answer)}`),
    `Anything not listed: ${line(pack.clarificationPolicy)}`,
    "</clarifications>",
    pack.curveballs.length ? ["", "<curveballs>", "Use one only when the plan allows the curveball move.", ...pack.curveballs.map((ball) => `- ${ball.id}, after ${ball.after}, opens ${ball.agendaItemId}: ${line(ball.prompt)}`), "</curveballs>"].join("\n") : "",
  ].filter((part) => part !== "").join("\n");
}

export function renderFocus(item) {
  return [
    `<focus_item id="${item.id}">`,
    `Stage: ${item.stage}. Dimension: ${item.dimension}. Goal: ${line(item.goal)}`,
    `Opener: ${line(item.opener)}`,
    "Evidence:",
    ...["strong", "adequate", "weak"].map((band) => `- ${band}: ${line(item.evidence[band])}`),
    item.misconceptions.length ? "Known misconceptions:" : "",
    ...item.misconceptions.map((entry) => `- ${entry.id}: ${line(entry.pattern)} Challenge with: "${line(entry.challenge)}"`),
    "Probes:",
    ...item.probes.map((probe) => `- ${line(probe)}`),
    "Hint ladder (give the next one only when the candidate asks for a hint):",
    ...item.hints.map((hint, index) => `${index + 1}. ${line(hint)}`),
    `Standard answer, private (never say it in realistic mode): ${line(item.moveOnSummary)}`,
    "</focus_item>",
  ].filter((part) => part !== "").join("\n");
}

function renderReviewAgenda(pack) {
  return [
    "<question_agenda>",
    "What an interview on this question should cover, with how to judge each item. A sound answer can take another route; judge it against each item's goal.",
    ...STAGES.flatMap((stage) => pack.agenda.filter((item) => item.stage === stage)).map((item) => [
      agendaLine(item),
      ...["strong", "adequate", "weak"].map((band) => `  ${band}: ${line(item.evidence[band])}`),
    ].join("\n")),
    "</question_agenda>",
    pack.alternatives.length ? ["", "<valid_alternatives>", ...pack.alternatives.map((alt) => `- ${line(alt.choice)}: ${line(alt.whenBetter)}`), "</valid_alternatives>"].join("\n") : "",
    pack.exemplars.length ? ["", "<exemplar_outlines>", ...pack.exemplars.map((exemplar) => `- ${exemplar.band}, ${line(exemplar.label)}: ${line(exemplar.outline)}`), "</exemplar_outlines>"].join("\n") : "",
  ].filter((part) => part !== "").join("\n");
}

// Everything rendered for one pack, stored in problem_packs.rendered.
export function renderPack(pack, brief) {
  const briefText = entry(renderBrief(brief));
  return {
    interviewer: { brief: briefText, agenda: entry(renderInterviewerAgenda(pack)) },
    review: { brief: briefText, agenda: entry(renderReviewAgenda(pack)) },
    focus: Object.fromEntries(pack.agenda.map((item) => [item.id, entry(renderFocus(item))])),
  };
}

const block = (id, text, tokens, stability, version) => ({ id, role: "context", text, stability, version, tokens });

// The blocks one task needs. Interviewer: brief and one-line agenda (shared by every
// learner on the question) plus the focus item in full (changes as the round moves).
export function blocksFrom(rendered, version, { task, focusItemId = null }) {
  if (task === "review") {
    return [
      block("pks.brief", rendered.review.brief.text, rendered.review.brief.tokens, "problem", version),
      block("pks.review", rendered.review.agenda.text, rendered.review.agenda.tokens, "problem", version),
    ];
  }
  const blocks = [
    block("pks.brief", rendered.interviewer.brief.text, rendered.interviewer.brief.tokens, "problem", version),
    block("pks.agenda", rendered.interviewer.agenda.text, rendered.interviewer.agenda.tokens, "problem", version),
  ];
  const focus = focusItemId && rendered.focus[focusItemId];
  if (focus) blocks.push(block(`pks.focus.${focusItemId}`, focus.text, focus.tokens, "turn", version));
  return blocks;
}
