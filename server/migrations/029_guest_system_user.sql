-- Shared DB user row for anonymous Nugget-basics interview turns (FK on interview_turns / ai_credits).
insert into users (id, email, plan)
values ('00000000-0000-4000-8000-000000000001', 'guest@designrounds.local', 'free')
on conflict (email) do nothing;