import { z } from "zod";
import { filterFillerWords } from "../ai/communication.js";
import { list, oneOf, text } from "../ai/schema.js";
import { answerContextNotes, communicationNotes } from "../ai/tasks/interviewer.js";
import { CLASSIFICATIONS, MODEL_MOVES, OPENING_MOVES } from "./moves.js";

// The Conductor's one model call per turn (section 5.2). Field order matters: `move`
// and `focusItemId` come before `message`, so the move can be checked against the plan
// before any text reaches the learner (the streaming gate).

export const conductorTemplateVersion = "interviewer-v3";

export const conductorOutput = z.object({
  move: oneOf(MODEL_MOVES, "Exactly one move, chosen from the plan's allowed moves. Write this field first."),
  focusItemId: text(40, "The agenda item this message is about. For open, acknowledge_advance, move_on and curveball: the item the message opens. Write this field second."),
  message: text(1200, "What you say to the candidate. Plain conversational sentences, at most about 120 words and at most one question. Empty only for stay_silent."),
  classification: oneOf(CLASSIFICATIONS, "What the candidate's latest turn was; none when there was no new candidate turn."),
  assessment: list(z.object({
    itemId: text(40, "An agenda item id the candidate's turn addressed."),
    band: oneOf(["strong", "adequate", "weak"], "Band by that item's evidence descriptors."),
    quote: text(300, "The candidate's own words, copied exactly from this or a recent turn, or from a canvas note."),
    missing: text(200, "In a few words, what a stronger answer would add; empty if nothing."),
    misconceptionId: text(40, "A known misconception id from the focus item that the turn showed; empty if none."),
  }), { max: 4 }, "What the candidate's latest turn showed, one entry per agenda item it actually addressed. Empty when nothing can be quoted."),
  clarificationIds: list(text(40, "A clarification fact id."), { max: 4 }, "Clarification facts your message gives the candidate."),
  newAssumption: text(200, "A fact you decided because it was not in your clarification notes; empty otherwise."),
  nodeIds: list(z.string(), { max: 6 }, "Ids of the components this message is about; empty if none."),
  coveredNodeIds: list(z.string(), { max: 40 }, "Ids of components the candidate has now explained well enough not to be asked about again."),
  communication: communicationNotes,
  answerContext: answerContextNotes,
});

const silentNotes = { signals: [], note: "" };
const emptyContext = { technicalContext: "", communicationGaps: [] };

// Offline stand-in: plausible, deterministic, clearly labelled, and always within the
// plan, so the whole pipeline (gate, validation, ledger) runs without a provider.
export function fakeConductorReply({ plan, learnerText = "", trigger = "reply", openers = {} }) {
  const prefer = trigger === "hint"
    ? ["hint"]
    : trigger.startsWith("tick") ? ["open", "probe", "move_on", "wrap_up", "ask_to_draw"] : ["probe", "acknowledge_advance", "ask_to_draw", "open", "move_on", "wrap_up", "clarify", "explain"];
  const move = prefer.find((candidate) => plan.allowedMoves.includes(candidate)) ?? plan.allowedMoves[0];
  const focusItemId = move === "curveball" ? plan.curveball?.agendaItemId ?? ""
    : move === "ask_to_draw" ? plan.drawTarget ?? plan.focusItemId ?? ""
      : OPENING_MOVES.has(move) && move !== "open" ? plan.nextItemId ?? "" : plan.focusItemId ?? "";
  const words = filterFillerWords(learnerText).split(/\s+/).filter(Boolean);
  const said = words.length >= 3 && trigger === "reply";
  const message = {
    hint: "(Sample hint) Think about which part of this gets the most traffic, and what happens when one machine isn't enough.",
    probe: "(Sample interviewer) Can you be more specific about how that works when traffic grows tenfold?",
    wrap_up: "(Sample interviewer) Let's wrap up. Summarise your design, the biggest risk in it, and what you'd improve.",
    ask_to_draw: "(Sample interviewer) Before we go further, put that part on the canvas so we can look at it together.",
    listen: "(Sample interviewer) Okay, so writes land in the database first and the cache fills on reads. That works. Keep going.",
    stay_silent: "",
  }[move] ?? `(Sample interviewer) ${openers[focusItemId] ?? "Tell me more about that."}`;
  return {
    move,
    focusItemId,
    message,
    classification: said ? "answer" : "none",
    assessment: said && plan.focusItemId ? [{ itemId: plan.focusItemId, band: "adequate", quote: words.slice(0, 6).join(" "), missing: "(Sample) more detail on scale", misconceptionId: "" }] : [],
    clarificationIds: [],
    newAssumption: "",
    nodeIds: [],
    coveredNodeIds: [],
    communication: said ? { signals: ["clear"], note: "(Sample note) Stated the choice directly." } : silentNotes,
    answerContext: said ? { technicalContext: `(Sample technical context) ${words.slice(0, 30).join(" ")}`, communicationGaps: [] } : emptyContext,
  };
}

// One task object for every turn, so the provider schema is computed once. The
// caller passes the assembled context blocks and what the fake needs.
export const conductorTask = {
  name: "interviewer",
  blocks: (input) => input.blocks,
  output: conductorOutput,
  fake: (input) => fakeConductorReply(input.fake),
};
