export default {
  blocks: [
    { type: "p", text: "This **data engineering roadmap** takes you from the shape of a modern data platform to the details interviewers probe: how data is ingested with change data capture and event streams, modelled into fact and dimension tables, processed in batch with Spark and in real time with stream processors, orchestrated and backfilled safely, and checked for quality before anyone trusts a dashboard. Each step links to a free guide and a design round that tests it." },
    { type: "callout", tone: "tip", text: "Data engineering interviews usually include SQL, a coding round and a pipeline or platform design round. This roadmap covers the design round, and the modelling steps help with the SQL one." },

    { type: "roadmap", id: "data-engineering" },

    { type: "h2", text: "What a data engineering design round looks like" },
    { type: "p", text: "You'll be asked something like \"design a pipeline that tracks user activity on an e-commerce site\", a warehouse for customer history, or real-time analytics for a delivery platform. It isn't a backend round: load balancers and caches matter little, while ingestion, modeling, formats, quality and reruns matter a lot. Strong answers walk six steps (the [full framework](/learn/data-engineering-system-design-interview)):" },
    { type: "ol", items: [
      "**Requirements.** Who consumes the data, what they need (aggregates, raw events, snapshots), how they access it, and the latency SLA, volume, availability and retention. Then do the arithmetic: it picks your compute engine and rules out whole categories of tools.",
      "**Pipeline design.** Batch, streaming, or both ([Lambda or Kappa](/learn/lambda-vs-kappa-architecture), or a [lakehouse](/learn/lakehouse-architecture)), plus the orchestrator.",
      "**Data modeling.** [Medallion layers](/learn/medallion-architecture), [star schema vs one big table](/learn/dimensional-modeling), and [slowly changing dimensions](/learn/slowly-changing-dimensions).",
      "**Storage and formats.** [Parquet vs Avro](/learn/columnar-file-formats), [Delta or Iceberg](/learn/open-table-formats), and [partitioning or clustering](/learn/data-layout-optimization).",
      "**Quality and observability.** Checks per [quality dimension](/learn/data-quality), [data contracts](/learn/data-contracts-schema-evolution), and pipeline monitoring.",
      "**Scale, backfills and DataOps.** [Idempotent](/learn/idempotency) jobs, safe [backfills](/learn/backfill-and-reprocessing), and schema evolution.",
    ] },
    { type: "p", text: "Interviewers go wide, then zoom into two or three steps. See the [food delivery analytics walkthrough](/learn/design-food-delivery-analytics) for a full answer, and [data engineering design patterns](/learn/data-engineering-design-patterns) for the architectures you'll name along the way." },

    { type: "h2", text: "Core tools by category" },
    { type: "table", head: ["Category", "Common examples", "Guide"], rows: [
      ["Storage formats", "Parquet, ORC, Avro", "[Columnar file formats](/learn/columnar-file-formats)"],
      ["Table formats", "Apache Iceberg, Delta Lake, Apache Hudi", "[Open table formats](/learn/open-table-formats)"],
      ["Batch processing", "Apache Spark, warehouse SQL engines", "[How Spark works](/learn/apache-spark-architecture)"],
      ["Streaming", "Apache Kafka, Apache Flink, Spark Structured Streaming", "[Windows and watermarks](/learn/stream-processing-windows-watermarks)"],
      ["Orchestration", "Apache Airflow, Dagster, Prefect", "[Pipeline orchestration](/learn/data-pipeline-orchestration)"],
      ["Transformation", "SQL models (for example dbt) running in the warehouse", "[ETL vs ELT](/learn/etl-vs-elt)"],
    ] },
    { type: "p", text: "Interviewers rarely care which product you pick. They care that you know what the category is for, what it costs, and when you'd choose something simpler." },

    { type: "h2", text: "A six-week plan" },
    { type: "table", head: ["Week", "Stages", "Practise"], rows: [
      ["1", "1-2", "Learn the six-step framework, then draw the end-to-end platform for an e-commerce company and justify each layer, with volume estimates."],
      ["2", "3-4", "Explain a Spark job's stages and shuffles and fix a skewed join; then design the [clickstream pipeline](/system-design/clickstream) with late events and deduplication."],
      ["3", "5-6", "Compare Lambda and Kappa for one problem; model orders and customers as a star schema and as one big table, and load a customer dimension as SCD Type 2. Then try the [SCD2 warehouse round](/system-design/scd2-warehouse)."],
      ["4", "7-8", "Choose formats and a layout (partitioning or clustering) for a 75 TB event table; add quality checks per dimension and a data contract. Then the [data quality round](/system-design/data-quality)."],
      ["5", "9-10", "Design the [ETL framework](/system-design/etl-framework) with backfills, idempotent writes and schema changes; add a serving layer for a live dashboard."],
      ["6", "11", "Do full mock rounds: the [food delivery analytics round](/system-design/food-delivery-analytics) and the [real-time analytics round](/system-design/realtime-analytics), narrating every trade-off."],
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "Do I need to learn Spark and Kafka to become a data engineer?" },
    { type: "p", text: "You should understand the model behind each: distributed batch processing with partitions and shuffles, and a durable, partitioned event log with consumer offsets. Most data teams use one or both, and interviews assume you can reason about them." },
    { type: "h3", text: "Is data modeling still important with lakehouses?" },
    { type: "p", text: "Yes. Cheap storage changed where data lives, not what analysts need. A clear grain, conformed dimensions and history handling are still what make numbers consistent across reports." },
    { type: "h3", text: "Batch or streaming: which should I learn first?" },
    { type: "p", text: "Batch. Most pipelines are batch, the concepts (idempotency, partitioning, backfills) carry over, and streaming adds time semantics on top. See [batch vs stream processing](/learn/batch-vs-stream-processing)." },
  ],
  related: ["data-engineering-system-design-interview", "data-engineering-design-patterns", "data-engineering-architecture", "lakehouse-architecture", "dimensional-modeling", "batch-vs-stream-processing"],
  practice: ["food-delivery-analytics", "scd2-warehouse", "clickstream", "etl-framework", "realtime-analytics"],
  reading: [
    { title: "Dimensional Modeling Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "Apache Spark documentation", publisher: "Apache Software Foundation", url: "https://spark.apache.org/docs/latest/" },
    { title: "Apache Airflow documentation", publisher: "Apache Software Foundation", url: "https://airflow.apache.org/docs/" },
  ],
};
