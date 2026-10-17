export default {
  blocks: [
    { type: "p", text: "**Model serving** is how a trained model produces predictions for real users and systems. Predictions can be made in **batch**, precomputed for many entities on a schedule, or **online**, computed per request within a latency budget. Online serving adds the problems of any low-latency service (scaling, tail latency, failures) plus ML-specific ones: fetching features, using accelerators efficiently, and rolling out new model versions safely." },

    { type: "h2", text: "Batch vs online inference" },
    { type: "table", head: ["", "Batch inference", "Online (real-time) inference"], rows: [
      ["When predictions are made", "On a schedule, for all or many entities", "Per request, when the user or system asks"],
      ["Latency", "Minutes to hours; nobody waits", "Milliseconds to a second"],
      ["Freshness", "As old as the last run", "Uses the latest request and context"],
      ["Cost profile", "Efficient: large batches on cheap capacity", "Must be provisioned for peak traffic"],
      ["Failure impact", "A delayed run; serve the previous results", "Requests fail or fall back immediately"],
      ["Examples", "Nightly churn scores, weekly product recommendations by email", "Fraud checks at payment time, search ranking, chat responses"],
    ] },
    { type: "p", text: "Many systems mix both: precompute what you can (embeddings, candidate lists, scores for inactive users), and compute online only what depends on the moment. A third option is **streaming inference**, where a stream processor scores events as they arrive and writes results to a store." },

    { type: "h2", text: "An online serving path" },
    { type: "diagram", kind: "flow", caption: "A prediction request: the caller hits a model service, which fetches features, batches inference on accelerators and logs inputs and outputs for monitoring.", nodes: [
      { id: "client", label: "Caller", sub: "app · API", col: 0, row: 1, shape: "pill" },
      { id: "svc", label: "Model service", sub: "validate · route version", col: 1.3, row: 1, tone: "accent" },
      { id: "feat", label: "Online features", sub: "key-value lookup", col: 2.6, row: 0, shape: "db", tone: "cache" },
      { id: "infer", label: "Inference servers", sub: "dynamic batching · GPU/CPU", col: 2.6, row: 1 },
      { id: "reg", label: "Model registry", sub: "artifacts · versions", col: 2.6, row: 2, shape: "db", tone: "store" },
      { id: "log", label: "Prediction log", col: 3.9, row: 1, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "client", to: "svc" }, { from: "svc", to: "feat" }, { from: "svc", to: "infer" },
      { from: "reg", to: "infer", dashed: true, label: "load" }, { from: "svc", to: "log", dashed: true },
    ] },

    { type: "h2", text: "Latency and throughput" },
    { type: "ul", items: [
      "**Budget the whole path:** network, feature lookup, preprocessing, inference and postprocessing. A 100 ms budget might leave 40 ms for the model itself.",
      "**Dynamic batching:** accelerators are efficient on batches, but requests arrive one at a time. Inference servers queue requests for a few milliseconds and run them together, trading a little latency for much higher throughput.",
      "**Model optimisation:** quantisation (lower-precision weights), distillation into a smaller model, compiled runtimes and pruning cut latency and cost.",
      "**Tail latency:** a slow feature store or garbage-collection pause shows up at p99. Set timeouts and a fallback for every dependency; see [timeouts and retries](/learn/retries-and-timeouts).",
      "**Right hardware:** small tree models are cheapest on CPUs; large neural networks need GPUs or other accelerators, which are expensive to leave idle.",
    ] },

    { type: "h2", text: "Deploying new versions safely" },
    { type: "table", head: ["Strategy", "How it works", "What it catches"], rows: [
      ["Shadow (dark launch)", "New model receives a copy of live traffic; its predictions are logged, not used", "Crashes, latency and prediction distribution differences, with no user impact"],
      ["Canary", "A small percentage of traffic uses the new model, rising if metrics hold", "Real-world regressions at limited blast radius"],
      ["A/B test", "Users are randomly split between models and business metrics are compared", "Whether the new model actually improves outcomes"],
      ["Blue-green", "Switch all traffic to a fully provisioned new version, keeping the old one for rollback", "Fast cutover and rollback"],
    ] },
    { type: "p", text: "Version every model artifact in a [model registry](/learn/mlops-model-registry), keep the previous version warm for instant rollback, and record which model version made each prediction. See also [deployment strategies](/learn/deployment-strategies) and [A/B testing](/learn/ab-testing-experimentation)." },

    { type: "h2", text: "Failure handling" },
    { type: "ul", items: [
      "**Fallbacks:** if the model times out, return a simpler model's answer, a cached prediction, or a safe default (allow the payment and flag for review, show popular items).",
      "**Input validation:** reject or default malformed inputs rather than producing confident nonsense.",
      "**Autoscaling:** scale on queue depth or GPU utilisation, and keep warm capacity because model loading can take minutes. See [autoscaling](/learn/autoscaling).",
      "**Monitoring:** watch latency, error rates and prediction distributions, and feed logged predictions into [model monitoring](/learn/ml-model-monitoring).",
    ] },
  ],
  uses: [
    { name: "Payments fraud", text: "Online models score each transaction within tens of milliseconds, falling back to rules if the model is unavailable." },
    { name: "Marketing", text: "Batch jobs score every customer nightly for churn risk and write results to the CRM." },
    { name: "Search and feeds", text: "Ranking models score hundreds of candidates per request with dynamic batching on GPUs." },
  ],
  interview: [
    "Choose batch or online from freshness and latency needs, and precompute where possible.",
    "Break down the latency budget and mention dynamic batching.",
    "Roll out with shadow traffic and canaries, with instant rollback.",
    "Define a fallback for timeouts and log every prediction with its model version.",
  ],
  related: ["machine-learning-system-architecture", "feature-store", "mlops-model-registry", "ml-model-monitoring", "llm-inference-serving"],
  practice: ["model-serving", "online-fraud-model", "recommendation-engine"],
  reading: [
    { title: "NVIDIA Triton Inference Server: Dynamic batching", publisher: "NVIDIA documentation", url: "https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html" },
    { title: "Rules of Machine Learning", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
  ],
};
