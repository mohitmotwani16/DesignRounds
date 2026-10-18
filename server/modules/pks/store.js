import { query, queryOne, transaction } from "../../db.js";

// The only module that touches problem_packs and problem_pack_jobs.

const MAX_ATTEMPTS = 3;
const STALE_BUILDING = "20 minutes";

export async function packRow(promptId, version) {
  return queryOne("select * from problem_packs where prompt_id = $1 and version = $2", [promptId, version]);
}

export async function publishedRow(promptId) {
  return queryOne("select * from problem_packs where prompt_id = $1 and status = 'published'", [promptId]);
}

export async function packRows(promptId) {
  return query(
    `select prompt_id, version, inputs_fingerprint, status, builder, validation, reviewed_by, published_at, created_at
       from problem_packs where prompt_id = $1 order by created_at desc limit 20`,
    [promptId]
  );
}

// Saves a pack version. Versions are content hashes, so saving the same pack twice is a
// no-op. Publishing retires whichever version was published before, atomically.
export async function savePack({ pack, rendered, status, validation = {}, reviewedBy = null }) {
  return transaction(async (conn) => {
    if (status === "published") {
      await conn.query("update problem_packs set status = 'retired' where prompt_id = $1 and status = 'published' and version <> $2", [pack.promptId, pack.version]);
    }
    const row = await conn.queryOne(
      `insert into problem_packs (prompt_id, version, inputs_fingerprint, status, pack, rendered, builder, validation, reviewed_by, published_at)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9, case when $4 = 'published' then now() end)
       on conflict (prompt_id, version) do update
         set status = case when excluded.status = 'published' then 'published' else problem_packs.status end,
             published_at = case when excluded.status = 'published' then coalesce(problem_packs.published_at, now()) else problem_packs.published_at end,
             reviewed_by = coalesce(excluded.reviewed_by, problem_packs.reviewed_by)
       returning *`,
      [pack.promptId, pack.version, pack.inputsFingerprint, status, JSON.stringify(pack), JSON.stringify(rendered), pack.builder, JSON.stringify(validation), reviewedBy]
    );
    return row;
  });
}

export async function setStatus(promptId, version, status, reviewedBy = null) {
  return transaction(async (conn) => {
    const row = await conn.queryOne("select status from problem_packs where prompt_id = $1 and version = $2 for update", [promptId, version]);
    if (!row) return null;
    if (status === "published") {
      await conn.query("update problem_packs set status = 'retired' where prompt_id = $1 and status = 'published' and version <> $2", [promptId, version]);
    }
    return conn.queryOne(
      `update problem_packs set status = $3, reviewed_by = coalesce($4, reviewed_by),
              published_at = case when $3 = 'published' then now() else published_at end
        where prompt_id = $1 and version = $2 returning *`,
      [promptId, version, status, reviewedBy]
    );
  });
}

// A pending job for every question whose inputs have no pack yet. Never resets a job
// that is building; a changed fingerprint restarts the attempts.
export async function queueJob(promptId, fingerprint) {
  const existing = await queryOne(
    "select 1 from problem_packs where prompt_id = $1 and inputs_fingerprint = $2 and status in ('draft', 'published') limit 1",
    [promptId, fingerprint]
  );
  if (existing) return false;
  const row = await queryOne(
    `insert into problem_pack_jobs (prompt_id, inputs_fingerprint, status) values ($1, $2, 'pending')
     on conflict (prompt_id) do update
       set inputs_fingerprint = excluded.inputs_fingerprint, status = 'pending', attempts = 0, error_code = null, updated_at = now()
     where problem_pack_jobs.inputs_fingerprint is distinct from excluded.inputs_fingerprint
       and problem_pack_jobs.status <> 'building'
     returning prompt_id`,
    [promptId, fingerprint]
  );
  return Boolean(row);
}

export async function forceJob(promptId, fingerprint) {
  await query(
    `insert into problem_pack_jobs (prompt_id, inputs_fingerprint, status) values ($1, $2, 'pending')
     on conflict (prompt_id) do update set inputs_fingerprint = excluded.inputs_fingerprint, status = 'pending', attempts = 0, error_code = null, updated_at = now()
     where problem_pack_jobs.status <> 'building'`,
    [promptId, fingerprint]
  );
}

export async function claimJob(promptId = null) {
  const params = [];
  const only = promptId ? (params.push(promptId), "and prompt_id = $1") : "";
  return queryOne(
    `update problem_pack_jobs set status = 'building', attempts = attempts + 1, error_code = null, updated_at = now()
      where prompt_id = (
        select prompt_id from problem_pack_jobs
         where (status = 'pending'
                or (status = 'failed' and attempts < ${MAX_ATTEMPTS})
                or (status = 'building' and updated_at < now() - interval '${STALE_BUILDING}')) ${only}
         order by updated_at
         limit 1
         for update skip locked)
      returning prompt_id, inputs_fingerprint, attempts`,
    params
  );
}

// Puts a claimed job back without spending an attempt (its pool isn't ready yet).
export async function deferJob(promptId) {
  await query("update problem_pack_jobs set status = 'pending', attempts = greatest(attempts - 1, 0), updated_at = now() where prompt_id = $1 and status = 'building'", [promptId]);
}

export async function finishJob(promptId) {
  await query("update problem_pack_jobs set status = 'done', error_code = null, updated_at = now() where prompt_id = $1", [promptId]);
}

export async function failJob(promptId, errorCode) {
  await query(
    `update problem_pack_jobs set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'pending' end,
            error_code = $2, updated_at = now()
      where prompt_id = $1 and status = 'building'`,
    [promptId, errorCode]
  );
}

export async function jobRows() {
  return query("select prompt_id, inputs_fingerprint, status, attempts, error_code, updated_at from problem_pack_jobs");
}

export async function overviewRows() {
  return query(
    `select prompt_id,
            max(version) filter (where status = 'published') as published_version,
            max(published_at) filter (where status = 'published') as published_at,
            count(*) filter (where status = 'draft')::int as drafts,
            max(created_at) as last_built_at
       from problem_packs group by prompt_id`
  );
}

// Retired versions no in-progress round pins, after 30 days.
export async function pruneRetiredPacks() {
  const rows = await query(
    `with deleted as (
       delete from problem_packs p
        where p.status in ('retired', 'failed') and p.created_at < now() - interval '30 days'
          and not exists (
            select 1 from interview_state s join practice_sessions ps on ps.id = s.session_id
             where s.pack_version = p.version and ps.status = 'in_progress')
       returning 1)
     select count(*)::int as n from deleted`
  );
  return rows[0].n;
}
