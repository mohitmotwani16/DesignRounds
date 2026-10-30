export default {
  blocks: [
    { type: "p", text: "A **recommendation system** picks the few items (videos, products, posts, songs) most likely to be useful to a user out of millions. At scale it's always a **funnel**: fast **candidate generation** narrows millions of items to a few thousand, a **ranking** model scores those candidates carefully, and a **re-ranking** step applies business rules such as diversity, freshness and safety. Each stage trades accuracy for speed differently." },

    { type: "h2", text: "The multi-stage funnel" },
    { type: "diagram", kind: "flow", caption: "Each stage handles fewer items with a more expensive model: retrieval is cheap and broad, ranking is precise, re-ranking enforces policy.", nodes: [
      { id: "corpus", label: "Item corpus", sub: "millions", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "ret", label: "Candidate generation", sub: "~1,000s · ms", col: 1.3, row: 1, tone: "accent" },
      { id: "rank", label: "Ranking", sub: "~100s · heavy model", col: 2.6, row: 1, tone: "accent" },
      { id: "rerank", label: "Re-ranking", sub: "diversity · rules", col: 3.9, row: 1 },
      { id: "user", label: "Feed / shelf", sub: "~10s shown", col: 5.1, row: 1, shape: "pill" },
      { id: "logs", label: "Impression + click logs", col: 2.6, row: 2.3, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "corpus", to: "ret" }, { from: "ret", to: "rank" }, { from: "rank", to: "rerank" }, { from: "rerank", to: "user" },
      { from: "user", to: "logs", dashed: true, label: "feedback" }, { from: "logs", to: "rank", dashed: true, label: "training" },
    ] },

    { type: "h2", text: "Candidate generation" },
    { type: "p", text: "Retrieval must be fast and have high **recall**: it should rarely miss an item the user would like, even if it lets through many they wouldn't. Systems combine several sources and merge their results:" },
    { type: "ul", items: [
      "**Two-tower (dual encoder) models:** one network embeds the user and context, another embeds items, trained so that a user's embedding is close to items they engaged with. Item embeddings are precomputed and indexed in a [vector database](/learn/vector-databases); at request time you embed the user and run an approximate nearest-neighbour search.",
      "**Collaborative filtering:** \"people who watched X also watched Y\", from co-occurrence or matrix factorisation.",
      "**Content-based:** items similar in text, category or creator to what the user engaged with.",
      "**Heuristic sources:** trending, new from followed creators, popular in the user's region. These also help **cold start** for new users and items.",
    ] },

    { type: "h2", text: "Ranking" },
    { type: "p", text: "The ranker scores each candidate with a richer model (gradient-boosted trees or a deep network) using many features: user history, item statistics, context like time and device, and user-item interaction features. It usually predicts several probabilities, such as click, watch time, like and hide, and combines them into one score with weights that reflect product goals." },
    { type: "ul", items: [
      "Features come from a [feature store](/learn/feature-store), with user features fetched once and item features batched.",
      "A heavy ranker may only fit a few hundred candidates within the latency budget, so a light pre-ranker sometimes sits between retrieval and ranking.",
      "Optimising only clicks rewards clickbait; combine engagement with satisfaction signals and long-term outcomes.",
    ] },

    { type: "h2", text: "Re-ranking and policy" },
    { type: "ul", items: [
      "**Diversity:** avoid ten items from the same creator or topic in a row.",
      "**Freshness:** boost new items so they get a chance to collect feedback (exploration).",
      "**Business rules:** remove out-of-stock products, respect age ratings, enforce sponsored-slot limits.",
      "**Safety and integrity:** filter policy-violating content and downrank low-quality items.",
      "**Already seen:** remove items the user has already viewed or dismissed.",
    ] },

    { type: "h2", text: "Data, training and feedback loops" },
    { type: "p", text: "Training data comes from logs of what was **shown** and what happened next. That creates biases a strong answer addresses:" },
    { type: "ul", items: [
      "**Position bias:** items shown first get clicked more regardless of quality. Log positions and correct for them.",
      "**Feedback loops:** the model only learns about items it already shows, so popular items get more popular. Reserve some traffic for exploration.",
      "**Delayed and implicit labels:** a purchase may come days after a click; skipping a song is a negative signal only sometimes.",
      "**Freshness:** user interests shift quickly, so retrain often and use recent behaviour as real-time features.",
    ] },
    { type: "p", text: "Evaluate offline with ranking metrics such as recall@k for retrieval and NDCG for ranking, then confirm with an [A/B test](/learn/ab-testing-experimentation) on engagement and guardrail metrics. See [ML evaluation](/learn/ml-evaluation-metrics)." },

    { type: "h2", text: "Serving at scale" },
    { type: "ul", items: [
      "Precompute candidates for inactive users in batch; compute fresh ones online for active sessions.",
      "Cache popular item embeddings and features; batch model inference on GPUs or optimised CPU runtimes.",
      "Set a latency budget per stage (for example 20 ms retrieval, 50 ms ranking) and degrade gracefully, such as serving trending items if ranking times out.",
    ] },
  ],
  uses: [
    { name: "Video and short-form feeds", text: "Two-tower retrieval from a huge catalogue, multi-objective ranking on watch time and satisfaction, then diversity re-ranking." },
    { name: "E-commerce", text: "\"Recommended for you\" and \"frequently bought together\" combine co-purchase retrieval with a conversion-optimised ranker and stock rules." },
    { name: "Music streaming", text: "Session-aware retrieval and ranking pick the next track, using skips as fast negative feedback." },
  ],
  interview: [
    "Draw the funnel and give each stage a candidate count and latency budget.",
    "Explain two-tower retrieval with an ANN index, plus heuristic sources for cold start.",
    "Name the ranking objectives and why pure click optimisation is risky.",
    "Address position bias and feedback loops in the training data.",
  ],
  related: ["vector-databases", "feature-store", "ml-evaluation-metrics", "ab-testing-experimentation", "model-serving", "learning-to-rank", "cold-start-problem", "design-video-recommendation-system", "ml-feedback-loops"],
  practice: ["recommendation-engine", "news-feed"],
  reading: [
    { title: "Deep Neural Networks for YouTube Recommendations", publisher: "Covington et al., RecSys 2016", url: "https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/" },
    { title: "Recommendation systems course", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/recommendation" },
  ],
};
