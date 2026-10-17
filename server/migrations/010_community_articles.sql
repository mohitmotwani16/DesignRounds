-- Community articles for the Learn handbook. Signed-in users write and submit
-- articles; admins review them, exchange messages with the author, and publish.
--
-- Admins: users.role = 'admin', granted by other admins. The first admins come from
-- the ADMIN_EMAILS setting (see server/modules/identity.js).
alter table users add column role text not null default 'user' check (role in ('user', 'admin'));

create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  short_title text not null default '',
  description text not null default '',
  category text not null,
  level text not null default 'Intermediate' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'changes_requested', 'published', 'rejected')),
  author_name text,
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_status_idx on articles (status, updated_at desc);
create index articles_author_idx on articles (author_id, updated_at desc);

-- The review conversation: feedback from admins, replies from the author, and
-- system notes for status changes.
create table article_messages (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  role text not null check (role in ('author', 'admin', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);
create index article_messages_article_idx on article_messages (article_id, created_at);

-- Same lockdown as every other table (see 005).
alter table articles enable row level security;
alter table article_messages enable row level security;
