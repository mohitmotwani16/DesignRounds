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
  "machine-learning-system-design-roadmap": {
    keywords: ["machine learning system design roadmap", "ml system design roadmap", "ml engineer roadmap", "machine learning engineer roadmap 2026", "how to become a machine learning engineer", "ml system design interview preparation", "mlops roadmap"],
    faq: [
      { q: "What should I learn for ML system design interviews?", a: "Problem framing, training data and labels, feature engineering and feature stores, model selection, model serving, offline and online evaluation with A/B tests, monitoring and feedback loops, and the retrieve-rank-rerank architecture behind recommendation, search and ads systems." },
      { q: "How long does it take to prepare for an ML system design interview?", a: "About eight weeks part-time if you follow the roadmap stage by stage and do a design exercise or practice round each week. With strong ML fundamentals, three to four focused weeks on the framework, evaluation and worked examples is often enough." },
      { q: "Is ML system design different from regular system design?", a: "Yes. Regular system design is about storing and moving data correctly at scale; ML system design adds whether the system's decisions are good, which brings in labels, features, training, evaluation, monitoring and feedback loops. You still use the regular building blocks for serving and data." },
    ],
  },
  "ai-engineering-roadmap": {
    keywords: ["ai engineer roadmap", "ai engineer roadmap 2026", "how to become an ai engineer", "ai engineering roadmap", "generative ai roadmap", "llm engineer roadmap", "gen ai engineer skills", "ai engineer system design"],
    faq: [
      { q: "How do I become an AI engineer?", a: "Learn how LLMs work and how to choose one, then prompting and structured output, retrieval-augmented generation, agents and tool calling, evaluation, guardrails and prompt injection, serving, caching and cost, fine-tuning, and LLMOps. Build small projects for each and practise designing full systems such as a RAG chatbot or a support agent." },
      { q: "What is the difference between an AI engineer and an ML engineer?", a: "An ML engineer usually trains task-specific models from labelled data and runs them in production. An AI engineer builds applications on pretrained foundation models, adapting them with prompts, retrieved context, tools and sometimes fine-tuning. Both need evaluation, serving and monitoring skills." },
      { q: "What system design questions do AI engineers get asked?", a: "The most common are designing a production RAG system over company documents, a customer support agent that uses tools, an LLM inference or batching system, ChatGPT, a coding assistant, and evaluation or guardrail systems for LLM applications." },
    ],
  },
  "ml-system-design-interview": {
    keywords: ["ml system design interview", "machine learning system design interview", "ml system design framework", "how to answer ml system design questions", "ml design interview tips", "machine learning design interview steps"],
    faq: [
      { q: "How do I answer a machine learning system design question?", a: "Follow seven steps: clarify requirements, frame the problem as an ML task with a clear label, design the data and labels, choose features and a model starting from a baseline, define offline and online evaluation, design serving within the latency budget, and plan monitoring and retraining." },
      { q: "What do interviewers look for in an ML system design round?", a: "A precise problem framing, realistic data and label plans, a baseline before complex models, metrics that match the task and business goal, a serving path that meets latency, and awareness of drift, feedback loops and failure modes." },
      { q: "What is the most common mistake in ML system design interviews?", a: "Jumping to a model architecture before agreeing on the business objective, the label and the metric. The framing decides everything else, so spend the first ten minutes on it." },
    ],
  },
  "ml-problem-framing": {
    keywords: ["ml problem framing", "how to frame a machine learning problem", "business objective to ml objective", "choosing a label machine learning", "when not to use machine learning"],
    faq: [
      { q: "What is ML problem framing?", a: "Turning a business goal into something a model can learn: defining the input, the output, the label, the unit of prediction and the task type, and arguing that improving that prediction improves the goal." },
      { q: "When should you not use machine learning?", a: "When a simple rule works, when there is no data or way to get labels, when decisions must be fully explainable and errors are unacceptable, or when the pattern does not repeat. Start with a heuristic and log data for a model later." },
    ],
  },
  "ml-training-data": {
    keywords: ["ml training data", "data leakage machine learning", "class imbalance", "time based split", "negative sampling", "training data pipeline"],
    faq: [
      { q: "What is data leakage in machine learning?", a: "Data leakage is when a training feature contains information that will not be available at prediction time or that encodes the label, such as aggregates computed with future events. It makes offline metrics look excellent while the model fails in production." },
      { q: "Why use a time-based split instead of a random split?", a: "Because production models predict the future from the past. A random split lets the model train on events that happened after the ones it is tested on, which inflates offline metrics." },
      { q: "How do you handle class imbalance?", a: "Use metrics such as precision, recall and PR-AUC instead of accuracy, choose thresholds from the cost of each error, reweight the loss, downsample the majority class (and recalibrate probabilities), and collect more positive examples." },
    ],
  },
  "data-labeling": {
    keywords: ["data labeling pipeline", "data annotation for machine learning", "active learning", "weak supervision", "llm assisted labeling", "inter annotator agreement"],
    faq: [
      { q: "What is the difference between natural labels and hand labels?", a: "Natural labels come from user behaviour, such as clicks, purchases or chargebacks, and are cheap and plentiful but biased and sometimes delayed. Hand labels come from annotators or experts, are more precise, and are slow and expensive." },
      { q: "What is active learning?", a: "A labelling strategy that sends the examples the current model is least sure about to annotators first, so each label improves the model more. A random sample is still kept for unbiased evaluation." },
    ],
  },
  "feature-engineering": {
    keywords: ["feature engineering for machine learning", "feature engineering techniques", "categorical encoding", "hashing trick", "feature crosses", "training serving skew"],
    faq: [
      { q: "How do you encode high-cardinality categorical features?", a: "Use the hashing trick to map values into a fixed number of buckets, or learn embeddings for each value. One-hot encoding is only practical for features with a small number of values." },
      { q: "What is training-serving skew?", a: "A difference between a feature's value in training and at serving time for the same situation, caused by separate implementations, different freshness or future leakage. Prevent it by defining features once, using point-in-time joins, and training on logged serving features." },
    ],
  },
  "embeddings": {
    keywords: ["embeddings machine learning", "what are embeddings", "two tower model", "embedding model system design", "item embeddings recommendation", "embedding versioning"],
    faq: [
      { q: "What is an embedding?", a: "A dense vector of numbers that represents an item, user, text or image so that similar things are close together. Embeddings compress huge id spaces and let systems search by similarity." },
      { q: "What is a two-tower model?", a: "A retrieval model with one network encoding the user or query and another encoding items, trained so engaged pairs score highly. Item vectors can be precomputed and indexed for fast nearest-neighbour search." },
      { q: "What happens to embeddings when you change the model?", a: "Vectors from different model versions are not comparable, so the whole corpus must be re-embedded into a new index, and query and item sides switched together." },
    ],
  },
  "ml-model-selection": {
    keywords: ["how to choose a machine learning model", "ml model selection", "gradient boosted trees vs neural networks", "baseline model machine learning", "multi task learning recommendation"],
    faq: [
      { q: "Which model should I propose in an ML system design interview?", a: "Start with a heuristic baseline and a simple learned model such as logistic regression or gradient-boosted trees, then propose a deep model only if the data size, feature types and expected gain justify the extra latency and complexity." },
      { q: "When are gradient-boosted trees better than deep learning?", a: "On tabular data with dense features and moderate data sizes, such as fraud and ETA prediction. Deep models win with huge sparse id features, text, images and sequences." },
    ],
  },
  "continual-learning": {
    keywords: ["model retraining strategy", "continual learning machine learning", "how often to retrain a model", "online learning", "automated retraining pipeline"],
    faq: [
      { q: "How often should a machine learning model be retrained?", a: "Measure it: train models on data ending at different dates and evaluate them on the same recent period. If freshness improves metrics meaningfully, retrain often; if not, weekly or monthly is enough." },
      { q: "What is the difference between stateless and stateful retraining?", a: "Stateless retraining rebuilds the model from scratch on a sliding window of data; stateful (incremental) retraining continues training the previous model on only new data, which is cheaper but can accumulate errors." },
    ],
  },
  "model-compression": {
    keywords: ["model compression", "quantization", "knowledge distillation", "model pruning", "int8 quantization", "on device machine learning"],
    faq: [
      { q: "What is model quantization?", a: "Storing model weights and sometimes activations in lower precision, such as 8-bit or 4-bit integers instead of 32-bit floats, to cut memory and speed up inference with a small accuracy cost." },
      { q: "What is knowledge distillation?", a: "Training a small student model to imitate a larger teacher model's predictions, so the student reaches much of the teacher's quality at a fraction of the size and cost." },
    ],
  },
  "multi-armed-bandits": {
    keywords: ["multi armed bandit", "thompson sampling", "explore exploit tradeoff", "contextual bandits", "bandits vs ab testing", "upper confidence bound"],
    faq: [
      { q: "What is a multi-armed bandit?", a: "An algorithm that repeatedly chooses between options while learning which pays off best, balancing exploiting the current best option with exploring others. It shifts traffic towards winners during the experiment." },
      { q: "When should I use a bandit instead of an A/B test?", a: "For short-lived choices where maximising reward during the test matters, such as headlines, thumbnails or new-item exploration. Use A/B tests for launch decisions that need unbiased effect estimates and long-term metrics." },
    ],
  },
  "ml-feedback-loops": {
    keywords: ["feedback loops machine learning", "position bias", "selection bias recommender systems", "popularity bias", "degenerate feedback loop", "ml fairness"],
    faq: [
      { q: "What is a degenerate feedback loop?", a: "When a model's outputs shape its future training data, for example a recommender that ranks an item first, so it gets more clicks, so the next model ranks it higher, regardless of real quality." },
      { q: "How do you correct position bias?", a: "Include position as a training feature and fix it at serving time, weight clicks by the inverse probability of being examined at that position, or randomise some positions to measure the effect." },
    ],
  },
  "learning-to-rank": {
    keywords: ["learning to rank", "pointwise pairwise listwise", "lambdamart", "ranking model", "ndcg", "ltr search ranking"],
    faq: [
      { q: "What is the difference between pointwise, pairwise and listwise ranking?", a: "Pointwise models score each item independently, pairwise models learn which of two items should rank higher, and listwise models optimise the ordering of the whole list, matching ranking metrics like NDCG most closely." },
      { q: "What is NDCG?", a: "Normalized discounted cumulative gain, a ranking metric that rewards relevant results more the higher they appear, discounting by the logarithm of the position and normalising by the ideal ordering." },
    ],
  },
  "cold-start-problem": {
    keywords: ["cold start problem", "cold start recommender system", "new user recommendations", "new item cold start", "how to solve cold start"],
    faq: [
      { q: "What is the cold start problem?", a: "When a recommender has no interaction history for a new user, a new item or a new system, so collaborative signals do not exist and new items may never get exposure." },
      { q: "How do you solve cold start for new items?", a: "Use content-based embeddings from text, images and metadata so the item has a representation on arrival, start from creator or category priors, reserve exploration impressions for new items, and stream early engagement into features quickly." },
    ],
  },
  "ml-platform-architecture": {
    keywords: ["ml platform architecture", "machine learning platform", "mlops platform design", "uber michelangelo", "internal ml platform"],
    faq: [
      { q: "What are the components of an ML platform?", a: "A feature store, a training service with GPU scheduling, pipeline orchestration, experiment tracking, a model registry, online and batch serving, evaluation and experimentation, and monitoring." },
      { q: "Why do companies build ML platforms?", a: "So many teams can train, deploy and monitor models through self-service workflows instead of each rebuilding pipelines, feature code and serving stacks, with consistent reproducibility, governance and cost control." },
    ],
  },
  "ml-system-design-interview-questions": {
    keywords: ["ml system design interview questions", "machine learning system design interview questions", "ml system design questions meta google", "ml design interview examples", "recommendation system interview question"],
    faq: [
      { q: "What are the most common ML system design interview questions?", a: "Design a video or feed recommendation system, ad click prediction, search ranking, fraud detection, harmful content detection, People You May Know, visual search, ETA prediction, and ML infrastructure such as a feature store or model serving platform." },
      { q: "How should I prepare for ML system design questions?", a: "Study one worked answer per question family (recommendations, search, ads, integrity, prediction, platforms), redraw each from memory, then do timed practice rounds using a seven-step framework." },
    ],
  },
  "design-video-recommendation-system": {
    keywords: ["design youtube recommendation system", "video recommendation system design", "youtube ml system design", "recommendation system design interview", "design netflix recommendation system"],
    faq: [
      { q: "How does YouTube's recommendation system work at a high level?", a: "It is a multi-stage funnel: candidate generation from a two-tower model and other sources narrows billions of videos to a few thousand, a ranking model predicts several engagement and satisfaction outcomes for each, and re-ranking applies policy, diversity and freshness rules." },
      { q: "What should a video recommender optimise?", a: "Satisfied watch time and long-term engagement rather than clicks alone, combining predicted clicks, watch time, likes, shares and dismissals with weights tuned by online experiments." },
    ],
  },
  "design-ad-click-prediction": {
    keywords: ["ad click prediction system design", "ctr prediction ml system design", "ads ranking system design", "click through rate prediction", "ad auction pctr"],
    faq: [
      { q: "Why does calibration matter in ad click prediction?", a: "Because the predicted click probability is multiplied by the bid in the auction. A model that ranks well but overestimates probabilities misprices ads, so predictions must match observed click rates." },
      { q: "How often are ad click models retrained?", a: "Frequently, often every few hours or continuously, because new ads and campaigns appear constantly and click behaviour shifts quickly." },
    ],
  },
  "design-news-feed-ranking": {
    keywords: ["news feed ranking system design", "facebook news feed ml system design", "feed ranking algorithm", "instagram feed ranking", "linkedin feed ranking"],
    faq: [
      { q: "How is a news feed ranked with machine learning?", a: "A multi-task model predicts the probability of actions like likes, comments, shares, long dwell, hides and reports for each eligible post, and a weighted value formula combines them, with integrity models demoting harmful content and a final pass adding diversity." },
      { q: "What features matter most for feed ranking?", a: "Relationship strength between viewer and author, post type and age, early engagement velocity, the viewer's past engagement with similar content, and context such as device and time." },
    ],
  },
  "design-search-ranking": {
    keywords: ["search ranking system design", "ml search ranking", "ecommerce search system design", "search relevance machine learning", "design search engine ranking"],
    faq: [
      { q: "How do you design a search ranking system?", a: "Understand the query (spelling, category, attributes), retrieve candidates with keyword and semantic search, rank them with a learning-to-rank model using relevance, quality and behaviour features, then apply business rules, and evaluate with NDCG, interleaving and A/B tests." },
      { q: "Where do search ranking labels come from?", a: "Human relevance ratings for evaluation and some training, plus implicit feedback such as clicks, add-to-cart and purchases, corrected for position bias." },
    ],
  },
  "design-fraud-detection-system": {
    keywords: ["fraud detection system design", "real time fraud detection machine learning", "payment fraud ml system design", "fraud detection interview question", "transaction fraud model"],
    faq: [
      { q: "How do you design a real-time fraud detection system?", a: "Compute fresh velocity and behaviour features from a stream into a low-latency store, score each transaction with rules and a model within the authorisation latency budget, decide with cost-based thresholds, and send uncertain cases to human review whose outcomes become labels." },
      { q: "Why are fraud labels hard to get?", a: "Chargebacks arrive weeks after the transaction, and declined transactions never produce a chargeback, so the model cannot learn from its own blocks without some exploration or review sampling." },
    ],
  },
  "design-harmful-content-detection": {
    keywords: ["harmful content detection system design", "content moderation system design", "trust and safety ml", "hate speech detection system", "content moderation machine learning"],
    faq: [
      { q: "How do platforms detect harmful content at scale?", a: "Hash matching catches known violating media, multimodal classifiers score new text, images and video per harm category, a policy engine applies per-harm thresholds, and uncertain or high-reach items go to human reviewers whose decisions retrain the models." },
      { q: "How is content moderation quality measured?", a: "By prevalence (views of violating content measured from random samples), proactive detection rate, precision and recall per harm, appeal overturn rates and slice metrics by language." },
    ],
  },
  "design-people-you-may-know": {
    keywords: ["people you may know system design", "friend recommendation system design", "pymk machine learning", "link prediction", "linkedin connection recommendations"],
    faq: [
      { q: "How does People You May Know work?", a: "It generates candidates from friends of friends, shared schools and workplaces, contacts and graph embeddings, ranks them with a model predicting accepted connections, mostly in daily batch, and updates in real time when you make a new connection." },
      { q: "What is the strongest signal for friend recommendations?", a: "Mutual connections, ideally weighted so that a mutual friend with few connections counts more than one with thousands." },
    ],
  },
  "design-visual-search": {
    keywords: ["visual search system design", "image similarity search", "reverse image search system design", "pinterest lens system design", "image embeddings search"],
    faq: [
      { q: "How does visual search work?", a: "An image encoder trained with contrastive learning turns images into embeddings, an approximate nearest neighbour index finds the closest vectors to the query image, and a re-ranker orders the neighbours by usefulness." },
      { q: "How do you search billions of image vectors?", a: "Compress vectors with product quantization, shard the index across machines, query all shards in parallel, and re-rank the top candidates with full-precision vectors." },
    ],
  },
  "design-eta-prediction": {
    keywords: ["eta prediction system design", "delivery time prediction machine learning", "uber eta prediction", "food delivery eta system design", "arrival time prediction"],
    faq: [
      { q: "How do food delivery apps predict ETA?", a: "They decompose delivery into stages such as preparation, courier travel to the restaurant, pickup wait and drive to the customer, and predict each with models using real-time kitchen load, courier supply and traffic features plus historical patterns." },
      { q: "Why predict quantiles for ETA?", a: "Because lateness hurts more than earliness. Predicting a P50 and a P90 lets the product show a range or a slightly conservative estimate and measure whether the promised time is kept." },
    ],
  },
  "ai-engineer-system-design-interview": {
    keywords: ["ai engineer system design interview", "llm system design interview", "generative ai system design interview", "ai system design framework", "llm interview questions system design", "how to answer llm system design questions"],
    faq: [
      { q: "How do I answer an LLM system design question?", a: "Clarify the task and the cost of a wrong answer, define evaluation first, pick the simplest approach (prompting, RAG, tools, agent, fine-tuning), design the context, design tools with safety controls, add guardrails, estimate tokens, latency and cost, and plan tracing, versioning and rollback." },
      { q: "How is an AI engineering design round different from a backend one?", a: "It adds quality proof through evaluation, context design through retrieval and memory, safety against prompt injection and unsafe actions, and capacity measured in tokens and GPU memory rather than requests alone." },
    ],
  },
  "genai-system-design-interview-questions": {
    keywords: ["generative ai system design interview questions", "llm system design interview questions", "ai engineer interview questions system design", "rag system design interview", "ai agent system design interview", "genai interview questions"],
    faq: [
      { q: "What generative AI system design questions are asked in interviews?", a: "Common ones are design a RAG chatbot over company documents, a customer support AI agent, ChatGPT, GitHub Copilot, an LLM inference batching system, an LLM gateway, a text-to-image service, a voice AI agent, and evaluation or guardrail systems." },
      { q: "Which GenAI design question should I prepare first?", a: "A production RAG system, then a tool-using agent, then LLM serving and batching. Together they cover retrieval, permissions, evaluation, tools, safety, latency and cost." },
    ],
  },
  "how-llms-work": {
    keywords: ["how llms work", "what is a token llm", "context window", "llm temperature", "prefill and decode", "large language model basics for engineers"],
    faq: [
      { q: "What is a token in an LLM?", a: "A chunk of text produced by the model's tokenizer, often a word or part of a word. In English one token is roughly three-quarters of a word. Context limits, latency and pricing are all measured in tokens." },
      { q: "What is a context window?", a: "The maximum number of tokens, prompt plus output, a model can process in one call. Everything the model needs for a request must fit inside it, because the model keeps no memory between calls." },
      { q: "What does temperature do?", a: "It controls randomness when sampling the next token. Values near zero give consistent, most-likely output for extraction and code; higher values give more varied output for creative tasks." },
    ],
  },
  "choosing-an-llm": {
    keywords: ["how to choose an llm", "open source vs closed llm", "self hosted llm vs api", "llm selection criteria", "best llm for production"],
    faq: [
      { q: "Should I use a hosted LLM API or self-host an open model?", a: "Start with hosted APIs for speed and quality. Self-host open-weight models when traffic is high and steady, data must stay in your environment, or you need deep customisation, and you can run GPUs efficiently." },
      { q: "How do I compare LLMs for my product?", a: "Shortlist a few models, run them on your own evaluation set of realistic cases, and compare quality per slice against cost per task and latency, rather than relying on public leaderboards." },
    ],
  },
  "prompt-engineering": {
    keywords: ["prompt engineering", "prompt engineering for production", "system prompt best practices", "few shot prompting", "prompt versioning", "prompt templates"],
    faq: [
      { q: "What makes a good production prompt?", a: "Clear role and rules, explicit output format, a few well-chosen examples, clearly delimited context, and instructions for uncertainty, stored as a versioned template tied to a model version and tested by an evaluation suite." },
      { q: "Can a system prompt enforce security?", a: "No. Prompts can be overridden by user input or injected content. Permissions and access control must be enforced in code, not in prompt instructions." },
    ],
  },
  "llm-structured-outputs": {
    keywords: ["llm structured output", "llm json output", "json schema llm", "function calling", "constrained decoding", "llm output validation"],
    faq: [
      { q: "How do you get reliable JSON from an LLM?", a: "Request the format, use schema-constrained decoding or JSON mode where available, then validate the output against the schema and run semantic checks in code, with a bounded repair retry and a fallback." },
      { q: "Is schema-constrained output always correct?", a: "It guarantees the structure, not the values. Totals, ids, dates and permissions still need checks in code before any side effect." },
    ],
  },
  "rag-chunking-strategies": {
    keywords: ["rag chunking strategies", "chunk size for rag", "document chunking", "semantic chunking", "parent child retrieval", "chunk overlap"],
    faq: [
      { q: "What is the best chunk size for RAG?", a: "There is no universal best. A few hundred tokens with 10 to 20 percent overlap is a common starting point; tune it on your own questions by measuring retrieval recall, and use parent-child retrieval when you need both precise matches and broad context." },
      { q: "Which chunking strategy should I use?", a: "Structural or recursive chunking by headings and paragraphs suits most documents; document-aware chunking suits code, FAQs and contracts; semantic chunking helps long unstructured text." },
    ],
  },
  "hybrid-search-reranking": {
    keywords: ["hybrid search", "bm25 vs vector search", "reciprocal rank fusion", "cross encoder reranking", "reranker rag", "keyword and semantic search"],
    faq: [
      { q: "What is hybrid search?", a: "Running keyword search such as BM25 and vector search in parallel and merging their results, so queries with exact terms like error codes and queries phrased differently from the documents are both handled." },
      { q: "What is reciprocal rank fusion?", a: "A way to merge rankings using only positions: each document scores the sum of 1 divided by a constant plus its rank in each list, so documents ranked well by both retrievers rise to the top." },
      { q: "Why use a cross-encoder reranker?", a: "A cross-encoder reads the query and passage together, making it more accurate than comparing separate embeddings. It is too slow for the whole corpus, so it reranks only the top few dozen candidates." },
    ],
  },
  "advanced-rag": {
    keywords: ["advanced rag", "agentic rag", "graphrag", "query rewriting rag", "hyde", "multi hop rag", "long context vs rag"],
    faq: [
      { q: "What is agentic RAG?", a: "RAG where retrieval is a tool the model can call repeatedly: it searches, reads, decides what is missing and searches again until it has enough evidence or reaches a budget. It handles multi-hop questions at the cost of more calls." },
      { q: "What is GraphRAG?", a: "An approach that uses an LLM to extract entities and relationships into a knowledge graph at ingestion, clusters and summarises it, and answers corpus-wide questions from those summaries." },
      { q: "Is long context replacing RAG?", a: "Not for most systems. Long context helps when the material fits, but RAG remains cheaper per query, handles any corpus size, and filters by permissions and freshness. The two are often combined." },
    ],
  },
  "ai-agent-architecture": {
    keywords: ["ai agent architecture", "how to build ai agents", "llm agents design", "agent loop", "agentic workflows", "ai agent design patterns", "workflows vs agents"],
    faq: [
      { q: "What is the difference between an AI workflow and an AI agent?", a: "In a workflow, your code decides the sequence of model and tool calls. In an agent, the model decides its next steps in a loop. Workflows are more predictable and cheaper; agents handle tasks whose steps cannot be known in advance." },
      { q: "How do you keep an AI agent safe?", a: "Give it narrow, least-privilege tools, enforce authorisation in code as the end user, validate arguments, use idempotency for side effects, cap steps, tokens and time, require human approval for irreversible actions, and verify outcomes in the system of record." },
    ],
  },
  "llm-tool-calling-mcp": {
    keywords: ["llm tool calling", "function calling llm", "model context protocol", "what is mcp", "mcp server", "tool use llm"],
    faq: [
      { q: "How does LLM function calling work?", a: "The model is given tool schemas and, instead of answering, emits a structured request naming a tool and its arguments. Your application validates and executes it, then returns the result to the model, which uses it to continue." },
      { q: "What is the Model Context Protocol (MCP)?", a: "An open standard for connecting AI applications to tools and data. MCP servers expose tools, resources and prompts from a system, and MCP clients in host applications connect to them, so one integration works across many AI apps." },
    ],
  },
  "multi-agent-systems": {
    keywords: ["multi agent systems", "multi agent llm", "orchestrator worker agents", "agent handoffs", "multi agent architecture"],
    faq: [
      { q: "When should I use multiple AI agents?", a: "When work can be parallelised, when subtasks need large separate contexts, or when roles need different tools and permissions. Otherwise a single agent with good tools is cheaper, faster and easier to debug." },
      { q: "What is the orchestrator-worker pattern?", a: "A lead agent plans a task, delegates focused subtasks to worker agents that run in parallel, and combines their condensed results into the final answer." },
    ],
  },
  "agent-memory": {
    keywords: ["ai agent memory", "llm memory", "long term memory chatbot", "conversation summarization", "context window management"],
    faq: [
      { q: "How do AI agents remember things?", a: "Within a conversation, by keeping recent turns and summaries in the context window. Across conversations, by extracting facts into a per-user memory store and retrieving relevant ones into the prompt for each new turn." },
      { q: "What is memory poisoning?", a: "When untrusted content, such as a web page or document, gets saved as a memory and then steers future answers. Prevent it by extracting memories only from the user's own messages, recording their source, and treating memories as data." },
    ],
  },
  "llm-fine-tuning": {
    keywords: ["fine tuning vs rag", "when to fine tune an llm", "lora fine tuning", "qlora", "llm distillation", "supervised fine tuning", "dpo"],
    faq: [
      { q: "Should I fine-tune an LLM or use RAG?", a: "Use RAG for knowledge that is private or changes, since it stays fresh, cited and permission-filtered. Fine-tune for behaviour such as format, style or a narrow skill, or to make a smaller model do a task cheaply. Try better prompts first." },
      { q: "What is LoRA?", a: "Low-rank adaptation: the base model is frozen and small adapter matrices are trained instead, using far less memory. Many adapters can be served on one shared base model." },
    ],
  },
  "llm-evaluation": {
    keywords: ["llm evaluation", "how to evaluate llm applications", "llm as a judge", "rag evaluation metrics", "golden dataset", "llm evals"],
    faq: [
      { q: "How do you evaluate an LLM application?", a: "Build a golden dataset of realistic cases, grade outputs with code checks where possible, LLM judges calibrated against human labels for meaning, and human review for hard cases, gate releases on the results, and add production failures to the dataset." },
      { q: "Can you trust LLM-as-a-judge?", a: "Only after calibration. Use specific rubrics, compare judge scores with human labels per dimension, control for position and length bias, and re-check when the judge model or rubric changes." },
      { q: "How do you evaluate a RAG system?", a: "Measure retrieval and generation separately: retrieval recall and precision against known relevant passages, then faithfulness of the answer to the retrieved context, answer relevance, correctness and citation accuracy." },
    ],
  },
  "llm-guardrails": {
    keywords: ["llm guardrails", "ai guardrails", "llm content moderation", "pii redaction llm", "llm safety filters", "output filtering llm"],
    faq: [
      { q: "What are LLM guardrails?", a: "Checks around a model that keep an application within acceptable bounds: input checks for harmful, off-topic or injected content and personal data, and output checks for safety, data leakage, format, grounding and business rules, with fallbacks when a check fails." },
      { q: "Do guardrails slow down LLM apps?", a: "They add latency, so run cheap checks first, run input checks in parallel with retrieval, check streamed output in chunks, and match the depth of checks to the product's risk." },
    ],
  },
  "prompt-injection": {
    keywords: ["prompt injection", "indirect prompt injection", "owasp top 10 for llm", "llm security", "prompt injection prevention", "ai agent security"],
    faq: [
      { q: "What is prompt injection?", a: "An attack where text the model reads, from a user, web page, document or tool result, contains instructions that override the application's intended behaviour. Indirect injection comes from content the user did not write." },
      { q: "How do you prevent prompt injection?", a: "It cannot be fully prevented, so limit its impact: least-privilege tools, authorisation in code as the end user, permission-filtered retrieval, egress controls, human approval for risky actions, untrusted handling of output, plus detection as an extra layer." },
      { q: "What is the OWASP Top 10 for LLM applications?", a: "A list of the most critical LLM application risks, led by prompt injection and including sensitive information disclosure, supply chain risks, data and model poisoning, improper output handling, excessive agency, system prompt leakage, vector and embedding weaknesses, misinformation and unbounded consumption." },
    ],
  },
  "llm-gateway": {
    keywords: ["llm gateway", "ai gateway", "llm router", "model routing", "llm fallback", "llm rate limiting"],
    faq: [
      { q: "What is an LLM gateway?", a: "A single internal entry point for all model calls that owns provider credentials, routing between models, fallbacks, token-based rate limits and budgets, caching and observability." },
      { q: "How do LLM fallbacks work?", a: "The gateway retries the primary model with backoff on retryable errors such as timeouts and rate limits, then switches to a fallback model with a prompt tuned for it, and alerts if both fail." },
    ],
  },
  "llm-caching": {
    keywords: ["llm caching", "prompt caching", "semantic caching", "semantic cache llm", "kv cache", "llm response cache"],
    faq: [
      { q: "What is prompt caching?", a: "Reusing the computed state of a repeated prompt prefix, such as a long system prompt or document, so later requests with the same prefix are cheaper and faster. It never changes the answer." },
      { q: "Is semantic caching safe?", a: "Only for scoped cases. It returns a stored answer for a similar question, which can be wrong when similar wording has a different meaning. Use high thresholds and limit it to non-personal, stable content." },
    ],
  },
  "llm-cost-optimization": {
    keywords: ["llm cost optimization", "reduce llm costs", "llm token cost", "llm cost per request", "model cascade", "openai api cost reduction"],
    faq: [
      { q: "How do you reduce LLM costs?", a: "Measure cost per successful task, then route easy requests to smaller models, trim retrieved context and history, use prompt and response caching, batch offline work, limit output length, cap agent loops, and fine-tune or distil small models for high-volume tasks." },
      { q: "What is a model cascade?", a: "A routing pattern where a small, cheap model handles a request first and only escalates to a larger model when a confidence or validation check fails." },
    ],
  },
  "llmops-observability": {
    keywords: ["llmops", "llm observability", "llm tracing", "prompt versioning", "llm monitoring", "llm production best practices"],
    faq: [
      { q: "What is LLMOps?", a: "The operational practice for LLM applications: tracing model and tool calls, versioning prompts, models and retrieval configs together, gating releases on evaluations, canary rollouts, feedback collection and incident response." },
      { q: "What should you monitor in an LLM application?", a: "Time to first token and total latency, error and fallback rates, tokens and cost per task, cache hit rates, online quality signals such as thumbs-down and escalations, guardrail block rates, and agent steps per task." },
    ],
  },
  "design-chatgpt": {
    keywords: ["design chatgpt", "chatgpt system design", "llm chat application system design", "chatbot system design interview", "how chatgpt works system design"],
    faq: [
      { q: "How would you design ChatGPT?", a: "A chat service stores conversations, assembles context from recent turns, summaries and memory, checks moderation and plan limits, and streams tokens from a GPU inference fleet using continuous batching, with routing, queues and graceful degradation under load." },
      { q: "What limits ChatGPT-style systems at scale?", a: "GPU capacity, driven mostly by output tokens per second, plus the large number of long-lived streaming connections and the cost of long contexts." },
    ],
  },
  "design-rag-chatbot": {
    keywords: ["design a rag chatbot", "rag system design", "enterprise rag architecture", "chatbot for company documents", "rag system design interview", "enterprise ai search"],
    faq: [
      { q: "How do you design a RAG chatbot for company documents?", a: "Ingest documents and permissions through connectors, parse and chunk them, index with keyword and vector search, retrieve with the user's permissions as a filter, rerank, generate answers with citations, and evaluate retrieval and faithfulness separately." },
      { q: "How do you enforce document permissions in RAG?", a: "Store each document's access list on its chunks and apply the user's groups as a filter inside retrieval, so restricted content never reaches the model or the prompt." },
    ],
  },
  "design-customer-support-ai-agent": {
    keywords: ["customer support ai agent design", "ai agent system design", "customer service chatbot architecture", "ai support agent tools", "design an ai agent interview"],
    faq: [
      { q: "How do you design a customer support AI agent?", a: "Route common intents to predictable workflows and the long tail to an agent loop, give both narrow tools behind a policy layer that binds identity to the session and enforces limits, require approval for large refunds, hand off to humans with a summary, and evaluate with simulated scenarios." },
      { q: "How do you stop a support agent acting on the wrong account?", a: "Take the customer identity from the authenticated session rather than the model, check ownership in code for every tool call, and log every action with its policy decision." },
    ],
  },
  "design-ai-code-assistant": {
    keywords: ["design github copilot", "ai code assistant system design", "code completion system design", "copilot architecture", "fill in the middle model"],
    faq: [
      { q: "How does an AI code completion system work?", a: "The editor plugin debounces keystrokes and gathers context, the service builds a fill-in-the-middle prompt from code before and after the cursor plus relevant repository snippets, a small fast model generates a short suggestion, and post-processing filters it before display." },
      { q: "How is a code assistant's usefulness measured?", a: "With acceptance rate, the share of accepted code still present minutes later, the share of code written with suggestions, latency and show rate, and task completion time in controlled studies." },
    ],
  },
  "design-ai-voice-agent": {
    keywords: ["voice ai agent system design", "real time voice ai", "voice assistant architecture", "speech to speech ai", "conversational voice ai latency"],
    faq: [
      { q: "How do you build a low-latency voice AI agent?", a: "Stream every stage: streaming speech recognition, fast end-of-turn detection, an LLM streaming its first sentence quickly, and streaming text-to-speech, all co-located near the media server, with barge-in that stops speech when the user talks." },
      { q: "Cascaded pipeline or speech-to-speech model?", a: "A streaming cascade of speech recognition, LLM and text-to-speech is easier to inspect, guard, evaluate and connect to tools, so most production agents use it; speech-to-speech models can be faster but are harder to control." },
    ],
  },
  "design-text-to-image-service": {
    keywords: ["text to image system design", "design midjourney", "image generation service architecture", "diffusion model serving", "gpu job queue design"],
    faq: [
      { q: "How would you design a text-to-image service like Midjourney?", a: "Accept prompts asynchronously, check prompt safety and quota, enqueue jobs by tier, schedule them onto GPU workers that keep models warm and batch compatible jobs, check generated images for safety, store them in object storage behind a CDN, and notify the client." },
      { q: "What drives the cost of image generation?", a: "GPU time per image, which grows with resolution and the number of diffusion steps. Distilled models with fewer steps, batching and lower-precision inference reduce it." },
    ],
  },
  "design-document-ingestion-pipeline": {
    keywords: ["document processing pipeline design", "document ingestion for rag", "pdf parsing pipeline", "rag ingestion pipeline", "unstructured data pipeline llm"],
    faq: [
      { q: "How do you ingest millions of documents for RAG?", a: "Use a staged, queue-connected pipeline: detect type, parse with cheap parsers first and OCR or vision models only for hard pages, enrich, chunk with metadata and access lists, embed in large GPU batches, and index, with each stage idempotent and independently scalable." },
      { q: "How do you handle document updates and deletes?", a: "Track versions in a document registry, index the new version fully before removing the old one, reject out-of-order events by version, hide deleted or revoked documents immediately and purge them asynchronously, and reconcile periodically." },
    ],
  },
  "design-ai-answer-engine": {
    keywords: ["design perplexity", "ai search engine system design", "answer engine architecture", "llm web search system design", "ai search with citations"],
    faq: [
      { q: "How does an AI answer engine like Perplexity work?", a: "It plans the query, searches the web, fetches and extracts the top pages in parallel, ranks passages, and has an LLM write a concise answer that cites the numbered sources inline, streaming the result." },
      { q: "How do AI answer engines stay fast?", a: "By fetching pages in parallel with strict timeouts, caching popular pages and their extracts, using a small model for query planning, showing sources before the answer, and streaming the answer as it is generated." },
    ],
  },
};

export const searchIntent = (slug) => SEARCH_INTENT[slug] ?? null;
export const searchKeywords = (slug) => SEARCH_INTENT[slug]?.keywords ?? [];
