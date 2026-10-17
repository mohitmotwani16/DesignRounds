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
    track: "software-engineering", access: "free", category: "Messaging", difficulty: "Intermediate", minutes: 45, icon: "message", color: "blue", popular: true,
    requirements: ["Users can exchange messages in one-to-one conversations.", "Messages should appear in near real time.", "Users can see whether messages were sent and delivered."],
    considerations: ["WebSocket connections", "Message ordering", "Offline delivery"],
    expectedOutcome: "A message-ingestion and delivery flow, connection strategy, durable message store, and clear delivery guarantees.",
  },
  {
    id: "news-feed", title: "Design a news feed", description: "Deliver a relevant, fresh feed as people and publishers post.",
    track: "software-engineering", access: "free", category: "Data systems", difficulty: "Advanced", minutes: 50, icon: "feed", color: "orange", popular: true,
    requirements: ["Users can publish posts and follow other users.", "A personalized feed displays posts from followed accounts.", "The feed remains responsive when a post goes viral."],
    considerations: ["Fan-out strategy", "Feed freshness", "Ranking"],
    expectedOutcome: "A feed-generation approach with a justified fan-out strategy, ranking boundary, and plan for hot accounts.",
  },
  {
    id: "file-storage", title: "Design cloud file storage", description: "Sync large files reliably across devices and collaborators.",
    track: "software-engineering", access: "free", category: "Storage", difficulty: "Advanced", minutes: 50, icon: "storage", color: "green",
    requirements: ["Users can upload, download, and organize files.", "A file is accessible across a user's devices.", "Interrupted large uploads can recover safely."],
    considerations: ["Chunked uploads", "Metadata and blobs", "Sync conflicts"],
    expectedOutcome: "A metadata/blob-storage design, resumable upload flow, synchronization behavior, and access-control boundaries.",
  },
  {
    id: "rate-limiter", title: "Design an API rate limiter", description: "Protect a public API without slowing down well-behaved clients.",
    track: "software-engineering", access: "paid", category: "Reliability", difficulty: "Intermediate", minutes: 40, icon: "shield", color: "teal",
    considerations: ["Token bucket", "Distributed counters", "Fail-open or closed"],
  },
  {
    id: "video-streaming", title: "Design video streaming", description: "Stream adaptive-quality video to a global audience.",
    track: "software-engineering", access: "paid", category: "Media", difficulty: "Advanced", minutes: 55, icon: "video", color: "rose",
    considerations: ["Transcoding", "CDN delivery", "Adaptive bitrate"],
  },
  {
    id: "ride-hailing", title: "Design a ride-hailing service", description: "Match riders with nearby drivers and track trips in real time.",
    track: "software-engineering", access: "paid", category: "Geospatial", difficulty: "Advanced", minutes: 55, icon: "map", color: "green",
    considerations: ["Geospatial indexing", "Matching fairness", "Trip state machine"],
  },
  {
    id: "ticket-booking", title: "Design a high-demand ticketing platform", description: "Sell limited-inventory tickets fairly when a popular event goes on sale.",
    track: "software-engineering", access: "free", category: "Transactions", difficulty: "Advanced", minutes: 50, icon: "booking", color: "orange",
    requirements: ["Customers can find events and select available seats.", "A seat cannot be sold to multiple customers.", "Temporary reservations expire when checkout is abandoned."],
    considerations: ["Inventory consistency", "Reservation expiry", "Sale traffic spikes"],
    expectedOutcome: "An event discovery and seat inventory model, a reservation/checkout state machine, and a plan for contention and traffic surges.",
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
    track: "software-engineering", access: "paid", category: "Search", difficulty: "Advanced", minutes: 50, icon: "crawler", color: "blue",
    considerations: ["Frontier partitioning", "Politeness and robots rules", "Deduplication"],
  },
  {
    id: "autocomplete", title: "Design a search autocomplete service", description: "Suggest useful completions quickly as users type into a search box.",
    track: "software-engineering", access: "free", category: "Search", difficulty: "Intermediate", minutes: 40, icon: "autocomplete", color: "violet",
    requirements: ["Suggestions appear with low latency as a query is typed.", "Popular and recent searches can influence ranking.", "The index can incorporate new trends without full service downtime."],
    considerations: ["Prefix indexing", "Ranking and freshness", "Sharding and caching"],
    expectedOutcome: "A query-serving path and update pipeline, an index/ranking approach, and trade-offs for freshness, latency, and privacy.",
  },
  {
    id: "collaborative-editor", title: "Design a collaborative document editor", description: "Let multiple people edit and comment on the same document in real time.",
    track: "software-engineering", access: "paid", category: "Collaboration", difficulty: "Advanced", minutes: 55, icon: "editor", color: "green",
    considerations: ["Conflict-free editing", "Presence and reconnects", "Version history"],
  },
  {
    id: "paste-service", title: "Design a text snippet sharing service", description: "Create and share short text snippets with optional expiry and access controls.",
    track: "software-engineering", access: "free", category: "Storage", difficulty: "Beginner", minutes: 35, icon: "paste", color: "rose",
    requirements: ["A user can create a snippet and share a stable link.", "Snippets can expire or be restricted to authorized viewers.", "Read traffic can be served efficiently as usage grows."],
    considerations: ["Identifier generation", "Expiry and deletion", "Abuse prevention"],
    expectedOutcome: "A create/read API, content-storage model, expiry mechanism, and controls for caching, access, and misuse.",
  },
  {
    id: "payment-platform", title: "Design a payment processing platform", description: "Accept payment requests reliably without charging a customer twice.",
    track: "software-engineering", access: "paid", category: "Transactions", difficulty: "Advanced", minutes: 55, icon: "payment", color: "teal",
    considerations: ["Idempotency keys", "State transitions", "Reconciliation and audit"],
  },
  {
    id: "task-scheduler", title: "Design a distributed task scheduler", description: "Schedule one-off and recurring jobs across a fleet of workers.",
    track: "software-engineering", access: "free", category: "Distributed systems", difficulty: "Advanced", minutes: 50, icon: "scheduler", color: "orange",
    requirements: ["Clients can submit delayed and recurring tasks.", "Eligible tasks are dispatched to available workers.", "Worker crashes and retries do not silently lose scheduled work."],
    considerations: ["Time partitioning", "Leases and retries", "At-least-once execution"],
    expectedOutcome: "A schedule store and dispatcher design, worker lease/retry semantics, and explicit delivery and idempotency guarantees.",
  },
  {
    id: "distributed-cache", title: "Design a distributed caching service", description: "Serve frequently accessed data quickly across a growing fleet of application nodes.",
    track: "software-engineering", access: "free", category: "Storage", difficulty: "Advanced", minutes: 50, icon: "cache", color: "blue",
    requirements: ["Clients can read, write, and expire cached keys.", "The service scales out while keeping request latency predictable.", "Node loss does not make the entire cache unavailable."],
    considerations: ["Partitioning and replication", "Eviction and expiry", "Hot keys"],
    expectedOutcome: "A key-partitioning and replication strategy, eviction/invalidation semantics, and a plan for hot partitions and node failures.",
  },
  {
    id: "api-gateway", title: "Design a multi-tenant API gateway", description: "Route external API traffic safely to independently operated backend services.",
    track: "software-engineering", access: "paid", category: "Networking", difficulty: "Advanced", minutes: 50, icon: "gateway", color: "violet",
    considerations: ["Control plane vs data plane", "Policy evaluation", "Safe configuration rollout"],
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
    track: "data-engineering", access: "free", category: "Streaming", difficulty: "Advanced", minutes: 50, icon: "analytics", color: "teal", popular: true,
    requirements: ["Producers emit events continuously from multiple regions.", "Dashboards show fresh aggregates with a defined latency target.", "Replays and duplicate events do not inflate results."],
    considerations: ["Event time vs processing time", "Windowing", "Replay and deduplication"],
    expectedOutcome: "An event ingestion and stream-processing design, window semantics, serving store, and recovery/replay strategy.",
  },
  {
    id: "etl-framework", title: "Design a reusable ETL/ELT framework", description: "Give many teams a consistent way to build, run, and operate data pipelines.",
    track: "data-engineering", access: "free", category: "Orchestration", difficulty: "Advanced", minutes: 50, icon: "pipeline", color: "violet", popular: true,
    requirements: ["Teams can define pipelines with shared conventions and reusable connectors.", "Runs support retries, backfills, and dependency management.", "Operators can inspect ownership, lineage, and run health."],
    considerations: ["Declarative task definitions", "Idempotent retries", "Multi-tenant isolation"],
    expectedOutcome: "A separation of control and execution planes, a task/DAG contract, retry and backfill semantics, and a plugin boundary.",
  },
  {
    id: "clickstream", title: "Design clickstream event tracking at scale", description: "Collect trustworthy product events from web and mobile clients.",
    track: "data-engineering", access: "free", category: "Event ingestion", difficulty: "Advanced", minutes: 45, icon: "events", color: "orange", popular: true,
    requirements: ["Web and mobile SDKs can buffer and deliver events.", "The platform handles bursts and temporarily offline clients.", "Consumers can evolve event schemas without breaking old producers."],
    considerations: ["SDK batching", "Schema evolution", "PII minimization"],
    expectedOutcome: "A client-to-lake ingestion path, schema registry or contract strategy, delivery guarantees, and privacy controls.",
  },
  {
    id: "data-alerting", title: "Design a data alerting system", description: "Notify the right owner when pipelines, data freshness, or business metrics go wrong.",
    track: "data-engineering", access: "paid", category: "Observability", difficulty: "Intermediate", minutes: 40, icon: "alert", color: "rose",
    considerations: ["Rule evaluation", "Alert grouping", "Escalation policy"],
  },
  {
    id: "fraud-data-platform", title: "Design a fraud detection data platform", description: "Join streaming payments with historical signals for fast, explainable fraud decisions.",
    track: "data-engineering", access: "paid", category: "Data + ML", difficulty: "Advanced", minutes: 55, icon: "fraud", color: "teal",
    considerations: ["Online/offline feature parity", "Feature freshness", "Decision audit trail"],
  },
  {
    id: "data-quality", title: "Design a data quality & observability framework", description: "Help teams detect, diagnose, and prevent incorrect or stale data.",
    track: "data-engineering", access: "paid", category: "Governance", difficulty: "Intermediate", minutes: 45, icon: "quality", color: "green",
    considerations: ["Contracts and expectations", "Lineage", "Anomaly detection"],
  },

  {
    id: "recommendation-engine", title: "Design a recommendation system", description: "Recommend useful content while balancing relevance, freshness, and exploration.",
    track: "machine-learning", access: "free", category: "Personalization", difficulty: "Advanced", minutes: 50, icon: "model", color: "violet", popular: true,
    requirements: ["Recommendations use user and item signals.", "New users and new items still receive reasonable results.", "The system can measure changes without blocking requests."],
    considerations: ["Candidate generation", "Ranking", "Cold start"],
    expectedOutcome: "An online candidate/ranking flow, offline training loop, fallback behavior, and a measurable experimentation plan.",
  },
  {
    id: "feature-store", title: "Design a feature store", description: "Serve consistent ML features for both training jobs and online predictions.",
    track: "machine-learning", access: "free", category: "ML platforms", difficulty: "Advanced", minutes: 50, icon: "features", color: "blue",
    requirements: ["Teams can define and reuse versioned features.", "Training data can be reconstructed as of an event time.", "Online inference reads fresh features within a latency budget."],
    considerations: ["Point-in-time correctness", "Offline/online parity", "Backfills"],
    expectedOutcome: "An offline/online store boundary, feature materialization flow, point-in-time join semantics, and freshness monitoring.",
  },
  {
    id: "training-platform", title: "Design a distributed model training platform", description: "Schedule reproducible training jobs across shared compute and data.",
    track: "machine-learning", access: "free", category: "Training systems", difficulty: "Advanced", minutes: 55, icon: "training", color: "teal",
    requirements: ["Researchers can submit versioned training runs.", "Jobs request suitable accelerators and recover from failure.", "Artifacts and metrics are traceable to code and data versions."],
    considerations: ["Resource scheduling", "Checkpointing", "Experiment lineage"],
    expectedOutcome: "A job control plane, resource allocation strategy, durable checkpoint/artifact flow, and reproducibility model.",
  },
  {
    id: "model-serving", title: "Design a low-latency ML model serving platform", description: "Deploy models safely and handle variable inference traffic.",
    track: "machine-learning", access: "free", category: "Inference", difficulty: "Advanced", minutes: 45, icon: "serve", color: "orange",
    requirements: ["Teams can publish and roll back versioned models.", "Inference meets latency and availability targets under bursty load.", "The system captures useful quality and performance signals."],
    considerations: ["Batching", "Autoscaling", "Canary rollout"],
    expectedOutcome: "A model registry-to-serving path, rollout strategy, resource isolation, and inference observability.",
  },
  {
    id: "rag-search", title: "Design a retrieval-augmented generation system", description: "Answer questions from a changing document collection with traceable sources.",
    track: "machine-learning", access: "paid", category: "Generative AI", difficulty: "Advanced", minutes: 50, icon: "search", color: "rose",
    considerations: ["Chunking and embedding", "Hybrid retrieval", "Grounding and access control"],
  },
  {
    id: "online-fraud-model", title: "Design real-time fraud scoring", description: "Score transactions in milliseconds and route uncertain cases for review.",
    track: "machine-learning", access: "paid", category: "Fraud & risk", difficulty: "Advanced", minutes: 50, icon: "fraud", color: "green",
    considerations: ["Feature freshness", "Fallback policy", "Human review loop"],
  },
  {
    id: "model-monitoring", title: "Design an ML model monitoring system", description: "Notice when a production model becomes slow, biased, or less useful.",
    track: "machine-learning", access: "paid", category: "Model quality", difficulty: "Intermediate", minutes: 40, icon: "monitor", color: "blue",
    considerations: ["Delayed ground truth", "Drift metrics", "Privacy-preserving telemetry"],
  },

  {
    id: "service-platform", title: "Design an internal developer platform", description: "Help product teams ship services without rebuilding infrastructure each time.",
    track: "platform-infrastructure", access: "free", category: "Developer experience", difficulty: "Advanced", minutes: 50, icon: "platform", color: "violet", popular: true,
    requirements: ["Teams can create services from supported templates.", "Standard deployment, observability, and ownership conventions are built in.", "Teams retain safe control over service-specific settings."],
    considerations: ["Golden paths", "Self-service APIs", "Escape hatches"],
    expectedOutcome: "A platform control plane, service catalog, template lifecycle, and clear boundaries between platform and product teams.",
  },
  {
    id: "multi-region", title: "Design a multi-region failover strategy", description: "Keep a customer-facing service available through a regional outage.",
    track: "platform-infrastructure", access: "free", category: "Resilience", difficulty: "Advanced", minutes: 50, icon: "regions", color: "blue",
    requirements: ["A regional failure is detected and traffic is redirected.", "Recovery objectives for data loss and recovery time are explicit.", "Failback does not cause split-brain or replay errors."],
    considerations: ["RTO and RPO", "Replication lag", "Failover testing"],
    expectedOutcome: "A failure model, replication and routing approach, recovery/failback procedure, and operational test plan.",
  },
  {
    id: "service-discovery", title: "Design service discovery for a growing fleet", description: "Let services find healthy endpoints as instances scale and move.",
    track: "platform-infrastructure", access: "free", category: "Networking", difficulty: "Intermediate", minutes: 40, icon: "discovery", color: "teal",
    requirements: ["Services can register and discover endpoints.", "Unhealthy instances stop receiving new traffic.", "Discovery remains useful during partial control-plane failure."],
    considerations: ["Health checks", "Caching and TTL", "Control-plane availability"],
    expectedOutcome: "A registration and lookup protocol, health lifecycle, caching strategy, and behavior during control-plane outages.",
  },
  {
    id: "secrets-platform", title: "Design a secrets management platform", description: "Distribute and rotate credentials safely across services and environments.",
    track: "platform-infrastructure", access: "free", category: "Security", difficulty: "Advanced", minutes: 45, icon: "security", color: "rose",
    requirements: ["Services receive only the credentials they are authorized to use.", "Secret values can rotate without avoidable outages.", "Access and changes leave an auditable trail."],
    considerations: ["Identity-based access", "Rotation workflow", "Audit and revocation"],
    expectedOutcome: "A secret lifecycle and access-control model, delivery mechanism, rotation/revocation flow, and audit boundary.",
  },
  {
    id: "deployment-platform", title: "Design a safe deployment platform", description: "Roll out changes across hundreds of services with fast, safe rollback.",
    track: "platform-infrastructure", access: "paid", category: "Release engineering", difficulty: "Intermediate", minutes: 45, icon: "deploy", color: "orange",
    considerations: ["Canary analysis", "Artifact provenance", "Rollback safety"],
  },
  {
    id: "metrics-platform", title: "Design a metrics and observability platform", description: "Collect useful signals from services without making telemetry unbounded.",
    track: "platform-infrastructure", access: "paid", category: "Observability", difficulty: "Advanced", minutes: 50, icon: "monitor", color: "green",
    considerations: ["Cardinality control", "Retention tiers", "Alert routing"],
  },
  {
    id: "config-control-plane", title: "Design a configuration control plane", description: "Deliver safe, auditable configuration changes to a large service fleet.",
    track: "platform-infrastructure", access: "paid", category: "Control planes", difficulty: "Advanced", minutes: 45, icon: "config", color: "teal",
    considerations: ["Push vs pull", "Validation and rollout", "Last-known-good state"],
  },
  {
    id: "key-value-store", title: "Design a distributed key-value store", description: "Store and serve keys across many nodes with tunable consistency.",
    track: "distributed-systems", access: "free", category: "Replication", difficulty: "Advanced", minutes: 55, icon: "kv", color: "rose",
    requirements: ["Clients can get, put, and delete values by key.", "The store survives the loss of individual nodes without losing acknowledged writes.", "Capacity grows by adding nodes without a full reshuffle."],
    considerations: ["Consistent hashing", "Quorum reads and writes", "Conflict resolution"],
    expectedOutcome: "A partitioning and replication scheme, read/write quorum choice, failure detection and repair, and the consistency guarantees clients get.",
  },
  {
    id: "unique-id-generator", title: "Design a unique ID generator", description: "Issue unique, roughly sortable IDs at high rate across data centers.",
    track: "distributed-systems", access: "free", category: "Coordination", difficulty: "Beginner", minutes: 30, icon: "id", color: "violet",
    requirements: ["Every generated ID is unique across all generators.", "IDs are roughly ordered by creation time.", "Generation keeps working if a coordination service is briefly unavailable."],
    considerations: ["Snowflake-style layout", "Clock skew", "Worker ID assignment"],
    expectedOutcome: "An ID layout with justified bit allocation, worker identity assignment, clock-skew handling, and throughput limits.",
  },
  {
    id: "distributed-message-queue", title: "Design a distributed message queue", description: "Build a durable, partitioned log that producers and consumers can rely on.",
    track: "distributed-systems", access: "free", category: "Messaging", difficulty: "Advanced", minutes: 55, icon: "queue", color: "blue",
    requirements: ["Producers append messages to named topics.", "Consumer groups read independently and can resume after failure.", "Acknowledged messages are not lost when a broker fails."],
    considerations: ["Partitions and ordering", "Replication and ISR", "Consumer offsets"],
    expectedOutcome: "A topic/partition model, replication and leader-election approach, offset management, retention, and delivery semantics.",
  },
  {
    id: "distributed-lock-service", title: "Design a distributed lock service", description: "Let services coordinate exclusive access without deadlocks or split brain.",
    track: "distributed-systems", access: "paid", category: "Coordination", difficulty: "Advanced", minutes: 45, icon: "lock", color: "orange",
    considerations: ["Leases and fencing tokens", "Consensus backing store", "Client failure detection"],
  },
  {
    id: "leader-election", title: "Design leader election for a service cluster", description: "Keep exactly one active coordinator while nodes come and go.",
    track: "distributed-systems", access: "paid", category: "Consensus", difficulty: "Advanced", minutes: 45, icon: "crown", color: "teal",
    considerations: ["Raft-style terms", "Heartbeats and timeouts", "Split-brain prevention"],
  },
  {
    id: "geo-replicated-database", title: "Design a geo-replicated database", description: "Serve reads and writes from several regions with clear consistency trade-offs.",
    track: "distributed-systems", access: "paid", category: "Replication", difficulty: "Advanced", minutes: 55, icon: "regions", color: "green",
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
    track: "frontend-mobile", access: "free", category: "Performance", difficulty: "Intermediate", minutes: 40, icon: "image", color: "rose",
    requirements: ["The feed scrolls smoothly with thousands of items.", "Images load quickly at an appropriate resolution for the device.", "The app stays usable on flaky connections."],
    considerations: ["List virtualization", "Image CDN and sizes", "Caching and prefetch"],
    expectedOutcome: "A client rendering architecture, pagination API, image sizing and caching strategy, and offline/error states.",
  },
  {
    id: "mobile-release-flags", title: "Design mobile release and feature flags", description: "Ship app changes safely when users update on their own schedule.",
    track: "frontend-mobile", access: "free", category: "Release engineering", difficulty: "Beginner", minutes: 35, icon: "flag", color: "orange",
    requirements: ["Features can be turned on for a subset of users.", "A bad feature can be disabled without a new app release.", "Old app versions keep working against newer backends."],
    considerations: ["Remote config", "Staged rollout", "API versioning"],
    expectedOutcome: "A flag evaluation and delivery design, rollout and kill-switch flow, and a compatibility strategy for old clients.",
  },
  {
    id: "collaborative-whiteboard", title: "Design a collaborative whiteboard client", description: "Let many people draw on one canvas in real time without conflicts.",
    track: "frontend-mobile", access: "paid", category: "Real-time", difficulty: "Advanced", minutes: 50, icon: "editor", color: "violet",
    considerations: ["CRDTs vs OT", "Rendering pipeline", "Presence and reconnection"],
  },
  {
    id: "micro-frontend-platform", title: "Design a micro-frontend platform", description: "Let many teams ship parts of one web app independently.",
    track: "frontend-mobile", access: "paid", category: "Architecture", difficulty: "Advanced", minutes: 45, icon: "platform", color: "blue",
    considerations: ["Composition strategy", "Shared dependencies", "Isolation and fallbacks"],
  },
];

// Concepts a learner should be comfortable with before attempting each round.
const prerequisites = {
  "url-shortener": ["HTTP redirects (301 vs 302)", "Hashing and base62 encoding", "Key-value stores", "Read-through caching"],
  "chat-system": ["WebSockets and long-lived connections", "Message queues", "Ordering and idempotency", "Online presence basics"],
  "news-feed": ["Fan-out on write vs read", "Caching hot data", "Social graph modeling", "Pagination with cursors"],
  "file-storage": ["Object storage (blobs)", "Chunking and checksums", "Metadata databases", "Conflict resolution"],
  "ticket-booking": ["Transactions and isolation levels", "Optimistic vs pessimistic locking", "Reservation TTLs", "Queueing under traffic spikes"],
  "notification-service": ["Message queues and workers", "Retries with backoff", "Idempotency keys", "Push, email, and SMS providers"],
  "autocomplete": ["Tries and prefix search", "Top-k ranking", "Caching at the edge", "Batch index rebuilding"],
  "paste-service": ["Unique ID generation", "Object vs database storage", "TTL-based expiry", "Basic abuse prevention"],
  "task-scheduler": ["Delayed and cron scheduling", "Leases and heartbeats", "At-least-once delivery", "Retries and dead-letter queues"],
  "distributed-cache": ["Consistent hashing", "Eviction policies (LRU, LFU)", "Replication basics", "Cache invalidation strategies"],
  "scd2-warehouse": ["Dimensional modeling (facts and dimensions)", "Slowly changing dimensions", "Business vs surrogate keys", "Idempotent batch loads"],
  "realtime-analytics": ["Stream processing basics", "Event time vs processing time", "Windowed aggregation", "Columnar / OLAP stores"],
  "etl-framework": ["DAG orchestration (e.g. Airflow)", "Incremental loads and backfills", "Idempotent tasks", "Data lineage"],
  "clickstream": ["Event schemas and evolution", "Client-side batching", "Message logs (e.g. Kafka)", "PII handling"],
  "recommendation-engine": ["Candidate generation vs ranking", "Collaborative filtering", "Embeddings basics", "A/B testing"],
  "feature-store": ["Online vs offline storage", "Point-in-time correct joins", "Batch and streaming materialization", "Training/serving skew"],
  "training-platform": ["GPU scheduling basics", "Data vs model parallelism", "Checkpointing", "Experiment tracking"],
  "model-serving": ["Model versioning", "Request batching", "Autoscaling", "Canary releases"],
  "service-platform": ["CI/CD pipelines", "Containers and Kubernetes", "Service templates", "Self-service vs guardrails"],
  "multi-region": ["RTO and RPO", "Synchronous vs asynchronous replication", "DNS and global load balancing", "Failover testing"],
  "service-discovery": ["Service registries", "Health checks", "Client-side vs server-side load balancing", "TTLs and caching"],
  "secrets-platform": ["Workload identity", "Encryption and KMS", "Secret rotation", "Audit logging"],
  "key-value-store": ["Consistent hashing", "Replication and quorums", "CAP and consistency models", "Gossip and failure detection"],
  "unique-id-generator": ["Bit layouts (Snowflake IDs)", "Clock skew", "Worker ID assignment", "UUID trade-offs"],
  "distributed-message-queue": ["Append-only logs", "Partitions and ordering", "Leader/follower replication", "Consumer offsets"],
  "offline-first-sync": ["Local databases on mobile", "Change logs and sync cursors", "Conflict resolution", "Reconnect and retry handling"],
  "image-feed-client": ["List virtualization", "Responsive images and CDNs", "Client-side caching", "Cursor-based pagination"],
  "mobile-release-flags": ["Feature flags and remote config", "Staged rollouts", "API versioning", "App store release cycles"],
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
