export default {
  blocks: [
    { type: "p", text: "**Learning to rank (LTR)** trains a model to order a list of candidates, such as search results, feed posts or products, so the most relevant come first. It sits after candidate retrieval in every [search](/learn/design-search-ranking) and [recommendation](/learn/recommendation-system-design) system. The key choices are the **training approach** (pointwise, pairwise or listwise), the **labels**, the **features**, and the **metric**, usually NDCG." },

    { type: "h2", text: "Where ranking sits" },
    { type: "diagram", kind: "flow", caption: "Ranking is the precise stage of a funnel. Retrieval narrows millions of documents to hundreds; a learned ranker orders them with rich features; a final layer applies business rules.", nodes: [
      { id: "q", label: "Query / user", col: 0, row: 1, shape: "pill" },
      { id: "ret", label: "Retrieval", sub: "BM25 · ANN · ~1,000", col: 1.3, row: 1, tone: "accent" },
      { id: "l1", label: "Light ranker", sub: "~1,000 → 200", col: 2.6, row: 1 },
      { id: "l2", label: "Heavy ranker", sub: "LTR model · 200 → 50", col: 3.9, row: 1, tone: "accent" },
      { id: "rr", label: "Re-rank", sub: "dedupe · diversity", col: 5.2, row: 1 },
      { id: "fs", label: "Feature store", col: 3.25, row: 2.3, shape: "db", tone: "store" },
    ], edges: [
      { from: "q", to: "ret" }, { from: "ret", to: "l1" }, { from: "l1", to: "l2" }, { from: "l2", to: "rr" }, { from: "fs", to: "l1", dashed: true }, { from: "fs", to: "l2", dashed: true },
    ] },

    { type: "h2", text: "Pointwise, pairwise and listwise" },
    { type: "table", head: ["Approach", "Learns", "Loss examples", "Pros and cons"], rows: [
      ["Pointwise", "A score per item independently (click probability, relevance grade)", "Log loss, MSE", "Simple, calibrated probabilities usable elsewhere; ignores the relative order the user sees"],
      ["Pairwise", "Which of two items for the same query should rank higher", "RankNet, hinge loss on pairs", "Directly targets order; number of pairs grows fast"],
      ["Listwise", "The best ordering of the whole list", "LambdaRank / LambdaMART, softmax cross-entropy over the list", "Optimises ranking metrics like NDCG most closely; more complex"],
    ] },
    { type: "p", text: "In practice: **pointwise** is the usual first model and is required when scores feed something that needs probabilities (an ad auction, a multi-objective blend). **LambdaMART**, gradient-boosted trees with a listwise objective, is a long-standing strong choice for search ranking with dense features. Deep rankers often use pointwise multi-task heads with a listwise term." },
    { type: "code", code: `Pairwise idea (RankNet): for documents i, j of the same query,
  P(i ranked above j) = sigmoid(s_i − s_j)
  loss = −[ y_ij · log P + (1 − y_ij) · log(1 − P) ]
LambdaRank: scale each pair's gradient by |Δ NDCG| from swapping i and j,
  so mistakes near the top of the list cost far more than near the bottom.` },

    { type: "h2", text: "Labels for ranking" },
    { type: "ul", items: [
      "**Human relevance grades:** raters score query-document pairs (for example 0 to 4). High quality, expensive, needed for evaluation sets.",
      "**Implicit feedback:** clicks, dwell time, purchases, skips. Plentiful but biased by position; see [feedback loops](/learn/ml-feedback-loops).",
      "**Graded implicit labels:** combine signals into levels, such as 0 = shown, 1 = clicked, 2 = dwelled 30 s, 3 = purchased.",
      "**Negatives:** shown-but-skipped items are better negatives than random ones, but correct for position.",
    ] },

    { type: "h2", text: "Ranking features" },
    { type: "table", head: ["Group", "Search examples", "Recommendation examples"], rows: [
      ["Query-document match", "BM25 score, title match, embedding similarity", "User-item embedding similarity"],
      ["Document quality", "Authority, freshness, spam score, past CTR", "Item popularity, completion rate, creator quality"],
      ["User", "Language, location, past queries", "Long-term interests, recent activity"],
      ["Context", "Device, time, query length", "Surface, time of day, session depth"],
      ["Interaction history", "User clicked this domain before", "User follows this creator"],
    ] },

    { type: "h2", text: "Evaluating rankers" },
    { type: "p", text: "Ranking metrics reward getting the top positions right. **NDCG@k** discounts gains logarithmically by position and normalises by the ideal ordering; **MRR** looks at the first relevant result; **recall@k** matters for retrieval stages. See [ML evaluation](/learn/ml-evaluation-metrics)." },
    { type: "diagram", kind: "bars", caption: "The NDCG position discount 1 / log2(position + 1). A relevant result at position 1 counts fully; at position 10 it counts less than a third as much, which is why ranking errors at the top matter most.", values: [
      { label: "pos 1", value: 1, display: "1.00", tone: "ok" },
      { label: "pos 2", value: 0.63, display: "0.63", tone: "ok" },
      { label: "pos 3", value: 0.5, display: "0.50", tone: "store" },
      { label: "pos 5", value: 0.39, display: "0.39", tone: "store" },
      { label: "pos 10", value: 0.29, display: "0.29", tone: "cache" },
      { label: "pos 20", value: 0.23, display: "0.23", tone: "muted" },
    ] },
    { type: "p", text: "Offline wins must be confirmed online. **Interleaving** (mixing results from two rankers in one list and seeing which side gets clicked) detects differences with far less traffic than an A/B test, and is common in search." },

    { type: "h2", text: "Serving a ranker" },
    { type: "ul", items: [
      "Score candidates in a batch, one model call per request rather than per item.",
      "Fetch user features once and item features in bulk; cache hot item features.",
      "Give each stage a latency budget (for example retrieval 20 ms, light ranker 15 ms, heavy ranker 40 ms) and a fallback ordering if the heavy ranker times out.",
      "Log the features and scores used, for debugging and for training the next model.",
    ] },
  ],
  uses: [
    { name: "Web and site search", text: "LambdaMART or deep rankers over text-match, quality and behaviour features, evaluated with rater-graded NDCG and interleaving." },
    { name: "E-commerce", text: "Ranking products by predicted purchase probability with relevance, price and availability features." },
    { name: "Feeds", text: "Pointwise multi-task rankers whose predicted probabilities are blended into one score." },
  ],
  interview: [
    "Place the ranker after retrieval and give candidate counts per stage.",
    "Choose pointwise, pairwise or listwise and justify it (probabilities needed? metric to optimise?).",
    "Describe labels, including how you handle position bias in clicks.",
    "Evaluate with NDCG@k offline and an A/B test or interleaving online.",
  ],
  related: ["recommendation-system-design", "design-search-ranking", "two-stage-processing", "ml-evaluation-metrics", "search-and-inverted-index"],
  practice: ["search-ranking", "feed-ranking", "recommendation-engine", "autocomplete"],
  reading: [
    { title: "From RankNet to LambdaRank to LambdaMART: An Overview", publisher: "Chris Burges, Microsoft Research", url: "https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/" },
    { title: "Unbiased Learning-to-Rank with Biased Feedback", publisher: "Joachims et al., WSDM 2017", url: "https://arxiv.org/abs/1608.04468" },
  ],
};
