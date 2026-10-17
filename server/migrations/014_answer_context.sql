-- Store private structured context extracted from each learner answer for later
-- interviewer turns and the final review. The original answer stays verbatim.
alter table interview_turns add column answer_context jsonb;
