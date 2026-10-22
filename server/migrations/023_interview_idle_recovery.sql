-- Idle escalation and consecutive weak-response recovery for v3 interviews.
alter table interview_state
  add column last_idle_hint_at timestamptz,
  add column poor_response_streak integer not null default 0,
  add column poor_response_item_id text;