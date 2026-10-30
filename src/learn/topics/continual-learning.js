export default {
  blocks: [
    { type: "p", text: "A model starts going stale the day it ships: users change, items change, fraudsters adapt. **Continual learning** is the practice of retraining and redeploying models regularly, from a weekly batch retrain up to models updated every few minutes. In design interviews you should state **how often** the model retrains, **what triggers** it, **how** it trains (from scratch or incrementally), and **how a new version is promoted safely**." },

    { type: "h2", text: "Why models need retraining" },
    { type: "ul", items: [
      "**Data drift:** the input distribution changes (new markets, a new app version, seasonality).",
      "**Concept drift:** the relationship between inputs and labels changes (what counts as fraud this month).",
      "**New entities:** new videos, products and users the old model has never seen, the [cold start](/learn/cold-start-problem) problem.",
      "**Freshness pays:** in fast domains (news, ads, short video) a model trained on yesterday's data measurably beats one trained last week.",
    ] },
    { type: "p", text: "Detecting drift is covered in [model monitoring](/learn/ml-model-monitoring); this page is about the response." },

    { type: "h2", text: "Retraining strategies" },
    { type: "table", head: ["Strategy", "How", "Fits", "Cost"], rows: [
      ["Manual / ad hoc", "Someone reruns the notebook", "Prototypes only", "Low effort, high risk"],
      ["Scheduled batch", "Retrain from scratch daily or weekly on a sliding window", "Most classifiers and rankers", "Moderate, predictable"],
      ["Triggered", "Retrain when drift or quality metrics cross a threshold", "Stable domains with occasional shifts", "Low when calm; needs good monitoring"],
      ["Incremental (warm start)", "Continue training the last model on only the new data", "Large models where full retrains are expensive", "Cheap per update; risk of slowly accumulating errors"],
      ["Online learning", "Update weights on a stream, minutes after events", "Ads CTR, news, trending", "Complex infrastructure and safeguards"],
    ] },
    { type: "diagram", kind: "timeline", caption: "Stateless retraining (top lane) rebuilds the model from a sliding window each time; stateful retraining (bottom lane) warm-starts from the previous model and only adds the newest data.", ticks: ["day 1", "day 2", "day 3", "day 4", "day 5"], spans: [
      { from: 0, to: 2, label: "train on days −30..0", lane: 0, tone: "accent" },
      { from: 2, to: 4, label: "train on days −28..2", lane: 0, tone: "accent" },
      { from: 0, to: 1, label: "base", lane: 1, tone: "store" },
      { from: 1, to: 2, label: "+day 1", lane: 1, tone: "ok" },
      { from: 2, to: 3, label: "+day 2", lane: 1, tone: "ok" },
      { from: 3, to: 4, label: "+day 3", lane: 1, tone: "ok" },
    ] },
    { type: "p", text: "Many teams combine them: incremental updates daily, plus a full retrain from scratch weekly to reset any accumulated drift and pick up feature or architecture changes." },

    { type: "h2", text: "The automated training pipeline" },
    { type: "diagram", kind: "flow", caption: "A continual training pipeline. Every step is automated; a candidate model is only promoted if it passes offline checks, then a shadow or canary stage, against the current production model.", nodes: [
      { id: "trig", label: "Trigger", sub: "schedule or drift", col: 0, row: 1, tone: "muted" },
      { id: "data", label: "Build dataset", sub: "point-in-time", col: 1.2, row: 1, shape: "db", tone: "store" },
      { id: "train", label: "Train", sub: "warm or cold", col: 2.4, row: 1, tone: "accent" },
      { id: "eval", label: "Offline eval", sub: "vs champion", col: 3.6, row: 1, tone: "ok" },
      { id: "reg", label: "Model registry", sub: "candidate", col: 3.6, row: 2.3, shape: "db", tone: "store" },
      { id: "shadow", label: "Shadow / canary", col: 4.8, row: 1 },
      { id: "prod", label: "Production", sub: "champion", col: 4.8, row: 2.3, tone: "ok", shape: "pill" },
    ], edges: [
      { from: "trig", to: "data" }, { from: "data", to: "train" }, { from: "train", to: "eval" }, { from: "eval", to: "reg", label: "pass" },
      { from: "reg", to: "shadow" }, { from: "shadow", to: "prod", label: "promote" },
    ] },
    { type: "ul", items: [
      "**Orchestration:** the pipeline is a DAG in an orchestrator such as Airflow, Kubeflow Pipelines or similar; see [pipeline orchestration](/learn/data-pipeline-orchestration).",
      "**Champion vs challenger:** the new model must beat the current one on the same, freshest held-out data, overall and on key slices.",
      "**Validation gates:** schema checks on data, minimum sample counts, metric thresholds, calibration checks, and prediction distribution sanity.",
      "**Registry and lineage:** each version is stored with its data snapshot, code commit and metrics; see [MLOps](/learn/mlops-model-registry).",
      "**Safe rollout:** shadow traffic, then a canary percentage, then full traffic; automatic rollback on guardrail breaches.",
    ] },

    { type: "h2", text: "Online learning in practice" },
    { type: "p", text: "Ads and news models sometimes update weights continuously from a click stream. The system looks like a stream job that joins impressions to clicks within a label window, produces mini-batches, and updates a parameter server; the serving fleet pulls fresh weights every few minutes." },
    { type: "ul", items: [
      "**Delayed labels:** you can't wait forever for a click. Train on impressions after a short window and correct later, or model the delay explicitly.",
      "**Poisoning and bugs:** a broken logger or a bot attack can corrupt a model in minutes. Keep snapshots, validate each update on a holdout stream, and alert on sudden metric moves.",
      "**Reproducibility:** the model never exists as one clean training run, so snapshot weights regularly.",
    ] },

    { type: "h2", text: "Choosing a cadence" },
    { type: "p", text: "Measure it rather than guess: train models on data ending at different dates and evaluate them all on the same recent week. If a model trained one day ago beats one trained seven days ago by a meaningful margin, retrain daily. If the curve is flat, weekly or monthly is enough, and cheaper." },
    { type: "code", code: `Freshness experiment (offline NDCG@10 on the latest week)
  trained through yesterday   0.412
  trained through 3 days ago  0.409
  trained through 7 days ago  0.401
  trained through 30 days ago 0.383
→ the first week loses ~2.7%; daily retraining is worth its cost here` },
  ],
  uses: [
    { name: "Ads click prediction", text: "Frequent incremental updates because new ads and campaigns appear constantly and click patterns shift by the hour." },
    { name: "Fraud detection", text: "Scheduled retrains on labelled data weeks old, with rules updated faster for newly seen attacks." },
    { name: "Search ranking", text: "Weekly or monthly retrains; query intent drifts slowly, apart from news and seasonal queries." },
  ],
  interview: [
    "State a retraining cadence and justify it with a freshness experiment.",
    "Distinguish full retrains from incremental updates, and say when you'd combine them.",
    "Describe champion-vs-challenger evaluation and the gates before promotion.",
    "Cover rollback and what happens if a bad batch of data reaches training.",
  ],
  related: ["ml-model-monitoring", "mlops-model-registry", "ml-training-data", "model-serving", "ml-platform-architecture"],
  practice: ["training-platform", "model-monitoring"],
  reading: [
    { title: "Real-time machine learning: challenges and solutions", publisher: "Chip Huyen", url: "https://huyenchip.com/2022/01/02/real-time-machine-learning-challenges-and-solutions.html" },
    { title: "Ad Click Prediction: a View from the Trenches", publisher: "McMahan et al., Google, KDD 2013", url: "https://research.google/pubs/ad-click-prediction-a-view-from-the-trenches/" },
  ],
};
