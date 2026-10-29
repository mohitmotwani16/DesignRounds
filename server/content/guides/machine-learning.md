<!--
Interviewer guides: Machine learning track.
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

# guide: ad-click-prediction
## Scope and scale
A social platform with about 1 billion daily users and roughly 100 billion ad impressions a day. Each ad request has a few thousand eligible ads after targeting and budget filters; a model must score several hundred of them within about 30 ms, inside an ad request budget of around 100 ms. Click-through rates are around 1%. The predicted click probability multiplies the advertiser's bid in a second-price-style auction, so it must be calibrated. Millions of ads are active and new campaigns start constantly.
## Core components
Impression and click logging with a label window, a stream join producing labelled examples, negative downsampling with recalibration, feature pipelines (user, ad, advertiser, context, user-ad crosses, real-time CTR counters from a stream), an embedding-heavy deep CTR model (wide-and-deep or DLRM style) trained incrementally, a calibration layer, a scoring service with sharded embedding tables and GPU batching, the auction (bid x pCTR plus quality terms), a model registry with validation gates, and monitoring of calibration and feature freshness.
## Key decisions and trade-offs
- Label: click within a short window after the impression; conversions are a separate, delayed task.
- Calibration matters as much as AUC because the auction multiplies probabilities by bids; downsampling negatives must be corrected.
- Sparse ids (user, ad, advertiser, creative) need hashing and learned embeddings; tables are hundreds of GB and are sharded.
- Freshness: new ads and shifting behaviour justify incremental training every few hours plus periodic full retrains; each update is validated before it's pushed.
- New ads: priors from advertiser and category, creative content embeddings, smoothed counters and some exploration.
- Two-stage scoring (light model then heavy model) to fit the latency budget.
## Common mistakes
Optimising AUC only and ignoring calibration; downsampling negatives without recalibrating; raw CTR counters with no smoothing so a new ad with one click looks perfect; features computed with data from after the impression; retraining weekly in a domain that shifts hourly; training on bot clicks; scoring every eligible ad with the heavy model.
## Deep-dive questions
Why does calibration matter if the ranking is already good? You downsample negatives to 10%: what happens to the predicted probabilities and how do you fix it? A brand-new campaign launches: what does the model predict for its ads? How often do you retrain and how do you know a fresh model is safe to push? How do you fit hundreds of candidates into 30 ms?
## What strong looks like
A precise label and a training set built from impressions, sparse features with embeddings and smoothed real-time counters, a baseline then a deep model, explicit calibration and recalibration after sampling, a two-stage serving path with numbers, frequent validated retraining, new-ad handling, and normalised log loss plus calibration offline and revenue with user guardrails online.

# guide: video-recommendations
## Scope and scale
A video platform with about 500 million daily viewers, each loading the home page around ten times a day (roughly 58,000 requests a second on average and 150,000 at peak). The catalogue has billions of videos with hundreds of thousands uploaded every hour. Each load returns about 20 videos within 200 ms. The goal is long-term satisfaction and return visits, measured by experiments.
## Core components
Impression and watch logging, training pipelines, a feature store with user, video, context and session features, candidate generators (two-tower retrieval over an ANN index, subscriptions, item-to-item co-watch, trending and fresh), a light ranker, a multi-task heavy ranker (click, watch time, like, share, dismiss), re-ranking for policy, diversity and freshness, a serving API with caching and fallbacks, an experimentation platform, and monitoring.
## Key decisions and trade-offs
- Objective: satisfied watch time rather than clicks; combine several predicted outcomes with weights tuned by experiments.
- Multi-stage funnel with candidate counts and latency per stage; retrieval for recall, ranking for precision.
- Two-tower retrieval with precomputed video vectors; index only eligible videos to bound memory.
- Position bias: log positions and use position as a training feature set to a constant at serving.
- Cold start for new uploads: content features in the item tower, channel priors and exploration slots.
- Freshness: near-real-time session signals and frequent ranker retraining; retrieval towers retrained less often with index rebuilds.
## Common mistakes
Optimising clicks and rewarding clickbait; one heavy model over the whole catalogue; no plan for new uploads; random train/test splits; ignoring position bias; evaluating offline only; no fallback when the ranker is slow.
## Deep-dive questions
How do you go from billions of videos to 20 in 200 ms? What exactly is the label, and why not clicks? How does a video uploaded an hour ago get its first viewers? How do you stop the feed narrowing onto a few popular channels? How would you know a new ranker is better?
## What strong looks like
A satisfaction-oriented objective with a multi-task scoring formula, several candidate sources with ANN retrieval, light and heavy rankers with stated counts and latency, re-ranking rules, explicit cold start and feedback-loop handling, offline metrics per stage, long-term online metrics and guardrails, and a retraining plan.

# guide: feed-ranking
## Scope and scale
A social network with about 2 billion daily users who open the feed around 8 times a day (about 185,000 feed loads a second on average, 500,000 at peak). Each viewer has around 1,500 eligible posts from friends, followed pages and groups, plus some recommended posts. The first screen must render within 300 ms. The goal is meaningful interactions and daily return, while limiting low-quality and harmful content.
## Core components
Inventory service gathering eligible posts, integrity classifiers and filters (spam, clickbait, misinformation, blocks), a feature store with viewer, author, post and affinity features plus real-time engagement counters, a light ranker, a multi-task heavy ranker predicting actions (like, comment, share, long dwell, hide, report), a value function combining them, a final pass for diversity and freshness, pagination with re-ranking, logging and training pipelines, and experimentation with long-term holdouts.
## Key decisions and trade-offs
- Value model: weighted sum of calibrated action probabilities including negative actions; weights chosen by experiments on long-term outcomes.
- Integrity models separate from the engagement ranker, applied as filters or demotions so policy changes don't require retraining the ranker.
- Affinity between viewer and author and early engagement velocity are the strongest features.
- Rank more than one page, return one, re-rank later pages with fresh signals.
- Balance friends' posts and recommended posts with an explicit policy.
- Protect against short-term engagement that harms retention (outrage) with surveys and long-term holdouts.
## Common mistakes
Ranking chronologically at scale or by clicks alone; adding probabilities that aren't calibrated; folding integrity into the engagement model; no latency plan for 1,500 candidates; ignoring negative feedback; measuring only short-term engagement.
## Deep-dive questions
How do you turn predictions for many actions into one ordering? How do you stop outrage bait from rising? Where do integrity models sit and why? How do you keep the feed fresh when someone opens it twice in ten minutes? What would you measure to know a change is good long term?
## What strong looks like
A clear value model over calibrated multi-task predictions, a candidate funnel with budgets, separate integrity filtering and demotion, strong affinity and freshness features, final-pass diversity, and long-term guardrails including survey satisfaction and holdouts.

# guide: search-ranking
## Scope and scale
An e-commerce site with about 300 million products and 50,000 searches a second at peak. Results within 200 ms at p99. A small set of head queries carries a large share of traffic, but most distinct queries are long-tail. The goal is purchases from search; ranking changes are tested online.
## Core components
Query understanding (normalisation, spell correction, category classification, attribute extraction, expansion), a sharded inverted index with BM25, a semantic retriever (two-tower embeddings over an ANN index), candidate merging, a feature service (text match, quality, behaviour, commercial, personal features), a learning-to-rank model, optional cross-encoder relevance check, business rules (stock, ads slots, dedupe), result caching for head queries, human relevance rating pipeline, click logs, and evaluation with NDCG, interleaving and A/B tests.
## Key decisions and trade-offs
- Hybrid retrieval: lexical catches exact brands, SKUs and model numbers; semantic catches paraphrases and descriptive queries.
- Labels: human grades for evaluation, graded implicit feedback (click, cart, purchase) for scale, corrected for position bias.
- Model: LambdaMART on dense features or a deep ranker; listwise objectives match NDCG.
- Scatter-gather across index shards with per-shard top-k.
- Cache head-query results briefly; personalise lightly.
- Evaluate by query segment (head, torso, tail); interleaving for sensitive comparisons.
## Common mistakes
Only keyword search or only vectors; training on raw clicks without position-bias correction; one global NDCG hiding tail-query regressions; ignoring zero-result queries; no latency budget across shards; letting popularity override relevance.
## Deep-dive questions
A query for a model number returns lookalike products: why, and what fixes it? How do you use clicks as labels without just learning the old ranking? How do you rank a product added yesterday? How would you compare two rankers quickly on live traffic? What happens for a query with zero results?
## What strong looks like
Query understanding, hybrid retrieval with counts per stage, a learning-to-rank model with the right feature groups and debiased labels, sharded serving with caching and a latency plan, and offline evaluation by segment plus interleaving and A/B tests on conversion.

# guide: content-moderation
## Scope and scale
A social platform receiving about a billion new posts, comments, images and short videos a day (around 12,000 a second on average) in dozens of languages. A few thousand trained reviewers can make a few million decisions a day. Actions include removal, reduced distribution, warning screens and review. Users can appeal. Quality is measured and reported as prevalence.
## Core components
Hash matching against known violating media, text, image and video encoders, a fusion multilabel classifier with a head per harm, account and behaviour signals, a policy engine mapping scores to actions per harm, review queues prioritised by expected harm (severity x probability x predicted reach), a labeling pipeline with guidelines and adjudication, appeals, re-scoring on reports and virality, random-sample prevalence measurement, and rapid-response rules.
## Key decisions and trade-offs
- Multilabel framing with thresholds set per harm by the cost of each error.
- Layering: cheap precise hash matching first, models next, humans for uncertain or high-reach cases.
- Multimodal fusion so a harmless image with a hateful caption is caught.
- Video is expensive: sample frames and transcribe audio asynchronously, limit distribution until scored.
- Labels are versioned with policy versions; active learning around thresholds and for rare harms and languages.
- Measure prevalence from random samples, not only from what the classifiers flag.
## Common mistakes
One global "harmful" classifier and threshold; full automation with no human review; ignoring smaller languages; measuring only precision of removals; reviewing in arrival order; no adversarial adaptation; scoring only at upload and never again.
## Deep-dive questions
How do you choose thresholds for child safety versus spam? Reviewers can handle 2 million items a day but 15 million are flagged: what do they see first? How do you know the system is getting better? Attackers start misspelling slurs and adding noise to images: what changes? A post goes viral an hour after upload: what happens?
## What strong looks like
Per-harm framing and thresholds, hash matching plus multimodal models plus account signals, a policy engine, expected-harm review prioritisation, a versioned labeling loop with active learning, re-scoring on signals, and prevalence, proactive rate and appeal overturns as metrics.

# guide: people-you-may-know
## Scope and scale
A social network with about 1 billion members and an average of 300 connections each (roughly 150 billion edges). Each member sees about 20 suggestions on the home page and network tab. Suggestions are computed daily and should react within minutes to a new connection. Blocks and privacy settings must always be respected.
## Core components
Graph store and daily snapshots, candidate generators (friends of friends with mutual counts, shared schools and employers, imported contacts with consent, graph-embedding neighbours via ANN), a feature pipeline (mutual counts, Adamic-Adar, affiliation overlap, profile views, candidate quality), a ranker predicting accepted connection, a batch scoring job writing top suggestions per user to a key-value store, a real-time updater on connection events, an API that filters and lightly re-ranks, and experiments with cluster randomisation.
## Key decisions and trade-offs
- Label: request sent and accepted, not sends alone.
- Two-hop walks are capped to avoid celebrity explosion; prune by mutual count before scoring.
- Batch precomputation for the heavy work, with a real-time path for fresh connections.
- Weighted mutual connections (a mutual with few connections counts more).
- Privacy: exclude sensitive contact categories and signals; never reveal who uploaded whom.
- Network effects: treatment changes the graph for control users; randomise by clusters.
## Common mistakes
Scoring everyone against everyone; optimising sent requests; ignoring blocked and dismissed users; real-time computation of two-hop neighbourhoods per request; revealing sensitive relationships; user-level A/B tests that ignore graph interference.
## Deep-dive questions
How do you find candidates without scanning a billion members? A celebrity has millions of connections: what does that do to friends-of-friends? Someone connects with a new colleague: how quickly do that colleague's teammates appear? What should never be suggested? How do you run an experiment when users influence each other?
## What strong looks like
Accepted-connection framing, several candidate sources with pruning, graph and affiliation features, batch scoring with a real-time update path and numbers, privacy filters, and evaluation that accounts for network effects.

# guide: visual-search
## Scope and scale
Users photograph or crop part of an image and get visually similar images and products. About 5 billion indexed images, 2 million new images a day, 5,000 queries a second at peak, results within 500 ms. New images should be searchable within an hour.
## Core components
Object detection to propose a query region, an image encoder producing embeddings, contrastive training using augmentation pairs, engagement pairs and optionally image-text pairs, a batch embedding pipeline on GPUs, a sharded compressed ANN index (IVF-PQ or HNSW per shard) with a small fresh index for new images, image metadata store, a re-ranker combining similarity with quality, engagement and duplicates, safety and availability filters, and retrieval evaluation.
## Key decisions and trade-offs
- Representation learning plus retrieval: the encoder defines what "similar" means.
- Training signal: self-supervised pairs for coverage, engagement pairs for the product's notion of similarity, hard negatives.
- Index sizing: full-precision vectors don't fit in memory at billions; product quantization plus re-ranking top results with full vectors.
- Freshness via a small incremental index merged periodically.
- Re-embedding the whole corpus when the encoder changes, into a new index, switched atomically.
- Dedupe near-identical images in results.
## Common mistakes
Comparing raw pixels or global colour histograms; brute-force search over billions; ignoring that embeddings from different model versions are incompatible; no plan for new images; no evaluation set; showing many copies of the same image.
## Deep-dive questions
How much memory does the index need, and how do you make it fit? How do you train the model without labelled pairs? You ship a better encoder: what has to happen before users see it? How do new uploads become searchable within an hour? How do you measure result quality?
## What strong looks like
Contrastive embeddings with a clear training signal, region detection, a sharded quantized index with sizing arithmetic, incremental indexing, re-ranking and dedupe, a re-embedding plan, and recall@k plus online engagement metrics.

# guide: eta-prediction
## Scope and scale
A food delivery app with about 10 million orders a day. Estimates are shown on search results for many restaurants at once (about 50,000 search requests a second, each needing ETAs for around 40 restaurants), at checkout, and updated during the order. Predictions within 50 ms. Lateness hurts more than earliness. Rain, meal peaks and holidays shift everything.
## Core components
Order event and courier GPS streams, a routing engine for travel times, stream jobs computing kitchen load and courier supply per area, historical aggregates from batch, an online feature store, per-stage models (prep, courier to restaurant, pickup wait, drive) predicting quantiles, an ETA service, a cache keyed by restaurant and delivery area for search pages, re-prediction on order events, and monitoring of error and lateness by city.
## Key decisions and trade-offs
- Decompose into stages so each uses the right signals and errors can be attributed.
- Quantile predictions (P50 and P90) because lateness is asymmetric; the displayed value is a product decision tested online.
- Real-time signals (kitchen queue, couriers nearby, traffic, weather) matter most at peaks.
- Gradient-boosted trees as a strong baseline; deep models predicting residuals over the routing engine's estimate.
- Cache search-page ETAs per restaurant and area briefly; compute exact per-order predictions at checkout.
- Food-ready timestamps are noisy; infer from courier wait times.
## Common mistakes
One mean prediction for the whole journey; ignoring real-time load; random splits on time data; recomputing ETAs for every restaurant on every search; no fallback in abnormal conditions; measuring only average error.
## Deep-dive questions
Why split the ETA into stages? Search pages need ETAs for 40 restaurants per request: how do you afford that? It starts raining at 7 pm: what in your system reacts? Do you show the median or something else, and why? How do you measure whether the estimates are good?
## What strong looks like
Stage decomposition, fresh kitchen and courier features from streams, quantile models with a baseline, caching for search and exact checkout predictions, re-prediction during the order, and evaluation by lateness rate, quantile coverage and slices.

# guide: dynamic-pricing
## Scope and scale
A ride-hailing app in about 400 cities. Prices (surge multipliers) are recomputed for each small map area (for example a hexagon a few hundred metres across) every minute. Higher prices should cut excess demand and attract drivers so riders still get a car within a few minutes. Regulations and fairness rules cap prices in some places, and the pricing policy is tested before rollout.
## Core components
Streams of ride requests, app opens, driver locations and trip states, a geospatial index of areas, stream jobs computing current demand and supply per area, short-horizon demand and supply forecasting models, an elasticity model (how demand and driver supply respond to price), a pricing policy service producing multipliers with caps and smoothing, a price quote service that locks a price for the rider, driver incentives display, logging, and a switchback experimentation framework.
## Key decisions and trade-offs
- Price is an intervention, not just a prediction: forecasts tell you the imbalance, elasticity tells you what the price will do.
- Short-horizon forecasts per area and minute, with neighbouring areas sharing information.
- Smoothing across time and space to avoid jumpy prices and drivers chasing boundaries.
- Hard caps, emergency overrides (disasters), and fairness constraints.
- Experiments: user-level A/B tests leak through the shared driver pool; use switchback (time-area) designs.
- Quote locking so the price a rider accepts is honoured.
## Common mistakes
Setting price from a demand forecast alone; ignoring the supply response; per-area prices that flicker minute to minute; A/B testing riders while they share drivers; no caps or emergency override; ignoring that the policy changes the data it learns from.
## Deep-dive questions
How do you decide the multiplier for one area right now? Prices in two neighbouring areas differ a lot: what goes wrong? How would you test a new pricing policy fairly? A natural disaster hits a city: what should the system do? What data tells you how riders respond to price if you always surge at busy times?
## What strong looks like
Streaming demand and supply per area, short-horizon forecasting, an explicit elasticity-based policy with caps and smoothing, quote locking, safeguards and overrides, and switchback experiments, with awareness of feedback loops and fairness.

# guide: notification-ranking
## Scope and scale
A social app with about 300 million daily users. Billions of candidate notifications a day (likes, comments, new followers, friend posts, recommendations, reminders). The system decides which to send as push, which to keep in the in-app inbox only, and when. The goal is long-term engagement without driving opt-outs and uninstalls.
## Core components
Event producers emitting candidate notifications to a queue, aggregation and deduplication ("5 people liked your photo"), a feature service (user activity patterns, past open rates, notification type, actor affinity, recent volume), a model predicting open and opt-out or uninstall risk, a decision layer comparing the value of sending now, later or not at all, per-user volume caps and quiet hours, a scheduler for send-time, delivery through push providers, logging, and long-term holdout experiments.
## Key decisions and trade-offs
- Framing: incremental value of sending versus not sending (uplift), not raw open probability.
- Multi-objective: opens and sessions versus opt-out, disable and uninstall risk.
- Global per-user budget and fatigue features; notifications compete with each other.
- Send-time optimisation from activity patterns; time zones and quiet hours.
- Aggregate low-value events instead of sending each.
- Long-term holdouts, because sending more lifts short-term metrics while eroding trust.
## Common mistakes
Sending everything above a probability threshold; optimising opens only; no per-user cap; ignoring time zones; deciding each notification in isolation; measuring only a few days.
## Deep-dive questions
Why isn't high predicted open probability enough to send? A user gets 30 candidates today: how many do they receive and which? When should a notification be sent? How do you measure the cost of a notification? How would you test a change without fooling yourself with short-term gains?
## What strong looks like
An uplift-style framing with opt-out risk, aggregation and dedupe, a budgeted decision layer with caps, quiet hours and send-time choice, reliable delivery via queues, and long-term holdout measurement.
