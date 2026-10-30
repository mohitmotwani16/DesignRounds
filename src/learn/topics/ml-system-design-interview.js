export default {
  blocks: [
    { type: "p", text: "A **machine learning system design interview** asks you to design a product feature that depends on a model, such as a video feed, an ad ranker or a fraud detector, and to defend every choice from the business goal down to how the model is monitored. It is not a modelling quiz. Interviewers want to see that you can turn a vague goal into a learnable problem, find the data and labels, pick a sensible model, serve it within a latency budget, prove it works and keep it working. This guide gives you a **seven-step framework**, a time plan for a 45-minute round, and what separates a pass from a strong pass." },
    { type: "callout", tone: "tip", text: "The most common failure is jumping to a model architecture in minute two. Spend the first ten minutes on the problem, the metric and the data; most of the score is earned there." },

    { type: "h2", text: "How ML design rounds differ from backend rounds" },
    { type: "table", head: ["", "Backend system design", "ML system design"], rows: [
      ["Core question", "Can the system store, move and serve data correctly at scale?", "Does the system make *good decisions*, and can you prove and keep it?"],
      ["Requirements", "Features, QPS, latency, consistency", "Business objective, ML objective, labels, latency and freshness"],
      ["Main components", "APIs, databases, caches, queues", "Data pipelines, features, training, model serving, evaluation, monitoring"],
      ["Typical deep dives", "Sharding, caching, consistency", "Label quality, training-serving skew, ranking stages, metrics, drift"],
      ["Failure you must plan for", "A server or region goes down", "The model is silently wrong, stale or biased"],
    ] },
    { type: "p", text: "You still need ordinary building blocks: the serving path is a low-latency service, features come from [data pipelines](/learn/data-engineering-architecture), and candidates often come from a [vector index](/learn/vector-databases). The ML round adds the question of decision quality on top." },

    { type: "h2", text: "The seven-step framework" },
    { type: "diagram", kind: "flow", caption: "The seven steps in order. Steps 1 to 3 decide what you build; steps 4 to 7 decide whether it works in production. The dashed edge is the feedback loop that closes the system.", nodes: [
      { id: "req", label: "1. Clarify", sub: "goal · scale · limits", col: 0, row: 0, tone: "accent" },
      { id: "frame", label: "2. Frame as ML", sub: "objective · label", col: 1.2, row: 0, tone: "accent" },
      { id: "data", label: "3. Data", sub: "sources · labels", col: 2.4, row: 0, tone: "store", shape: "db" },
      { id: "feat", label: "4. Features + model", sub: "baseline first", col: 3.6, row: 0 },
      { id: "eval", label: "5. Evaluation", sub: "offline + online", col: 3.6, row: 1.4, tone: "ok" },
      { id: "serve", label: "6. Serving", sub: "latency · scale", col: 2.4, row: 1.4 },
      { id: "mon", label: "7. Monitoring", sub: "drift · retrain", col: 1.2, row: 1.4, tone: "danger" },
    ], edges: [
      { from: "req", to: "frame" }, { from: "frame", to: "data" }, { from: "data", to: "feat" }, { from: "feat", to: "eval" },
      { from: "eval", to: "serve" }, { from: "serve", to: "mon" }, { from: "mon", to: "data", dashed: true, label: "new labels" },
    ] },

    { type: "h3", text: "1. Clarify requirements" },
    { type: "p", text: "Ask about the **business objective** (more bookings? less fraud loss?), the **users and scale** (daily active users, items in the catalogue, requests per second), **latency** (a feed must render in about 200 ms; a nightly email can take hours), **constraints** (on-device, privacy, regulated domain), and **what data already exists**. Write the answers down; you will refer back to them." },
    { type: "h3", text: "2. Frame the problem as an ML task" },
    { type: "p", text: "Translate the goal into something a model can learn: the **input**, the **output**, the **label** and the **task type** (binary classification, regression, ranking, retrieval). \"Increase watch time\" might become \"predict the probability a user watches more than half of a video, and rank by expected watch time\". Say whether ML is even needed; a rule may do. See [ML problem framing](/learn/ml-problem-framing)." },
    { type: "h3", text: "3. Data and labels" },
    { type: "p", text: "Where do training examples come from, how are they labelled (natural labels like clicks, or human annotation), how much is there, how biased is it, and how will you split it without leaking the future into the past? See [training data](/learn/ml-training-data) and [data labeling](/learn/data-labeling)." },
    { type: "h3", text: "4. Features and model" },
    { type: "p", text: "Name feature groups (user, item, context, user-item interaction), how each is computed and whether it's available at prediction time. Then propose a **baseline** (popularity, logistic regression) before a stronger model (gradient-boosted trees, a deep network, a two-tower retriever). Justify the choice by data size, latency and interpretability. See [feature engineering](/learn/feature-engineering) and [choosing a model](/learn/ml-model-selection)." },
    { type: "h3", text: "5. Evaluation" },
    { type: "p", text: "Pick an **offline metric** that matches the task (PR-AUC for rare positives, NDCG for ranking, MAE for regression) and an **online metric** tied to the business goal, plus **guardrails** that must not get worse. Explain how an [A/B test](/learn/ab-testing-experimentation) decides the launch. See [ML evaluation](/learn/ml-evaluation-metrics)." },
    { type: "h3", text: "6. Serving" },
    { type: "p", text: "Batch or online prediction? Where do features come from at request time ([feature store](/learn/feature-store))? For ranking, sketch the [multi-stage funnel](/learn/two-stage-processing). Give a latency budget per stage and a fallback when the model is slow or down. See [model serving](/learn/model-serving)." },
    { type: "h3", text: "7. Monitoring and iteration" },
    { type: "p", text: "Watch operational metrics (latency, errors), data health (missing features, distribution shift) and model quality (delayed labels, calibration). Decide the retraining cadence and how a new model is promoted. Mention [feedback loops](/learn/ml-feedback-loops) if the model shapes its own training data. See [model monitoring](/learn/ml-model-monitoring)." },

    { type: "h2", text: "A 45-minute time plan" },
    { type: "diagram", kind: "segments", width: 780, caption: "Where the minutes go in a 45-minute round. Framing, data and evaluation together take about half the time, which matches where the marks are.", total: 45, lanes: [{ parts: [
      { label: "Clarify", sub: "5 min", size: 5, tone: "accent" },
      { label: "Frame", sub: "5 min", size: 5, tone: "accent" },
      { label: "Data", sub: "6 min", size: 6, tone: "store" },
      { label: "Features + model", sub: "10 min", size: 10 },
      { label: "Eval", sub: "6 min", size: 6, tone: "ok" },
      { label: "Serving", sub: "8 min", size: 8, tone: "cache" },
      { label: "Monitor", sub: "5 min", size: 5, tone: "danger" },
    ] }] },
    { type: "p", text: "In a 60-minute round, spend the extra time on the deep dive the interviewer picks. Interviewers often stop you after the overview and say \"let's go deeper on features\" or \"how would you evaluate this\"; that's a good sign, not an interruption." },

    { type: "h2", text: "What each level is expected to show" },
    { type: "table", head: ["Level", "Expected", "Signals that stand out"], rows: [
      ["Junior / new grad", "A correct end-to-end pipeline, sensible features and metrics", "A baseline first; separating offline and online metrics"],
      ["Mid-level", "Trade-offs at every step, a realistic serving path", "Point-in-time correct training data; latency budget per stage"],
      ["Senior", "Owns ambiguity: framing, metrics, launch criteria, failure modes", "Feedback loops, calibration, delayed labels, cost of mistakes"],
      ["Staff", "Platform and organisational view", "Reusable features and evaluation across teams; when *not* to use ML"],
    ] },

    { type: "h2", text: "Common mistakes" },
    { type: "ul", items: [
      "**Model first.** Naming a transformer before agreeing on the label. The label decides everything downstream.",
      "**One metric.** Only accuracy, on a problem with 0.1% positives, where predicting \"never fraud\" scores 99.9%.",
      "**Features that don't exist at serving time.** Using \"total purchases this week\" computed with data from after the prediction moment, a classic [data leak](/learn/ml-training-data).",
      "**No baseline.** Without one you can't say whether the complex model is worth its cost.",
      "**Ignoring the serving path.** A 200 ms budget can't run a heavy model over a million items; you need [candidate generation](/learn/recommendation-system-design) first.",
      "**Forgetting the loop.** No word on drift, retraining or how the model's own outputs bias the next training set.",
    ] },

    { type: "h2", text: "A worked opening: \"Design a restaurant recommender\"" },
    { type: "code", code: `Clarify   : goal = more orders from the home screen; 20M DAU; 500K restaurants;
            home screen must render in < 300 ms; we log impressions, clicks, orders.
Frame     : rank restaurants per user; label = ordered within the session after
            an impression (clicks are a secondary, noisier signal).
Data      : impression logs joined to orders; negatives = shown but not ordered;
            split by time (train on weeks 1-6, test on week 7).
Model     : candidates = nearby + open now + two-tower retrieval (~1,000);
            ranker = gradient-boosted trees, then a multi-task deep model.
Evaluate  : offline NDCG@10 and recall@100; online orders per session,
            guardrails = delivery time, cancellation rate, restaurant diversity.
Serve     : precomputed user embeddings, online ANN + ranker, cache per area;
            fallback = popular-nearby list if the ranker times out.
Monitor   : feature null rates, score distribution, daily retrain, weekly review
            of new-restaurant exposure (cold start).` },
    { type: "p", text: "Every line is a decision the interviewer can probe. Full walkthroughs of this shape are in the [ML system design examples](/learn/design-video-recommendation-system), and a list of what gets asked is in [ML system design interview questions](/learn/ml-system-design-interview-questions)." },
  ],
  uses: [
    { name: "Applied ML and ML engineer loops", text: "Most big tech ML loops include one or two ML design rounds next to coding and ML fundamentals; ranking, recommendations, ads and integrity are the usual themes." },
    { name: "Data science and research engineer roles", text: "A lighter version that leans on framing, metrics and experimentation, often with a product-sense flavour." },
    { name: "AI engineer roles", text: "Similar structure, but the system is built around a foundation model; see the [AI engineer interview framework](/learn/ai-engineer-system-design-interview)." },
  ],
  interview: [
    "Open with clarifying questions and write the business objective and constraints down.",
    "State the label and task type in one sentence before naming any model.",
    "Propose a baseline, then a stronger model, and say what would justify the switch.",
    "Name an offline metric, an online metric and at least two guardrails.",
    "Close with monitoring, retraining and the feedback loop.",
  ],
  related: ["ml-problem-framing", "machine-learning-system-architecture", "ml-system-design-interview-questions", "ml-evaluation-metrics", "recommendation-system-design", "ai-engineer-system-design-interview"],
  practice: ["ad-click-prediction", "recommendation-engine", "video-recommendations", "online-fraud-model", "feature-store", "model-serving"],
  reading: [
    { title: "Rules of Machine Learning: Best Practices for ML Engineering", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
    { title: "Designing Machine Learning Systems", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" },
    { title: "CS 329S: Machine Learning Systems Design", publisher: "Stanford University", url: "https://stanford-cs329s.github.io/" },
  ],
};
