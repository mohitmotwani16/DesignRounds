// Search intent for handbook pages: the phrases people type into a search engine for a
// topic (`keywords`) and the questions behind them (`faq`). Used in three places:
//   - the page's JSON-LD (keywords on the article, an FAQPage for the questions)
//   - the visible "Frequently asked questions" section, which must match the JSON-LD
//   - the handbook's own search, so a keyword finds the page even if the title differs
// Keep answers short, plain and self-contained: they are read out of context.

export const SEARCH_INTENT = {
  "dimensional-modeling-interview-guide": {
    keywords: ["data modeling interview questions", "dimensional modeling interview questions", "data warehouse modeling interview", "kimball interview questions", "fact and dimension table interview questions", "data engineer data modeling round"],
    faq: [
      { q: "How do I answer a data modeling interview question?", a: "Clarify the business questions first, name the business process, declare the grain of the fact table in one sentence, list dimensions and facts true to that grain, decide history for each attribute, add snapshot tables if the questions need them, and finish by answering two of the original questions in SQL against your model." },
      { q: "What do interviewers look for in a dimensional modeling round?", a: "A clear grain, numbers that can't be double counted, honest handling of history with slowly changing dimensions, correct aggregation of semi-additive and non-additive measures, and practical choices about partitioning, incremental loads and late data." },
      { q: "What are the most common data modeling interview traps?", a: "Putting order-level amounts on line-level rows, overwriting attributes that reports need history for, joining two fact tables directly, summing balances across days, averaging ratios, and leaving foreign keys null." },
    ],
  },
  "four-step-dimensional-design": {
    keywords: ["four step dimensional design process", "kimball four step process", "declare the grain", "how to design a fact table", "dimensional design process"],
    faq: [
      { q: "What are the four steps of dimensional design?", a: "Choose the business process, declare the grain, identify the dimensions, and identify the facts, in that order. Each step constrains the next." },
      { q: "Why should the grain be as atomic as possible?", a: "Atomic data can always be summarised to answer new questions, but summarised data can never be broken back down. Starting atomic also means you rarely have to rebuild a fact table when requirements change." },
    ],
  },
  "fact-table-types": {
    keywords: ["fact table types", "transaction fact table", "periodic snapshot fact table", "accumulating snapshot fact table", "factless fact table", "additive semi additive non additive facts"],
    faq: [
      { q: "What are the types of fact tables?", a: "Transaction fact tables record individual events, periodic snapshots record the state of something at regular intervals, accumulating snapshots follow one process instance through its milestones, and factless fact tables record events or coverage without numeric measures." },
      { q: "What is a semi-additive fact?", a: "A measure that can be summed across some dimensions but not across time, such as an account balance or stock on hand. Across time you take the period-end value or an average instead of a sum." },
      { q: "When should I use an accumulating snapshot?", a: "When a process has well-defined milestones and people ask how long stages take or where items get stuck, such as order to delivery or application to approval. One row per instance is updated as each milestone happens." },
    ],
  },
  "dimension-table-techniques": {
    keywords: ["surrogate key vs natural key", "role playing dimension", "junk dimension", "degenerate dimension", "mini dimension", "date dimension", "late arriving dimension"],
    faq: [
      { q: "Why use surrogate keys in a data warehouse?", a: "They let one entity have several history rows, isolate the warehouse from source ids that change, collide or get reused, and keep joins on small integers." },
      { q: "What is a role-playing dimension?", a: "One physical dimension used several times by the same fact under different roles, such as order date, ship date and delivery date all referencing the date dimension, usually exposed as separate views." },
      { q: "What is a junk dimension?", a: "A small dimension that combines several low-cardinality flags and codes, such as gift wrap, shipping speed and channel, into one table with a row per combination, so the fact stores one key instead of many columns." },
    ],
  },
  "hierarchies-and-bridge-tables": {
    keywords: ["bridge table data warehouse", "many to many dimensional modeling", "ragged hierarchy", "multivalued dimension", "weighting factor bridge table"],
    faq: [
      { q: "How do you model a many-to-many relationship in a star schema?", a: "Store a group key on the fact table and list each group's members in a bridge table with a weighting factor that sums to one per group. Weighted reports then add up to the true total." },
      { q: "How do you model a hierarchy with variable depth?", a: "With a hierarchy bridge table that stores every ancestor-descendant pair and the depth between them, so rolling up everything under a node is a single join instead of a recursive query." },
    ],
  },
  "conformed-dimensions-bus-matrix": {
    keywords: ["conformed dimensions", "data warehouse bus matrix", "enterprise bus architecture", "drill across", "shrunken dimension"],
    faq: [
      { q: "What is a conformed dimension?", a: "A dimension, such as customer, product or date, that is defined once and shared with identical keys, attributes and meanings by every fact table that uses it, so results from different processes can be combined." },
      { q: "What is a bus matrix?", a: "A grid with business processes as rows and conformed dimensions as columns, marking which process uses which dimension. It scopes a warehouse and shows which dimensions to build first." },
    ],
  },
  "dimensional-model-example-ecommerce": {
    keywords: ["ecommerce data model example", "data warehouse design example", "star schema example ecommerce", "order data model data warehouse", "retail dimensional model"],
    faq: [
      { q: "What fact tables does an e-commerce data warehouse need?", a: "Usually an order-line transaction fact, a returns fact, an order fulfilment accumulating snapshot for delivery times, and a daily inventory periodic snapshot, all sharing date, customer, product and warehouse dimensions." },
      { q: "How do you handle shipping fees charged per order in an order-line fact table?", a: "Either allocate the fee across the order's lines by a stated rule, such as in proportion to line value, or keep order-level amounts in a separate order fact. Repeating the full fee on every line double counts it." },
    ],
  },
  "dimensional-model-example-ride-hailing": {
    keywords: ["uber data model", "ride sharing data model", "ride hailing data warehouse design", "uber data engineering interview", "trip fact table"],
    faq: [
      { q: "How would you model Uber trip data in a data warehouse?", a: "A trip fact at one row per trip request, a trip lifecycle accumulating snapshot for wait times and cancellations, an hourly driver activity snapshot for utilisation, and dimensions for rider, driver, product, zone (used for both pickup and drop-off) and date in local and UTC time." },
      { q: "How do you store surge pricing in a fact table?", a: "Store the surge amount as an additive fact so surge revenue can be summed, put a surge band in a dimension for grouping, and keep the multiplier only for display, since multipliers can't be summed or averaged meaningfully." },
    ],
  },
  "data-modeling-for-system-design": {
    keywords: ["data modeling system design interview", "database schema design interview", "how to design a database schema", "partition key design", "data modeling for system design"],
    faq: [
      { q: "How should I approach data modeling in a system design interview?", a: "List the core entities and their relationships, write down the access patterns with rough rates, choose a store that serves those patterns, pick primary, partition and sort keys, then add indexes and denormalisation only where a hot access pattern needs them." },
      { q: "How do I choose a partition key?", a: "Choose a key that matches the main query, so it hits one partition, and that spreads load evenly. Watch for hot keys, such as a celebrity's id or today's date, and spread them with a bucket suffix or a time window." },
      { q: "When should I denormalize data?", a: "When a hot read path would otherwise need joins or several lookups. Keep a normalised source of truth, copy fields to where they're read, and say how the copies are kept consistent, synchronously or through events." },
    ],
  },
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
