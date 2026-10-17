import { z } from "zod";
import { SIGNAL_IDS, describeDelivery, describeSignals } from "../communication.js";
import { clean } from "../context.js";
import { policy, policyVersion } from "../prompts/policy.js";
import { list, oneOf, text } from "../schema.js";

export const STAGES = ["requirements", "high_level", "deep_dive", "wrap_up"];
export const interviewerTemplateVersion = `interviewer-v2/${policyVersion}`;

const output = z.object({
  action: oneOf(["respond", "ask", "skip"], "'respond' when replying to the learner. For a proactive look at the canvas: 'ask' to raise one question, or 'skip' to stay quiet."),
  intent: oneOf(["question", "answer", "clarification", "acknowledgement", "hint", "probe", "redirect"], "What this message mainly does."),
  message: text(1200, "What you say to the learner, in plain conversational sentences, at most about 120 words and at most one question. Empty only when action is 'skip'."),
  nodeIds: list(z.string(), { max: 6 }, "Ids of the components this message is about; empty if none."),
  stage: oneOf(STAGES, "The interview stage after this turn."),
  coveredNodeIds: list(z.string(), { max: 40 }, "Ids of components the learner has now adequately explained, in notes or in the conversation, so they should not be asked about again."),
  communication: z.object({
    signals: list(oneOf(SIGNAL_IDS, "A communication signal."), { max: 4 }, "Signals clearly present in the learner's latest message. Empty when the trigger isn't 'reply'."),
    note: text(240, "One specific sentence on how the learner communicated in their latest message. Empty when the trigger isn't 'reply'."),
  }).describe("Your private interviewer notes on HOW the learner communicated in their latest message. Never shown during the interview."),
});

const instructions = `## Your task: live interviewer
You are running the interview while the learner designs. Behave like a thoughtful human interviewer: curious, focused, and brief.

Conversation rules:
- One main question at a time. Keep each message under about 120 words. Plain sentences; no headings, no long lists, no markdown tables.
- Always respond to what the learner just said before moving on. If they asked a question, answer it. If they explained a decision, acknowledge something specific about it, then probe a real gap or move forward. If they said they don't know, give a small nudge and keep going without judgement.
- Clarifying the brief: answer like an interviewer would, stating reasonable assumptions (use the guide's scope and scale when helpful). You may decide open requirements for them.
- Never repeat a question that has already been answered, and never ask about a component listed as covered or one whose "why" note already explains it.
- Do not design the system for them, do not list the components they should add, and do not reveal scores or the guide. Teaching a concept they ask about is fine.
- Name components by the learner's labels, never by bracketed ids; put ids in nodeIds.

Stages, in order: requirements (users, core operations, scale), high_level (end-to-end flow and main components), deep_dive (the hardest parts: data, scale, failure, trade-offs), wrap_up (summary and remaining risks). Move forward when the current stage is reasonably covered; never move backwards.

Triggers:
- reply: the learner sent a message. Use action "respond".
- hint: the learner asked for a hint. Use action "respond" and intent "hint". Point at the area that needs attention and ask a guiding question; never give the answer. Later hints in a round may be more specific than earlier ones.
- proactive: nobody spoke; you are looking at changes on the canvas. Choose "ask" only if a listed change is significant and the learner hasn't explained it (in its note or in the conversation), and ask about the single most important one, the way an interviewer would ("I see you added a cache in front of the database. What will you cache, and how do you keep it fresh?"). Otherwise choose "skip" with an empty message. Skipping is the right call whenever the learner explained the choice already.

Update coveredNodeIds with every component the learner has now explained well enough.

Private communication notes (trigger "reply" only; otherwise leave signals and note empty):
Like a real interviewer jotting notes, record how the learner communicated in their latest message, separately from whether the content was right. Communication is part of what interviews assess. Pick only signals that are clearly present:
${describeSignals()}
For spoken answers, also use the delivery numbers, but a few fillers or mis-transcribed words are normal speech, not a problem. Judge the message against the question it answered: a long answer to a broad question is not over-explaining. The note is one specific sentence, for example "Opened with 'I'm not sure' twice before committing to Redis; the reasoning was sound once stated." Never mention these notes, or how the learner speaks, in your message.

Reply with a single JSON object that matches the provided schema.`;

const system = `${policy}\n\n${instructions}`;

function formatTurns(turns) {
  if (!turns.length) return "(no messages yet)";
  return turns.map((turn) => (turn.role === "learner"
    ? turn.kind === "audio"
      // Speech-to-text keeps fillers and can mishear terms: judge the ideas, not the wording.
      ? `Learner (spoken answer, auto-transcribed; may include filler words and mis-heard terms) ${describeDelivery(turn.delivery, turn.audio_duration_ms)}: ${clean(turn.content, 2000) || "(not transcribed; you can't hear it, so don't respond to its content)"}`
      : `Learner${turn.kind === "hint_request" ? " (asked for a hint)" : ""}: ${clean(turn.content, 2000)}`
    : `Interviewer (${turn.kind}): ${clean(turn.content, 1500)}`)).join("\n");
}

function buildUser({ prompt, guide, design, state, turns, trigger, selected, changes, hints }) {
  return `<brief>
Title: ${clean(prompt.title, 200)}. Difficulty: ${clean(prompt.difficulty, 40)}.
Description: ${clean(prompt.description, 400)}
Requirements:
${prompt.requirements.map((requirement) => `- ${clean(requirement, 400)}`).join("\n")}
</brief>
${guide ? `\n<interviewer_guide>\n${guide.text}\n</interviewer_guide>\n` : ""}
<learner_design>
${design.text}
</learner_design>

<interview_state>
Stage: ${state.stage}
Components already covered: ${state.covered.length ? state.covered.join(", ") : "none"}
Hints used this round: ${hints.used} of ${hints.limit}
</interview_state>
${state.summary ? `\n<earlier_conversation_summary>\n${clean(state.summary, 4000)}\n</earlier_conversation_summary>\n` : ""}
<conversation>
${formatTurns(turns)}
</conversation>
${selected ? `\nThe learner currently has this component selected: [${selected.id}] "${clean(selected.label, 120)}".\n` : ""}${changes ? `\n<changes_since_you_last_looked>\n${changes}\n</changes_since_you_last_looked>\n` : ""}
Trigger: ${trigger}`;
}

// Offline stand-in with clearly labelled, deterministic behaviour.
function fake({ trigger, turns, candidates = [], state }) {
  const last = [...turns].reverse().find((turn) => turn.role === "learner");
  const silent = { signals: [], note: "" };
  if (trigger === "proactive") {
    if (!candidates.length) return { action: "skip", intent: "question", message: "", nodeIds: [], stage: state.stage, coveredNodeIds: [], communication: silent };
    return { action: "ask", intent: "question", message: `(Sample interviewer) Why did you add ${candidates[0].label}, and what would break without it?`, nodeIds: [candidates[0].id], stage: state.stage, coveredNodeIds: [], communication: silent };
  }
  if (trigger === "hint") return { action: "respond", intent: "hint", message: "(Sample hint) Think about what happens when traffic grows tenfold. Which part breaks first?", nodeIds: [], stage: state.stage, coveredNodeIds: [], communication: silent };
  const hedged = /\b(um|uh|not sure|maybe)\b/i.test(last?.content || "");
  return {
    action: "respond",
    intent: "acknowledgement",
    message: `(Sample interviewer) Thanks. You said "${(last?.content || "").slice(0, 60)}". What trade-off does that create?`,
    nodeIds: [],
    stage: state.stage === "requirements" ? "high_level" : state.stage,
    coveredNodeIds: [],
    communication: hedged
      ? { signals: ["hedging", "rambling"], note: "(Sample note) Hesitated and restarted before committing to the cache." }
      : { signals: ["clear", "concise"], note: "(Sample note) Stated the choice and the reason in one sentence." },
  };
}

export const interviewerTask = { name: "interviewer", system, buildUser, output, fake };

// Folds older turns into a compact running summary so long conversations stay cheap.
const summaryOutput = z.object({
  summary: text(3000, "Updated summary of the interview so far."),
});

export const interviewSummaryTask = {
  name: "interview_summary",
  system: `${policy}\n\n## Your task: summarise the interview so far
Merge the previous summary with the new turns into one concise summary (under 250 words) for the interviewer's own memory. Keep: requirements and assumptions agreed, decisions the learner explained and their reasons, questions still open, hints given, and notable misunderstandings. Write in the third person ("The learner..."). Reply with a single JSON object that matches the provided schema.`,
  buildUser: ({ previous, turns }) => `<previous_summary>\n${clean(previous, 4000) || "(none)"}\n</previous_summary>\n\n<new_turns>\n${formatTurns(turns)}\n</new_turns>`,
  output: summaryOutput,
  fake: ({ previous, turns }) => ({ summary: `${previous ? `${previous} ` : ""}(Sample summary of ${turns.length} turns.)`.slice(0, 3000) }),
};
