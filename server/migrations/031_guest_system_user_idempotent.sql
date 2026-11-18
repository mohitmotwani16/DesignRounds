-- Ensure the shared guest system user exists even when the row id is already taken.
insert into users (id, email, plan)
values ('00000000-0000-4000-8000-000000000001', 'guest@designrounds.local', 'free')
on conflict (id) do nothing;