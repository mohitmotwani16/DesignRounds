// Real-time analytics architectures: stream-to-cache, time-series database, and hybrid
// hot + cold paths; how to choose and grow between them; late data, consistency, cardinality.
export default {
  blocks: [
    { type: "p", text: "Stream processors, [materialized views](/learn/materialized-views) and [time-series storage](/learn/time-series-databases) are the parts. How do they fit into a working analytics system? An operational dashboard needs different infrastructure from a BI platform for ad-hoc questions. Three architectures cover most needs: **stream to cache**, **time-series database**, and **hybrid hot + cold**." },

    { type: "h2", text: "Pattern 1: stream to cache" },
    { type: "diagram", kind: "flow", caption: "Stream to cache: Kafka → stream processor → Redis (with TTLs) → dashboard. Each part does only what it's best at.", nodes: [
      { id: "svc", label: "Services", col: 0, row: 0 },
      { id: "k", label: "Kafka", col: 1.2, row: 0, shape: "queue", tone: "queue" },
      { id: "sp", label: "Stream processor", sub: "(service, minute) → count", col: 2.5, row: 0, tone: "accent", w: 200 },
      { id: "r", label: "Redis", sub: "TTL-expired aggregates", col: 3.9, row: 0, shape: "db", tone: "cache" },
      { id: "d", label: "Dashboard", col: 5.1, row: 0, shape: "pill" },
    ], edges: [{ from: "svc", to: "k" }, { from: "k", to: "sp" }, { from: "sp", to: "r" }, { from: "d", to: "r", label: "read" }] },
    { type: "ol", items: [
      "Events are published to a broker such as Kafka.",
      "A stream processor aggregates by window and dimension.",
      "Results go to Redis with TTL-based expiry.",
      "The dashboard reads Redis on each refresh.",
    ] },
    { type: "p", text: "Example: an ops dashboard of request counts and error rates per minute per service. The processor computes (service, minute) → count, Redis serves it, and queries return in single-digit milliseconds. **Limits**: Redis is memory-bound, so everything must fit in RAM; high-cardinality dimensions (per-user metrics) exhaust it; and you can only answer what you pre-computed (\"p95 latency by region and device?\" has no answer without reprocessing). **Best for** low-cardinality operational dashboards, simple aggregations and minimal infrastructure." },

    { type: "h2", text: "Pattern 2: time-series database" },
    { type: "diagram", kind: "flow", caption: "Time-series database: aggregates are written to InfluxDB or TimescaleDB, which compress, roll up and expire them and answer time-range queries natively.", nodes: [
      { id: "k", label: "Kafka", col: 0, row: 0, shape: "queue", tone: "queue" },
      { id: "sp", label: "Stream processor", col: 1.3, row: 0, tone: "accent" },
      { id: "ts", label: "Time-series DB", sub: "InfluxDB · TimescaleDB · Prometheus", col: 2.8, row: 0, shape: "db", tone: "store", w: 240 },
      { id: "g", label: "Grafana / dashboards", col: 4.4, row: 0, shape: "pill", w: 180 },
    ], edges: [{ from: "k", to: "sp" }, { from: "sp", to: "ts" }, { from: "g", to: "ts", label: "time-range queries" }] },
    { type: "p", text: "Time-series databases are built for exactly this: they compress timestamped data very well (often roughly 10–20× better than general-purpose databases for this workload, depending on the data), make \"CPU for the last hour\" a native query, and include rollup and retention policies. Because data lives on disk they hold far more dimensions than Redis. **Limits**: less flexible than general SQL (complex joins and ad-hoc exploration are harder) and one more system to operate, back up and capacity-plan. **Best for** infrastructure monitoring, application metrics and IoT sensor data, where queries follow time ranges and a fixed set of dimensions." },

    { type: "h2", text: "Pattern 3: hybrid (hot + cold)" },
    { type: "diagram", kind: "flow", caption: "Hybrid: the hot path keeps pre-computed aggregates in Redis for live dashboards; the cold path keeps raw data in a warehouse for any question.", nodes: [
      { id: "k", label: "Kafka", col: 0, row: 0.6, shape: "queue", tone: "queue" },
      { id: "sp", label: "Stream processor", col: 1.4, row: 0.6, tone: "accent" },
      { id: "r", label: "Redis (hot)", sub: "aggregates, ms reads", col: 2.9, row: 0, shape: "db", tone: "cache" },
      { id: "w", label: "Warehouse (cold)", sub: "raw data, full SQL", col: 2.9, row: 1.2, shape: "db", tone: "store" },
      { id: "sre", label: "SRE dashboards", col: 4.4, row: 0, shape: "pill" },
      { id: "an", label: "Analysts", sub: "funnels, cohorts", col: 4.4, row: 1.2, shape: "pill" },
    ], edges: [{ from: "k", to: "sp" }, { from: "sp", to: "r", label: "hot path" }, { from: "sp", to: "w", label: "cold path" }, { from: "sre", to: "r" }, { from: "an", to: "w" }] },
    { type: "p", text: "The hot path optimizes for latency (pre-computed aggregates in memory, millisecond reads); the cold path for flexibility (raw data, full SQL, any question given enough query time). **Trade-offs**: two systems to run, and the paths may briefly disagree (data reaches Redis before the warehouse, or the reverse). That eventual consistency is usually fine for analytics, but show \"as of\" timestamps and reconcile periodically to catch drift. **Best for** organizations needing both operational monitoring and business analytics (conversion funnels, cohort analysis). See [OLTP vs OLAP](/learn/oltp-vs-olap)." },

    { type: "h2", text: "Choosing and evolving" },
    { type: "table", head: ["Requirement", "Architecture"], rows: [
      ["Simple dashboards, few dimensions", "Stream to cache"],
      ["Metrics-heavy, many dimensions, predictable queries", "Time-series database"],
      ["Both real-time dashboards and ad-hoc analysis", "Hybrid hot + cold"],
    ] },
    { type: "p", text: "Start simple. A common path: stream-to-cache for operational metrics; when analysts want history, add a cold path into a warehouse while the hot path keeps serving dashboards, and you've grown into the hybrid pattern naturally." },
    { type: "ul", items: [
      "**Late data**: don't block results waiting for stragglers; show \"as of\" times. \"Roughly 500 errors per minute\" is already actionable. See [watermarks](/learn/stream-processing-windows-watermarks).",
      "**Hot–cold consistency**: the hot path may say 1,234 requests for 10:00–10:05 and the warehouse 1,241 once late data lands. Usually fine; exact consistency needs a single path, meaning slower hot results or a less flexible cold side.",
      "**Cardinality**: keep hot-path dimensions few. Per-user metrics for millions of users belong in the warehouse, where storage is cheap and query time acceptable.",
    ] },
    { type: "p", text: "These pieces compose. A production system might stream database changes with [CDC](/learn/change-data-capture), process them in Flink, serve live dashboards from Redis and keep history in a warehouse, choosing each part by latency, flexibility and operational cost." },
  ],
  uses: [
    { name: "SRE dashboards", text: "Request and error rates per service per minute from a stream job into Redis or Prometheus." },
    { name: "Product analytics", text: "Live counters in a hot store, funnels and cohorts in BigQuery or Snowflake." },
    { name: "IoT monitoring", text: "Sensor readings into a TSDB with rollups and alert rules." },
    { name: "Ad and marketplace platforms", text: "Real-time spend and click counters plus warehouse reconciliation for billing." },
  ],
  interview: [
    "Pick the simplest architecture that meets latency and flexibility needs, and say how it would evolve.",
    "Describe the pipeline: events → broker → stream processor → serving store → dashboard.",
    "Mention cardinality limits, late data and hot/cold disagreement, with \"as of\" timestamps and reconciliation.",
  ],
  related: ["design-food-delivery-analytics", "materialized-views", "time-series-databases", "stream-processing", "oltp-vs-olap", "change-data-capture", "lambda-vs-kappa-architecture"],
  practice: ["realtime-analytics", "metrics-platform", "clickstream"],
};
