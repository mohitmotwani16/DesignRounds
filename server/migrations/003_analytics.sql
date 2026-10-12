-- The plan in effect when a review was requested; users.plan only holds the current plan.
alter table ai_reviews add column plan text;
update ai_reviews r set plan = u.plan from users u where u.id = r.user_id and r.plan is null;

-- Read-only analytics views. They expose ids and metrics only, never design or review
-- text, so they're safe to grant to a reporting role or BI tool.

-- One row per review: outcome, score, plan, latency.
create view analytics_reviews as
select r.id as review_id,
       r.user_id,
       r.session_id,
       r.prompt_id,
       r.plan,
       r.status,
       r.error_code,
       r.overall_score,
       r.result -> 'overall' ->> 'rating' as rating,
       r.provider,
       r.model,
       r.rubric_version,
       r.template_version,
       r.diagram_version,
       (r.result -> 'reasoning' -> 'coverage' ->> 'components')::int as components,
       (r.result -> 'reasoning' -> 'coverage' ->> 'explainedComponents')::int as explained_components,
       r.created_at,
       r.completed_at,
       extract(epoch from (r.completed_at - r.created_at)) as duration_seconds
  from ai_reviews r;

-- One row per review dimension, for score distributions by prompt and dimension.
create view analytics_review_dimensions as
select r.id as review_id,
       r.prompt_id,
       r.plan,
       r.rubric_version,
       d ->> 'id' as dimension,
       (d ->> 'score')::int as score,
       d ->> 'rating' as rating,
       r.completed_at
  from ai_reviews r
 cross join lateral jsonb_array_elements(r.result -> 'dimensions') as d
 where r.status = 'succeeded';

-- One row per analysed decision: how often choices are unexplained, unnecessary, or over-engineered.
create view analytics_review_decisions as
select r.id as review_id,
       r.prompt_id,
       r.plan,
       d ->> 'explanation' as explanation,
       d ->> 'necessity' as necessity,
       d ->> 'sizing' as sizing,
       r.completed_at
  from ai_reviews r
 cross join lateral jsonb_array_elements(coalesce(r.result -> 'reasoning' -> 'decisions', '[]'::jsonb)) as d
 where r.status = 'succeeded';

-- AI calls, tokens, and latency per day, task, and model.
create view analytics_ai_usage_daily as
select date_trunc('day', created_at) as day,
       task,
       provider,
       model,
       outcome,
       count(*) as calls,
       coalesce(sum(input_tokens), 0) as input_tokens,
       coalesce(sum(output_tokens), 0) as output_tokens,
       round(avg(latency_ms)) as avg_latency_ms,
       percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms
  from ai_usage
 group by 1, 2, 3, 4, 5;

-- Practice funnel per prompt: rounds started, finished, and reviewed.
create view analytics_prompt_funnel as
select s.prompt_id,
       count(*) as rounds_started,
       count(*) filter (where s.status = 'completed') as rounds_completed,
       count(distinct r.session_id) as rounds_reviewed,
       count(distinct s.user_id) as learners,
       round(avg(r.overall_score)) as avg_score
  from practice_sessions s
  left join ai_reviews r on r.session_id = s.id and r.status = 'succeeded'
 group by s.prompt_id;

-- Daily signups, sign-ins, and plan mix.
create view analytics_users_daily as
select date_trunc('day', created_at) as day,
       count(*) as signups,
       count(*) filter (where onboarded_at is not null) as onboarded,
       count(*) filter (where plan = 'plus') as plus
  from users
 group by 1;
