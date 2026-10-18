import { BAND_RANK, OPENING_MOVES } from "./moves.js";

// VALIDATE (section 5.3): pure code. The model proposes; nothing it says changes the
// ledger until it passes these checks. Quote verification is the main protection
// against crediting things the learner never said.

export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (text) => normalize(text).split(" ").filter(Boolean);

// Finds the learner text a quote came from. Typed text and canvas notes need a
// normalised substring match. Spoken answers are auto-transcribed, so at least 80% of
// the quote's words must appear in the filler-reduced transcript, in order.
export function matchQuote(quote, sources) {
  const wanted = normalize(quote);
  if (wanted.length < 3) return null;
  for (const source of sources) {
    const text = normalize(source.text);
    if (text.includes(wanted)) return source;
  }
  const quoteTokens = tokens(quote);
  if (quoteTokens.length < 3) return null;
  for (const source of sources.filter((entry) => entry.spoken)) {
    const sourceTokens = tokens(source.text);
    let found = 0;
    let at = 0;
    for (const token of quoteTokens) {
      const index = sourceTokens.indexOf(token, at);
      if (index >= 0) {
        found += 1;
        at = index + 1;
      }
    }
    if (found / quoteTokens.length >= 0.8) return source;
  }
  return null;
}

// Questions the interviewer asks, not ones it quotes back.
export function questionCount(message) {
  const unquoted = String(message ?? "").replace(/"[^"]*"/g, "").replace(/“[^”]*”/g, "");
  return (unquoted.match(/\?/g) ?? []).length;
}

const sentences = (value) => String(value ?? "").split(/(?<=[.!?])\s+/).map(normalize).filter((part) => part.length >= 40);

function leakSuspected(message, pack) {
  const said = normalize(message);
  const secret = [...pack.exemplars.flatMap((exemplar) => sentences(exemplar.outline)), ...pack.agenda.map((item) => normalize(item.moveOnSummary)).filter((text) => text.length >= 40)];
  return secret.some((text) => said.includes(text));
}

function isPendingItem(items, itemId) {
  return items.some((item) => item.itemId === itemId && item.status === "pending");
}

// Returns the verified output plus what was dropped, for logging and events.
export function validateOutput({ output, plan, items, pack, sources, designIds, mode, conventions }) {
  const problems = [];
  const move = output.move;
  const moveAllowed = plan.allowedMoves.includes(move);
  if (!moveAllowed) problems.push(`move ${move} not allowed`);

  // Which item the message is about. Opening moves must name a pending item; otherwise
  // the plan's choice stands, whatever the model wrote.
  let focusItemId = plan.focusItemId;
  if (move === "curveball") focusItemId = plan.curveball?.agendaItemId ?? plan.focusItemId;
  else if (move === "open") focusItemId = isPendingItem(items, output.focusItemId) && output.focusItemId === plan.focusItemId ? output.focusItemId : plan.focusItemId;
  else if (OPENING_MOVES.has(move)) focusItemId = isPendingItem(items, output.focusItemId) ? output.focusItemId : plan.nextItemId;
  if (output.focusItemId && output.focusItemId !== focusItemId) problems.push(`focus ${output.focusItemId} replaced by ${focusItemId}`);

  const itemIds = new Set(items.map((item) => item.itemId));
  const agenda = new Map(pack.agenda.map((item) => [item.id, item]));
  const assessments = [];
  let dropped = 0;
  for (const entry of output.assessment ?? []) {
    if (!itemIds.has(entry.itemId) || !(entry.band in BAND_RANK)) { dropped += 1; continue; }
    const source = matchQuote(entry.quote, sources);
    if (!source) { dropped += 1; continue; }
    const misconception = agenda.get(entry.itemId)?.misconceptions.some((known) => known.id === entry.misconceptionId) ? entry.misconceptionId : null;
    assessments.push({ itemId: entry.itemId, band: entry.band, quote: String(entry.quote).slice(0, 300), missing: String(entry.missing ?? "").slice(0, 300), misconceptionId: misconception, turnSeq: source.turnSeq ?? null, source: source.kind });
    if (assessments.length >= conventions.maxAssessmentsPerTurn) break;
  }
  if (dropped) problems.push(`${dropped} assessment(s) dropped (unknown item or unverified quote)`);

  // "Answered, let's move on" needs evidence: the focus item must already have an
  // adequate band or get one, with a verified quote, in this turn. Otherwise the model
  // is praising a non-answer, and the move is rejected (it should probe or redirect).
  let unearned = false;
  if (move === "acknowledge_advance" && plan.focusItemId) {
    const focus = items.find((item) => item.itemId === plan.focusItemId);
    const earned = (focus && ["adequate", "strong"].includes(focus.band))
      || assessments.some((entry) => entry.itemId === plan.focusItemId && ["adequate", "strong"].includes(entry.band));
    if (!earned) {
      unearned = true;
      problems.push(`acknowledge_advance without an adequate, quoted answer for ${plan.focusItemId}`);
    }
  }

  const clarificationIds = [...new Set(output.clarificationIds ?? [])].filter((id) => pack.clarifications.some((fact) => fact.id === id));
  const questions = questionCount(output.message);
  return {
    move,
    moveAllowed: moveAllowed && !unearned,
    unearned,
    focusItemId,
    message: String(output.message ?? "").trim(),
    classification: output.classification,
    assessments,
    droppedAssessments: dropped,
    clarificationIds,
    newAssumption: String(output.newAssumption ?? "").trim().slice(0, 200),
    nodeIds: (output.nodeIds ?? []).filter((id) => designIds.has(id)),
    coveredNodeIds: (output.coveredNodeIds ?? []).filter((id) => designIds.has(id)),
    multipleQuestions: questions > 1,
    leakSuspected: mode === "realistic" && leakSuspected(output.message, pack),
    problems,
  };
}
