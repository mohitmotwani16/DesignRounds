-- Voice answers in the live interview. A recording is a learner turn of kind 'audio';
-- its bytes live in interview_audio, which the API writes but never serves back.
-- When transcription lands, the transcript fills interview_turns.content so the
-- interviewer, summaries and reviews read it like any other message.
alter table interview_turns drop constraint interview_turns_kind_check;
alter table interview_turns add constraint interview_turns_kind_check
  check (kind in ('message', 'hint_request', 'audio', 'opening', 'question', 'answer', 'clarification', 'acknowledgement', 'hint', 'probe', 'redirect'));

create table interview_audio (
  turn_id uuid primary key references interview_turns (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  mime_type text not null,
  duration_ms integer not null check (duration_ms > 0),
  size_bytes integer not null check (size_bytes > 0),
  data bytea not null,
  transcribed_at timestamptz,
  created_at timestamptz not null default now()
);
create index interview_audio_user_idx on interview_audio (user_id);

-- Same lockdown as every other table (see 005): no access over Supabase's data API.
alter table interview_audio enable row level security;
