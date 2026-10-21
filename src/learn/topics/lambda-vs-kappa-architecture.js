// Lambda architecture (batch + speed + serving layers) vs Kappa architecture (one stream
// pipeline, reprocess by replaying the log), with worked examples and how to choose.
export default {
  blocks: [
    { type: "p", text: "Batch processing is complete but slow; stream processing is fast but struggles with late data and corrections. Some systems need both at once. An e-commerce finance team needs daily sales accurate to the penny (they reconcile against payment processors), while operations needs orders per minute live, to spot outages now. All-batch makes the dashboard useless for incidents; all-stream risks missing late events in financial reports. **Lambda** and **Kappa** are the two classic architectures for getting both." },

    { type: "h2", text: "Lambda architecture: three layers" },
    { type: "p", text: "Popularized by Nathan Marz, Lambda runs batch and stream **in parallel** and merges their results:" },
    { type: "ul", items: [
      "**Batch layer**: keeps the complete, immutable master dataset (HDFS or S3) and periodically **recomputes views from scratch**, e.g. a nightly job over all history. Slow (hours) but complete and accurate; late events and corrections are picked up on the next run.",
      "**Speed (real-time) layer**: stream processing that computes **incremental updates since the last batch run**. Fast (seconds to minutes) but only covers events that have already arrived.",
      "**Serving layer**: answers queries by **merging** the batch view with the speed layer's delta. When a new batch finishes, its results replace the speed layer's estimates and the speed layer resets.",
    ] },
    { type: "diagram", kind: "flow", caption: "Lambda architecture: the same events feed a slow, complete batch layer and a fast speed layer; the serving layer adds the batch view and the real-time delta.", nodes: [
      { id: "src", label: "Order events", col: 0, row: 1, shape: "queue", tone: "queue" },
      { id: "s3", label: "Master dataset", sub: "immutable, in S3/HDFS", col: 1.4, row: 0, shape: "db", tone: "store" },
      { id: "batch", label: "Batch layer", sub: "Spark, nightly at 2 AM", col: 2.8, row: 0, tone: "accent" },
      { id: "speed", label: "Speed layer", sub: "Flink, since 2 AM", col: 2, row: 2, tone: "ok" },
      { id: "bv", label: "Batch view", sub: "Electronics $45.2M", col: 4.2, row: 0, shape: "db", tone: "store" },
      { id: "rv", label: "Real-time view", sub: "Redis: +$180K", col: 3.4, row: 2, shape: "db", tone: "cache" },
      { id: "serve", label: "Serving layer", sub: "batch + delta = $45.38M", col: 5.2, row: 1, tone: "accent" },
    ], edges: [{ from: "src", to: "s3" }, { from: "src", to: "speed" }, { from: "s3", to: "batch" }, { from: "batch", to: "bv" }, { from: "speed", to: "rv" }, { from: "bv", to: "serve" }, { from: "rv", to: "serve" }] },
    { type: "h3", text: "Worked example: sales by category" },
    { type: "ol", items: [
      "**Batch (2 AM daily)**: a Spark job reads a year of order events from S3, aggregates by category (Electronics $45.2M, Clothing $28.1M, …) and writes a batch view stamped `2024-01-15 02:00:00`.",
      "**Stream (continuous)**: a Flink job consumes the Kafka orders topic and keeps running totals since 2 AM in Redis (Electronics $180K, Clothing $95K), counting only events that have arrived.",
      "**Query (any time)**: \"Electronics sales?\" → batch $45.2M + speed $180K = **$45.38M**.",
      "**Next 2 AM**: the batch recomputes Electronics as $45.4M including all of yesterday, the batch view updates, the speed layer's counters reset to zero, and queries now combine $45.4M with new deltas.",
    ] },
    { type: "h3", text: "The maintenance problem" },
    { type: "ul", items: [
      "**Duplicate logic**: every business rule exists twice (say Spark SQL and Flink Java). Edge cases diverge, and users see different numbers depending on when they query relative to the batch run.",
      "**Dual infrastructure**: two clusters, two technologies, two sets of deployments, monitoring and failure modes. A batch bug means fix and rerun; a speed-layer bug means fix, redeploy and maybe reconcile history.",
      "**Synchronization**: the serving layer must track which batch run is current, which speed data belongs with it, and the handoff when a new batch lands. That logic is error-prone.",
    ] },
    { type: "p", text: "Lambda still makes sense when **compliance requires matching existing batch systems** (the real-time layer is treated as an approximation that batch periodically corrects), when **mature batch infrastructure** already exists and you're adding streaming incrementally, or when some computations genuinely need **full history** and can't be made incremental (such as ML model training)." },

    { type: "h2", text: "Kappa architecture: stream only" },
    { type: "p", text: "Jay Kreps (a co-creator of Kafka) proposed the simplification: **if you have a replayable event log, batch processing is just stream processing replayed from the beginning**. The log (Kafka or similar) is the system of record, retaining events for days, weeks or longer; one streaming application consumes it and writes to serving stores. There is no batch layer: reprocessing means **replaying the log through the same code**." },
    { type: "diagram", kind: "flow", caption: "Kappa architecture: one streaming code path. To reprocess, run v2 of the job from offset 0 into a new table, then switch reads once it catches up.", nodes: [
      { id: "log", label: "Event log (Kafka)", sub: "long retention", col: 0, row: 0.6, shape: "queue", tone: "queue" },
      { id: "v1", label: "stream-processor v1", sub: "live, current offset", col: 1.6, row: 0, tone: "muted" },
      { id: "v2", label: "stream-processor v2", sub: "fixed logic, from offset 0", col: 1.6, row: 1.2, tone: "ok" },
      { id: "t1", label: "orders_by_region", sub: "old table", col: 3.2, row: 0, shape: "db", tone: "muted" },
      { id: "t2", label: "orders_by_region_v2", sub: "rebuilt table", col: 3.2, row: 1.2, shape: "db", tone: "ok" },
      { id: "dash", label: "Dashboard", sub: "switch reads to v2", col: 4.6, row: 0.6, shape: "pill" },
    ], edges: [{ from: "log", to: "v1" }, { from: "log", to: "v2", label: "replay" }, { from: "v1", to: "t1" }, { from: "v2", to: "t2" }, { from: "t1", to: "dash", dashed: true }, { from: "t2", to: "dash" }] },
    { type: "h3", text: "Reprocessing through replay" },
    { type: "p", text: "A dashboard shows orders per hour by region, and you discover all \"CA\" orders were counted as California instead of Canada:" },
    { type: "ol", items: [
      "Fix the region mapping in the single stream processor.",
      "Deploy `stream-processor-v2` starting at offset 0, writing to a new table `orders_by_region_v2`.",
      "v2 replays the whole log with the corrected logic while v1 keeps serving live data.",
      "When v2's lag is near zero, point the dashboard at `orders_by_region_v2`.",
      "Decommission v1 and drop the old table.",
    ] },
    { type: "p", text: "Reprocessing follows exactly the same code path as live processing: one implementation, one test suite, one deployment pipeline, so batch and stream results can't drift apart." },
    { type: "h3", text: "Why modern infrastructure makes Kappa feasible" },
    { type: "ul", items: [
      "**Durable long-term storage**: Kafka keeps events on disk with configurable retention (and tiered storage), so a log with months of history is effectively an append-only database.",
      "**Independent consumption**: separate consumer groups read the same log independently; a replay from offset 0 doesn't disturb the live job.",
      "**Scalable replay**: consumers parallelize across partitions, so replay runs as fast as disk and compute allow.",
    ] },
    { type: "h3", text: "Where Kappa works and where it struggles" },
    { type: "ul", items: [
      "**Works well** when events are the source of truth, reprocessing time is acceptable, real-time and historical logic are identical, and log retention covers the history you need. See [event sourcing](/learn/event-sourcing-cqrs).",
      "**Struggles** when history predates the log (you can't replay what was never captured), when replaying petabytes would take days, when computations need true batch semantics (some ML training, huge historical joins), or when sinks can't handle replayed data cleanly.",
    ] },

    { type: "h2", text: "Lambda vs Kappa" },
    { type: "table", head: ["Factor", "Lambda", "Kappa"], rows: [
      ["Codebases", "Two (batch + stream)", "One"],
      ["Infrastructure", "Two clusters", "One"],
      ["Reprocessing", "Rerun the batch job", "Replay the event log"],
      ["Operational complexity", "Higher", "Lower"],
      ["Historical data", "Can process data outside the log", "Limited to log retention"],
      ["Best for", "Compliance-critical systems, existing batch investment", "Greenfield projects, event-sourced architectures"],
    ] },
    { type: "p", text: "For new projects on modern infrastructure, Kappa usually wins on simplicity. Enterprises with heavy batch investment, compliance tied to batch systems, or history that was never captured as events can use Lambda to add real-time without disrupting proven systems. Unified engines (Flink, Spark Structured Streaming, Beam) blur the line further by running one codebase over both bounded and unbounded data; see [stream processing frameworks](/learn/stream-processing-frameworks)." },
  ],
  uses: [
    { name: "Ad and revenue reporting", text: "Real-time estimates during the day, corrected by a nightly batch that finance reconciles against." },
    { name: "Event-sourced products", text: "Kappa-style pipelines rebuild read models by replaying Kafka topics after a bug fix." },
    { name: "Metrics dashboards", text: "A single Flink job feeds live charts; replay rebuilds history when the definition of a metric changes." },
    { name: "Legacy Hadoop shops", text: "Lambda adds a streaming layer beside existing batch jobs instead of replacing them." },
  ],
  interview: [
    "When a design needs both fresh and exact numbers, describe Lambda's batch + speed + serving layers, then name its cost: duplicated logic.",
    "Offer Kappa as the simpler alternative when the event log is the source of truth: reprocess by replaying into a new table, then switch.",
    "Mention log retention as Kappa's limit, and backfills from object storage for older history.",
    "Note that unified engines let one codebase serve both modes.",
  ],
  related: ["data-engineering-design-patterns", "batch-vs-stream-processing", "stream-processing", "stream-processing-frameworks", "event-streaming-kafka", "backfill-and-reprocessing", "event-sourcing-cqrs"],
  practice: ["realtime-analytics", "clickstream", "etl-framework"],
};
