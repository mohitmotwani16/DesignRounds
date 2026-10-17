export default {
  blocks: [
    { type: "p", text: "A production **machine-learning system** includes much more than a model. It moves data into training and feature pipelines, records model versions and evaluation results, deploys an artifact safely, serves predictions within a latency and cost budget, and observes whether the model still works on live traffic." },

    { type: "h2", text: "The training-to-serving lifecycle" },
    { type: "diagram", kind: "flow", caption: "Offline data and features produce a versioned model; the serving path uses compatible features, records outcomes, and feeds monitoring and retraining.", nodes: [
      { id: "data", label: "Events + labels", sub: "governed history", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "features", label: "Feature pipelines", sub: "offline + online", col: 1.3, row: 1, tone: "accent" },
      { id: "train", label: "Training", sub: "reproducible job", col: 2.6, row: 0, tone: "accent" },
      { id: "registry", label: "Model registry", sub: "artifact + metrics", col: 3.8, row: 0, shape: "db", tone: "cache" },
      { id: "serve", label: "Inference service", sub: "versioned rollout", col: 5, row: 1, tone: "accent" },
      { id: "client", label: "Product", sub: "prediction + fallback", col: 6.2, row: 1, shape: "pill" },
      { id: "monitor", label: "Monitoring", sub: "quality · drift · cost", col: 3.8, row: 2, shape: "db", tone: "queue" },
    ], edges: [
      { from: "data", to: "features" }, { from: "features", to: "train" }, { from: "train", to: "registry" },
      { from: "registry", to: "serve" }, { from: "features", to: "serve", label: "online values" },
      { from: "serve", to: "client" }, { from: "serve", to: "monitor", dashed: true },
      { from: "monitor", to: "train", label: "retrain / review", dashed: true },
    ] },
    { type: "p", text: "The most important boundary is **offline versus online**. Offline jobs can process large historical datasets and tolerate minutes or hours. Online inference must meet the product's request latency and availability targets. The two paths must agree on feature definitions and transformations, or training-serving skew can make a well-scoring model fail in production." },

    { type: "h2", text: "Keep data, features and models reproducible" },
    { type: "ul", items: [
      "Version training code, input snapshots, feature definitions, parameters, and model artifacts; record them together with evaluation results.",
      "A feature store can share definitions between offline training and online inference, but it adds a serving system and consistency contract. Introduce it when reuse or skew is a real problem.",
      "For a label, define when it becomes available. Training on information that arrives after the prediction time creates leakage.",
      "Make training jobs restartable and backfillable. Store intermediate datasets or manifests when recomputing the full pipeline is expensive.",
      "A model registry should track approval state, compatibility, provenance, and rollback-ready prior versions, not just a file location.",
    ] },
    { type: "table", head: ["Workload", "Serving shape", "Trade-off"], rows: [
      ["Low-latency online prediction", "Replicated model service with autoscaling and feature lookup", "Tight latency; control warm-up, concurrency, and feature-store dependency"],
      ["Large offline scoring job", "Batch workers reading a snapshot and writing results", "High throughput; easier retries and cost-efficient accelerators"],
      ["Small model or rules", "In-process inference in the application", "Fewer network hops; model release is coupled to application release"],
      ["Expensive or variable inference", "Queue with bounded workers and status polling", "Protects capacity; adds asynchronous product behavior and queue delay"],
    ] },

    { type: "h2", text: "Release safely and meet product behavior" },
    { type: "p", text: "Expose a stable prediction API that includes a model version, confidence or explanation metadata when useful, and a clearly defined timeout. Deploy a candidate behind a shadow or canary path, compare its quality and latency with the current version, then increase traffic gradually. Keep a fast rollback and a non-ML fallback for cases where the model or feature service is unavailable." },
    { type: "ul", items: [
      "**Capacity**: measure requests per second, model load time, memory, accelerator utilization, and the cost of idle replicas.",
      "**Latency**: budget separately for authentication, feature lookup, preprocessing, inference, and post-processing.",
      "**Reliability**: set a timeout, bound retries, and avoid retry storms on GPU or feature-store overload.",
      "**Privacy**: minimize training and inference data, enforce access controls, and define retention for prompts, features, labels, and predictions.",
      "**Human review**: for consequential predictions, define thresholds, appeal paths, and who can override the output.",
    ] },

    { type: "h2", text: "Monitor the model and the pipeline" },
    { type: "p", text: "Infrastructure health and model quality are different signals. Track request success and latency, but also input distributions, missing-feature rates, prediction distributions, and delayed ground-truth metrics. Drift is a reason to investigate, not proof that quality has fallen; compare against labels and segment results by user cohort or operating condition. Automate retraining only when the data, evaluation, and approval gates are trustworthy." },
    { type: "callout", tone: "warning", text: "A model that is statistically accurate can still be a bad product. Define the business outcome, failure cost, fairness constraints, and fallback behavior before optimizing a single offline metric." },

    { type: "h2", text: "A practical interview sequence" },
    { type: "ol", items: [
      "Clarify the prediction task, label timing, online or batch latency, quality metric, traffic, and failure cost.",
      "Draw the path from source events through feature generation and training to a versioned model.",
      "Explain how online features match training features and how model releases are evaluated and rolled back.",
      "Add timeouts, fallbacks, privacy boundaries, and capacity controls to inference.",
      "Close with drift and outcome monitoring, retraining criteria, and human review where the decision is high impact.",
    ] },
  ],
  uses: [
    { name: "Recommendations", text: "A batch training pipeline can refresh candidate models while an online service combines the active model with fresh user and item features." },
    { name: "Fraud detection", text: "A low-latency model can score a transaction using recent signals, with a rules-based or manual-review path when confidence is low." },
    { name: "Search and ranking", text: "Candidate retrieval and model ranking can scale independently, with model versions and relevance outcomes monitored by cohort." },
  ],
  interview: [
    "Draw data preparation, training, model registry, deployment, inference, and feedback as separate lifecycle steps.",
    "Call out training-serving skew and how shared feature definitions or parity tests detect it.",
    "Give the inference path a latency budget, timeout, capacity limit, and fallback.",
    "Separate infrastructure monitoring from delayed model-quality and drift signals.",
  ],
  related: ["data-engineering-architecture", "batch-vs-stream-processing", "observability", "caching", "delivery-semantics"],
  practice: ["feature-store", "model-serving"],
};
