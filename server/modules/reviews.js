import express from "express";
import { z } from "zod";
import { query, queryOne, transaction } from "../db.js";
import { HttpError, createLimiter, parse, route } from "../http.js";
import { aiConfig } from "./ai/config.js";
import { describeDiagram, fingerprint, nameComponents } from "./ai/context.js";
import { AiError, toHttpError } from "./ai/errors.js";
import { bandFor, overallScore, rubric } from "./ai/rubric.js";
import { runTask } from "./ai/run.js";
import { guideFor } from "./ai/guides.js";
import { communicationTask, communicationTemplateVersion } from "./ai/tasks/communication.js";
import { reviewTask, reviewTemplateVersion } from "./ai/tasks/review.js";
import { requireUser } from "./identity.js";
import { communicationInput, interviewTranscript } from "./interviews.js";
import { debrief, reviewLedger } from "./conductor/index.js";
import { hasFullFeedback, limitsFor, onTrial, planFor } from "./plans.js";
import { referencePoolFor } from "./answers/store.js";
import { ownedSession, promptById } from "./practice.js";

const MIN_COMPONENTS = 3;
const MIN_CONNECTIONS = 2;
// Longer than the slowest possible generation (two model rounds at the task timeout),
// so only reviews orphaned by a crash or restart are swept.
const STALE_PENDING = "6 minutes";

const reviewLimiter = createLimiter({ name: "review", windowMs: 60 * 60_000, max: 15 });
const requestBody = z.object({ requestId: z.string().uuid() }).strict();
const db = { query, queryOne };

const MONTH_START = "(date_trunc('month', now() at time zone 'UTC') at time zone 'UTC')";

async function readAllowance(conn, user, session) {
  const limits = limitsFor(user, session);
  const row = await conn.queryOne(
    `select count(*) filter (where session_id = $2) as round_used,
            count(*) filter (where created_at >= ${MONTH_START}) as month_used,
            ${MONTH_START} + interval '1 month' as month_resets_at
       from ai_credits
      where user_id = $1 and kind = 'review' and status <> 'released'`,
    [user.id, session.id]
  );
  const round = { used: Number(row.round_used), limit: limits.reviewsPerRound };
  const month = { used: Number(row.month_used), limit: limits.reviewsPerMonth, resetsAt: row.month_resets_at };
  return { plan: planFor(user), trial: onTrial(user, session), round, month, remaining: Math.max(0, Math.min(round.limit - round.used, month.limit - month.used)) };
}

// Fails reviews left pending by a crash or restart and gives their credits back.
async function expireStale(conn, sessionId) {
  await conn.query(
    `with expired as (
       update ai_reviews set status = 'failed', error_code = 'STALE', completed_at = now()
        where session_id = $1 and status = 'pending' and created_at < now() - interval '${STALE_PENDING}'
        returning credit_id
     )
     update ai_credits set status = 'released', updated_at = now() where id in (select credit_id from expired)`,
    [sessionId]
  );
}

async function settle(review, fields) {
  return transaction(async (conn) => {
    const saved = await conn.queryOne(
      `update ai_reviews
          set status = $2, result = $3::jsonb, overall_score = $4, model = coalesce($5, model), error_code = $6, completed_at = now()
        where id = $1 returning *`,
      [review.id, fields.status, fields.result ? JSON.stringify(fields.result) : null, fields.result?.overall.score ?? null, fields.model ?? null, fields.errorCode ?? null]
    );
    await conn.query("update ai_credits set status = $2, updated_at = now() where id = $1", [review.credit_id, fields.status === "succeeded" ? "consumed" : "released"]);
    return saved;
  });
}

// Shapes validated model output into the stored review: rubric names and weights,
// bands and the overall score computed here, and component references limited to
// components that exist in the reviewed design.
export function normalize(data, design) {
  // Safety net for the prompt rule: any "[node-id]" left in text becomes the component's label.
  data = nameComponents(data, design.labels);
  const known = (ids) => [...new Set(ids)].filter((id) => design.componentIds.has(id));
  const byId = new Map(data.dimensions.map((dimension) => [dimension.id, dimension]));
  const dimensions = rubric.dimensions.map((definition) => {
    const entry = byId.get(definition.id);
    const band = bandFor(entry.score);
    return { id: definition.id, name: definition.name, weight: definition.weight, score: entry.score, rating: band.rating, ratingLabel: band.label, evidence: entry.evidence, improvement: entry.improvement };
  });
  const score = overallScore(Object.fromEntries(dimensions.map((dimension) => [dimension.id, dimension.score])));
  const band = bandFor(score / 10);
  const severityRank = { high: 0, medium: 1, low: 2 };
  return {
    summary: data.summary,
    overall: { score, rating: band.rating, ratingLabel: band.label },
    dimensions,
    strengths: data.strengths.map((strength) => ({ ...strength, nodeIds: known(strength.nodeIds) })),
    risks: [...data.risks].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).map((risk) => ({ ...risk, nodeIds: known(risk.nodeIds) })),
    nextSteps: data.nextSteps,
    followUpQuestions: data.followUpQuestions,
    assumptions: data.assumptions,
    reasoning: {
      summary: data.reasoningSummary,
      // Counted from the diagram, not judged by the model.
      coverage: {
        components: design.componentCount,
        explainedComponents: design.explainedCount,
        decisionNotes: design.decisionNoteCount,
        labelledConnections: design.labelledEdgeCount,
        connections: design.edgeCount,
      },
      decisions: data.decisions.map((decision) => ({ ...decision, nodeIds: known(decision.nodeIds) })),
    },
  };
}

// The same complete review is stored for every plan; scores and ratings are identical.
// Free accounts receive the scores plus the top strength and risk, and the detailed
// coaching never leaves the server for them.
function present(row, full) {
  const base = {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    diagramVersion: row.diagram_version,
    rubricVersion: row.rubric_version,
    sample: row.model === "fake",
  };
  if (row.status === "failed") return { ...base, errorCode: row.error_code };
  if (row.status !== "succeeded") return base;
  const review = row.result;
  if (full) return { ...base, access: "full", ...review, locked: null };
  return {
    ...base,
    access: "limited",
    summary: review.summary,
    overall: review.overall,
    dimensions: review.dimensions.map(({ evidence: _evidence, improvement: _improvement, ...dimension }) => dimension),
    strengths: review.strengths.slice(0, 1),
    risks: review.risks.slice(0, 1),
    nextSteps: [],
    followUpQuestions: [],
    assumptions: [],
    reasoning: review.reasoning ? { coverage: review.reasoning.coverage } : null,
    locked: {
      decisions: review.reasoning?.decisions.length ?? 0,
      strengths: Math.max(0, review.strengths.length - 1),
      risks: Math.max(0, review.risks.length - 1),
      nextSteps: review.nextSteps.length,
      followUpQuestions: review.followUpQuestions.length,
    },
  };
}

function limitMessage(kind, allowance) {
  if (kind === "round") {
    return allowance.plan === "plus"
      ? `You've used all ${allowance.round.limit} reviews for this round. Start a new round of this design to be reviewed again.`
      : "You've used this round's free review. Start a new round of this design to be reviewed again, or upgrade to Plus for more reviews per round.";
  }
  const resets = new Date(allowance.month.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return `You've used all ${allowance.month.limit} reviews included this month. Your allowance resets on ${resets}.`;
}

export const reviewsRouter = express.Router();
reviewsRouter.use(requireUser);

reviewsRouter.get("/sessions/:sessionId/reviews", route(async (req, res) => {
  const session = await ownedSession(req);
  await expireStale(db, session.id);
  const rows = await query("select * from ai_reviews where session_id = $1 and user_id = $2 order by created_at desc limit 20", [session.id, req.user.id]);
  const full = hasFullFeedback(req.user, session);
  // After a v3 round: what each agenda item got, and what a strong answer adds.
  const roundDebrief = session.status === "completed"
    ? await debrief(session.id, session.prompt_id).catch((error) => { console.error("[ai] debrief failed:", error.message); return null; })
    : null;
  // Whether this round had an interview, and whether its realism rating is in yet.
  const interview = await queryOne(
    `select s.engine, exists (select 1 from interview_ratings r where r.session_id = s.session_id) as rated,
            exists (select 1 from interview_turns t where t.session_id = s.session_id and t.role = 'learner') as spoke
       from interview_state s where s.session_id = $1`,
    [session.id]
  );
  res.json({
    reviews: rows.map((row) => present(row, full)),
    allowance: await readAllowance(db, req.user, session),
    aiAvailable: aiConfig.enabled,
    debrief: roundDebrief,
    interview: interview?.spoke ? { engine: interview.engine, rated: interview.rated } : null,
  });
}));

reviewsRouter.post("/sessions/:sessionId/reviews", route(async (req, res) => {
  const { requestId } = parse(requestBody, req.body);
  const session = await ownedSession(req);
  const full = hasFullFeedback(req.user, session);

  // A retried request (same requestId) returns what the first attempt produced.
  const replay = await queryOne("select * from ai_reviews where user_id = $1 and request_id = $2", [req.user.id, requestId]);
  if (replay) {
    if (replay.session_id !== session.id) throw new HttpError(409, "REQUEST_ID_REUSED", "This request id was already used for another round.");
    return res.json({ review: present(replay, full), reused: true, allowance: await readAllowance(db, req.user, session) });
  }

  if (!aiConfig.enabled) throw toHttpError(new AiError("DISABLED"));
  if (session.status !== "completed") throw new HttpError(409, "ROUND_NOT_FINISHED", "Finish the round to get its review.");
  const prompt = promptById.get(session.prompt_id);
  if (!prompt) throw new HttpError(404, "NOT_FOUND", "This design round is no longer available.");
  const design = describeDiagram(session.diagram);
  if (design.componentCount < MIN_COMPONENTS || design.edgeCount < MIN_CONNECTIONS) {
    throw new HttpError(422, "DESIGN_TOO_SMALL", `Add at least ${MIN_COMPONENTS} components and ${MIN_CONNECTIONS} connections so there's enough to review. No credit was used.`);
  }
  // On a v3 round the notepad carries pre-judged evidence, so the transcript can be shorter.
  const ledger = await reviewLedger(session.id, prompt.id);
  const transcript = await interviewTranscript(session.id, ledger ? 6_000 : 12_000);
  // The conversation is part of what is reviewed, so a changed transcript is a changed submission.
  const diagramHash = fingerprint(`${design.text}
${transcript}`);
  const guide = guideFor(prompt.id);
  const pool = await referencePoolFor(prompt.id);
  const templateVersion = reviewTemplateVersion(guide, pool, ledger);

  // Unchanged design under the same rubric: return the existing review, free of charge.
  const existing = await queryOne(
    `select * from ai_reviews where session_id = $1 and status = 'succeeded' and diagram_hash = $2 and rubric_version = $3 and template_version = $4
      order by created_at desc limit 1`,
    [session.id, diagramHash, rubric.version, templateVersion]
  );
  if (existing) return res.json({ review: present(existing, full), reused: true, allowance: await readAllowance(db, req.user, session) });

  if (!(await reviewLimiter(req.user.id))) throw new HttpError(429, "RATE_LIMITED", "Too many review requests. Try again later.");

  // Reserve the credit and create the pending review in one transaction. Locking the
  // user's row serialises concurrent requests from one learner so limits can't be overrun.
  let pending;
  try {
    pending = await transaction(async (conn) => {
      await conn.query("select id from users where id = $1 for update", [req.user.id]);
      await expireStale(conn, session.id);
      if (await conn.queryOne("select id from ai_reviews where session_id = $1 and status = 'pending'", [session.id])) {
        throw new HttpError(409, "REVIEW_IN_PROGRESS", "A review for this round is already being generated.");
      }
      const allowance = await readAllowance(conn, req.user, session);
      if (allowance.round.used >= allowance.round.limit) throw new HttpError(403, "REVIEW_LIMIT_ROUND", limitMessage("round", allowance));
      if (allowance.month.used >= allowance.month.limit) throw new HttpError(403, "REVIEW_LIMIT_MONTH", limitMessage("month", allowance));
      const credit = await conn.queryOne("insert into ai_credits (user_id, session_id, kind) values ($1, $2, 'review') returning id", [req.user.id, session.id]);
      return conn.queryOne(
        `insert into ai_reviews (session_id, user_id, credit_id, request_id, diagram_version, diagram_hash, prompt_id, prompt_version, rubric_version, template_version, provider, model, plan)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning *`,
        [session.id, req.user.id, credit.id, requestId, session.diagram_version, diagramHash, session.prompt_id, session.prompt_version, rubric.version, templateVersion, aiConfig.vendor, aiConfig.tasks.review.model, planFor(req.user)]
      );
    });
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "REVIEW_IN_PROGRESS", "A review for this round is already being generated.");
    throw error;
  }

  // Generation continues even if the learner disconnects; the result is stored and
  // shows up on their next read. Communication feedback runs alongside and is optional:
  // if it fails, the design review still stands.
  const conversation = await communicationInput(session.id);
  const communication = conversation
    ? runTask(communicationTask, { prompt, ...conversation }, { userId: req.user.id, sessionId: session.id })
      .then(({ data }) => ({ ...data, stats: conversation.stats, version: communicationTemplateVersion }))
      .catch((error) => { console.error("[ai] communication feedback failed:", error.code || error.message); return null; })
    : Promise.resolve(null);
  let output;
  try {
    output = await runTask(reviewTask, { prompt, design, guide, transcript, pool, ledger }, { userId: req.user.id, sessionId: session.id });
  } catch (error) {
    await communication;
    await settle(pending, { status: "failed", errorCode: error instanceof AiError ? error.code : "INTERNAL" });
    if (error instanceof AiError) throw toHttpError(error);
    throw error;
  }
  const result = { ...normalize(output.data, design), communication: await communication };
  const saved = await settle(pending, { status: "succeeded", result, model: output.model });
  res.status(201).json({ review: present(saved, full), reused: false, allowance: await readAllowance(db, req.user, session) });
}));
