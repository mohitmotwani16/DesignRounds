// The Learn section's table of contents: categories and the metadata of every topic.
// This file ships in the main bundle (sidebar, SEO tags, sitemap); each topic's body
// lives in src/learn/topics/<slug>.js and is loaded only on its own page.
//
// level: Beginner | Intermediate | Advanced. description: the meta description and lede
// (aim for 120-160 characters, naming the concept the way people search for it).

export const LEARN_PATH = "/learn";
export const LEARN_UPDATED = "2026-10-17";

export const CATEGORIES = [
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
      { slug: "cache-strategies", title: "Cache Strategies: Cache-Aside, Read-Through, Write-Through and Write-Back", short: "Cache strategies", level: "Intermediate", description: "Caching strategies compared: cache-aside, read-through, write-through, write-around and write-back, with consistency trade-offs and examples." },
      { slug: "cache-eviction", title: "Cache Eviction Policies: LRU, LFU and TTL", short: "Eviction policies", level: "Intermediate", description: "Cache eviction policies explained: LRU, LFU, FIFO, TTL and approximations used by Redis, plus how to size a cache for its working set." },
      { slug: "cache-invalidation", title: "Cache Invalidation and Cache Stampedes", short: "Invalidation and stampedes", level: "Advanced", description: "Cache invalidation and stampede prevention: TTLs, versioned keys, delete-on-write races, request coalescing, locks and early refresh." },
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
    blurb: "Getting many machines to agree: consensus, leaders, locks, clocks, IDs, gossip and probabilistic structures.",
    topics: [
      { slug: "consensus", title: "Consensus Algorithms: Raft and Paxos", short: "Consensus (Raft, Paxos)", level: "Advanced", description: "Consensus explained through Raft: leader election, log replication, majorities and terms, plus where Paxos, etcd and ZooKeeper fit." },
      { slug: "leader-election", title: "Leader Election", short: "Leader election", level: "Advanced", description: "Leader election in distributed systems: leases, heartbeats, split brain, fencing, and electing a leader with etcd or ZooKeeper." },
      { slug: "distributed-locks", title: "Distributed Locks and Fencing Tokens", short: "Distributed locks", level: "Advanced", description: "Distributed locks explained: lease-based locks, why process pauses break them, fencing tokens, and when to avoid locking entirely." },
      { slug: "clocks-and-ordering", title: "Time, Clocks and Ordering: Lamport and Vector Clocks", short: "Clocks and ordering", level: "Advanced", description: "Ordering events without a global clock: clock skew, Lamport timestamps, vector clocks, hybrid logical clocks and TrueTime." },
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
    blurb: "Shaping whole systems: service boundaries, discovery, serverless, API conventions, fan-out and processing models.",
    topics: [
      { slug: "monolith-vs-microservices", title: "Monolith vs Microservices", short: "Monolith vs microservices", level: "Beginner", description: "Monolith vs microservices: deployment, team ownership, data boundaries and operational cost, plus the modular monolith in between." },
      { slug: "service-discovery", title: "Service Discovery", short: "Service discovery", level: "Intermediate", description: "Service discovery explained: client-side vs server-side discovery, service registries, DNS-based discovery and Kubernetes services." },
      { slug: "service-mesh", title: "Service Mesh and the Sidecar Pattern", short: "Service mesh", level: "Advanced", description: "What a service mesh does: sidecar proxies, mTLS, retries, traffic shifting and observability, and when it is worth the complexity." },
      { slug: "serverless", title: "Serverless Architecture", short: "Serverless", level: "Beginner", description: "Serverless architecture explained: functions as a service, cold starts, scaling to zero, limits, pricing, and the workloads it suits." },
      { slug: "pagination", title: "API Pagination: Offset vs Cursor", short: "Pagination", level: "Beginner", description: "API pagination explained: offset vs cursor (keyset) pagination, stable ordering, performance on large tables, and opaque cursors." },
      { slug: "webhooks", title: "Webhooks", short: "Webhooks", level: "Beginner", description: "How webhooks work: event delivery over HTTP, signatures, retries and idempotency, ordering, and building a reliable webhook system." },
      { slug: "fan-out", title: "Fan-Out on Write vs Fan-Out on Read", short: "Feed fan-out", level: "Intermediate", description: "Fan-out on write vs fan-out on read for news feeds and timelines: push vs pull, the celebrity problem, and hybrid approaches." },
      { slug: "batch-vs-stream-processing", title: "Batch vs Stream Processing", short: "Batch vs stream", level: "Intermediate", description: "Batch vs stream processing: MapReduce and Spark vs Flink and Kafka Streams, windows, event time, late data, and lambda vs kappa." },
    ],
  },
  {
    id: "operations",
    title: "Observability & operations",
    blurb: "Running systems in production: seeing what they do, shipping changes safely and scaling capacity.",
    topics: [
      { slug: "observability", title: "Observability: Logs, Metrics and Traces", short: "Observability", level: "Beginner", description: "Observability explained: logs, metrics and distributed traces, RED and USE methods, cardinality, and alerting on symptoms." },
      { slug: "deployment-strategies", title: "Deployment Strategies: Blue-Green, Canary and Rolling", short: "Deployment strategies", level: "Intermediate", description: "Deployment strategies compared: rolling, blue-green and canary releases, feature flags, database migrations and fast rollback." },
      { slug: "autoscaling", title: "Autoscaling", short: "Autoscaling", level: "Intermediate", description: "Autoscaling explained: horizontal and vertical scaling, target metrics, scale-up lag, cooldowns, predictive scaling and warm pools." },
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
      { slug: "system-design-interview", title: "How to Prepare for a System Design Interview: A Practice-First Guide", short: "Interview preparation", level: "Beginner", description: "A practical guide to system design interview preparation: what interviewers assess, a step-by-step framework for 45 minutes, common mistakes, and a 4-week practice plan.", published: "2026-10-14" },
      { slug: "system-design-interview-questions", title: "System Design Interview Questions to Practice, by Role and Level", short: "Interview questions", level: "Beginner", description: "49 system design interview questions grouped by role (SDE, data engineering, ML, platform, distributed systems, frontend) and level, with what each one tests.", published: "2026-10-14" },
      { slug: "how-to-practice-system-design", title: "How to Practice System Design: Books vs Mock Interviews vs AI", short: "How to practice", level: "Beginner", description: "Compare the ways to practice system design: books and courses, mock interviews with peers or experts, and AI practice tools. What each is good for and how to combine them.", published: "2026-10-14" },
    ],
  },
];

// A suggested reading order for newcomers.
export const START_HERE = [
  "system-design-interview", "scalability", "latency-vs-throughput", "back-of-the-envelope-estimation", "load-balancing",
  "caching", "sql-vs-nosql", "replication", "sharding", "message-queues", "cap-theorem", "rate-limiting",
];

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
