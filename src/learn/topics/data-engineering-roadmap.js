export default {
  blocks: [
    { type: "p", text: "This **data engineering roadmap** takes you from the shape of a modern data platform to the details interviewers probe: how data is ingested with change data capture and event streams, modelled into fact and dimension tables, processed in batch with Spark and in real time with stream processors, orchestrated and backfilled safely, and checked for quality before anyone trusts a dashboard. Each step links to a free guide and a design round that tests it." },
    { type: "callout", tone: "tip", text: "Data engineering interviews usually include SQL, a coding round and a pipeline or platform design round. This roadmap covers the design round, and the modelling steps help with the SQL one." },

    { type: "roadmap", id: "data-engineering" },

    { type: "h2", text: "What a data engineering design round looks like" },
    { type: "p", text: "You'll be asked to design something like a warehouse for customer history, a clickstream pipeline, a real-time metrics platform or a reusable ETL framework. Strong answers follow the same arc:" },
    { type: "ol", items: [
      "**Clarify the consumers and freshness.** Who reads this data, how fresh must it be, and what does a wrong number cost? Freshness decides batch vs streaming more than volume does.",
      "**Land raw data first.** Capture source data unchanged into durable, replayable storage, the bronze layer in a [medallion architecture](/learn/medallion-architecture).",
      "**Model for the questions asked.** Choose the grain, facts and dimensions ([dimensional modeling](/learn/dimensional-modeling)) and how history is kept ([slowly changing dimensions](/learn/slowly-changing-dimensions)).",
      "**Make every job rerunnable.** Idempotent writes, partition-level overwrites and [backfills](/learn/data-pipeline-orchestration) are what separate a demo from a platform.",
      "**Prove the data is right.** [Data quality checks](/learn/data-quality), [data contracts](/learn/data-contracts-schema-evolution) and freshness alerts close the design.",
    ] },

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
    { type: "table", head: ["Week", "Steps", "Practise"], rows: [
      ["1", "1-2", "Draw the end-to-end platform for an e-commerce company and justify each layer."],
      ["2", "3", "Model orders and customers as a star schema; load a customer dimension as SCD Type 2. Then try the [SCD2 warehouse round](/system-design/scd2-warehouse)."],
      ["3", "4", "Explain a Spark job's stages and shuffles, and fix a skewed join."],
      ["4", "5", "Design the [clickstream pipeline](/system-design/clickstream) with late events and deduplication."],
      ["5", "6", "Design the [ETL framework](/system-design/etl-framework) round, including backfills and schema changes."],
      ["6", "7", "Add quality checks and alerting to every design you've done; then the [data quality round](/system-design/data-quality)."],
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "Do I need to learn Spark and Kafka to become a data engineer?" },
    { type: "p", text: "You should understand the model behind each: distributed batch processing with partitions and shuffles, and a durable, partitioned event log with consumer offsets. Most data teams use one or both, and interviews assume you can reason about them." },
    { type: "h3", text: "Is data modeling still important with lakehouses?" },
    { type: "p", text: "Yes. Cheap storage changed where data lives, not what analysts need. A clear grain, conformed dimensions and history handling are still what make numbers consistent across reports." },
    { type: "h3", text: "Batch or streaming: which should I learn first?" },
    { type: "p", text: "Batch. Most pipelines are batch, the concepts (idempotency, partitioning, backfills) carry over, and streaming adds time semantics on top. See [batch vs stream processing](/learn/batch-vs-stream-processing)." },
  ],
  related: ["data-engineering-architecture", "etl-vs-elt", "data-warehouse-vs-data-lake", "dimensional-modeling", "batch-vs-stream-processing"],
  practice: ["scd2-warehouse", "clickstream", "etl-framework", "realtime-analytics"],
  reading: [
    { title: "Dimensional Modeling Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "Apache Spark documentation", publisher: "Apache Software Foundation", url: "https://spark.apache.org/docs/latest/" },
    { title: "Apache Airflow documentation", publisher: "Apache Software Foundation", url: "https://airflow.apache.org/docs/" },
  ],
};
