-- Shared rate-limit counters, so limits hold across every API instance (serverless
-- deployments run many). Fixed windows keyed by "<limiter>:<subject>"; expired rows are
-- swept by the daily maintenance job.
create table rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
create index rate_limits_reset_idx on rate_limits (reset_at);

-- Lockdown for hosted Postgres that exposes the public schema over an HTTP data API
-- (Supabase's PostgREST). The app connects as the database owner and never uses that
-- API, so it must not be able to read or write anything:
--   * row level security on every table, with no policies, denies all API roles;
--   * views run with the caller's privileges, so they can't bypass that;
--   * on Supabase, the API roles lose their grants now and for future objects.
-- The owner role bypasses RLS, so the app itself is unaffected. On plain Postgres
-- and PGlite the role-specific part is skipped.
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
  if exists (select 1 from pg_roles where rolname = 'anon') and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
    revoke all on all functions in schema public from anon, authenticated;
    alter default privileges in schema public revoke all on tables from anon, authenticated;
    alter default privileges in schema public revoke all on sequences from anon, authenticated;
    alter default privileges in schema public revoke all on functions from anon, authenticated;
  end if;
end
$lockdown$;
