-- Reference answer pools for review calibration. One row per question in the
-- bank. The pool is original synthesis (never a copied article); sources keep
-- a short excerpt and a URL so a pool can be audited. Server-only: nothing
-- here is returned to the browser.
create table answer_pools (
  prompt_id text primary key,
  prompt_fingerprint text not null,
  status text not null default 'pending' check (status in ('pending', 'building', 'ready', 'failed')),
  pool jsonb,
  model text,
  error_code text,
  attempts integer not null default 0,
  built_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index answer_pools_status_updated_idx on answer_pools (status, updated_at desc);

create table answer_pool_sources (
  id uuid primary key default gen_random_uuid(),
  prompt_id text not null references answer_pools (prompt_id) on delete cascade,
  url text not null,
  title text,
  kind text not null check (kind in ('blog', 'transcript', 'docs', 'forum', 'other')),
  excerpt text not null,
  retrieved_at timestamptz not null default now(),
  unique (prompt_id, url)
);
create index answer_pool_sources_prompt_idx on answer_pool_sources (prompt_id);
