import express from "express";
import { z } from "zod";
import { query, queryOne, transaction } from "../db.js";
import { voiceAnswersEnabled } from "../flags.js";
import { HttpError, afterResponse, createLimiter, parse, route } from "../http.js";
import { aiConfig } from "./ai/config.js";
import { isSignificantKind } from "./ai/components.js";
import { clean, describeDiagram, nameComponents } from "./ai/context.js";
import { AiError, toHttpError } from "./ai/errors.js";
import { guideFor } from "./ai/guides.js";
import { runTask } from "./ai/run.js";
import { SpeechError, speechConfig, transcribe } from "./ai/speech.js";
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

const messageLimiter = createLimiter({ name: "interview-message", windowMs: 60_000, max: 12 });
const messageBody = z.object({
  requestId: z.string().uuid(),
  intent: z.enum(["message", "hint"]).default("message"),
  content: z.string().max(2000).default(""),
  selectedNodeId: z.string().max(80).nullable().optional(),
}).strict();
const checkBody = z.object({ selectedNodeId: z.string().max(80).nullable().optional() }).strict();

// Voice answers: up to two minutes, sent as base64 JSON (the API only accepts JSON
// writes). 2 MB covers two minutes of AAC from Safari; Opus from other browsers is
// far smaller.
const AUDIO_MAX_MS = 120_000;
const AUDIO_MIN_MS = 1_000;
const AUDIO_MAX_BYTES = 2 * 1024 * 1024;
const AUDIO_MIN_BYTES = 512;
const audioBody = z.object({
  requestId: z.string().uuid(),
  mimeType: z.string().max(100),
  durationMs: z.number().int().min(AUDIO_MIN_MS).max(AUDIO_MAX_MS + 2_000),
  data: z.string().max(Math.ceil(AUDIO_MAX_BYTES / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  selectedNodeId: z.string().max(80).nullable().optional(),
}).strict();

// Container formats MediaRecorder produces, recognised by their first bytes so the
// declared type can't smuggle in something else.
const AUDIO_FORMATS = {
  "audio/webm": (bytes) => bytes.readUInt32BE(0) === 0x1a45dfa3,
  "audio/ogg": (bytes) => bytes.toString("latin1", 0, 4) === "OggS",
  "audio/mp4": (bytes) => bytes.toString("latin1", 4, 8) === "ftyp",
  "audio/wav": (bytes) => bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WAVE",
};

// Voice answers need the flag, speech-to-text and the interviewer's model.
const voiceAvailable = voiceAnswersEnabled && speechConfig.enabled && aiConfig.enabled;

const db = { query, queryOne };

function presentTurn(row) {
  const turn = { id: row.id, seq: row.seq, role: row.role, kind: row.kind, trigger: row.trigger, content: row.content, nodeIds: row.node_ids ?? [], createdAt: row.created_at };
  // A voice answer shows only its duration: the transcript stays server-side (the
  // interviewer and the review read it) and the recording is never sent back.
  if (row.kind === "audio") Object.assign(turn, { content: "", audio: { durationMs: row.audio_duration_ms ?? null } });
  return turn;
}

const TURNS_WITH_AUDIO = `select t.*, a.duration_ms as audio_duration_ms
  from interview_turns t left join interview_audio a on a.turn_id = t.id`;

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
  const speaker = (turn) => (turn.role !== "learner" ? "Interviewer" : turn.kind === "audio" ? "Learner (spoken)" : "Learner");
  const lines = turns.reverse().map((turn) => `${speaker(turn)}: ${turn.kind === "audio" && !turn.content ? "(voice answer, not transcribed)" : clean(turn.content, 800)}`);
  return [state.summary ? `Earlier: ${clean(state.summary, 3000)}` : "", ...lines].filter(Boolean).join("\n").slice(0, 12_000);
}

export const interviewsRouter = express.Router();
interviewsRouter.use(requireUser);

interviewsRouter.get("/sessions/:sessionId/interview", route(async (req, res) => {
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user)) return res.json({ access: "locked", turns: [], aiAvailable: aiConfig.enabled, voice: false });

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
  const turns = await query(`${TURNS_WITH_AUDIO} where t.session_id = $1 order by t.seq limit 400`, [session.id]);
  res.json({
    access: "full",
    aiAvailable: aiConfig.enabled,
    voice: voiceAvailable,
    turns: turns.map(presentTurn),
    state: state ? presentState(state) : null,
    allowance: await readAllowance(db, req.user, session.id, state),
  });
}));

// Reserves a learner turn: checks the reply allowance, records the turn (and a voice
// answer's recording), takes a credit and marks a reply as pending, all atomically.
async function reserveLearnerTurn({ session, user, kind, content, requestId, hint = false, audio = null }) {
  try {
    return await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      const state = await ensureState(conn, session);
      if (state.pending_since && Date.now() - new Date(state.pending_since).getTime() < PENDING_MS) {
        throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
      }
      const allowance = await readAllowance(conn, user, session.id, state);
      if (allowance.turns.used >= allowance.turns.limit) throw new HttpError(403, "INTERVIEW_LIMIT_ROUND", `You've used all ${allowance.turns.limit} interviewer replies for this round. Finish the round to get your review.`);
      if (allowance.month.used >= allowance.month.limit) throw new HttpError(403, "INTERVIEW_LIMIT_MONTH", "You've used this month's interviewer replies. They reset at the start of next month.");
      if (hint && allowance.hints.used >= allowance.hints.limit) throw new HttpError(403, "HINT_LIMIT", `You've used all ${allowance.hints.limit} hints for this round.`);
      const learner = await conn.queryOne(
        `insert into interview_turns (session_id, user_id, seq, role, kind, content, request_id, diagram_version)
         values ($1, $2, $3, 'learner', $4, $5, $6, $7) returning *`,
        [session.id, user.id, await nextSeq(conn, session.id), kind, content, requestId, session.diagram_version]
      );
      if (audio) {
        await conn.query(
          "insert into interview_audio (turn_id, user_id, mime_type, duration_ms, size_bytes, data) values ($1, $2, $3, $4, $5, $6)",
          [learner.id, user.id, audio.mimeType, audio.durationMs, audio.bytes.length, audio.bytes]
        );
        learner.audio_duration_ms = audio.durationMs;
      }
      const credit = await conn.queryOne("insert into ai_credits (user_id, session_id, kind) values ($1, $2, 'interview_turn') returning id", [user.id, session.id]);
      await conn.query("update interview_state set pending_since = now() where session_id = $1", [session.id]);
      return { state, learner, creditId: credit.id };
    });
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
    throw error;
  }
}

// Undoes a reserved turn after a failure, so a retry with the same request id starts
// cleanly (the client keeps the draft or recording) and no credit is spent.
async function undoLearnerTurn(session, reserved) {
  await transaction(async (conn) => {
    await conn.query("delete from interview_turns where id = $1", [reserved.learner.id]);
    await releaseCredit(conn, reserved.creditId);
    await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
  });
}

async function replyToLearner({ req, session, reserved, hint = false }) {
  const design = describeDiagram(session.diagram);
  const trigger = hint ? "hint" : "reply";
  const turns = await recentTurns(session.id, reserved.state.summarized_through);
  const { data } = await runTask(
    interviewerTask,
    taskInput({ session, state: reserved.state, turns, trigger, selectedNodeId: req.body.selectedNodeId, design, user: req.user }),
    { userId: req.user.id, sessionId: session.id }
  );
  if (!data.message.trim()) throw new AiError("INVALID_OUTPUT", "The interviewer returned an empty reply.");
  return saveInterviewerTurn({ session, state: reserved.state, output: data, trigger, design, creditId: reserved.creditId, hint });
}

// A retried request returns the turns the first attempt produced.
async function replayed(req, session, requestId, kind) {
  const turn = await queryOne(`${TURNS_WITH_AUDIO} where t.user_id = $1 and t.request_id = $2`, [req.user.id, requestId]);
  if (!turn) return null;
  if (turn.session_id !== session.id || (kind === "audio") !== (turn.kind === "audio")) {
    throw new HttpError(409, "REQUEST_ID_REUSED", "This request id was already used for another message.");
  }
  const reply = await queryOne("select * from interview_turns where session_id = $1 and seq = $2 and role = 'interviewer'", [session.id, turn.seq + 1]);
  return { turns: [turn, reply].filter(Boolean).map(presentTurn), replayed: true };
}

const ROUND_FINISHED = "This round is finished, so the interview has ended. Your review is in the Review tab.";
const TOO_FAST = "You're sending messages very quickly. Wait a moment and try again.";

interviewsRouter.post("/sessions/:sessionId/interview/messages", route(async (req, res) => {
  const body = parse(messageBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user)) throw new HttpError(403, "PLAN_REQUIRED", "The live interviewer is part of the Plus plan.");
  const replay = await replayed(req, session, body.requestId, "message");
  if (replay) return res.json(replay);

  if (!aiConfig.enabled) throw toHttpError(new AiError("DISABLED"));
  if (session.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", ROUND_FINISHED);
  const hint = body.intent === "hint";
  const content = body.content.trim();
  if (!hint && !content) throw new HttpError(400, "INVALID_REQUEST", "Write a message first.");
  if (!(await messageLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", TOO_FAST);

  const reserved = await reserveLearnerTurn({ session, user: req.user, kind: hint ? "hint_request" : "message", content: content || "Could I have a hint?", requestId: body.requestId, hint });
  let result;
  try {
    result = await replyToLearner({ req, session, reserved, hint });
  } catch (error) {
    await undoLearnerTurn(session, reserved);
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }

  res.status(201).json({
    turns: [presentTurn(reserved.learner), presentTurn(result.turn)],
    state: presentState(result.state),
    allowance: await readAllowance(db, req.user, session.id, result.state),
  });
  afterResponse(maybeSummarize(session).catch((error) => console.error("[ai] interview summary failed:", error.code || error.message)));
}));

const speechErrors = {
  RATE_LIMITED: [503, "Voice answers are busy right now. Try again in a minute, or type your answer."],
  UNREADABLE: [400, "That recording couldn't be read. Try recording again."],
  AUTH: [503, "Voice answers aren't available right now. We've logged the problem."],
  DISABLED: [503, "Voice answers aren't available right now."],
};

function speechHttpError(error) {
  const [status, message] = speechErrors[error.code] || [502, "We couldn't process that recording. Try again."];
  return new HttpError(status, `VOICE_${error.code}`, `${message} No credit was used.`);
}

// A voice answer: the recording is transcribed, the transcript becomes the learner's
// turn, and the interviewer replies exactly as it would to typed text. Delivery numbers
// (pace, fillers, pauses) are kept for communication feedback. The transcript is never
// sent to the client, and neither is the recording.
interviewsRouter.post("/sessions/:sessionId/interview/audio", route(async (req, res) => {
  if (!voiceAvailable) throw new HttpError(404, "NOT_FOUND", "No such endpoint.");
  const body = parse(audioBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user)) throw new HttpError(403, "PLAN_REQUIRED", "The live interviewer is part of the Plus plan.");
  const replay = await replayed(req, session, body.requestId, "audio");
  if (replay) return res.json(replay);

  if (session.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", ROUND_FINISHED);
  const mimeType = body.mimeType.split(";")[0].trim().toLowerCase();
  const bytes = Buffer.from(body.data, "base64");
  if (!AUDIO_FORMATS[mimeType] || bytes.length < AUDIO_MIN_BYTES || !AUDIO_FORMATS[mimeType](bytes)) {
    throw new HttpError(400, "INVALID_AUDIO", "That recording couldn't be read. Try recording again.");
  }
  if (bytes.length > AUDIO_MAX_BYTES) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "That recording is too large to send.");
  if (!(await messageLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", TOO_FAST);

  const durationMs = Math.min(body.durationMs, AUDIO_MAX_MS);
  const reserved = await reserveLearnerTurn({ session, user: req.user, kind: "audio", content: "", requestId: body.requestId, audio: { mimeType, durationMs, bytes } });
  let result;
  try {
    const speech = await transcribe({ bytes, mimeType, durationMs, userId: req.user.id, sessionId: session.id });
    if (!speech.text) throw new HttpError(422, "VOICE_EMPTY", "We couldn't hear anything in that recording. Check your microphone and try again. No credit was used.");
    await transaction(async (conn) => {
      await conn.query("update interview_turns set content = $2 where id = $1", [reserved.learner.id, speech.text.slice(0, 4000)]);
      await conn.query(
        "update interview_audio set transcribed_at = now(), stt_model = $2, delivery = $3::jsonb where turn_id = $1",
        [reserved.learner.id, speech.model, JSON.stringify(speech.delivery)]
      );
    });
    result = await replyToLearner({ req, session, reserved });
  } catch (error) {
    await undoLearnerTurn(session, reserved);
    if (error instanceof SpeechError) throw speechHttpError(error);
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }

  res.status(201).json({
    turns: [presentTurn(reserved.learner), presentTurn(result.turn)],
    state: presentState(result.state),
    allowance: await readAllowance(db, req.user, session.id, result.state),
  });
  afterResponse(maybeSummarize(session).catch((error) => console.error("[ai] interview summary failed:", error.code || error.message)));
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
