export default {
  blocks: [
    { type: "p", text: "**ML problem framing** is the step that turns a business goal like \"increase sales\" into something a model can learn: a precise **input**, **output**, **label** and **task type**, plus the metric that tells you whether the model helps. It is the most important step of any [ML system design](/learn/ml-system-design-interview) answer, because a wrong framing makes every later step, from data to serving, solve the wrong problem very well." },

    { type: "h2", text: "From business objective to ML objective" },
    { type: "p", text: "A business objective can't be trained on directly. You choose a **proxy** the model can predict, and you must argue that improving the proxy improves the goal." },
    { type: "diagram", kind: "flow", caption: "Framing narrows a goal into a learnable target. Each arrow is a choice you should say out loud, because each one can be wrong.", nodes: [
      { id: "biz", label: "Business goal", sub: "more watch time", col: 0, row: 1, tone: "accent", w: 150 },
      { id: "beh", label: "User behaviour", sub: "watching videos", col: 1.3, row: 1 },
      { id: "obj", label: "ML objective", sub: "predict watch time", col: 2.6, row: 1, tone: "accent" },
      { id: "label", label: "Label", sub: "seconds watched", col: 3.9, row: 0.3, tone: "store" },
      { id: "out", label: "Output use", sub: "rank by score", col: 3.9, row: 1.7, tone: "ok" },
    ], edges: [
      { from: "biz", to: "beh", label: "driven by" }, { from: "beh", to: "obj", label: "proxy" },
      { from: "obj", to: "label" }, { from: "obj", to: "out" },
    ] },
    { type: "table", head: ["Business goal", "Possible ML objective", "Watch out for"], rows: [
      ["Increase watch time on a video app", "Predict expected watch time per (user, video)", "Long, low-quality videos; need satisfaction signals too"],
      ["Grow ad revenue", "Predict click probability (pCTR) for the auction", "Must be calibrated; revenue = bid × pCTR"],
      ["Reduce fraud losses", "Classify a payment as fraud before authorisation", "Labels arrive weeks later via chargebacks"],
      ["More friends added", "Predict the probability a suggested connection is accepted", "Spammy invites inflate sends, not accepts"],
      ["Faster support resolution", "Classify ticket intent and route it", "Intent taxonomy changes; needs a fallback queue"],
    ] },

    { type: "h2", text: "Defining input, output and label" },
    { type: "ul", items: [
      "**Input:** what is known at prediction time, such as a user, a query, a candidate item and the context (time, device, location). Anything not known then can't be a feature.",
      "**Output:** a probability, a score, a class, a number, or a ranked list. Say how it is consumed: thresholded, sorted, shown to a human.",
      "**Label:** the ground truth you train on. Prefer **natural labels** that come from behaviour (a purchase, a chargeback). When none exist, plan [human labelling](/learn/data-labeling).",
      "**Unit of prediction:** one row per what? Per user-item impression, per transaction, per query-document pair. This choice decides your training data shape.",
    ] },

    { type: "h2", text: "Choosing the task type" },
    { type: "diagram", kind: "tree", caption: "Common task types in ML system design. Most interview problems are supervised; ranking and retrieval problems often combine several of these.", root: { label: "ML task", tone: "accent", children: [
      { label: "Supervised", tone: "accent", children: [
        { label: "Binary classification", sub: "fraud / not", tone: "store" },
        { label: "Multiclass / multilabel", sub: "harm categories", tone: "store" },
        { label: "Regression", sub: "ETA, price", tone: "store" },
        { label: "Ranking", sub: "search, feed", tone: "store" },
      ] },
      { label: "Retrieval", sub: "embeddings + ANN", children: [{ label: "Similarity search", sub: "visual search", tone: "cache" }] },
      { label: "Unsupervised", children: [{ label: "Clustering / anomaly", sub: "new fraud patterns", tone: "muted" }] },
      { label: "Sequential decisions", children: [{ label: "Bandits / RL", sub: "explore vs exploit", tone: "muted" }] },
    ] } },
    { type: "p", text: "Ranking can be framed several ways: as **pointwise** classification (predict click probability per item, then sort), **pairwise** (which of two items is better) or **listwise** (optimise the whole list). Pointwise is the usual starting point; see [learning to rank](/learn/learning-to-rank). Retrieval with embeddings is covered in [embeddings](/learn/embeddings)." },

    { type: "h2", text: "Single objective or several" },
    { type: "p", text: "Real products rarely optimise one thing. A feed wants clicks, but also likes, shares, long watches and few \"hide\" actions. Two common framings:" },
    { type: "ul", items: [
      "**Multi-task model:** one network with a head per objective (p(click), p(like), p(hide)), combined at serving time with tunable weights: `score = w1·p(click) + w2·p(like) − w3·p(hide)`. Changing weights doesn't need retraining.",
      "**Separate models:** simpler to own and debug, but more to serve and keep consistent.",
    ] },
    { type: "p", text: "Either way, say how the weights are chosen: by an [A/B test](/learn/ab-testing-experimentation) on the business metric, not by offline loss." },

    { type: "h2", text: "When not to use ML" },
    { type: "ul", items: [
      "**A rule is good enough.** \"Block payments from sanctioned countries\" is a rule, not a model.",
      "**No data and no way to get labels.** Start with heuristics and log what you need for a model later.",
      "**Mistakes are unacceptable and unexplainable.** Some regulated decisions need transparent logic.",
      "**The pattern doesn't repeat.** ML learns from history; one-off decisions don't have any.",
    ] },
    { type: "callout", tone: "tip", text: "Saying \"I'd launch with a heuristic baseline, log impressions and outcomes, and move to a model once we have a few weeks of data\" shows judgment interviewers reward." },

    { type: "h2", text: "A framing checklist" },
    { type: "ol", items: [
      "What business metric should move, and by how much would matter?",
      "What behaviour drives it, and which part can a model influence?",
      "What exactly is predicted, for which unit, at what moment?",
      "What is the label, how is it obtained, and how long until it is known?",
      "What does a false positive cost compared to a false negative?",
      "How is the output used: sorted, thresholded, or shown to a reviewer?",
      "What's the simplest non-ML baseline to beat?",
    ] },
  ],
  uses: [
    { name: "Ads", text: "Revenue is framed as predicting click and conversion probabilities that feed an auction, so calibration matters as much as ranking quality." },
    { name: "Marketplaces", text: "\"More bookings\" becomes predicting booking probability per search result, with guardrails for host fairness and cancellations." },
    { name: "Trust and safety", text: "\"Fewer harmful posts seen\" becomes per-policy classifiers whose thresholds are set by the cost of each error." },
  ],
  interview: [
    "Restate the business goal, then propose a measurable proxy and argue why it tracks the goal.",
    "Define the unit of prediction and the label in one sentence each.",
    "Say how long labels take to arrive; delayed labels change training and monitoring.",
    "Compare the cost of false positives and false negatives before choosing a metric.",
  ],
  related: ["ml-system-design-interview", "ml-training-data", "ml-evaluation-metrics", "learning-to-rank", "data-labeling"],
  practice: ["recommendation-engine", "online-fraud-model"],
  reading: [
    { title: "Introduction to Machine Learning Problem Framing", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/problem-framing" },
    { title: "Rules of Machine Learning", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
  ],
};
