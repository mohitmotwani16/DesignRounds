-- One free live-interviewer round per email address (issue #75). A free learner picks
-- one round on a free question to try the interviewer on; that round then gets the
-- Plus interviewer allowances and full review feedback.
--
-- The ledger is keyed on a SHA-256 of the lowercased email, not on the account, so
-- deleting the account and signing up again doesn't hand out a second trial, and no
-- raw address is kept once the account is gone.
create table interviewer_trials (
  email_hash text primary key,
  user_id uuid references users(id) on delete set null,
  session_id uuid references practice_sessions(id) on delete set null,
  started_at timestamptz not null default now()
);

alter table interviewer_trials enable row level security;

alter table practice_sessions add column interviewer_trial boolean not null default false;
