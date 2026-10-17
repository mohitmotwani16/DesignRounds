import { z } from "zod";
import { GAP_SIGNALS, describeDelivery, describeSignals } from "../communication.js";
import { clean } from "../context.js";
import { policy, policyVersion } from "../prompts/policy.js";
import { list, oneOf, text } from "../schema.js";

export const communicationTemplateVersion = `communication-v2/${policyVersion}`;

const quote = text(160, "The learner's own words where this showed, under 15 words, quoted exactly from their answer; empty if it can't be pinned to one place.");

const output = z.object({
  rating: oneOf(["strong", "solid", "developing", "needs_work"], "Overall communication: 'strong' would impress in a real interview; 'solid' clear with minor habits; 'developing' noticeable habits that get in the way; 'needs_work' hard to follow or often unsure."),
  summary: text(500, "Two or three sentences to the learner ('you') on how they communicated across the interview: what came across well and the main habit to change."),
  strengths: list(z.object({
    point: text(200, "A communication strength, stated specifically."),
    example: quote,
  }), { max: 3 }, "What they did well when explaining, most notable first. Empty if nothing stood out."),
  workOn: list(z.object({
    issue: oneOf([...GAP_SIGNALS, "filler_words", "pace", "pauses"], "The habit to work on."),
    point: text(220, "What to work on, specific to how they actually answered."),
    example: quote,
    tip: text(260, "A concrete technique to practise, e.g. 'Lead with your choice in one sentence, then give one reason and one trade-off.'"),
  }), { max: 3 }, "The most important communication habits to change, most important first. Empty only if there is genuinely nothing to work on."),
});

const instructions = `## Your task: communication feedback
The learner has finished a system design round with a live interviewer. A separate review covers whether the design is technically right; you judge only HOW they communicated: whether a real interviewer could follow them, and whether they came across as clear and decisive.

What to look for:
${describeSignals()}
- filler_words: frequent um/uh, "basically", "like" that get in the way (spoken answers only)
- pace: speaking much too fast (over about 180 words/min) or too slow (under about 100) to follow (spoken answers only)
- pauses: frequent long silences mid-answer (spoken answers only)

How to judge:
- Use the interviewer's private notes as evidence from the moment, but form your own overall view: one hedged answer is not a habit; the same pattern across answers is.
- Judge each answer against the question it answered. A long answer to a broad question is not over-explaining; "no" to a yes/no question is not giving up.
- Spoken answers were transcribed automatically: fillers are kept on purpose, but mis-heard technical terms are transcription errors, never the learner's fault. A few fillers are normal speech. Use the delivery numbers for pace, fillers and pauses rather than guessing from the text.
- The filler-reduced copy and previously identified communication gaps are supporting signals only. Use the verbatim answer for any exact quote, and never penalize a learner because a filler was removed from the copy.
- Typed answers have no delivery; judge only clarity, structure and length there.
- Be honest and specific, and kind. Each point to work on must name a habit you actually saw and give a technique that fixes it. Never comment on accent, grammar of a non-native speaker, or technical correctness.
- Examples quote the learner's own words exactly, under 15 words. Never quote the interviewer.

Reply with a single JSON object that matches the provided schema.`;

const system = `${policy}\n\n${instructions}`;

function buildUser({ prompt, answers, stats }) {
  const lines = answers.map((answer, index) => {
    const delivery = answer.spoken ? ` ${describeDelivery(answer.delivery, answer.durationMs)}` : "";
    const note = answer.note && (answer.note.signals?.length || answer.note.note)
      ? `\n  Interviewer's private note: ${[answer.note.signals?.join(", "), clean(answer.note.note, 240)].filter(Boolean).join(" — ")}`
      : "";
    const filtered = answer.filteredContent !== answer.content
      ? `\n  Filler-reduced answer: ${clean(answer.filteredContent, 2500)}`
      : "";
    const technicalContext = answer.technicalContext
      ? `\n  Extracted technical context (not a communication score): ${clean(answer.technicalContext, 900)}`
      : "";
    const gaps = answer.communicationGaps?.length
      ? `\n  Previously identified communication gaps: ${answer.communicationGaps.join(", ")}`
      : "";
    return `${index + 1}. Question: ${clean(answer.question, 600) || "(the learner spoke first)"}
  Learner (${answer.spoken ? "spoken" : "typed"})${delivery} — verbatim: ${clean(answer.content, 2500)}${filtered}${technicalContext}${gaps}${note}`;
  }).join("\n\n");
  return `<round>
Design problem: ${clean(prompt.title, 200)}
Answers: ${stats.answers} (${stats.spokenAnswers} spoken, ${stats.typedAnswers} typed)${stats.spokenAnswers ? `
Across spoken answers: ${stats.speakingSeconds}s speaking, ${stats.wordsPerMinute ?? "?"} words/min, ${stats.hesitationsPerMinute ?? "?"} um/uh per minute, ${stats.longPauses} pauses over 2s, ${stats.repeats} restarts` : ""}
</round>

<answers>
${lines}
</answers>

Give communication feedback on how this learner explained themselves.`;
}

function fake({ stats }) {
  return {
    rating: stats.signals.hedging ? "developing" : "solid",
    summary: "(Sample communication feedback) You explained your choices clearly once you got going, but often opened with hesitation before committing.",
    strengths: [{ point: "(Sample) You tied choices to a requirement.", example: "" }],
    workOn: [{ issue: "hedging", point: "(Sample) You often started with 'I'm not sure' before giving a good answer.", example: "", tip: "Lead with your choice in one sentence, then give the reason." }],
  };
}

export const communicationTask = { name: "communication", system, buildUser, output, fake };
