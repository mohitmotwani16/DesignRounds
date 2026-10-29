export default {
  blocks: [
    { type: "p", text: "**ML model monitoring** watches a deployed model to catch when its predictions stop being trustworthy. Models degrade silently: the service stays up and returns answers, but the world it was trained on has changed. Monitoring covers the service itself (latency, errors), the **inputs** (data drift, broken features), the **outputs** (prediction drift) and, when labels eventually arrive, **performance** against reality (concept drift)." },

    { type: "h2", text: "What can go wrong" },
    { type: "table", head: ["Problem", "What changed", "Example"], rows: [
      ["Data drift (covariate shift)", "The distribution of inputs", "A marketing campaign brings many first-time users unlike the training population"],
      ["Concept drift", "The relationship between inputs and the right answer", "Fraudsters change tactics, so old signals no longer predict fraud"],
      ["Label or prior shift", "How common the outcome is", "Default rates rise in a downturn"],
      ["Broken features (pipeline bugs)", "A feature is suddenly null, zero, in different units or stale", "An upstream rename turns `price_rupees` into all nulls"],
      ["Training-serving skew", "Serving computes a feature differently from training", "Different time windows or default values"],
      ["Feedback loops", "The model's own decisions change future data", "Blocked transactions never get fraud labels"],
    ] },

    { type: "h2", text: "What to monitor" },
    { type: "diagram", kind: "flow", caption: "Predictions and features are logged at serving time; monitors compare them to a reference window, and delayed labels feed performance metrics.", nodes: [
      { id: "svc", label: "Model service", col: 0, row: 1, tone: "accent" },
      { id: "log", label: "Prediction log", sub: "features · scores · version", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "labels", label: "Labels (delayed)", sub: "chargebacks · outcomes", col: 1.3, row: 2.2, shape: "db", tone: "store" },
      { id: "mon", label: "Monitors", sub: "drift · quality · performance", col: 2.7, row: 1.4, tone: "ok" },
      { id: "ref", label: "Reference window", sub: "training / last month", col: 2.7, row: 0, shape: "db", tone: "cache" },
      { id: "alert", label: "Alerts + dashboards", col: 4, row: 1.4, shape: "pill" },
    ], edges: [
      { from: "svc", to: "log" }, { from: "log", to: "mon" }, { from: "labels", to: "mon", dashed: true },
      { from: "ref", to: "mon", dashed: true }, { from: "mon", to: "alert" },
    ] },
    { type: "ul", items: [
      "**Service health:** latency, error rate, throughput, fallback rate. These are ordinary [observability](/learn/observability) signals.",
      "**Feature quality:** null rates, out-of-range values, staleness and schema changes per feature. These catch pipeline bugs fastest, and they're the same checks as [data quality](/learn/data-quality).",
      "**Input drift:** compare each feature's distribution with a reference window using measures such as the population stability index (PSI), KL divergence or a Kolmogorov-Smirnov test.",
      "**Prediction drift:** the distribution of scores and the share of positive decisions. A fraud model suddenly flagging 3% of transactions instead of 0.5% needs attention immediately.",
      "**Performance:** precision, recall, calibration or error, once labels arrive, broken down by segment.",
      "**Business outcomes:** the metric the model exists to move.",
    ] },

    { type: "h2", text: "The delayed label problem" },
    { type: "p", text: "Many labels arrive late: a chargeback takes weeks, a loan default takes months, a recommendation's long-term value may never be measured directly. Until then, input and prediction drift are **leading indicators**. Some teams also send a small random sample of cases for human review, or use fast proxy labels (a click instead of a purchase), to estimate performance sooner." },
    { type: "callout", tone: "tip", text: "Drift alone doesn't mean the model is wrong. Seasonal patterns and growth cause harmless drift. Alert on drift in the features that matter most to the model, and investigate before retraining reflexively." },

    { type: "h2", text: "Responding to problems" },
    { type: "ol", items: [
      "**Broken feature or pipeline bug:** fix the data and, if needed, fall back to a previous model or a rule while it's fixed. Retraining on broken data makes things worse.",
      "**Real drift with labels available:** retrain on recent data and validate against the current model on a recent holdout before promoting.",
      "**Scheduled retraining** (daily, weekly) suits fast-changing domains; **triggered retraining** on drift or performance alerts suits stable ones.",
      "**Guard the feedback loop:** keep a small exploration or holdout group so the model still sees outcomes for cases it would have blocked.",
    ] },
  ],
  uses: [
    { name: "Fraud and risk", text: "Daily prediction-rate monitors and weekly performance on matured labels, with a holdout to observe what blocking hides." },
    { name: "Recommendations", text: "Feature freshness and score distribution monitors catch broken pipelines before engagement drops." },
    { name: "Demand forecasting", text: "Forecast error by region is tracked as actuals arrive, triggering retraining after sustained degradation." },
  ],
  interview: [
    "Separate service health, feature quality, drift and performance monitoring.",
    "Log features, predictions and model version at serving time.",
    "Address delayed labels with leading indicators and sampled review.",
    "Distinguish pipeline bugs from real drift before retraining.",
  ],
  related: ["ml-evaluation-metrics", "data-quality", "observability", "model-serving", "feature-store", "continual-learning", "ml-feedback-loops", "llmops-observability"],
  practice: ["model-monitoring", "online-fraud-model"],
  reading: [
    { title: "What is data drift in ML, and how to detect and handle it", publisher: "Evidently AI", url: "https://www.evidentlyai.com/ml-in-production/data-drift" },
    { title: "Hidden Technical Debt in Machine Learning Systems", publisher: "Sculley et al., NeurIPS 2015", url: "https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html" },
  ],
};
