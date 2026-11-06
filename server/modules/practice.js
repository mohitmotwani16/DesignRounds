import express from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { HttpError, createLimiter, parse, route } from "../http.js";
import { deleteInterviewAudioForSession } from "../object-storage.js";
import { requireUser } from "./identity.js";
import { briefFor, canAccessRound, promptById } from "./rounds.js";
import { getNugget, pickNugget, publicNuggetSummary } from "./nuggets/index.js";
import { maybeUpgradeScaffoldParent } from "./nuggets/live.js";

const CHECKPOINT_INTERVAL_MS = 5 * 60_000;
const MAX_NODES = 400;
const MAX_EDGES = 800;

// Each round can hold a 600 KB design, so unlimited new rounds would let one account fill
// the database. Far above what anyone practising needs; resuming a round doesn't count.
const hourlyRoundLimiter = createLimiter({ name: "round-create-hour", windowMs: 60 * 60_000, max: 30 });
const dailyRoundLimiter = createLimiter({ name: "round-create-day", windowMs: 24 * 60 * 60_000, max: 120 });

async function assertCanCreateRound(user) {
  if (!(await hourlyRoundLimiter(user.id)) || !(await dailyRoundLimiter(user.id))) {
    throw new HttpError(429, "RATE_LIMITED", "You've started a lot of rounds recently. Try again a little later.");
  }
}

// Rounds (including Plus briefs) and entitlements live in rounds.js.
export { promptById };
export const canStartPrompt = canAccessRound;

const finite = z.number().finite().min(-1e6).max(1e6);
const id = z.string().min(1).max(80);
// A data model table's columns (tableNode; see src/workspace/diagram.js cleanColumns).
const columnSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.string().max(40).optional(),
  keys: z.array(z.enum(["pk", "fk", "part", "sort"])).max(4).optional(),
  ref: z.string().max(120).optional(),
});
const nodeSchema = z.object({
  id,
  type: z.enum(["systemNode", "groupNode", "textNode", "noteNode", "tableNode", "pointNode"]),
  position: z.object({ x: finite, y: finite }),
  width: z.number().finite().min(20).max(4000).optional(),
  height: z.number().finite().min(20).max(4000).optional(),
  zIndex: z.number().int().min(-10).max(1000).optional(),
  data: z.object({
    kind: z.string().max(64),
    label: z.string().max(120),
    subtitle: z.string().max(120).optional(),
    note: z.string().max(2000).optional(),
    color: z.string().max(24).optional(),
    columns: z.array(columnSchema).max(60).optional(),
  }),
});
const edgeSchema = z.object({
  id,
  source: id,
  target: id,
  sourceHandle: z.string().max(40).nullable().optional(),
  targetHandle: z.string().max(40).nullable().optional(),
  label: z.string().max(80).optional(),
  data: z.object({
    style: z.enum(["sync", "async"]).optional(),
    bidirectional: z.boolean().optional(),
    bend: z.object({ x: finite, y: finite }).optional(),
  }).optional(),
});
const diagramSchema = z.object({
  nodes: z.array(nodeSchema).max(MAX_NODES),
  edges: z.array(edgeSchema).max(MAX_EDGES),
  viewport: z.object({ x: finite, y: finite, zoom: z.number().finite().min(0.05).max(8) }).optional(),
}).superRefine((diagram, ctx) => {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  if (nodeIds.size !== diagram.nodes.length) ctx.addIssue({ code: "custom", message: "duplicate node id" });
  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      ctx.addIssue({ code: "custom", message: `edge ${edge.id} references a missing node` });
      return;
    }
  }
});

// interviewMode: guided or realistic for the live interviewer; unset picks the default
// for the learner and question when the interview opens.
const fullStartBody = z.object({ promptId: z.string().max(80), interviewMode: z.enum(["guided", "realistic"]).optional() });
const nuggetStartBody = z.union([
  z.object({ nuggetId: z.string().max(120) }),
  z.object({ parentPromptId: z.string().max(80), pick: z.literal("random_nugget") }),
  z.object({ pick: z.literal("random_nugget") }),
]);
const createBody = z.union([fullStartBody, nuggetStartBody]);
const saveBody = z.object({ version: z.number().int().min(0), diagram: diagramSchema });
const updateBody = z.object({ status: z.enum(["completed", "in_progress"]) }).strict();
const uuid = z.string().uuid();

function toSummary(row) {
  const prompt = promptById.get(row.prompt_id);
  return {
    id: row.id,
    promptId: row.prompt_id,
    promptTitle: prompt?.title ?? row.prompt_id,
    track: prompt?.track ?? null,
    status: row.status,
    sessionKind: row.session_kind ?? "full",
    nuggetId: row.nugget_id ?? null,
    componentCount: row.component_count ?? row.diagram?.nodes?.length ?? 0,
    diagramVersion: row.diagram_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    interviewerTrial: Boolean(row.interviewer_trial),
  };
}

function nuggetPayload(nuggetId) {
  const nugget = getNugget(nuggetId);
  if (!nugget) return null;
  return {
    ...publicNuggetSummary(nugget),
    symptoms: nugget.scenario.symptoms,
    incident: nugget.incident,
    minutes: nugget.minutes,
  };
}

function sessionResponse(row, { brief = null, resumed }) {
  const base = { ...toSummary(row), diagram: row.diagram, brief, resumed };
  if (row.session_kind === "nugget" && row.nugget_id) base.nugget = nuggetPayload(row.nugget_id);
  return base;
}

export async function ownedSession(req) {
  const sessionId = parse(uuid, req.params.sessionId);
  // Ownership is part of the lookup, so another user's id behaves like a missing one.
  const row = await queryOne("select * from practice_sessions where id = $1 and user_id = $2", [sessionId, req.user.id]);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Practice round not found.");
  return row;
}

export const practiceRouter = express.Router();
practiceRouter.use(requireUser);

practiceRouter.get("/sessions", route(async (req, res) => {
  const rows = await query(
    `select id, prompt_id, status, session_kind, nugget_id, diagram_version, created_at, updated_at, completed_at, interviewer_trial,
            jsonb_array_length(diagram -> 'nodes') as component_count
       from practice_sessions where user_id = $1
      order by updated_at desc limit 200`,
    [req.user.id]
  );
  res.json({ sessions: rows.map(toSummary) });
}));

function pickError(error) {
  const map = {
    NOT_FOUND: [404, "NOT_FOUND", "Unknown nugget."],
    PLAN_REQUIRED: [403, "PLAN_REQUIRED", "This nugget belongs to a Plus round."],
    NO_NUGGETS: [404, "NO_NUGGETS", "No nuggets are available yet for that selection."],
    INVALID_PICK: [400, "INVALID_REQUEST", "Specify a nugget, a parent question, or random pick."],
  };
  const entry = map[error.message];
  if (entry) throw new HttpError(entry[0], entry[1], entry[2]);
  throw error;
}

// Resumes the learner's in-progress round for a prompt or nugget, or starts a new one.
practiceRouter.post("/sessions", route(async (req, res) => {
  const body = parse(createBody, req.body);

  if ("promptId" in body) {
    const { promptId, interviewMode } = body;
    const prompt = promptById.get(promptId);
    if (!prompt) throw new HttpError(404, "NOT_FOUND", "Unknown design round.");
    if (!canStartPrompt(req.user, prompt)) throw new HttpError(403, "PLAN_REQUIRED", "This round is part of the Plus plan.");

    const existing = await queryOne(
      "select * from practice_sessions where user_id = $1 and prompt_id = $2 and status = 'in_progress' and session_kind = 'full'",
      [req.user.id, promptId]
    );
    if (existing) return res.json({ session: sessionResponse(existing, { brief: briefFor(prompt), resumed: true }) });
    await assertCanCreateRound(req.user);

    const created = await queryOne(
      `insert into practice_sessions (user_id, prompt_id, prompt_version, interview_mode, session_kind)
       values ($1, $2, $3, $4, 'full')
       on conflict (user_id, prompt_id) where status = 'in_progress' and session_kind = 'full' do update set updated_at = practice_sessions.updated_at
       returning *`,
      [req.user.id, promptId, prompt.version ?? 1, interviewMode ?? null]
    );
    return res.status(201).json({ session: sessionResponse(created, { brief: briefFor(prompt), resumed: false }) });
  }

  let nugget;
  try {
    if ("nuggetId" in body) nugget = pickNugget(req.user, { nuggetId: body.nuggetId });
    else if ("parentPromptId" in body) nugget = pickNugget(req.user, { parentPromptId: body.parentPromptId, random: true });
    else nugget = pickNugget(req.user, { random: true });
  } catch (error) {
    pickError(error);
  }
  maybeUpgradeScaffoldParent(nugget.parentPromptId);

  const prompt = promptById.get(nugget.parentPromptId);
  const existing = await queryOne(
    "select * from practice_sessions where user_id = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'",
    [req.user.id, nugget.id]
  );
  if (existing) return res.json({ session: sessionResponse(existing, { brief: prompt ? briefFor(prompt) : null, resumed: true }) });
  await assertCanCreateRound(req.user);

  const created = await queryOne(
    `insert into practice_sessions (user_id, prompt_id, prompt_version, session_kind, nugget_id, diagram)
     values ($1, $2, $3, 'nugget', $4, $5::jsonb)
     returning *`,
    [req.user.id, nugget.parentPromptId, prompt?.version ?? 1, nugget.id, JSON.stringify(nugget.diagram)]
  );
  return res.status(201).json({ session: sessionResponse(created, { brief: prompt ? briefFor(prompt) : null, resumed: false }) });
}));

practiceRouter.get("/sessions/:sessionId", route(async (req, res) => {
  const row = await ownedSession(req);
  // The owner keeps their round's brief even if their plan changes later.
  const prompt = promptById.get(row.prompt_id);
  res.json({ session: sessionResponse(row, { brief: prompt ? briefFor(prompt) : null, resumed: undefined }) });
}));

practiceRouter.put("/sessions/:sessionId/diagram", route(async (req, res) => {
  const row = await ownedSession(req);
  const { version, diagram } = parse(saveBody, req.body);
  if (row.status !== "in_progress") throw new HttpError(409, "ROUND_COMPLETED", "This round is finished. Reopen it to keep editing.");

  // Optimistic concurrency: a stale tab can't overwrite newer work.
  const saved = await queryOne(
    `update practice_sessions
        set diagram = $1::jsonb, diagram_version = diagram_version + 1, updated_at = now()
      where id = $2 and user_id = $3 and diagram_version = $4
      returning diagram_version, updated_at`,
    [JSON.stringify(diagram), row.id, req.user.id, version]
  );
  if (!saved) throw new HttpError(409, "VERSION_CONFLICT", "This design was changed in another tab. Reload to get the latest version.");

  const lastCheckpoint = await queryOne("select max(created_at) as at from diagram_versions where session_id = $1", [row.id]);
  if (!lastCheckpoint.at || Date.now() - new Date(lastCheckpoint.at).getTime() > CHECKPOINT_INTERVAL_MS) {
    await query(
      "insert into diagram_versions (session_id, version, diagram) values ($1, $2, $3::jsonb) on conflict do nothing",
      [row.id, saved.diagram_version, JSON.stringify(diagram)]
    );
  }
  res.json({ version: saved.diagram_version, savedAt: saved.updated_at });
}));

practiceRouter.patch("/sessions/:sessionId", route(async (req, res) => {
  const row = await ownedSession(req);
  const { status } = parse(updateBody, req.body);
  if (status === "in_progress" && row.status !== "in_progress") {
    if (row.session_kind === "nugget") {
      const other = await queryOne(
        "select id from practice_sessions where user_id = $1 and nugget_id = $2 and status = 'in_progress' and id <> $3",
        [req.user.id, row.nugget_id, row.id]
      );
      if (other) throw new HttpError(409, "ROUND_ALREADY_OPEN", "You already have an open session for this nugget.");
    } else {
      const other = await queryOne(
        "select id from practice_sessions where user_id = $1 and prompt_id = $2 and status = 'in_progress' and session_kind = 'full' and id <> $3",
        [req.user.id, row.prompt_id, row.id]
      );
      if (other) throw new HttpError(409, "ROUND_ALREADY_OPEN", "You already have an open round for this design.");
    }
  }
  const updated = await queryOne(
    `update practice_sessions
        set status = $1::text, completed_at = case when $1::text = 'completed' then now() else null end, updated_at = now()
      where id = $2 and user_id = $3 returning *`,
    [status, row.id, req.user.id]
  ).catch((error) => {
    // A concurrent reopen of another round for this prompt won the unique index.
    if (error.code === "23505") throw new HttpError(409, "ROUND_ALREADY_OPEN", "You already have an open round for this design.");
    throw error;
  });
  res.json({ session: toSummary(updated) });
}));

practiceRouter.delete("/sessions/:sessionId", route(async (req, res) => {
  const row = await ownedSession(req);
  await deleteInterviewAudioForSession(row.id);
  await query("delete from practice_sessions where id = $1 and user_id = $2", [row.id, req.user.id]);
  res.json({ ok: true });
}));
