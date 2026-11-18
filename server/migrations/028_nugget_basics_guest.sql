-- Nugget-basics: optional guest (anonymous) practice sessions.
alter table practice_sessions alter column user_id drop not null;

alter table practice_sessions add column if not exists guest_token_hash text;

alter table practice_sessions drop constraint if exists practice_sessions_has_owner;
alter table practice_sessions add constraint practice_sessions_has_owner
  check (user_id is not null or guest_token_hash is not null);

create unique index if not exists practice_sessions_one_active_guest_nugget
  on practice_sessions (guest_token_hash, nugget_id)
  where status = 'in_progress' and session_kind = 'nugget' and guest_token_hash is not null;

create index if not exists practice_sessions_guest_idx on practice_sessions (guest_token_hash)
  where guest_token_hash is not null;