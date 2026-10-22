import express from "express";
import { z } from "zod";
import { query, queryOne, transaction } from "../db.js";
import { voiceAnswersEnabled } from "../flags.js";
import { HttpError, afterResponse, createLimiter, parse, route } from "../http.js";
import { aiConfig } from "./ai/config.js";
import { openSse, wantsEventStream } from "./ai/sse.js";
import { diffSnapshots, snapshotOf } from "./ai/canvas.js";
import { isSignificantKind } from "./ai/components.js";
import { clean, describeDiagram, nameComponents } from "./ai/context.js";
import { filterFillerWords, parseAnswerContext } from "./ai/communication.js";
import { AiError, toHttpError } from "./ai/errors.js";
import { guideFor } from "./ai/guides.js";
import { runTask, runTaskStream } from "./ai/run.js";
import { SpeechError, speechConfig, transcribe } from "./ai/speech.js";
import { STAGES, interviewSummaryTask, interviewerTask } from "./ai/tasks/interviewer.js";
import { changeMode, handleLearnerTurn, handleTick, presentV3State, startRound, summarize as summarizeV3, v3PackFor } from "./conductor/index.js";
import { requireUser } from "./identity.js";
import { hasInterviewer, isPlus, limitsFor } from "./plans.js";
import { claimTrial, trialStatus } from "./trial.js";
import { deleteInterviewAudioForTurn, interviewAudioKey, objectStorage, putInterviewAudio } from "../object-storage.js";
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
// Ticks are background calls, so they get their own limiter and can never use up a
// learner's message allowance (docs/design/interview-conductor.md, section 6).
const tickLimiter = createLimiter({ name: "interview-tick", windowMs: 60_000, max: 6 });
const tickBody = z.object({
  reason: z.enum(["canvas_quiet", "idle", "visible"]).default("canvas_quiet"),
  typing: z.boolean().default(false),
  selectedNodeId: z.string().max(80).nullable().optional(),
}).strict();
const modeBody = z.object({ mode: z.enum(["guided", "realistic"]) }).strict();
const feedbackBody = z.object({
  rating: z.literal("down"),
  reason: z.enum(["already_asked", "not_relevant", "wrong", "too_harsh", "other"]),
  note: z.string().trim().max(500).optional(),
}).strict();
const ratingBody = z.object({ realism: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }).strict();
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
  // A request to draw is labelled in the conversation (the move itself is not private).
  if (row.move === "ask_to_draw") turn.asksToDraw = true;
  // A voice answer shows only its duration: the transcript stays server-side (the
  // interviewer and the review read it) and the recording is never sent back.
  if (row.kind === "audio") Object.assign(turn, { content: "", audio: { durationMs: row.audio_duration_ms ?? null } });
  return turn;
}

const TURNS_WITH_AUDIO = `select t.*, a.duration_ms as audio_duration_ms, a.delivery
  from interview_turns t left join interview_audio a on a.turn_id = t.id`;

function presentState(state, promptId) {
  if (state.engine === "v3") return presentV3State(state, promptId);
  return { engine: "v2", stage: state.stage, hintsUsed: state.hints_used };
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

async function readAllowance(conn, user, session, state) {
  const limits = limitsFor(user, session);
  const row = await conn.queryOne(
    `select count(*) filter (where session_id = $2) as round_used,
            count(*) filter (where created_at >= ${MONTH_START}) as month_used
       from ai_credits where user_id = $1 and kind = 'interview_turn' and status <> 'released'`,
    [user.id, session.id]
  );
  return {
    turns: { used: Number(row.round_used), limit: limits.interviewTurnsPerRound },
    month: { used: Number(row.month_used), limit: limits.interviewTurnsPerMonth },
    hints: { used: state?.hints_used ?? 0, limit: limits.hintsPerRound },
  };
}

async function recentTurns(sessionId, summarizedThrough) {
  const rows = await query(`${TURNS_WITH_AUDIO} where t.session_id = $1 and t.seq > $2 order by t.seq desc limit $3`, [sessionId, summarizedThrough, RECENT_TURNS]);
  return rows.reverse();
}

function openingMessage(prompt) {
  return `Let's work through "${prompt.title}" together. Before you draw much, start with the requirements: who uses this system, what are the core operations, and roughly what scale should we design for? Ask me anything about the brief along the way.`;
}

// Saves the interviewer's turn and the state it implies, and settles the credit. The
// interviewer's private note on how the learner communicated is kept on the learner's turn.
async function saveInterviewerTurn({ session, state, output, trigger, design, creditId, hint, learnerTurn = null }) {
  return transaction(async (conn) => {
    const note = output.communication;
    if (learnerTurn && trigger === "reply") {
      const answerContext = {
        technicalContext: output.answerContext.technicalContext,
        communicationGaps: [...new Set(output.answerContext.communicationGaps)],
        filteredContent: learnerTurn.kind === "audio" ? filterFillerWords(learnerTurn.content) : learnerTurn.content,
      };
      await conn.query(
        "update interview_turns set communication = $2::jsonb, answer_context = $3::jsonb where id = $1",
        [learnerTurn.id, JSON.stringify({ signals: [...new Set(note.signals)], note: note.note }), JSON.stringify(answerContext)]
      );
    }
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
  const { data } = state.engine === "v3"
    ? await summarizeV3({ round: state, previous: state.summary, turns: fold, userId: session.user_id, sessionId: session.id })
    : await runTask(interviewSummaryTask, { previous: state.summary, turns: fold }, { userId: session.user_id, sessionId: session.id });
  await query(
    "update interview_state set summary = $2, summarized_through = $3, updated_at = now() where session_id = $1 and summarized_through = $4",
    [session.id, data.summary, fold.at(-1).seq, state.summarized_through]
  );
}

function taskInput({ session, state, turns, trigger, selectedNodeId, design, changes, candidates, user }) {
  const prompt = promptById.get(session.prompt_id);
  const limits = limitsFor(user, session);
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
export async function interviewTranscript(sessionId, maxChars = 12_000) {
  const state = await queryOne("select summary, summarized_through from interview_state where session_id = $1", [sessionId]);
  if (!state) return "";
  const turns = await query("select role, kind, content, answer_context from interview_turns where session_id = $1 and seq > $2 order by seq desc limit 40", [sessionId, state.summarized_through]);
  const speaker = (turn) => (turn.role !== "learner" ? "Interviewer" : turn.kind === "audio" ? "Learner (spoken)" : "Learner");
  const lines = turns.reverse().flatMap((turn) => {
    const context = parseAnswerContext(turn.answer_context);
    const answer = `${speaker(turn)}${turn.role === "learner" ? " (verbatim)" : ""}: ${turn.kind === "audio" && !turn.content ? "(voice answer, not transcribed)" : clean(turn.content, 800)}`;
    if (turn.role !== "learner" || !context) return [answer];
    return [
      answer,
      context.filteredContent !== turn.content ? `  Filler-reduced answer: ${clean(context.filteredContent, 800)}` : "",
      context.technicalContext ? `  Extracted technical context: ${clean(context.technicalContext, 900)}` : "",
      context.communicationGaps?.length ? `  Identified communication gaps: ${context.communicationGaps.join(", ")}` : "",
    ].filter(Boolean);
  });
  return [state.summary ? `Earlier: ${clean(state.summary, 3000)}` : "", ...lines].filter(Boolean).join("\n").slice(0, maxChars);
}

// Everything the communication feedback needs from a round: each learner answer with
// the question it answered, the interviewer's private note and, when spoken, the
// delivery numbers; plus round-level numbers computed here rather than by a model.
// Null when the learner said too little to judge.
const MIN_ANSWERS_FOR_COMMUNICATION = 2;

export async function communicationInput(sessionId) {
  const rows = await query(`${TURNS_WITH_AUDIO} where t.session_id = $1 order by t.seq limit 400`, [sessionId]);
  const answers = [];
  let question = "";
  for (const [index, row] of rows.entries()) {
    if (row.role === "interviewer") { question = row.content; continue; }
    if (row.kind !== "message" && row.kind !== "audio") continue;
    if (row.kind === "audio" && !row.content) continue;
    const context = parseAnswerContext(row.answer_context) ?? {};
    answers.push({
      question,
      spoken: row.kind === "audio",
      content: row.content,
      filteredContent: context.filteredContent ?? (row.kind === "audio" ? filterFillerWords(row.content) : row.content),
      technicalContext: context.technicalContext ?? "",
      communicationGaps: context.communicationGaps ?? [],
      durationMs: row.audio_duration_ms,
      delivery: row.delivery,
      note: row.communication,
      // The interviewer judged this answer weak or mistaken, or its next move pushed back on it.
      unsound: (row.assessment ?? []).some((entry) => entry.band === "weak" || entry.misconceptionId)
        || rows.slice(index + 1).find((next) => next.role === "interviewer")?.kind === "challenge",
    });
  }
  if (answers.length < MIN_ANSWERS_FOR_COMMUNICATION) return null;

  const spoken = answers.filter((answer) => answer.spoken && answer.delivery);
  const sum = (key) => spoken.reduce((total, answer) => total + (answer.delivery[key] || 0), 0);
  const speakingMs = sum("speakingMs");
  const minutes = speakingMs / 60_000;
  const signalCounts = {};
  for (const answer of answers) for (const signal of answer.note?.signals ?? []) signalCounts[signal] = (signalCounts[signal] || 0) + 1;
  return {
    answers,
    stats: {
      answers: answers.length,
      spokenAnswers: spoken.length,
      typedAnswers: answers.length - spoken.length,
      speakingSeconds: Math.round(speakingMs / 1000),
      wordsPerMinute: minutes >= 0.25 ? Math.round(sum("words") / minutes) : null,
      hesitationsPerMinute: minutes >= 0.25 ? Math.round((sum("hesitations") / minutes) * 10) / 10 : null,
      longPauses: sum("longPauses"),
      repeats: sum("repeats"),
      signals: signalCounts,
    },
  };
}

export const interviewsRouter = express.Router();
interviewsRouter.use(requireUser);

interviewsRouter.get("/sessions/:sessionId/interview", route(async (req, res) => {
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user, session)) {
    return res.json({ access: "locked", trial: await trialStatus(db, req.user, session), turns: [], aiAvailable: aiConfig.enabled, voice: false });
  }

  // The first visit to an active round opens the interview (a fixed message, no model
  // call). A question with a published Problem Pack opens on the v3 Conductor, which
  // pins everything for the rest of the round; otherwise the v2 interviewer runs.
  if (session.status === "in_progress") {
    const packVersion = await v3PackFor(session.prompt_id);
    await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      await ensureState(conn, session);
      if (!(await conn.queryOne("select 1 from interview_turns where session_id = $1 limit 1", [session.id]))) {
        if (packVersion) {
          await startRound(conn, { session, user: req.user, packVersion });
        } else {
          await conn.query(
            "insert into interview_turns (session_id, user_id, seq, role, kind, trigger, content) values ($1, $2, 1, 'interviewer', 'opening', 'opening', $3)",
            [session.id, req.user.id, openingMessage(promptById.get(session.prompt_id))]
          );
        }
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
    state: state ? presentState(state, session.prompt_id) : null,
    allowance: await readAllowance(db, req.user, session, state),
  });
}));

// Spends the learner's one free interviewer round on this round (issue #75). Only a
// free learner, on a free question that is still in progress, can start it; starting
// it again on the same round is a no-op.
interviewsRouter.post("/sessions/:sessionId/interview/trial", route(async (req, res) => {
  const session = await ownedSession(req);
  if (isPlus(req.user)) throw new HttpError(409, "ALREADY_PLUS", "Your Plus plan already includes the interviewer on every round.");
  if (session.interviewer_trial) return res.json({ started: false });
  const status = await trialStatus(db, req.user, session);
  if (status === "not_eligible") throw new HttpError(403, "TRIAL_NOT_ELIGIBLE", "The free interviewer round works on free questions.");
  if (status === "round_finished") throw new HttpError(409, "ROUND_FINISHED", "This round is finished. Start a free question to use your interviewer round.");
  const started = await transaction(async (conn) => {
    await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
    return claimTrial(conn, req.user, session);
  });
  if (!started) throw new HttpError(409, "TRIAL_USED", "You've already used your free interviewer round. Plus includes the interviewer on every round.");
  console.log("[trial] interviewer trial started");
  res.status(201).json({ started: true });
}));

// Reserves a learner turn: checks the reply allowance, records the turn (and a voice
// answer's recording), takes a credit and marks a reply as pending, all atomically.
async function reserveLearnerTurn({ session, user, kind, content, requestId, hint = false, audio = null }) {
  try {
    return await transaction(async (conn) => {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      const freshSession = await conn.queryOne("select status from practice_sessions where id = $1", [session.id]);
      if (freshSession.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", ROUND_FINISHED);
      const state = await ensureState(conn, session);
      if (state.pending_since && Date.now() - new Date(state.pending_since).getTime() < PENDING_MS) {
        throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
      }
      const allowance = await readAllowance(conn, user, session, state);
      if (allowance.turns.used >= allowance.turns.limit) throw new HttpError(403, "INTERVIEW_LIMIT_ROUND", `You've used all ${allowance.turns.limit} interviewer replies for this round. Finish the round to get your review.`);
      if (allowance.month.used >= allowance.month.limit) throw new HttpError(403, "INTERVIEW_LIMIT_MONTH", "You've used this month's interviewer replies. They reset at the start of next month.");
      if (hint && allowance.hints.used >= allowance.hints.limit) throw new HttpError(403, "HINT_LIMIT", `You've used all ${allowance.hints.limit} hints for this round.`);
      const learner = await conn.queryOne(
        `insert into interview_turns (session_id, user_id, seq, role, kind, content, request_id, diagram_version)
         values ($1, $2, $3, 'learner', $4, $5, $6, $7) returning *`,
        [session.id, user.id, await nextSeq(conn, session.id), kind, content, requestId, session.diagram_version]
      );
      if (audio) {
        let storageKey = null;
        let data = audio.bytes;
        if (objectStorage.enabled) {
          storageKey = interviewAudioKey(user.id, session.id, learner.id, audio.mimeType);
          await putInterviewAudio({ key: storageKey, bytes: audio.bytes, contentType: audio.mimeType });
          data = null;
        }
        await conn.query(
          "insert into interview_audio (turn_id, user_id, mime_type, duration_ms, size_bytes, data, storage_key) values ($1, $2, $3, $4, $5, $6, $7)",
          [learner.id, user.id, audio.mimeType, audio.durationMs, audio.bytes.length, data, storageKey]
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
  await deleteInterviewAudioForTurn(reserved.learner.id);
  await transaction(async (conn) => {
    await conn.query("delete from interview_turns where id = $1", [reserved.learner.id]);
    await releaseCredit(conn, reserved.creditId);
    await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
  });
}

async function replyToLearner({ req, session, reserved, hint = false, onDelta, onReset }) {
  if (reserved.state.engine === "v3") {
    return handleLearnerTurn({ session, user: req.user, reserved, selectedNodeId: req.body.selectedNodeId, hint, onDelta, onReset });
  }
  const design = describeDiagram(session.diagram);
  const trigger = hint ? "hint" : "reply";
  const turns = await recentTurns(session.id, reserved.state.summarized_through);
  const run = onDelta ? runTaskStream : runTask;
  const { data } = await run(
    interviewerTask,
    taskInput({ session, state: reserved.state, turns, trigger, selectedNodeId: req.body.selectedNodeId, design, user: req.user }),
    { userId: req.user.id, sessionId: session.id, onDelta, onReset }
  );
  if (!data.message.trim()) throw new AiError("INVALID_OUTPUT", "The interviewer returned an empty reply.");
  return saveInterviewerTurn({ session, state: reserved.state, output: data, trigger, design, creditId: reserved.creditId, hint, learnerTurn: hint ? null : reserved.learner });
}

// Writes the learner's turn and the interviewer's reply. Clients that accept an
// event stream see the reply text as it is generated; everyone else gets one JSON body.
async function deliverLearnerReply(req, res, { session, reserved, hint = false }) {
  const produce = async (hooks) => {
    let result;
    try {
      result = await replyToLearner({ req, session, reserved, hint, ...hooks });
    } catch (error) {
      try {
        await undoLearnerTurn(session, reserved);
      } catch (undoError) {
        console.error("[ai] could not release interview turn:", undoError.message);
      }
      throw error;
    }
    return {
      turns: [presentTurn(reserved.learner), presentTurn(result.turn)],
      state: presentState(result.state, session.prompt_id),
      allowance: await readAllowance(db, req.user, session, result.state),
    };
  };
  const summarize = () => afterResponse(maybeSummarize(session).catch((error) => console.error("[ai] interview summary failed:", error.code || error.message)));

  if (!wantsEventStream(req)) {
    const payload = await produce({});
    res.status(201).json(payload);
    summarize();
    return;
  }

  const sse = openSse(res);
  try {
    const payload = await produce({
      onDelta: (text) => sse.send("delta", { text }),
      onReset: () => sse.send("reset", {}),
    });
    sse.send("done", payload);
    sse.end();
    summarize();
  } catch (error) {
    const http = error instanceof HttpError ? error : error instanceof AiError ? toHttpError(error) : new HttpError(500, "INTERNAL", "Something went wrong on our side. No credit was used.");
    if (!(error instanceof HttpError) && !(error instanceof AiError)) console.error("[ai] interview stream failed:", error);
    sse.send("error", { status: http.status, code: http.code, message: http.message });
    sse.end();
  }
}

// A retried request returns the turns the first attempt produced.
async function replayed(req, session, requestId, kind) {
  const turn = await queryOne(`${TURNS_WITH_AUDIO} where t.user_id = $1 and t.request_id = $2`, [req.user.id, requestId]);
  if (!turn) return null;
  if (turn.session_id !== session.id || (kind === "audio") !== (turn.kind === "audio")) {
    throw new HttpError(409, "REQUEST_ID_REUSED", "This request id was already used for another message.");
  }
  const reply = await queryOne("select * from interview_turns where session_id = $1 and seq = $2 and role = 'interviewer'", [session.id, turn.seq + 1]);
  if (!reply) throw new HttpError(409, "INTERVIEWER_BUSY", "The interviewer is still replying to your last message.");
  return { turns: [turn, reply].map(presentTurn), replayed: true };
}

const ROUND_FINISHED = "This round is finished, so the interview has ended. Your review is in the Review tab.";
const TOO_FAST = "You're sending messages very quickly. Wait a moment and try again.";

interviewsRouter.post("/sessions/:sessionId/interview/messages", route(async (req, res) => {
  const body = parse(messageBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user, session)) throw new HttpError(403, "PLAN_REQUIRED", "The live interviewer is part of the Plus plan.");
  const replay = await replayed(req, session, body.requestId, "message");
  if (replay) return res.json(replay);

  if (!aiConfig.enabled) throw toHttpError(new AiError("DISABLED"));
  if (session.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", ROUND_FINISHED);
  const hint = body.intent === "hint";
  const content = body.content.trim();
  if (!hint && !content) throw new HttpError(400, "INVALID_REQUEST", "Write a message first.");
  if (!(await messageLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", TOO_FAST);

  const reserved = await reserveLearnerTurn({ session, user: req.user, kind: hint ? "hint_request" : "message", content: content || "Could I have a hint?", requestId: body.requestId, hint });
  try {
    await deliverLearnerReply(req, res, { session, reserved, hint });
  } catch (error) {
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }
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
// turn (interview_turns.content, kept for the life of the round), and the interviewer
// replies exactly as it would to typed text. Raw audio is purged 30 days after
// transcription (see maintenance.js); delivery numbers stay for communication feedback.
// The transcript is never sent to the client, and neither is the recording.
interviewsRouter.post("/sessions/:sessionId/interview/audio", route(async (req, res) => {
  if (!voiceAvailable) throw new HttpError(404, "NOT_FOUND", "No such endpoint.");
  const body = parse(audioBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user, session)) throw new HttpError(403, "PLAN_REQUIRED", "The live interviewer is part of the Plus plan.");
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
    reserved.learner.content = speech.text.slice(0, 4000);
  } catch (error) {
    await undoLearnerTurn(session, reserved);
    if (error instanceof SpeechError) throw speechHttpError(error);
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }
  try {
    await deliverLearnerReply(req, res, { session, reserved });
  } catch (error) {
    if (res.headersSent) return;
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }
}));

// A v3 tick (docs/design/interview-conductor.md, section 6): most end with nothing or a
// template, never an error the learner would see.
async function v3Tick(req, res, session, state, body) {
  const none = (reason) => res.json({ action: "none", reason });
  if (!(await tickLimiter(req.user.id))) {
    await query("insert into interview_events (session_id, type, payload) values ($1, 'tick_rate_limited', '{}'::jsonb)", [session.id]);
    return none("rate_limited");
  }
  const reserveCredit = async () => {
    try {
      return await transaction(async (conn) => {
        await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
        const fresh = await conn.queryOne("select * from interview_state where session_id = $1", [session.id]);
        if (fresh.pending_since && Date.now() - new Date(fresh.pending_since).getTime() < PENDING_MS) return null;
        const allowance = await readAllowance(conn, req.user, session, fresh);
        if (allowance.turns.used >= allowance.turns.limit || allowance.month.used >= allowance.month.limit) return null;
        const credit = await conn.queryOne("insert into ai_credits (user_id, session_id, kind) values ($1, $2, 'interview_turn') returning id", [req.user.id, session.id]);
        await conn.query("update interview_state set pending_since = now() where session_id = $1", [session.id]);
        return credit.id;
      });
    } catch (error) {
      if (error.code === "23505") return null;
      throw error;
    }
  };
  const release = (creditId) => transaction(async (conn) => {
    await releaseCredit(conn, creditId);
    await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
  });
  try {
    const result = await handleTick({ session, user: req.user, stateRow: state, body, reserveCredit, releaseCredit: release });
    if (result.action === "none") return none(result.reason);
    if (result.action === "closed") return res.json({ action: "closed" });
    res.json({ action: result.action, turn: presentTurn(result.turn), state: presentState(result.state, session.prompt_id), allowance: await readAllowance(db, req.user, session, result.state) });
  } catch (error) {
    console.error("[ai] tick failed:", error.code || error.message);
    return none("error");
  }
}

interviewsRouter.post("/sessions/:sessionId/interview/tick", route(async (req, res) => {
  const body = parse(tickBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user, session) || session.status !== "in_progress" || !aiConfig.enabled) return res.json({ action: "none", reason: "unavailable" });
  const state = await transaction((conn) => ensureState(conn, session));
  if (state.engine === "v3") return v3Tick(req, res, session, state, body);
  // v2 rounds only look at the canvas; idle and visibility ticks are v3 behaviours.
  if (body.reason !== "canvas_quiet" || body.typing) return res.json({ action: "none", reason: "nothing_to_ask" });
  return v2Check(req, res, session, state, body);
}));

// Kept as an alias of /tick for one release, for workspaces loaded before the switch.
interviewsRouter.post("/sessions/:sessionId/interview/check", route(async (req, res) => {
  const body = parse(checkBody, req.body);
  const session = await ownedSession(req);
  if (!hasInterviewer(req.user, session) || session.status !== "in_progress" || !aiConfig.enabled) return res.json({ action: "none", reason: "unavailable" });
  const state = await transaction((conn) => ensureState(conn, session));
  if (state.engine === "v3") return v3Tick(req, res, session, state, { reason: "canvas_quiet", typing: false, selectedNodeId: body.selectedNodeId });
  return v2Check(req, res, session, state, body);
}));

// The v2 interviewer's look at the canvas after it has been quiet for a while. The
// server decides whether anything significant and unexplained changed; most calls end
// without a model call, and a model "skip" costs the learner nothing.
async function v2Check(req, res, session, state, body) {
  const none = (reason) => res.json({ action: "none", reason });
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

  const limits = limitsFor(req.user, session);
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
      const allowance = await readAllowance(conn, req.user, session, fresh);
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
    res.json({ action: "ask", turn: presentTurn(result.turn), state: presentState(result.state, session.prompt_id), allowance: await readAllowance(db, req.user, session, result.state) });
  } catch (error) {
    await transaction(async (conn) => {
      await releaseCredit(conn, reserved.creditId);
      await conn.query("update interview_state set pending_since = null where session_id = $1", [session.id]);
    });
    console.error("[ai] proactive check failed:", error.code || error.message);
    return none("error");
  }
}

// Guided or realistic. Fixed once the learner has said anything, because it changes
// how the round is judged.
interviewsRouter.post("/sessions/:sessionId/interview/mode", route(async (req, res) => {
  const { mode } = parse(modeBody, req.body);
  const session = await ownedSession(req);
  if (session.status !== "in_progress") throw new HttpError(409, "ROUND_FINISHED", ROUND_FINISHED);
  const state = await transaction(async (conn) => {
    await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
    const current = await ensureState(conn, session);
    if (await conn.queryOne("select 1 from interview_turns where session_id = $1 and role = 'learner' limit 1", [session.id])) {
      throw new HttpError(409, "MODE_LOCKED", "The mode is fixed once the interview has started.");
    }
    await changeMode(conn, { session, state: current, mode });
    return conn.queryOne("select * from interview_state where session_id = $1", [session.id]);
  });
  const turns = await query(`${TURNS_WITH_AUDIO} where t.session_id = $1 order by t.seq limit 400`, [session.id]);
  res.json({ mode, state: presentState(state, session.prompt_id), turns: turns.map(presentTurn) });
}));

// A thumbs-down on one interviewer message, with a reason. Works on v2 and v3 rounds,
// so the two can be compared (docs/design/README.md, success measures).
interviewsRouter.post("/sessions/:sessionId/interview/turns/:turnId/feedback", route(async (req, res) => {
  const body = parse(feedbackBody, req.body);
  const session = await ownedSession(req);
  const turn = await queryOne("select id from interview_turns where id = $1 and session_id = $2 and role = 'interviewer'", [req.params.turnId, session.id]).catch(() => null);
  if (!turn) throw new HttpError(404, "NOT_FOUND", "No such interviewer message.");
  await query(
    `insert into interview_turn_feedback (turn_id, user_id, rating, reason, note) values ($1, $2, $3, $4, $5)
     on conflict (turn_id) do update set reason = excluded.reason, note = excluded.note, created_at = now()`,
    [turn.id, req.user.id, body.rating, body.reason, body.note || null]
  );
  res.json({ ok: true });
}));

// The one-question realism rating at the end of a round, once per round.
interviewsRouter.post("/sessions/:sessionId/interview/rating", route(async (req, res) => {
  const body = parse(ratingBody, req.body);
  const session = await ownedSession(req);
  const state = await queryOne("select engine from interview_state where session_id = $1", [session.id]);
  if (!state) throw new HttpError(409, "NO_INTERVIEW", "This round had no interview to rate.");
  const saved = await queryOne(
    `insert into interview_ratings (session_id, user_id, realism, comment, engine) values ($1, $2, $3, $4, $5)
     on conflict (session_id) do nothing returning session_id`,
    [session.id, req.user.id, body.realism, body.comment || null, state.engine]
  );
  if (!saved) throw new HttpError(409, "ALREADY_RATED", "You've already rated this round.");
  res.status(201).json({ ok: true });
}));
