import crypto from "node:crypto";
import { queryOne } from "../../db.js";
import { interviewerV3Enabled } from "../../flags.js";
import { canvasNotes, diffSnapshots, snapshotOf } from "../ai/canvas.js";
import { filterFillerWords, parseAnswerContext } from "../ai/communication.js";
import { isAnonymousKind, isSignificantKind } from "../ai/components.js";
import { aiConfig } from "../ai/config.js";
import { clean, describeDiagram, nameComponents } from "../ai/context.js";
import { AiError } from "../ai/errors.js";
import { leadingFields, runTask, runTaskStream } from "../ai/run.js";
import { formatTurns, summaryOutput } from "../ai/tasks/interviewer.js";
import { getPack, publishedVersion, renderProblem } from "../pks/index.js";
import { limitsFor } from "../plans.js";
import { promptById } from "../rounds.js";
import { TOPICS } from "../../../src/learn/catalog.js";
import { candidateSnapshot, conventions as ucsConventions, defaultMode, renderUniversal, ucsVersion } from "../ucs/index.js";
import { applyTurn } from "./apply.js";
import { canvasSignals } from "./canvas.js";
import { assembleBlocks } from "./assemble.js";
import { CLOSED, FOCUS_AREAS, KIND_FOR_MOVE, bandAtLeast } from "./moves.js";
import { clockOf, focusItem, nextPendingItem, plan as makePlan, tickPlan } from "./plan.js";
import * as store from "./store.js";
import { conductorTask } from "./task.js";
import { WRAP_UP_TEXT, accrueActiveMs, decideTick } from "./ticks.js";
import { validateOutput, questionCount } from "./validate.js";

// The Interview Conductor (docs/design/interview-conductor.md): runs one live round.
// Each turn is PLAN (code) -> one model call -> VALIDATE (code) -> APPLY (code). The
// model picks a move and writes the words; code decides what is allowed and what the
// learner has demonstrated.

const GUIDED_OPENING_LINE = "This is a guided round: I'll tell you when an answer is good, point you to something to read if we move past a gap, and you can ask for a hint whenever you're stuck.";
const learnTitles = new Map(TOPICS.map((topic) => [topic.slug, topic.short ?? topic.title]));

// Whether a new round of this question should run on the Conductor.
export async function v3PackFor(promptId) {
  if (!interviewerV3Enabled) return null;
  return publishedVersion(promptId);
}

export function openingFor(pack, mode) {
  return mode === "guided" ? `${pack.opening}\n\n${GUIDED_OPENING_LINE}` : pack.opening;
}

// The opening (section 9): inside the caller's transaction, after interview_state exists.
// Pins the UCS version, pack version, route, mode and candidate snapshot; copies the
// agenda; says the pack's opening line; and opens the first requirements item silently.
export async function startRound(conn, { session, user, packVersion }) {
  const prompt = promptById.get(session.prompt_id);
  const record = await getPack(prompt.id, packVersion);
  const completed = await conn.queryOne("select count(*)::int as n from practice_sessions where user_id = $1 and status = 'completed'", [user.id]);
  const candidate = candidateSnapshot(user, { roundsCompleted: completed.n });
  const mode = session.interview_mode ?? defaultMode({ difficulty: prompt.difficulty, candidate });
  const agenda = record.pack.agenda;
  const first = nextPendingItem(agenda.map((item, position) => ({ itemId: item.id, position, stage: item.stage, weight: item.weight, required: item.required, status: "pending" })), "requirements");
  await store.createRound(conn, {
    session,
    pins: { mode, ucsVersion: ucsVersion(), packVersion, route: `${aiConfig.vendor}/${aiConfig.tasks.interviewer.model}`, candidate },
    agenda,
    openingText: openingFor(record.pack, mode),
    firstItemId: first?.itemId ?? null,
  });
}

// The mode can change only before the learner has said anything: it changes how the
// round is judged. The opening line is rewritten to match.
export async function changeMode(conn, { session, state, mode }) {
  await conn.query("update practice_sessions set interview_mode = $2 where id = $1", [session.id, mode]);
  if (state.engine !== "v3") return;
  const record = await getPack(session.prompt_id, state.pack_version);
  await conn.query("update interview_state set mode = $2, updated_at = now() where session_id = $1", [session.id, mode]);
  await conn.query("update interview_turns set content = $2 where session_id = $1 and seq = 1 and kind = 'opening'", [session.id, openingFor(record.pack, mode)]);
  await store.appendEvents(conn, session.id, [{ type: "mode_changed", payload: { mode } }]);
}

async function context({ session, user, stateRow }) {
  const round = store.toRound(stateRow);
  const prompt = promptById.get(session.prompt_id);
  const record = await getPack(prompt.id, round.packVersion);
  const conventions = await ucsConventions({ version: round.ucsVersion, mode: round.mode, hintsPerRound: limitsFor(user, session).hintsPerRound });
  round.activeMs = accrueActiveMs({ activeMs: round.activeMs, lastActivityAt: round.lastActivityAt, now: Date.now(), capMs: conventions.activityGapCapMs });
  const items = await store.itemsFor(session.id);
  const design = describeDiagram(session.diagram);
  const agenda = new Map(record.pack.agenda.map((item) => [item.id, item]));
  return { round, prompt, record, conventions, items, design, agenda };
}

const learnerText = (turn) => {
  const answer = parseAnswerContext(turn.answer_context);
  return answer?.filteredContent ?? (turn.kind === "audio" ? filterFillerWords(turn.content) : turn.content);
};

// Learner text a quote may come from: recent turns (typed, and spoken in both raw and
// filler-reduced form) plus every note on the canvas.
function quoteSources(turns, diagram) {
  const sources = [];
  for (const turn of turns) {
    if (turn.role !== "learner" || !["message", "audio"].includes(turn.kind) || !turn.content) continue;
    const spoken = turn.kind === "audio";
    sources.push({ turnSeq: turn.seq, kind: turn.kind, spoken, text: turn.content });
    const filtered = learnerText(turn);
    if (filtered && filtered !== turn.content) sources.push({ turnSeq: turn.seq, kind: turn.kind, spoken, text: filtered });
  }
  for (const note of canvasNotes(diagram)) sources.push({ turnSeq: null, kind: "note", spoken: false, text: note });
  return sources;
}

// A move the model may not make, twice, is replaced by a template (section 5.5).
function templatedFallback({ plan, pack, items }) {
  const agenda = new Map(pack.agenda.map((item) => [item.id, item]));
  const base = { assessments: [], clarificationIds: [], newAssumption: "", nodeIds: [], coveredNodeIds: [], problems: ["fallback"] };
  if (plan.allowedMoves.length === 1 && plan.allowedMoves[0] === "hint") {
    const focus = items.find((item) => item.itemId === plan.focusItemId);
    const hints = agenda.get(plan.focusItemId)?.hints ?? [];
    return { ...base, move: "hint", focusItemId: plan.focusItemId, message: hints[Math.min(focus?.hintLevel ?? 0, hints.length - 1)] ?? "Think about which part of your design carries the most load, and what happens when one machine isn't enough." };
  }
  if (plan.nextItemId) {
    const focusOpen = items.some((item) => item.itemId === plan.focusItemId && item.status === "open");
    return { ...base, move: focusOpen ? "move_on" : "open", focusItemId: plan.nextItemId, message: `Let's look at another part. ${agenda.get(plan.nextItemId)?.opener ?? ""}`.trim() };
  }
  return { ...base, move: "wrap_up", focusItemId: null, message: WRAP_UP_TEXT };
}

// One model call (with one retry if the move isn't allowed), validated. Streams the
// message only once the move has passed the gate.
async function converse({ ctx, session, user, turns, plan, trigger, learner, selected, changes, onDelta, onReset }) {
  const { round, record, items, conventions, design } = ctx;
  const sources = quoteSources(turns, session.diagram);
  const openers = Object.fromEntries(record.pack.agenda.map((item) => [item.id, item.opener]));
  let rejection = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const blocks = await assembleBlocks({ round, record, items, conventions, design, turns, plan, trigger, selected, changes, rejection });
    const input = { blocks, fake: { plan, learnerText: learner ? learnerText(learner) : "", trigger, openers } };
    const gate = (raw) => {
      const { move } = leadingFields(raw);
      return move && !plan.allowedMoves.includes(move) ? `move ${move}` : null;
    };
    let data;
    try {
      ({ data } = await (onDelta ? runTaskStream : runTask)(conductorTask, input, { userId: user.id, sessionId: session.id, onDelta, onReset, gate }));
    } catch (error) {
      if (error.code !== "GATE_REJECTED") throw error;
      rejection = `${error.detail?.move ?? "unknown"} isn't allowed; allowed moves: ${plan.allowedMoves.join(", ")}`;
      await store.logEvents(session.id, [{ type: "move_rejected", payload: { move: error.detail?.move ?? null, attempt, stage: "gate" } }]);
      continue;
    }
    const verified = validateOutput({ output: data, plan, items, pack: record.pack, sources, designIds: design.componentIds, mode: round.mode, conventions });
    if (verified.unearned) {
      // Praising a non-answer: this turn may not advance. Probe or redirect instead.
      plan = { ...plan, allowedMoves: plan.allowedMoves.filter((move) => move !== "acknowledge_advance") };
      rejection = `acknowledge_advance needs an answer you can quote for ${plan.focusItemId}, and the candidate hasn't given one; probe or redirect instead. Allowed moves: ${plan.allowedMoves.join(", ")}`;
      await store.logEvents(session.id, [{ type: "move_rejected", payload: { move: verified.move, attempt, stage: "unearned" } }]);
      continue;
    }
    if (!verified.moveAllowed) {
      rejection = `${verified.move} isn't allowed; allowed moves: ${plan.allowedMoves.join(", ")}`;
      await store.logEvents(session.id, [{ type: "move_rejected", payload: { move: verified.move, attempt, stage: "validate" } }]);
      continue;
    }
    if (!verified.message && verified.move !== "stay_silent") throw new AiError("INVALID_OUTPUT", "The interviewer returned an empty reply.");
    const flags = [
      verified.droppedAssessments ? { type: "assessment_dropped", payload: { count: verified.droppedAssessments } } : null,
      verified.multipleQuestions ? { type: "multiple_questions", payload: {} } : null,
      verified.leakSuspected ? { type: "leak_suspected", payload: { move: verified.move } } : null,
    ].filter(Boolean);
    return { verified, data, flags };
  }
  const verified = templatedFallback({ plan, pack: record.pack, items });
  return { verified, data: null, flags: [{ type: "fallback_used", payload: { reason: "move_rejected_twice", move: verified.move } }] };
}

function notesFor(data, learner, verified) {
  if (!data || !learner || !["message", "audio"].includes(learner.kind)) return null;
  return {
    communication: { signals: [...new Set(data.communication.signals)], note: data.communication.note },
    answerContext: {
      technicalContext: data.answerContext.technicalContext,
      communicationGaps: [...new Set(data.answerContext.communicationGaps)],
      filteredContent: learner.kind === "audio" ? filterFillerWords(learner.content) : learner.content,
    },
    assessment: verified.assessments,
  };
}

// What the canvas shows and where the candidate has taken the interview, for the planner.
function signalsFor({ session, record, round, turns }) {
  const learner = turns.filter((turn) => turn.role === "learner" && ["message", "audio"].includes(turn.kind) && turn.content);
  return canvasSignals({
    agenda: record.pack.agenda,
    diagram: session.diagram,
    learnerTexts: learner.map(learnerText),
    seed: session.id,
    learnerTurnsSinceAsk: learner.filter((turn) => turn.seq > (round.lastDrawAskSeq ?? 0)).length,
  });
}

// The shape of the conversation so far, so the interviewer doesn't only ask questions.
function conversationOf(turns) {
  const said = turns.filter((turn) => turn.role === "interviewer" && turn.move && !["nudge", "time_check"].includes(turn.move));
  let questionStreak = 0;
  for (const turn of [...said].reverse()) {
    if (questionCount(turn.content) === 0) break;
    questionStreak += 1;
  }
  return { lastMove: said.at(-1)?.move ?? null, questionStreak };
}

function addedKinds(snapshot, diagram) {
  return diffSnapshots(snapshot, snapshotOf(diagram), diagram).added.map((entry) => entry.kind);
}

// A learner message, voice answer or hint request. `reserved` comes from the route's
// reservation (turn inserted, credit taken, reply pending).
export async function handleLearnerTurn({ session, user, reserved, selectedNodeId, hint, onDelta, onReset }) {
  const ctx = await context({ session, user, stateRow: reserved.state });
  const { round, record, items, conventions, design, agenda, prompt } = ctx;
  const turns = await store.recentTurns(session.id, round.summarizedThrough);
  const trigger = hint ? "hint" : "reply";
  const plan = makePlan({
    items, state: round, conventions, agenda, curveballs: record.pack.curveballs, pacing: record.pack.pacing, minutes: prompt.minutes,
    turn: { kind: reserved.learner.kind, text: learnerText(reserved.learner) }, trigger, addedKinds: addedKinds(round.snapshot, session.diagram),
    canvas: signalsFor({ session, record, round, turns }),
    conversation: conversationOf(turns),
  });
  const selected = selectedNodeId && design.labels.has(selectedNodeId) ? { id: selectedNodeId, label: design.labels.get(selectedNodeId) } : null;
  const { verified, data, flags } = await converse({ ctx, session, user, turns, plan, trigger, learner: reserved.learner, selected, onDelta, onReset });
  const result = applyTurn({ items, state: round, plan, verified, turn: { learnerSeq: reserved.learner.seq, interviewerSeq: reserved.learner.seq + 1 } });
  result.events.push(...flags);
  return store.saveTurn({
    session,
    before: items,
    result,
    learnerTurn: hint ? null : reserved.learner,
    notes: hint ? null : notesFor(data, reserved.learner, verified),
    interviewer: { kind: KIND_FOR_MOVE[verified.move] ?? "question", trigger, content: nameComponents(verified.message, design.labels), move: verified.move, agendaItemId: verified.focusItemId, nodeIds: verified.nodeIds },
    stateExtras: {
      activeMs: round.activeMs,
      covered: [...new Set([...round.covered, ...verified.coveredNodeIds])],
      snapshot: snapshotOf(session.diagram),
      timeWarnings: round.timeWarnings,
    },
    creditId: reserved.creditId,
  });
}

// The major parts of the design the interviewer hasn't discussed yet, best first: a
// component that matters on its own (a store, cache, queue, gateway...) or a specific one
// the agenda asks about (a worker, scheduler...), with no "Why this choice?" note, that
// hasn't come up in the conversation and hasn't been asked about. Agenda matches come
// first; a significant component off the agenda still counts once it's connected to the
// design, and is asked about under the current focus item. Generic boxes (a plain
// service, a client) never trigger a question on their own.
function undiscussedParts({ diagram, covered, items, agenda, stage, focusItemId }) {
  const degree = new Map();
  for (const edge of diagram?.edges ?? []) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const fallback = items.find((item) => item.itemId === focusItemId && !CLOSED.has(item.status))?.itemId
    ?? items.find((item) => !CLOSED.has(item.status) && item.stage === stage)?.itemId
    ?? null;
  const parts = [];
  for (const entry of diffSnapshots(null, snapshotOf(diagram), diagram).added) {
    if (entry.hasNote || covered.has(entry.id) || isAnonymousKind(entry.kind)) continue;
    const onAgenda = canvasItemFor([entry], items, agenda, stage);
    if (onAgenda) parts.push({ ...onAgenda, onAgenda: true });
    else if (isSignificantKind(entry.kind) && (degree.get(entry.id) ?? 0) > 0 && fallback) parts.push({ itemId: fallback, entry, onAgenda: false });
  }
  return parts.sort((a, b) => Number(b.onAgenda) - Number(a.onAgenda));
}

// What the model is told about the part it should ask about.
function partToAskAbout(part) {
  return [
    `Not discussed yet: [${part.entry.id}] ${part.entry.kind} "${part.entry.label}", with no "Why this choice?" note${part.onAgenda ? "" : " (not on your agenda, so tie it to the current focus)"}.`,
    "Ask one short question about this component, the way an interviewer would when they notice it on the whiteboard: why they added it, what it does for this system's main use case, or what they'd use instead and what that trades off. Name the component.",
  ].join("\n");
}

// Maps a significant, unexplained new component to the agenda item it most likely
// belongs to, through the pack's trigger kinds.
function canvasItemFor(added, items, agenda, stage) {
  const stages = ["requirements", "high_level", "deep_dive", "wrap_up"];
  for (const entry of added) {
    const match = items
      .filter((item) => !CLOSED.has(item.status) && (agenda.get(item.itemId)?.triggers.componentKinds ?? []).includes(entry.kind))
      .sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || Math.abs(stages.indexOf(a.stage) - stages.indexOf(stage)) - Math.abs(stages.indexOf(b.stage) - stages.indexOf(stage)) || a.position - b.position)[0];
    if (match) return { itemId: match.itemId, entry };
  }
  return null;
}

const tickKeyOf = (design, ledgerVersion, reason) => crypto.createHash("sha256").update(`${design.text}\0${ledgerVersion}\0${reason}`).digest("hex").slice(0, 16);

// A background tick (section 6). Returns { action: "none", reason } or the turn it
// produced. `reserveCredit` and `releaseCredit` come from the route, which owns credits.
export async function handleTick({ session, user, stateRow, body, reserveCredit, releaseCredit }) {
  if (!(await store.claimTick(session.id))) return { action: "none", reason: "busy" };
  try {
    const ctx = await context({ session, user, stateRow });
    const { round, record, items, conventions, design, agenda, prompt } = ctx;
    const now = Date.now();
    const clock = clockOf({ state: round, pacing: record.pack.pacing, minutes: prompt.minutes });
    const current = snapshotOf(session.diagram);
    const diff = diffSnapshots(round.snapshot, current, session.diagram);
    const covered = new Set(round.covered);
    const parts = undiscussedParts({ diagram: session.diagram, covered, items, agenda, stage: round.stage, focusItemId: round.focusItemId });
    const mapped = parts[0] ?? null;
    const { last, lastLearnerAt } = await store.lastTurns(session.id);
    const focus = focusItem(items, round);
    const focusExhausted = Boolean(focus && (focus.followUps >= conventions.maxFollowUpsPerItem || bandAtLeast(focus.band, "adequate")));
    const limits = limitsFor(user, session);
    const decision = decideTick({
      typing: Boolean(body.typing),
      pending: Boolean(round.pendingSince && now - new Date(round.pendingSince).getTime() < 90_000),
      now, mode: round.mode, conventions, clock, timeWarnings: round.timeWarnings, stage: round.stage,
      lastTurn: last, lastLearnerAt, lastProactiveAt: round.lastProactiveAt, lastNudgeAt: round.lastNudgeAt,
      proactiveLeft: limits.proactiveChecksPerRound - round.proactiveChecks, focusExhausted,
      canvasThin: design.componentCount < conventions.minCanvasComponents || design.edgeCount < conventions.minCanvasConnections,
      canvas: { unexplained: Boolean(mapped), itemId: mapped?.itemId ?? null, major: diff.added.length + diff.removed.length >= 3 || diff.edgeChanges >= 3, changedSinceLearner: diff.added.length + diff.removed.length + diff.edgeChanges > 0 },
    });

    if (decision.action === "none") {
      // Minor or already-explained changes are absorbed so they never trigger a question.
      await store.touchState(session.id, { activeMs: round.activeMs, snapshot: parts.length ? undefined : current });
      return { action: "none", reason: decision.why };
    }

    if (decision.action === "template") {
      const verified = { move: decision.move, focusItemId: null, assessments: [], clarificationIds: [], newAssumption: "" };
      const plan = { focusItemId: focus?.itemId ?? null, nextItemId: null, allowedMoves: [decision.move] };
      const result = decision.move === "wrap_up"
        ? applyTurn({ items, state: round, plan, verified, turn: { learnerSeq: null, interviewerSeq: null } })
        : { items, state: { stage: round.stage, focusItemId: round.focusItemId, assumptions: round.assumptions, stageStartedMs: round.stageStartedMs, hintsUsed: round.hintsUsed, clarificationsAsked: round.clarificationsAsked, ledgerVersion: round.ledgerVersion, lastDrawAskSeq: round.lastDrawAskSeq, componentsAtDrawAsk: round.componentsAtDrawAsk }, events: [] };
      const warnings = decision.move === "time_check" ? [...new Set([...round.timeWarnings, ...decision.alsoRecord])] : decision.move === "wrap_up" ? [...new Set([...round.timeWarnings, 1])] : round.timeWarnings;
      result.events.push({ type: decision.move === "time_check" ? "time_warning" : decision.move === "nudge" ? "nudge" : "stage_changed", payload: { threshold: decision.threshold ?? null } });
      try {
        const saved = await store.saveTurn({
          session, before: items, result, learnerTurn: null, notes: null,
          interviewer: { kind: KIND_FOR_MOVE[decision.move], trigger: "tick", content: decision.text, move: decision.move, agendaItemId: null },
          stateExtras: { activeMs: round.activeMs, covered: round.covered, snapshot: round.snapshot, timeWarnings: warnings, nudged: decision.move === "nudge" },
          creditId: null,
          idleAt: round.ledgerVersion,
        });
        return { action: "say", ...saved };
      } catch (error) {
        if (error instanceof store.RoundBusy) return { action: "none", reason: "busy" };
        throw error;
      }
    }

    // Model-backed: an exact repeat of a tick already decided is answered from the key.
    const tickKey = tickKeyOf(design, round.ledgerVersion, decision.kind);
    if (stateRow.last_tick_key === tickKey) return { action: "none", reason: "cached" };
    const creditId = await reserveCredit();
    if (!creditId) return { action: "none", reason: "not_now" };
    try {
      const turns = await store.recentTurns(session.id, round.summarizedThrough);
      const base = makePlan({ items, state: round, conventions, agenda, curveballs: record.pack.curveballs, pacing: record.pack.pacing, minutes: prompt.minutes, trigger: "tick", turn: { kind: "tick", text: "" }, canvas: signalsFor({ session, record, round, turns }) });
      const plan = tickPlan({ base, kind: decision.kind, itemId: decision.itemId, items });
      const changes = decision.kind === "canvas" && mapped ? partToAskAbout(mapped) : "";
      const { verified, flags } = await converse({ ctx, session, user, turns, plan, trigger: `tick:${decision.kind}`, learner: null, changes });
      if (verified.move === "stay_silent" || !verified.message) {
        await releaseCredit(creditId);
        await store.touchState(session.id, { activeMs: round.activeMs, snapshot: current, tickKey });
        return { action: "none", reason: "skip" };
      }
      const result = applyTurn({ items, state: round, plan, verified, turn: { learnerSeq: null, interviewerSeq: null } });
      result.events.push({ type: "tick_model", payload: { kind: decision.kind } }, ...flags);
      const saved = await store.saveTurn({
        session, before: items, result, learnerTurn: null, notes: null,
        interviewer: { kind: KIND_FOR_MOVE[verified.move] ?? "question", trigger: "tick", content: nameComponents(verified.message, design.labels), move: verified.move, agendaItemId: verified.focusItemId, nodeIds: verified.nodeIds },
        // The part asked about counts as discussed, so it's never asked about twice.
        stateExtras: { activeMs: round.activeMs, covered: [...new Set([...round.covered, ...verified.coveredNodeIds, ...(decision.kind === "canvas" && mapped ? [mapped.entry.id] : [])])], snapshot: current, timeWarnings: round.timeWarnings, proactive: true, tickKey },
        creditId,
      });
      return { action: "ask", ...saved };
    } catch (error) {
      await releaseCredit(creditId);
      throw error;
    }
  } finally {
    await store.releaseTick(session.id);
  }
}

// What the learner may see about the round's state: never item ids or goals.
export function presentV3State(row, promptId) {
  const prompt = promptById.get(promptId);
  return {
    engine: "v3",
    stage: row.stage,
    hintsUsed: row.hints_used,
    mode: row.mode,
    focusArea: FOCUS_AREAS[row.stage],
    clock: { elapsedMs: Number(row.active_ms), budgetMs: (prompt?.minutes ?? 45) * 60_000 },
  };
}

// Summaries on v3 rounds: the notepad already holds coverage, so the summary keeps
// reasoning, commitments and tone (UCS tasks/summary.md).
export async function summarize({ round, previous, turns, userId, sessionId }) {
  const system = (await renderUniversal({ version: round.ucs_version, task: "interview_summary" })).map((block) => block.text).join("\n\n");
  const task = {
    name: "interview_summary",
    system,
    buildUser: ({ previous: before, turns: fold }) => `<previous_summary>\n${clean(before, 4000) || "(none)"}\n</previous_summary>\n\n<new_turns>\n${formatTurns(fold)}\n</new_turns>`,
    output: summaryOutput,
    fake: ({ previous: before, turns: fold }) => ({ summary: `${before ? `${before} ` : ""}(Sample summary of ${fold.length} turns.)`.slice(0, 3000) }),
  };
  return runTask(task, { previous, turns }, { userId, sessionId });
}

// The final review's view of the notepad (UCS tasks/review.md explains how to use it).
export async function reviewLedger(sessionId, promptId) {
  const state = await queryOne("select engine, ucs_version, pack_version, mode from interview_state where session_id = $1", [sessionId]);
  if (state?.engine !== "v3") return null;
  const items = await store.itemsFor(sessionId);
  const addendum = (await renderUniversal({ version: state.ucs_version, task: "review" })).map((block) => block.text).join("\n\n");
  const lines = items.map((item) => {
    const quotes = item.evidence.slice(0, 2).map((entry) => `"${clean(entry.quote, 120)}"`).join(" ");
    return `- ${item.itemId} · ${item.stage} · ${item.dimension} · weight ${item.weight} · ${item.status} · ${item.band ?? "no band"}${item.hintLevel ? ` · ${item.hintLevel} hint(s)` : ""}${item.challenges ? ` · challenged` : ""}${item.drawRequests ? ` · asked to draw ${item.drawRequests}x` : ""}${quotes ? ` · ${quotes}` : ""}`;
  });
  const record = await getPack(promptId, state.pack_version);
  const packReview = renderProblem(record, { task: "review" }).filter((entry) => entry.id === "pks.review").map((entry) => entry.text).join("\n\n");
  // The structured items back the deterministic score checks (ai/scoring.js).
  const scoring = items.map((item) => ({ dimension: item.dimension, weight: item.weight, status: item.status, band: item.band }));
  return { addendum, text: `<interview_ledger>\n${lines.join("\n")}\n</interview_ledger>`, packReview, packVersion: state.pack_version, mode: state.mode, items: scoring };
}

// After the round: per agenda item, what was covered and what a strong answer adds
// (never exemplar outlines), with Learn links.
export async function debrief(sessionId, promptId) {
  const state = await queryOne("select engine, pack_version from interview_state where session_id = $1", [sessionId]);
  if (state?.engine !== "v3") return null;
  const { pack } = await getPack(promptId, state.pack_version);
  const agenda = new Map(pack.agenda.map((item) => [item.id, item]));
  const items = await store.itemsFor(sessionId);
  return {
    items: items.map((item) => {
      const meta = agenda.get(item.itemId);
      return {
        id: item.itemId,
        area: FOCUS_AREAS[item.stage],
        topic: meta?.goal ?? "",
        required: item.required,
        status: item.status,
        band: item.band,
        quotes: item.evidence.slice(0, 2).map((entry) => entry.quote),
        strongAnswer: meta?.evidence.strong ?? "",
        learn: (meta?.learnTopics ?? []).map((slug) => ({ slug, title: learnTitles.get(slug) ?? slug })),
      };
    }),
  };
}
