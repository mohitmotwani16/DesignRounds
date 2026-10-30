export default {
  blocks: [
    { type: "p", text: "Once a company has more than a handful of models, every team rebuilding its own pipelines, feature code and serving stack becomes the bottleneck. An **ML platform** gives teams shared, self-service building blocks: data and features, training orchestration, experiment tracking, a model registry, serving and monitoring. Uber's Michelangelo, and similar internal platforms at most large tech companies, follow this shape. Interviewers ask about it directly (\"design an ML platform\") and indirectly whenever you say \"the feature store\" or \"the registry\"." },

    { type: "h2", text: "The layers of an ML platform" },
    { type: "diagram", kind: "flow", caption: "An ML platform's main layers. Data flows left to right into features and training; models flow into a registry and out to serving; monitoring feeds back into retraining.", zones: [
      { label: "data", from: [0, 0], to: [0, 2], tone: "muted" },
      { label: "build", from: [1.3, 0], to: [2.6, 2.5], tone: "accent" },
      { label: "run", from: [3.9, 0], to: [5.2, 2], tone: "ok" },
    ], nodes: [
      { id: "lake", label: "Lake / warehouse", col: 0, row: 0.3, shape: "db", tone: "store" },
      { id: "stream", label: "Event streams", col: 0, row: 1.7, shape: "queue", tone: "queue" },
      { id: "fs", label: "Feature store", sub: "offline + online", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "train", label: "Training service", sub: "jobs on GPU pool", col: 2.6, row: 0.3, tone: "accent" },
      { id: "exp", label: "Experiment tracking", col: 2.6, row: 2.5 },
      { id: "reg", label: "Model registry", sub: "versions · lineage", col: 3.9, row: 0.3, shape: "db", tone: "store" },
      { id: "serve", label: "Serving", sub: "online + batch", col: 3.9, row: 1.7, tone: "ok" },
      { id: "mon", label: "Monitoring", sub: "drift · quality", col: 5.2, row: 1, tone: "danger" },
    ], edges: [
      { from: "lake", to: "fs" }, { from: "stream", to: "fs" }, { from: "fs", to: "train" }, { from: "train", to: "exp" }, { from: "train", to: "reg" },
      { from: "reg", to: "serve" }, { from: "fs", to: "serve", dashed: true, label: "online features" }, { from: "serve", to: "mon" }, { from: "mon", to: "train", dashed: true },
    ] },

    { type: "h2", text: "Each component and what it owns" },
    { type: "table", head: ["Component", "Owns", "Guide"], rows: [
      ["Feature store", "Feature definitions, point-in-time training sets, low-latency online lookups", "[Feature stores](/learn/feature-store)"],
      ["Training service", "Job submission, GPU scheduling, distributed training, retries, checkpoints", "[Distributed training](/learn/distributed-training)"],
      ["Pipelines / orchestration", "Repeatable DAGs: build data, train, evaluate, register", "[Retraining](/learn/continual-learning)"],
      ["Experiment tracking", "Parameters, metrics, artifacts and comparisons for every run", "[MLOps](/learn/mlops-model-registry)"],
      ["Model registry", "Versions, lineage, stage (candidate, production), approvals", "[MLOps](/learn/mlops-model-registry)"],
      ["Serving", "Online endpoints with autoscaling, batch scoring jobs, shadow and canary routing", "[Model serving](/learn/model-serving)"],
      ["Evaluation and experiments", "Offline evaluation suites and online A/B testing", "[A/B testing](/learn/ab-testing-experimentation)"],
      ["Monitoring", "Latency, errors, feature health, drift, delayed-label quality", "[Model monitoring](/learn/ml-model-monitoring)"],
    ] },

    { type: "h2", text: "The self-service workflow" },
    { type: "diagram", kind: "sequence", caption: "What a model team does on a mature platform: declare, train, compare, register and deploy, mostly through configuration rather than custom infrastructure.", actors: ["ML engineer", "Platform", "Registry", "Serving"], steps: [
      { from: 0, to: 1, label: "declare features + training config" },
      { note: "build point-in-time dataset · train on GPU pool", over: [1, 2] },
      { from: 1, to: 0, label: "metrics vs current production model" },
      { from: 0, to: 2, label: "register v42 as candidate" },
      { from: 2, to: 3, label: "deploy v42 in shadow, then 5% canary" },
      { note: "guardrails healthy for 24 h", over: [3] },
      { from: 3, to: 2, label: "promote v42 to production" },
    ] },

    { type: "h2", text: "Design decisions" },
    { type: "ul", items: [
      "**Paved road vs flexibility:** standard templates for common model types (tabular classifier, ranker, embedding model) cover most teams; an escape hatch lets advanced teams bring custom containers.",
      "**Compute scheduling:** GPU pools are expensive. Use queues with quotas per team, priorities (production retrains over experiments), preemption with checkpointing, and bin packing on [Kubernetes](/learn/kubernetes-architecture).",
      "**Multi-tenancy:** isolate teams' data and quotas, and attribute cost per team and per model; see [multi-tenancy](/learn/multi-tenancy).",
      "**Reproducibility:** pin data snapshots, feature versions, code commits and container images for every run.",
      "**Governance:** approvals for models in regulated areas, model cards, access controls on sensitive features, audit logs.",
    ] },

    { type: "h2", text: "Scaling numbers to reason with" },
    { type: "code", code: `Organisation : 40 model teams, 300 production models
Retraining   : 200 daily, 100 weekly → ~215 training jobs/day
GPU usage    : avg job 4 GPUs × 3 h = 12 GPU-h → ~2,600 GPU-h/day ≈ 110 GPUs busy
               + experiments (often 2-3× production) → plan ~300-400 GPUs with queuing
Serving      : 300 endpoints; 20 high-QPS (10K+ RPS) need dedicated autoscaled pools,
               the rest share multi-model servers to avoid idle replicas
Registry     : 300 models × ~50 versions kept = 15K versions with lineage metadata` },

    { type: "h2", text: "Build vs buy" },
    { type: "p", text: "Managed cloud ML services and open-source stacks (for example Kubeflow, MLflow, Feast, Ray) cover much of this. Companies build their own when scale, latency or integration needs exceed them, but even then they usually assemble open-source pieces. In an interview, naming the layer and its contract matters more than the product." },
  ],
  uses: [
    { name: "Ride-hailing and delivery", text: "One platform serves ETA, pricing, fraud and matching models with shared real-time features." },
    { name: "Social and media", text: "Platforms built around ranking: huge embedding tables, frequent retrains and heavy online experimentation." },
    { name: "Banks and insurers", text: "Platforms that add governance: approvals, explainability reports and audit trails for every model version." },
  ],
  interview: [
    "Draw the layers: data and features, training, registry, serving, monitoring.",
    "Describe the self-service workflow from config to production.",
    "Address GPU scheduling, quotas and cost attribution.",
    "Explain how reproducibility and lineage are enforced.",
  ],
  related: ["machine-learning-system-architecture", "feature-store", "mlops-model-registry", "model-serving", "distributed-training", "internal-developer-platform"],
  practice: ["training-platform", "feature-store", "model-serving"],
  reading: [
    { title: "Meet Michelangelo: Uber's Machine Learning Platform", publisher: "Uber Engineering", url: "https://www.uber.com/blog/michelangelo-machine-learning-platform/" },
    { title: "Kubeflow documentation", publisher: "Kubeflow", url: "https://www.kubeflow.org/docs/" },
    { title: "Feast documentation", publisher: "Feast", url: "https://docs.feast.dev/" },
  ],
};
