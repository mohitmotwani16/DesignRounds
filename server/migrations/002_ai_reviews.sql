-- AI allowance ledger. A credit is reserved before a model call, consumed when the
-- result is saved, and released if generation fails, so failures never cost the
-- learner. Rows outlive a deleted round (session_id is cleared) so deleting a
-- round can't be used to win back monthly credits.
create table ai_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  session_id uuid references practice_sessions (id) on delete set null,
  kind text not null check (kind in ('review')),
  status text not null default 'reserved' check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_credits_user_kind_created_idx on ai_credits (user_id, kind, created_at desc);
create index ai_credits_session_idx on ai_credits (session_id, kind);

-- Final reviews of a round. The stored result is always the complete review;
-- what a learner sees is decided per plan when it is read.
create table ai_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references practice_sessions (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  credit_id uuid references ai_credits (id) on delete set null,
  request_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  diagram_version integer not null,
  diagram_hash text not null,
  prompt_id text not null,
  prompt_version integer not null,
  rubric_version text not null,
  template_version text not null,
  provider text,
  model text,
  overall_score integer check (overall_score between 0 and 100),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, request_id)
);
create index ai_reviews_session_created_idx on ai_reviews (session_id, created_at desc);
create unique index ai_reviews_one_pending_per_session on ai_reviews (session_id) where status = 'pending';

-- One row per model call: operational metadata only, never prompt or output text.
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  session_id uuid references practice_sessions (id) on delete set null,
  task text not null,
  provider text not null,
  model text not null,
  outcome text not null,
  attempts integer not null default 1,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer not null,
  created_at timestamptz not null default now()
);
create index ai_usage_created_idx on ai_usage (created_at desc);
create index ai_usage_user_created_idx on ai_usage (user_id, created_at desc);
