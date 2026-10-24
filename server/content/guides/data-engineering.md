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

# guide: ecommerce-warehouse
## Scope and scale
An online store's operational Postgres database holds orders, order items, products, customers and payments. About 2 million orders a day with around 5 items each (roughly 10 million order lines a day), 50,000 products in a category tree, 20 million customers. Analysts use a BI tool and need yesterday's numbers by 6am, with 3 years of history. That is only a few GB of new fact rows a day and a few TB in total, so one cloud warehouse handles it without a cluster framework.
## Core components
Extraction from a read replica (incremental by updated_at with a delete feed, or change data capture), a raw landing schema or bucket kept immutable, staging models that clean and deduplicate, a star schema: fact_order_line at one row per order line, dimensions dim_customer, dim_product, dim_date and dim_region with surrogate keys, an order-level fact or allocated header measures for shipping and discounts, refund and cancellation rows, aggregate tables or marts for common reports, orchestration (Airflow or dbt jobs) with data checks, BI on top.
## Key decisions and trade-offs
- Declare the grain first: order line, so units and item revenue add up; order-level amounts (shipping fee, order discount) are either allocated to lines or kept in a separate order fact, never repeated on every line.
- Star schema versus one big table: the star keeps dimensions consistent and cheap to change; a wide denormalised table is fine as a mart on top for a BI tool.
- History of product category and customer region: SCD Type 2 when reports must show the category at the time of sale, Type 1 when only the current one matters; say which reports need which.
- Incremental loads from a replica keyed on updated_at miss hard deletes and need a lookback window; CDC is more robust. Loads must be idempotent: MERGE on order_line_id or overwrite whole date partitions.
- Refunds and cancellations arrive days later: record them as their own fact rows (negative amounts with a refund date) so past reports stay reproducible, rather than silently rewriting the original sale.
- Partition or cluster facts by order date and cluster by product or region; dates and time zones are fixed in one dim_date in the business's reporting time zone.
## Common mistakes
No declared grain, so the shipping fee is repeated on every order line and revenue is overstated; running analytics queries against the production database; append-only daily loads that double-count after a rerun; overwriting a product's category so last year's report changes; incremental extracts that never see deleted or late-updated orders; mixing UTC and local dates so daily totals don't match finance.
## Deep-dive questions
What is one row in your fact table, and where does the shipping fee live? A product moves from Toys to Games: what does last year's sales-by-category report show? An order is refunded two weeks after purchase: how does that appear in the warehouse? The nightly load fails halfway and is rerun: how do you avoid double-counting? How does an analyst get revenue for one region over the last 30 days without scanning everything?
## What strong looks like
States consumers and questions first, declares the order-line grain and handles header-level measures, a clean star schema with surrogate keys and a justified SCD choice per attribute, an incremental and idempotent load from a replica or CDC with delete handling, refunds as facts, sensible partitioning and aggregates, and checks that reconcile row counts and revenue with the source.

# guide: cdc-pipeline
## Scope and scale
A production Postgres (or MySQL) primary with about 200 tables, of which 20 matter most; around 1,500 writes a second on average and 5,000 at peak. The largest table has 500 million rows. Changes must reach the warehouse (Snowflake, BigQuery or a lakehouse) within 5 minutes. The database team forbids heavy queries on the primary. Schema migrations ship weekly, rows are hard-deleted, and some tables have no updated_at column.
## Core components
Log-based capture (Debezium on Kafka Connect reading the Postgres write-ahead log through a logical replication slot, or the MySQL binlog), Kafka topics per table keyed by primary key, a schema registry with compatibility rules, an initial snapshot coordinated with the stream position, a raw append-only change table in the warehouse or lake, a scheduled MERGE every few minutes into current-state tables, delete handling, a dead-letter path, and monitoring of replication slot lag, consumer lag and end-to-end freshness.
## Key decisions and trade-offs
- Log-based versus query-based capture: polling with updated_at misses hard deletes and intermediate updates, needs the column on every table and loads the primary; log-based capture sees every change in commit order at low cost. The outbox pattern is the alternative when consumers want domain events rather than row changes.
- Ordering: partition topics by primary key so changes to one row stay in order; apply only a change whose log position (LSN) is newer than what the target holds, which also makes replays idempotent.
- Bootstrap: snapshot existing rows (Debezium's incremental snapshot or an export from a replica at a known LSN) and start streaming from that position, so nothing is missed or applied twice.
- Merge cadence: micro-batch MERGE every 1 to 5 minutes from the raw change table, deduplicated to the latest change per key, balancing freshness against warehouse cost.
- Deletes arrive as delete events and tombstones: delete in the target or keep a soft-delete flag and deleted_at for audit.
- Schema changes: additive columns flow through automatically; renames and type changes are checked against the registry and pause the table with an alert instead of corrupting it.
- An idle or stopped replication slot makes the primary keep WAL until its disk fills: cap retained WAL, alert on slot lag, and have a re-snapshot runbook.
- At-least-once delivery plus idempotent, LSN-ordered merges is enough; end-to-end exactly-once is rarely worth the cost here.
## Common mistakes
Polling the primary with SELECT on updated_at every few minutes; missing hard deletes; applying changes with parallel consumers in a way that reorders updates to the same row; inserting every change event into the target table so rows are duplicated; doing the initial load separately with no agreed start position; never monitoring the replication slot until the primary's disk fills; a column rename that silently breaks downstream tables.
## Deep-dive questions
How do you load the existing 500 million rows and then switch to streaming without missing or duplicating a change? The connector is down for 3 hours: what happens to the production database, and to the warehouse when it comes back? Two updates to the same row arrive in one batch: which one wins, and how do you know? A developer renames a column in production: what does your pipeline do? How is a hard delete in the source reflected in the warehouse?
## What strong looks like
Chooses log-based capture with reasons, keys topics by primary key, bootstraps with a consistent snapshot and offset handover, lands raw changes and merges them idempotently by log position, handles deletes and schema evolution explicitly, protects the primary from WAL build-up, and monitors freshness end to end with a replay or re-snapshot path.

# guide: ad-click-aggregator
## Scope and scale
An ad network with about 5 million active ads. About 1 billion clicks a day (around 12,000 a second on average, 50,000 at peak), heavily skewed: a few campaigns get a large share. A click must redirect the user to the advertiser's site immediately. Advertisers see clicks per ad and campaign by the minute, at most a minute behind, and query up to 2 years at hourly or daily granularity. Billing is per click and must exclude duplicates and invalid traffic exactly.
## Core components
A click service that logs the click (with a click id derived from the signed impression) and returns a 302 redirect without waiting on downstream systems, Kafka partitioned by ad id (salted for hot ads), a stream processor (Flink) doing event-time tumbling windows per ad per minute with deduplication on click id and invalid-click filtering, an OLAP serving store (Pinot, Druid or ClickHouse) with idempotent upserts keyed by ad and minute plus hourly and daily rollups, raw clicks archived to object storage, a daily batch job that recomputes exact billable counts from raw, a reconciliation step comparing stream and batch, and the advertiser query API and dashboards.
## Key decisions and trade-offs
- Keep the redirect path independent: write the click to a local buffer or Kafka asynchronously and redirect; losing analytics for a moment is better than delaying users, but the buffer must be durable enough for billing.
- Deduplication on a click id issued per impression (so retries and double clicks collapse), held in keyed state with a TTL a little longer than the duplicate window.
- Event-time windows with watermarks; late clicks within allowed lateness update their minute; later ones go to the batch path.
- Exactly-once effects through checkpointed state plus idempotent or transactional sinks keyed by (ad, minute), so a restart from a checkpoint can't double counts.
- Hot ads: salt the key across several partitions and pre-aggregate, then merge; or two-stage aggregation.
- Lambda-style truth: the stream gives fast dashboard numbers; the daily batch over raw clicks with full deduplication and fraud models produces the invoice, and differences are reconciled and explained.
- Pre-aggregate to minute buckets instead of storing every click in the serving store; rollups serve long ranges.
## Common mistakes
Incrementing a counter row in a relational database per click (hot rows, lock contention); storing every click and counting at query time; windows on processing time so restarts shift counts; no deduplication; billing straight from streaming counts with no reconciliation; one partition taking all of a viral ad's traffic; making the redirect wait for the pipeline.
## Deep-dive questions
A user double-clicks or the browser retries: how is the click counted once? A Super Bowl ad gets 100 times the clicks of any other ad: which part of your pipeline overheats first, and what do you do? The stream job crashes and restarts from its last checkpoint: what stops the counts from doubling? How do the dashboard's numbers and the invoice agree? How do you answer clicks per campaign over the last 90 days quickly?
## What strong looks like
A non-blocking redirect, click ids and deduplication, a keyed partitioned log with a hot-key plan, event-time minute windows with checkpointed exactly-once sinks, an OLAP store with rollups, and a batch reconciliation that is the billing source of truth, with numbers to justify sizing.

# guide: iot-telemetry
## Scope and scale
About 5 million devices (smart meters and industrial sensors) each send a reading every 10 seconds: roughly 500,000 readings a second, around 200 bytes each, so about 100 MB/s or 8-9 TB a day raw before compression. Networks are unreliable: devices buffer up to 24 hours offline and then upload in bursts, and device clocks drift. Operators need each device's latest values within seconds and history charts for 2 years. Raw readings are kept 30 days; rolled-up data for 2 years.
## Core components
A device gateway (MQTT broker or batched HTTPS) with per-device certificates, a device registry for metadata, Kafka partitioned by device id, a stream processor that validates, normalises units, deduplicates on device id plus sequence number and computes 1-minute and 1-hour rollups, a latest-value store (Redis or DynamoDB) for live views, a time-series store (TimescaleDB, InfluxDB or Cassandra keyed by device and time bucket) for recent raw and rollups, Parquet archive in object storage partitioned by date for older data, a rules engine for threshold and silence alerts, and a query API that picks resolution from the requested range.
## Key decisions and trade-offs
- MQTT keeps long-lived connections cheap for chatty devices; batched HTTPS suits devices that wake, upload and sleep.
- Partition by device id so a device's readings stay ordered; bucket storage by device and day so no partition grows without bound and recent writes don't all hit one time partition.
- Timestamps: keep device time, a per-device sequence number and server receive time; correct obvious clock skew using receive time and flag it rather than trusting either blindly.
- Late uploads after reconnecting: write raw points idempotently and recompute only the affected rollup windows.
- Precomputed rollups make a 2-year chart a few thousand points; raw points serve only short ranges.
- Tiered retention and columnar compression (delta and delta-of-delta encoding) keep storage proportional.
- Reconnect storms after an outage: devices back off with jitter, gateways throttle, Kafka absorbs the burst and processors catch up.
## Common mistakes
One row per reading in a relational table with a global index; partitioning only by time so all current writes hit one hot partition; trusting device clocks or ignoring them entirely; computing month-long charts from raw points; no plan for a million devices reconnecting at once; no device authentication; no way to notice a device that went silent.
## Deep-dive questions
A device is offline for 6 hours, then uploads everything at once: what happens to its charts and rollups? How do you serve a 1-year chart for one device in under a second? A power cut ends and a million devices reconnect within a minute: what protects the pipeline? How do you notice a device that has stopped reporting? What does a device's clock being 20 minutes wrong do to your data?
## What strong looks like
Volume math that drives the design, an authenticated gateway, a device-keyed durable log, a time-series model bucketed by device and time, idempotent writes with sequence numbers, rollups and retention tiers, a latest-value store, explicit late-data and clock-skew handling, silence detection and a reconnect-storm plan.

# guide: lakehouse-platform
## Scope and scale
A company with about 500 analysts and 50 data scientists. About 2 PB already in object storage, growing by about 20 TB a day from roughly 300 sources (batch extracts, database CDC and event streams). BI dashboards need interactive queries (under about 10 seconds) on curated tables; data scientists need reproducible training snapshots. Some columns hold personal data and must be restricted. Today the company has a warehouse plus a raw S3 bucket nobody trusts.
## Core components
Ingestion (batch loaders, CDC connectors, streaming writers) into a bronze layer; an open table format (Apache Iceberg or Delta Lake) for ACID commits, schema evolution and time travel; a shared catalog (Glue, Unity Catalog, Polaris or Nessie) as the single list of tables; silver cleaned and conformed tables; gold business aggregates; Spark for transformation and ML; a SQL engine (Trino, Databricks SQL or a warehouse reading the tables) for BI; table maintenance jobs (compaction, snapshot expiry, clustering or sort order); central access control with column masking and row filters driven by tags; lineage; an orchestrator; quality gates between layers.
## Key decisions and trade-offs
- Table format: Iceberg is engine-neutral with hidden partitioning; Delta is tightly integrated with Spark and Databricks; Hudi is strong for upsert-heavy CDC. The choice matters less than having one.
- Copy-on-write suits read-heavy tables; merge-on-read suits frequent CDC updates, at the cost of compaction work.
- Partition coarsely (by day) and cluster or sort within partitions; partitioning on high-cardinality columns explodes file counts.
- Streaming writes create many small files: commit at a sensible interval and run compaction; expire old snapshots and remove orphan files.
- Concurrent writers use optimistic concurrency on the catalog; compaction and writers can conflict, so schedule and retry.
- Serving BI: query gold tables in place with a SQL engine and caching, or copy gold into a warehouse when concurrency and latency demand it.
- Governance in the catalog (tags, masks, grants), not in bucket policies per team; time travel retention balanced against cost and deletion obligations.
## Common mistakes
Plain Parquet folders with no table format, so readers see half-written data and updates are impossible; partitioning by user id and creating millions of tiny files; streaming commits every few seconds with no compaction; access control by bucket policies; keeping every snapshot forever; one shared cluster for ETL and dashboards so a backfill slows every report.
## Deep-dive questions
A streaming job commits every minute: what happens to query speed after a month, and what do you do about it? A data scientist needs exactly the training data used on March 1: how do they get it? Two jobs write to the same table at once: what keeps it consistent? How do you stop analysts from seeing raw email addresses while data scientists see hashed ones? Should dashboards query the lake directly or a warehouse copy?
## What strong looks like
Medallion layers on an open table format with a single catalog, file-layout and compaction strategy, isolated compute per workload, time travel tied to ML reproducibility, central tag-based governance, quality gates between layers, and cost-aware reasoning backed by the volumes.

# guide: log-analytics
## Scope and scale
About 5,000 hosts and their containers across 3 regions send around 500,000 log lines a second at about 400 bytes each: about 200 MB/s, or 15-20 TB a day raw before compression. Incidents cause bursts of 5x, exactly when logs matter most. Engineers search and filter the last 7 days within 30 seconds of a line being written. Logs are kept a year for audits at low cost; security and audit logs are never dropped, debug logs can be sampled.
## Core components
Agents on every host (Fluent Bit or Vector) tailing files and container output, with disk buffers, batching and compression; regional collectors; Kafka topics per log class (security, application, debug) partitioned for throughput; stream processors that parse (JSON or patterns), enrich (service, pod, region, trace id), redact secrets and personal data, and route; a hot search tier (OpenSearch or Elasticsearch, or Loki or ClickHouse) holding 7 days in time-based indices per service with rollover; an archive tier of compressed files in object storage partitioned by date and service, queried with Athena or Trino; a dead-letter topic for unparsable lines; access control per team; metrics on lag and drops.
## Key decisions and trade-offs
- Full-text indexing of every field (Elasticsearch) gives fast arbitrary search at high cost; indexing only labels (Loki) or columnar storage (ClickHouse) is much cheaper for structured logs.
- Kafka between agents and indexers absorbs bursts and indexer outages; indexers fall behind instead of logs being lost.
- Priority classes under pressure: sample or drop debug first, never security or audit; agents buffer to disk and apply backpressure.
- Time-based indices per service with rollover and lifecycle policies; shard sizes kept in a healthy range.
- Mapping explosion: enforce structured logging conventions and field limits; unknown fields go to a catch-all text field.
- Redact at ingest, before anything is indexed or archived.
- Archive is cheap and slow; rehydrate a slice into the hot tier for an investigation.
## Common mistakes
Agents sending straight to the search cluster with no buffer, so an incident's burst overloads it and logs are lost; keeping a year of logs in the search cluster; one giant index; dynamic mappings that explode when a team logs random keys; dropping lines at random during bursts, including security logs; storing passwords, tokens or card numbers in logs.
## Deep-dive questions
An outage makes every service log 5 times more errors: which part falls behind first, and what do engineers see? How do you search for one request id across all services from 10 minutes ago? An auditor asks for one user's actions from 8 months ago: how do you find them? A team starts logging a JSON field with a random key on every line: what happens to your index? How do you keep passwords and card numbers out of the logs?
## What strong looks like
Volume math, agents with disk buffers and batching, a durable buffer before indexing, parse, enrich and redact stages, a 7-day hot tier sized from the numbers, a cheap archive with a query path, explicit burst and priority policy, mapping controls, and lag monitoring.

# guide: playback-sessionization
## Scope and scale
A video streaming service with about 50 million daily viewers and up to 10 million concurrent streams at peak. Players send a heartbeat every 30 seconds (playhead position, bitrate, buffer state) plus events: start, rebuffer start and end, bitrate change, error, stop. That is roughly 330,000 heartbeats a second at peak plus events. Operations needs quality-of-experience metrics (startup time, rebuffering ratio, error rate) by CDN, region, ISP and device within a minute. Content and licensing teams need exact viewing hours per title per day. Mobile apps play downloaded videos offline and send events later.
## Core components
A player SDK that creates a playback session id and a per-session sequence number and batches events; edge collectors; Kafka partitioned by playback session id; a stateful stream processor (Flink) that deduplicates on session id plus sequence, assembles sessions with a gap timeout (for example 5 minutes without a heartbeat, or an explicit stop) and computes per-session metrics; per-minute QoE aggregates by CDN, region, ISP and device in a real-time OLAP store (Druid or Pinot); raw events in the lake; a daily batch job that rebuilds sessions from raw with full lateness and produces gold viewing hours per title; title and device dimensions; approximate distinct viewers with HyperLogLog.
## Key decisions and trade-offs
- A client-generated playback session id beats inferring sessions from user id and gaps, which merges two devices or splits a paused session.
- Session gap choice: pausing for 20 minutes on the same playback session is one session with idle time; a gap timeout bounds state.
- Watch time from playhead deltas between heartbeats, not heartbeat count times 30 seconds, so pauses, seeks and duplicates don't inflate it.
- Late and duplicate events: deduplicate on sequence, allowed lateness for the live view, the batch path as the source of truth for licensing.
- QoE dimensions multiply (CDN by ISP by device by region): pre-aggregate per minute and cap or roll up long-tail values.
- State size: about 10 million open sessions at a few hundred bytes each is a few GB in RocksDB state, fine with TTL.
- Early results: emit session updates periodically so live dashboards don't wait for a session to close.
## Common mistakes
Counting heartbeats times 30 seconds as watch time; sessionizing on processing time; keying by user id so two devices merge into one session; sessions that never close and state that grows forever; using the real-time numbers for licensing reports; ignoring offline playback that arrives days later.
## Deep-dive questions
A viewer pauses for 20 minutes then resumes: is that one session or two, and why? A phone loses signal and sends 10 minutes of heartbeats at once: what happens to the session and the dashboard? How do you compute rebuffering ratio per CDN per minute without double counting? Your stream job's state keeps growing: what is in it and how do you bound it? Why might the real-time viewing hours and the daily report disagree, and which one wins?
## What strong looks like
Separates the two consumers and their accuracy needs, client session ids and sequence numbers, session-keyed partitioning, gap-based session windows with bounded state, correct watch-time math, per-minute QoE aggregates in an OLAP store, and a batch recomputation as the licensing source of truth.

# guide: payments-reconciliation
## Scope and scale
A marketplace processes about 3 million payments a day through three payment processors (for example Stripe, Adyen and PayPal) in 20 currencies. Each processor delivers a daily settlement report (by SFTP or API) at a different time, with fees deducted and payments batched into payouts; the bank sends daily statements. The internal ledger lives in Postgres. Finance needs results by 9am every day, with every unmatched item explained. Auditors require results to be reproducible for 7 years. The volume is small for a warehouse; correctness and traceability are the hard part.
## Core components
Ingestion of the internal ledger (CDC or a daily snapshot) and of processor reports and bank statements into an immutable raw store with a file registry (checksums, versions, arrival times); parsers per source into one normalised transaction schema (amounts in integer minor units, currency, fees, FX, UTC timestamps, references); a matching engine in SQL or Spark: internal payment to processor transaction by processor reference, then processor payout to bank deposit (many to one, net of fees), then rule-based matches with tolerances and date windows; results and exceptions tables versioned by run and input file versions; exception reason codes and ageing; a workflow for finance to investigate and resolve; alerts for missing files and large breaks; reports.
## Key decisions and trade-offs
- Match on deterministic references first, then rules (amount within FX rounding tolerance, date window), and only then human review; matching only on amount and date collides.
- Settlement lag: unmatched items stay open and are retried for a few days before becoming breaks, instead of alarming on day one.
- Money as integers in minor units or decimals, never floats; fees and FX conversion modelled explicitly.
- Idempotent runs keyed by business date and the exact input file versions; outputs overwrite their partition or are stored per run, so a rerun gives the same answer.
- Corrected or resent files are new versions in the registry and trigger a rerun; a duplicate file with the same checksum is ignored.
- Refunds, partial captures and chargebacks need many-to-many matching.
- Human resolutions are recorded as events, never overwritten by the next run.
## Common mistakes
Floats for money; matching only on amount and date; treating every unmatched item as a break before settlement completes; overwriting results on rerun with no history; processing the same file twice when it is re-sent; ignoring fees and currency conversion; no alert when a file never arrives.
## Deep-dive questions
A processor resends yesterday's file with corrections: what happens? A payout of 1,203 payments lands in the bank as one deposit minus fees: how do you match it? A payment captured at 23:59 settles two days later: is that a break? How do you prove to an auditor what the reconciliation said on a date three years ago? Which mismatches should page someone immediately?
## What strong looks like
Immutable, versioned landing with a file registry, a normalised schema with exact money types, staged matching with references, rules and many-to-one payouts, settlement-lag-aware open items, idempotent versioned runs, an exceptions workflow with reason codes, missing-file alerts and a full audit trail.

# guide: experimentation-analytics
## Scope and scale
About 300 experiments run at once on 40 million daily users. Products already log about 5 billion events a day into the warehouse. Around 500 metrics are defined (conversion, revenue per user, sessions per user, latency) and each experiment picks primary, secondary and guardrail metrics. Scorecards refresh daily, guardrails hourly. Experiments run 2 to 4 weeks. Analysts need per-variant results with confidence intervals.
## Core components
An assignment service that buckets deterministically by hashing user id with an experiment salt; exposure events logged when a variant is actually shown, not at assignment; an exposure table in the warehouse; a metric catalog with definitions as code (SQL or YAML with owner, source events, aggregation and window); a daily pipeline: first exposure per experiment and user, events after exposure joined per user, per-user per-metric daily aggregates partitioned by date and shared across experiments, then per-variant sufficient statistics (count, sum, sum of squares); a statistics engine (t-tests, delta method for ratio metrics, CUPED variance reduction, sequential methods for continuous monitoring); a results store and scorecard UI; health checks (sample ratio mismatch, pre-experiment bias, data freshness); hourly guardrail jobs.
## Key decisions and trade-offs
- Count exposed users, not everyone assigned, so results aren't diluted by people who never saw the change.
- The unit of analysis is the user: per-event analysis treats correlated events as independent and overstates confidence.
- Incremental per-user daily aggregates computed once and reused by every experiment, instead of scanning raw events per experiment.
- Sufficient statistics make variance and intervals cheap; ratio metrics need the delta method.
- Daily peeking inflates false positives with fixed-horizon tests: use sequential testing or only decide at the planned end, except for guardrails.
- One metric definition in the catalog, versioned; a definition change triggers a backfill of affected aggregates.
- Identity: logged-out users have a device id; decide whether assignment follows the device or the account and keep it stable.
## Common mistakes
Counting assigned instead of exposed users; analysing events as independent samples; recomputing every metric from raw events for every experiment every day; metric definitions copied into ad-hoc notebooks; no sample ratio mismatch check; daily peeking with fixed-horizon p-values.
## Deep-dive questions
A variant has 52% of users instead of 50%: what does your system do, and what might cause it? How do you compute revenue per user with a confidence interval for 300 experiments without scanning 5 billion events 300 times? A metric's definition changes mid-experiment: what happens to past results? Product managers check results every day: what problem does that cause, and how do you handle it? A user is logged out on day one and logs in on day three: which variant are they in?
## What strong looks like
Deterministic assignment with exposure logging, a versioned metric catalog, shared incremental per-user aggregates feeding sufficient statistics, correct statistics for ratio metrics, automatic health checks including sample ratio mismatch, a peeking strategy, and backfills on definition changes.

# guide: gdpr-deletion
## Scope and scale
A consumer service with 100 million users receives about 50,000 deletion requests a month, each to be completed within 30 days. Personal data lives in about 30 service databases, Kafka (7-day retention), a 3 PB data lake in Parquet and Iceberg, the warehouse, ML feature stores and training sets, backups kept 35 days, and third-party tools (email and analytics vendors). Financial records such as invoices must be kept 7 years. Every completed deletion must be provable to an auditor.
## Core components
Request intake with identity verification and legal-hold checks; a deletion orchestrator (Temporal, Step Functions or a state table) that tracks each request through fan-out tasks per system with retries and a deadline; a data inventory or catalog that tags personal data and its lineage, keyed by identifiers; an identity map linking user id, email, device ids and processor customer ids; a deletion event topic that service databases consume and acknowledge; batched lake deletes using Iceberg or Delta row-level deletes, then compaction and snapshot expiry so old files are physically removed; warehouse deletes; feature store and training-set handling; crypto-shredding of per-user keys where data is immutable; backups left to expire with deletions re-applied after any restore; third-party deletion through vendor APIs; verification scans; an audit log that records proof without storing the personal data itself; a suppression list so pipelines don't re-ingest deleted users.
## Key decisions and trade-offs
- Delete versus anonymise: legally required records keep non-identifying fields and lose the link to the person.
- Batch lake deletes weekly or daily: rewriting petabytes of files per request is far too expensive; one batched merge-on-read delete per partition amortises the cost within the deadline.
- Time travel and snapshots keep deleted rows: expire snapshots and remove orphan files after the delete commits.
- Pseudonymous ids in analytics mean deleting one mapping row unlinks most analytical data.
- Crypto-shredding (per-user keys for personal columns, keys held in a key store and destroyed on request) suits data that is impractical to rewrite, such as backups and archives.
- Backups: let them age out within the window and replay the deletion list after any restore.
- The workflow must be durable and observable: each system acknowledges, stragglers are retried and escalated before the deadline.
## Common mistakes
Running a DELETE in every table for every request, rewriting the lake thousands of times; forgetting snapshots, time travel and copies such as CSV exports and training sets; restoring a backup that brings deleted users back; no inventory, so some copies are never found; storing the deleted user's email in the audit log; a one-off script instead of a tracked workflow with deadlines.
## Deep-dive questions
How do you delete one user from a 3 PB Parquet lake, how often do you rewrite files, and how do you keep the cost reasonable? You restore a database from last week's backup: how do deleted users stay deleted? How do you know every system has finished, and what if one never answers? Iceberg time travel still shows the user's rows: why, and what do you do? Finance must keep invoices for 7 years: how do you keep them without keeping the person?
## What strong looks like
A durable deletion workflow with per-system acknowledgements and deadlines, a catalog and identity map to find every copy, batched lake deletes plus snapshot expiry, pseudonymisation and crypto-shredding where appropriate, backup and replay handling, a suppression list, verification and privacy-safe proof.
