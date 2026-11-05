-- 005 locked down the tables that existed then, and later migrations each did so by hand.
-- answer_pools and answer_pool_sources (012) and the analytics_round_cost view (019) were
-- missed. The API roles hold no grants, so this is a second lock rather than a live hole,
-- but it must hold on its own. The app connects as the owner, which bypasses RLS.
-- scripts/smoke.js now fails if any table in the public schema is left without RLS.
do $lockdown$
declare
  item record;
begin
  for item in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', item.tablename);
  end loop;
  for item in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', item.viewname);
  end loop;
end
$lockdown$;
