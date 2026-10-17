export default {
  blocks: [
    { type: "p", text: "Evaluating an ML system has two halves. **Offline evaluation** measures a model on held-out historical data with metrics such as precision, recall, AUC or NDCG. **Online evaluation** measures what happens when real users interact with it, through business metrics such as conversion or watch time and **guardrail** metrics such as latency and complaints. A model that wins offline can still lose online, so a good design chooses both kinds of metric before any model is built." },
    {"type":"diagram","kind":"flow","caption":"Metrics form a chain: the business goal is measured online by an A/B test, approximated offline by a model metric, and that metric picks the model on held-out data.","nodes":[{"id":"goal","label":"Business goal","sub":"revenue, retention","col":0,"row":0,"tone":"accent"},{"id":"online","label":"Online metric","sub":"CTR in an A/B test","col":1,"row":0},{"id":"offline","label":"Offline metric","sub":"AUC, recall@k","col":2,"row":0},{"id":"model","label":"Model choice","col":3,"row":0,"tone":"ok"},{"id":"data","label":"Held-out data","sub":"time-based split","col":2,"row":1,"shape":"db","tone":"store"}],"edges":[{"from":"goal","to":"online","label":"measured by"},{"from":"online","to":"offline","label":"proxied by"},{"from":"offline","to":"model","label":"selects"},{"from":"data","to":"offline","label":"evaluated on"}]},

    { type: "h2", text: "Start from the business metric" },
    { type: "p", text: "Ask what decision the model drives and how success is measured in the product. A fraud model protects revenue without blocking good customers; a feed ranker increases satisfied engagement; a search model helps people find things quickly. Then pick a **proxy** the model can be trained and evaluated on (probability of fraud, of a click, of a long watch) and be explicit about how well the proxy tracks the real goal." },

    { type: "h2", text: "Offline metrics by problem type" },
    { type: "table", head: ["Problem", "Metrics", "Notes"], rows: [
      ["Binary classification", "Precision, recall, F1, ROC AUC, PR AUC, log loss", "With rare positives (fraud), PR AUC and recall at a fixed precision are more informative than accuracy or ROC AUC"],
      ["Ranking and recommendation", "Precision@k, recall@k, MAP, NDCG, MRR", "Only the top positions matter to users; NDCG rewards putting the best items first"],
      ["Regression", "MAE, RMSE, MAPE", "RMSE punishes large errors; MAPE breaks near zero"],
      ["Probabilities used for decisions", "Calibration (reliability curves), Brier score", "A 0.8 score should mean 80% of such cases are positive"],
      ["Generative / LLM output", "Task accuracy, groundedness, human or model-graded ratings", "See [RAG](/learn/retrieval-augmented-generation) for retrieval-specific metrics"],
    ] },

    { type: "h2", text: "Precision, recall and thresholds" },
    { type: "p", text: "For a classifier, **precision** is the share of flagged items that are truly positive, and **recall** is the share of true positives that get flagged. Moving the decision threshold trades one for the other. Choose it from costs: if a missed fraud costs ₹5,000 and a wrongly blocked customer costs ₹200 in lost business and support, the right threshold flags more aggressively than one that maximises F1." },
    { type: "callout", tone: "tip", text: "Report metrics per important segment (new vs returning users, regions, device types), not just overall. Averages hide models that fail badly for a minority." },

    { type: "h2", text: "Building a trustworthy offline evaluation" },
    { type: "ul", items: [
      "**Split by time, not randomly,** when the model will predict the future: train on January to June, test on July. Random splits leak future patterns into training.",
      "**Avoid leakage:** features must only use data available at prediction time. See [point-in-time joins](/learn/feature-store).",
      "**Keep a fixed benchmark set** and compare every model against the current production model on it.",
      "**Evaluate on the deployed distribution:** if the ranker only sees candidates from retrieval, evaluate it on retrieval output, not the full catalogue.",
      "**Check slices and calibration,** not only the headline metric.",
    ] },

    { type: "h2", text: "Online metrics and why offline wins don't ship" },
    { type: "table", head: ["Type", "Examples"], rows: [
      ["Primary (north star)", "Purchases per user, minutes of satisfied watch time, successful searches"],
      ["Secondary", "Click-through rate, add-to-cart rate, session length"],
      ["Guardrails", "Latency p99, error rate, unsubscribes, complaints, revenue for unaffected segments"],
    ] },
    { type: "p", text: "Offline gains fail to appear online because of feedback effects (the new model changes what users see, and so what data exists), proxies that drift from the real goal (more clicks but less satisfaction), latency added by a heavier model, or a distribution shift since the evaluation data was collected. That's why changes are confirmed with an [A/B test](/learn/ab-testing-experimentation) before full rollout, and watched afterwards with [model monitoring](/learn/ml-model-monitoring)." },
  ],
  uses: [
    { name: "Fraud detection", text: "Recall at a precision floor sets the threshold, with online guardrails on false-decline rate and checkout conversion." },
    { name: "Search ranking", text: "NDCG on human-judged queries offline, then successful-search rate and time-to-click online." },
    { name: "Ads", text: "Calibrated click probabilities feed auctions, so log loss and calibration matter as much as AUC." },
  ],
  interview: [
    "Tie the model's proxy metric to the business metric explicitly.",
    "Pick metrics for the problem type, and PR-based metrics for rare positives.",
    "Split data by time and guard against leakage.",
    "Name online primary and guardrail metrics and confirm with an A/B test.",
  ],
  related: ["ab-testing-experimentation", "ml-model-monitoring", "recommendation-system-design", "machine-learning-system-architecture", "feature-store"],
  practice: ["recommendation-engine", "online-fraud-model", "model-monitoring"],
  reading: [
    { title: "Classification: precision and recall", publisher: "Google Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall" },
    { title: "scikit-learn: Metrics and scoring", publisher: "scikit-learn documentation", url: "https://scikit-learn.org/stable/modules/model_evaluation.html" },
  ],
};
