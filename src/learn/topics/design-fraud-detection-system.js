// Case study: real-time payment fraud detection with rules, ML and human review.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a system that decides, in real time, whether a card payment is fraudulent before it's authorised. Missing fraud costs money and trust; blocking good customers costs revenue and goodwill. Labels arrive weeks late, fraudsters adapt, and positives are rare. It's a favourite ML design question at payments companies, banks and marketplaces because it tests all of that at once." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Decision?", "Approve, decline, or step-up (ask for 3-D Secure / an OTP), plus send to manual review for some"],
      ["Scale?", "20K transactions per second at peak, 500M per day"],
      ["Latency?", "Decision in under 100 ms (it sits inside the card authorisation path)"],
      ["Fraud rate?", "About 0.1% of transactions; fraud amount matters more than count"],
      ["Labels?", "Chargebacks (arrive 30-90 days later), confirmed reports, manual review outcomes"],
      ["Costs?", "A missed fraud loses the amount plus fees; a false decline loses the margin and may lose the customer"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "Binary classification: p(fraud | transaction, history). The decision is a **cost-based threshold**, not 0.5: decline when the expected loss of approving exceeds the expected loss of declining. Different thresholds for amount bands and merchant types are common." },
    { type: "code", code: `expected loss if approved = p(fraud) × amount
expected loss if declined = (1 − p(fraud)) × margin_lost × churn_factor
decline when p × amount > (1 − p) × margin × churn
→ a $2,000 laptop needs a much lower p to decline than a $5 coffee` },

    { type: "h2", text: "3. Data and labels" },
    { type: "ul", items: [
      "**Rows:** every scored transaction with the features used at decision time (logged, to avoid skew).",
      "**Label delay:** chargebacks take weeks, so training data is 2-3 months old, and recent labels are incomplete. Train on matured windows; use review outcomes and confirmed reports as faster partial labels.",
      "**Selection bias:** declined transactions never get a chargeback, so you can't tell if they were fraud. Let a tiny random sample of would-be declines through (or step them up) to learn; see [feedback loops](/learn/ml-feedback-loops).",
      "**Imbalance:** 0.1% positives; weight by amount and use PR-AUC. See [training data](/learn/ml-training-data).",
    ] },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "The decision path: rules catch known patterns, the model scores everything else with fresh velocity features, and a decision engine applies thresholds. Uncertain cases go to review, whose outcomes become labels.", nodes: [
      { id: "auth", label: "Authorisation request", col: 0, row: 1, shape: "pill", w: 160 },
      { id: "feat", label: "Feature service", sub: "velocity · history", col: 1.4, row: 1 },
      { id: "on", label: "Online store", sub: "card · device · merchant", col: 1.4, row: 2.3, shape: "db", tone: "cache", w: 170 },
      { id: "rules", label: "Rules engine", sub: "blocklists · limits", col: 2.8, row: 0.3, tone: "danger" },
      { id: "model", label: "Fraud model", sub: "GBDT · < 20 ms", col: 2.8, row: 1.7, tone: "accent" },
      { id: "dec", label: "Decision engine", sub: "cost thresholds", col: 4.2, row: 1, tone: "ok" },
      { id: "rev", label: "Review queue", col: 5.5, row: 1.9, shape: "queue", tone: "queue" },
      { id: "out", label: "Approve / step-up / decline", col: 5.5, row: 0.5, shape: "pill", w: 190 },
    ], edges: [
      { from: "auth", to: "feat" }, { from: "on", to: "feat" }, { from: "feat", to: "rules" }, { from: "feat", to: "model" },
      { from: "rules", to: "dec" }, { from: "model", to: "dec" }, { from: "dec", to: "out" }, { from: "dec", to: "rev", dashed: true, label: "uncertain" },
    ] },

    { type: "h2", text: "5. Features" },
    { type: "table", head: ["Group", "Examples", "Computed by"], rows: [
      ["Velocity", "Transactions per card in last 1 min / 1 h / 24 h; distinct merchants in 1 h; amount sum in 24 h", "Stream processor, per-key windows"],
      ["Device and network", "New device for this card? IP country vs card country, proxy/VPN flag", "Request + device history"],
      ["Behavioural deviation", "Amount vs card's typical amount; unusual hour; distance from last transaction / time elapsed (impossible travel)", "Stream + profile store"],
      ["Merchant", "Merchant category, merchant's historical fraud rate (smoothed, lagged)", "Batch daily"],
      ["Graph", "Card shares a device, email or address with known fraud", "Graph job, batch + incremental"],
    ] },
    { type: "p", text: "Velocity features must be **fresh to the second**: a fraudster testing a stolen card fires many small transactions quickly. They come from a [stream processor](/learn/stream-processing-windows-watermarks) writing to a low-latency store. See [feature engineering](/learn/feature-engineering) and [feature stores](/learn/feature-store)." },

    { type: "h2", text: "6. Models" },
    { type: "ul", items: [
      "**Rules first:** sanctions lists, known-bad devices and hard limits. Fast to change when an attack starts; analysts own them.",
      "**Gradient-boosted trees** on tabular features: accurate, fast on CPU, and they give feature contributions for explanations to reviewers.",
      "**Optional deep or graph models** for sequences of transactions and fraud rings, often as features into the tree model.",
      "**Anomaly detection** (unsupervised) to flag new patterns nobody has labelled yet.",
    ] },

    { type: "h2", text: "7. Latency and reliability" },
    { type: "code", code: `Budget (100 ms total, inside authorisation):
  feature fetch (parallel)  15 ms   online store p99
  rules                      5 ms
  model                     15 ms   trees on CPU
  decision + logging         5 ms   logging async
  network + headroom        60 ms
Fallback: if the model or features time out → rules-only decision with a
conservative threshold for high amounts; never block all traffic on an outage` },
    { type: "p", text: "The fraud service is in the payment path, so it gets the same treatment as any critical dependency: [timeouts](/learn/retries-and-timeouts), a [circuit breaker](/learn/circuit-breaker) and a [fallback](/learn/fallbacks-graceful-degradation)." },

    { type: "h2", text: "8. Human review loop" },
    { type: "ul", items: [
      "Mid-score transactions go to analysts (or are held briefly); queue size is set by reviewer capacity.",
      "The queue is ordered by expected loss (p × amount), not by arrival time.",
      "Reviewer decisions are fast labels and feed retraining; their disagreement rates are tracked.",
      "Customers' disputes and \"this was me\" confirmations are labels too.",
    ] },

    { type: "h2", text: "9. Evaluation" },
    { type: "table", head: ["Offline", "Online"], rows: [
      ["PR-AUC; recall at a fixed false-positive rate", "Fraud loss in basis points of volume"],
      ["Dollar-weighted recall (share of fraud amount caught)", "False decline rate and approval rate"],
      ["Performance by slice: merchant type, country, new cards", "Manual review rate and reviewer precision"],
    ] },
    { type: "p", text: "Online A/B tests are delicate: a control arm with a weaker model loses real money. Use small allocations, shadow scoring of the challenger, and backtests on matured data. See [ML evaluation](/learn/ml-evaluation-metrics)." },

    { type: "h2", text: "10. Adapting to adversaries" },
    { type: "ul", items: [
      "Monitor score distributions and decline rates per merchant and BIN range hourly; a sudden shift often signals a new attack.",
      "Retrain regularly on matured labels, and let analysts push rules within minutes in between; see [continual learning](/learn/continual-learning).",
      "Keep some features secret and avoid exposing exact decline reasons to the requester.",
    ] },
  ],
  uses: [
    { name: "Card payments", text: "Scoring inside the authorisation path with velocity features and cost-based thresholds." },
    { name: "Marketplaces", text: "Account takeover, fake listings and promo abuse use the same rules-plus-model-plus-review pattern." },
    { name: "Banking", text: "Transfer fraud and money-mule detection, often adding graph features." },
  ],
  interview: [
    "Set thresholds from the cost of each error, varying with the amount.",
    "Explain delayed labels and selection bias from declines, and how you get labels anyway.",
    "Design second-fresh velocity features from a stream into an online store.",
    "Combine rules, a model and human review, with a safe fallback inside the latency budget.",
  ],
  related: ["feature-store", "stream-processing-windows-watermarks", "ml-feedback-loops", "ml-training-data", "ml-model-monitoring", "payment-system-ledger"],
  practice: ["online-fraud-model", "fraud-data-platform", "payment-platform"],
  reading: [
    { title: "Machine learning for fraud protection: a primer", publisher: "Stripe", url: "https://stripe.com/guides/primer-on-machine-learning-for-fraud-protection" },
    { title: "XGBoost: A Scalable Tree Boosting System", publisher: "Chen and Guestrin, KDD 2016", url: "https://arxiv.org/abs/1603.02754" },
  ],
};
