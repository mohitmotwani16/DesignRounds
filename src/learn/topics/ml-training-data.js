export default {
  blocks: [
    { type: "p", text: "In production ML, the **training data** usually matters more than the model. This guide covers how training examples are built from logs, how to **sample** them, how to **split** them without peeking into the future, how to handle **class imbalance**, and the forms of **data leakage** that make a model look excellent offline and fail on day one." },

    { type: "h2", text: "Where training examples come from" },
    { type: "p", text: "Most ML systems build examples by joining what the system **showed or decided** with what **happened next**. A recommender logs every impression, then joins clicks and purchases onto it. A fraud model logs every scored transaction, then joins chargebacks weeks later." },
    { type: "diagram", kind: "flow", caption: "Building a training set: impressions are the rows, outcomes become labels, and features are looked up as they were at the moment of the impression (point-in-time).", nodes: [
      { id: "imp", label: "Impression log", sub: "what was shown", col: 0, row: 0, shape: "queue", tone: "queue" },
      { id: "out", label: "Outcome log", sub: "clicks · orders", col: 0, row: 1.4, shape: "queue", tone: "queue" },
      { id: "join", label: "Label join", sub: "within window", col: 1.4, row: 0.7, tone: "accent" },
      { id: "fs", label: "Feature snapshots", sub: "as of time t", col: 2.8, row: 1.6, shape: "db", tone: "store" },
      { id: "pit", label: "Point-in-time join", col: 2.8, row: 0.7, tone: "accent" },
      { id: "ds", label: "Versioned dataset", sub: "train / val / test", col: 4.2, row: 0.7, shape: "db", tone: "ok" },
    ], edges: [
      { from: "imp", to: "join" }, { from: "out", to: "join" }, { from: "join", to: "pit" }, { from: "fs", to: "pit" }, { from: "pit", to: "ds" },
    ] },
    { type: "ul", items: [
      "**Label window:** how long to wait for an outcome. A click within 30 minutes, a purchase within 7 days, a chargeback within 90 days. Too short loses positives; too long delays training.",
      "**Point-in-time correctness:** features must be read as of the impression time, not today. A [feature store](/learn/feature-store) does this join for you.",
      "**Logging the decision context:** position on screen, model version, and the score the model gave. You need them later for debiasing and debugging.",
    ] },

    { type: "h2", text: "Sampling strategies" },
    { type: "table", head: ["Strategy", "How it works", "When to use"], rows: [
      ["Random", "Every example has the same chance", "Default when data is plentiful and balanced"],
      ["Stratified", "Sample within each class or segment", "Keep rare classes and small countries represented"],
      ["Negative downsampling", "Keep all positives, a fraction of negatives", "Click and fraud data with very few positives"],
      ["Reservoir", "Keep a fixed-size uniform sample of a stream", "Sampling from an unbounded event stream"],
      ["Importance", "Weight examples by how likely they were to be sampled", "Correcting for a biased logging policy"],
      ["Hard negative mining", "Pick negatives the model currently confuses", "Training retrievers and embedding models"],
    ] },
    { type: "callout", tone: "warning", text: "Downsampling negatives changes the base rate the model sees, so its raw probabilities are too high. If anything downstream needs real probabilities (ad auctions, thresholds), recalibrate: with negatives kept at rate w, the corrected probability is p / (p + (1 − p) / w)." },

    { type: "h2", text: "Splitting: train, validation, test" },
    { type: "p", text: "Random splits leak information whenever the data has time or identity structure. In production systems the default is a **time-based split**: train on the past, validate and test on what came after." },
    { type: "diagram", kind: "timeline", caption: "A time-based split. The model never trains on anything later than what it is evaluated on, which mirrors how it will be used. A gap stops label windows from overlapping the test period.", ticks: ["week 1", "week 2", "week 3", "week 4", "week 5", "week 6", "week 7", "week 8"], spans: [
      { from: 0, to: 5, label: "train", tone: "accent" },
      { from: 5.2, to: 6, label: "validate", tone: "store" },
      { from: 6.2, to: 7, label: "test", tone: "ok" },
    ], gaps: [{ from: 5, to: 5.2, label: "gap" }] },
    { type: "ul", items: [
      "**Group splits:** if one user contributes many rows, keep all of a user's rows in the same split, or the model memorises the user.",
      "**Rolling (backtest) evaluation:** retrain and test across several windows to see how stable the gain is.",
      "**Slices:** report metrics for new users, small markets, and each device type, not only the average.",
    ] },

    { type: "h2", text: "Class imbalance" },
    { type: "p", text: "Fraud might be 0.1% of payments and ad clicks 1% of impressions. A model that always predicts the majority class looks accurate and is useless. Options, roughly in the order to try them:" },
    { type: "ol", items: [
      "**Use the right metric:** precision, recall and PR-AUC instead of accuracy. See [ML evaluation](/learn/ml-evaluation-metrics).",
      "**Choose the threshold** from the cost of each error, not 0.5.",
      "**Reweight the loss** so minority errors cost more (class weights, focal loss).",
      "**Resample:** downsample the majority or oversample the minority (synthetic oversampling is rarely needed with large data).",
      "**Collect more positives:** route uncertain cases to reviewers, which also feeds [labelling](/learn/data-labeling).",
    ] },

    { type: "h2", text: "Data leakage" },
    { type: "p", text: "**Leakage** is when a feature contains information that won't be available at prediction time, or that encodes the label. Offline metrics become unbelievably good; production metrics collapse." },
    { type: "table", head: ["Leak", "Example", "Fix"], rows: [
      ["Future data in features", "\"Orders in the last 7 days\" computed at training time includes orders after the impression", "Point-in-time feature joins"],
      ["Label proxy as feature", "A `refund_issued` flag used to predict fraud", "Audit features against the label's causal path"],
      ["Random split on time data", "Training on Friday, testing on Thursday", "Time-based splits"],
      ["Duplicates across splits", "The same image or user in train and test", "Deduplicate; split by group"],
      ["Preprocessing on all data", "Normalising with the mean of the full dataset", "Fit transforms on train only"],
    ] },

    { type: "h2", text: "Dataset versioning and lineage" },
    { type: "p", text: "Every trained model should point to the exact dataset snapshot, feature definitions and code it came from, so you can reproduce it, compare it and roll back. Store datasets as immutable, versioned tables (for example with an [open table format](/learn/open-table-formats)) and record the version in the [model registry](/learn/mlops-model-registry)." },
  ],
  uses: [
    { name: "Recommendations and ads", text: "Impression logs joined to clicks and conversions, with heavy negative downsampling and calibration afterwards." },
    { name: "Fraud and risk", text: "Labels arrive weeks later, so training uses data old enough to be labelled and features rebuilt point-in-time." },
    { name: "Forecasting and ETA", text: "Strictly time-based splits and rolling backtests, since the future always looks different from the past." },
  ],
  interview: [
    "Describe exactly how a training row is built: the unit, the label window and the feature timestamp.",
    "Use a time-based split and explain why a random split would leak.",
    "If you downsample negatives, say how you recalibrate.",
    "Name one leakage risk specific to the problem and how you'd prevent it.",
  ],
  related: ["data-labeling", "feature-store", "ml-problem-framing", "ml-evaluation-metrics", "ml-feedback-loops"],
  practice: ["online-fraud-model", "recommendation-engine", "feature-store"],
  reading: [
    { title: "Designing Machine Learning Systems", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" },
    { title: "Practical Lessons from Predicting Clicks on Ads at Facebook", publisher: "He et al., ADKDD 2014", url: "https://dl.acm.org/doi/10.1145/2648584.2648589" },
  ],
};
