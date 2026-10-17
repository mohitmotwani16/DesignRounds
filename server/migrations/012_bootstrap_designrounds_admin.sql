-- Bootstrap the explicitly requested DesignRounds owner account as an admin.
-- Keep existing account data intact; this also creates the account before first sign-in.
insert into users (email, role)
values ('designrounds.app@gmail.com', 'admin')
on conflict (email) do update
  set role = 'admin', updated_at = now();
