-- Human-check (Cloudflare Turnstile) diagnostics (issue #103). The server records each
-- siteverify outcome and each time a signed-in browser is asked to check again; the
-- browser reports widget failures Cloudflare never sends us (error codes, a blocked
-- script, a stalled background check). client_id is a random per-browser id that
-- people see as a "reference" in error messages. Rows are kept for 30 days.
create table human_check_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  action text not null check (char_length(action) <= 40),
  outcome text not null check (char_length(outcome) <= 40),
  error_codes text[] not null default '{}',
  user_id uuid references users(id) on delete cascade,
  email text check (email = lower(email)),
  client_id text check (char_length(client_id) <= 64),
  page text check (char_length(page) <= 300),
  country text check (char_length(country) <= 8),
  user_agent text check (char_length(user_agent) <= 400),
  request_id text check (char_length(request_id) <= 200),
  detail jsonb not null default '{}'
);
create index human_check_events_created_idx on human_check_events (created_at desc);
create index human_check_events_client_idx on human_check_events (client_id) where client_id is not null;
create index human_check_events_email_idx on human_check_events (email) where email is not null;

alter table human_check_events enable row level security;
