<!--
Interviewer guides: Machine learning & AI track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
-->

# guide: recommendation-engine
## Scope and scale
Millions of users and items; recommendations served in < 100–200 ms; new users/items daily; experimentation is continuous.
## Core components
Event logging (impressions, clicks, purchases), feature pipelines and store, candidate generation (collaborative filtering/embeddings with ANN index, popularity, content-based), ranking model service, re-ranking/business rules (diversity, filtering), serving API with caching, offline training pipeline, A/B testing framework.
## Key decisions and trade-offs
- Two-stage (or multi-stage) retrieval: cheap candidate generation over millions, expensive ranking over hundreds.
- Cold start: content features, popularity, onboarding signals, exploration.
- Precompute recommendations offline vs compute online (freshness vs cost).
- Measure via online experiments with guardrail metrics; log features at serving time for training.
## Common mistakes
Scoring every item per request; no cold-start plan; training/serving skew; evaluating only offline metrics; no feedback loop logging.
## Deep-dive questions
How do you go from 10M items to 20 recommendations in 100 ms? What does a brand-new user see? How do you avoid popularity bias? How do you test a new model safely?
## What strong looks like
Multi-stage retrieval and ranking, ANN-based candidates, cold-start strategy, feature consistency, online experimentation with logging, latency budget per stage.

# guide: feature-store
## Scope and scale
Shared platform where teams define features once and reuse them for training (offline, historical) and inference (online, low latency).
## Core components
Feature definition registry (versioned, owned), batch and streaming transformation pipelines, offline store (lake/warehouse, time-stamped), online store (low-latency KV), materialisation jobs, point-in-time join service for training sets, monitoring of freshness and drift, SDK.
## Key decisions and trade-offs
- Point-in-time correctness: training joins use feature values as of each label's event time to avoid leakage.
- Single definition compiled to both batch and streaming to maintain parity.
- Online store choice and TTLs; freshness SLAs per feature.
- Backfills when a definition changes; versioning so models pin feature versions.
## Common mistakes
Joining latest feature values to historical labels (leakage); separate training and serving code; no versioning; no ownership or freshness monitoring.
## Deep-dive questions
How do you build a training set without future data leaking in? A feature's logic changes: what happens to models using it? How do you keep online features fresh within seconds?
## What strong looks like
Registry with versioning and ownership, point-in-time joins, unified definitions for offline/online, materialisation and backfills, freshness monitoring.

# guide: training-platform
## Scope and scale
Researchers submit many training jobs, from single-GPU to large multi-node runs; accelerators are scarce and expensive; jobs fail and must resume.
## Core components
Job submission API/CLI with versioned configs, scheduler with queues, quotas and priorities (gang scheduling for distributed jobs), cluster/accelerator pool management, distributed storage for datasets, checkpoint storage, experiment tracking (metrics, params), artifact/model registry with lineage to code and data versions.
## Key decisions and trade-offs
- Fair sharing vs priority; preemption with checkpoint-based resume.
- Gang scheduling so multi-node jobs get all resources at once.
- Checkpoint frequency vs overhead; recovery from node failures.
- Data locality and caching for large datasets.
## Common mistakes
No checkpointing so failures lose days; FIFO queues that let one team hog GPUs; no lineage from model to code/data; partial allocation deadlocks for distributed jobs.
## Deep-dive questions
A node fails 3 days into a 5-day job: what happens? How do you share 500 GPUs fairly across teams? How do you reproduce a model from six months ago?
## What strong looks like
Quota-aware scheduler with gang scheduling and preemption, checkpointing and resume, experiment tracking, and full lineage of runs and artifacts.

# guide: model-serving
## Scope and scale
Many teams deploy models behind APIs with p99 latency targets (tens of ms) and bursty traffic; models must roll out and roll back safely.
## Core components
Model registry, serving runtime (containers with model servers, GPU/CPU pools), request router/gateway, dynamic batching, autoscaling, canary/shadow deployment controller, feature fetching, monitoring of latency, errors, and prediction distributions, logging for training.
## Key decisions and trade-offs
- Dynamic batching improves GPU throughput at a small latency cost.
- Autoscaling on queue depth/concurrency vs CPU; warm pools for slow model loading.
- Canary and shadow traffic before full rollout; fast rollback to previous version.
- Multi-model hosting vs dedicated deployments.
## Common mistakes
No version pinning/rollback; scaling on CPU for GPU workloads; cold starts under bursts; no capture of prediction signals.
## Deep-dive questions
How do you meet p99 50 ms during a 5x burst? How does a canary decide to roll back? Where does batching happen and what does it cost in latency?
## What strong looks like
Registry-driven deployments, batching, appropriate autoscaling with warm capacity, canary/shadow with automated rollback, and quality/performance monitoring.

# guide: rag-search
## Scope and scale
Enterprise documents (many formats, frequently updated) power a question-answering assistant with citations; permissions differ per user; answers within a few seconds.
## Core components
Ingestion connectors, parsing and chunking, embedding service, vector index plus keyword index (hybrid), metadata store with ACLs, incremental update/deletion pipeline, query service (query rewriting, retrieval, re-ranking), LLM generation with grounding prompts and citations, evaluation and feedback logging.
## Key decisions and trade-offs
- Chunking strategy (size, overlap, structure-aware) affects recall and citation quality.
- Hybrid retrieval (BM25 + vectors) and a re-ranker improve relevance.
- Permission filtering at retrieval time (pre-filter by ACL) so unauthorised content never reaches the model.
- Handling updates and deletes: re-embed changed docs, tombstones.
- Grounding: instruct to answer only from retrieved context; refuse when evidence is missing.
## Common mistakes
Filtering permissions after generation; no deletes so stale or revoked content is retrieved; vector-only retrieval missing exact terms; no evaluation set.
## Deep-dive questions
How do you guarantee a user can't get an answer from a document they can't access? How do edits propagate to the index? How do you measure answer quality and hallucination?
## What strong looks like
Incremental ingestion with deletes, sensible chunking, hybrid retrieval with re-ranking, ACL enforcement before generation, cited and grounded answers, evaluation and monitoring.

# guide: online-fraud-model
## Scope and scale
Every card transaction needs a risk decision before authorisation times out (e.g. 50–100 ms budget); fresh signals matter; business tunes thresholds.
## Core components
Decision API in the authorisation path, online feature store with streaming updates (velocity, device), model serving, rules/threshold service, fallback policy, decision log, human review queue, label/feedback pipeline (chargebacks) for retraining.
## Key decisions and trade-offs
- Strict latency budget split across feature fetch, inference, and rules; timeouts with defaults.
- Fallback when model/features are unavailable: rules-only, allow below an amount, or decline high-risk categories.
- Thresholds configurable without redeploying the model; score bands for approve/review/decline.
- Delayed labels (chargebacks weeks later) for training and monitoring.
## Common mistakes
No timeout/fallback in the payment path; stale batch-only features; thresholds hard-coded; no review loop or feedback labels.
## Deep-dive questions
The model service is slow: what does checkout do? How fresh is "number of declines on this device in the last hour"? How do analysts change thresholds safely?
## What strong looks like
Budgeted latency with timeouts and fallbacks, streaming features, configurable thresholds, decision logging, human review, and feedback for retraining.

# guide: model-monitoring
## Scope and scale
Monitor many production models: inputs, predictions, delayed outcomes, and service health; alert with enough context to act.
## Core components
Prediction logging (sampled, with model version and cohort metadata), outcome/label join pipeline, metrics computation (drift, performance by cohort, latency/errors), metric store, dashboards, alerting tied to model owners, privacy controls.
## Key decisions and trade-offs
- Delayed ground truth: use proxy metrics and drift until labels arrive.
- Drift metrics (PSI, KL, distribution tests) with baselines per model version.
- Sampling vs full logging; PII minimisation and retention.
- Cohort slicing to catch regressions hidden in aggregates.
## Common mistakes
Monitoring only infrastructure metrics; no model version in logs; alerts without cohort or version context; logging raw sensitive data.
## Deep-dive questions
Labels arrive 30 days later: how do you detect degradation sooner? How do you know a drop is due to the new model version and not a data change? How do you protect user privacy in logs?
## What strong looks like
Versioned prediction logs, label joins, drift and cohort performance metrics, actionable alerts linked to owners and versions, and privacy-preserving telemetry.
