// How a learner communicates, judged separately from whether the design is right.
// The interviewer notes these per answer; the final review summarises them.
export const SIGNALS = {
  clear: "the main idea is easy to follow",
  structured: "gives the answer or an overview first, then the detail",
  concise: "says what the question needs and stops",
  confident: "commits to a choice and states assumptions, even when unsure of details",
  hedging: "unsure language ('maybe', 'I guess', 'I'm not sure') without then committing to an answer",
  gave_up: "'no' or 'I don't know' without attempting an answer or reasoning out loud",
  over_explaining: "much longer than the question needed: repeats itself, wanders into tangents, or re-explains basics",
  under_explaining: "too brief to show the reasoning: a choice with no why, or a one-word answer to an open question",
  unclear: "ideas are muddled, contradictory, or hard to follow",
  rambling: "talking without making a point; when spoken, fillers, restarts or long pauses that carry no content",
  off_topic: "doesn't answer what was asked",
};

export const SIGNAL_IDS = Object.keys(SIGNALS);
export const GAP_SIGNALS = ["hedging", "gave_up", "over_explaining", "under_explaining", "unclear", "rambling", "off_topic"];

export const describeSignals = () => SIGNAL_IDS.map((id) => `- ${id}: ${SIGNALS[id]}`).join("\n");

// One line of delivery numbers for a spoken answer, as the models see it.
export function describeDelivery(delivery, durationMs) {
  if (!delivery) return "";
  const parts = [
    durationMs ? `${Math.round(durationMs / 1000)}s` : null,
    delivery.wordsPerMinute ? `${delivery.wordsPerMinute} words/min` : null,
    `${delivery.hesitations} um/uh`,
    delivery.fillerPhrases ? `${delivery.fillerPhrases} filler phrases` : null,
    `${delivery.longPauses} pauses over 2s`,
    delivery.repeats ? `${delivery.repeats} restarts` : null,
  ].filter(Boolean);
  return `[delivery: ${parts.join(", ")}]`;
}
