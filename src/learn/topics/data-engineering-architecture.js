export default {
  blocks: [
    { type: "p", text: "A **data engineering platform** turns records from operational systems, files, and event streams into dependable datasets that analysts, products, and models can use. A useful design is not just a collection of pipelines: it defines how data is captured, replayed, validated, governed, and served, with a clear owner for each step." },

    { type: "h2", text: "A common end-to-end shape" },
    { type: "diagram", kind: "flow", caption: "Ingestion preserves source data, processing creates curated datasets, and separate serving systems meet analytics and application latency needs.", nodes: [
      { id: "src", label: "Operational sources", sub: "DBs · apps · files", col: 0, row: 1, shape: "pill" },
      { id: "ingest", label: "Ingestion", sub: "CDC · APIs · events", col: 1, row: 1, tone: "accent" },
      { id: "raw", label: "Raw data lake", sub: "immutable, replayable", col: 2, row: 1, shape: "db", tone: "store" },
      { id: "transform", label: "Transform + validate", sub: "batch / stream", col: 3.2, row: 1, tone: "accent" },
      { id: "warehouse", label: "Curated warehouse", sub: "trusted models", col: 4.5, row: 0, shape: "db", tone: "cache" },
      { id: "serving", label: "Serving stores", sub: "APIs · features", col: 4.5, row: 2, shape: "db", tone: "queue" },
      { id: "users", label: "Consumers", sub: "BI · products · ML", col: 5.8, row: 1, shape: "pill" },
    ], edges: [
      { from: "src", to: "ingest" }, { from: "ingest", to: "raw" }, { from: "raw", to: "transform" },
      { from: "transform", to: "warehouse" }, { from: "transform", to: "serving" },
      { from: "warehouse", to: "users" }, { from: "serving", to: "users" },
    ] },
    { type: "p", text: "Keep the **raw layer** close to what the source sent. It is the recovery point for reprocessing after a bug, a new business rule, or a changed schema. Curated tables should be easier to query, documented, and owned by a team. Separate storage formats and compute engines are fine; the boundaries and contracts matter more than a specific vendor." },

    { type: "h2", text: "Choose ingestion by source and freshness" },
    { type: "table", head: ["Source / need", "Common approach", "Design question"], rows: [
      ["Database changes", "Change data capture (CDC) into a durable log", "How are deletes, schema changes, and snapshot bootstraps represented?"],
      ["Application events", "Versioned events through a broker", "Who owns the event contract and handles duplicate delivery?"],
      ["Files and partner feeds", "Object storage landing zone plus scheduled discovery", "How are partial uploads, late files, and replays detected?"],
      ["Low-latency aggregates", "Stream processor with event-time windows", "What lateness is allowed, and how are corrected results exposed?"],
      ["Reporting and backfills", "Scheduled batch jobs over retained data", "Can the job rerun idempotently for a bounded date range?"],
    ] },
    { type: "p", text: "The freshness target should drive the architecture. If a report is used once a day, a scheduled batch is usually easier to operate than a permanent streaming job. If a risk decision must be made during checkout, a seconds-late batch is not enough. Many platforms combine both patterns; see [batch vs stream processing](/learn/batch-vs-stream-processing) and [event streaming](/learn/event-streaming-kafka)." },

    { type: "h2", text: "Make pipelines recoverable" },
    { type: "ul", items: [
      "**Idempotency**: write each logical partition or batch so a retry replaces or safely merges its output instead of double-counting it.",
      "**Checkpoints and offsets**: persist progress only after output is durable; on restart, expect to replay some input and make consumers tolerate duplicates.",
      "**Backfills**: keep raw data long enough to rebuild a derived table, and expose date-range or versioned reprocessing rather than ad-hoc scripts.",
      "**Schema evolution**: add compatible fields, version breaking changes, and reject or quarantine malformed records instead of silently dropping them.",
      "**Late and out-of-order events**: use event time, watermarks, and an explicit correction policy for streaming aggregates.",
      "**Orchestration**: model dependencies, retries, timeouts, and concurrency limits; alert on missed service-level objectives, not only failed processes.",
    ] },
    { type: "callout", tone: "tip", text: "A green job status does not prove that the data is useful. Track freshness, completeness, duplicates, schema changes, and business-level assertions alongside pipeline health." },

    { type: "h2", text: "Quality, governance and serving" },
    { type: "p", text: "Treat datasets as products with owners, descriptions, sensitivity labels, and supported consumers. Run checks at ingestion (shape and required fields), after transformations (uniqueness and referential integrity), and at the business boundary (for example, totals reconcile with the source). Keep lineage from source through each transformation so an incident can identify affected reports and features." },
    { type: "ul", items: [
      "A columnar lake format is a good fit for inexpensive retained history and large scans; a warehouse is tuned for governed analytical queries.",
      "A low-latency application API may need a separate serving table or key-value store; do not force user-facing traffic onto a warehouse.",
      "Partition by common filter dimensions such as date, but avoid tiny files and very high-cardinality partitions.",
      "Use least-privilege access, encryption, retention limits, and deletion propagation for personal or regulated data.",
      "Measure freshness, pipeline duration, failure rate, bytes scanned, and the cost per useful dataset or query.",
    ] },
    { type: "h2", text: "A practical interview sequence" },
    { type: "ol", items: [
      "Clarify users, source systems, volume, freshness, retention, and correctness requirements.",
      "Draw source ingestion into a durable raw layer before adding transformations.",
      "Choose batch, streaming, or both from the freshness requirement and explain late-data handling.",
      "Name the curated datasets and the serving path for each consumer.",
      "Close with replay, idempotency, data quality, access controls, and operational metrics.",
    ] },
  ],
  uses: [
    { name: "Analytics warehouse", text: "Ingest source changes, retain raw history, transform it into documented business models, and serve interactive reporting." },
    { name: "Product events", text: "Capture versioned user events once, then let independent stream and batch consumers build real-time metrics and historical analysis." },
    { name: "Machine learning", text: "Publish governed training datasets and features with lineage so a model can be traced back to the data and transformation versions that produced it." },
  ],
  interview: [
    "Ask for the freshness and correctness targets before choosing a streaming platform.",
    "Keep a replayable raw layer and explain how a backfill avoids duplicate output.",
    "Name the data quality checks, dataset owners, and freshness alerts.",
    "Separate analytical storage from latency-sensitive application serving.",
  ],
  related: ["batch-vs-stream-processing", "event-streaming-kafka", "object-storage", "database-indexing", "delivery-semantics"],
  practice: ["etl-framework", "realtime-analytics", "clickstream", "fraud-data-platform"],
};
