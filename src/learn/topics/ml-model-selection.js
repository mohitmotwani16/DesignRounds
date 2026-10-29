export default {
  blocks: [
    { type: "p", text: "Interviewers don't want the fanciest architecture; they want a model that fits the **data size**, the **latency budget**, the need for **interpretability**, and the **team's ability to run it**, plus a reason to move to something heavier. The reliable path is: a **heuristic baseline**, then a **simple learned model**, then a **stronger model** only when the data and the gain justify it." },

    { type: "h2", text: "The progression to describe" },
    { type: "diagram", kind: "flow", caption: "Each step must beat the previous one on the agreed metric to earn its extra cost. Many production systems stop at gradient-boosted trees.", nodes: [
      { id: "h", label: "Heuristic", sub: "popular, rules", col: 0, row: 0.8, tone: "muted" },
      { id: "lr", label: "Logistic regression", sub: "fast, explainable", col: 1.3, row: 0.8 },
      { id: "gbdt", label: "Gradient-boosted trees", sub: "tabular strength", col: 2.6, row: 0.8, tone: "accent", w: 170 },
      { id: "dnn", label: "Deep network", sub: "ids, text, images", col: 3.9, row: 0.8, tone: "accent" },
      { id: "mt", label: "Multi-task model", sub: "several objectives", col: 5.2, row: 0.8, tone: "ok" },
    ], edges: [
      { from: "h", to: "lr", label: "beats?" }, { from: "lr", to: "gbdt", label: "beats?" }, { from: "gbdt", to: "dnn", label: "beats?" }, { from: "dnn", to: "mt" },
    ] },

    { type: "h2", text: "Model families compared" },
    { type: "table", head: ["Family", "Strengths", "Weaknesses", "Typical use"], rows: [
      ["Heuristics", "No training, transparent, instant", "No personalisation, can't learn", "Baseline, cold start, fallback"],
      ["Logistic / linear regression", "Fast to train and serve, calibrated, explainable", "Needs manual crosses; limited capacity", "First ads and risk models, strong baselines"],
      ["Gradient-boosted trees (XGBoost, LightGBM)", "Excellent on tabular features, little tuning, handles missing values", "Poor with huge sparse ids, raw text or images", "Fraud, ETA, ranking with dense features"],
      ["Deep networks (MLP, wide-and-deep, DLRM)", "Learns embeddings for ids, interactions, scale with data", "Needs lots of data and GPUs, harder to debug", "Large-scale ads, feeds, recommendations"],
      ["Sequence models (transformers, RNNs)", "Use order: session history, text, events", "Costly at serving time", "Next-item prediction, text classification"],
      ["Two-tower / embedding models", "Precomputable item side, fast retrieval", "Limited user-item interaction", "Candidate generation"],
      ["Graph neural networks", "Use relationships between entities", "Complex training and serving", "Friend suggestions, fraud rings"],
      ["Pretrained foundation models", "Strong out of the box on text and images", "Expensive, slower, may need adaptation", "Moderation, search, extraction; see [AI engineering](/learn/ai-engineering-roadmap)"],
    ] },

    { type: "h2", text: "Criteria for choosing" },
    { type: "ul", items: [
      "**Data size and type:** thousands of tabular rows favour trees; billions of sparse interactions favour deep models with embeddings.",
      "**Latency and cost:** a model scoring 500 candidates in 50 ms on CPU limits depth; see [model compression](/learn/model-compression).",
      "**Interpretability:** credit and some fraud decisions need reasons; trees and linear models are easier to explain.",
      "**Freshness:** models that train incrementally (linear models, deep nets with online updates) suit fast-changing domains; see [continual learning](/learn/continual-learning).",
      "**Calibration needs:** auctions and thresholds need real probabilities; logistic regression is calibrated by construction, others may need recalibration.",
    ] },

    { type: "h2", text: "Loss functions by task" },
    { type: "table", head: ["Task", "Loss", "Note"], rows: [
      ["Binary classification", "Log loss (binary cross-entropy)", "Produces probabilities; add class weights or focal loss for imbalance"],
      ["Multiclass", "Softmax cross-entropy", "Use sigmoid per class for multilabel"],
      ["Regression", "MSE, MAE, Huber", "MAE and Huber resist outliers; quantile loss gives P50 and P90"],
      ["Ranking", "Pairwise (RankNet), listwise (LambdaRank, softmax)", "See [learning to rank](/learn/learning-to-rank)"],
      ["Retrieval", "Sampled softmax, contrastive", "With in-batch and hard negatives; see [embeddings](/learn/embeddings)"],
    ] },

    { type: "h2", text: "Multi-task models" },
    { type: "p", text: "Feeds and ads predict several outcomes at once. A shared bottom layer learns common representations; separate heads predict each objective. Mixture-of-experts variants let tasks share selectively when they conflict (for example clicks vs satisfaction)." },
    { type: "diagram", kind: "flow", caption: "A multi-task ranker: shared layers feed one head per objective; the serving layer combines them with weights tuned by experiments.", nodes: [
      { id: "in", label: "Features", sub: "user · item · context", col: 0, row: 1 },
      { id: "sh", label: "Shared layers", sub: "embeddings + MLP", col: 1.4, row: 1, tone: "accent" },
      { id: "h1", label: "p(click)", col: 2.8, row: 0, tone: "store" },
      { id: "h2", label: "p(long watch)", col: 2.8, row: 1, tone: "store" },
      { id: "h3", label: "p(hide)", col: 2.8, row: 2, tone: "danger" },
      { id: "comb", label: "Weighted score", sub: "w1·c + w2·w − w3·h", col: 4.3, row: 1, tone: "ok", w: 160 },
    ], edges: [
      { from: "in", to: "sh" }, { from: "sh", to: "h1" }, { from: "sh", to: "h2" }, { from: "sh", to: "h3" },
      { from: "h1", to: "comb" }, { from: "h2", to: "comb" }, { from: "h3", to: "comb" },
    ] },

    { type: "h2", text: "Ensembles and cascades" },
    { type: "ul", items: [
      "**Stacking:** trees on top of deep-model outputs, or the reverse; common in ads (trees transforming features for a linear model was a well-known early design).",
      "**Cascades:** a cheap model filters, an expensive one decides; the same idea as the [two-stage pattern](/learn/two-stage-processing).",
      "**Rules plus models:** hard rules for known-bad cases (sanctions, blocked devices), a model for the rest. Standard in fraud.",
    ] },

    { type: "h2", text: "Training choices to mention" },
    { type: "ul", items: [
      "From scratch vs **fine-tuning** a pretrained model (text and images almost always fine-tune).",
      "Hyperparameter search (random or Bayesian) on the validation set, never the test set.",
      "Regularisation: dropout, weight decay, early stopping on validation loss.",
      "Scale: [distributed training](/learn/distributed-training) for large embedding tables or big models.",
    ] },
  ],
  uses: [
    { name: "Fraud", text: "Rules for known patterns plus gradient-boosted trees on velocity features, chosen for accuracy on tabular data and explainable reasons." },
    { name: "Large-scale ads", text: "Deep models with huge sparse embedding tables and multi-task heads for click and conversion." },
    { name: "ETA", text: "Gradient-boosted trees as a strong baseline, then deep models that use route sequences and real-time traffic." },
  ],
  interview: [
    "Start with a heuristic and a simple learned baseline before proposing a deep model.",
    "Justify the model by data type and size, latency, interpretability and calibration.",
    "Name the loss function, and how it handles imbalance or multiple objectives.",
    "Say what result would make you switch to a heavier model.",
  ],
  related: ["ml-problem-framing", "learning-to-rank", "embeddings", "model-compression", "continual-learning"],
  practice: ["recommendation-engine", "online-fraud-model", "training-platform"],
  reading: [
    { title: "XGBoost: A Scalable Tree Boosting System", publisher: "Chen and Guestrin, KDD 2016", url: "https://arxiv.org/abs/1603.02754" },
    { title: "Deep Learning Recommendation Model for Personalization and Recommendation Systems", publisher: "Naumov et al., Meta, 2019", url: "https://arxiv.org/abs/1906.00091" },
    { title: "Modeling Task Relationships in Multi-task Learning with Multi-gate Mixture-of-Experts", publisher: "Ma et al., KDD 2018", url: "https://dl.acm.org/doi/10.1145/3219819.3220007" },
  ],
};
