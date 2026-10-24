export const tracks = [
  {
    id: "software-engineering",
    label: "Backend and full-stack",
    shortLabel: "Backend",
    description: "Design the products and backend services engineers build every day.",
    icon: "service",
    color: "violet",
  },
  {
    id: "data-engineering",
    label: "Data engineering",
    shortLabel: "Data engineering",
    description: "Build reliable data movement, storage, quality, and analytics systems.",
    icon: "database",
    color: "blue",
  },
  {
    id: "machine-learning",
    label: "Machine learning & AI",
    shortLabel: "ML & AI",
    description: "Design the pipelines and serving systems behind production ML.",
    icon: "model",
    color: "teal",
  },
  {
    id: "platform-infrastructure",
    label: "Platform & infrastructure",
    shortLabel: "Platform",
    description: "Make distributed services observable, resilient, and operable.",
    icon: "platform",
    color: "orange",
  },
  {
    id: "distributed-systems",
    label: "Distributed systems",
    shortLabel: "Distributed systems",
    description: "Work through the building blocks: replication, consensus, ordering, and coordination.",
    icon: "distributed",
    color: "rose",
  },
  {
    id: "frontend-mobile",
    label: "Frontend & mobile",
    shortLabel: "Frontend & mobile",
    description: "Design client architectures that stay fast, offline-tolerant, and safe to ship.",
    icon: "frontend",
    color: "green",
  },
];

export const prompts = [
  {
    id: "url-shortener", title: "Design a URL shortener", description: "Build a service that turns long links into short, shareable URLs.",
    track: "software-engineering", access: "free", category: "Storage", difficulty: "Beginner", minutes: 35, icon: "link", color: "violet", popular: true,
    requirements: ["A user submits a long URL and receives a short link.", "Opening a short link redirects to its destination with low latency.", "Link creation and redirect traffic can grow independently."],
    considerations: ["Read-heavy traffic", "Unique short codes", "Link expiration"],
    expectedOutcome: "A request/redirect architecture, a short-code strategy, a storage model, and a plan for cache behavior and growth.",
  },
  {
    id: "chat-system", title: "Design a chat system", description: "Create a real-time messaging experience for millions of people.",
    track: "software-engineering", access: "paid", category: "Messaging", difficulty: "Intermediate", minutes: 45, icon: "message", color: "blue", popular: true,
    considerations: ["WebSocket connections", "Message ordering", "Offline delivery"],
  },
  {
    id: "news-feed", title: "Design a news feed", description: "Deliver a relevant, fresh feed as people and publishers post.",
    track: "software-engineering", access: "paid", category: "Data systems", difficulty: "Advanced", minutes: 60, icon: "feed", color: "orange", popular: true,
    considerations: ["Fan-out strategy", "Feed freshness", "Ranking"],
  },
  {
    id: "file-storage", title: "Design cloud file storage", description: "Sync large files reliably across devices and collaborators.",
    track: "software-engineering", access: "paid", category: "Storage", difficulty: "Advanced", minutes: 60, icon: "storage", color: "green",
    considerations: ["Chunked uploads", "Metadata and blobs", "Sync conflicts"],
  },
  {
    id: "rate-limiter", title: "Design an API rate limiter", description: "Protect a public API without slowing down well-behaved clients.",
    track: "software-engineering", access: "paid", category: "Reliability", difficulty: "Intermediate", minutes: 40, icon: "shield", color: "teal",
    considerations: ["Token bucket", "Distributed counters", "Fail-open or closed"],
  },
  {
    id: "video-streaming", title: "Design video streaming", description: "Stream adaptive-quality video to a global audience.",
    track: "software-engineering", access: "paid", category: "Media", difficulty: "Advanced", minutes: 60, icon: "video", color: "rose",
    considerations: ["Transcoding", "CDN delivery", "Adaptive bitrate"],
  },
  {
    id: "ride-hailing", title: "Design a ride-hailing service", description: "Match riders with nearby drivers and track trips in real time.",
    track: "software-engineering", access: "paid", category: "Geospatial", difficulty: "Advanced", minutes: 60, icon: "map", color: "green",
    considerations: ["Geospatial indexing", "Matching fairness", "Trip state machine"],
  },
  {
    id: "ticket-booking", title: "Design a high-demand ticketing platform", description: "Sell limited-inventory tickets fairly when a popular event goes on sale.",
    track: "software-engineering", access: "paid", category: "Transactions", difficulty: "Advanced", minutes: 60, icon: "booking", color: "orange",
    considerations: ["Inventory consistency", "Reservation expiry", "Sale traffic spikes"],
  },
  {
    id: "notification-service", title: "Design a notification delivery service", description: "Deliver timely, preference-aware messages across email, push, and SMS.",
    track: "software-engineering", access: "free", category: "Messaging", difficulty: "Intermediate", minutes: 45, icon: "notification", color: "teal",
    requirements: ["Product services can submit notifications through a common interface.", "Users can manage channel preferences and quiet hours.", "Temporary provider failures do not silently lose important messages."],
    considerations: ["Fan-out and prioritization", "Retries and deduplication", "Provider quotas"],
    expectedOutcome: "An intake, preference, queue, and delivery architecture with clear retry, idempotency, priority, and provider-failure behavior.",
  },
  {
    id: "web-crawler", title: "Design a distributed web crawler", description: "Discover and fetch public pages continuously while respecting site policies.",
    track: "software-engineering", access: "paid", category: "Search", difficulty: "Advanced", minutes: 60, icon: "crawler", color: "blue",
    considerations: ["Frontier partitioning", "Politeness and robots rules", "Deduplication"],
  },
  {
    id: "autocomplete", title: "Design a search autocomplete service", description: "Suggest useful completions quickly as users type into a search box.",
    track: "software-engineering", access: "paid", category: "Search", difficulty: "Intermediate", minutes: 40, icon: "autocomplete", color: "violet",
    considerations: ["Prefix indexing", "Ranking and freshness", "Sharding and caching"],
  },
  {
    id: "collaborative-editor", title: "Design a collaborative document editor", description: "Let multiple people edit and comment on the same document in real time.",
    track: "software-engineering", access: "paid", category: "Collaboration", difficulty: "Advanced", minutes: 60, icon: "editor", color: "green",
    considerations: ["Conflict-free editing", "Presence and reconnects", "Version history"],
  },
  {
    id: "paste-service", title: "Design a text snippet sharing service", description: "Create and share short text snippets with optional expiry and access controls.",
    track: "software-engineering", access: "paid", category: "Storage", difficulty: "Beginner", minutes: 35, icon: "paste", color: "rose",
    considerations: ["Identifier generation", "Expiry and deletion", "Abuse prevention"],
  },
  {
    id: "payment-platform", title: "Design a payment processing platform", description: "Accept payment requests reliably without charging a customer twice.",
    track: "software-engineering", access: "paid", category: "Transactions", difficulty: "Advanced", minutes: 60, icon: "payment", color: "teal",
    considerations: ["Idempotency keys", "State transitions", "Reconciliation and audit"],
  },
  {
    id: "task-scheduler", title: "Design a distributed task scheduler", description: "Schedule one-off and recurring jobs across a fleet of workers.",
    track: "software-engineering", access: "free", category: "Distributed systems", difficulty: "Advanced", minutes: 60, icon: "scheduler", color: "orange",
    requirements: ["Clients can submit delayed and recurring tasks.", "Eligible tasks are dispatched to available workers.", "Worker crashes and retries do not silently lose scheduled work."],
    considerations: ["Time partitioning", "Leases and retries", "At-least-once execution"],
    expectedOutcome: "A schedule store and dispatcher design, worker lease/retry semantics, and explicit delivery and idempotency guarantees.",
  },
  {
    id: "distributed-cache", title: "Design a distributed caching service", description: "Serve frequently accessed data quickly across a growing fleet of application nodes.",
    track: "software-engineering", access: "paid", category: "Storage", difficulty: "Advanced", minutes: 60, icon: "cache", color: "blue",
    considerations: ["Partitioning and replication", "Eviction and expiry", "Hot keys"],
  },
  {
    id: "api-gateway", title: "Design a multi-tenant API gateway", description: "Route external API traffic safely to independently operated backend services.",
    track: "software-engineering", access: "paid", category: "Networking", difficulty: "Advanced", minutes: 60, icon: "gateway", color: "violet",
    considerations: ["Control plane vs data plane", "Policy evaluation", "Safe configuration rollout"],
  },
  {
    id: "comment-system", title: "Design a comment system for social posts", description: "Let millions of people post and read comments under popular posts and videos.",
    track: "software-engineering", access: "free", category: "Data systems", difficulty: "Beginner", minutes: 35, icon: "message", color: "green",
    requirements: ["Users can post a comment on a post and see it appear for others shortly after.", "Anyone can read a post's comments quickly, newest first, page by page.", "A burst of comments on a viral post must not take the service down."],
    considerations: ["Separate read and write paths", "Queue as a write buffer", "Caching and eventual consistency"],
    expectedOutcome: "A write path buffered by a queue, a cache-backed read path with pagination, a comment data model, and a clear statement of the consistency users will see.",
  },
  {
    id: "webhook-service", title: "Design a webhook receiver service", description: "Accept event notifications from partners like Stripe or Shopify without losing any.",
    track: "software-engineering", access: "paid", category: "Messaging", difficulty: "Intermediate", minutes: 40, icon: "events", color: "orange",
    considerations: ["Acknowledge after durable enqueue", "Signature verification", "Duplicates and ordering"],
  },
  {
    id: "dating-app", title: "Design a swipe-based dating app", description: "Show nearby profiles, record swipes, and match two people who like each other.",
    track: "software-engineering", access: "paid", category: "Geospatial", difficulty: "Advanced", minutes: 60, icon: "map", color: "rose",
    considerations: ["Geospatial candidate search", "Swipe write throughput", "Exactly-once matches"],
  },

  {
    id: "scd2-warehouse", title: "Design a customer warehouse with SCD Type 2", description: "Keep a trustworthy history of how customer attributes change over time.",
    track: "data-engineering", access: "free", category: "Warehousing", difficulty: "Intermediate", minutes: 45, icon: "warehouse", color: "blue", popular: true,
    requirements: ["Ingest customer records from multiple operational systems.", "Analysts can query both current values and historical values as of a date.", "Late, duplicate, or corrected records must not silently corrupt history."],
    considerations: ["Business keys", "Effective dates", "Late-arriving changes"],
    expectedOutcome: "A dimensional model with SCD Type 2 validity columns, a repeatable change-detection flow, and explicit late-data handling.",
  },
  {
    id: "realtime-analytics", title: "Design a real-time analytics platform", description: "Turn a large event stream into operational metrics people can act on.",
    track: "data-engineering", access: "paid", category: "Streaming", difficulty: "Advanced", minutes: 60, icon: "analytics", color: "teal", popular: true,
    considerations: ["Event time vs processing time", "Windowing", "Replay and deduplication"],
  },
  {
    id: "food-delivery-analytics", title: "Design analytics for a food delivery platform", description: "Give restaurants live order metrics and executives daily reports from one stream of order events.",
    track: "data-engineering", access: "paid", category: "Streaming", difficulty: "Intermediate", minutes: 45, icon: "analytics", color: "orange",
    considerations: ["Two consumers, two SLAs", "Streaming and batch paths", "Layered quality checks"],
  },
  {
    id: "etl-framework", title: "Design a reusable ETL/ELT framework", description: "Give many teams a consistent way to build, run, and operate data pipelines.",
    track: "data-engineering", access: "paid", category: "Orchestration", difficulty: "Advanced", minutes: 60, icon: "pipeline", color: "violet", popular: true,
    considerations: ["Declarative task definitions", "Idempotent retries", "Multi-tenant isolation"],
  },
  {
    id: "clickstream", title: "Design clickstream event tracking at scale", description: "Collect trustworthy product events from web and mobile clients.",
    track: "data-engineering", access: "paid", category: "Event ingestion", difficulty: "Advanced", minutes: 60, icon: "events", color: "orange", popular: true,
    considerations: ["SDK batching", "Schema evolution", "PII minimization"],
  },
  {
    id: "data-alerting", title: "Design a data alerting system", description: "Notify the right owner when pipelines, data freshness, or business metrics go wrong.",
    track: "data-engineering", access: "paid", category: "Observability", difficulty: "Intermediate", minutes: 40, icon: "alert", color: "rose",
    considerations: ["Rule evaluation", "Alert grouping", "Escalation policy"],
  },
  {
    id: "fraud-data-platform", title: "Design a fraud detection data platform", description: "Join streaming payments with historical signals for fast, explainable fraud decisions.",
    track: "data-engineering", access: "paid", category: "Data + ML", difficulty: "Advanced", minutes: 60, icon: "fraud", color: "teal",
    considerations: ["Online/offline feature parity", "Feature freshness", "Decision audit trail"],
  },
  {
    id: "data-quality", title: "Design a data quality & observability framework", description: "Help teams detect, diagnose, and prevent incorrect or stale data.",
    track: "data-engineering", access: "paid", category: "Governance", difficulty: "Intermediate", minutes: 45, icon: "quality", color: "green",
    considerations: ["Contracts and expectations", "Lineage", "Anomaly detection"],
  },
  {
    id: "ecommerce-warehouse", title: "Design a data warehouse for an online store", description: "Model orders, products and customers so analysts can answer sales questions quickly and correctly.",
    track: "data-engineering", access: "free", category: "Warehousing", difficulty: "Beginner", minutes: 40, icon: "cart", color: "green",
    requirements: ["Orders, order items, products and customers are loaded from the store's operational database every day.", "Analysts can report revenue, units and repeat customers by day, product, category and region.", "Refunds, cancellations and reruns of a failed load never double-count or lose sales."],
    considerations: ["Fact table grain", "Star schema", "Incremental loads"],
    expectedOutcome: "A star schema with a declared fact grain and shared dimensions, an incremental and rerunnable daily load, and a plan for refunds, partitioning and data checks.",
  },
  {
    id: "cdc-pipeline", title: "Design a change data capture pipeline", description: "Stream every insert, update and delete from a production database into the warehouse within minutes.",
    track: "data-engineering", access: "free", category: "Change data capture", difficulty: "Intermediate", minutes: 45, icon: "cdc", color: "violet",
    requirements: ["Changes to the main tables of a production database reach warehouse tables within 5 minutes.", "Updates and deletes are reflected correctly, not only new rows.", "The pipeline never slows the production database and recovers from failures without losing or duplicating changes."],
    considerations: ["Log-based capture", "Initial snapshot and ordering", "Schema changes and deletes"],
    expectedOutcome: "A log-based capture flow through a durable log, a snapshot-then-stream bootstrap, idempotent ordered merges into the warehouse, and handling of deletes, schema changes and replay.",
  },
  {
    id: "ad-click-aggregator", title: "Design an ad click aggregator", description: "Count ad clicks in near real time for advertiser dashboards, accurately enough to bill on.",
    track: "data-engineering", access: "paid", category: "Streaming", difficulty: "Advanced", minutes: 60, icon: "click", color: "orange", popular: true,
    considerations: ["Exactly-once counting", "Hot ads and skew", "Reconciliation with batch"],
  },
  {
    id: "iot-telemetry", title: "Design an IoT sensor telemetry platform", description: "Ingest readings from millions of devices and serve live and historical views of each one.",
    track: "data-engineering", access: "paid", category: "Time series", difficulty: "Advanced", minutes: 60, icon: "sensor", color: "teal",
    considerations: ["Out-of-order device data", "Time-series storage and downsampling", "Hot and cold retention tiers"],
  },
  {
    id: "lakehouse-platform", title: "Design a lakehouse for analytics and ML", description: "Give analysts and data scientists one governed copy of company data on low-cost object storage.",
    track: "data-engineering", access: "paid", category: "Storage", difficulty: "Advanced", minutes: 60, icon: "lake", color: "blue",
    considerations: ["Open table formats", "Small files and compaction", "Governance and access control"],
  },
  {
    id: "log-analytics", title: "Design a centralized log ingestion pipeline", description: "Collect logs from thousands of servers so engineers can search recent logs in seconds and keep old ones for audits.",
    track: "data-engineering", access: "paid", category: "Event ingestion", difficulty: "Intermediate", minutes: 45, icon: "logs", color: "rose",
    considerations: ["Agents and buffering", "Search index vs archive tiers", "Bursts and backpressure"],
  },
  {
    id: "playback-sessionization", title: "Design video playback analytics with sessions", description: "Turn player heartbeats into viewing sessions and quality-of-experience metrics for a streaming service.",
    track: "data-engineering", access: "paid", category: "Streaming", difficulty: "Advanced", minutes: 60, icon: "play", color: "violet",
    considerations: ["Session windows", "Late and duplicate heartbeats", "Quality metrics by device and region"],
  },
  {
    id: "payments-reconciliation", title: "Design a payments reconciliation pipeline", description: "Match every internal payment against processor and bank settlement files, and flag what doesn't match.",
    track: "data-engineering", access: "paid", category: "Finance data", difficulty: "Intermediate", minutes: 45, icon: "scale", color: "green",
    considerations: ["Matching keys and tolerances", "Idempotent reruns", "Audit trail of breaks"],
  },
  {
    id: "experimentation-analytics", title: "Design an A/B test analytics pipeline", description: "Compute trustworthy results for hundreds of concurrent experiments from assignment and event logs.",
    track: "data-engineering", access: "paid", category: "Experimentation", difficulty: "Advanced", minutes: 60, icon: "experiment", color: "teal",
    considerations: ["Exposure logging", "Metric definitions as code", "Sample ratio mismatch checks"],
  },
  {
    id: "gdpr-deletion", title: "Design user data deletion across a data platform", description: "Honour right-to-be-forgotten requests across the warehouse, data lake, streams and backups within 30 days.",
    track: "data-engineering", access: "paid", category: "Governance", difficulty: "Intermediate", minutes: 45, icon: "erase", color: "orange",
    considerations: ["Finding every copy", "Deleting from immutable files", "Crypto-shredding and proof of deletion"],
  },

  {
    id: "recommendation-engine", title: "Design a recommendation system", description: "Recommend useful content while balancing relevance, freshness, and exploration.",
    track: "machine-learning", access: "free", category: "Personalization", difficulty: "Advanced", minutes: 60, icon: "model", color: "violet", popular: true,
    requirements: ["Recommendations use user and item signals.", "New users and new items still receive reasonable results.", "The system can measure changes without blocking requests."],
    considerations: ["Candidate generation", "Ranking", "Cold start"],
    expectedOutcome: "An online candidate/ranking flow, offline training loop, fallback behavior, and a measurable experimentation plan.",
  },
  {
    id: "feature-store", title: "Design a feature store", description: "Serve consistent ML features for both training jobs and online predictions.",
    track: "machine-learning", access: "paid", category: "ML platforms", difficulty: "Advanced", minutes: 60, icon: "features", color: "blue",
    considerations: ["Point-in-time correctness", "Offline/online parity", "Backfills"],
  },
  {
    id: "training-platform", title: "Design a distributed model training platform", description: "Schedule reproducible training jobs across shared compute and data.",
    track: "machine-learning", access: "paid", category: "Training systems", difficulty: "Advanced", minutes: 60, icon: "training", color: "teal",
    considerations: ["Resource scheduling", "Checkpointing", "Experiment lineage"],
  },
  {
    id: "model-serving", title: "Design a low-latency ML model serving platform", description: "Deploy models safely and handle variable inference traffic.",
    track: "machine-learning", access: "paid", category: "Inference", difficulty: "Advanced", minutes: 60, icon: "serve", color: "orange",
    considerations: ["Batching", "Autoscaling", "Canary rollout"],
  },
  {
    id: "rag-search", title: "Design a retrieval-augmented generation system", description: "Answer questions from a changing document collection with traceable sources.",
    track: "machine-learning", access: "paid", category: "Generative AI", difficulty: "Advanced", minutes: 60, icon: "search", color: "rose",
    considerations: ["Chunking and embedding", "Hybrid retrieval", "Grounding and access control"],
  },
  {
    id: "online-fraud-model", title: "Design real-time fraud scoring", description: "Score transactions in milliseconds and route uncertain cases for review.",
    track: "machine-learning", access: "paid", category: "Fraud & risk", difficulty: "Advanced", minutes: 60, icon: "fraud", color: "green",
    considerations: ["Feature freshness", "Fallback policy", "Human review loop"],
  },
  {
    id: "model-monitoring", title: "Design an ML model monitoring system", description: "Notice when a production model becomes slow, biased, or less useful.",
    track: "machine-learning", access: "paid", category: "Model quality", difficulty: "Intermediate", minutes: 40, icon: "monitor", color: "blue",
    considerations: ["Delayed ground truth", "Drift metrics", "Privacy-preserving telemetry"],
  },

  {
    id: "service-platform", title: "Design an internal developer platform", description: "Help product teams ship services without rebuilding infrastructure each time.",
    track: "platform-infrastructure", access: "free", category: "Developer experience", difficulty: "Advanced", minutes: 60, icon: "platform", color: "violet", popular: true,
    requirements: ["Teams can create services from supported templates.", "Standard deployment, observability, and ownership conventions are built in.", "Teams retain safe control over service-specific settings."],
    considerations: ["Golden paths", "Self-service APIs", "Escape hatches"],
    expectedOutcome: "A platform control plane, service catalog, template lifecycle, and clear boundaries between platform and product teams.",
  },
  {
    id: "multi-region", title: "Design a multi-region failover strategy", description: "Keep a customer-facing service available through a regional outage.",
    track: "platform-infrastructure", access: "paid", category: "Resilience", difficulty: "Advanced", minutes: 60, icon: "regions", color: "blue",
    considerations: ["RTO and RPO", "Replication lag", "Failover testing"],
  },
  {
    id: "service-discovery", title: "Design service discovery for a growing fleet", description: "Let services find healthy endpoints as instances scale and move.",
    track: "platform-infrastructure", access: "paid", category: "Networking", difficulty: "Intermediate", minutes: 40, icon: "discovery", color: "teal",
    considerations: ["Health checks", "Caching and TTL", "Control-plane availability"],
  },
  {
    id: "secrets-platform", title: "Design a secrets management platform", description: "Distribute and rotate credentials safely across services and environments.",
    track: "platform-infrastructure", access: "paid", category: "Security", difficulty: "Advanced", minutes: 60, icon: "security", color: "rose",
    considerations: ["Identity-based access", "Rotation workflow", "Audit and revocation"],
  },
  {
    id: "deployment-platform", title: "Design a safe deployment platform", description: "Roll out changes across hundreds of services with fast, safe rollback.",
    track: "platform-infrastructure", access: "paid", category: "Release engineering", difficulty: "Intermediate", minutes: 45, icon: "deploy", color: "orange",
    considerations: ["Canary analysis", "Artifact provenance", "Rollback safety"],
  },
  {
    id: "metrics-platform", title: "Design a metrics and observability platform", description: "Collect useful signals from services without making telemetry unbounded.",
    track: "platform-infrastructure", access: "paid", category: "Observability", difficulty: "Advanced", minutes: 60, icon: "monitor", color: "green",
    considerations: ["Cardinality control", "Retention tiers", "Alert routing"],
  },
  {
    id: "config-control-plane", title: "Design a configuration control plane", description: "Deliver safe, auditable configuration changes to a large service fleet.",
    track: "platform-infrastructure", access: "paid", category: "Control planes", difficulty: "Advanced", minutes: 60, icon: "config", color: "teal",
    considerations: ["Push vs pull", "Validation and rollout", "Last-known-good state"],
  },
  {
    id: "key-value-store", title: "Design a distributed key-value store", description: "Store and serve keys across many nodes with tunable consistency.",
    track: "distributed-systems", access: "free", category: "Replication", difficulty: "Advanced", minutes: 60, icon: "kv", color: "rose",
    requirements: ["Clients can get, put, and delete values by key.", "The store survives the loss of individual nodes without losing acknowledged writes.", "Capacity grows by adding nodes without a full reshuffle."],
    considerations: ["Consistent hashing", "Quorum reads and writes", "Conflict resolution"],
    expectedOutcome: "A partitioning and replication scheme, read/write quorum choice, failure detection and repair, and the consistency guarantees clients get.",
  },
  {
    id: "unique-id-generator", title: "Design a unique ID generator", description: "Issue unique, roughly sortable IDs at high rate across data centers.",
    track: "distributed-systems", access: "paid", category: "Coordination", difficulty: "Beginner", minutes: 30, icon: "id", color: "violet",
    considerations: ["Snowflake-style layout", "Clock skew", "Worker ID assignment"],
  },
  {
    id: "distributed-message-queue", title: "Design a distributed message queue", description: "Build a durable, partitioned log that producers and consumers can rely on.",
    track: "distributed-systems", access: "paid", category: "Messaging", difficulty: "Advanced", minutes: 60, icon: "queue", color: "blue",
    considerations: ["Partitions and ordering", "Replication and ISR", "Consumer offsets"],
  },
  {
    id: "distributed-lock-service", title: "Design a distributed lock service", description: "Let services coordinate exclusive access without deadlocks or split brain.",
    track: "distributed-systems", access: "paid", category: "Coordination", difficulty: "Advanced", minutes: 60, icon: "lock", color: "orange",
    considerations: ["Leases and fencing tokens", "Consensus backing store", "Client failure detection"],
  },
  {
    id: "leader-election", title: "Design leader election for a service cluster", description: "Keep exactly one active coordinator while nodes come and go.",
    track: "distributed-systems", access: "paid", category: "Consensus", difficulty: "Advanced", minutes: 60, icon: "crown", color: "teal",
    considerations: ["Raft-style terms", "Heartbeats and timeouts", "Split-brain prevention"],
  },
  {
    id: "geo-replicated-database", title: "Design a geo-replicated database", description: "Serve reads and writes from several regions with clear consistency trade-offs.",
    track: "distributed-systems", access: "paid", category: "Replication", difficulty: "Advanced", minutes: 60, icon: "regions", color: "green",
    considerations: ["Single vs multi-leader", "Conflict resolution", "Cross-region latency"],
  },
  {
    id: "offline-first-sync", title: "Design offline-first mobile sync", description: "Let a notes app work offline and merge cleanly when it reconnects.",
    track: "frontend-mobile", access: "free", category: "Sync", difficulty: "Intermediate", minutes: 45, icon: "sync", color: "green",
    requirements: ["Users can create and edit notes with no connection.", "Changes sync across devices once online.", "Concurrent edits on two devices are resolved predictably."],
    considerations: ["Local database", "Change log and cursors", "Conflict resolution"],
    expectedOutcome: "A client storage model, sync protocol with change cursors, conflict strategy, and server-side APIs to support it.",
  },
  {
    id: "image-feed-client", title: "Design an image-heavy feed client", description: "Keep an infinite photo feed smooth on slow networks and older phones.",
    track: "frontend-mobile", access: "paid", category: "Performance", difficulty: "Intermediate", minutes: 40, icon: "image", color: "rose",
    considerations: ["List virtualization", "Image CDN and sizes", "Caching and prefetch"],
  },
  {
    id: "mobile-release-flags", title: "Design mobile release and feature flags", description: "Ship app changes safely when users update on their own schedule.",
    track: "frontend-mobile", access: "paid", category: "Release engineering", difficulty: "Beginner", minutes: 35, icon: "flag", color: "orange",
    considerations: ["Remote config", "Staged rollout", "API versioning"],
  },
  {
    id: "collaborative-whiteboard", title: "Design a collaborative whiteboard client", description: "Let many people draw on one canvas in real time without conflicts.",
    track: "frontend-mobile", access: "paid", category: "Real-time", difficulty: "Advanced", minutes: 60, icon: "editor", color: "violet",
    considerations: ["CRDTs vs OT", "Rendering pipeline", "Presence and reconnection"],
  },
  {
    id: "micro-frontend-platform", title: "Design a micro-frontend platform", description: "Let many teams ship parts of one web app independently.",
    track: "frontend-mobile", access: "paid", category: "Architecture", difficulty: "Advanced", minutes: 60, icon: "platform", color: "blue",
    considerations: ["Composition strategy", "Shared dependencies", "Isolation and fallbacks"],
  },
];

// Concepts a learner should be comfortable with before attempting each round.
const prerequisites = {
  "url-shortener": ["HTTP redirects (301 vs 302)", "Hashing and base62 encoding", "Key-value stores", "Read-through caching"],
  "notification-service": ["Message queues and workers", "Retries with backoff", "Idempotency keys", "Push, email, and SMS providers"],
  "task-scheduler": ["Delayed and cron scheduling", "Leases and heartbeats", "At-least-once delivery", "Retries and dead-letter queues"],
  "scd2-warehouse": ["Dimensional modeling (facts and dimensions)", "Slowly changing dimensions", "Business vs surrogate keys", "Idempotent batch loads"],
  "recommendation-engine": ["Candidate generation vs ranking", "Collaborative filtering", "Embeddings basics", "A/B testing"],
  "service-platform": ["CI/CD pipelines", "Containers and Kubernetes", "Service templates", "Self-service vs guardrails"],
  "key-value-store": ["Consistent hashing", "Replication and quorums", "CAP and consistency models", "Gossip and failure detection"],
  "offline-first-sync": ["Local databases on mobile", "Change logs and sync cursors", "Conflict resolution", "Reconnect and retry handling"],
  "comment-system": ["Message queues as buffers", "Cache-aside reads", "Eventual consistency", "Cursor pagination"],
  "ecommerce-warehouse": ["Facts, dimensions and grain", "OLTP vs OLAP", "Star schema", "Idempotent batch loads"],
  "cdc-pipeline": ["Database write-ahead logs and binlogs", "Kafka topics and partitions", "Upserts with MERGE", "Schema evolution"],
};
for (const prompt of prompts) prompt.prerequisites = prerequisites[prompt.id] ?? [];

export const categories = [
  { id: "all", label: "All practice areas" },
  ...tracks.map(({ id, shortLabel }) => ({ id, label: shortLabel })),
];

export const topics = [...new Set(prompts.map((prompt) => prompt.category))].sort();

export function findPrompt(id) {
  return prompts.find((prompt) => prompt.id === id) ?? null;
}

export function getPrompt(id) {
  return findPrompt(id) ?? prompts[0];
}

export function getTrack(id) {
  return tracks.find((track) => track.id === id) ?? tracks[0];
}
