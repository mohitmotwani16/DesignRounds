-- People who asked to hear when Plus opens. One row per address: visitors join with
-- an email, signed-in learners with their account email (user_id links the two, and
-- is filled in if a visitor later signs in and joins again). notified_at is set once
-- the launch email has gone out, so a resend skips people already told.
create table plus_waitlist (
  email text primary key check (email = lower(email)),
  user_id uuid references users(id) on delete set null,
  source text not null default 'plus-page',
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index plus_waitlist_created_idx on plus_waitlist (created_at desc);

alter table plus_waitlist enable row level security;
