export default {
  blocks: [
    { type: "p", text: "This **ML system design roadmap** is the path from \"I can train a model\" to \"I can design, ship and operate an ML system and defend it in an interview\". It covers how to frame a business problem as an ML task, build training data and labels, engineer features and embeddings, choose and train models, serve predictions within a latency budget, prove a model helps with offline metrics and A/B tests, monitor it and break feedback loops, and design the ranking and recommendation systems that most ML interviews are about. It ends with full worked answers to the classic questions. Every step links to a free guide and, where one exists, a practice round." },
    { type: "callout", tone: "tip", text: "ML design rounds reward candidates who talk about data, labels and feedback loops as much as models. If you only have a week, do stage 1, stages 3 to 4 (data and features), stage 7 (evaluation) and two worked answers from stage 11." },

    { type: "roadmap", id: "machine-learning" },

    { type: "h2", text: "Who this roadmap is for" },
    { type: "ul", items: [
      "**ML engineers and applied scientists** preparing for ML system design rounds at big tech or ML-heavy startups.",
      "**Software engineers moving into ML**, who know distributed systems but not labels, features or evaluation.",
      "**Data scientists** who want to own models in production, not just notebooks.",
    ] },
    { type: "p", text: "It builds on the [core system design roadmap](/learn/system-design-roadmap): serving paths, caching, queues and storage are the same building blocks. If you're building products on top of large language models rather than training your own models, follow the [AI engineer roadmap](/learn/ai-engineering-roadmap) instead or as well." },

    { type: "h2", text: "What an ML system looks like end to end" },
    { type: "diagram", kind: "flow", caption: "The parts of a production ML system that this roadmap walks through, in stage order. Most interview questions ask you to design this loop for one product.", nodes: [
      { id: "frame", label: "Framing", sub: "stage 1", col: 0, row: 1, tone: "accent" },
      { id: "data", label: "Data + labels", sub: "stage 3", col: 1.2, row: 1, shape: "db", tone: "store" },
      { id: "feat", label: "Features", sub: "stage 4", col: 2.4, row: 1 },
      { id: "train", label: "Training", sub: "stage 5", col: 3.6, row: 1, tone: "accent" },
      { id: "serve", label: "Serving", sub: "stage 6", col: 4.8, row: 1, tone: "ok" },
      { id: "eval", label: "Evaluation", sub: "stage 7", col: 4.8, row: 2.3 },
      { id: "mon", label: "Monitoring", sub: "stage 8", col: 2.4, row: 2.3, tone: "danger" },
    ], edges: [
      { from: "frame", to: "data" }, { from: "data", to: "feat" }, { from: "feat", to: "train" }, { from: "train", to: "serve" }, { from: "serve", to: "eval" }, { from: "eval", to: "mon" }, { from: "mon", to: "data", dashed: true, label: "retrain" },
    ] },

    { type: "h2", text: "The ML system design interview framework" },
    { type: "table", head: ["Step", "Questions to answer", "Guide"], rows: [
      ["1. Clarify", "Business goal, scale, latency, constraints, existing data", "[ML interview framework](/learn/ml-system-design-interview)"],
      ["2. Frame", "Input, output, label, task type; is ML even needed?", "[Problem framing](/learn/ml-problem-framing)"],
      ["3. Data", "Sources, labels, sampling, splits, leakage", "[Training data](/learn/ml-training-data), [labeling](/learn/data-labeling)"],
      ["4. Features and model", "Feature groups, encodings, baseline then stronger model", "[Feature engineering](/learn/feature-engineering), [choosing a model](/learn/ml-model-selection)"],
      ["5. Evaluation", "Offline metric, online metric, guardrails, experiment design", "[ML evaluation](/learn/ml-evaluation-metrics), [A/B testing](/learn/ab-testing-experimentation)"],
      ["6. Serving", "Batch or online, multi-stage funnel, latency budget, fallback", "[Model serving](/learn/model-serving)"],
      ["7. Monitoring", "Drift, delayed labels, retraining, feedback loops", "[Monitoring](/learn/ml-model-monitoring), [retraining](/learn/continual-learning)"],
    ] },

    { type: "h2", text: "Core tools by category" },
    { type: "table", head: ["Category", "Common examples", "Guide"], rows: [
      ["Data processing", "Spark, warehouse SQL, Flink for streams", "[Data engineering architecture](/learn/data-engineering-architecture)"],
      ["Feature stores", "Feast, managed cloud feature stores, in-house", "[Feature stores](/learn/feature-store)"],
      ["Training", "PyTorch, TensorFlow, XGBoost / LightGBM, Ray", "[Distributed training](/learn/distributed-training)"],
      ["Experiment tracking and registry", "MLflow, Weights & Biases, cloud registries", "[MLOps](/learn/mlops-model-registry)"],
      ["Orchestration", "Airflow, Kubeflow Pipelines, Dagster", "[Retraining pipelines](/learn/continual-learning)"],
      ["Serving", "Triton, TorchServe, KServe, ONNX Runtime", "[Model serving](/learn/model-serving)"],
      ["Vector search", "FAISS, ScaNN, vector databases", "[Vector databases](/learn/vector-databases)"],
    ] },
    { type: "p", text: "As in every design round, interviewers care that you know what each category does and when you'd skip it, not which product you'd buy." },

    { type: "h2", text: "An eight-week plan" },
    { type: "table", head: ["Week", "Stages", "Practise"], rows: [
      ["1", "1-2", "Learn the framework. Frame three problems (feed, fraud, ETA) in one paragraph each: goal, label, task type, metric."],
      ["2", "3", "For a recommender, write how one training row is built, the label window, the split, and two leakage risks."],
      ["3", "4", "List features by group for fraud detection; mark which come from batch, stream or the request. Design the [feature store round](/system-design/feature-store)."],
      ["4", "5-6", "Take a model from training to a canary deployment and back; then the [model serving round](/system-design/model-serving)."],
      ["5", "7-8", "For each design so far, name offline and online metrics, guardrails, drift alerts and the feedback loop. Try the [model monitoring round](/system-design/model-monitoring)."],
      ["6", "9", "Design the full funnel for a video recommender, then the free [recommendation engine round](/system-design/recommendation-engine)."],
      ["7", "10-11", "Study two worked answers ([ads](/learn/design-ad-click-prediction), [fraud](/learn/design-fraud-detection-system)), then redraw them from memory. Do the [fraud scoring round](/system-design/online-fraud-model)."],
      ["8", "11-12", "Timed mock rounds from the [question list](/learn/ml-system-design-interview-questions); read the [AI engineer roadmap](/learn/ai-engineering-roadmap) intro if your target role touches LLMs."],
    ] },

    { type: "h2", text: "Skills checklist" },
    { type: "ul", items: [
      "Turn a business goal into a label and say what makes the proxy imperfect.",
      "Build a point-in-time correct training set and a time-based split.",
      "Choose encodings by cardinality and explain training-serving skew.",
      "Justify a model by data, latency and interpretability, starting from a baseline.",
      "Draw a retrieve-rank-rerank funnel with counts and per-stage latency.",
      "Pick offline and online metrics and guardrails, and explain calibration.",
      "Describe drift detection, retraining cadence and safe promotion.",
      "Spot a feedback loop and propose exploration and a holdout.",
    ] },
  ],
  related: ["ml-system-design-interview", "ml-system-design-interview-questions", "machine-learning-system-architecture", "recommendation-system-design", "ai-engineering-roadmap", "feature-store"],
  practice: ["ad-click-prediction", "recommendation-engine", "video-recommendations", "feed-ranking", "search-ranking", "feature-store", "model-serving", "online-fraud-model"],
  reading: [
    { title: "Rules of Machine Learning: Best Practices for ML Engineering", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
    { title: "Hidden Technical Debt in Machine Learning Systems", publisher: "Sculley et al., NeurIPS 2015", url: "https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html" },
    { title: "Designing Machine Learning Systems", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" },
  ],
};
