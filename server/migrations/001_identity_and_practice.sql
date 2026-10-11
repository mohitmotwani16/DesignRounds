-- Identity: one row per learner, keyed by a normalized (lowercase) email.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text,
  headline text,
  target_role text,
  experience_level text,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  onboarded_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One-time sign-in codes. Only an HMAC of the code is stored.
create table login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  request_ip text,
  created_at timestamptz not null default now()
);
create index login_codes_email_created_idx on login_codes (email, created_at desc);

-- Browser sign-in sessions. The cookie carries a random token; only its SHA-256 is stored.
create table auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index auth_sessions_user_idx on auth_sessions (user_id);

-- A learner's attempt at a prompt. The current diagram lives on the row;
-- periodic checkpoints go to diagram_versions.
create table practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  prompt_id text not null,
  prompt_version integer not null default 1,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  diagram jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  diagram_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index practice_sessions_user_updated_idx on practice_sessions (user_id, updated_at desc);
create unique index practice_sessions_one_active_per_prompt on practice_sessions (user_id, prompt_id) where status = 'in_progress';

create table diagram_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references practice_sessions (id) on delete cascade,
  version integer not null,
  diagram jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, version)
);
