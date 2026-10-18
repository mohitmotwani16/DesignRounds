// The Conductor's vocabulary (docs/design/interview-conductor.md, section 4).

export const STAGES = ["requirements", "high_level", "deep_dive", "wrap_up"];

// Moves the model may pick. `stay_silent` exists only for ticks: after a look at the
// canvas the model may decide nothing needs asking. `listen` asks nothing: the
// interviewer reacts (says back what they understood, appreciates something that's good)
// and lets the candidate keep going, as people do in a real interview.
export const MODEL_MOVES = ["open", "probe", "challenge", "clarify", "explain", "hint", "acknowledge_advance", "move_on", "redirect", "curveball", "wrap_up", "ask_to_draw", "listen", "stay_silent"];
// Moves the application writes from templates, never the model.
export const TEMPLATE_MOVES = ["nudge", "time_check"];

export const CLASSIFICATIONS = ["answer", "partial_answer", "dont_know", "clarifying_question", "concept_question", "asks_for_answer", "pushback", "off_topic", "meta", "thinking_aloud", "none"];

export const BAND_RANK = { weak: 1, adequate: 2, strong: 3 };
export const CLOSED = new Set(["answered", "partial", "missed", "skipped", "not_reached"]);

// Moves that open an item in the same message.
export const OPENING_MOVES = new Set(["open", "acknowledge_advance", "move_on", "curveball"]);

// The interview_turns.kind an interviewer move is stored as.
export const KIND_FOR_MOVE = {
  open: "question",
  probe: "probe",
  challenge: "challenge",
  clarify: "clarification",
  explain: "answer",
  hint: "hint",
  acknowledge_advance: "question",
  move_on: "question",
  redirect: "redirect",
  curveball: "question",
  wrap_up: "wrap_up",
  ask_to_draw: "question",
  listen: "acknowledgement",
  nudge: "nudge",
  time_check: "time_check",
};

// What the learner sees as the current focus: a safe area label, never an item id or goal.
export const FOCUS_AREAS = { requirements: "Requirements", high_level: "High-level design", deep_dive: "Deep dive", wrap_up: "Wrap-up" };

export const bandAtLeast = (band, floor) => (BAND_RANK[band] ?? 0) >= BAND_RANK[floor];
export const betterBand = (a, b) => ((BAND_RANK[b] ?? 0) > (BAND_RANK[a] ?? 0) ? b : a ?? b ?? null);
