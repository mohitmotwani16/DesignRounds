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
  }
};
