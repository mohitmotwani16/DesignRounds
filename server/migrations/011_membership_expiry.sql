alter table users add column plan_expires_at date;

-- Plus access already assigned before expiry support remains available through 2028-01-01.
update users
   set plan_expires_at = date '2028-01-01'
 where plan = 'plus' and plan_expires_at is null;

-- Older accounts that completed profile setup before the onboarding marker was added
-- should not be sent through setup again. New accounts are not affected by this migration.
update users
   set onboarded_at = created_at
 where onboarded_at is null and display_name is not null;
