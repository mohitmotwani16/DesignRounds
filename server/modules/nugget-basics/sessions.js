import { z } from "zod";
import { queryOne } from "../../db.js";
import { HttpError, parse } from "../../http.js";
import { GUEST_SYSTEM_USER_ID, NUGGET_BASICS_PARENT } from "../guest.js";
import { getNugget, publicNuggetSummary } from "../nuggets/index.js";
import { promptById } from "../rounds.js";

const uuid = z.string().uuid();

export function nuggetPayload(nuggetId) {
  const nugget = getNugget(nuggetId);
  if (!nugget) return null;
  return {
    ...publicNuggetSummary(nugget),
    symptoms: nugget.scenario.symptoms,
    incident: nugget.incident,
    minutes: nugget.minutes,
    format: nugget.basics?.format ?? "diagram",
  };
}

export function sessionResponse(row, { brief = null, resumed, guest = false } = {}) {
  const prompt = promptById.get(row.prompt_id);
  const base = {
    id: row.id,
    promptId: row.prompt_id,
    promptTitle: prompt?.title ?? row.prompt_id,
    track: prompt?.track ?? null,
    status: row.status,
    sessionKind: row.session_kind ?? "full",
    nuggetId: row.nugget_id ?? null,
    componentCount: row.diagram?.nodes?.length ?? 0,
    diagramVersion: row.diagram_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    interviewerTrial: Boolean(row.interviewer_trial),
    guest,
    basicsOnly: row.prompt_id === NUGGET_BASICS_PARENT,
  };
  const session = { ...base, diagram: row.diagram, brief, resumed };
  if (row.session_kind === "nugget" && row.nugget_id) session.nugget = nuggetPayload(row.nugget_id);
  return session;
}

export async function createNuggetBasicsSession({ userId, guestTokenHash, nugget }) {
  const prompt = promptById.get(NUGGET_BASICS_PARENT);
  const diagram = nugget.diagram ?? { nodes: [], edges: [] };
  const ownerId = userId ?? GUEST_SYSTEM_USER_ID;
  return queryOne(
    `insert into practice_sessions (user_id, guest_token_hash, prompt_id, prompt_version, session_kind, nugget_id, diagram)
     values ($1, $2, $3, $4, 'nugget', $5, $6::jsonb)
     returning *`,
    [ownerId, guestTokenHash, NUGGET_BASICS_PARENT, prompt?.version ?? 1, nugget.id, JSON.stringify(diagram)],
  );
}

/** Resolve session owned by signed-in user or guest cookie. */
export async function getSessionForActor(req) {
  const sessionId = parse(uuid, req.params.sessionId);
  if (req.user) {
    const row = await queryOne(
      "select * from practice_sessions where id = $1 and user_id = $2 and guest_token_hash is null",
      [sessionId, req.user.id],
    );
    if (row) return row;
  }
  if (req.guestTokenHash) {
    const row = await queryOne(
      "select * from practice_sessions where id = $1 and guest_token_hash = $2",
      [sessionId, req.guestTokenHash],
    );
    if (row) return row;
  }
  throw new HttpError(404, "NOT_FOUND", "Practice round not found.");
}

export function isGuestSession(row) {
  return Boolean(row?.guest_token_hash);
}

/** Ownership predicate for UPDATE/DELETE on a row already authorized via ownedSession. */
export function sessionOwnerWhere(row, paramIndex = 1) {
  if (row.guest_token_hash) {
    return {
      clause: `id = $${paramIndex} and guest_token_hash = $${paramIndex + 1}`,
      params: [row.id, row.guest_token_hash],
    };
  }
  return {
    clause: `id = $${paramIndex} and user_id = $${paramIndex + 1} and guest_token_hash is null`,
    params: [row.id, row.user_id],
  };
}