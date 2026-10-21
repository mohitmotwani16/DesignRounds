// Detailed briefs of Plus rounds: requirements, prerequisites and expected outcome.
//
// Server-only. The public catalog (src/data/prompts.js) carries just the teaser for
// Plus rounds (title, description, level, time, concepts); these details reach a
// browser only through the API, after the server has checked the plan
// (server/modules/rounds.js). scripts/check-build.mjs fails the build if any of this
// text appears in the frontend bundle.

export const plusBriefs = {
  "rate-limiter": {
    "requirements": [
      "Requests are limited by user or API key.",
      "Different customers may have different quotas.",
      "The limiter adds predictable, low latency."
    ],
    "prerequisites": [
      "Token bucket and sliding window",
      "Atomic counters (e.g. Redis INCR)",
      "API keys and quotas",
      "Fail-open vs fail-closed"
    ],
    "expectedOutcome": "A chosen limiting algorithm, key and counter model, distributed consistency trade-offs, and overload behavior."
  },
  "video-streaming": {
    "requirements": [
      "Creators can upload video content.",
      "Viewers can stream across a range of network speeds.",
      "Popular content is served close to viewers."
    ],
    "prerequisites": [
      "CDNs and edge caching",
      "Video transcoding",
      "HLS/DASH and adaptive bitrate",
      "Object storage"
    ],
    "expectedOutcome": "An ingest-to-playback path covering transcoding, manifests, object storage, CDN delivery, and cost drivers."
  },
  "ride-hailing": {
    "requirements": [
      "Riders request trips and receive a nearby driver match.",
      "Drivers can update their location while available.",
      "Both parties can follow trip status changes."
    ],
    "prerequisites": [
      "Geospatial indexing (geohash, quadtree)",
      "Real-time location updates",
      "State machines",
      "Regional sharding"
    ],
    "expectedOutcome": "A location update and matching design, trip state model, and approach to regional traffic spikes."
  },
  "web-crawler": {
    "requirements": [
      "The system discovers links and schedules pages for fetching.",
      "A host is not overwhelmed by concurrent requests.",
      "Duplicate or changed pages are handled efficiently."
    ],
    "prerequisites": [
      "BFS over a URL frontier",
      "robots.txt and politeness",
      "URL and content deduplication",
      "Distributed work queues"
    ],
    "expectedOutcome": "A crawl frontier and worker design, per-host scheduling, URL/content deduplication, and a strategy for retries and freshness."
  },
  "collaborative-editor": {
    "requirements": [
      "Several collaborators can edit a document concurrently.",
      "Edits eventually converge and survive reconnects.",
      "Users can view permissions and recover earlier versions."
    ],
    "prerequisites": [
      "Operational transforms or CRDTs",
      "WebSockets",
      "Versioning and snapshots",
      "Access control basics"
    ],
    "expectedOutcome": "A real-time operation flow, a justified conflict-resolution strategy, durable revision history, and authorization boundaries."
  },
  "payment-platform": {
    "requirements": [
      "Merchants can initiate and query payment attempts.",
      "Retries and timeouts do not create duplicate charges.",
      "Payment state can be reconciled with external processors."
    ],
    "prerequisites": [
      "Idempotency keys",
      "State machines",
      "Double-entry ledgers",
      "Reconciliation with external processors"
    ],
    "expectedOutcome": "A payment state machine, idempotent API and ledger boundaries, processor integration flow, and reconciliation strategy."
  },
  "api-gateway": {
    "requirements": [
      "Requests are authenticated and routed to the correct service.",
      "Tenants can have isolated policies and traffic limits.",
      "Configuration changes can roll out without interrupting healthy traffic."
    ],
    "prerequisites": [
      "Reverse proxies and routing",
      "Authentication (API keys, JWT)",
      "Rate limiting",
      "Control plane vs data plane"
    ],
    "expectedOutcome": "A gateway request path and configuration control plane, tenant isolation model, and approach to overload, rollout, and failure."
  },
  "data-alerting": {
    "requirements": [
      "Teams can define freshness, volume, and metric-based conditions.",
      "Alerts identify an owner and relevant supporting evidence.",
      "Repeated failures do not create a noisy notification storm."
    ],
    "prerequisites": [
      "Data freshness and volume checks",
      "Anomaly detection basics",
      "Alert routing and deduplication",
      "Ownership and on-call"
    ],
    "expectedOutcome": "A rule-evaluation and notification flow with ownership, deduplication, escalation, and actionable alert payloads."
  },
  "fraud-data-platform": {
    "requirements": [
      "Payment events are enriched with recent and historical customer signals.",
      "Risk decisions arrive within a strict checkout latency budget.",
      "Investigators can trace which data and rules influenced a decision."
    ],
    "prerequisites": [
      "Streaming enrichment",
      "Online vs offline features",
      "Low-latency key-value lookups",
      "Audit trails"
    ],
    "expectedOutcome": "A streaming enrichment and feature-serving design that balances latency, consistency, explainability, and auditability."
  },
  "data-quality": {
    "requirements": [
      "Teams can declare expectations for datasets and pipeline runs.",
      "The system detects freshness, volume, schema, and value anomalies.",
      "Owners can trace an incident to affected downstream data products."
    ],
    "prerequisites": [
      "Data contracts",
      "Data tests and expectations",
      "Lineage graphs",
      "Incident triage"
    ],
    "expectedOutcome": "A dataset contract and test lifecycle, metadata/lineage model, incident workflow, and a practical signal-to-noise strategy."
  },
  "rag-search": {
    "requirements": [
      "Documents are ingested, chunked, and updated over time.",
      "Answers retrieve relevant evidence and cite source documents.",
      "Access permissions apply to both retrieval and generated answers."
    ],
    "prerequisites": [
      "Embeddings and vector search",
      "Document chunking",
      "Prompting LLMs",
      "Permission-aware retrieval"
    ],
    "expectedOutcome": "A document ingestion and indexing pipeline, permission-aware retrieval flow, and quality/grounding evaluation loop."
  },
  "online-fraud-model": {
    "requirements": [
      "A transaction receives a risk decision before authorization times out.",
      "Fresh account and device signals inform the prediction.",
      "The business can tune thresholds and review outcomes."
    ],
    "prerequisites": [
      "Real-time feature lookups",
      "Latency budgets",
      "Decision thresholds",
      "Fallback behavior"
    ],
    "expectedOutcome": "A synchronous scoring path, online feature lookup, model fallback and threshold policy, and feedback capture loop."
  },
  "model-monitoring": {
    "requirements": [
      "The system collects prediction and eventual outcome signals.",
      "Teams can detect drift and service regressions.",
      "Alerts link a change to the affected model version and cohort."
    ],
    "prerequisites": [
      "Data and concept drift",
      "Delayed ground-truth labels",
      "Model versioning",
      "Alerting basics"
    ],
    "expectedOutcome": "A monitoring data model, delayed-label evaluation strategy, model/version segmentation, and operator response path."
  },
  "deployment-platform": {
    "requirements": [
      "Teams can deploy an immutable release to selected environments.",
      "Progressive rollout can pause or roll back on unhealthy signals.",
      "Deployment history and ownership are easy to inspect."
    ],
    "prerequisites": [
      "Immutable artifacts",
      "Canary and blue-green deploys",
      "Health signals and SLOs",
      "Rollback strategies"
    ],
    "expectedOutcome": "A release control plane, artifact and environment model, rollout state machine, and health-gated rollback strategy."
  },
  "metrics-platform": {
    "requirements": [
      "Teams can query service health across environments.",
      "High-cardinality and bursty telemetry remain manageable.",
      "Alerts stay connected to service ownership and runbooks."
    ],
    "prerequisites": [
      "Time-series data",
      "Cardinality and labels",
      "Retention and downsampling",
      "Alerting rules"
    ],
    "expectedOutcome": "A telemetry ingestion and storage design, query/retention model, cardinality safeguards, and alert-to-owner workflow."
  },
  "config-control-plane": {
    "requirements": [
      "Operators can publish versioned configuration to selected services.",
      "Invalid or risky changes can be validated and rolled back.",
      "Services continue with a safe configuration during control-plane outages."
    ],
    "prerequisites": [
      "Configuration versioning",
      "Push vs pull propagation",
      "Schema validation",
      "Staged rollouts"
    ],
    "expectedOutcome": "A configuration version and propagation model, validation and staged rollout flow, and resilient client behavior."
  },
  "distributed-lock-service": {
    "requirements": [
      "Clients acquire and release named locks with a timeout.",
      "A crashed holder cannot keep a lock forever.",
      "Two clients never believe they hold the same lock at once."
    ],
    "prerequisites": [
      "Leases and TTLs",
      "Fencing tokens",
      "Consensus basics (Raft/Paxos)",
      "Process pauses and clock issues"
    ],
    "expectedOutcome": "A lease-based lock protocol with fencing tokens, the consensus layer behind it, and behavior under partitions and pauses."
  },
  "leader-election": {
    "requirements": [
      "The cluster elects a single leader that followers can discover.",
      "A new leader is chosen promptly when the current one fails.",
      "A deposed leader cannot keep acting on stale authority."
    ],
    "prerequisites": [
      "Raft terms and voting",
      "Heartbeats and timeouts",
      "Split-brain",
      "Quorum math"
    ],
    "expectedOutcome": "An election protocol, term/epoch handling, failure detection timings, and how stale leaders are fenced off."
  },
  "geo-replicated-database": {
    "requirements": [
      "Users in each region get low-latency reads.",
      "Writes from any region become visible elsewhere within a stated bound.",
      "A full region outage does not lose committed data."
    ],
    "prerequisites": [
      "Single- vs multi-leader replication",
      "Conflict resolution (LWW, CRDTs)",
      "Consistency models",
      "Cross-region latency"
    ],
    "expectedOutcome": "A replication topology, write path and conflict policy, consistency guarantees per operation, and regional failover."
  },
  "collaborative-whiteboard": {
    "requirements": [
      "Participants see each other's strokes and cursors in near real time.",
      "The board converges to the same state for everyone.",
      "Large boards render without freezing the browser."
    ],
    "prerequisites": [
      "CRDTs or operational transforms",
      "WebSockets and presence",
      "Canvas rendering performance",
      "Reconnection handling"
    ],
    "expectedOutcome": "A shared-state model, transport and reconnection plan, rendering approach for large boards, and persistence."
  },
  "micro-frontend-platform": {
    "requirements": [
      "Teams deploy their sections without coordinating releases.",
      "Shared navigation, auth, and design system stay consistent.",
      "A broken section does not take down the whole app."
    ],
    "prerequisites": [
      "Module federation / composition",
      "Shared dependencies and versioning",
      "Independent deployments",
      "Error boundaries and isolation"
    ],
    "expectedOutcome": "A composition model, deployment and versioning flow, shared-dependency strategy, and failure isolation."
  },
  "chat-system": {
    "requirements": [
      "Users can exchange messages in one-to-one conversations.",
      "Messages should appear in near real time.",
      "Users can see whether messages were sent and delivered."
    ],
    "prerequisites": [
      "WebSockets and long-lived connections",
      "Message queues",
      "Ordering and idempotency",
      "Online presence basics"
    ],
    "expectedOutcome": "A message-ingestion and delivery flow, connection strategy, durable message store, and clear delivery guarantees."
  },
  "news-feed": {
    "requirements": [
      "Users can publish posts and follow other users.",
      "A personalized feed displays posts from followed accounts.",
      "The feed remains responsive when a post goes viral."
    ],
    "prerequisites": [
      "Fan-out on write vs read",
      "Caching hot data",
      "Social graph modeling",
      "Pagination with cursors"
    ],
    "expectedOutcome": "A feed-generation approach with a justified fan-out strategy, ranking boundary, and plan for hot accounts."
  },
  "file-storage": {
    "requirements": [
      "Users can upload, download, and organize files.",
      "A file is accessible across a user's devices.",
      "Interrupted large uploads can recover safely."
    ],
    "prerequisites": [
      "Object storage (blobs)",
      "Chunking and checksums",
      "Metadata databases",
      "Conflict resolution"
    ],
    "expectedOutcome": "A metadata/blob-storage design, resumable upload flow, synchronization behavior, and access-control boundaries."
  },
  "ticket-booking": {
    "requirements": [
      "Customers can find events and select available seats.",
      "A seat cannot be sold to multiple customers.",
      "Temporary reservations expire when checkout is abandoned."
    ],
    "prerequisites": [
      "Transactions and isolation levels",
      "Optimistic vs pessimistic locking",
      "Reservation TTLs",
      "Queueing under traffic spikes"
    ],
    "expectedOutcome": "An event discovery and seat inventory model, a reservation/checkout state machine, and a plan for contention and traffic surges."
  },
  "autocomplete": {
    "requirements": [
      "Suggestions appear with low latency as a query is typed.",
      "Popular and recent searches can influence ranking.",
      "The index can incorporate new trends without full service downtime."
    ],
    "prerequisites": [
      "Tries and prefix search",
      "Top-k ranking",
      "Caching at the edge",
      "Batch index rebuilding"
    ],
    "expectedOutcome": "A query-serving path and update pipeline, an index/ranking approach, and trade-offs for freshness, latency, and privacy."
  },
  "paste-service": {
    "requirements": [
      "A user can create a snippet and share a stable link.",
      "Snippets can expire or be restricted to authorized viewers.",
      "Read traffic can be served efficiently as usage grows."
    ],
    "prerequisites": [
      "Unique ID generation",
      "Object vs database storage",
      "TTL-based expiry",
      "Basic abuse prevention"
    ],
    "expectedOutcome": "A create/read API, content-storage model, expiry mechanism, and controls for caching, access, and misuse."
  },
  "distributed-cache": {
    "requirements": [
      "Clients can read, write, and expire cached keys.",
      "The service scales out while keeping request latency predictable.",
      "Node loss does not make the entire cache unavailable."
    ],
    "prerequisites": [
      "Consistent hashing",
      "Eviction policies (LRU, LFU)",
      "Replication basics",
      "Cache invalidation strategies"
    ],
    "expectedOutcome": "A key-partitioning and replication strategy, eviction/invalidation semantics, and a plan for hot partitions and node failures."
  },
  "realtime-analytics": {
    "requirements": [
      "Producers emit events continuously from multiple regions.",
      "Dashboards show fresh aggregates with a defined latency target.",
      "Replays and duplicate events do not inflate results."
    ],
    "prerequisites": [
      "Stream processing basics",
      "Event time vs processing time",
      "Windowed aggregation",
      "Columnar / OLAP stores"
    ],
    "expectedOutcome": "An event ingestion and stream-processing design, window semantics, serving store, and recovery/replay strategy."
  },
  "etl-framework": {
    "requirements": [
      "Teams can define pipelines with shared conventions and reusable connectors.",
      "Runs support retries, backfills, and dependency management.",
      "Operators can inspect ownership, lineage, and run health."
    ],
    "prerequisites": [
      "DAG orchestration (e.g. Airflow)",
      "Incremental loads and backfills",
      "Idempotent tasks",
      "Data lineage"
    ],
    "expectedOutcome": "A separation of control and execution planes, a task/DAG contract, retry and backfill semantics, and a plugin boundary."
  },
  "clickstream": {
    "requirements": [
      "Web and mobile SDKs can buffer and deliver events.",
      "The platform handles bursts and temporarily offline clients.",
      "Consumers can evolve event schemas without breaking old producers."
    ],
    "prerequisites": [
      "Event schemas and evolution",
      "Client-side batching",
      "Message logs (e.g. Kafka)",
      "PII handling"
    ],
    "expectedOutcome": "A client-to-lake ingestion path, schema registry or contract strategy, delivery guarantees, and privacy controls."
  },
  "feature-store": {
    "requirements": [
      "Teams can define and reuse versioned features.",
      "Training data can be reconstructed as of an event time.",
      "Online inference reads fresh features within a latency budget."
    ],
    "prerequisites": [
      "Online vs offline storage",
      "Point-in-time correct joins",
      "Batch and streaming materialization",
      "Training/serving skew"
    ],
    "expectedOutcome": "An offline/online store boundary, feature materialization flow, point-in-time join semantics, and freshness monitoring."
  },
  "training-platform": {
    "requirements": [
      "Researchers can submit versioned training runs.",
      "Jobs request suitable accelerators and recover from failure.",
      "Artifacts and metrics are traceable to code and data versions."
    ],
    "prerequisites": [
      "GPU scheduling basics",
      "Data vs model parallelism",
      "Checkpointing",
      "Experiment tracking"
    ],
    "expectedOutcome": "A job control plane, resource allocation strategy, durable checkpoint/artifact flow, and reproducibility model."
  },
  "model-serving": {
    "requirements": [
      "Teams can publish and roll back versioned models.",
      "Inference meets latency and availability targets under bursty load.",
      "The system captures useful quality and performance signals."
    ],
    "prerequisites": [
      "Model versioning",
      "Request batching",
      "Autoscaling",
      "Canary releases"
    ],
    "expectedOutcome": "A model registry-to-serving path, rollout strategy, resource isolation, and inference observability."
  },
  "multi-region": {
    "requirements": [
      "A regional failure is detected and traffic is redirected.",
      "Recovery objectives for data loss and recovery time are explicit.",
      "Failback does not cause split-brain or replay errors."
    ],
    "prerequisites": [
      "RTO and RPO",
      "Synchronous vs asynchronous replication",
      "DNS and global load balancing",
      "Failover testing"
    ],
    "expectedOutcome": "A failure model, replication and routing approach, recovery/failback procedure, and operational test plan."
  },
  "service-discovery": {
    "requirements": [
      "Services can register and discover endpoints.",
      "Unhealthy instances stop receiving new traffic.",
      "Discovery remains useful during partial control-plane failure."
    ],
    "prerequisites": [
      "Service registries",
      "Health checks",
      "Client-side vs server-side load balancing",
      "TTLs and caching"
    ],
    "expectedOutcome": "A registration and lookup protocol, health lifecycle, caching strategy, and behavior during control-plane outages."
  },
  "secrets-platform": {
    "requirements": [
      "Services receive only the credentials they are authorized to use.",
      "Secret values can rotate without avoidable outages.",
      "Access and changes leave an auditable trail."
    ],
    "prerequisites": [
      "Workload identity",
      "Encryption and KMS",
      "Secret rotation",
      "Audit logging"
    ],
    "expectedOutcome": "A secret lifecycle and access-control model, delivery mechanism, rotation/revocation flow, and audit boundary."
  },
  "unique-id-generator": {
    "requirements": [
      "Every generated ID is unique across all generators.",
      "IDs are roughly ordered by creation time.",
      "Generation keeps working if a coordination service is briefly unavailable."
    ],
    "prerequisites": [
      "Bit layouts (Snowflake IDs)",
      "Clock skew",
      "Worker ID assignment",
      "UUID trade-offs"
    ],
    "expectedOutcome": "An ID layout with justified bit allocation, worker identity assignment, clock-skew handling, and throughput limits."
  },
  "distributed-message-queue": {
    "requirements": [
      "Producers append messages to named topics.",
      "Consumer groups read independently and can resume after failure.",
      "Acknowledged messages are not lost when a broker fails."
    ],
    "prerequisites": [
      "Append-only logs",
      "Partitions and ordering",
      "Leader/follower replication",
      "Consumer offsets"
    ],
    "expectedOutcome": "A topic/partition model, replication and leader-election approach, offset management, retention, and delivery semantics."
  },
  "image-feed-client": {
    "requirements": [
      "The feed scrolls smoothly with thousands of items.",
      "Images load quickly at an appropriate resolution for the device.",
      "The app stays usable on flaky connections."
    ],
    "prerequisites": [
      "List virtualization",
      "Responsive images and CDNs",
      "Client-side caching",
      "Cursor-based pagination"
    ],
    "expectedOutcome": "A client rendering architecture, pagination API, image sizing and caching strategy, and offline/error states."
  },
  "mobile-release-flags": {
    "requirements": [
      "Features can be turned on for a subset of users.",
      "A bad feature can be disabled without a new app release.",
      "Old app versions keep working against newer backends."
    ],
    "prerequisites": [
      "Feature flags and remote config",
      "Staged rollouts",
      "API versioning",
      "App store release cycles"
    ],
    "expectedOutcome": "A flag evaluation and delivery design, rollout and kill-switch flow, and a compatibility strategy for old clients."
  },
  "webhook-service": {
    "requirements": [
      "Partners POST events to one endpoint; about 1 million events a day with 5x peaks.",
      "Every accepted event is processed at least once, even if a component crashes.",
      "Events and processing results are kept 30 days for auditing; processing finishes within 200 ms."
    ],
    "prerequisites": [
      "Message queues and consumer acknowledgements",
      "HMAC request signatures",
      "Idempotency keys",
      "Retries with backoff"
    ],
    "expectedOutcome": "A receive-enqueue-process design that returns 200 only after a durable enqueue, failure handling per component, signature checks, and idempotent, order-independent processing."
  },
  "food-delivery-analytics": {
    "requirements": [
      "Restaurant partners see live metrics (active orders, orders delivered today, earnings so far) within 2 minutes.",
      "Executives and finance get daily business reports; about 5 million orders a day, 500K per hour at the dinner peak.",
      "Order events are kept 2 years for analytics and 90 days for real-time serving."
    ],
    "prerequisites": [
      "Kafka partitioning and consumer groups",
      "Streaming aggregations",
      "Medallion (bronze/silver/gold) layers",
      "Data quality dimensions"
    ],
    "expectedOutcome": "Requirements and volume estimates, one event stream with a streaming path and a batch path, a medallion data model, layered quality checks, and a plan for backfills, idempotency and schema changes."
  },
  "dating-app": {
    "requirements": [
      "Users see a feed of nearby profiles that match their preferences and that they have not swiped before.",
      "Users swipe like or pass; about 50 million daily users each swipe around 100 times a day.",
      "When two users like each other they match exactly once and both are notified."
    ],
    "prerequisites": [
      "Geospatial indexing (geohash or H3 cells)",
      "Sharding by key and access pattern",
      "Bloom filters",
      "Idempotent inserts"
    ],
    "expectedOutcome": "A geo-indexed, precomputed candidate feed, a swipe store sharded for write throughput, race-safe match detection with a deterministic match id, and a cheap seen filter."
  }
};
