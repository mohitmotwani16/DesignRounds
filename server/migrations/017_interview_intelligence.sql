-- Interview intelligence (docs/design): the Universal Context Setter's retained
-- versions, the Problem Knowledge Service's packs, and the Interview Conductor's
-- ledger and event log. Additive only: rounds already in progress keep running on
-- the v2 interviewer, which ignores every new column.

-- UCS: rendered interviewer context per version, so a round finishes on the text it
-- started with even after a deploy changes it. Written at boot, insert-only.
create table ucs_versions (
  version text not null,
  task text not null,
  mode text not null,
  text text not null,
  created_at timestamptz not null default now(),
  primary key (version, task, mode)
);

-- PKS: one immutable Problem Pack per question version.
create table problem_packs (
  prompt_id text not null,
  version text not null,
  inputs_fingerprint text not null,
  status text not null check (status in ('draft', 'published', 'retired', 'failed')),
  pack jsonb not null,
  rendered jsonb not null,
  builder text not null,
  validation jsonb not null default '{}'::jsonb,
  reviewed_by uuid references users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (prompt_id, version)
);
create unique index problem_packs_one_published on problem_packs (prompt_id) where status = 'published';

create table problem_pack_jobs (
  prompt_id text primary key,
  inputs_fingerprint text not null,
  status text not null check (status in ('pending', 'building', 'done', 'failed')),
  attempts integer not null default 0,
  error_code text,
  updated_at timestamptz not null default now()
);
create index problem_pack_jobs_status_idx on problem_pack_jobs (status, updated_at);

alter table ucs_versions enable row level security;
alter table problem_packs enable row level security;
alter table problem_pack_jobs enable row level security;

-- The mode a learner picked when starting the round (null = the default for them).
alter table practice_sessions add column interview_mode text check (interview_mode in ('guided', 'realistic'));

-- Conductor state. `engine` says which interviewer runs the round; it is chosen once,
-- at the opening, and never changes mid-round.
alter table interview_state
  add column engine text not null default 'v2' check (engine in ('v2', 'v3')),
  add column mode text check (mode in ('guided', 'realistic')),
  add column ucs_version text,
  add column pack_version text,
  add column ai_route text,
  add column candidate_snapshot jsonb,
  add column focus_item_id text,
  add column assumptions jsonb not null default '[]'::jsonb,
  add column active_ms bigint not null default 0,
  add column stage_started_ms bigint not null default 0,
  add column last_activity_at timestamptz,
  add column time_warnings jsonb not null default '[]'::jsonb,
  add column clarifications_asked jsonb not null default '[]'::jsonb,
  add column ledger_version integer not null default 0,
  add column last_tick_key text,
  add column last_nudge_at timestamptz,
  add column tick_in_flight_at timestamptz;

-- Interviewer turns record which agenda item and move they were, and the private,
-- verified assessment of the learner's answer (never returned during a round).
alter table interview_turns
  add column agenda_item_id text,
  add column move text,
  add column assessment jsonb;
alter table interview_turns drop constraint interview_turns_kind_check;
alter table interview_turns add constraint interview_turns_kind_check check (kind in (
  'message', 'hint_request', 'audio',
  'opening', 'question', 'answer', 'clarification', 'acknowledgement', 'hint', 'probe', 'redirect',
  'challenge', 'nudge', 'time_check', 'wrap_up'
));
alter table interview_turns drop constraint interview_turns_trigger_check;
alter table interview_turns add constraint interview_turns_trigger_check check (trigger in ('reply', 'hint', 'proactive', 'opening', 'tick'));

-- The interviewer's notepad: one row per agenda item per round, copied from the
-- pinned pack at the opening.
create table interview_agenda_items (
  session_id uuid not null references practice_sessions (id) on delete cascade,
  item_id text not null,
  position integer not null,
  stage text not null check (stage in ('requirements', 'high_level', 'deep_dive', 'wrap_up')),
  dimension text not null,
  weight integer not null,
  required boolean not null,
  status text not null default 'pending' check (status in ('pending', 'open', 'answered', 'partial', 'missed', 'skipped', 'not_reached')),
  band text check (band in ('strong', 'adequate', 'weak')),
  follow_ups integer not null default 0,
  hint_level integer not null default 0,
  challenges integer not null default 0,
  misconceptions jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  opened_seq integer,
  closed_seq integer,
  primary key (session_id, item_id)
);

-- Append-only log of what the Conductor decided. Metadata only, never prompt text.
create table interview_events (
  session_id uuid not null references practice_sessions (id) on delete cascade,
  seq bigserial,
  at timestamptz not null default now(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (session_id, seq)
);

-- Success measures, collected on v2 and v3 rounds alike.
create table interview_turn_feedback (
  turn_id uuid primary key references interview_turns (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  rating text not null check (rating in ('down')),
  reason text not null check (reason in ('already_asked', 'not_relevant', 'wrong', 'too_harsh', 'other')),
  note text,
  created_at timestamptz not null default now()
);

create table interview_ratings (
  session_id uuid primary key references practice_sessions (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  realism integer not null check (realism between 1 and 5),
  comment text,
  engine text not null,
  created_at timestamptz not null default now()
);

alter table interview_agenda_items enable row level security;
alter table interview_events enable row level security;
alter table interview_turn_feedback enable row level security;
alter table interview_ratings enable row level security;

-- Cache efficiency per call, so a falling interviewer cache hit rate is visible.
alter table ai_usage add column cached_input_tokens integer;
