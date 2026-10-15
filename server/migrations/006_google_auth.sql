-- Google sign-in: stable subject from Google's ID token / userinfo.
-- Accounts are also matched by email so an existing OTP user links automatically.
alter table users
  add column google_sub text unique;
