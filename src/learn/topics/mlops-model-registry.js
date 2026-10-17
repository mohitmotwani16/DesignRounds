export default {
  blocks: [
    { type: "p", text: "**MLOps** is the set of practices that make machine learning systems reproducible, testable and safe to change, in the way DevOps does for software. Its core components are **experiment tracking** (what was tried and how it performed), a **model registry** (which model versions exist, what produced them, and which is in production) and **CI/CD for models** (automated training, validation, approval and deployment). The goal is that any production prediction can be traced back to the code, data and configuration that produced the model." },

    { type: "h2", text: "Why ML needs more than normal CI/CD" },
    { type: "p", text: "In ordinary software, behaviour is determined by code. In ML, behaviour is determined by code **and data and training configuration**, and a model can be retrained with identical code and still behave differently. So you must version all three, test the data as well as the code, and validate the model's quality, not just that it builds." },

    { type: "h2", text: "The model lifecycle" },
    { type: "diagram", kind: "flow", caption: "A training pipeline produces a versioned model; automated checks and an approval promote it through registry stages to deployment.", nodes: [
      { id: "code", label: "Code + config", sub: "git", col: 0, row: 0.4, shape: "pill" },
      { id: "data", label: "Data snapshot", sub: "versioned", col: 0, row: 1.6, shape: "db", tone: "store" },
      { id: "train", label: "Training pipeline", sub: "tracked run", col: 1.3, row: 1, tone: "accent" },
      { id: "reg", label: "Model registry", sub: "candidate → staging → prod", col: 2.6, row: 1, shape: "db", tone: "cache" },
      { id: "val", label: "Validation", sub: "metrics · slices · bias", col: 2.6, row: 2.2, tone: "ok" },
      { id: "deploy", label: "Deployment", sub: "shadow · canary", col: 3.9, row: 1 },
    ], edges: [
      { from: "code", to: "train" }, { from: "data", to: "train" }, { from: "train", to: "reg", label: "register" },
      { from: "reg", to: "val" }, { from: "val", to: "reg", dashed: true, label: "promote" }, { from: "reg", to: "deploy" },
    ] },

    { type: "h2", text: "Experiment tracking" },
    { type: "p", text: "Every training run records its parameters, code version, data snapshot ID, environment, metrics and output artifacts. That turns \"the model from three weeks ago was better, what did we change?\" from archaeology into a query, and it's the foundation for reproducing any model later." },

    { type: "h2", text: "What a model registry holds" },
    { type: "table", head: ["Field", "Why"], rows: [
      ["Model name and version", "Unique, immutable identity for each artifact"],
      ["Artifact location and format", "What serving loads"],
      ["Lineage: training run, code commit, data snapshot, features used", "Reproducibility and debugging"],
      ["Evaluation results, including slices", "Promotion decisions and audits"],
      ["Stage or alias (candidate, staging, production, archived)", "Which version each environment should serve"],
      ["Owner, approvals and change notes", "Accountability, especially in regulated domains"],
      ["Serving signature: input schema and output format", "Prevents deploying a model the service can't call"],
    ] },

    { type: "h2", text: "CI/CD for models" },
    { type: "ul", items: [
      "**Code checks:** unit tests for feature transformations and training code, as in any [CI pipeline](/learn/ci-cd-pipelines).",
      "**Data checks:** schema, volume and distribution validation of the training data before training starts. See [data quality](/learn/data-quality).",
      "**Model checks:** the candidate must beat or match the production model on a fixed benchmark, on every important slice, within latency and size limits.",
      "**Approval:** automated for low-risk models; a human sign-off for high-risk ones such as credit decisions.",
      "**Deployment:** [shadow or canary rollout](/learn/model-serving) with automatic rollback on regressions, and an A/B test when business impact is uncertain.",
      "**Continuous training:** a scheduled or triggered pipeline retrains on fresh data and runs the same gates, so retraining is routine rather than heroic.",
    ] },
    { type: "callout", tone: "tip", text: "Make rollback boring: keep the previous production version in the registry with its serving configuration, and make switching back a one-line change of an alias, not a retraining job." },

    { type: "h2", text: "Maturity levels" },
    { type: "table", head: ["Level", "What it looks like"], rows: [
      ["Manual", "Notebooks, hand-copied model files, deployment by an engineer; hard to reproduce"],
      ["Automated training", "Training is a pipeline with tracked runs and a registry; deployment still manual"],
      ["Automated delivery", "Validated models are promoted and deployed through CI/CD with rollback"],
      ["Continuous training", "Data or schedule triggers retraining; monitoring closes the loop automatically"],
    ] },
  ],
  uses: [
    { name: "Regulated lending", text: "Every credit model version has full lineage, documented validation and a recorded approval before it serves decisions." },
    { name: "Recommendation teams", text: "Daily automated retraining promotes a new model only if it beats production on offline benchmarks and passes a canary." },
    { name: "Platform teams", text: "A shared registry and pipeline templates let many product teams deploy models the same way." },
  ],
  interview: [
    "Version code, data and configuration together, and record lineage in the registry.",
    "Gate promotion on benchmark metrics, slice checks and latency, not just training success.",
    "Deploy with shadow or canary and make rollback a registry alias switch.",
    "Close the loop: monitoring triggers retraining through the same gates.",
  ],
  related: ["model-serving", "ml-model-monitoring", "distributed-training", "ci-cd-pipelines", "machine-learning-system-architecture"],
  practice: ["training-platform", "model-serving", "model-monitoring"],
  reading: [
    { title: "MLOps: Continuous delivery and automation pipelines in machine learning", publisher: "Google Cloud Architecture Center", url: "https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning" },
    { title: "MLflow Model Registry", publisher: "MLflow documentation", url: "https://mlflow.org/docs/latest/model-registry/" },
  ],
};
