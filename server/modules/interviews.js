import express from "express";
import { z } from "zod";
import { query, queryOne, transaction } from "../db.js";
import { HttpError, createLimiter, parse, route } from "../http.js";
import { aiConfig } from "./ai/config.js";
import { isSignificantKind } from "./ai/components.js";
import { clean, describeDiagram, nameComponents } from "./ai/context.js";
import { AiError, toHttpError } from "./ai/errors.js";
import { guideFor } from "./ai/guides.js";
import { runTask } from "./ai/run.js";
import { STAGES, interviewSummaryTask, interviewerTask } from "./ai/tasks/interviewer.js";
import { requireUser } from "./identity.js";
import { hasInterviewer, limitsFor } from "./plans.js";
import { ownedSession, promptById } from "./practice.js";

// A reply in progress blocks another for this long; longer than the slowest generation.
const PENDING_MS = 90_000;
// Minimum gap between unprompted questions, so the interviewer never nags.
const PROACTIVE_COOLDOWN_MS = 90_000;
// An unanswered question older than this no longer blocks a proactive question.
const OPEN_QUESTION_MS = 3 * 60_000;
const RECENT_TURNS = 24;
const SUMMARIZE_AFTER = 28;
const KEEP_VERBATIM = 12;
const QUESTION_KINDS = new Set(["opening", "question", "probe", "hint"]);
const MONTH_START = "(date_trunc('month', now() at time zone 'UTC') at time zone 'UTC')";

const messageLimiter = createLimiter({ windowMs: 60_000, max: 12 });
const messageBody = z.object({
  requestId: z.string().uuid(),
  intent: z.enum(["message", "hint"]).default("message"),
  content: z.string().max(2000).default(""),
  selectedNodeId: z.string().max(80).nullable().optional(),
}).strict();
const checkBody = z.object({ selectedNodeId: z.string().max(80).nullable().optional() }).strict();

const db = { query, queryOne };

function presentTurn(row) {
  return { id: row.id, seq: row.seq, role: row.role, kind: row.kind, trigger: row.trigger, content: row.content, nodeIds: row.node_ids ?? [], createdAt: row.created_at };
}

function presentState(state) {
  return { stage: state.stage, hintsUsed: state.hints_used };
}

// Position-free shape of the canvas, to tell what changed since the interviewer last looked.
function snapshotOf(diagram) {
  const components = {};
  for (const node of diagram?.nodes ?? []) {
    if (node.type === "systemNode" || !node.type) components[node.id] = node.data.kind;
  }
  return { components, edges: (diagram?.edges ?? []).map((edge) => `${edge.source}>${edge.target}`).sort() };
}

function diffSnapshots(previous, current, diagram) {
  const before = previous ?? { components: {}, edges: [] };
  const nodes = new Map((diagram?.nodes ?? []).map((node) => [node.id, node]));
  const added = Object.keys(current.components).filter((id) => !(id in before.components)).map((id) => {
    const node = nodes.get(id);
    return { id, kind: node.data.kind, label: clean(node.data.label, 120) || node.data.kind, hasNote: Boolean(node.data.note?.trim()) };
  });
  const removed = Object.keys(before.components).filter((id) => !(id in current.components));
  const beforeEdges = new Set(before.edges);
  const afterEdges = new Set(current.edges);
  const edgeChanges = current.edges.filter((edge) => !beforeEdges.has(edge)).length + before.edges.filter((edge) => !afterEdges.has(edge)).length;
  return { added, removed, edgeChanges };
}

function forwardStage(current, proposed) {
  return STAGES.indexOf(proposed) > STAGES.indexOf(current) ? proposed : current;
}

async function ensureState(conn, session) {
  await conn.query("insert into interview_state (session_id, snapshot) values ($1, $2::jsonb) on conflict (session_id) do nothing", [session.id, JSON.stringify(snapshotOf(session.diagram))]);
  return conn.queryOne("select * from interview_state where session_id = $1", [session.id]);
}

async function nextSeq(conn, sessionId) {
  const row = await conn.queryOne("select coalesce(max(seq), 0) + 1 as seq from interview_turns where session_id = $1", [sessionId]);
  return Number(row.seq);
}

async function readAllowance(conn, user, sessionId, state) {
  const limits = limitsFor(user);
  const row = await conn.queryOne(
    `select count(*) filter (where session_id = $2) as round_used,
            count(*) filter (where created_at >= ${MONTH_START}) as month_used
       from ai_credits where user_id = $1 and kind = 'interview_turn' and status <> 'released'`,
    [user.id, sessionId]
  );
  return {
    turns: { used: Number(row.round_used), limit: limits.interviewTurnsPerRound },
    month: { used: Number(row.month_used), limit: limits.interviewTurnsPerMonth },
    hints: { used: state?.hints_used ?? 0, limit: limits.hintsPerRound },
  };
}

async function recentTurns(sessionId, summarizedThrough) {
  const rows = await query("select * from interview_turns where session_id = $1 and seq > $2 order by seq desc limit $3", [sessionId, summarizedThrough, RECENT_TURNS]);
  return rows.reverse();
}

function openingMessage(prompt) {
  return `Let's work through "${prompt.title}" together. Before you draw much, start with the requirements: who uses this system, what are the core operations, and roughly what scale should we design for? Ask me anything about the brief along the way.`;
}

// Saves the interviewer's turn and the state it implies, and settles the credit.
async function saveInterviewerTurn({ session, state, output, trigger, design, creditId, hint }) {
  return transaction(async (conn) => {
    const seq = await nextSeq(conn, session.id);
    const nodeIds = output.nodeIds.filter((id) => design.componentIds.has(id));
    const turn = await conn.queryOne(
      `insert into interview_turns (session_id, user_id, seq, role, kind, trigger, content, node_ids, diagram_version)
       values ($1, $2, $3, 'interviewer', $4, $5, $6, $7::jsonb, $8) returning *`,
      [session.id, session.user_id, seq, output.intent, trigger, nameComponents(output.message, design.labels), JSON.stringify(nodeIds), session.diagram_version]
    );
    const covered = [...new Set([...state.covered, ...output.coveredNodeIds.filter((id) => design.componentIds.has(id))])];
    const saved = await conn.queryOne(
      `update interview_state set stage = $2, covered = $3::jsonb, snapshot = $4::jsonb, hints_used = hints_used + $5, pending_since = null, updated_at = now()
        where session_id = $1 returning *`,
      [session.id, forwardStage(state.stage, output.stage), JSON.stringify(covered), JSON.stringify(snapshotOf(session.diagram)), hint ? 1 : 0]
    );
    await conn.query("update ai_credits set status = 'consumed', updated_at = now() where id = $1", [creditId]);
    return { turn, state: saved };
  });
}

async function releaseCredit(conn, creditId) {
  await conn.query("update ai_credits set status = 'released', updated_at = now() where id = $1", [creditId]);
}

// Folds older turns into the running summary once a conversation gets long. Runs after
// the response is sent; a failure only means the next call sends a little more history.
async function maybeSummarize(session) {
  const state = await queryOne("select * from interview_state where session_id = $1", [session.id]);
  const pending = await query("select * from interview_turns where session_id = $1 and seq > $2 order by seq", [session.id, state.summarized_through]);
  if (pending.length <= SUMMARIZE_AFTER) return;
  const fold = pending.slice(0, pending.length - KEEP_VERBATIM);
  const { data } = await runTask(interviewSummaryTask, { previous: state.summary, turns: fold }, { userId: session.user_id, sessionId: session.id });
  await query(
    "update interview_state set summary = $2, summarized_through = $3, updated_at = now() where session_id = $1 and summarized_through = $4",
    [session.id, data.summary, fold.at(-1).seq, state.summarized_through]
  );
}

function taskInput({ session, state, turns, trigger, selectedNodeId, design, changes, candidates, user }) {
  const prompt = promptById.get(session.prompt_id);
  const limits = limitsFor(user);
  return {
    prompt,
    guide: guideFor(prompt.id),
    design,
    state: { stage: state.stage, covered: state.covered, summary: state.summary },
    turns,
    trigger,
    selected: selectedNodeId && design.labels.has(selectedNodeId) ? { id: selectedNodeId, label: design.labels.get(selectedNodeId) } : null,
    changes,
    candidates,
    hints: { used: state.hints_used, limit: limits.hintsPerRound },
  };
}

// Compact transcript of the round's conversation for the final review, so reasoning
// explained in chat counts as much as reasoning written in notes.
export async function interviewTranscript(sessionId) {
  const state = await queryOne("select summary, summarized_through from interview_state where session_id = $1", [sessionId]);
  if (!state) return "";
  const turns = await query("select role, kind, content from interview_turns where session_id = $1 and seq > $2 order by seq desc limit 40", [sessionId, state.summarized_through]);
  const lines = turns.reverse().map((turn) => `${turn.role === "learner" ? "Learner" : "Interviewer"}: ${clean(turn.content, 800)}`);
  return [state.summary ? `Earlier: ${clean(state.summary, 3000)}` : "", ...lines].filter(Boolean).join("\n").slice(0, 12_000);
}

export const interviewsRouter = express.Router();
interviewsRouter.use(requireUser);

interviewsRouter.get("/sessions/:sessionId/interview", route(async (req, res) => {
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user)) return res.json({ access: "locked", turns: [], aiAvailable: aiConfig.enabled });

  // The first visit to an active round opens the interview (a fixed message, no model call).
  if (session.status === "in_progress") {
    await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      await ensureState(conn, session);
      if (!(await conn.queryOne("select 1 from interview_turns where session_id = $1 limit 1", [session.id]))) {
        await conn.query(
          "insert into interview_turns (session_id, user_id, seq, role, kind, trigger, content) values ($1, $2, 1, 'interviewer', 'opening', 'opening', $3)",
          [session.id, req.user.id, openingMessage(promptById.get(session.prompt_id))]
        );
      }
    });
  }
  const state = await queryOne("select * from interview_state where session_id = $1", [session.id]);
  const turns = await query("select * from interview_turns where session_id = $1 order by seq limit 400", [session.id]);
  res.json({
    access: "full",
    aiAvailable: aiConfig.enabled,
    turns: turns.map(presentTurn),
    state: state ? presentState(state) : null,
    allowance: await readAllowance(db, req.user, session.id, state),
  });
}));

interviewsRouter.post("/sessions/:sessionId/interview/messages", route(async (req, res) => {
  const body = parse(messageBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user)) throw new HttpError(403, "PLAN_REQUIRED", "The live interviewer is part of the Plus plan.");

  // A retried request returns the turns the first attempt produced.
  const replay = await queryOne("select * from interview_turns where user_id = $1 and request_id = $2", [req.user.id, body.requestId]);
  if (replay) {
    if (replay.session_id !== session.id) throw new HttpError(409, "REQUEST_ID_REUSED", "This request id was already used for another round.");
    const reply = await queryOne("select * from interview_turns where session_id = $1 and seq = $2 and role = 'interviewer'", [session.id, replay.seq + 1]);
    return res.json({ turns: [replay, reply].filter(Boolean).map(presentTurn), replayed: true });
  }

  if (!aiConfig.enabled) throw toHttpError(new AiError("DISABLED"));
  if (session.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", "This round is finished, so the interview has ended. Your review is in the Review tab.");
  const hint = body.intent === "hint";
  const content = body.content.trim();
  if (!hint && !content) throw new HttpError(400, "INVALID_REQUEST", "Write a message first.");
  if (!messageLimiter(req.user.id)) throw new HttpError(429, "RATE_LIMITED", "You're sending messages very quickly. Wait a moment and try again.");

  let reserved;
  try {
    reserved = await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      const state = await ensureState(conn, session);
      if (state.pending_since && Date.now() - new Date(state.pending_since).getTime() < PENDING_MS) {
        throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
      }
      const allowance = await readAllowance(conn, req.user, session.id, state);
      if (allowance.turns.used >= allowance.turns.limit) throw new HttpError(403, "INTERVIEW_LIMIT_ROUND", `You've used all ${allowance.turns.limit} interviewer replies for this round. Finish the round to get your review.`);
      if (allowance.month.used >= allowance.month.limit) throw new HttpError(403, "INTERVIEW_LIMIT_MONTH", "You've used this month's interviewer replies. They reset at the start of next month.");
      if (hint && allowance.hints.used >= allowance.hints.limit) throw new HttpError(403, "HINT_LIMIT", `You've used all ${allowance.hints.limit} hints for this round.`);
      const learner = await conn.queryOne(
        `insert into interview_turns (session_id, user_id, seq, role, kind, content, request_id, diagram_version)
         values ($1, $2, $3, 'learner', $4, $5, $6, $7) returning *`,
        [session.id, req.user.id, await nextSeq(conn, session.id), hint ? "hint_request" : "message", content || "Could I have a hint?", body.requestId, session.diagram_version]
      );
      const credit = await conn.queryOne("insert into ai_credits (user_id, session_id, kind) values ($1, $2, 'interview_turn') returning id", [req.user.id, session.id]);
      await conn.query("update interview_state set pending_since = now() where session_id = $1", [session.id]);
      return { state, learner, creditId: credit.id };
    });
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
    throw error;
  }

  const design = describeDiagram(session.diagram);
  let result;
  try {
    const turns = await recentTurns(session.id, reserved.state.summarized_through);
    const { data } = await runTask(
      interviewerTask,
      taskInput({ session, state: reserved.state, turns, trigger: hint ? "hint" : "reply", selectedNodeId: body.selectedNodeId, design, user: req.user }),
      { userId: req.user.id, sessionId: session.id }
    );
    if (!data.message.trim()) throw new AiError("INVALID_OUTPUT", "The interviewer returned an empty reply.");
    result = await saveInterviewerTurn({ session, state: reserved.state, output: data, trigger: hint ? "hint" : "reply", design, creditId: reserved.creditId, hint });
  } catch (error) {
    // Undo the learner's turn so a retry with the same text starts cleanly; the client keeps the draft.
    await transaction(async (conn) => {
      await conn.query("delete from interview_turns where id = $1", [reserved.learner.id]);
      await releaseCredit(conn, reserved.creditId);
      await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
    });
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }

  res.status(201).json({
    turns: [presentTurn(reserved.learner), presentTurn(result.turn)],
    state: presentState(result.state),
    allowance: await readAllowance(db, req.user, session.id, result.state),
  });
  maybeSummarize(session).catch((error) => console.error("[ai] interview summary failed:", error.code || error.message));
}));

// Called by the workspace after the canvas has been quiet for a while. The server
// decides whether anything significant and unexplained changed; most calls end
// without a model call, and a model "skip" costs the learner nothing.
interviewsRouter.post("/sessions/:sessionId/interview/check", route(async (req, res) => {
  const body = parse(checkBody, req.body);
  const session = await ownedSession(req);
  const none = (reason) => res.json({ action: "none", reason });
  if (!hasInterviewer(req.user) || session.status !== "in_progress" || !aiConfig.enabled) return none("unavailable");

  const state = await transaction((conn) => ensureState(conn, session));
  const current = snapshotOf(session.diagram);
  const diff = diffSnapshots(state.snapshot, current, session.diagram);
  const covered = new Set(state.covered);
  const candidates = diff.added.filter((entry) => isSignificantKind(entry.kind) && !entry.hasNote && !covered.has(entry.id));
  const major = diff.added.length + diff.removed.length >= 3 || diff.edgeChanges >= 3;
  if (!candidates.length && !major) {
    // Minor or already-explained changes are absorbed, so they never trigger a question later.
    await query("update interview_state set snapshot = $2::jsonb, updated_at = now() where session_id = $1", [session.id, JSON.stringify(current)]);
    return none("nothing_to_ask");
  }

  const limits = limitsFor(req.user);
  let reserved;
  try {
    reserved = await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      const fresh = await conn.queryOne("select * from interview_state where session_id = $1", [session.id]);
      if (fresh.pending_since && Date.now() - new Date(fresh.pending_since).getTime() < PENDING_MS) return null;
      if (fresh.last_proactive_at && Date.now() - new Date(fresh.last_proactive_at).getTime() < PROACTIVE_COOLDOWN_MS) return null;
      if (fresh.proactive_checks >= limits.proactiveChecksPerRound) return null;
      const last = await conn.queryOne("select role, kind, created_at from interview_turns where session_id = $1 order by seq desc limit 1", [session.id]);
      if (last?.role === "interviewer" && QUESTION_KINDS.has(last.kind) && Date.now() - new Date(last.created_at).getTime() < OPEN_QUESTION_MS) return null;
      const allowance = await readAllowance(conn, req.user, session.id, fresh);
      if (allowance.turns.used >= allowance.turns.limit || allowance.month.used >= allowance.month.limit) return null;
      const credit = await conn.queryOne("insert into ai_credits (user_id, session_id, kind) values ($1, $2, 'interview_turn') returning id", [req.user.id, session.id]);
      await conn.query("update interview_state set pending_since = now(), proactive_checks = proactive_checks + 1, last_proactive_at = now() where session_id = $1", [session.id]);
      return { state: fresh, creditId: credit.id };
    });
  } catch (error) {
    if (error.code === "23505") return none("busy");
    throw error;
  }
  if (!reserved) return none("not_now");

  const design = describeDiagram(session.diagram);
  const changes = [
    ...diff.added.map((entry) => `Added: [${entry.id}] ${entry.kind} "${entry.label}"${entry.hasNote ? " (has a why note)" : " (no note)"}${covered.has(entry.id) ? " (already covered)" : ""}`),
    ...diff.removed.map((id) => `Removed: [${id}]`),
    ...(diff.edgeChanges ? [`Connections added or removed: ${diff.edgeChanges}`] : []),
  ].join("\n");
  try {
    const turns = await recentTurns(session.id, reserved.state.summarized_through);
    const { data } = await runTask(
      interviewerTask,
      taskInput({ session, state: reserved.state, turns, trigger: "proactive", selectedNodeId: body.selectedNodeId, design, changes, candidates, user: req.user }),
      { userId: req.user.id, sessionId: session.id }
    );
    if (data.action !== "ask" || !data.message.trim()) {
      const covered = [...new Set([...reserved.state.covered, ...data.coveredNodeIds.filter((id) => design.componentIds.has(id))])];
      await transaction(async (conn) => {
        await releaseCredit(conn, reserved.creditId);
        await conn.query("update interview_state set snapshot = $2::jsonb, covered = $3::jsonb, pending_since = null, updated_at = now() where session_id = $1", [session.id, JSON.stringify(current), JSON.stringify(covered)]);
      });
      return res.json({ action: "skip" });
    }
    const result = await saveInterviewerTurn({ session, state: reserved.state, output: { ...data, intent: data.intent === "answer" ? "question" : data.intent }, trigger: "proactive", design, creditId: reserved.creditId, hint: false });
    res.json({ action: "ask", turn: presentTurn(result.turn), state: presentState(result.state), allowance: await readAllowance(db, req.user, session.id, result.state) });
  } catch (error) {
    await transaction(async (conn) => {
      await releaseCredit(conn, reserved.creditId);
      await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
    });
    console.error("[ai] proactive check failed:", error.code || error.message);
    return none("error");
  }
}));
