// Case study: ad click-through rate prediction for a social platform's ad auction.
export default {
  blocks: [
    { type: "p", text: "**The question**: design the system that predicts the probability a user clicks an ad on a social media feed. The prediction feeds the **ad auction** that decides which ad is shown, so it must be accurate, **calibrated**, fresh, and fast enough to score thousands of ads per request. Ads ranking is one of the most commonly asked ML design questions at large ad-funded companies." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Goal?", "Maximise ad revenue while keeping user experience and advertiser value healthy"],
      ["Scale?", "1B daily users, 10M active ads, ~100B ad impressions per day"],
      ["Auction?", "Ads compete per slot; ranking by expected value = bid × pCTR (for cost-per-click ads)"],
      ["Latency?", "The whole ad request in under 100 ms; scoring about 1,000 candidate ads within ~30 ms"],
      ["Conversions?", "Some advertisers pay per conversion; conversions arrive hours or days after the click"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "Binary classification: given (user, ad, context), predict **p(click)**. Because the score multiplies a bid, the probability itself must be right, not just the order. If pCTR is 2× too high for one advertiser, they win auctions they shouldn't and pay for it. So **calibration** is a first-class requirement, alongside log loss and AUC." },
    { type: "code", code: `expected value (eCPM) = bid_per_click × pCTR × 1000
ad A: bid $2.00, pCTR 1.5% → eCPM $30
ad B: bid $0.50, pCTR 8.0% → eCPM $40   ← wins despite a lower bid
(a production auction also adds quality and user-experience terms)` },

    { type: "h2", text: "3. Data" },
    { type: "ul", items: [
      "**Rows:** one per impression, labelled 1 if clicked within a window (for example 15 minutes), else 0.",
      "**Imbalance:** CTR around 1%, so downsample negatives (keep 10%) and **recalibrate** afterwards; see [training data](/learn/ml-training-data).",
      "**Volume:** 100B impressions/day; even downsampled, billions of rows per day.",
      "**Delayed conversions:** for conversion models, either wait for a window (stale) or train on what's known and correct with a delay model.",
      "**Click fraud and bots:** filter invalid clicks before training, or the model learns to target bots.",
    ] },

    { type: "h2", text: "4. Features" },
    { type: "table", head: ["Group", "Examples", "Encoding"], rows: [
      ["User", "Age bucket, country, interests, past ad clicks by category", "Embeddings, buckets"],
      ["Ad", "Advertiser id, campaign id, creative id, category, format", "Hashed ids → embeddings"],
      ["Ad history", "Ad's CTR last hour and last 7 days, advertiser's CTR", "Smoothed counters from streams"],
      ["Context", "Placement, device, time, position in feed", "One-hot / embeddings"],
      ["User-ad", "Clicked this advertiser before, similarity of user and ad embeddings", "Crosses, dot products"],
    ] },
    { type: "p", text: "Ads models are dominated by **sparse id features** with billions of values. Hashing and embedding tables handle them; see [feature engineering](/learn/feature-engineering). Smoothed CTR counters use priors so a new ad with 1 click in 2 impressions doesn't look like a 50% CTR." },

    { type: "h2", text: "5. Model" },
    { type: "ol", items: [
      "**Baseline:** logistic regression on hashed features and crosses. Calibrated, fast, trains online. A classic design used gradient-boosted trees to create features for a logistic regression.",
      "**Production:** a deep model with embedding tables for sparse features, an interaction layer (feature crosses, dot products) and an MLP, in the wide-and-deep or DLRM family.",
      "**Multi-task:** heads for click and conversion, sharing embeddings.",
      "**Calibration layer:** isotonic regression or Platt scaling on recent data, per segment if needed.",
    ] },

    { type: "h2", text: "6. Serving architecture" },
    { type: "diagram", kind: "flow", caption: "An ad request: targeting retrieves eligible ads, a light model trims them, the CTR model scores the rest, calibration fixes probabilities, and the auction ranks by bid × pCTR. Impressions and clicks stream back into features and training.", nodes: [
      { id: "req", label: "Ad request", col: 0, row: 1, shape: "pill" },
      { id: "tgt", label: "Targeting + budget", sub: "10M → 5K ads", col: 1.2, row: 1, tone: "accent" },
      { id: "light", label: "Light model", sub: "5K → 500", col: 2.4, row: 1 },
      { id: "ctr", label: "CTR model", sub: "deep · GPU", col: 3.6, row: 1, tone: "accent" },
      { id: "cal", label: "Calibrate", col: 4.8, row: 1, tone: "ok" },
      { id: "auc", label: "Auction", sub: "bid × pCTR", col: 6, row: 1, tone: "ok" },
      { id: "fs", label: "Real-time features", sub: "counters", col: 3, row: 2.3, shape: "db", tone: "cache" },
      { id: "logs", label: "Impressions + clicks", col: 4.8, row: 2.3, shape: "queue", tone: "queue", w: 160 },
    ], edges: [
      { from: "req", to: "tgt" }, { from: "tgt", to: "light" }, { from: "light", to: "ctr" }, { from: "ctr", to: "cal" }, { from: "cal", to: "auc" },
      { from: "fs", to: "ctr", dashed: true }, { from: "auc", to: "logs", dashed: true }, { from: "logs", to: "fs", label: "stream" },
    ] },
    { type: "code", code: `Requests   : 100B impressions/day ≈ 1.2M ad slots/s avg (peaks ~3M/s)
Scoring    : 500 ads × 1.2M = 600M predictions/s → GPU batching across requests
Embeddings : 2B hashed ids × 64 dims × 4 B ≈ 512 GB → sharded parameter servers,
             hot ids cached on the inference hosts
Budget     : targeting 15 ms | features 15 ms | scoring 30 ms | auction 5 ms` },

    { type: "h2", text: "7. Training and freshness" },
    { type: "p", text: "New ads and campaigns appear constantly, and click patterns shift by the hour, so ads models are among the most frequently updated in industry. A typical setup: incremental training every few hours (or continuous online learning) from the click stream, plus a periodic full retrain. Each update is validated on a recent holdout before it's pushed. See [continual learning](/learn/continual-learning)." },
    { type: "diagram", kind: "flow", caption: "Near-real-time training: a stream job joins impressions and clicks after a label window, writes mini-batches, and an incremental trainer publishes validated snapshots to serving.", nodes: [
      { id: "imp", label: "Impressions", col: 0, row: 0, shape: "queue", tone: "queue" },
      { id: "clk", label: "Clicks", col: 0, row: 1.4, shape: "queue", tone: "queue" },
      { id: "join", label: "Stream join", sub: "15-min window", col: 1.4, row: 0.7, tone: "accent" },
      { id: "tr", label: "Incremental trainer", col: 2.8, row: 0.7, tone: "accent", w: 160 },
      { id: "val", label: "Validate", sub: "holdout log loss", col: 4.2, row: 0.7, tone: "ok" },
      { id: "srv", label: "Serving fleet", col: 5.5, row: 0.7, shape: "pill" },
    ], edges: [
      { from: "imp", to: "join" }, { from: "clk", to: "join" }, { from: "join", to: "tr" }, { from: "tr", to: "val" }, { from: "val", to: "srv", label: "snapshot" },
    ] },

    { type: "h2", text: "8. Evaluation" },
    { type: "ul", items: [
      "**Offline:** normalised log loss (log loss relative to predicting the average CTR), AUC, and **calibration** (predicted vs observed CTR in buckets; ratio close to 1.0 overall and per advertiser). See [ML evaluation](/learn/ml-evaluation-metrics).",
      "**Online:** revenue per thousand impressions, CTR, advertiser conversions and return on ad spend, plus user guardrails: ad hide rate, session length.",
      "**Experiments:** user-level A/B tests, and budget-split tests so advertisers' budgets don't leak between arms.",
    ] },

    { type: "h2", text: "9. Monitoring" },
    { type: "ul", items: [
      "Calibration ratio per advertiser and placement, alerted when it drifts beyond ±5%.",
      "Feature freshness of real-time counters; a stale counter stream silently hurts revenue.",
      "Sudden CTR spikes on an advertiser (click fraud) and invalid-traffic rates.",
      "Score distribution and revenue per request compared to the same hour last week.",
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*Why does calibration matter if AUC is high?* AUC measures order only; the auction multiplies probabilities by bids, so miscalibration misprices ads.",
      "*How do you handle a new ad?* Priors from advertiser and category, content embeddings of the creative, and exploration traffic.",
      "*How do you predict conversions that arrive days later?* A separate conversion model with delayed-feedback handling, trained on post-click data.",
    ] },
  ],
  uses: [
    { name: "Social and video platforms", text: "Feed ads ranked by bid × predicted click or conversion probability." },
    { name: "Search ads", text: "The same model with query-ad relevance features as the strongest signal." },
    { name: "Retail media", text: "Sponsored products on marketplaces, predicting add-to-cart and purchase." },
  ],
  interview: [
    "Explain how pCTR enters the auction and why calibration is required.",
    "Handle 1% positives with downsampling plus recalibration.",
    "Describe sparse id features with hashing and embedding tables.",
    "Justify frequent incremental retraining with the speed of change in ads.",
  ],
  related: ["learning-to-rank", "feature-engineering", "continual-learning", "ml-evaluation-metrics", "ml-model-selection", "design-news-feed-ranking"],
  practice: ["ad-click-prediction", "ad-click-aggregator", "recommendation-engine", "model-serving"],
  reading: [
    { title: "Practical Lessons from Predicting Clicks on Ads at Facebook", publisher: "He et al., ADKDD 2014", url: "https://dl.acm.org/doi/10.1145/2648584.2648589" },
    { title: "Ad Click Prediction: a View from the Trenches", publisher: "McMahan et al., Google, KDD 2013", url: "https://research.google/pubs/ad-click-prediction-a-view-from-the-trenches/" },
    { title: "On Calibration of Modern Neural Networks", publisher: "Guo et al., ICML 2017", url: "https://arxiv.org/abs/1706.04599" },
  ],
};
