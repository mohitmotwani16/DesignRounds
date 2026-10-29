export default {
  blocks: [
    { type: "p", text: "A **feature store** is the system that computes, stores and serves the input features for machine learning models, so the same feature definitions are used when building training data and when making live predictions. It usually has an **offline store** for large historical datasets and an **online store** for low-latency lookups at prediction time, plus a registry of feature definitions. Its main job is preventing **training-serving skew**: a model trained on one version of a feature and served another." },

    { type: "h2", text: "Why teams build one" },
    { type: "ul", items: [
      "**Training-serving skew:** a data scientist computes \"orders in the last 7 days\" in a notebook with SQL; an engineer reimplements it in the serving path in Java with a subtly different window. The model performs well offline and poorly in production.",
      "**Point-in-time leakage:** a training row for a prediction made on 1 March accidentally includes data from 5 March. The model learns from the future and offline metrics lie.",
      "**Duplicated work:** five teams compute the same customer features five ways.",
      "**Latency:** live prediction needs features in milliseconds, which the warehouse can't serve.",
    ] },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "One feature definition feeds both paths: batch and streaming pipelines write to the offline store for training and the online store for serving.", nodes: [
      { id: "batch", label: "Batch sources", sub: "warehouse · lake", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "stream", label: "Event stream", sub: "Kafka", col: 0, row: 2, shape: "queue", tone: "queue" },
      { id: "def", label: "Feature definitions", sub: "registry", col: 1.3, row: 1, tone: "accent" },
      { id: "offline", label: "Offline store", sub: "history · lakehouse", col: 2.7, row: 0, shape: "db", tone: "store" },
      { id: "online", label: "Online store", sub: "latest values · KV", col: 2.7, row: 2, shape: "db", tone: "cache" },
      { id: "train", label: "Training", sub: "point-in-time join", col: 4, row: 0, shape: "pill" },
      { id: "serve", label: "Model service", sub: "lookup by entity key", col: 4, row: 2, shape: "pill" },
    ], edges: [
      { from: "batch", to: "def" }, { from: "stream", to: "def" },
      { from: "def", to: "offline", label: "materialise" }, { from: "def", to: "online", label: "materialise" },
      { from: "offline", to: "train" }, { from: "online", to: "serve" },
    ] },
    { type: "table", head: ["Component", "Role", "Typical storage"], rows: [
      ["Registry", "Feature names, entity keys, owners, transformation code, freshness", "Metadata database, version control"],
      ["Offline store", "Full history of feature values with timestamps, for training and batch scoring", "Lakehouse tables, warehouse"],
      ["Online store", "Latest value per entity, read in a few milliseconds", "Key-value store such as Redis or a wide-column database"],
      ["Materialisation jobs", "Compute features and write them to both stores", "Spark, SQL, stream processors"],
    ] },

    { type: "h2", text: "Point-in-time correct training data" },
    { type: "p", text: "To build a training set, you start from **labelled events**, each with an entity key and a timestamp (a transaction and whether it turned out to be fraud). For each event, you need each feature's value **as of that timestamp**, not today's value. That's a point-in-time (\"as of\") join: for every event, take the latest feature row whose timestamp is at or before the event time." },
    { type: "code", code: `
-- For each labelled transaction, the customer's 7-day order count as it was at that moment
select t.transaction_id, t.label, f.orders_7d
from labelled_transactions t
left join lateral (
  select orders_7d from customer_features f
  where f.customer_id = t.customer_id and f.feature_time <= t.event_time
  order by f.feature_time desc
  limit 1
) f on true;
` },
    { type: "callout", tone: "warning", text: "Also respect when a feature *became available*, not only when it describes. A daily batch feature for 1 March that lands at 04:00 on 2 March wasn't available to a prediction at 23:00 on 1 March." },

    { type: "h2", text: "Batch, streaming and on-demand features" },
    { type: "table", head: ["Kind", "Freshness", "Example", "Computed by"], rows: [
      ["Batch", "Hours to a day", "Customer lifetime value, 90-day purchase count", "Scheduled Spark or SQL"],
      ["Streaming", "Seconds", "Transactions in the last 10 minutes on this card", "Stream processor with windows"],
      ["On-demand", "At request time", "Distance between this request's location and home address", "The serving path, from request data"],
    ] },
    { type: "p", text: "Streaming features need the same [windows and watermarks](/learn/stream-processing-windows-watermarks) care as any stream job, and the offline store must record the same values the online store served, or backfill them identically." },

    { type: "h2", text: "Serving considerations" },
    { type: "ul", items: [
      "**Latency budget:** a model call with a 50 ms budget might allow 5-10 ms for feature lookups, so batch lookups by entity key in one round trip.",
      "**Freshness and defaults:** define what the model gets when a feature is missing or stale, and train with the same default.",
      "**Log what was served:** logging features at prediction time gives exact training data for the next model and makes skew measurable.",
      "**Hot entities:** a popular item or merchant can become a [hot key](/learn/hot-partitions) in the online store; cache it.",
    ] },
  ],
  uses: [
    { name: "Fraud scoring", text: "Streaming velocity features (transactions per card in 10 minutes) and batch profile features are looked up together in a few milliseconds." },
    { name: "Recommendations", text: "User and item features are shared by retrieval and ranking models across teams." },
    { name: "Pricing and ETA models", text: "Recent supply and demand features per area are served online and logged for retraining." },
  ],
  interview: [
    "Name training-serving skew and point-in-time leakage as the problems the store solves.",
    "Separate offline and online stores and say what technology fits each.",
    "Explain the point-in-time join, including feature availability time.",
    "Log served features to build future training data.",
  ],
  related: ["machine-learning-system-architecture", "model-serving", "stream-processing-windows-watermarks", "ml-model-monitoring", "redis", "feature-engineering", "ml-training-data", "design-fraud-detection-system"],
  practice: ["feature-store", "online-fraud-model", "recommendation-engine"],
  reading: [
    { title: "Feast documentation: Concepts", publisher: "Feast (open source)", url: "https://docs.feast.dev/getting-started/concepts" },
    { title: "Meet Michelangelo: Uber's Machine Learning Platform", publisher: "Uber Engineering Blog", url: "https://www.uber.com/in/en/blog/michelangelo-machine-learning-platform/" },
  ],
};
