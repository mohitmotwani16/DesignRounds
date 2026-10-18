import { CLOSED, STAGES } from "./moves.js";

// PLAN (docs/design/interview-conductor.md, section 5.1): pure code, no model. From the
// ledger, the state, the clock and the conventions it decides what the interviewer may
// do this turn. The model then picks one allowed move and writes the words.

const stageIndex = (stage) => STAGES.indexOf(stage);

export function clockOf({ state, pacing, minutes }) {
  const roundBudgetMs = Math.max(1, minutes) * 60_000;
  const stageBudgetMs = Math.round(roundBudgetMs * (pacing[state.stage] ?? 0.25));
  return {
    stage: state.stage,
    stageElapsedMs: Math.max(0, state.activeMs - state.stageStartedMs),
    stageBudgetMs,
    roundElapsedMs: state.activeMs,
    roundBudgetMs,
  };
}

// Required items first, then heavier ones, then pack order.
function byPriority(a, b) {
  return Number(b.required) - Number(a.required) || b.weight - a.weight || a.position - b.position;
}

// The next item to open: pending, in the current stage if any remain, otherwise the
// earliest later stage. Never an earlier stage.
export function nextPendingItem(items, stage, excludeId = null) {
  const pending = items.filter((item) => item.status === "pending" && item.itemId !== excludeId && stageIndex(item.stage) >= stageIndex(stage));
  if (!pending.length) return null;
  const earliest = Math.min(...pending.map((item) => stageIndex(item.stage)));
  return pending.filter((item) => stageIndex(item.stage) === earliest).sort(byPriority)[0];
}

export function focusItem(items, state) {
  const open = items.filter((item) => item.status === "open");
  return open.find((item) => item.itemId === state.focusItemId) ?? open.sort(byPriority)[0] ?? nextPendingItem(items, state.stage);
}

const words = (text) => new Set(String(text ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? []);

// Other open-or-pending items the learner's turn may have touched, from the pack's cheap
// triggers: keywords in their text, or component kinds just added to the canvas.
export function candidateItems({ items, agenda, focusId, text, addedKinds = [] }) {
  const said = words(text);
  const lower = String(text ?? "").toLowerCase();
  const kinds = new Set(addedKinds);
  const hits = items.filter((item) => item.itemId !== focusId && !CLOSED.has(item.status)).filter((item) => {
    const triggers = agenda.get(item.itemId)?.triggers ?? { keywords: [], componentKinds: [] };
    const keyword = triggers.keywords.some((phrase) => (phrase.includes(" ") ? lower.includes(phrase.toLowerCase()) : said.has(phrase.toLowerCase())));
    return keyword || triggers.componentKinds.some((kind) => kinds.has(kind));
  });
  return hits.sort(byPriority).slice(0, 3).map((item) => item.itemId);
}

function availableCurveball({ curveballs, items, focus }) {
  const status = new Map(items.map((item) => [item.itemId, item.status]));
  return curveballs.find((ball) => status.get(ball.agendaItemId) === "pending" && (ball.after === focus.itemId || CLOSED.has(status.get(ball.after)))) ?? null;
}

const DEFAULT_MOVES = ["probe", "challenge", "clarify", "explain", "acknowledge_advance", "move_on", "redirect"];

export function plan({ items, state, conventions, agenda, curveballs = [], pacing, minutes, turn = {}, trigger = "reply", addedKinds = [] }) {
  const clock = clockOf({ state, pacing, minutes });
  const focus = focusItem(items, state);
  const next = nextPendingItem(items, state.stage, focus?.itemId);
  const meta = focus ? agenda.get(focus.itemId) : null;
  const challengeCap = Math.max(1, meta?.misconceptions?.length ?? 0) * conventions.maxChallengesPerMisconception;
  const budget = {
    followUps: focus ? Math.max(0, conventions.maxFollowUpsPerItem - focus.followUps) : 0,
    challenges: focus ? Math.max(0, challengeCap - focus.challenges) : 0,
    hints: Math.max(0, conventions.hintsPerRound - state.hintsUsed),
  };

  const roundShare = clock.roundElapsedMs / clock.roundBudgetMs;
  const stageOver = clock.stageElapsedMs > clock.stageBudgetMs * conventions.stageOverrunFactor;
  const deepDiveBudget = clock.roundBudgetMs * (pacing.deep_dive ?? 0.4);
  const deepDiveLeftShare = state.stage === "deep_dive" ? Math.max(0, 1 - clock.stageElapsedMs / deepDiveBudget) : 0;
  let curveball = null;
  let allowed;

  if (trigger === "hint" || turn.kind === "hint_request") {
    allowed = ["hint"];
  } else if (roundShare >= conventions.wrapUpAt) {
    allowed = ["wrap_up", "clarify", "explain"];
  } else if (!focus) {
    allowed = ["wrap_up", "clarify", "explain", "redirect"];
  } else if (focus.status === "pending") {
    allowed = ["open", "clarify", "explain", "redirect"];
  } else if (stageOver) {
    allowed = ["acknowledge_advance", "move_on", "clarify", "explain"];
  } else {
    allowed = [...DEFAULT_MOVES];
    if (budget.followUps <= 0) allowed = allowed.filter((move) => move !== "probe");
    if (budget.challenges <= 0) allowed = allowed.filter((move) => move !== "challenge");
    if (state.stage === "deep_dive" && focus.band === "strong" && deepDiveLeftShare >= 0.25) {
      curveball = availableCurveball({ curveballs, items, focus });
      if (curveball) allowed.push("curveball");
    }
  }
  // Nothing left to open: the advancing moves become a wrap-up.
  if (!next && allowed.some((move) => move === "acknowledge_advance" || move === "move_on")) {
    allowed = allowed.filter((move) => move !== "acknowledge_advance" && move !== "move_on");
    if (!allowed.includes("wrap_up")) allowed.push("wrap_up");
  }
  if (state.stage === "wrap_up" && !allowed.includes("wrap_up") && trigger !== "hint") allowed.push("wrap_up");

  return {
    focusItemId: focus?.itemId ?? null,
    nextItemId: next?.itemId ?? null,
    budget,
    clock,
    allowedMoves: allowed,
    candidates: candidateItems({ items, agenda, focusId: focus?.itemId, text: turn.text, addedKinds }),
    pinnedAssumptions: state.assumptions.map((entry) => entry.clarificationId).filter((id) => id && id !== "custom"),
    curveball,
  };
}

// A plan for a model-backed tick: either a question about something new on the canvas
// (mapped to an agenda item by its component kinds), or moving on when a stage overran.
export function tickPlan({ base, kind, itemId = null, items }) {
  if (kind === "stage") {
    return { ...base, allowedMoves: base.nextItemId ? ["move_on"] : ["wrap_up"] };
  }
  const item = items.find((entry) => entry.itemId === itemId);
  const move = !item || item.status === "pending" ? "open" : "probe";
  return { ...base, focusItemId: itemId ?? base.focusItemId, nextItemId: move === "open" ? itemId : base.nextItemId, allowedMoves: [move, "stay_silent"] };
}
