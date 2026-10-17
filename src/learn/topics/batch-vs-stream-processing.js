export default {
  blocks: [
    { type: "p", text: "**Batch processing** runs a job over a large, bounded set of data (yesterday's logs, all orders) and produces a result after the whole input is processed. **Stream processing** handles an unbounded flow of events continuously, updating results within seconds of each event. Batch favours throughput and simplicity; streaming favours freshness." },

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
