-- Problems and bugs reported from the site (issue #71). Anyone can report: visitors
-- give an email and pass the human check, signed-in learners report with their
-- account email. A learner's reports are deleted with their account.
create table problem_reports (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  user_id uuid references users(id) on delete cascade,
  message text not null check (char_length(message) between 10 and 4000),
  page text check (char_length(page) <= 300),
  user_agent text check (char_length(user_agent) <= 400),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index problem_reports_created_idx on problem_reports (created_at desc);

alter table problem_reports enable row level security;
