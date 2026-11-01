-- Nugget incident drills: short sessions with seeded diagrams.
alter table practice_sessions add column session_kind text not null default 'full'
  check (session_kind in ('full', 'nugget'));
alter table practice_sessions add column nugget_id text;

alter table practice_sessions add constraint practice_sessions_nugget_id_required
  check (session_kind = 'full' or nugget_id is not null);

drop index if exists practice_sessions_one_active_per_prompt;
create unique index practice_sessions_one_active_full_per_prompt
  on practice_sessions (user_id, prompt_id) where status = 'in_progress' and session_kind = 'full';
create unique index practice_sessions_one_active_nugget
  on practice_sessions (user_id, nugget_id) where status = 'in_progress' and session_kind = 'nugget';

create index practice_sessions_nugget_idx on practice_sessions (nugget_id) where nugget_id is not null;
