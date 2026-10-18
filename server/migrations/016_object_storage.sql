-- Voice recordings can live in Cloudflare R2 (storage_key) instead of Postgres bytea.
-- Maintenance clears only bytes/keys 30 days after transcription; interview_turns.content
-- (the transcript) is kept for the life of the round.
alter table interview_audio add column storage_key text;

drop index if exists interview_audio_purge_idx;
create index interview_audio_purge_idx on interview_audio (transcribed_at)
  where data is not null or storage_key is not null;
