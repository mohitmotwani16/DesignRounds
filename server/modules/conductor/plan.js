import { seededJitter } from "./canvas.js";
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

// Deep-dive items are chosen by where the candidate has taken the interview: what they
// drew (a drawn part can start at once), what they keep talking about, then what the
// question needs, with a seeded random tie-break so rounds of the same question differ.
export function deepDiveScore(item, canvas) {
  if (!canvas) return 0;
  // What the candidate said and drew dominates; "required" only nudges, so a typical
  // canvas still gets a different deep dive in different rounds (the random term is
  // larger than the gap between two ordinary drawn items).
  return (canvas.drawn.has(item.itemId) ? 3 : 0)
    + 2 * Math.min(canvas.emphasis.get(item.itemId) ?? 0, 3)
    + (item.required ? 0.5 : 0)
    + 0.25 * item.weight
    + 3 * seededJitter(canvas.seed, item.itemId);
}

// The next item to open: pending, in the current stage if any remain, otherwise the
// earliest later stage. Never an earlier stage.
export function nextPendingItem(items, stage, excludeId = null, canvas = null) {
  const pending = items.filter((item) => item.status === "pending" && item.itemId !== excludeId && stageIndex(item.stage) >= stageIndex(stage));
  if (!pending.length) return null;
  const earliest = Math.min(...pending.map((item) => stageIndex(item.stage)));
  const choices = pending.filter((item) => stageIndex(item.stage) === earliest);
  if (canvas && STAGES[earliest] === "deep_dive") return choices.sort((a, b) => deepDiveScore(b, canvas) - deepDiveScore(a, canvas) || a.position - b.position)[0];
  return choices.sort(byPriority)[0];
}

export function focusItem(items, state, canvas = null) {
  const open = items.filter((item) => item.status === "open");
  return open.find((item) => item.itemId === state.focusItemId) ?? open.sort(byPriority)[0]
    ?? items.find((item) => item.itemId === state.focusItemId && item.status === "pending")
    ?? nextPendingItem(items, state.stage, null, canvas);
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

function availableCurveball({ curveballs, items, focus, canvas }) {
  const status = new Map(items.map((item) => [item.itemId, item.status]));
  const ready = curveballs.filter((ball) => status.get(ball.agendaItemId) === "pending" && (ball.after === focus.itemId || CLOSED.has(status.get(ball.after))));
  // Which twist a strong candidate gets varies by round too.
  return (canvas ? ready.sort((a, b) => seededJitter(canvas.seed, b.id) - seededJitter(canvas.seed, a.id)) : ready)[0] ?? null;
}

const DEFAULT_MOVES = ["probe", "listen", "challenge", "clarify", "explain", "acknowledge_advance", "move_on", "redirect"];

// Whether an item may not start yet because its part isn't on the canvas. After a few
// ignored requests the interviewer stops insisting, so a round can't stall forever.
function awaitingDrawing(item, canvas, conventions) {
  return Boolean(item && canvas && item.stage === "deep_dive" && canvas.needs.has(item.itemId) && !canvas.drawn.has(item.itemId)
    && item.drawRequests < conventions.maxDrawRequestsPerItem);
}

// `conversation` is { lastMove, questionStreak }: the interviewer's last move and how
// many of its latest messages in a row asked something.
export function plan({ items, state, conventions, agenda, curveballs = [], pacing, minutes, turn = {}, trigger = "reply", addedKinds = [], canvas = null, conversation = null }) {
  const clock = clockOf({ state, pacing, minutes });
  const focus = focusItem(items, state, canvas);
  const next = nextPendingItem(items, state.stage, focus?.itemId, canvas);
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
  let drawTarget = null;
  let allowed;

  if (trigger === "hint" || turn.kind === "hint_request") {
    allowed = ["hint"];
  } else if (roundShare >= conventions.wrapUpAt) {
    allowed = ["wrap_up", "clarify", "explain"];
  } else if (!focus) {
    allowed = ["wrap_up", "clarify", "explain", "redirect"];
  } else if (focus.status === "pending") {
    // A deep dive starts only on a part that's on the canvas: ask for it first.
    if (awaitingDrawing(focus, canvas, conventions)) {
      drawTarget = focus.itemId;
      allowed = ["ask_to_draw", "clarify", "explain", "redirect"];
    } else {
      allowed = ["open", "clarify", "explain", "redirect"];
    }
  } else if (stageOver) {
    allowed = ["acknowledge_advance", "move_on", "clarify", "explain"];
  } else {
    allowed = [...DEFAULT_MOVES];
    if (budget.followUps <= 0) allowed = allowed.filter((move) => move !== "probe");
    if (budget.challenges <= 0) allowed = allowed.filter((move) => move !== "challenge");
    if (state.stage === "deep_dive" && focus.band === "strong" && deepDiveLeftShare >= 0.25) {
      curveball = availableCurveball({ curveballs, items, focus, canvas });
      if (curveball && !awaitingDrawing(items.find((item) => item.itemId === curveball.agendaItemId), canvas, conventions)) allowed.push("curveball");
      else curveball = null;
    }
    // The candidate is explaining a part that isn't drawn yet: they may be asked to draw it.
    if (canvas && canvas.needs.has(focus.itemId) && !canvas.drawn.has(focus.itemId) && focus.drawRequests < conventions.maxDrawRequestsPerItem) allowed.push("ask_to_draw");
  }
  // Moving on into a deep dive whose part isn't drawn: acknowledge and ask for the drawing
  // instead of opening it.
  if (awaitingDrawing(next, canvas, conventions) && focus?.status === "open" && allowed.some((move) => move === "acknowledge_advance" || move === "move_on")) {
    drawTarget = next.itemId;
    allowed = [...allowed.filter((move) => move !== "acknowledge_advance" && move !== "move_on" && move !== "ask_to_draw"), "ask_to_draw"];
  }
  // Nothing left to open: the advancing moves become a wrap-up.
  if (!next && allowed.some((move) => move === "acknowledge_advance" || move === "move_on")) {
    allowed = allowed.filter((move) => move !== "acknowledge_advance" && move !== "move_on");
    if (!allowed.includes("wrap_up")) allowed.push("wrap_up");
  }
  if (state.stage === "wrap_up" && !allowed.includes("wrap_up") && trigger !== "hint") allowed.push("wrap_up");
  // Letting them keep going is one beat, not a habit: never twice in a row.
  if (conversation?.lastMove === "listen") allowed = allowed.filter((move) => move !== "listen");

  if (canvas && trigger !== "hint" && !allowed.includes("hint")) {
    const thin = canvas.components < conventions.minCanvasComponents || canvas.connections < conventions.minCanvasConnections;
    // No wrap-up on a canvas too thin to review: ask them to draw their design instead.
    if (thin && allowed.includes("wrap_up")) allowed = [...allowed.filter((move) => move !== "wrap_up" && move !== "ask_to_draw"), "ask_to_draw"];
    // Talking without drawing: past the requirements, a canvas that hasn't caught up gets
    // a request to draw every few turns, waiting twice as long if they've added something
    // since the last request.
    const progressed = state.componentsAtDrawAsk !== null && state.componentsAtDrawAsk !== undefined && canvas.components > state.componentsAtDrawAsk;
    const gap = conventions.drawCooldownTurns * (progressed ? 2 : 1);
    if (thin && state.stage !== "requirements" && canvas.learnerTurnsSinceAsk >= gap) {
      allowed = ["ask_to_draw", "clarify", "explain"];
      drawTarget = null;
    }
  }

  return {
    focusItemId: focus?.itemId ?? null,
    nextItemId: next?.itemId ?? null,
    budget,
    clock,
    allowedMoves: allowed,
    candidates: candidateItems({ items, agenda, focusId: focus?.itemId, text: turn.text, addedKinds }),
    pinnedAssumptions: state.assumptions.map((entry) => entry.clarificationId).filter((id) => id && id !== "custom"),
    curveball,
    drawTarget,
    questionStreak: conversation?.questionStreak ?? 0,
    canvas: canvas ? { components: canvas.components, connections: canvas.connections, drawn: [...canvas.drawn], undrawn: [...canvas.needs].filter((id) => !canvas.drawn.has(id)) } : null,
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
