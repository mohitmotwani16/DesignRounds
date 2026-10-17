-- The network a signed-in browser last proved it was human on, and the id of that
-- page load. A new launch or a different network has to pass Turnstile again.
alter table auth_sessions add column human_ip text;
alter table auth_sessions add column human_launch text;
alter table auth_sessions add column human_checked_at timestamptz;
