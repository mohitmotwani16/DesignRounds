-- Voice answers are transcribed (speech-to-text) before the interviewer replies. The
-- transcript goes into interview_turns.content like a typed message; delivery numbers
-- (pace, fillers, pauses) are kept here for communication feedback.
--
-- Recordings are kept 30 days after transcription for debugging and re-processing, then
-- the daily maintenance job clears `data`; the row and its numbers stay with the round.
alter table interview_audio alter column data drop not null;
alter table interview_audio
  add column stt_model text,
  add column delivery jsonb,
  add column purged_at timestamptz;
create index interview_audio_purge_idx on interview_audio (transcribed_at) where data is not null;
