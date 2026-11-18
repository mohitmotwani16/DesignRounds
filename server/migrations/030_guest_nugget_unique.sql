-- Guest basics sessions all use GUEST_SYSTEM_USER_ID; the signed-in-user unique index
-- must not apply when guest_token_hash is set (guest uniqueness is guest_token_hash + nugget_id).
-- Production can accumulate duplicate in-progress nugget rows (races / legacy data); keep newest.
update practice_sessions ps
set status = 'completed',
    completed_at = coalesce(ps.completed_at, now()),
    updated_at = now()
where ps.id in (
  select id from (
    select id,
      row_number() over (
        partition by user_id, nugget_id
        order by updated_at desc, created_at desc
      ) as rn
    from practice_sessions
    where status = 'in_progress'
      and session_kind = 'nugget'
      and guest_token_hash is null
      and user_id is not null
  ) ranked
  where rn > 1
);

drop index if exists practice_sessions_one_active_nugget;
create unique index practice_sessions_one_active_nugget
  on practice_sessions (user_id, nugget_id)
  where status = 'in_progress' and session_kind = 'nugget' and guest_token_hash is null;