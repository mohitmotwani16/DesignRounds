-- Exact cost per AI call and per round: the full token breakdown (thinking tokens are
-- billed as output and were not recorded before), audio length for transcription, and
-- the cost priced at record time with the price-table version it used.
alter table ai_usage
  add column reasoning_tokens integer,
  add column cache_write_tokens integer,
  add column audio_ms integer,
  add column cost_usd numeric(14, 8),
  add column price_version text,
  add column cost_estimated boolean not null default false;

create index ai_usage_session_idx on ai_usage (session_id, created_at) where session_id is not null;

-- One row per round: what its AI calls cost. unpriced_calls > 0 means the total is a lower
-- bound (a model without a price, or rows from before costs were recorded);
-- estimated_calls counts aborted calls whose tokens were estimated from their length.
create view analytics_round_cost as
select u.session_id,
       s.prompt_id,
       s.user_id,
       s.status,
       min(u.created_at) as first_call_at,
       max(u.created_at) as last_call_at,
       count(*) as calls,
       coalesce(sum(u.cost_usd), 0) as cost_usd,
       coalesce(sum(u.cost_usd) filter (where u.task in ('interviewer', 'interview_summary')), 0) as interview_cost_usd,
       coalesce(sum(u.cost_usd) filter (where u.task in ('review', 'communication')), 0) as review_cost_usd,
       coalesce(sum(u.cost_usd) filter (where u.task = 'transcribe'), 0) as transcription_cost_usd,
       count(*) filter (where u.cost_usd is null) as unpriced_calls,
       count(*) filter (where u.cost_estimated) as estimated_calls,
       coalesce(sum(u.input_tokens), 0) as input_tokens,
       coalesce(sum(u.cached_input_tokens), 0) as cached_input_tokens,
       coalesce(sum(u.output_tokens), 0) as output_tokens,
       coalesce(sum(u.reasoning_tokens), 0) as reasoning_tokens,
       coalesce(sum(u.audio_ms), 0) as audio_ms
  from ai_usage u
  join practice_sessions s on s.id = u.session_id
 group by u.session_id, s.prompt_id, s.user_id, s.status;
