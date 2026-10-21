export default {
  blocks: [
    { type: "p", text: "**Batch processing** runs a job over a large, bounded set of data (yesterday's logs, all orders) and produces a result after the whole input is processed. **Stream processing** handles an unbounded flow of events continuously, updating results within seconds of each event. Batch favours throughput and simplicity; streaming favours freshness." },

    {"type":"h2","text":"Why analytics doesn't run on the production database"},
    {"type":"p","text":"A retailer wants yesterday's sales across every store: millions of rows. Run that on the production database and the query holds locks for minutes, burns CPU that checkout needs, fills the buffer pool with analytical pages (evicting hot transactional data) and competes with live orders; at scale it can slow or even crash the system serving customers. OLTP databases are tuned for quick indexed row lookups, while analytical queries ignore indexes and scan everything. The fix is to **copy the data to a separate system built for analysis**. See [OLTP vs OLAP](/learn/oltp-vs-olap)."},
    {"type":"diagram","kind":"flow","caption":"Separate the workloads: the production database keeps serving users while a copy of its data feeds batch and stream jobs that build derived data.","nodes":[{"id":"u","label":"Users","col":0,"row":0,"shape":"pill"},{"id":"db","label":"OLTP database","sub":"source of truth","col":1.3,"row":0,"shape":"db","tone":"store"},{"id":"copy","label":"Copy / stream of changes","col":1.3,"row":1.2,"shape":"queue","tone":"queue"},{"id":"b","label":"Batch jobs","sub":"nightly reports, ML training","col":2.9,"row":0.6,"tone":"accent"},{"id":"s","label":"Stream jobs","sub":"fraud alerts, live dashboards","col":2.9,"row":1.8,"tone":"ok"}],"edges":[{"from":"u","to":"db","label":"fast queries"},{"from":"db","to":"copy"},{"from":"copy","to":"b"},{"from":"copy","to":"s"}]},
    {"type":"h2","text":"Source of truth vs derived data"},
    {"type":"p","text":"The application database is the **source of truth**: the authoritative users, orders and inventory. Everything else is **derived data**, a transformed copy optimized for one purpose, and it's expendable: lose it and you rebuild it from the source. Examples: a search index built from product records, daily sales summaries, a recommendation model trained on behavior, a denormalized cache. Derived data is what lets you run expensive computations without touching production: copy, process elsewhere, rebuild whenever the source changes."},
    {"type":"p","text":"There are two ways to produce it. **Batch** processes accumulated data in scheduled chunks (hourly, nightly) with latency of minutes to hours. **Stream** processes each event as it arrives, with results in seconds, and never \"finishes\". Batch is doing laundry once a week; streaming is a magical washing machine that cleans each item the moment you drop it in."},
    {"type":"table","head":["Factor","Batch","Stream"],"rows":[["Latency tolerance","Hours to days","Seconds to minutes"],["Data completeness","Full historical data","Recent events only"],["Reprocessing","Easy: rerun the job","Complex: needs replay infrastructure"],["Debugging","Simpler: examine a frozen dataset","Harder: data keeps flowing"]]},
    {"type":"ul","items":["**Batch fits** when results needn't be immediate (daily reports, weekly summaries), when correctness needs the complete dataset (historical trends, ML training), and when easy debugging and reprocessing matter more than speed.","**Stream fits** when delay causes harm (fraud must be blocked during the transaction), when users expect live updates (dashboards, notifications), and when data arrives continuously and you want continuous output.","**Many systems use both**: a retailer streams transactions to catch fraud in real time and runs batch jobs for daily sales reports and recommendation training, from the same source data."]},
    {"type":"p","text":"The rest of this track goes deeper: [Unix pipelines and MapReduce](/learn/mapreduce), [distributed file systems](/learn/distributed-file-systems), [Spark](/learn/apache-spark-architecture), [stream processing](/learn/stream-processing), [windows and watermarks](/learn/stream-processing-windows-watermarks), [delivery semantics](/learn/delivery-semantics), [Lambda vs Kappa](/learn/lambda-vs-kappa-architecture), [ETL vs ELT](/learn/etl-vs-elt), [backfills](/learn/backfill-and-reprocessing), [pipeline error handling](/learn/pipeline-error-handling) and [real-time analytics](/learn/real-time-analytics-architecture)."},
    { type: "h2", text: "Batch processing" },
    { type: "ul", items: [
      "Input is a fixed dataset, typically files in a data lake or tables in a warehouse; jobs run on a schedule (hourly, nightly).",
      "**MapReduce** introduced the model: map each record to key-value pairs, shuffle by key, reduce each key's values. **Apache Spark** generalised it with in-memory processing and SQL; warehouses (BigQuery, Snowflake) run batch SQL at scale.",
      "**Strengths**: very high throughput, simple correctness (rerun the job to fix a bug), easy to reason about and test.",
      "**Weaknesses**: results are only as fresh as the last run: hours of latency.",
    ] },

    { type: "h2", text: "Stream processing" },
    { type: "ul", items: [
      "Input is an unbounded stream of events, usually from a log like Kafka or Kinesis. See [event streaming](/learn/event-streaming-kafka).",
      "Engines: **Apache Flink**, **Kafka Streams**, **Spark Structured Streaming**, Google Dataflow (Apache Beam).",
      "**Strengths**: results in seconds: fraud detection, live dashboards, alerting, real-time recommendations.",
      "**Weaknesses**: harder concepts (time, state, late data, exactly-once), long-running stateful jobs to operate.",
    ] },
    { type: "diagram", kind: "flow", caption: "One event log feeds both a streaming job (seconds-fresh results) and periodic batch jobs over the archived data (complete, recomputable results).", nodes: [
      { id: "src", label: "Apps and devices", col: 0, row: 1, shape: "pill" },
      { id: "log", label: "Event log", sub: "Kafka", col: 1, row: 1, shape: "queue", tone: "queue" },
      { id: "stream", label: "Stream processor", sub: "Flink: 1-min windows", col: 2.2, row: 0, tone: "accent", w: 160 },
      { id: "dash", label: "Live dashboard", col: 3.4, row: 0, shape: "db", tone: "cache" },
      { id: "lake", label: "Data lake", sub: "Parquet files", col: 2.2, row: 2, shape: "db", tone: "store", w: 160 },
      { id: "batch", label: "Nightly Spark job", col: 3.4, row: 2 },
    ], edges: [
      { from: "src", to: "log" }, { from: "log", to: "stream" }, { from: "stream", to: "dash" },
      { from: "log", to: "lake", label: "archive" }, { from: "lake", to: "batch" },
    ] },

    { type: "h2", text: "Core streaming concepts" },
    { type: "table", head: ["Concept", "Meaning"], rows: [
      ["**Event time vs processing time**", "When the event happened (on the device) vs when the processor sees it. Mobile events can arrive minutes or hours late; aggregations should use event time"],
      ["**Windows**", "Tumbling (fixed, non-overlapping: per minute), sliding (overlapping: last 5 minutes every minute), session (per user activity burst with gaps)"],
      ["**Watermarks**", "The processor's estimate that \"all events up to time T have probably arrived\", which triggers closing a window"],
      ["**Late data**", "Events behind the watermark: drop, send to a side output, or update the earlier result (allowed lateness)"],
      ["**State**", "Running counts, joins and models kept per key, checkpointed for fault tolerance"],
      ["**Exactly-once state**", "Checkpoint state and input offsets together so a restart neither double-counts nor loses events. See [delivery guarantees](/learn/delivery-semantics)"],
    ] },

    { type: "h2", text: "Lambda and Kappa architectures" },
    { type: "ul", items: [
      "**Lambda architecture**: run a batch layer (complete, accurate, slow) and a speed layer (streaming, approximate, fast) side by side, and merge their results at query time. Robust, but you maintain the same logic twice.",
      "**Kappa architecture**: streaming only. Keep the event log long enough to **reprocess** history by replaying it through a new version of the stream job. One codebase; relies on a durable, replayable log.",
    ] },
    { type: "callout", text: "Choose by freshness need. If the business decision happens daily, a nightly batch is simpler and cheaper. If a fraud check must happen before a payment completes, you need streaming (or a synchronous check)." },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Batch", "Stream"], rows: [
      ["Input", "Bounded dataset", "Unbounded events"],
      ["Latency", "Minutes to hours", "Milliseconds to seconds"],
      ["Throughput per cost", "Highest", "Lower"],
      ["Correction", "Rerun the job", "Replay the log or accept updates"],
      ["Typical uses", "Reporting, ML training, billing runs, backfills", "Fraud detection, monitoring, live metrics, real-time features"],
    ] },
  ],
  uses: [
    { name: "Uber and Lyft", text: "Stream trip and location events through Kafka and Flink for surge pricing and ETAs, while batch jobs build reports and train models." },
    { name: "Netflix", text: "Processes playback events in real time for quality monitoring and in batch for recommendations training." },
    { name: "Banks and payment companies", text: "Streaming fraud detection scores transactions within milliseconds using features computed over recent windows." },
    { name: "Data warehouses", text: "Nightly ETL and ELT batches load and transform data in Snowflake, BigQuery or Databricks for analytics." },
  ],
  interview: [
    "Pick batch or streaming from the freshness requirement and say why.",
    "For streaming aggregations, use event time with windows and watermarks, and say how late data is handled.",
    "Mention replaying a log (Kappa) or a batch layer for corrections and backfills.",
    "Keep raw events in a data lake so any result can be recomputed.",
  ],
  related: ["event-streaming-kafka", "delivery-semantics", "time-series-databases", "probabilistic-data-structures", "object-storage"],
  practice: ["realtime-analytics", "clickstream", "etl-framework", "fraud-data-platform"],
};
