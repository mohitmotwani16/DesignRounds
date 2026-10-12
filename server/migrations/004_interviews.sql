-- Interviewer turns also draw on the AI credit ledger.
alter table ai_credits drop constraint ai_credits_kind_check;
alter table ai_credits add constraint ai_credits_kind_check check (kind in ('review', 'interview_turn'));

-- The conversation between a learner and the AI interviewer during a round.
create table interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references practice_sessions (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  seq integer not null,
  role text not null check (role in ('learner', 'interviewer')),
  -- Learner: message or hint_request. Interviewer: the intent of what it said.
  kind text not null check (kind in ('message', 'hint_request', 'opening', 'question', 'answer', 'clarification', 'acknowledgement', 'hint', 'probe', 'redirect')),
  -- What produced an interviewer turn: a learner message, a hint request, a proactive look at the canvas, or the opening.
  trigger text check (trigger in ('reply', 'hint', 'proactive', 'opening')),
  content text not null,
  node_ids jsonb not null default '[]'::jsonb,
  request_id uuid,
  diagram_version integer,
  created_at timestamptz not null default now(),
  unique (session_id, seq),
  unique (user_id, request_id)
);
create index interview_turns_session_seq_idx on interview_turns (session_id, seq);

-- Per-round interviewer state: stage, rolling summary of older turns, which components
-- have been discussed, and the canvas snapshot the interviewer last looked at.
create table interview_state (
  session_id uuid primary key references practice_sessions (id) on delete cascade,
  stage text not null default 'requirements' check (stage in ('requirements', 'high_level', 'deep_dive', 'wrap_up')),
  summary text not null default '',
  summarized_through integer not null default 0,
  covered jsonb not null default '[]'::jsonb,
  snapshot jsonb,
  hints_used integer not null default 0,
  proactive_checks integer not null default 0,
  last_proactive_at timestamptz,
  pending_since timestamptz,
  updated_at timestamptz not null default now()
);

-- Analytics: interviewer activity per round (metadata only, never message text).
create view analytics_interviews as
select t.session_id,
       s.prompt_id,
       t.user_id,
       count(*) filter (where t.role = 'learner' and t.kind = 'message') as learner_messages,
       count(*) filter (where t.role = 'learner' and t.kind = 'hint_request') as hints_requested,
       count(*) filter (where t.role = 'interviewer' and t.trigger = 'proactive') as proactive_questions,
       count(*) filter (where t.role = 'interviewer') as interviewer_turns,
       min(t.created_at) as started_at,
       max(t.created_at) as last_turn_at,
       st.stage as final_stage
  from interview_turns t
  join practice_sessions s on s.id = t.session_id
  left join interview_state st on st.session_id = t.session_id
 group by t.session_id, s.prompt_id, t.user_id, st.stage;
