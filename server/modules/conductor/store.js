import { query, queryOne, transaction } from "../../db.js";

// The only Conductor module that touches interview_* tables. Canonical state lives in
// Postgres; model context is rebuilt from it on every turn and is never the store.

export const RECENT_TURNS = 24;

const TURNS_WITH_AUDIO = `select t.*, a.duration_ms as audio_duration_ms, a.delivery
  from interview_turns t left join interview_audio a on a.turn_id = t.id`;

export function toItem(row) {
  return {
    itemId: row.item_id,
    position: row.position,
    stage: row.stage,
    dimension: row.dimension,
    weight: row.weight,
    required: row.required,
    status: row.status,
    band: row.band,
    followUps: row.follow_ups,
    hintLevel: row.hint_level,
    challenges: row.challenges,
    misconceptions: row.misconceptions ?? [],
    evidence: row.evidence ?? [],
    openedSeq: row.opened_seq,
    closedSeq: row.closed_seq,
  };
}

export function toRound(state) {
  return {
    engine: state.engine,
    mode: state.mode,
    ucsVersion: state.ucs_version,
    packVersion: state.pack_version,
    candidate: state.candidate_snapshot,
    stage: state.stage,
    focusItemId: state.focus_item_id,
    assumptions: state.assumptions ?? [],
    activeMs: Number(state.active_ms),
    stageStartedMs: Number(state.stage_started_ms),
    lastActivityAt: state.last_activity_at,
    timeWarnings: (state.time_warnings ?? []).map(Number),
    clarificationsAsked: state.clarifications_asked ?? [],
    ledgerVersion: state.ledger_version,
    hintsUsed: state.hints_used,
    summary: state.summary,
    summarizedThrough: state.summarized_through,
    covered: state.covered ?? [],
    snapshot: state.snapshot,
    proactiveChecks: state.proactive_checks,
    lastProactiveAt: state.last_proactive_at,
    lastNudgeAt: state.last_nudge_at,
    pendingSince: state.pending_since,
  };
}

export async function loadItems(conn, sessionId) {
  return (await conn.query("select * from interview_agenda_items where session_id = $1 order by position", [sessionId])).map(toItem);
}

export async function recentTurns(sessionId, summarizedThrough) {
  const rows = await query(`${TURNS_WITH_AUDIO} where t.session_id = $1 and t.seq > $2 order by t.seq desc limit $3`, [sessionId, summarizedThrough, RECENT_TURNS]);
  return rows.reverse();
}

export async function lastTurns(sessionId) {
  const last = await queryOne("select role, kind, created_at from interview_turns where session_id = $1 order by seq desc limit 1", [sessionId]);
  const learner = await queryOne("select created_at from interview_turns where session_id = $1 and role = 'learner' order by seq desc limit 1", [sessionId]);
  return { last: last ? { role: last.role, kind: last.kind, at: last.created_at } : null, lastLearnerAt: learner?.created_at ?? null };
}

async function nextSeq(conn, sessionId) {
  const row = await conn.queryOne("select coalesce(max(seq), 0) + 1 as seq from interview_turns where session_id = $1", [sessionId]);
  return Number(row.seq);
}

export async function appendEvents(conn, sessionId, events) {
  for (const event of events) {
    await conn.query("insert into interview_events (session_id, type, payload) values ($1, $2, $3::jsonb)", [sessionId, event.type, JSON.stringify(event.payload ?? {})]);
  }
}

async function writeItems(conn, sessionId, items, before) {
  const previous = new Map(before.map((item) => [item.itemId, JSON.stringify(item)]));
  for (const item of items) {
    if (previous.get(item.itemId) === JSON.stringify(item)) continue;
    await conn.query(
      `update interview_agenda_items
          set status = $3, band = $4, follow_ups = $5, hint_level = $6, challenges = $7,
              misconceptions = $8::jsonb, evidence = $9::jsonb, opened_seq = $10, closed_seq = $11
        where session_id = $1 and item_id = $2`,
      [sessionId, item.itemId, item.status, item.band, item.followUps, item.hintLevel, item.challenges, JSON.stringify(item.misconceptions), JSON.stringify(item.evidence), item.openedSeq, item.closedSeq]
    );
  }
}

// The opening, inside the caller's transaction: pin everything, copy the agenda, say
// the pack's opening line and open the first requirements item silently.
export async function createRound(conn, { session, pins, agenda, openingText, firstItemId }) {
  for (const [position, item] of agenda.entries()) {
    await conn.query(
      `insert into interview_agenda_items (session_id, item_id, position, stage, dimension, weight, required, status, opened_seq)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict do nothing`,
      [session.id, item.id, position, item.stage, item.dimension, item.weight, item.required, item.id === firstItemId ? "open" : "pending", item.id === firstItemId ? 1 : null]
    );
  }
  await conn.query(
    `update interview_state
        set engine = 'v3', mode = $2, ucs_version = $3, pack_version = $4, ai_route = $5, candidate_snapshot = $6::jsonb,
            focus_item_id = $7, stage = 'requirements', stage_started_ms = 0, active_ms = 0, last_activity_at = now(), updated_at = now()
      where session_id = $1`,
    [session.id, pins.mode, pins.ucsVersion, pins.packVersion, pins.route, JSON.stringify(pins.candidate), firstItemId]
  );
  await conn.query(
    "insert into interview_turns (session_id, user_id, seq, role, kind, trigger, content, move, agenda_item_id) values ($1, $2, 1, 'interviewer', 'opening', 'opening', $3, 'open', $4)",
    [session.id, session.user_id, openingText, firstItemId]
  );
  await appendEvents(conn, session.id, [{ type: "round_started", payload: { mode: pins.mode, ucsVersion: pins.ucsVersion, packVersion: pins.packVersion, route: pins.route, items: agenda.length } }]);
}

// Everything one interviewer turn changes, atomically: the learner turn's private notes,
// the interviewer turn, the ledger, the state, the events, and the credit.
export class RoundBusy extends Error {}

// `idleAt` (template ticks): the ledger version the tick was decided on. The save takes
// the same row lock as a learner's reservation and backs off if a reply is pending or
// the ledger moved since, so a tick can't slip a turn between a learner's message and
// the interviewer's reply.
export async function saveTurn({ session, before, result, learnerTurn, notes, interviewer, stateExtras, creditId, idleAt = null }) {
  return transaction(async (conn) => {
    if (idleAt !== null) {
      await conn.query("select id from practice_sessions where id = $1 for update", [session.id]);
      const fresh = await conn.queryOne("select pending_since, ledger_version from interview_state where session_id = $1", [session.id]);
      if (fresh.pending_since && Date.now() - new Date(fresh.pending_since).getTime() < 90_000) throw new RoundBusy();
      if (fresh.ledger_version !== idleAt) throw new RoundBusy();
    }
    if (learnerTurn && notes) {
      await conn.query(
        "update interview_turns set communication = $2::jsonb, answer_context = $3::jsonb, assessment = $4::jsonb where id = $1",
        [learnerTurn.id, JSON.stringify(notes.communication), JSON.stringify(notes.answerContext), JSON.stringify(notes.assessment)]
      );
    }
    let turn = null;
    if (interviewer) {
      const seq = await nextSeq(conn, session.id);
      turn = await conn.queryOne(
        `insert into interview_turns (session_id, user_id, seq, role, kind, trigger, content, node_ids, diagram_version, move, agenda_item_id)
         values ($1, $2, $3, 'interviewer', $4, $5, $6, $7::jsonb, $8, $9, $10) returning *`,
        [session.id, session.user_id, seq, interviewer.kind, interviewer.trigger, interviewer.content, JSON.stringify(interviewer.nodeIds ?? []), session.diagram_version, interviewer.move, interviewer.agendaItemId]
      );
    }
    await writeItems(conn, session.id, result.items, before);
    const state = await conn.queryOne(
      `update interview_state
          set stage = $2, focus_item_id = $3, assumptions = $4::jsonb, stage_started_ms = $5, hints_used = $6,
              clarifications_asked = $7::jsonb, ledger_version = $8, active_ms = $9, last_activity_at = now(),
              covered = $10::jsonb, snapshot = $11::jsonb, time_warnings = $12::jsonb,
              proactive_checks = proactive_checks + $13, last_proactive_at = case when $13 > 0 then now() else last_proactive_at end,
              last_nudge_at = case when $14 then now() else last_nudge_at end,
              last_tick_key = coalesce($15, last_tick_key),
              pending_since = null, updated_at = now()
        where session_id = $1 returning *`,
      [session.id, result.state.stage, result.state.focusItemId, JSON.stringify(result.state.assumptions), result.state.stageStartedMs, result.state.hintsUsed,
        JSON.stringify(result.state.clarificationsAsked), result.state.ledgerVersion, stateExtras.activeMs,
        JSON.stringify(stateExtras.covered), JSON.stringify(stateExtras.snapshot), JSON.stringify(stateExtras.timeWarnings),
        stateExtras.proactive ? 1 : 0, Boolean(stateExtras.nudged), stateExtras.tickKey ?? null]
    );
    await appendEvents(conn, session.id, result.events);
    if (creditId) await conn.query("update ai_credits set status = 'consumed', updated_at = now() where id = $1", [creditId]);
    return { turn, state };
  });
}

// A tick that changes only the clock or the absorbed canvas.
export async function touchState(sessionId, { activeMs, snapshot = undefined, tickKey = null }) {
  return queryOne(
    `update interview_state set active_ms = $2, last_activity_at = now(),
            snapshot = coalesce($3::jsonb, snapshot), last_tick_key = coalesce($4, last_tick_key), updated_at = now()
      where session_id = $1 returning *`,
    [sessionId, activeMs, snapshot === undefined ? null : JSON.stringify(snapshot), tickKey]
  );
}

// One tick in flight per round; a second concurrent tick is a quiet no-op.
export async function claimTick(sessionId) {
  return queryOne(
    `update interview_state set tick_in_flight_at = now()
      where session_id = $1 and (tick_in_flight_at is null or tick_in_flight_at < now() - interval '60 seconds')
      returning session_id`,
    [sessionId]
  );
}

export async function releaseTick(sessionId) {
  await query("update interview_state set tick_in_flight_at = null where session_id = $1", [sessionId]);
}

export async function itemsFor(sessionId) {
  return (await query("select * from interview_agenda_items where session_id = $1 order by position", [sessionId])).map(toItem);
}

export async function logEvents(sessionId, events) {
  await transaction((conn) => appendEvents(conn, sessionId, events));
}
