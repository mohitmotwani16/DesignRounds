-- Cached communication feedback for incident drills (no rubric review credit).
alter table interview_state
  add column if not exists drill_communication jsonb,
  add column if not exists drill_communication_at timestamptz;
