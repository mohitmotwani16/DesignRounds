-- Roles a learner said they are preparing for. Track ids reorder the library;
-- the other ids (student, manager, other) are profile only.
alter table users add column interests text[] not null default '{}';
