-- Ensure the shared guest system user exists (idempotent; no unique violation on email).
insert into users (id, email, plan)
values ('00000000-0000-4000-8000-000000000001', 'guest@designrounds.local', 'free')
on conflict (id) do nothing;

insert into users (id, email, plan)
select '00000000-0000-4000-8000-000000000001', 'guest@designrounds.local', 'free'
where not exists (select 1 from users where id = '00000000-0000-4000-8000-000000000001')
  and not exists (select 1 from users where email = 'guest@designrounds.local');