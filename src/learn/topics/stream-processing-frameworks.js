// Stream processing frameworks: what Flink and Kafka Streams provide, their deployment models,
// unified batch/stream processing in Flink, Spark Structured Streaming and Beam, and choosing.
export default {
  blocks: [
    { type: "p", text: "You can build windowing, event time and delivery guarantees on raw Kafka consumers, but then you also write your own state management, consumer rebalancing and exactly-once coordination. **Stream processing frameworks** do that hard part so you write business logic. The common choices are **Apache Flink**, **Kafka Streams**, **Spark Structured Streaming** and **Apache Beam**." },

    { type: "h2", text: "What a framework gives you" },
    { type: "ul", items: [
      "**Managed state**: per-key state (running counts, window contents) tracked for you and redistributed when workers scale up or down.",
      "**Fault tolerance**: automatic checkpoints and recovery, so a failed worker resumes from the last checkpoint. No loss and exactly-once also need **replayable sources** (to re-read events after the checkpoint) and **transactional or idempotent sinks** (so reprocessed output isn't written twice).",
      "**Windowing and event time**: tumbling, sliding and session windows with watermarks for late events. See [windows and watermarks](/learn/stream-processing-windows-watermarks).",
      "**Exactly-once semantics**: coordinated commits so events aren't lost or double-counted. See [delivery semantics](/learn/delivery-semantics).",
    ] },

    { type: "h2", text: "Flink vs Kafka Streams: how you run them" },
    { type: "diagram", kind: "flow", caption: "Apache Flink is a separate cluster: you submit jobs to a JobManager, which schedules them on TaskManagers that read many kinds of sources.", nodes: [
      { id: "src", label: "Sources", sub: "Kafka · CDC · files", col: 0, row: 1.2, shape: "queue", tone: "queue" },
      { id: "jm", label: "JobManager", sub: "schedules, checkpoints", col: 1.6, row: 0, tone: "accent" },
      { id: "t1", label: "TaskManager 1", col: 1.6, row: 1.2 },
      { id: "t2", label: "TaskManager 2", col: 2.8, row: 1.2 },
      { id: "sink", label: "Sinks", sub: "Kafka · DB · lake", col: 4, row: 1.2, tone: "ok" },
      { id: "dev", label: "Your job (JAR / SQL)", col: 0, row: 0, shape: "pill" },
    ], edges: [{ from: "dev", to: "jm", label: "submit" }, { from: "jm", to: "t1", dashed: true }, { from: "jm", to: "t2", dashed: true }, { from: "src", to: "t1" }, { from: "t2", to: "sink" }] },
    { type: "diagram", kind: "flow", caption: "Kafka Streams is a library inside your service: your app instances are the processing cluster, and Kafka assigns them partitions.", nodes: [
      { id: "in", label: "Kafka input topic", sub: "partitions 0–5", col: 0, row: 0.6, shape: "queue", tone: "queue" },
      { id: "a1", label: "Your app instance 1", sub: "Streams library · partitions 0–2", col: 1.7, row: 0, tone: "accent", w: 220 },
      { id: "a2", label: "Your app instance 2", sub: "Streams library · partitions 3–5", col: 1.7, row: 1.2, tone: "accent", w: 220 },
      { id: "out", label: "Kafka output topic", col: 3.4, row: 0.6, shape: "queue", tone: "queue" },
    ], edges: [{ from: "in", to: "a1" }, { from: "in", to: "a2" }, { from: "a1", to: "out" }, { from: "a2", to: "out" }] },
    { type: "table", head: ["", "Apache Flink", "Kafka Streams"], rows: [
      ["Deployment", "A distributed cluster (JobManager + TaskManagers) you operate", "A library embedded in your application; scale by running more instances"],
      ["Sources and sinks", "Kafka, databases via CDC, files and more", "Kafka-centric: inputs and outputs are Kafka topics"],
      ["Choose when", "Non-Kafka sources, very low (sub-second) latency, you already run distributed infrastructure", "Kafka is your backbone, you don't want another cluster, operational simplicity matters most"],
      ["Trade-off", "Operational overhead of a separate cluster", "Less connector flexibility"],
    ] },
    { type: "p", text: "In interviews, the point is why these frameworks exist: they take care of stateful, fault-tolerant, exactly-once processing so you focus on the logic." },

    { type: "h2", text: "Unified batch and stream processing" },
    { type: "p", text: "Lambda runs batch and stream separately, and Kappa uses streaming for everything. Modern frameworks instead treat them as **the same computation over different data shapes**: batch is **bounded** data, streaming is **unbounded**, but filter, map, aggregate and join are the same. Write the pipeline once; point it at historical files for a backfill or at a live stream for real-time results. The engine optimizes bounded input for throughput and complete results, and unbounded input for latency and late data. See [Lambda vs Kappa](/learn/lambda-vs-kappa-architecture)." },
    { type: "h3", text: "Apache Flink: stream-first" },
    { type: "p", text: "Flink treats batch as a bounded stream, with the same DataStream and Table APIs for both. In **streaming mode** it processes events as they arrive with continuous state, watermarks and late-data handling; in **batch execution mode** it reads complete input and adds optimizations such as sort-based joins. Strengths: native event-time processing, exactly-once via distributed snapshots, robust state management, and true sub-second streaming rather than micro-batches. It excels at complex stateful applications: session analysis, complex event processing, real-time ML features." },
    { type: "h3", text: "Apache Spark: batch-first" },
    { type: "p", text: "Spark added streaming through **Structured Streaming**, with the same DataFrame API. Only the source changes:" },
    { type: "code", code: `from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("sales-by-category").getOrCreate()

def sales_by_category(df):                       # identical logic for batch and stream
    return df.groupBy("category").agg(F.sum("amount").alias("revenue"))

# Batch: a bounded dataset (e.g. a backfill)
batch_df = spark.read.parquet("s3a://data/orders/")
sales_by_category(batch_df).write.mode("overwrite").parquet("s3a://reports/sales/")

# Stream: unbounded events from Kafka
schema = "category STRING, amount DOUBLE, ts TIMESTAMP"
stream_df = (spark.readStream.format("kafka")
             .option("kafka.bootstrap.servers", "localhost:9092")
             .option("subscribe", "orders").load()
             .select(F.from_json(F.col("value").cast("string"), schema).alias("o"))
             .select("o.*"))
(sales_by_category(stream_df).writeStream
    .outputMode("complete").format("console").start())` },
    { type: "p", text: "Structured Streaming groups events into **micro-batches** (typically every few hundred milliseconds to seconds) and runs each with the batch engine. The trade-offs: latency is seconds rather than milliseconds, and event-time correctness needs explicit watermark configuration, but teams already on Spark add streaming with little new to learn. Good when you have Spark batch pipelines, need MLlib, or second-level latency is fine. See [Spark architecture](/learn/apache-spark-architecture)." },
    { type: "h3", text: "Apache Beam: a portability layer" },
    { type: "p", text: "Beam is a unified programming model that runs on several engines (Flink, Spark, Google Cloud Dataflow and others): write the pipeline once in the Beam SDK and run it on Dataflow in GCP, Flink on-premises or Spark on EMR. The appeal is avoiding lock-in and standardizing one API across environments; the cost is abstraction, since engine-specific features (Flink's state backends, Spark's ML integration) may not be fully exposed." },
    { type: "table", head: ["Framework", "Choose when"], rows: [
      ["**Flink**", "You need sub-second latency, complex event-time processing or sophisticated stateful operations"],
      ["**Spark Structured Streaming**", "You already have Spark batch pipelines, need ML integration, and second-level latency is fine"],
      ["**Kafka Streams**", "Kafka in, Kafka out, and you want stream processing inside ordinary services"],
      ["**Beam**", "Multi-cloud portability, or one API across diverse infrastructure"],
    ] },
    { type: "p", text: "Greenfield low-latency streaming usually points to Flink; heavy Spark shops get the gentlest path with Structured Streaming; multi-cloud enterprises value Beam. Unified processing means **one codebase**, **one test suite**, **easier backfills** (same code over historical data) and the same semantics for bounded or unbounded input: batch vs stream becomes an input setting, not an architecture decision." },
  ],
  uses: [
    { name: "Fraud and risk scoring", text: "Flink jobs with per-card state and event-time windows, checkpointed for exactly-once." },
    { name: "Microservice enrichment", text: "Kafka Streams inside services joins order events with customer tables and writes enriched topics." },
    { name: "Lakehouse ingestion", text: "Spark Structured Streaming writes Kafka data into Delta or Iceberg tables in micro-batches." },
    { name: "Google Cloud pipelines", text: "Beam pipelines on Dataflow, portable to Flink elsewhere." },
  ],
  interview: [
    "Name the framework and why: Flink for low-latency stateful event-time work, Kafka Streams when everything is Kafka, Spark when batch skills and second-level latency suffice.",
    "Mention checkpoints plus replayable sources and transactional or idempotent sinks for exactly-once.",
    "Point out that unified engines let the same code run backfills and live processing.",
  ],
  related: ["stream-processing", "stream-processing-windows-watermarks", "delivery-semantics", "lambda-vs-kappa-architecture", "apache-spark-architecture", "event-streaming-kafka"],
  practice: ["realtime-analytics", "fraud-data-platform", "clickstream"],
};
