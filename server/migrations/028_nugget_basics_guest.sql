-- Nugget-basics: optional guest (anonymous) practice sessions.
alter table practice_sessions alter column user_id drop not null;

alter table practice_sessions add column if not exists guest_token_hash text;

-- Legacy duplicate active guest drills would block the per-guest unique index below.
update practice_sessions ps
set status = 'completed',
    completed_at = coalesce(ps.completed_at, now()),
    updated_at = now()
where ps.id in (
  select id from (
    select id,
      row_number() over (
        partition by guest_token_hash, nugget_id
        order by updated_at desc, created_at desc
      ) as rn
    from practice_sessions
    where status = 'in_progress'
      and session_kind = 'nugget'
      and guest_token_hash is not null
      and nugget_id is not null
  ) ranked
  where rn > 1
);

alter table practice_sessions drop constraint if exists practice_sessions_has_owner;
alter table practice_sessions add constraint practice_sessions_has_owner
  check (user_id is not null or guest_token_hash is not null);

create unique index if not exists practice_sessions_one_active_guest_nugget
  on practice_sessions (guest_token_hash, nugget_id)
  where status = 'in_progress' and session_kind = 'nugget' and guest_token_hash is not null;

create index if not exists practice_sessions_guest_idx on practice_sessions (guest_token_hash)
  where guest_token_hash is not null;