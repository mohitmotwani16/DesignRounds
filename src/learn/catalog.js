// The Learn section's table of contents: categories and the metadata of every topic.
// This file ships in the main bundle (sidebar, SEO tags, sitemap); each topic's body
// lives in src/learn/topics/<slug>.js and is loaded only on its own page.
//
// level: Beginner | Intermediate | Advanced. description: the meta description and lede
// (aim for 120-160 characters, naming the concept the way people search for it).
// published: the date a topic first went live, for its structured data.
// A category's `track` links it to an interview discipline (src/data/prompts.js).
// Category ids are stored with community articles, so never rename one.

export const LEARN_PATH = "/learn";
export const LEARN_UPDATED = "2026-10-17";

const NEW = "2026-10-17";

export const CATEGORIES = [
  {
    id: "roadmaps",
    title: "Learning roadmaps",
    blurb: "Step-by-step paths through the handbook for each discipline, from first principles to interview-ready.",
    topics: [
      { slug: "system-design-roadmap", title: "System Design Roadmap 2026: Beginner to Advanced, Step by Step", short: "System design roadmap", level: "Beginner", description: "A step-by-step system design roadmap: fundamentals, building blocks, distributed systems and interview practice, with every topic linked to a free guide.", published: NEW },
      { slug: "backend-system-design-roadmap", title: "Backend (SDE) System Design Roadmap: APIs, Databases and Scale", short: "Backend (SDE) roadmap", level: "Beginner", description: "The system design roadmap for backend and SDE interviews: APIs, databases, caching, queues, low-level design and the classic design questions, in order.", published: NEW },
      { slug: "data-engineering-roadmap", title: "Data Engineering Roadmap: Pipelines, Warehouses and Streaming", short: "Data engineering roadmap", level: "Beginner", description: "A data engineering roadmap for 2026: ETL and ELT, data modeling, warehouses and lakehouses, Spark, Kafka, streaming, orchestration and data quality.", published: NEW },
      { slug: "machine-learning-system-design-roadmap", title: "ML System Design Roadmap: From Data to Production Models", short: "ML system design roadmap", level: "Intermediate", description: "An ML system design roadmap: features, training, serving, ranking and recommendations, evaluation, monitoring, plus RAG, vector search and LLM serving.", published: NEW },
      { slug: "platform-engineering-roadmap", title: "Platform Engineering and SRE Roadmap: Kubernetes to SLOs", short: "Platform and SRE roadmap", level: "Intermediate", description: "A platform engineering and SRE roadmap: containers, Kubernetes, infrastructure as code, CI/CD, observability, SLOs, incident response and resilience.", published: NEW },
      { slug: "distributed-systems-roadmap", title: "Distributed Systems Roadmap: Replication, Consensus, Consistency", short: "Distributed systems roadmap", level: "Advanced", description: "A distributed systems roadmap: failure models, replication and quorums, consistency, clocks, consensus with Raft, CRDTs and geo-replicated databases.", published: NEW },
      { slug: "frontend-system-design-roadmap", title: "Frontend System Design Roadmap: Web and Mobile Interviews", short: "Frontend system design roadmap", level: "Intermediate", description: "A frontend system design roadmap for web and mobile: rendering strategies, state, caching, performance, offline sync, security and release engineering.", published: NEW },
    ],
  },
  {
    id: "foundations",
    title: "Foundations",
    blurb: "The vocabulary every design discussion uses: scale, latency, availability, estimation and consistency.",
    topics: [
      { slug: "scalability", title: "Scalability: Vertical vs Horizontal Scaling", short: "Scalability", level: "Beginner", description: "What scalability means, vertical vs horizontal scaling, stateless services, and how real systems grow from one server to thousands." },
      { slug: "latency-vs-throughput", title: "Latency vs Throughput", short: "Latency vs throughput", level: "Beginner", description: "Latency vs throughput explained: percentiles (p50, p99), tail latency, Little's Law, and how to reason about both in system design." },
      { slug: "availability", title: "Availability, SLAs, SLOs and the Nines", short: "Availability and SLOs", level: "Beginner", description: "Availability explained: the nines, SLA vs SLO vs SLI, error budgets, and how redundancy and failover raise uptime in real systems." },
      { slug: "back-of-the-envelope-estimation", title: "Back-of-the-Envelope Estimation", short: "Capacity estimation", level: "Beginner", description: "How to do back-of-the-envelope estimation for system design: QPS, storage, bandwidth, latency numbers and powers of two, with worked examples." },
      { slug: "cap-theorem", title: "CAP Theorem and PACELC", short: "CAP theorem", level: "Intermediate", description: "The CAP theorem explained correctly: what partitions force you to choose, CP vs AP systems, and PACELC's latency vs consistency trade-off." },
      { slug: "consistency-models", title: "Consistency Models: Strong, Eventual and Causal", short: "Consistency models", level: "Intermediate", description: "Consistency models explained: linearizability, sequential, causal, read-your-writes and eventual consistency, with examples of where each fits." },
      { slug: "acid-vs-base", title: "ACID vs BASE", short: "ACID vs BASE", level: "Beginner", description: "ACID vs BASE explained: atomicity, consistency, isolation, durability, and the basically-available, eventually-consistent alternative." },
    ],
  },
  {
    id: "networking",
    title: "Networking & APIs",
    blurb: "How requests travel: DNS, HTTP, transports, API styles, real-time channels, load balancers and CDNs.",
    topics: [
      { slug: "dns", title: "How DNS Works", short: "DNS", level: "Beginner", description: "How DNS resolution works step by step: resolvers, root and TLD servers, record types, TTLs and caching, and DNS-based load balancing." },
      { slug: "http", title: "HTTP/1.1 vs HTTP/2 vs HTTP/3", short: "HTTP versions", level: "Beginner", description: "HTTP/1.1, HTTP/2 and HTTP/3 compared: connections, multiplexing, head-of-line blocking, QUIC, TLS, and what each means for performance." },
      { slug: "tcp-vs-udp", title: "TCP vs UDP", short: "TCP vs UDP", level: "Beginner", description: "TCP vs UDP explained: the three-way handshake, reliability, ordering and congestion control, and when to choose UDP for real-time traffic." },
      { slug: "api-styles", title: "REST vs gRPC vs GraphQL", short: "REST vs gRPC vs GraphQL", level: "Intermediate", description: "REST vs gRPC vs GraphQL compared: payloads, contracts, performance, streaming and caching, and which API style fits which system." },
      { slug: "api-design", title: "API Design Best Practices: Resources, Versioning and Errors", short: "API design", level: "Beginner", description: "REST API design best practices for system design: resource naming, status codes, versioning, pagination, idempotency, errors and backward compatibility.", published: NEW },
      { slug: "real-time-communication", title: "WebSockets vs Server-Sent Events vs Long Polling", short: "WebSockets, SSE, polling", level: "Intermediate", description: "WebSockets vs SSE vs long polling: how each pushes data to clients, connection costs at scale, and how chat and live feeds use them." },
      { slug: "load-balancing", title: "Load Balancing: L4 vs L7 and Algorithms", short: "Load balancing", level: "Beginner", description: "Load balancing explained: L4 vs L7 load balancers, round robin, least connections, consistent hashing, health checks and sticky sessions." },
      { slug: "api-gateway", title: "Reverse Proxy vs API Gateway", short: "Reverse proxy and API gateway", level: "Beginner", description: "Reverse proxy vs API gateway: TLS termination, routing, authentication, rate limiting and aggregation at the edge of a system." },
      { slug: "cdn", title: "Content Delivery Networks (CDN)", short: "CDN", level: "Beginner", description: "How a CDN works: edge caching, pull vs push, cache keys and TTLs, invalidation, and serving dynamic content and video at global scale." },
    ],
  },
  {
    id: "databases",
    title: "Databases & storage",
    blurb: "Choosing and scaling storage: data models, indexes, replication, sharding, transactions, search and blobs.",
    topics: [
      { slug: "sql-vs-nosql", title: "SQL vs NoSQL: How to Choose a Database", short: "SQL vs NoSQL", level: "Beginner", description: "SQL vs NoSQL explained: data models, schemas, transactions, scaling and query patterns, with a practical way to choose for a design." },
      { slug: "nosql-database-types", title: "NoSQL Database Types: Key-Value, Document, Wide-Column and Graph", short: "NoSQL database types", level: "Intermediate", description: "The four NoSQL families compared: key-value, document, wide-column and graph databases, their data models, strengths and real uses." },
      { slug: "database-indexing", title: "Database Indexing: B-Trees and LSM Trees", short: "Indexing", level: "Intermediate", description: "How database indexes work: B-trees, LSM trees, composite and covering indexes, write amplification, and when an index hurts." },
      { slug: "replication", title: "Database Replication: Leader-Follower, Multi-Leader and Leaderless", short: "Replication", level: "Intermediate", description: "Database replication explained: leader-follower, multi-leader and leaderless replication, sync vs async, replication lag and quorums." },
      { slug: "sharding", title: "Database Sharding and Partitioning", short: "Sharding", level: "Intermediate", description: "Database sharding explained: range, hash and directory partitioning, choosing a shard key, hot spots, resharding and cross-shard queries." },
      { slug: "consistent-hashing", title: "Consistent Hashing", short: "Consistent hashing", level: "Intermediate", description: "Consistent hashing explained with diagrams: the hash ring, virtual nodes, minimal data movement, and its use in caches and databases." },
      { slug: "transactions-isolation-levels", title: "Transactions and Isolation Levels", short: "Isolation levels", level: "Advanced", description: "Transaction isolation levels explained: dirty reads, non-repeatable reads, phantoms, write skew, MVCC, snapshot isolation and serializability." },
      { slug: "optimistic-vs-pessimistic-locking", title: "Optimistic vs Pessimistic Locking", short: "Optimistic vs pessimistic locking", level: "Intermediate", description: "Optimistic vs pessimistic locking explained: version columns, SELECT FOR UPDATE, lost updates, and how ticket booking avoids selling the same seat twice.", published: NEW },
      { slug: "connection-pooling", title: "Database Connection Pooling", short: "Connection pooling", level: "Intermediate", description: "Database connection pooling explained: why connections are expensive, pool sizing, PgBouncer-style poolers, serverless pitfalls and pool exhaustion.", published: NEW },
      { slug: "normalization-denormalization", title: "Normalization vs Denormalization", short: "Normalization", level: "Beginner", description: "Normalization vs denormalization: normal forms, joins vs duplication, read vs write trade-offs, and how to model data for access patterns." },
      { slug: "time-series-databases", title: "Time-Series Databases", short: "Time-series databases", level: "Intermediate", description: "Time-series databases explained: append-heavy writes, compression, downsampling, retention and how metrics and IoT systems store data." },
      { slug: "search-and-inverted-index", title: "Full-Text Search and the Inverted Index", short: "Search and inverted index", level: "Intermediate", description: "How full-text search works: inverted indexes, tokenization, relevance ranking with BM25, and keeping a search index in sync with a database." },
      { slug: "object-storage", title: "Object Storage and Blob Stores", short: "Object storage", level: "Beginner", description: "Object storage explained: buckets, keys and metadata, durability, presigned URLs, multipart uploads, and storing media in system design." },
      { slug: "geospatial-indexing", title: "Geospatial Indexing: Geohash, Quadtrees and S2", short: "Geospatial indexing", level: "Advanced", description: "Geospatial indexing explained: geohash, quadtrees and S2 cells, nearby search, and how ride-hailing and maps find what is close." },
    ],
  },
  {
    id: "caching",
    title: "Caching",
    blurb: "Making reads fast without serving wrong data: placement, strategies, eviction and invalidation.",
    topics: [
      { slug: "caching", title: "Caching: Where and What to Cache", short: "Caching basics", level: "Beginner", description: "Caching in system design: client, CDN, application and database caches, hit ratio, what to cache, and the costs of stale data." },
      { slug: "cache-strategies", title: "Cache-Aside vs Read-Through vs Write-Through vs Write-Back", short: "Cache strategies", level: "Intermediate", description: "Caching strategies compared: cache-aside, read-through, write-through, write-around and write-back, with consistency trade-offs and examples." },
      { slug: "cache-eviction", title: "Cache Eviction Policies: LRU, LFU and TTL", short: "Eviction policies", level: "Intermediate", description: "Cache eviction policies explained: LRU, LFU, FIFO, TTL and approximations used by Redis, plus how to size a cache for its working set." },
      { slug: "cache-invalidation", title: "Cache Invalidation and Cache Stampedes", short: "Invalidation and stampedes", level: "Advanced", description: "Cache invalidation and stampede prevention: TTLs, versioned keys, delete-on-write races, request coalescing, locks and early refresh." },
      { slug: "redis", title: "Redis in System Design: Data Structures and Use Cases", short: "Redis", level: "Beginner", description: "Redis explained for system design: strings, hashes, sorted sets and streams, caching, leaderboards, rate limits, persistence, replication and Redis Cluster.", published: NEW },
    ],
  },
  {
    id: "messaging",
    title: "Messaging & async processing",
    blurb: "Decoupling work in time: queues, pub/sub, event logs, delivery guarantees and distributed transactions.",
    topics: [
      { slug: "message-queues", title: "Message Queues", short: "Message queues", level: "Beginner", description: "Message queues explained: producers, consumers, acknowledgements, visibility timeouts, dead-letter queues, and when to make work async." },
      { slug: "pub-sub", title: "Publish-Subscribe Messaging", short: "Pub/sub", level: "Beginner", description: "Publish-subscribe explained: topics, fan-out to many subscribers, push vs pull delivery, and how pub/sub differs from a work queue." },
      { slug: "event-streaming-kafka", title: "Event Streaming and Kafka: Log-Based Message Brokers", short: "Event streaming (Kafka)", level: "Intermediate", description: "How Kafka and log-based brokers work: partitions, offsets, consumer groups, retention, ordering guarantees and replay." },
      { slug: "delivery-semantics", title: "Delivery Guarantees: At-Most-Once, At-Least-Once and Exactly-Once", short: "Delivery guarantees", level: "Intermediate", description: "Message delivery semantics explained: at-most-once, at-least-once and effectively-once processing, duplicates, and how to handle them." },
      { slug: "idempotency", title: "Idempotency and Idempotency Keys", short: "Idempotency", level: "Intermediate", description: "Idempotency in APIs and consumers: idempotency keys, dedup tables, safe retries for payments, and designing idempotent operations." },
      { slug: "backpressure", title: "Backpressure and Flow Control", short: "Backpressure", level: "Intermediate", description: "Backpressure explained: bounded queues, flow control, dropping vs blocking vs buffering, and keeping fast producers from sinking slow consumers." },
      { slug: "event-sourcing-cqrs", title: "Event Sourcing and CQRS", short: "Event sourcing and CQRS", level: "Advanced", description: "Event sourcing and CQRS explained: storing events instead of state, projections, separate read and write models, and when they pay off." },
      { slug: "outbox-pattern", title: "Transactional Outbox and Change Data Capture", short: "Outbox and CDC", level: "Advanced", description: "The transactional outbox pattern and change data capture: avoiding dual writes, publishing events reliably, and Debezium-style CDC." },
      { slug: "saga-pattern", title: "The Saga Pattern for Distributed Transactions", short: "Sagas", level: "Advanced", description: "The saga pattern explained: orchestration vs choreography, compensating actions, and keeping data consistent across microservices." },
      { slug: "two-phase-commit", title: "Two-Phase Commit (2PC)", short: "Two-phase commit", level: "Advanced", description: "Two-phase commit explained: prepare and commit phases, the coordinator, blocking failures, and why most microservices prefer sagas." },
    ],
  },
  {
    id: "distributed",
    title: "Distributed systems",
    track: "distributed-systems",
    blurb: "Getting many machines to agree: failures, quorums, consensus, leaders, locks, clocks, IDs, gossip and CRDTs.",
    topics: [
      { slug: "fallacies-of-distributed-computing", title: "Partial Failure and the Fallacies of Distributed Computing", short: "Partial failure and fallacies", level: "Intermediate", description: "Why distributed systems are hard: partial failure, unreliable networks, the eight fallacies of distributed computing, and crash to Byzantine failure models.", published: NEW },
      { slug: "two-generals-and-flp", title: "The Two Generals Problem and FLP Impossibility", short: "Two generals and FLP", level: "Advanced", description: "The Two Generals Problem and the FLP impossibility result explained simply, and why real systems still reach agreement with timeouts and majorities.", published: NEW },
      { slug: "quorums", title: "Quorum Reads and Writes: R + W > N, Sloppy Quorums and Hinted Handoff", short: "Quorums", level: "Advanced", description: "Quorum replication explained: N, R and W, why R + W > N gives overlapping reads, sloppy quorums, hinted handoff, read repair and tunable consistency.", published: NEW },
      { slug: "dynamo-style-key-value-store", title: "How Dynamo-Style Key-Value Stores Work", short: "Dynamo-style KV stores", level: "Advanced", description: "How Dynamo-style key-value stores work: partitioning on a hash ring, replication, quorums, vector clocks, anti-entropy and failure handling, step by step.", published: NEW },
      { slug: "write-ahead-log", title: "Write-Ahead Logging (WAL) and Durability", short: "Write-ahead log", level: "Intermediate", description: "Write-ahead logging explained: why databases log before they write, fsync and group commit, checkpoints, crash recovery and log-based replication.", published: NEW },
      { slug: "merkle-trees", title: "Merkle Trees and Anti-Entropy Repair", short: "Merkle trees", level: "Advanced", description: "Merkle trees explained: hash trees that compare large datasets cheaply, anti-entropy repair between replicas, and their use in Cassandra, Git and blockchains.", published: NEW },
      { slug: "consensus", title: "Consensus Algorithms: Raft and Paxos", short: "Consensus (Raft, Paxos)", level: "Advanced", description: "Consensus explained through Raft: leader election, log replication, majorities and terms, plus where Paxos, etcd and ZooKeeper fit." },
      { slug: "leader-election", title: "Leader Election", short: "Leader election", level: "Advanced", description: "Leader election in distributed systems: leases, heartbeats, split brain, fencing, and electing a leader with etcd or ZooKeeper." },
      { slug: "distributed-locks", title: "Distributed Locks and Fencing Tokens", short: "Distributed locks", level: "Advanced", description: "Distributed locks explained: lease-based locks, why process pauses break them, fencing tokens, and when to avoid locking entirely." },
      { slug: "clocks-and-ordering", title: "Time, Clocks and Ordering: Lamport and Vector Clocks", short: "Clocks and ordering", level: "Advanced", description: "Ordering events without a global clock: clock skew, Lamport timestamps, vector clocks, hybrid logical clocks and TrueTime." },
      { slug: "crdts", title: "CRDTs: Conflict-Free Replicated Data Types", short: "CRDTs", level: "Advanced", description: "CRDTs explained: counters, sets and sequences that merge without conflicts, state vs operation based CRDTs, and how collaborative editors use them.", published: NEW },
      { slug: "hot-partitions", title: "Hot Keys and Hot Partitions: Detecting and Fixing Skew", short: "Hot keys and partitions", level: "Intermediate", description: "Hot keys and hot partitions explained: why skew breaks sharded systems, detecting them, key salting, splitting, caching and request coalescing fixes.", published: NEW },
      { slug: "distributed-sql", title: "Distributed SQL Databases: Spanner, CockroachDB and NewSQL", short: "Distributed SQL", level: "Advanced", description: "How distributed SQL databases work: range sharding, Raft-replicated ranges, distributed transactions and clocks in Spanner, CockroachDB and similar systems.", published: NEW },
      { slug: "geo-replication", title: "Multi-Region Databases and Geo-Replication", short: "Geo-replication", level: "Advanced", description: "Geo-replication explained: single-leader vs multi-leader across regions, conflict resolution, follower reads, data residency and the cost of consistency.", published: NEW },
      { slug: "unique-id-generation", title: "Unique ID Generation: UUID, Snowflake and ULID", short: "Unique IDs", level: "Intermediate", description: "Generating unique IDs at scale: auto-increment, UUIDv4 and v7, Twitter Snowflake, ULID and ticket servers, with their trade-offs." },
      { slug: "gossip-protocol", title: "Gossip Protocols and Failure Detection", short: "Gossip and failure detection", level: "Advanced", description: "Gossip protocols explained: epidemic dissemination, membership, phi-accrual failure detection, and how Cassandra and Consul use gossip." },
      { slug: "probabilistic-data-structures", title: "Bloom Filters, HyperLogLog and Count-Min Sketch", short: "Bloom filters and sketches", level: "Intermediate", description: "Probabilistic data structures explained: Bloom filters, HyperLogLog and count-min sketch, their error rates, and real system uses." },
    ],
  },
  {
    id: "reliability",
    title: "Reliability & resilience",
    blurb: "Staying up when parts fail: rate limits, timeouts, circuit breakers, shedding load and recovering from disasters.",
    topics: [
      { slug: "rate-limiting", title: "Rate Limiting Algorithms", short: "Rate limiting", level: "Intermediate", description: "Rate limiting algorithms explained: token bucket, leaky bucket, fixed and sliding windows, and building a distributed rate limiter." },
      { slug: "circuit-breaker", title: "Circuit Breakers and Bulkheads", short: "Circuit breakers", level: "Intermediate", description: "The circuit breaker pattern explained: closed, open and half-open states, bulkheads, and stopping one slow dependency from taking down everything." },
      { slug: "retries-and-timeouts", title: "Timeouts, Retries and Exponential Backoff", short: "Timeouts and retries", level: "Intermediate", description: "Timeouts and retries done right: exponential backoff with jitter, retry budgets, deadlines, and avoiding retry storms." },
      { slug: "load-shedding", title: "Load Shedding and Graceful Degradation", short: "Load shedding", level: "Advanced", description: "Load shedding and graceful degradation: rejecting work early, prioritising traffic, and keeping core features alive under overload." },
      { slug: "disaster-recovery", title: "Disaster Recovery: RPO, RTO and Multi-Region", short: "Disaster recovery", level: "Advanced", description: "Disaster recovery explained: RPO and RTO, backups, warm and hot standbys, active-active multi-region, and testing failover." },
      { slug: "health-checks-failover", title: "Health Checks and Failover", short: "Health checks and failover", level: "Intermediate", description: "Health checks and failover: liveness vs readiness, deep vs shallow checks, failure detection, and automatic failover without flapping." },
    ],
  },
  {
    id: "architecture",
    title: "Architecture patterns",
    blurb: "Shaping whole systems: service boundaries, discovery, serverless, API conventions and fan-out.",
    topics: [
      { slug: "monolith-vs-microservices", title: "Monolith vs Microservices", short: "Monolith vs microservices", level: "Beginner", description: "Monolith vs microservices: deployment, team ownership, data boundaries and operational cost, plus the modular monolith in between." },
      { slug: "service-discovery", title: "Service Discovery", short: "Service discovery", level: "Intermediate", description: "Service discovery explained: client-side vs server-side discovery, service registries, DNS-based discovery and Kubernetes services." },
      { slug: "service-mesh", title: "Service Mesh and the Sidecar Pattern", short: "Service mesh", level: "Advanced", description: "What a service mesh does: sidecar proxies, mTLS, retries, traffic shifting and observability, and when it is worth the complexity." },
      { slug: "serverless", title: "Serverless Architecture", short: "Serverless", level: "Beginner", description: "Serverless architecture explained: functions as a service, cold starts, scaling to zero, limits, pricing, and the workloads it suits." },
      { slug: "pagination", title: "API Pagination: Offset vs Cursor", short: "Pagination", level: "Beginner", description: "API pagination explained: offset vs cursor (keyset) pagination, stable ordering, performance on large tables, and opaque cursors." },
      { slug: "webhooks", title: "Webhooks", short: "Webhooks", level: "Beginner", description: "How webhooks work: event delivery over HTTP, signatures, retries and idempotency, ordering, and building a reliable webhook system." },
      { slug: "fan-out", title: "Fan-Out on Write vs Fan-Out on Read", short: "Feed fan-out", level: "Intermediate", description: "Fan-out on write vs fan-out on read for news feeds and timelines: push vs pull, the celebrity problem, and hybrid approaches." },
    ],
  },
  {
    id: "building-blocks",
    title: "Real-world building blocks",
    track: "software-engineering",
    blurb: "The specific mechanisms behind classic design questions: typeahead, video delivery, payments, uploads and scheduling.",
    topics: [
      { slug: "typeahead-autocomplete", title: "Typeahead Autocomplete: Tries, Top-K and Caching", short: "Typeahead and tries", level: "Intermediate", description: "How search autocomplete works: tries and prefix indexes, precomputed top-k suggestions, ranking, caching at the edge and rebuilding the index offline.", published: NEW },
      { slug: "video-streaming-adaptive-bitrate", title: "Video Streaming: Transcoding, HLS, DASH and Adaptive Bitrate", short: "Video streaming (HLS, DASH)", level: "Intermediate", description: "How video streaming works: upload, transcoding ladders, HLS and DASH segments, adaptive bitrate players and CDN delivery behind YouTube and Netflix.", published: NEW },
      { slug: "payment-system-ledger", title: "Payment Systems: Ledgers, Double-Entry Accounting and Reconciliation", short: "Payments and ledgers", level: "Advanced", description: "How payment systems stay correct: double-entry ledgers, payment state machines, idempotent PSP calls, webhooks and daily reconciliation, step by step.", published: NEW },
      { slug: "resumable-file-uploads", title: "Large File Uploads: Chunking, Resumable Uploads and Deduplication", short: "Resumable uploads", level: "Intermediate", description: "Designing large file uploads: chunking, resumable and multipart uploads, presigned URLs, checksums, content-defined deduplication and sync for cloud storage.", published: NEW },
      { slug: "distributed-task-scheduler", title: "Distributed Job Scheduling: Cron, Delayed Jobs and Leases", short: "Job scheduling", level: "Advanced", description: "How distributed job schedulers work: cron and delayed jobs, time-bucketed queues, leases and heartbeats, retries, at-least-once execution and dead letters.", published: NEW },
    ],
  },
  {
    id: "low-level-design",
    title: "Low-level design (LLD)",
    track: "software-engineering",
    blurb: "Designing the code inside a service: object-oriented design, SOLID principles and the patterns LLD rounds expect.",
    topics: [
      { slug: "hld-vs-lld", title: "High-Level Design vs Low-Level Design (HLD vs LLD)", short: "HLD vs LLD", level: "Beginner", description: "HLD vs LLD explained: what each interview round tests, the deliverables of high-level and low-level design, and how to prepare for both with examples.", published: NEW },
      { slug: "solid-principles", title: "SOLID Principles Explained with Examples", short: "SOLID principles", level: "Beginner", description: "The SOLID principles explained with code examples: single responsibility, open-closed, Liskov substitution, interface segregation and dependency inversion.", published: NEW },
      { slug: "design-patterns", title: "Design Patterns for LLD Interviews: Strategy, Observer, Factory", short: "Design patterns", level: "Intermediate", description: "The design patterns that come up in low-level design interviews: strategy, observer, factory, builder, singleton, decorator, adapter and state, with examples.", published: NEW },
    ],
  },
  {
    id: "data-engineering",
    title: "Data engineering",
    track: "data-engineering",
    blurb: "Move data from operational sources into trusted, queryable products with reliable pipelines and clear ownership.",
    topics: [
      { slug: "data-engineering-architecture", title: "Data Engineering Architecture: From Sources to Trusted Data Products", short: "Data engineering architecture", level: "Intermediate", description: "Design an end-to-end data platform: ingestion, lake and warehouse layers, batch and streaming pipelines, data quality, governance, and serving." },
      { slug: "etl-vs-elt", title: "ETL vs ELT: Differences, Pros and Cons, and When to Use Each", short: "ETL vs ELT", level: "Beginner", description: "ETL vs ELT explained: where transformations run, how cloud warehouses changed the trade-off, data quality and cost, and how to choose for a pipeline.", published: NEW },
      { slug: "data-warehouse-vs-data-lake", title: "Data Warehouse vs Data Lake vs Lakehouse", short: "Warehouse vs lake vs lakehouse", level: "Beginner", description: "Data warehouse vs data lake vs lakehouse: storage, schemas, query engines, governance and cost compared, and how to choose an analytics architecture.", published: NEW },
      { slug: "dimensional-modeling", title: "Dimensional Modeling: Star Schema, Snowflake Schema and Facts", short: "Dimensional modeling", level: "Intermediate", description: "Dimensional data modeling explained: fact and dimension tables, grain, star vs snowflake schemas, surrogate keys and designing a warehouse model.", published: NEW },
      { slug: "slowly-changing-dimensions", title: "Slowly Changing Dimensions: SCD Type 1, 2 and 3 Explained", short: "Slowly changing dimensions", level: "Intermediate", description: "Slowly changing dimensions explained: SCD Type 1, 2 and 3, effective dates and current flags, surrogate keys, and loading SCD2 tables with MERGE.", published: NEW },
      { slug: "medallion-architecture", title: "Medallion Architecture: Bronze, Silver and Gold Layers", short: "Medallion architecture", level: "Beginner", description: "The medallion architecture explained: bronze, silver and gold layers in a lakehouse, what belongs in each, data quality gates and common mistakes.", published: NEW },
      { slug: "batch-vs-stream-processing", title: "Batch vs Stream Processing", short: "Batch vs stream", level: "Intermediate", description: "Batch vs stream processing: MapReduce and Spark vs Flink and Kafka Streams, windows, event time, late data, and lambda vs kappa." },
      { slug: "stream-processing-windows-watermarks", title: "Stream Processing: Windows, Watermarks and Late Data", short: "Windows and watermarks", level: "Advanced", description: "Stream processing concepts explained: event time vs processing time, tumbling, sliding and session windows, watermarks, late data and stateful operators.", published: NEW },
      { slug: "apache-spark-architecture", title: "How Apache Spark Works: Driver, Executors, Partitions and Shuffles", short: "Apache Spark architecture", level: "Intermediate", description: "Apache Spark architecture explained: driver and executors, lazy DAGs, partitions, shuffles, broadcast joins, data skew and tuning Spark jobs at scale.", published: NEW },
      { slug: "columnar-file-formats", title: "Columnar File Formats and Partitioning: Parquet, ORC and Avro", short: "Parquet, ORC and Avro", level: "Intermediate", description: "Parquet vs ORC vs Avro explained: row vs columnar storage, compression, predicate pushdown, partitioning, the small files problem and choosing a format.", published: NEW },
      { slug: "open-table-formats", title: "Open Table Formats: Apache Iceberg, Delta Lake and Hudi", short: "Iceberg, Delta and Hudi", level: "Advanced", description: "Open table formats explained: how Apache Iceberg, Delta Lake and Hudi add ACID transactions, time travel, schema evolution and compaction to data lakes.", published: NEW },
      { slug: "data-pipeline-orchestration", title: "Data Pipeline Orchestration: Airflow, DAGs and Backfills", short: "Pipeline orchestration", level: "Intermediate", description: "Data pipeline orchestration explained: DAGs, scheduling, dependencies, retries, idempotent tasks and backfills in Airflow, Dagster and similar tools.", published: NEW },
      { slug: "data-quality", title: "Data Quality and Data Observability: Checks, SLAs and Alerts", short: "Data quality", level: "Intermediate", description: "Data quality and data observability explained: freshness, volume, schema and distribution checks, data SLAs, where to test in a pipeline and alerting.", published: NEW },
      { slug: "data-contracts-schema-evolution", title: "Data Contracts and Schema Evolution", short: "Data contracts and schemas", level: "Advanced", description: "Data contracts and schema evolution explained: producer-owned schemas, compatibility rules, schema registries, breaking changes and versioning events.", published: NEW },
    ],
  },
  {
    id: "machine-learning",
    title: "Machine learning systems",
    track: "machine-learning",
    blurb: "Connect data, training, features, model deployment, online inference and feedback into a system that can be operated.",
    topics: [
      { slug: "machine-learning-system-architecture", title: "Machine Learning System Architecture: Data to Production Models", short: "ML system architecture", level: "Advanced", description: "How production ML systems connect data pipelines, training, feature stores, model registries, deployment, online serving, and drift monitoring." },
      { slug: "feature-store", title: "Feature Stores: Online vs Offline Features and Training-Serving Skew", short: "Feature stores", level: "Advanced", description: "Feature stores explained: offline and online stores, point-in-time correct training data, streaming features and how they prevent training-serving skew.", published: NEW },
      { slug: "recommendation-system-design", title: "Recommendation System Design: Candidate Generation and Ranking", short: "Recommendation systems", level: "Advanced", description: "How recommendation systems are designed: candidate generation, two-tower retrieval, multi-stage ranking, re-ranking for diversity and feedback loops.", published: NEW },
      { slug: "model-serving", title: "ML Model Serving: Batch vs Real-Time Inference", short: "Model serving", level: "Intermediate", description: "ML model serving explained: batch vs online inference, latency budgets, dynamic batching, GPU utilisation, model versioning, shadow and canary deployments.", published: NEW },
      { slug: "ml-evaluation-metrics", title: "ML Evaluation: Offline Metrics, Online Metrics and Choosing Both", short: "ML evaluation", level: "Intermediate", description: "How to evaluate ML systems: precision, recall, AUC, NDCG and calibration offline, then CTR and guardrails online, and why offline wins don't always ship.", published: NEW },
      { slug: "ab-testing-experimentation", title: "A/B Testing and Experimentation Platforms", short: "A/B testing", level: "Intermediate", description: "A/B testing for system design: randomisation units, assignment, metrics and guardrails, sample size, peeking, and building an experimentation platform.", published: NEW },
      { slug: "distributed-training", title: "Distributed Model Training: Data, Model and Pipeline Parallelism", short: "Distributed training", level: "Advanced", description: "Distributed training explained: data, model and pipeline parallelism, all-reduce, sharded optimizers, checkpointing and failure recovery on GPU clusters.", published: NEW },
      { slug: "ml-model-monitoring", title: "ML Model Monitoring: Data Drift, Concept Drift and Feedback", short: "Model monitoring", level: "Intermediate", description: "ML model monitoring explained: data drift vs concept drift, delayed labels, prediction and feature monitoring, alerting and when to retrain a model.", published: NEW },
      { slug: "mlops-model-registry", title: "MLOps: Model Registry, CI/CD for Models and Reproducibility", short: "MLOps and model registry", level: "Intermediate", description: "MLOps explained: experiment tracking, model registries, versioned data and code, CI/CD for models, approvals, rollback and reproducible training.", published: NEW },
    ],
  },
  {
    id: "ai-architecture",
    title: "AI application architecture",
    track: "machine-learning",
    blurb: "Build useful AI products around models with retrieval, tools, safety, evaluation and reliable user-facing behavior.",
    topics: [
      { slug: "ai-application-architecture", title: "AI Application Architecture: Retrieval, Tools and Guardrails", short: "AI application architecture", level: "Advanced", description: "Design an AI application around foundation models: request orchestration, retrieval-augmented generation, tools, safety, evaluation, and cost controls." },
      { slug: "retrieval-augmented-generation", title: "Retrieval-Augmented Generation (RAG) Architecture", short: "RAG architecture", level: "Intermediate", description: "RAG architecture explained: chunking, embeddings, vector and hybrid search, re-ranking, prompt assembly, citations and evaluating retrieval quality.", published: NEW },
      { slug: "vector-databases", title: "Vector Databases and Approximate Nearest Neighbor Search", short: "Vector databases", level: "Intermediate", description: "Vector databases explained: embeddings, cosine similarity, ANN indexes like HNSW and IVF, filtering, recall vs latency and scaling vector search.", published: NEW },
      { slug: "llm-inference-serving", title: "LLM Inference and Serving: Batching, KV Cache and Latency", short: "LLM serving", level: "Advanced", description: "How LLM serving works: prefill and decode, the KV cache, continuous batching, streaming tokens, quantization, routing between models and cost per request.", published: NEW },
    ],
  },
  {
    id: "operations",
    title: "Platform engineering & SRE",
    track: "platform-infrastructure",
    blurb: "Running systems in production: containers, Kubernetes, infrastructure as code, delivery, observability and incidents.",
    topics: [
      { slug: "containers-vs-virtual-machines", title: "Containers vs Virtual Machines", short: "Containers vs VMs", level: "Beginner", description: "Containers vs virtual machines explained: hypervisors, namespaces and cgroups, images, isolation and security, startup time, and when to use each.", published: NEW },
      { slug: "kubernetes-architecture", title: "Kubernetes Architecture: Control Plane, Nodes, Pods and Services", short: "Kubernetes architecture", level: "Intermediate", description: "Kubernetes architecture explained: API server, etcd, scheduler and controllers, nodes and kubelet, pods, deployments, services and the reconciliation loop.", published: NEW },
      { slug: "infrastructure-as-code", title: "Infrastructure as Code: Terraform, State and Drift", short: "Infrastructure as code", level: "Intermediate", description: "Infrastructure as code explained: declarative vs imperative, Terraform plan and apply, remote state and locking, modules, drift detection and policy checks.", published: NEW },
      { slug: "ci-cd-pipelines", title: "CI/CD Pipelines: From Commit to Production", short: "CI/CD pipelines", level: "Beginner", description: "CI/CD pipelines explained: continuous integration, build artifacts, test stages, continuous delivery vs deployment, environment promotion and rollback.", published: NEW },
      { slug: "deployment-strategies", title: "Deployment Strategies: Blue-Green, Canary and Rolling", short: "Deployment strategies", level: "Intermediate", description: "Deployment strategies compared: rolling, blue-green and canary releases, feature flags, database migrations and fast rollback." },
      { slug: "feature-flags", title: "Feature Flags and Dynamic Configuration", short: "Feature flags", level: "Intermediate", description: "Feature flags explained: release, experiment and kill-switch flags, targeting rules, evaluating flags safely at scale, config propagation and flag debt.", published: NEW },
      { slug: "observability", title: "Observability: Logs, Metrics and Traces", short: "Observability", level: "Beginner", description: "Observability explained: logs, metrics and distributed traces, RED and USE methods, cardinality, and alerting on symptoms." },
      { slug: "incident-management", title: "Incident Management, On-Call and Blameless Postmortems", short: "Incident management", level: "Intermediate", description: "Incident management explained: severity levels, on-call, incident roles, mitigation before root cause, status updates and writing blameless postmortems.", published: NEW },
      { slug: "autoscaling", title: "Autoscaling", short: "Autoscaling", level: "Intermediate", description: "Autoscaling explained: horizontal and vertical scaling, target metrics, scale-up lag, cooldowns, predictive scaling and warm pools." },
      { slug: "capacity-planning", title: "Capacity Planning and Load Testing", short: "Capacity planning", level: "Intermediate", description: "Capacity planning explained: forecasting demand, headroom and utilisation targets, load testing methods, finding the bottleneck and planning for peaks.", published: NEW },
      { slug: "multi-tenancy", title: "Multi-Tenancy: Isolation Models for SaaS and Platforms", short: "Multi-tenancy", level: "Advanced", description: "Multi-tenant architecture explained: silo, pool and bridge models, tenant isolation, noisy neighbours, per-tenant limits, data partitioning and cost.", published: NEW },
      { slug: "secrets-management", title: "Secrets Management: Vaults, Rotation and Workload Identity", short: "Secrets management", level: "Intermediate", description: "Secrets management explained: why secrets don't belong in code, vaults and KMS, dynamic short-lived credentials, rotation, workload identity and auditing.", published: NEW },
      { slug: "internal-developer-platform", title: "Internal Developer Platforms and Golden Paths", short: "Internal developer platforms", level: "Advanced", description: "Internal developer platforms explained: golden paths, service templates, self-service infrastructure, service catalogs, guardrails and measuring adoption.", published: NEW },
      { slug: "chaos-engineering", title: "Chaos Engineering and Resilience Testing", short: "Chaos engineering", level: "Advanced", description: "Chaos engineering explained: steady-state hypotheses, fault injection, blast radius, game days and building confidence that a system survives failure.", published: NEW },
    ],
  },
  {
    id: "frontend-mobile",
    title: "Frontend & mobile",
    track: "frontend-mobile",
    blurb: "Client-side system design: rendering, state, caching, performance, offline sync and shipping to millions of devices.",
    topics: [
      { slug: "frontend-system-design-interview", title: "Frontend System Design Interview: A Framework and Example", short: "Frontend interview framework", level: "Beginner", description: "How to approach a frontend system design interview: requirements, component architecture, data model, API interface and optimisations, with a worked example.", published: NEW },
      { slug: "rendering-strategies", title: "CSR vs SSR vs SSG vs ISR: Web Rendering Strategies", short: "CSR vs SSR vs SSG", level: "Intermediate", description: "Web rendering strategies compared: client-side rendering, server-side rendering, static generation, ISR, hydration and streaming, and when to use each.", published: NEW },
      { slug: "core-web-vitals", title: "Web Performance and Core Web Vitals: LCP, INP and CLS", short: "Core Web Vitals", level: "Intermediate", description: "Web performance explained: Core Web Vitals (LCP, INP, CLS), the critical rendering path, code splitting, lazy loading and performance budgets.", published: NEW },
      { slug: "frontend-state-management", title: "Frontend State Management: Local, Global and Server State", short: "State management", level: "Intermediate", description: "Frontend state management explained: local vs global vs server state, stores, data-fetching caches, normalisation, optimistic updates and when to use each.", published: NEW },
      { slug: "browser-caching", title: "Browser Caching: HTTP Cache Headers and Service Workers", short: "Browser caching", level: "Intermediate", description: "Browser caching explained: Cache-Control, ETags and revalidation, immutable hashed assets, service worker caching strategies and what never to cache.", published: NEW },
      { slug: "list-virtualization", title: "Infinite Scroll and List Virtualization", short: "Infinite scroll and virtualization", level: "Intermediate", description: "Infinite scroll done right: cursor pagination, prefetching, windowed list virtualization, image placeholders, scroll restoration and accessibility.", published: NEW },
      { slug: "image-optimization", title: "Image Optimization: Formats, Responsive Images and Lazy Loading", short: "Image optimization", level: "Beginner", description: "Image optimization explained: AVIF and WebP, responsive srcset and sizes, lazy loading, placeholders, image CDNs and avoiding layout shift.", published: NEW },
      { slug: "offline-first-sync", title: "Offline-First Apps: Local Storage, Sync and Conflict Resolution", short: "Offline-first sync", level: "Advanced", description: "Offline-first app design explained: local databases, an outbox of pending changes, delta sync with cursors, conflict resolution and background sync.", published: NEW },
      { slug: "push-notifications", title: "How Push Notifications Work: APNs, FCM and Web Push", short: "Push notifications", level: "Intermediate", description: "How push notifications work: device tokens, APNs, FCM and Web Push, delivery guarantees, fan-out at scale, preferences, quiet hours and deduplication.", published: NEW },
      { slug: "mobile-release-engineering", title: "Mobile Release Engineering: Staged Rollouts and Forced Updates", short: "Mobile releases", level: "Intermediate", description: "Mobile release engineering explained: app store review, phased rollouts, feature flags, minimum supported versions, forced updates and crash monitoring.", published: NEW },
      { slug: "micro-frontends", title: "Micro-Frontends: Architecture, Composition and Trade-offs", short: "Micro-frontends", level: "Advanced", description: "Micro-frontends explained: splitting a web app by team, build-time vs runtime composition, module federation, shared dependencies and when to avoid them.", published: NEW },
      { slug: "frontend-security", title: "Frontend Security: XSS, CSRF, CORS and Content Security Policy", short: "Frontend security", level: "Intermediate", description: "Frontend security explained: XSS and how to prevent it, CSRF and SameSite cookies, CORS, Content Security Policy and storing tokens safely in the browser.", published: NEW },
    ],
  },
  {
    id: "security",
    title: "Security",
    blurb: "Knowing who is calling, what they may do, and keeping data private in transit and at rest.",
    topics: [
      { slug: "authentication-authorization", title: "Authentication vs Authorization: Sessions, JWT and OAuth", short: "AuthN vs AuthZ", level: "Intermediate", description: "Authentication vs authorization: sessions vs JWTs, OAuth 2.0 and OpenID Connect flows, token refresh, RBAC and ABAC." },
      { slug: "encryption", title: "Encryption in Transit and at Rest", short: "Encryption", level: "Beginner", description: "Encryption in system design: TLS in transit, encryption at rest, envelope encryption with a KMS, key rotation and hashing passwords." },
    ],
  },
  {
    id: "interview",
    title: "Interview prep",
    blurb: "How system design interviews work, what to practice, and how to practise it well.",
    topics: [
      { slug: "system-design-interview", title: "How to Prepare for a System Design Interview: A Practice-First Guide", short: "Interview preparation", level: "Beginner", description: "How to prepare for a system design interview: what interviewers assess, a step-by-step 45-minute framework, common mistakes and a 4-week practice plan.", published: "2026-10-14" },
      { slug: "system-design-interview-questions", title: "System Design Interview Questions to Practice, by Role and Level", short: "Interview questions", level: "Beginner", description: "49 system design interview questions grouped by role (SDE, data engineering, ML, platform, distributed systems, frontend) and level, with what each one tests.", published: "2026-10-14" },
      { slug: "how-to-practice-system-design", title: "How to Practice System Design: Books vs Mock Interviews vs AI", short: "How to practice", level: "Beginner", description: "How to practice system design: books and courses vs mock interviews with peers or experts vs AI practice tools, what each is good for and how to combine them.", published: "2026-10-14" },
    ],
  },
];

// Categories community authors can write in (roadmaps and interview guides are editorial).
export const WRITABLE_CATEGORY_IDS = CATEGORIES.map((category) => category.id).filter((id) => id !== "interview" && id !== "roadmaps");

// A suggested reading order for newcomers.
export const START_HERE = [
  "system-design-interview", "scalability", "latency-vs-throughput", "back-of-the-envelope-estimation", "load-balancing",
  "caching", "sql-vs-nosql", "replication", "sharding", "message-queues", "cap-theorem", "rate-limiting",
];

// Each interview discipline's roadmap, categories and first three guides, for the hub.
export const DISCIPLINES = {
  "software-engineering": { roadmap: "backend-system-design-roadmap", categories: ["building-blocks", "low-level-design"], guides: ["system-design-interview", "api-design", "caching"] },
  "data-engineering": { roadmap: "data-engineering-roadmap", categories: ["data-engineering"], guides: ["data-engineering-architecture", "etl-vs-elt", "dimensional-modeling"] },
  "machine-learning": { roadmap: "machine-learning-system-design-roadmap", categories: ["machine-learning", "ai-architecture"], guides: ["machine-learning-system-architecture", "recommendation-system-design", "retrieval-augmented-generation"] },
  "platform-infrastructure": { roadmap: "platform-engineering-roadmap", categories: ["operations"], guides: ["kubernetes-architecture", "observability", "incident-management"] },
  "distributed-systems": { roadmap: "distributed-systems-roadmap", categories: ["distributed"], guides: ["fallacies-of-distributed-computing", "quorums", "consensus"] },
  "frontend-mobile": { roadmap: "frontend-system-design-roadmap", categories: ["frontend-mobile"], guides: ["frontend-system-design-interview", "rendering-strategies", "core-web-vitals"] },
};

export const TOPICS = CATEGORIES.flatMap((category) => category.topics.map((topic) => ({ ...topic, category: category.id })));
const bySlug = new Map(TOPICS.map((topic) => [topic.slug, topic]));

export const topicMeta = (slug) => bySlug.get(slug) ?? null;
export const categoryById = (id) => CATEGORIES.find((category) => category.id === id) ?? null;
export const topicPath = (slug) => `${LEARN_PATH}/${slug}`;

// Previous and next topics within the same category, for the end of each article.
export function neighbours(slug) {
  const topic = bySlug.get(slug);
  const list = categoryById(topic.category).topics;
  const index = list.findIndex((item) => item.slug === slug);
  return { previous: list[index - 1] ?? null, next: list[index + 1] ?? null };
}
