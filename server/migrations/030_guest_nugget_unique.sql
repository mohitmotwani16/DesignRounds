-- Guest basics sessions all use GUEST_SYSTEM_USER_ID; the signed-in-user unique index
-- must not apply when guest_token_hash is set (guest uniqueness is guest_token_hash + nugget_id).
drop index if exists practice_sessions_one_active_nugget;
create unique index practice_sessions_one_active_nugget
  on practice_sessions (user_id, nugget_id)
  where status = 'in_progress' and session_kind = 'nugget' and guest_token_hash is null;