export default {
  blocks: [
    { type: "p", text: "**Feature engineering** turns raw data (events, profiles, text, images) into the numbers a model consumes. In production systems the hard part isn't inventing clever features; it's computing them **the same way** in training and at serving time, **fresh enough** to matter, and **cheap enough** to fetch within a latency budget. This guide covers the transformations interviewers expect you to name and the system choices behind them." },

    { type: "h2", text: "Feature groups to name in an interview" },
    { type: "table", head: ["Group", "Examples (video recommender)", "Changes"], rows: [
      ["User", "Age bucket, country, languages, account age, long-term topic interests", "Slowly"],
      ["Item", "Category, duration, creator, upload age, global CTR, embedding", "Slowly (stats daily)"],
      ["Context", "Time of day, day of week, device, network, page", "Per request"],
      ["User-item", "Has the user watched this creator? Similarity of user and item embeddings", "Per request"],
      ["Real-time behaviour", "Videos watched in the last 10 minutes, current session topics", "Seconds"],
    ] },
    { type: "p", text: "Listing groups like this, then picking two or three high-value features per group, is clearer than a long flat list." },

    { type: "h2", text: "Transforming numeric features" },
    { type: "ul", items: [
      "**Scaling:** min-max to [0, 1] or z-score standardisation, so features with large ranges don't dominate gradient-based models. Tree models don't need it.",
      "**Log transform:** for heavy-tailed counts (followers, views, price): `log(1 + x)`.",
      "**Bucketing (discretisation):** turn age or distance into ranges; useful for linear models and for crossing with other features.",
      "**Clipping:** cap outliers at a percentile so one bot with a million clicks doesn't distort the feature.",
      "**Missing values:** impute with a default or median **and** add an `is_missing` flag; missingness is often informative.",
    ] },

    { type: "h2", text: "Encoding categorical features" },
    { type: "diagram", kind: "flow", caption: "Choosing an encoding by cardinality. Small sets can be one-hot encoded; large ones need hashing or learned embeddings to stay memory-efficient.", nodes: [
      { id: "cat", label: "Categorical feature", col: 0, row: 1, tone: "accent", w: 160 },
      { id: "low", label: "Few values", sub: "device type", col: 1.5, row: 0 },
      { id: "mid", label: "Thousands", sub: "city, category", col: 1.5, row: 1 },
      { id: "high", label: "Millions", sub: "user id, item id", col: 1.5, row: 2 },
      { id: "oh", label: "One-hot", col: 3, row: 0, tone: "ok" },
      { id: "hash", label: "Hashing trick", sub: "fixed buckets", col: 3, row: 1, tone: "cache" },
      { id: "emb", label: "Learned embedding", sub: "dense vector", col: 3, row: 2, tone: "store" },
    ], edges: [
      { from: "cat", to: "low" }, { from: "cat", to: "mid" }, { from: "cat", to: "high" },
      { from: "low", to: "oh" }, { from: "mid", to: "hash" }, { from: "mid", to: "emb", dashed: true }, { from: "high", to: "emb" },
    ] },
    { type: "ul", items: [
      "**One-hot:** one binary column per value. Simple, but the vector grows with cardinality.",
      "**Hashing trick:** hash the value into a fixed number of buckets (say 2^20). Handles unseen values and bounded memory; collisions add a little noise.",
      "**Embeddings:** a learned dense vector per value, trained with the model. The standard for ids with millions of values. See [embeddings](/learn/embeddings).",
      "**Target encoding:** replace a category by its historical label rate (for example a merchant's past fraud rate). Powerful but leaks the label unless computed only from earlier data.",
    ] },

    { type: "h2", text: "Feature crosses and interactions" },
    { type: "p", text: "A **feature cross** combines features, such as `country × hour_of_day` or `user_language × video_language`, so a linear model can learn interactions. Deep models and gradient-boosted trees learn many interactions themselves, but explicit crosses are still common in ad and recommendation models (the \"wide\" part of wide-and-deep models)." },

    { type: "h2", text: "Aggregates over time windows" },
    { type: "p", text: "Many of the strongest features are **counts and rates over windows**: a card's transactions in the last hour, a video's CTR over the last day, a user's watches in the last 7 days. They are computed by batch jobs for long windows and by [stream processors](/learn/stream-processing-windows-watermarks) for short ones." },
    { type: "diagram", kind: "flow", caption: "Where features are computed. Slow features come from batch jobs; fast ones from a stream; request-time features are computed in the service. All land in an online store for serving and an offline store for training.", nodes: [
      { id: "ev", label: "Event stream", col: 0, row: 0.4, shape: "queue", tone: "queue" },
      { id: "wh", label: "Warehouse / lake", col: 0, row: 1.8, shape: "db", tone: "store" },
      { id: "stream", label: "Stream job", sub: "1 min - 1 h windows", col: 1.5, row: 0.4, tone: "accent" },
      { id: "batch", label: "Batch job", sub: "1 - 90 day windows", col: 1.5, row: 1.8, tone: "accent" },
      { id: "on", label: "Online store", sub: "ms lookups", col: 3, row: 0.4, shape: "db", tone: "cache" },
      { id: "off", label: "Offline store", sub: "history for training", col: 3, row: 1.8, shape: "db", tone: "store" },
      { id: "svc", label: "Prediction service", sub: "+ request features", col: 4.5, row: 0.4, tone: "ok" },
      { id: "train", label: "Training", col: 4.5, row: 1.8 },
    ], edges: [
      { from: "ev", to: "stream" }, { from: "wh", to: "batch" }, { from: "stream", to: "on" }, { from: "stream", to: "off", dashed: true },
      { from: "batch", to: "on" }, { from: "batch", to: "off" }, { from: "on", to: "svc" }, { from: "off", to: "train" },
    ] },

    { type: "h2", text: "Training-serving skew" },
    { type: "p", text: "**Skew** happens when a feature's value at serving time differs from its value in training for the same situation. Causes and fixes:" },
    { type: "table", head: ["Cause", "Example", "Fix"], rows: [
      ["Two implementations", "SQL in training, Java in the service; they round differently", "Define each feature once; generate both paths from it (a [feature store](/learn/feature-store))"],
      ["Different freshness", "Training used end-of-day counts; serving reads counts 5 minutes old", "Log served features and train on the logs"],
      ["Future leakage", "Training aggregates include events after the prediction", "Point-in-time joins"],
      ["Missing at serving", "A feature service times out and returns 0", "Explicit defaults and missing flags; monitor null rates"],
    ] },
    { type: "callout", tone: "tip", text: "The strongest guarantee is **log-and-train**: record the exact feature vector used for every prediction, and build training data from those logs. What the model trains on is then exactly what it saw." },

    { type: "h2", text: "Feature selection and cost" },
    { type: "ul", items: [
      "Each feature costs storage, a lookup at serving time, and an on-call burden when its pipeline breaks.",
      "Use feature importance and ablations to drop features that add little.",
      "Prefer features you can compute for new users and items, or [cold start](/learn/cold-start-problem) gets worse.",
      "Watch for features that encode protected attributes or their proxies; see [fairness checks](/learn/ml-feedback-loops).",
    ] },
  ],
  uses: [
    { name: "Fraud detection", text: "Velocity features (transactions per card per minute, new device, distance from the last transaction) from a stream, joined with long-term merchant risk from batch." },
    { name: "Ads ranking", text: "Billions of sparse id features hashed or embedded, with crosses between user segments, ad categories and placements." },
    { name: "ETA prediction", text: "Real-time traffic and restaurant load from streams, plus historical route and kitchen times from batch." },
  ],
  interview: [
    "Group features into user, item, context, interaction and real-time, with two examples each.",
    "Choose encodings by cardinality: one-hot, hashing or embeddings.",
    "Say which features come from batch, stream or the request, and their freshness.",
    "Explain how you prevent training-serving skew (one definition, point-in-time joins, logged features).",
  ],
  related: ["feature-store", "embeddings", "ml-training-data", "stream-processing-windows-watermarks", "machine-learning-system-architecture"],
  practice: ["feature-store", "online-fraud-model"],
  reading: [
    { title: "Feature Hashing for Large Scale Multitask Learning", publisher: "Weinberger et al., ICML 2009", url: "https://arxiv.org/abs/0902.2206" },
    { title: "Wide & Deep Learning for Recommender Systems", publisher: "Cheng et al., Google, 2016", url: "https://arxiv.org/abs/1606.07792" },
    { title: "Rules of Machine Learning", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
  ],
};
