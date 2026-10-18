import { clean } from "../ai/context.js";
import { formatTurns } from "../ai/tasks/interviewer.js";
import { renderProblem } from "../pks/index.js";
import { estimateTokens, renderUniversal } from "../ucs/index.js";

// PROMPT ASSEMBLY (section 7). Blocks are labelled by stability and run.js orders them
// global -> problem -> session -> turn, so the longest possible prefix is identical
// from turn to turn and across learners on the same question:
//
//   global   ucs.core, ucs.mode.<mode>            every session in this mode
//   problem  pks.brief, pks.agenda                every session on this question
//   session  ucs.candidate, conductor.assumptions this round
//   turn     ledger, focus item, design, summary, recent turns, plan

const block = (id, text, stability) => ({ id, role: "context", text, stability, version: "turn", tokens: estimateTokens(text) });
const minutes = (ms) => Math.round(ms / 60_000);

export function renderAssumptions(assumptions, pack) {
  if (!assumptions.length) return "<assumptions>\nNothing told to the candidate yet.\n</assumptions>";
  const facts = new Map(pack.clarifications.map((fact) => [fact.id, fact.answer]));
  return [
    "<assumptions>",
    "Facts you have already told the candidate. Never contradict them.",
    ...assumptions.map((entry) => (entry.clarificationId === "custom" ? `- (decided) ${clean(entry.text, 200)}` : `- ${entry.clarificationId}: ${facts.get(entry.clarificationId) ?? ""}`)),
    "</assumptions>",
  ].join("\n");
}

export function renderLedger(items, conventions) {
  return [
    "<notepad>",
    "Your notes so far, one line per agenda item: id · status · best band · follow-ups used · hints · challenges · what you've heard.",
    ...items.map((item) => {
      const heard = item.evidence.slice(-2).map((entry) => `"${clean(entry.quote, 90)}"`).join(" ");
      const open = item.misconceptions.filter((entry) => !entry.resolved).map((entry) => entry.id);
      return `- ${item.itemId} · ${item.status} · ${item.band ?? "-"} · ${item.followUps}/${conventions.maxFollowUpsPerItem} · ${item.hintLevel} · ${item.challenges}${open.length ? ` · open misconception: ${open.join(", ")}` : ""}${heard ? ` · ${heard}` : ""}`;
    }),
    "</notepad>",
  ].join("\n");
}

export function renderPlan({ plan, trigger, items, selected, changes, rejection }) {
  const status = (id) => items.find((item) => item.itemId === id)?.status ?? "none";
  const focus = plan.focusItemId ? `${plan.focusItemId} (${status(plan.focusItemId)})` : "none (every item is closed)";
  return [
    "<plan>",
    `Focus item: ${focus}. Next item to open: ${plan.nextItemId ?? "none"}.`,
    `Follow-ups left on the focus item: ${plan.budget.followUps}. Challenges left: ${plan.budget.challenges}. Hints left this round: ${plan.budget.hints}.`,
    `Clock: ${plan.clock.stage} stage, ${minutes(plan.clock.stageElapsedMs)} of about ${minutes(plan.clock.stageBudgetMs)} minutes; round ${minutes(plan.clock.roundElapsedMs)} of ${minutes(plan.clock.roundBudgetMs)} minutes.`,
    `Allowed moves: ${plan.allowedMoves.join(", ")}.`,
    plan.candidates.length ? `Other items this turn may touch (credit them if the candidate covered them): ${plan.candidates.join(", ")}.` : "",
    plan.curveball ? `Curveball available: ${plan.curveball.id}, opens ${plan.curveball.agendaItemId}.` : "",
    plan.canvas ? `Canvas: ${plan.canvas.components} components, ${plan.canvas.connections} connections. Parts already drawn: ${plan.canvas.drawn.join(", ") || "none"}. Parts not drawn yet: ${plan.canvas.undrawn.join(", ") || "none"}.` : "",
    plan.drawTarget ? `Before ${plan.drawTarget} can start, its part must be on the canvas: if you move on, ask the candidate to draw it (move ask_to_draw, focusItemId ${plan.drawTarget}); the deep dive starts once it is drawn.` : "",
    plan.allowedMoves.length === 3 && plan.allowedMoves[0] === "ask_to_draw" ? "The candidate has been talking without drawing: ask them to put what they described on the canvas before going further." : "",
    selected ? `The candidate has this component selected: [${selected.id}] "${clean(selected.label, 120)}".` : "",
    changes ? `Changes on the canvas since you last looked:\n${changes}` : "",
    rejection ? `Your previous reply chose a move that isn't allowed now (${rejection}). Choose one of the allowed moves.` : "",
    `Trigger: ${trigger}`,
    "</plan>",
  ].filter(Boolean).join("\n");
}

export async function assembleBlocks({ round, record, items, conventions, design, turns, plan, trigger, selected = null, changes = "", rejection = "" }) {
  const universal = await renderUniversal({ version: round.ucsVersion, task: "interviewer", candidate: round.candidate, mode: round.mode });
  const problem = renderProblem(record, { task: "interviewer", focusItemId: plan.focusItemId });
  return [
    ...universal,
    ...problem,
    block("conductor.assumptions", renderAssumptions(round.assumptions, record.pack), "session"),
    block("conductor.ledger", renderLedger(items, conventions), "turn"),
    block("conductor.design", `<learner_design>\n${design.text}\n</learner_design>`, "turn"),
    ...(round.summary ? [block("conductor.summary", `<earlier_conversation_summary>\n${clean(round.summary, 4000)}\n</earlier_conversation_summary>`, "turn")] : []),
    block("conductor.turns", `<conversation>\n${formatTurns(turns)}\n</conversation>`, "turn"),
    block("conductor.plan", renderPlan({ plan, trigger, items, selected, changes, rejection }), "turn"),
  ];
}
