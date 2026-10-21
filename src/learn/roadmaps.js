// Learning roadmaps: an ordered path through handbook topics.
//
// There is one core roadmap ("system-design") that every role starts with; it is also
// most of what a backend interview tests. Each role roadmap builds on it (basedOn) and
// lists what that role goes deeper on; core topics appear there at most as optional
// review, except in distributed systems, which deepens them. Frontend and
// mobile is a different interview, so its roadmap stands alone.
//
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
      stage("How interviews and estimates work", "Know what is being assessed and how to size a system before drawing it.", ["system-design-interview", "system-design-template", "back-of-the-envelope-estimation", "hld-vs-lld", "?problem-decomposition-framework", "?how-to-practice-system-design"]),
      stage("Core properties", "The vocabulary every trade-off is argued in.", ["non-functional-requirements", "scalability", "latency-vs-throughput", "availability", "?core-design-challenges", "?acid-vs-base"]),
      stage("Networking and APIs", "How a request travels from a client to your servers and back.", ["dns", "http", "api-design", "load-balancing", "api-gateway", "cdn", "?tcp-vs-udp", "?api-styles"], ["url-shortener"]),
      stage("Storing data", "Choosing a database and growing it past one machine.", ["sql-vs-nosql", "relational-databases", "nosql-database-types", "database-indexing", "scaling-databases", "replication", "sharding", "consistent-hashing", "?key-value-databases", "?document-databases", "?object-storage"], ["paste-service"]),
      stage("Caching", "Serving reads fast without serving wrong data.", ["caching", "cache-strategies", "cache-eviction", "cache-failure-modes", "?cache-invalidation", "?caching-in-interviews", "?redis"], ["distributed-cache"]),
      stage("Asynchronous work", "Decoupling producers from consumers and surviving retries.", ["message-queues", "pub-sub", "event-streaming-kafka", "delivery-semantics", "idempotency", "?dataflow-patterns"], ["notification-service", "comment-system"]),
      stage("Distributed systems essentials", "What changes when many machines must agree.", ["cap-theorem", "consistency-models", "unique-id-generation", "?consensus", "?distributed-locks"], ["unique-id-generator"]),
      stage("Reliability", "Keeping the system up when parts of it fail.", ["rate-limiting", "retries-and-timeouts", "circuit-breaker", "health-checks-failover", "?load-shedding", "?disaster-recovery"], ["rate-limiter"]),
      stage("Architecture and operations", "Shaping services and running them in production.", ["monolith-vs-microservices", "observability", "deployment-strategies", "authentication-authorization", "?service-discovery", "?autoscaling"]),
      stage("Practise full designs", "Put the pieces together under interview conditions.", ["system-design-interview-questions", "design-url-shortener", "design-pastebin", "design-twitter", "fan-out", "?social-media-comment-system", "?typeahead-autocomplete", "?design-webhook-service", "?design-tinder", "?video-streaming-adaptive-bitrate"], ["url-shortener", "chat-system", "news-feed", "ticket-booking"]),
    ],
  },
  backend: {
    page: "backend-system-design-roadmap",
    title: "Backend and full-stack",
    basedOn: "system-design",
    stages: [
      stage("Low-level design", "The LLD or machine-coding round: clean classes inside one service.", ["solid-principles", "design-patterns"]),
      stage("APIs in depth", "Contracts that clients can page through, retry and build on.", ["api-styles", "pagination", "webhooks", "?design-webhook-service", "?real-time-communication"], ["url-shortener", "webhook-service"]),
      stage("Databases in depth", "Keeping data correct when many requests touch it at once.", ["transactions-isolation-levels", "optimistic-vs-pessimistic-locking", "connection-pooling", "normalization-denormalization", "database-optimization", "?change-data-capture", "?search-and-inverted-index", "?lsm-trees-sstables"], ["ticket-booking"]),
      stage("Reliable async work", "Making events and multi-step workflows safe to retry.", ["database-per-service", "outbox-pattern", "saga-pattern", "?event-sourcing-cqrs"], ["notification-service"]),
      stage("Real-world building blocks", "The mechanisms behind the classic questions.", ["redis", "precomputation-pattern", "two-stage-processing", "typeahead-autocomplete", "resumable-file-uploads", "distributed-task-scheduler", "payment-system-ledger", "?geospatial-indexing", "?design-tinder"], ["autocomplete", "file-storage", "task-scheduler", "payment-platform", "dating-app"]),
    ],
  },
  "data-engineering": {
    page: "data-engineering-roadmap",
    title: "Data engineering",
    basedOn: "system-design",
    stages: [
      stage("The data engineering design round", "How the round differs from backend design, and the six steps every answer follows.", ["data-engineering-system-design-interview", "?back-of-the-envelope-estimation", "?non-functional-requirements"]),
      stage("The shape of a data platform", "Sources, layers, consumers and where analytics data lives.", ["data-engineering-architecture", "oltp-vs-olap", "etl-vs-elt", "data-warehouse-vs-data-lake", "lakehouse-architecture", "medallion-architecture"]),
      stage("Batch processing", "Large, repeatable transformations on a schedule.", ["batch-vs-stream-processing", "apache-spark-architecture", "data-pipeline-orchestration", "?mapreduce", "?distributed-file-systems"], ["etl-framework"]),
      stage("Streaming and ingestion", "Moving events and database changes as they happen.", ["stream-processing", "event-streaming-kafka", "stream-processing-windows-watermarks", "delivery-semantics", "change-data-capture", "?stream-processing-frameworks", "?backpressure", "?outbox-pattern"], ["clickstream"]),
      stage("Architecture patterns", "The recurring designs and when to combine them.", ["data-engineering-design-patterns", "lambda-vs-kappa-architecture", "?data-mesh", "?event-sourcing-cqrs", "?serverless"]),
      stage("Data modeling", "Designing tables analysts can trust, and defending the choices.", ["dimensional-modeling", "slowly-changing-dimensions", "?normalization-denormalization"], ["scd2-warehouse"]),
      stage("Storage and file formats", "Where data lives, in which format, laid out so queries stay cheap.", ["columnar-file-formats", "open-table-formats", "data-layout-optimization", "?object-storage", "?sql-vs-nosql", "?hot-partitions"]),
      stage("Data quality and observability", "Proving the output is right and noticing when it isn't.", ["data-quality", "data-contracts-schema-evolution", "?observability"], ["data-quality", "data-alerting"]),
      stage("Reliability, backfills and DataOps", "Pipelines that rerun safely, recover from failure and absorb change.", ["idempotency", "backfill-and-reprocessing", "pipeline-error-handling", "?encryption", "?authentication-authorization"], ["fraud-data-platform"]),
      stage("Serving analytics", "Answering dashboards in milliseconds without scanning raw events.", ["materialized-views", "real-time-analytics-architecture", "?time-series-databases", "?precomputation-pattern"], ["realtime-analytics"]),
      stage("Practise end to end", "Put every step together under interview conditions.", ["design-food-delivery-analytics"], ["food-delivery-analytics"]),
    ],
  },
  "machine-learning": {
    page: "machine-learning-system-design-roadmap",
    title: "Machine learning systems",
    basedOn: "system-design",
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
    basedOn: "system-design",
    stages: [
      stage("SLOs and capacity", "How reliability is promised, budgeted and paid for.", ["capacity-planning", "?availability"]),
      stage("Compute and orchestration", "Packaging and scheduling workloads.", ["containers-vs-virtual-machines", "kubernetes-architecture", "?autoscaling", "?serverless"]),
      stage("Infrastructure and delivery", "Changing production safely and repeatably.", ["infrastructure-as-code", "ci-cd-pipelines", "feature-flags", "?deployment-strategies"], ["deployment-platform", "config-control-plane"]),
      stage("Service-to-service networking", "How services find, trust and talk to each other.", ["service-discovery", "service-mesh", "?load-balancing"], ["service-discovery"]),
      stage("Observability at scale", "Storing and querying the signals a fleet produces.", ["time-series-databases", "?observability"], ["metrics-platform"]),
      stage("Resilience", "Surviving failures and overload, and proving it.", ["load-shedding", "disaster-recovery", "chaos-engineering", "?health-checks-failover", "?circuit-breaker"], ["multi-region"]),
      stage("Operating at scale", "People, process and shared platforms.", ["incident-management", "multi-tenancy", "secrets-management", "internal-developer-platform"], ["secrets-platform", "service-platform"]),
    ],
  },
  "distributed-systems": {
    page: "distributed-systems-roadmap",
    title: "Distributed systems",
    basedOn: "system-design",
    stages: [
      stage("Why it's hard", "Partial failure and the limits of agreement.", ["fallacies-of-distributed-computing", "two-generals-and-flp", "cap-theorem"]),
      stage("Replication", "Keeping copies of data on many machines.", ["replication", "write-ahead-log", "quorums", "consistency-models", "?lsm-trees-sstables"]),
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
