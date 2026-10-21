// Search intent for handbook pages: the phrases people type into a search engine for a
// topic (`keywords`) and the questions behind them (`faq`). Used in three places:
//   - the page's JSON-LD (keywords on the article, an FAQPage for the questions)
//   - the visible "Frequently asked questions" section, which must match the JSON-LD
//   - the handbook's own search, so a keyword finds the page even if the title differs
// Keep answers short, plain and self-contained: they are read out of context.

export const SEARCH_INTENT = {
  "best-system-design-interview-resources": {
    keywords: ["best system design interview resources", "best website to practice system design", "system design interview practice platform", "free ai system design mock interview", "system design mock interview online", "best system design course", "best system design book", "data engineering system design practice", "ml system design interview practice"],
    faq: [
      { q: "What is the best website to practice system design interviews?", a: "It depends on the job. For learning concepts, the free System Design Primer or a handbook; for worked interview designs, Alex Xu's books (ByteByteGo) or Hello Interview; for practicing full rounds with feedback, an AI practice platform such as DesignRounds or Hello Interview's guided practice; and for a final rehearsal, a mock interview with a person." },
      { q: "Is there a free AI system design mock interview?", a: "Yes. DesignRounds has free practice rounds in every discipline, free AI reviews scored on six dimensions every month, and a free round with its live AI interviewer. Hello Interview also offers AI-guided practice that is free to start." },
      { q: "Where can I practice data engineering or ML system design interviews?", a: "Most system design resources focus on backend problems. DesignRounds has separate practice rounds and roadmaps for data engineering, machine learning, platform and infrastructure, distributed systems, and frontend and mobile interviews." },
      { q: "Can AI practice replace a mock interview with a person?", a: "Not entirely. AI practice is best for volume: many full, timed rounds with consistent feedback. A mock with an experienced engineer gives calibrated feedback and rehearses the human conversation, so most candidates do one or two in the final week." },
      { q: "What is the best book for system design interviews?", a: "Alex Xu's System Design Interview: An Insider's Guide (volumes 1 and 2) for interview-style worked problems, and Designing Data-Intensive Applications by Martin Kleppmann and Chris Riccomini for depth on storage, replication and consistency." },
    ],
  },
  "data-engineering-roadmap": {
    keywords: ["data engineering roadmap", "data engineering roadmap 2026", "how to become a data engineer", "data engineer learning path", "data engineering interview preparation", "data engineering system design roadmap"],
    faq: [
      { q: "What should I learn first to become a data engineer?", a: "Start with SQL and data modeling, then batch processing with Spark and an orchestrator such as Airflow. Add streaming (Kafka, Flink or Spark Structured Streaming) once batch concepts like partitioning, idempotency and backfills feel natural." },
      { q: "How long does the data engineering roadmap take?", a: "Working through it with practice takes about six weeks part-time: two stages a week, each followed by a design exercise or practice round." },
      { q: "Is the data engineering system design round different from a backend one?", a: "Yes. Backend rounds focus on APIs, load balancing and caching; data engineering rounds focus on ingestion, batch vs streaming, data modeling, storage formats, data quality and backfills." },
    ],
  },
  "data-engineering-system-design-interview": {
    keywords: ["data engineering system design interview", "data engineer system design interview questions", "data engineering system design", "data pipeline system design interview", "how to prepare for data engineering interview", "data engineering interview framework", "design a data pipeline interview"],
    faq: [
      { q: "How do I answer a data engineering system design question?", a: "Work through six steps: gather requirements, design the pipeline (batch or streaming), model the data, choose storage formats and layout, add data quality and observability, then cover scalability, backfills and operations. Start with clarifying questions and back-of-the-envelope numbers." },
      { q: "What questions are asked in data engineering system design interviews?", a: "Typical prompts are: design a pipeline to track user activity on an e-commerce site, a real-time analytics platform, a data warehouse with history (SCD Type 2), a clickstream pipeline, a reusable ETL framework, or a fraud detection data platform." },
      { q: "Should I choose batch or streaming in a data engineering interview?", a: "Let the latency requirement decide. If an hour or a day of freshness is acceptable, batch is cheaper and simpler. If consumers need data within a minute (live dashboards, fraud, recommendations), use streaming, often alongside a batch path." },
      { q: "Why do back-of-the-envelope calculations matter for data engineering design?", a: "Volume decides the compute engine, storage format, layout and whether you need streaming at all. For example, 300 million events a day at 700 bytes each is about 210 GB a day, which rules out single-machine tools and points to Spark." },
    ],
  },
  "data-engineering-design-patterns": {
    keywords: ["data engineering design patterns", "data architecture patterns", "lambda architecture", "kappa architecture", "data mesh vs lakehouse", "event driven data architecture", "serverless data pipeline", "cqrs event sourcing data engineering"],
    faq: [
      { q: "What are the most common data engineering design patterns?", a: "Lambda, Kappa, event-driven microservices, serverless pipelines, CQRS with event sourcing, data mesh and lakehouse. The first four describe how data is processed; the last three describe how it is modeled, owned and governed." },
      { q: "What is the difference between Lambda and Kappa architecture?", a: "Lambda runs a batch layer and a real-time layer in parallel and merges their results; Kappa uses a single streaming path and reprocesses history by replaying events from a durable log such as Kafka." },
      { q: "Can I combine data architecture patterns?", a: "Yes, and most real platforms do: for example, a lakehouse fed by a Kappa-style stream, or domains in a data mesh each running batch pipelines." },
    ],
  },
  "data-mesh": {
    keywords: ["what is data mesh", "data mesh architecture", "data mesh principles", "data mesh vs data lake", "data mesh vs data lakehouse", "data products", "federated data governance", "domain oriented data ownership"],
    faq: [
      { q: "What is data mesh?", a: "Data mesh is an approach where each business domain owns its data and publishes it as a product for other teams to use, supported by a shared self-serve platform and common governance rules, instead of one central data team owning everything." },
      { q: "What are the four principles of data mesh?", a: "Domain ownership, data as a product, a self-serve data platform, and federated computational governance." },
      { q: "When should a company use data mesh?", a: "When many domains depend on a central data team that has become a bottleneck. Smaller organizations are usually better served by one well-run lakehouse or warehouse." },
    ],
  },
  "lakehouse-architecture": {
    keywords: ["what is a data lakehouse", "lakehouse architecture", "data lakehouse vs data warehouse", "data lake vs data warehouse vs lakehouse", "delta lake vs iceberg", "lakehouse on s3", "databricks lakehouse"],
    faq: [
      { q: "What is a data lakehouse?", a: "A lakehouse stores data as open files on cheap object storage and adds a table format (Delta Lake, Apache Iceberg or Hudi) so the data behaves like warehouse tables: ACID writes, schemas, time travel and fast SQL." },
      { q: "What is the difference between a data lake, a warehouse and a lakehouse?", a: "A lake is cheap and flexible but has no transactions; a warehouse is fast and structured but costs more; a lakehouse keeps lake storage costs while adding warehouse features through an open table format." },
      { q: "Why not just store Parquet files in S3?", a: "Plain files have no ACID guarantees (concurrent writers can corrupt data), no schema enforcement, and suffer from the small file problem. Table formats fix all three." },
    ],
  },
  "data-layout-optimization": {
    keywords: ["partitioning vs bucketing", "liquid clustering", "z-ordering", "data partitioning strategy", "spark partitioning and bucketing", "small file problem", "delta lake optimize", "partition pruning"],
    faq: [
      { q: "What is the difference between partitioning and bucketing?", a: "Partitioning splits a table into folders by column values so filters can skip whole folders. Bucketing hashes a column into a fixed number of files so joins and equality filters on that column avoid shuffles. Partition on low-cardinality filter columns such as date; bucket on high-cardinality join keys." },
      { q: "What is liquid clustering?", a: "Liquid clustering (Delta Lake) replaces fixed partitions with declared clustering columns that the engine reorganizes data around incrementally. You can change the clustering columns later without rewriting the table." },
      { q: "How do I fix the small file problem?", a: "Run compaction regularly (OPTIMIZE in Delta Lake, rewrite_data_files in Iceberg), target files of roughly 128 MB to 1 GB, and reduce the number of output files your jobs write." },
    ],
  },
  "design-food-delivery-analytics": {
    keywords: ["design real time analytics pipeline", "food delivery data pipeline design", "uber eats system design data engineering", "swiggy zomato data engineering system design", "real-time dashboard architecture", "kafka spark streaming pipeline design", "data engineering system design example"],
    faq: [
      { q: "How would you design a real-time analytics pipeline for a food delivery app?", a: "Send all order events to Kafka keyed by restaurant. A streaming job keeps live per-restaurant metrics in Redis or DynamoDB for partner dashboards, and the same events land in object storage where batch Spark jobs build bronze, silver and gold tables for daily reports." },
      { q: "How much data does a food delivery analytics pipeline handle?", a: "At 5 million orders a day with six events each, that is 30 million events a day: about 350 events per second on average and roughly 830 at the dinner peak, or about 30 GB of raw data a day." },
      { q: "Which data quality checks belong in this pipeline?", a: "Schema contracts at ingestion; allowed event types and duplicate checks in bronze; null, referential-integrity, time-order and row-count checks in silver; range checks such as a 0 to 100% cancellation rate in gold." },
    ],
  },
};

export const searchIntent = (slug) => SEARCH_INTENT[slug] ?? null;
export const searchKeywords = (slug) => SEARCH_INTENT[slug]?.keywords ?? [];
