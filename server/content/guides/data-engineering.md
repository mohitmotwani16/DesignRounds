<!--
Interviewer guides: Data engineering track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
-->

# guide: scd2-warehouse
## Scope and scale
Customer records from several operational systems (CRM, billing, support) land daily or near-real-time. Millions of customers; analysts need current and as-of-date history. Sources disagree, arrive late, and send duplicates or corrections.
## Core components
Ingestion (CDC or batch extracts) into a raw/landing zone, staging with standardisation and deduplication, identity resolution to a business key, SCD2 dimension table (surrogate key, business key, attributes, valid_from, valid_to, is_current, record hash), merge job, data quality checks, orchestration.
## Key decisions and trade-offs
- Business key vs surrogate key; identity resolution across sources and survivorship rules (which source wins per attribute).
- Change detection via attribute hash to avoid spurious versions.
- Effective dates from source event time, not load time; late-arriving records require re-splitting history (close and reopen intervals) rather than appending.
- Idempotent MERGE so reruns don't duplicate versions; keep raw data immutable for replay.
## Common mistakes
Using load timestamp as effective date; creating a new version on every load even without changes; no handling of late or out-of-order records; overlapping or gapped validity intervals; non-idempotent loads.
## Deep-dive questions
A correction for last month arrives today: how does history change? How do you guarantee no overlapping intervals per key? How do you rebuild the dimension from raw if logic changes? How do you query "customer address as of March 1"?
## What strong looks like
Clear keys and survivorship rules, hash-based change detection, event-time effective dating, late-data re-splitting, idempotent merges, interval integrity checks, and replayable raw storage.

# guide: realtime-analytics
## Scope and scale
Events from multiple regions at hundreds of thousands to millions per second; dashboards show aggregates within seconds to a minute; duplicates and replays must not inflate counts.
## Core components
Regional ingestion endpoints, durable log (Kafka/Kinesis) partitioned by key, stream processor (Flink-style) with event-time windows and state, deduplication by event ID, OLAP serving store (Druid/ClickHouse/Pinot), raw archive in object storage for replay/backfill, dashboards.
## Key decisions and trade-offs
- Event time vs processing time; watermarks and allowed lateness determine when windows close and how late data updates results.
- Exactly-once effects via idempotent sinks or transactional sinks with checkpointing; dedupe state with TTL.
- Pre-aggregation in stream vs raw ingestion into OLAP (flexibility vs cost).
- Cross-region: aggregate regionally then merge, or centralise.
## Common mistakes
Windowing on processing time; no dedupe so retries double counts; no replay path; unbounded state; ignoring late events.
## Deep-dive questions
An event arrives 10 minutes late: what happens to the dashboard? How are duplicate deliveries handled? How do you backfill after a bug in aggregation logic? What latency target do you commit to and why?
## What strong looks like
Durable partitioned log, event-time windowing with watermarks, dedupe and exactly-once sinks, OLAP serving, raw archive for replay, and explicit latency/lateness trade-offs.

# guide: etl-framework
## Scope and scale
A platform used by many teams to build pipelines: hundreds to thousands of pipelines with shared conventions, retries, backfills, and lineage.
## Core components
Declarative pipeline specs (YAML/SDK) in version control, connector library, orchestrator (DAG scheduling, dependencies, retries), execution layer (Spark/SQL warehouse/containers), metadata store (runs, ownership), lineage capture, data quality hooks, alerting, CI for pipeline definitions.
## Key decisions and trade-offs
- Declarative config vs code flexibility; escape hatches for custom logic.
- Idempotent, partition-based tasks (overwrite by date partition) to make retries and backfills safe.
- Multi-tenant isolation: per-team resource quotas, separate credentials, failure isolation.
- Data-aware scheduling (run when inputs are ready) vs time-based.
## Common mistakes
Append-only loads that duplicate on retry; no backfill story; shared credentials across teams; no ownership metadata; a framework so rigid teams bypass it.
## Deep-dive questions
How does a team backfill two years of data without disrupting daily runs? What makes a task safe to retry? How do you show lineage from source to dashboard? How do you stop one team's heavy job from starving others?
## What strong looks like
Declarative, versioned specs; reusable connectors; idempotent partitioned execution; dependency- and data-aware orchestration; backfills; ownership, lineage, and quality checks built in; tenant isolation.

# guide: clickstream
## Scope and scale
Web and mobile SDKs emit billions of events/day; bursts during campaigns; mobile clients go offline; schemas evolve across many app versions.
## Core components
Client SDKs with local buffering, batching, compression and retry; collection endpoints behind a load balancer; schema registry and validation; durable event log; stream enrichment (sessionisation, geo, bot filtering); raw lake storage; warehouse tables; PII handling.
## Key decisions and trade-offs
- Client batching (fewer requests, battery/bandwidth) vs latency; persistent queue on device for offline.
- Event IDs and client timestamps plus server receive time; dedupe downstream.
- Schema evolution: backward-compatible changes, versioned schemas, invalid events routed to a quarantine stream rather than dropped.
- PII minimisation at the SDK and collector; consent flags.
## Common mistakes
Sending one request per event; no offline buffering; breaking schemas for old app versions; dropping malformed events silently; collecting PII by default.
## Deep-dive questions
A phone is offline for two days: what happens to its events? How do you add a field without breaking old producers? How do you handle a 10x burst? How do you keep PII out of analytics?
## What strong looks like
Robust SDK buffering/batching, scalable stateless collectors, durable log, schema registry with compatibility rules and quarantine, dedupe, and privacy controls.

# guide: data-alerting
## Scope and scale
Teams define alerts on data freshness, volume, and metrics for thousands of datasets; alerts must reach the right owner with evidence and avoid noise storms.
## Core components
Rule definition API/UI (as code), metadata/ownership catalog, evaluator service (scheduled and event-driven checks), metric/statistics store, alert state machine (ok → firing → resolved), grouping/deduplication, routing and escalation to on-call channels, alert history.
## Key decisions and trade-offs
- Scheduled evaluation vs event-driven (on pipeline completion).
- Static thresholds vs anomaly detection baselines with seasonality.
- Grouping related alerts (same upstream root cause) and suppression windows to prevent storms.
- Evidence: include failing query, recent values, lineage of upstream failures.
## Common mistakes
One alert per failing check per run (storms); no ownership mapping; alerts with no context; no resolution state so alerts never clear.
## Deep-dive questions
An upstream table is late and 40 downstream checks fail: what does the on-call see? How do you avoid paging at 3am for a known delay? How do teams test new rules?
## What strong looks like
Rules as code, ownership routing, stateful alerts with dedupe and grouping by root cause, evidence in notifications, escalation policies, and silencing.

# guide: fraud-data-platform
## Scope and scale
Payment events enriched with recent and historical signals for risk decisions within a checkout budget (e.g. < 100 ms); investigators need traceability.
## Core components
Event stream of payments, streaming feature computation (velocity counts, aggregates), online feature store (low-latency KV), offline store/lake for history and training, rules engine and/or model service, decision service, decision log/audit store, case management for investigators.
## Key decisions and trade-offs
- Online/offline parity: same feature definitions for training and serving to avoid skew.
- Freshness vs cost: streaming updates for velocity features, batch for long history.
- Fallback when features or model are unavailable (default rules, conservative decisions).
- Immutable decision records capturing feature values, rule/model versions.
## Common mistakes
Computing features with heavy queries at decision time; different logic for training vs serving; no fallback; decisions that can't be explained later.
## Deep-dive questions
How do you compute "transactions from this card in the last 10 minutes" within the latency budget? How do you guarantee training features match serving? What happens if the feature store is slow? How does an investigator see why a payment was declined?
## What strong looks like
Streaming feature pipeline into an online store, offline parity, strict latency budget with fallbacks, versioned rules/models, and a full decision audit trail.

# guide: data-quality
## Scope and scale
A framework for many teams to declare expectations on datasets and pipeline runs, detect anomalies, and trace impact downstream.
## Core components
Expectation/contract definitions as code alongside pipelines, check execution integrated into the orchestrator, profiling and metric store (freshness, row counts, null rates, distributions), anomaly detection, lineage graph, incident and notification service, dashboards/scorecards.
## Key decisions and trade-offs
- Blocking checks (stop bad data from publishing) vs warning checks.
- Data contracts between producers and consumers; schema change detection.
- Rules vs statistical anomaly detection; handling seasonality and false positives.
- Lineage collection: parse SQL/queries or emit from orchestrator.
## Common mistakes
Checks that only run after data is already consumed; no ownership; noisy anomaly alerts; no lineage, so impact is unknown.
## Deep-dive questions
Which checks should block a publish and which only warn? How does a consumer learn a source changed its schema? How do you find all dashboards affected by a bad table?
## What strong looks like
Declarative expectations/contracts, integration with pipeline runs (circuit-breaking where needed), metric history with anomaly detection, lineage-based impact analysis, ownership and incident workflow.

# guide: food-delivery-analytics
## Scope and scale
Food delivery platform (Uber Eats/Swiggy/Zomato style). Two consumers: restaurant partners need live metrics under 2 minutes; executives need daily reports. ~5M orders/day with 6 lifecycle events each (~30M events/day, ~350/s average, ~830/s at a 500K orders/hour dinner peak); ~1 KB per event (~30 GB/day, ~22 TB raw over 2 years). Retention: 2 years analytics, 90 days real-time.
## Core components
Order/delivery services publish events to Kafka keyed by restaurant_id; a streaming job (Spark Structured Streaming or Flink) maintains per-restaurant running metrics in Redis/DynamoDB for the live dashboard; the same topic lands raw in object storage (e.g. Firehose to S3) as bronze; scheduled Spark jobs (Airflow) build silver facts/dimensions and gold daily aggregates for reports; schema registry with data contracts; quality checks and monitoring at each layer.
## Key decisions and trade-offs
- One event stream as source of truth with two shaped views (Lambda-style) vs a single streaming path (Kappa): two paths keep heavy historical aggregation cheap and let batch correct the live view.
- Partition the topic by restaurant_id for per-restaurant ordering; 6-12 partitions is ample at this rate.
- Medallion model: raw bronze, silver fact_orders/dim_restaurants/dim_drivers, gold daily_restaurant_metrics; date partitioning or clustering on facts.
- At-least-once delivery with idempotent sinks (MERGE on order_id) vs exactly-once complexity.
- Late and out-of-order events: watermarks for the live metrics, batch path as the correction.
## Common mistakes
Jumping to tools without separating the two audiences and SLAs; skipping volume math and over-building (huge Kafka clusters, sharded serving stores for ~50 MB of state); building separate pipelines from separate sources instead of one stream; no quality checks beyond null checks; ignoring backfills, idempotency and schema evolution.
## Deep-dive questions
How are the live per-restaurant metrics computed and kept correct when events arrive late or twice? How would you reprocess three months after a metric definition changes? What checks catch a restaurant that was never onboarded, or impossible delivery times? What happens when the streaming job is down for a deploy?
## What strong looks like
Clarified consumers and SLAs, explicit estimates that justify a modest design, one stream feeding streaming and batch paths, a clear medallion model, quality checks mapped to dimensions at each layer, and a concrete operations plan: idempotent writes, partition-overwrite backfills, schema-on-read in bronze with strict silver/gold.
