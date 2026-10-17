alter table users add column welcome_email_sent_at timestamptz;
alter table users add column welcome_email_claimed_at timestamptz;

-- Existing users are not new members; leave accounts that have never signed in
-- eligible for their one-time welcome email.
update users
   set welcome_email_sent_at = created_at
 where last_login_at is not null;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  token_hash text not null unique,
  plan text not null check (plan in ('free', 'plus')),
  plan_expires_at date,
  created_by uuid not null references users (id) on delete restrict,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references users (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check ((plan = 'plus' and plan_expires_at is not null) or (plan = 'free' and plan_expires_at is null))
);
create index invitations_email_created_idx on invitations (email, created_at desc);

alter table invitations enable row level security;
