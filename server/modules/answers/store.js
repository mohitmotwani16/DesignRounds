import { query, queryOne, transaction } from "../../db.js";
import { prompts } from "../../../src/data/prompts.js";
import { promptFingerprint } from "./fingerprint.js";
import { renderPool } from "./task.js";

const MAX_ATTEMPTS = 3;
const STALE_BUILDING = "15 minutes";

export function catalogEntries() {
  return prompts.map((prompt) => ({ prompt, fingerprint: promptFingerprint(prompt) }));
}

// Records a pending pool for every question that is new or whose brief changed.
// Safe to run on every boot, including serverless cold starts.
export async function syncAnswerPools() {
  const entries = catalogEntries();
  let pending = 0;
  for (const { prompt, fingerprint } of entries) {
    const row = await queryOne(
      `insert into answer_pools (prompt_id, prompt_fingerprint, status)
       values ($1, $2, 'pending')
       on conflict (prompt_id) do update
         set prompt_fingerprint = excluded.prompt_fingerprint,
             status = 'pending',
             pool = null,
             model = null,
             error_code = null,
             attempts = 0,
             built_at = null,
             updated_at = now()
       where answer_pools.prompt_fingerprint is distinct from excluded.prompt_fingerprint
         and answer_pools.status <> 'building'
       returning prompt_id`,
      [prompt.id, fingerprint]
    );
    if (row) pending += 1;
  }
  const ids = entries.map(({ prompt }) => prompt.id);
  if (ids.length) await query("delete from answer_pools where not (prompt_id = any($1::text[]))", [ids]);
  return { pending, total: ids.length };
}

export async function claimAnswerPool(promptId = null) {
  const params = [];
  const only = promptId ? (params.push(promptId), "and prompt_id = $1") : "";
  return queryOne(
    `update answer_pools
        set status = 'building', attempts = attempts + 1, error_code = null, updated_at = now()
      where prompt_id = (
        select prompt_id from answer_pools
         where (
           status = 'pending'
           or (status = 'failed' and attempts < ${MAX_ATTEMPTS})
           or (status = 'building' and updated_at < now() - interval '${STALE_BUILDING}')
         ) ${only}
         order by updated_at desc
         limit 1
         for update skip locked
      )
      returning prompt_id, prompt_fingerprint, attempts`,
    params
  );
}

export async function saveAnswerPool({ promptId, fingerprint, pool, model, sources }) {
  return transaction(async (conn) => {
    await conn.query("delete from answer_pool_sources where prompt_id = $1", [promptId]);
    for (const source of sources) {
      await conn.query(
        `insert into answer_pool_sources (prompt_id, url, title, kind, excerpt)
         values ($1, $2, $3, $4, $5)
         on conflict (prompt_id, url) do update set title = excluded.title, kind = excluded.kind, excerpt = excluded.excerpt, retrieved_at = now()`,
        [promptId, source.url, source.title || null, source.kind, source.excerpt]
      );
    }
    const saved = await conn.queryOne(
      `update answer_pools
          set status = 'ready', pool = $3::jsonb, model = $4, error_code = null, built_at = now(), updated_at = now()
        where prompt_id = $1 and prompt_fingerprint = $2
        returning prompt_id`,
      [promptId, fingerprint, JSON.stringify(pool), model]
    );
    if (!saved) {
      await conn.query(
        `update answer_pools
            set status = 'pending', attempts = 0, updated_at = now()
          where prompt_id = $1 and status = 'building'`,
        [promptId]
      );
    }
    return Boolean(saved);
  });
}

export async function failAnswerPool(promptId, errorCode) {
  await query(
    `update answer_pools
        set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'pending' end,
            error_code = $2,
            updated_at = now()
      where prompt_id = $1 and status = 'building'`,
    [promptId, errorCode]
  );
}

// Ready pool for a review. Null until the first successful build.
export async function referencePoolFor(promptId) {
  const row = await queryOne(
    "select prompt_fingerprint, pool from answer_pools where prompt_id = $1 and status = 'ready' and pool is not null",
    [promptId]
  );
  if (!row?.pool) return null;
  return { fingerprint: row.prompt_fingerprint, text: renderPool(row.pool) };
}
