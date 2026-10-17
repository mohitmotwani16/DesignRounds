-- Communication feedback. When the interviewer replies, it also notes privately how the
-- learner communicated in that answer (hedging, over- or under-explaining, rambling...).
-- Notes are never sent to the client during the round; the final review turns them,
-- with the transcripts and delivery numbers, into a Communication section.
alter table interview_turns add column communication jsonb;
