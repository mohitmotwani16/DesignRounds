// Case study: YouTube-style video recommendations, following the 7-step ML system design framework.
export default {
  blocks: [
    { type: "p", text: "**The question**: design the recommendation system for a video platform's home page, like YouTube. Users should see videos they'll enjoy watching, new uploads should get a fair chance, and the page must load quickly for hundreds of millions of users. This walkthrough follows the [ML system design framework](/learn/ml-system-design-interview) from clarifying questions to monitoring." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer (agreed with the interviewer)"], rows: [
      ["Business goal?", "Increase long-term engagement: daily active users and satisfied watch time, not raw clicks"],
      ["Scale?", "500M daily active users, a catalogue of 5B videos, about 500K new uploads per hour"],
      ["Surface?", "Home feed; each load shows about 20 videos, users scroll for more"],
      ["Latency?", "Recommendations returned in under 200 ms at p99"],
      ["Signals available?", "Impressions, clicks, watch time, likes, shares, \"not interested\", subscriptions, searches"],
      ["Constraints?", "Policy-violating and borderline content must not be recommended; respect age settings"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "Clicks alone reward clickbait, so the ML objective is to rank videos by **expected satisfied watch time**. Concretely: for each (user, video) pair, predict several outcomes and combine them:" },
    { type: "code", code: `score(user, video) =   w1 · p(click)
                     + w2 · E[watch time | click]   (or p(watch > 50%))
                     + w3 · p(like) + w4 · p(share)
                     − w5 · p(not interested)
weights w are tuned by online experiments against long-term engagement` },
    { type: "p", text: "That's a **multi-stage ranking** problem: retrieval (candidate generation) then ranking, both learned from interaction logs. See [ML problem framing](/learn/ml-problem-framing)." },

    { type: "h2", text: "3. Data" },
    { type: "ul", items: [
      "**Rows:** one per impression (user saw video at position p, at time t, on device d), joined with outcomes within a window: click, watch seconds, like, share, dismiss.",
      "**Labels:** natural labels from behaviour; \"not interested\" and fast skips are explicit and implicit negatives.",
      "**Volume:** 500M users × ~40 impressions/day ≈ 20B impressions/day. Downsample unclicked impressions heavily for training.",
      "**Splits:** time-based (train on the last 30 days, evaluate on the next day). See [training data](/learn/ml-training-data).",
      "**Biases:** position bias and exposure bias; log position and the serving model version for correction. See [feedback loops](/learn/ml-feedback-loops).",
    ] },

    { type: "h2", text: "4. High-level architecture" },
    { type: "diagram", kind: "flow", caption: "The serving path: several candidate sources produce about 2,000 videos, a light ranker trims to 500, a multi-task heavy ranker scores them, and re-ranking applies policy and diversity before 20 are returned. Logs feed training offline.", zones: [{ label: "offline", from: [0, 2.6], to: [4.6, 2.6], tone: "muted" }], nodes: [
      { id: "req", label: "Home request", col: 0, row: 0.8, shape: "pill" },
      { id: "tt", label: "Two-tower ANN", sub: "~1,000", col: 1.25, row: 0, tone: "accent" },
      { id: "subs", label: "Subscriptions", sub: "new uploads", col: 1.25, row: 0.8 },
      { id: "trend", label: "Trending + fresh", sub: "explore slots", col: 1.25, row: 1.6 },
      { id: "light", label: "Light ranker", sub: "2,000 → 500", col: 2.6, row: 0.8 },
      { id: "heavy", label: "Multi-task ranker", sub: "500 → 100", col: 3.85, row: 0.8, tone: "accent" },
      { id: "rr", label: "Re-rank", sub: "policy · diversity", col: 5.1, row: 0.8, tone: "ok" },
      { id: "logs", label: "Impression + watch logs", col: 1.25, row: 2.6, shape: "queue", tone: "queue", w: 170 },
      { id: "train", label: "Training pipelines", col: 2.6, row: 2.6, tone: "accent" },
      { id: "fs", label: "Feature store", col: 3.85, row: 2.6, shape: "db", tone: "store" },
    ], edges: [
      { from: "req", to: "tt" }, { from: "req", to: "subs" }, { from: "req", to: "trend" },
      { from: "tt", to: "light" }, { from: "subs", to: "light" }, { from: "trend", to: "light" }, { from: "light", to: "heavy" }, { from: "heavy", to: "rr" },
      { from: "logs", to: "train" }, { from: "train", to: "heavy", dashed: true, label: "models" }, { from: "fs", to: "heavy", dashed: true },
    ] },

    { type: "h2", text: "5. Candidate generation" },
    { type: "p", text: "Retrieval must have high recall and be cheap. Combine several sources and merge them:" },
    { type: "ul", items: [
      "**Two-tower retrieval:** a user tower over watch history, searches and demographics; a video tower over id, title, thumbnail and channel embeddings. Video vectors are precomputed and indexed in an [ANN index](/learn/vector-databases); per request we embed the user and fetch the top 1,000 by dot product. See [embeddings](/learn/embeddings).",
      "**Subscriptions:** recent uploads from subscribed channels.",
      "**Item-to-item:** videos co-watched with the user's last few watches.",
      "**Trending and fresh:** popular in the user's region and an exploration source for new uploads ([cold start](/learn/cold-start-problem)).",
    ] },

    { type: "h2", text: "6. Ranking" },
    { type: "p", text: "A light ranker (a small model on cheap features) cuts 2,000 candidates to 500. The **heavy ranker** is a multi-task deep network with heads for click, watch time, like, share and dismiss, sharing lower layers. See [choosing a model](/learn/ml-model-selection) and [learning to rank](/learn/learning-to-rank)." },
    { type: "table", head: ["Feature group", "Examples"], rows: [
      ["User", "Long-term topic interests, language, country, account age, user embedding"],
      ["Video", "Duration, age, channel, topic, global CTR and average watch percentage, video embedding"],
      ["User-video", "Has watched this channel, time since last watch from channel, embedding similarity"],
      ["Context", "Time of day, device, network speed, position on page"],
      ["Session", "Videos watched in the last 30 minutes, topics of the current session"],
    ] },
    { type: "p", text: "Position is a training feature set to a constant at serving time, to separate relevance from placement bias." },

    { type: "h2", text: "7. Re-ranking" },
    { type: "ul", items: [
      "Remove policy-violating, borderline and age-restricted videos, and anything already watched or dismissed.",
      "Diversity: limit videos per channel and per topic in the first screen.",
      "Freshness: a small boost for recent uploads, and reserved slots for exploration.",
    ] },

    { type: "h2", text: "8. Serving and scale" },
    { type: "code", code: `Requests     : 500M DAU × ~10 home loads/day = 5B/day ≈ 58K RPS avg, ~150K peak
Retrieval    : ANN over 5B videos is too big; index only the ~500M eligible
               (recent or popular) videos: 500M × 128 dims × 1 B (int8) ≈ 64 GB per replica
Ranking      : 500 candidates × 150K RPS = 75M scores/s → GPU batching, ~2-5K GPU inference
               servers at a few thousand candidate-scores per ms each (illustrative)
Latency plan : features 20 ms | retrieval 30 ms | light 20 ms | heavy 60 ms | re-rank 10 ms
               → ~140 ms, leaving headroom under 200 ms p99
Fallback     : if the heavy ranker times out, serve the light ranker's order` },
    { type: "ul", items: [
      "User embeddings are recomputed in near real time from recent watches, so the feed reacts within a session.",
      "Precompute recommendations for inactive users in batch and refresh on login, cutting peak load.",
      "Cache video features aggressively; they change slowly. See [model serving](/learn/model-serving).",
    ] },

    { type: "h2", text: "9. Evaluation" },
    { type: "table", head: ["Stage", "Offline", "Online"], rows: [
      ["Retrieval", "Recall@1000 of the next watched video", "Share of watch time from each source"],
      ["Ranking", "NDCG@20, per-head AUC, calibration of watch-time predictions", "Watch time per user, daily active users"],
      ["Guardrails", "Slice metrics (new users, small languages)", "Dismiss rate, survey satisfaction, creator diversity, policy-violating impressions"],
    ] },
    { type: "p", text: "Ship only after an [A/B test](/learn/ab-testing-experimentation) shows gains in long-term metrics; keep a long-running holdout to measure cumulative effects. See [ML evaluation](/learn/ml-evaluation-metrics)." },

    { type: "h2", text: "10. Monitoring and iteration" },
    { type: "ul", items: [
      "Retrain the ranker daily (incrementally) and the retrieval towers weekly, then rebuild the index; see [continual learning](/learn/continual-learning).",
      "Monitor feature null rates, score distributions, catalogue coverage and impression concentration.",
      "Watch for feedback loops: falling new-video reach or rising concentration of impressions trigger review.",
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How do you stop clickbait?* Multi-objective scoring with satisfaction signals and dismiss predictions, plus survey-based labels.",
      "*How does a brand-new video get its first views?* Content embeddings in the video tower, channel priors and exploration slots.",
      "*How do you recommend to a logged-out user?* Context and popularity in the region, then session-based signals.",
      "*How do you know watch time didn't rise only because videos got longer?* Track watch percentage and satisfaction, and compare by duration bucket.",
    ] },
  ],
  uses: [
    { name: "Long-form video", text: "Home feed and watch-next recommendations with multi-objective ranking." },
    { name: "Short-form video", text: "The same funnel with faster session-level feedback and heavier exploration for new uploads." },
    { name: "Streaming services", text: "Smaller catalogues, so ranking leans on rows and artwork personalisation more than retrieval." },
  ],
  interview: [
    "Frame the objective as satisfied watch time, not clicks, with a multi-task scoring formula.",
    "Draw the funnel with candidate counts and per-stage latency.",
    "Use multiple candidate sources, including exploration for new uploads.",
    "Evaluate retrieval and ranking separately, and launch on long-term online metrics.",
  ],
  related: ["recommendation-system-design", "embeddings", "learning-to-rank", "cold-start-problem", "ml-feedback-loops", "design-news-feed-ranking"],
  practice: ["video-recommendations", "recommendation-engine", "video-streaming", "news-feed"],
  reading: [
    { title: "Deep Neural Networks for YouTube Recommendations", publisher: "Covington et al., RecSys 2016", url: "https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/" },
    { title: "Recommending What Video to Watch Next: A Multitask Ranking System", publisher: "Zhao et al., RecSys 2019", url: "https://dl.acm.org/doi/10.1145/3298689.3346997" },
  ],
};
