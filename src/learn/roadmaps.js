// Learning roadmaps: an ordered path through handbook topics for each discipline.
// A roadmap page's body places one with { type: "roadmap", id }. Every `topics` entry is
// a handbook slug (prefix "?" for a good-to-know topic); `rounds` are practice round ids.
// scripts/check-learn.mjs verifies every reference.

const stage = (title, blurb, topics, rounds = []) => ({
  title,
  blurb,
  topics: topics.map((entry) => (entry.startsWith("?") ? { slug: entry.slice(1), optional: true } : { slug: entry, optional: false })),
  rounds,
});

export const ROADMAPS = {
  "system-design": {
    page: "system-design-roadmap",
    title: "System design",
    stages: [
      stage("How interviews and estimates work", "Know what is being assessed and how to size a system before drawing it.", ["system-design-interview", "back-of-the-envelope-estimation", "hld-vs-lld", "?how-to-practice-system-design"]),
      stage("Core properties", "The vocabulary every trade-off is argued in.", ["scalability", "latency-vs-throughput", "availability", "?acid-vs-base"]),
      stage("Networking and APIs", "How a request travels from a client to your servers and back.", ["dns", "http", "api-design", "load-balancing", "api-gateway", "cdn", "?tcp-vs-udp", "?api-styles"], ["url-shortener"]),
      stage("Storing data", "Choosing a database and growing it past one machine.", ["sql-vs-nosql", "database-indexing", "replication", "sharding", "consistent-hashing", "?nosql-database-types", "?object-storage"], ["paste-service"]),
      stage("Caching", "Serving reads fast without serving wrong data.", ["caching", "cache-strategies", "cache-eviction", "?cache-invalidation", "?redis"], ["distributed-cache"]),
      stage("Asynchronous work", "Decoupling producers from consumers and surviving retries.", ["message-queues", "pub-sub", "event-streaming-kafka", "delivery-semantics", "idempotency"], ["notification-service"]),
      stage("Distributed systems essentials", "What changes when many machines must agree.", ["cap-theorem", "consistency-models", "unique-id-generation", "?consensus", "?distributed-locks"], ["unique-id-generator"]),
      stage("Reliability", "Keeping the system up when parts of it fail.", ["rate-limiting", "retries-and-timeouts", "circuit-breaker", "health-checks-failover", "?load-shedding", "?disaster-recovery"], ["rate-limiter"]),
      stage("Architecture and operations", "Shaping services and running them in production.", ["monolith-vs-microservices", "observability", "deployment-strategies", "authentication-authorization", "?service-discovery", "?autoscaling"]),
      stage("Practise full designs", "Put the pieces together under interview conditions.", ["system-design-interview-questions", "fan-out", "?typeahead-autocomplete", "?video-streaming-adaptive-bitrate"], ["chat-system", "news-feed", "ticket-booking"]),
    ],
  },
  backend: {
    page: "backend-system-design-roadmap",
    title: "Backend (SDE)",
    stages: [
      stage("Interview foundations", "The two kinds of design round and how each is scored.", ["system-design-interview", "hld-vs-lld", "back-of-the-envelope-estimation"]),
      stage("Low-level design", "Clean code inside one service: the LLD round.", ["solid-principles", "design-patterns"]),
      stage("APIs", "Contracts that clients can rely on and evolve with.", ["api-design", "api-styles", "pagination", "idempotency", "?webhooks", "?real-time-communication"], ["url-shortener"]),
      stage("Databases", "Modelling data and keeping it correct under concurrency.", ["sql-vs-nosql", "database-indexing", "transactions-isolation-levels", "optimistic-vs-pessimistic-locking", "connection-pooling", "?normalization-denormalization"], ["ticket-booking"]),
      stage("Scaling reads and writes", "Replicas, shards and caches.", ["replication", "sharding", "caching", "cache-strategies", "redis", "?cache-invalidation"], ["distributed-cache"]),
      stage("Async processing", "Queues, events and the patterns that keep them safe.", ["message-queues", "event-streaming-kafka", "delivery-semantics", "outbox-pattern", "?saga-pattern"], ["notification-service"]),
      stage("Real-world building blocks", "The mechanisms behind the classic questions.", ["typeahead-autocomplete", "resumable-file-uploads", "distributed-task-scheduler", "payment-system-ledger", "video-streaming-adaptive-bitrate", "?geospatial-indexing"], ["autocomplete", "file-storage", "task-scheduler"]),
      stage("Production readiness", "Protecting and operating what you built.", ["rate-limiting", "retries-and-timeouts", "observability", "authentication-authorization", "?circuit-breaker"], ["rate-limiter", "payment-platform"]),
    ],
  },
  "data-engineering": {
    page: "data-engineering-roadmap",
    title: "Data engineering",
    stages: [
      stage("The shape of a data platform", "Sources, layers, consumers and who owns what.", ["data-engineering-architecture", "etl-vs-elt", "data-warehouse-vs-data-lake", "medallion-architecture"]),
      stage("Storage and SQL foundations", "How analytical data is stored and queried.", ["sql-vs-nosql", "database-indexing", "columnar-file-formats", "?object-storage", "?normalization-denormalization"]),
      stage("Data modeling", "Designing tables analysts can trust.", ["dimensional-modeling", "slowly-changing-dimensions"], ["scd2-warehouse"]),
      stage("Batch processing", "Large, repeatable transformations.", ["batch-vs-stream-processing", "apache-spark-architecture", "open-table-formats", "?sharding"], ["etl-framework"]),
      stage("Ingestion and streaming", "Moving changes and events as they happen.", ["event-streaming-kafka", "outbox-pattern", "stream-processing-windows-watermarks", "delivery-semantics", "?backpressure"], ["clickstream", "realtime-analytics"]),
      stage("Orchestration and reliability", "Pipelines that recover and backfill safely.", ["data-pipeline-orchestration", "idempotency", "data-contracts-schema-evolution"], ["data-alerting"]),
      stage("Quality and governance", "Proving the data is right and keeping it safe.", ["data-quality", "?encryption", "?authentication-authorization"], ["data-quality", "fraud-data-platform"]),
    ],
  },
  "machine-learning": {
    page: "machine-learning-system-design-roadmap",
    title: "Machine learning systems",
    stages: [
      stage("The end-to-end ML system", "How data, training, serving and feedback connect.", ["machine-learning-system-architecture", "?data-engineering-architecture", "?batch-vs-stream-processing"]),
      stage("Data and features", "Consistent features for training and serving.", ["feature-store", "data-quality", "?stream-processing-windows-watermarks"], ["feature-store"]),
      stage("Training at scale", "Turning data into models reproducibly.", ["distributed-training", "mlops-model-registry"], ["training-platform"]),
      stage("Serving predictions", "Meeting latency and cost budgets in production.", ["model-serving", "?caching", "?autoscaling"], ["model-serving"]),
      stage("Ranking and recommendations", "The most common ML design question.", ["recommendation-system-design", "vector-databases", "?search-and-inverted-index"], ["recommendation-engine"]),
      stage("Measuring and monitoring", "Knowing whether a model actually helps.", ["ml-evaluation-metrics", "ab-testing-experimentation", "ml-model-monitoring"], ["model-monitoring", "online-fraud-model"]),
      stage("LLM and AI applications", "Building products on foundation models.", ["ai-application-architecture", "retrieval-augmented-generation", "llm-inference-serving"], ["rag-search"]),
    ],
  },
  platform: {
    page: "platform-engineering-roadmap",
    title: "Platform engineering and SRE",
    stages: [
      stage("Reliability vocabulary", "How reliability is defined, measured and budgeted.", ["availability", "latency-vs-throughput", "back-of-the-envelope-estimation"]),
      stage("Compute and orchestration", "Packaging and scheduling workloads.", ["containers-vs-virtual-machines", "kubernetes-architecture", "autoscaling", "?serverless"]),
      stage("Infrastructure and delivery", "Changing production safely and repeatably.", ["infrastructure-as-code", "ci-cd-pipelines", "deployment-strategies", "feature-flags"], ["deployment-platform", "config-control-plane"]),
      stage("Networking and service-to-service", "How services find and talk to each other.", ["load-balancing", "service-discovery", "dns", "?service-mesh", "?api-gateway"], ["service-discovery"]),
      stage("Observability", "Seeing what the system is doing.", ["observability", "?time-series-databases"], ["metrics-platform"]),
      stage("Resilience", "Surviving failures and overload.", ["health-checks-failover", "retries-and-timeouts", "circuit-breaker", "load-shedding", "disaster-recovery", "chaos-engineering"], ["multi-region"]),
      stage("Operating at scale", "People, process and shared platforms.", ["incident-management", "capacity-planning", "multi-tenancy", "secrets-management", "internal-developer-platform"], ["secrets-platform", "service-platform"]),
    ],
  },
  "distributed-systems": {
    page: "distributed-systems-roadmap",
    title: "Distributed systems",
    stages: [
      stage("Why it's hard", "Partial failure and the limits of agreement.", ["fallacies-of-distributed-computing", "two-generals-and-flp", "cap-theorem"]),
      stage("Replication", "Keeping copies of data on many machines.", ["replication", "write-ahead-log", "quorums", "consistency-models"]),
      stage("Partitioning", "Splitting data so it can grow.", ["sharding", "consistent-hashing", "hot-partitions"], ["key-value-store"]),
      stage("Time and order", "Ordering events without a shared clock.", ["clocks-and-ordering", "unique-id-generation"], ["unique-id-generator"]),
      stage("Agreement", "Consensus, leaders and locks.", ["consensus", "leader-election", "distributed-locks"], ["leader-election", "distributed-lock-service"]),
      stage("Membership and repair", "Detecting failures and converging replicas.", ["gossip-protocol", "merkle-trees", "probabilistic-data-structures"]),
      stage("Transactions across machines", "Atomicity when one database isn't enough.", ["two-phase-commit", "saga-pattern", "transactions-isolation-levels"]),
      stage("Putting it together", "How real systems combine these ideas.", ["dynamo-style-key-value-store", "distributed-sql", "geo-replication", "crdts", "?event-streaming-kafka"], ["distributed-message-queue", "geo-replicated-database"]),
    ],
  },
  frontend: {
    page: "frontend-system-design-roadmap",
    title: "Frontend and mobile",
    stages: [
      stage("The frontend interview", "What a client-side design round expects.", ["frontend-system-design-interview", "?system-design-interview"]),
      stage("How the web delivers pages", "From a URL to pixels on screen.", ["http", "cdn", "dns", "rendering-strategies"]),
      stage("Performance", "Fast first load and smooth interaction.", ["core-web-vitals", "image-optimization", "list-virtualization", "browser-caching"], ["image-feed-client"]),
      stage("Data and state", "Fetching, caching and updating data on the client.", ["frontend-state-management", "api-design", "pagination", "real-time-communication"]),
      stage("Offline and sync", "Apps that keep working without a network.", ["offline-first-sync", "crdts", "?idempotency"], ["offline-first-sync", "collaborative-whiteboard"]),
      stage("Security", "Protecting users in the browser.", ["frontend-security", "authentication-authorization"]),
      stage("Shipping to users", "Releasing safely to millions of devices.", ["mobile-release-engineering", "feature-flags", "push-notifications", "micro-frontends"], ["mobile-release-flags", "micro-frontend-platform"]),
    ],
  },
};

export const roadmapById = (id) => ROADMAPS[id] ?? null;

// The roadmaps a topic appears on, with the stage it sits in, for "on the roadmap" links.
export function roadmapsFor(slug) {
  return Object.values(ROADMAPS).flatMap((roadmap) => {
    const index = roadmap.stages.findIndex((entry) => entry.topics.some((topic) => topic.slug === slug));
    return index === -1 ? [] : [{ page: roadmap.page, title: roadmap.title, stage: index + 1, stageTitle: roadmap.stages[index].title }];
  });
}
export const roadmapSlugs = (roadmap) => roadmap.stages.flatMap((entry) => entry.topics.map((topic) => topic.slug));
