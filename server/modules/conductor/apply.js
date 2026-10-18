import { CLOSED, OPENING_MOVES, STAGES, bandAtLeast, betterBand } from "./moves.js";

// APPLY (section 5.4): pure and deterministic. Turns a verified output into the new
// ledger, the state changes and the events to log. The model proposes; code decides
// status. An item can't be marked answered without a verified quote, and it can't stay
// open past its budget.

const stageIndex = (stage) => STAGES.indexOf(stage);
const MAX_EVIDENCE = 6;

function closeAs(item, band, move) {
  if (move === "acknowledge_advance" || move === "move_on" || move === "wrap_up") {
    if (bandAtLeast(band, "adequate")) return "answered";
    if (band === "weak") return "partial";
    return move === "wrap_up" ? "not_reached" : "missed";
  }
  return item.status;
}

// `turn` is { learnerSeq, interviewerSeq }. `verified` comes from validateOutput, or a
// template move ({ move, focusItemId, assessments: [] }).
export function applyTurn({ items, state, plan, verified, turn }) {
  const events = [];
  const byId = new Map(items.map((item) => [item.itemId, { ...item, misconceptions: [...item.misconceptions], evidence: [...item.evidence] }]));
  const setStatus = (item, status, seq) => {
    if (item.status === status) return;
    events.push({ type: "item_status_changed", payload: { itemId: item.itemId, from: item.status, to: status, band: item.band } });
    item.status = status;
    if (status === "open") item.openedSeq ??= seq;
    if (CLOSED.has(status)) item.closedSeq = seq;
  };
  const { move } = verified;
  events.push({ type: "move_planned", payload: { move, focusItemId: verified.focusItemId, allowed: plan.allowedMoves } });

  // 1. Evidence: keep the best band shown, and every verified quote (bounded).
  for (const assessment of verified.assessments) {
    const item = byId.get(assessment.itemId);
    if (!item) continue;
    item.band = betterBand(item.band, assessment.band);
    if (item.evidence.length < MAX_EVIDENCE) item.evidence.push({ turnSeq: assessment.turnSeq, quote: assessment.quote, missing: assessment.missing, band: assessment.band, source: assessment.source });
    if (assessment.misconceptionId) {
      if (!item.misconceptions.some((entry) => entry.id === assessment.misconceptionId)) item.misconceptions.push({ id: assessment.misconceptionId, resolved: false });
    } else if (bandAtLeast(assessment.band, "adequate")) {
      item.misconceptions = item.misconceptions.map((entry) => ({ ...entry, resolved: true }));
    }
    // Covered out of order, and well enough: credit it now so it's never re-asked.
    if (item.itemId !== plan.focusItemId && item.status === "pending" && bandAtLeast(item.band, "adequate")) {
      item.openedSeq = turn.learnerSeq;
      setStatus(item, "answered", turn.learnerSeq);
    }
  }

  // 2. The focus item: budgets and closing.
  const focus = plan.focusItemId ? byId.get(plan.focusItemId) : null;
  if (focus) {
    if (move === "probe") focus.followUps += 1;
    if (move === "challenge") focus.challenges += 1;
    if (move === "hint") focus.hintLevel += 1;
    if ((move === "acknowledge_advance" || move === "move_on") && focus.status === "open") setStatus(focus, closeAs(focus, focus.band, move), turn.interviewerSeq);
  }

  // 3. Opening the next item, in the same message.
  let focusItemId = state.focusItemId;
  if (OPENING_MOVES.has(move) && verified.focusItemId) {
    const opened = byId.get(verified.focusItemId);
    if (opened && opened.status === "pending") setStatus(opened, "open", turn.interviewerSeq);
    focusItemId = verified.focusItemId;
  } else if (focus && focus.status === "open") {
    focusItemId = focus.itemId;
  }

  // 4. Wrap-up closes everything still on the notepad.
  if (move === "wrap_up") {
    for (const item of byId.values()) {
      if (item.status === "pending") setStatus(item, "not_reached", turn.interviewerSeq);
      else if (item.status === "open") setStatus(item, closeAs(item, item.band, "wrap_up"), turn.interviewerSeq);
    }
    focusItemId = null;
  }

  // 5. Facts told to the learner are pinned for the rest of the round.
  const assumptions = [...state.assumptions];
  for (const id of verified.clarificationIds ?? []) {
    if (!assumptions.some((entry) => entry.clarificationId === id)) {
      assumptions.push({ clarificationId: id, turnSeq: turn.interviewerSeq });
      events.push({ type: "assumption_pinned", payload: { clarificationId: id } });
    }
  }
  if (verified.newAssumption && !assumptions.some((entry) => entry.text === verified.newAssumption)) {
    assumptions.push({ clarificationId: "custom", text: verified.newAssumption, turnSeq: turn.interviewerSeq });
    events.push({ type: "assumption_pinned", payload: { clarificationId: "custom" } });
  }

  // 6. Stage: forward only. It follows the item now in focus, and wrap-up ends it.
  let stage = state.stage;
  const newFocus = focusItemId ? byId.get(focusItemId) : null;
  if (move === "wrap_up") stage = "wrap_up";
  else if (newFocus && stageIndex(newFocus.stage) > stageIndex(stage)) stage = newFocus.stage;
  const stageChanged = stage !== state.stage;
  if (stageChanged) events.push({ type: "stage_changed", payload: { from: state.stage, to: stage } });

  return {
    items: [...byId.values()].sort((a, b) => a.position - b.position),
    state: {
      stage,
      focusItemId,
      assumptions,
      stageStartedMs: stageChanged ? state.activeMs : state.stageStartedMs,
      hintsUsed: state.hintsUsed + (move === "hint" ? 1 : 0),
      clarificationsAsked: [...new Set([...state.clarificationsAsked, ...(verified.clarificationIds ?? [])])],
      ledgerVersion: state.ledgerVersion + 1,
    },
    events,
  };
}
