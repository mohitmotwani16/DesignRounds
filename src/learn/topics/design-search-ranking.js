// Case study: ML search ranking for an e-commerce or content search engine.
export default {
  blocks: [
    { type: "p", text: "**The question**: design the ranking system for search on a large e-commerce site (or a content platform). A user types a query; the system must return the most relevant results first, in a few hundred milliseconds, over a catalogue of hundreds of millions of items. It combines classic information retrieval with [learning to rank](/learn/learning-to-rank)." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Goal?", "More purchases from search, measured as search conversion rate and revenue per search"],
      ["Scale?", "300M products, 50K queries per second at peak"],
      ["Latency?", "Results in under 200 ms at p99"],
      ["Query types?", "Head queries (\"iphone case\") are frequent; long-tail queries are most of the distinct queries"],
      ["Personalised?", "Lightly: location, size preferences and past brands, but relevance first"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "Rank (query, product) pairs. Labels come from two sources: **human relevance grades** (0 = irrelevant to 3 = exact match) for evaluation and some training, and **implicit feedback** (click, add-to-cart, purchase) for scale. A graded label combines them: 0 shown, 1 clicked, 2 added to cart, 3 purchased. The model is listwise (LambdaMART) or a deep ranker optimising NDCG." },

    { type: "h2", text: "3. Architecture" },
    { type: "diagram", kind: "flow", caption: "A search request: query understanding rewrites and classifies the query, lexical and semantic retrieval run in parallel, results are merged and ranked by a learned model, then business rules apply.", nodes: [
      { id: "q", label: "Query", col: 0, row: 1, shape: "pill" },
      { id: "qu", label: "Query understanding", sub: "spell · category · intent", col: 1.3, row: 1, tone: "accent", w: 170 },
      { id: "lex", label: "Lexical retrieval", sub: "inverted index · BM25", col: 2.75, row: 0.3 },
      { id: "sem", label: "Semantic retrieval", sub: "embeddings · ANN", col: 2.75, row: 1.7 },
      { id: "merge", label: "Merge", sub: "~1,000", col: 4, row: 1 },
      { id: "rank", label: "LTR ranker", sub: "1,000 → 100", col: 5.15, row: 1, tone: "accent" },
      { id: "biz", label: "Rules", sub: "stock · ads · dedupe", col: 6.3, row: 1, tone: "ok" },
    ], edges: [
      { from: "q", to: "qu" }, { from: "qu", to: "lex" }, { from: "qu", to: "sem" }, { from: "lex", to: "merge" }, { from: "sem", to: "merge" }, { from: "merge", to: "rank" }, { from: "rank", to: "biz" },
    ] },

    { type: "h2", text: "4. Query understanding" },
    { type: "ul", items: [
      "**Normalisation and spell correction** (\"iphnoe\" → \"iphone\").",
      "**Query classification:** predicted category (phones, cases) used as a filter or a ranking feature.",
      "**Entity and attribute extraction:** brand, colour, size from the query (\"red nike running shoes size 10\").",
      "**Query expansion:** synonyms and related terms (\"sofa\" ↔ \"couch\").",
      "Head queries' interpretations can be precomputed and cached.",
    ] },

    { type: "h2", text: "5. Retrieval" },
    { type: "p", text: "Two complementary retrievers. **Lexical** retrieval over an [inverted index](/learn/search-and-inverted-index) with BM25 catches exact terms, model numbers and brands. **Semantic** retrieval embeds queries and products with a two-tower model and finds neighbours in a [vector index](/learn/vector-databases), catching paraphrases (\"laptop for kids\"). Merging them is [hybrid search](/learn/hybrid-search-reranking)." },

    { type: "h2", text: "6. Ranking features" },
    { type: "table", head: ["Group", "Examples"], rows: [
      ["Text match", "BM25 on title and description, exact brand match, attribute matches, query-product embedding similarity"],
      ["Product quality", "Rating, number of reviews, return rate, seller quality"],
      ["Behaviour", "CTR and conversion rate for this query-product pair (smoothed), overall popularity"],
      ["Commercial", "Price relative to category, discount, delivery speed, in stock"],
      ["Personal and context", "User's preferred brands and sizes, location, device"],
    ] },
    { type: "p", text: "Query-product behaviour features are powerful but suffer **position bias**: products ranked high get clicked more. Correct for it in training labels; see [feedback loops](/learn/ml-feedback-loops)." },

    { type: "h2", text: "7. Model and training" },
    { type: "ul", items: [
      "**Baseline:** BM25 plus popularity.",
      "**Production:** LambdaMART on the features above (strong with dense features), or a deep ranker that also consumes text embeddings.",
      "**Final relevance check:** a cross-encoder scoring (query, title) on the top 50 catches results that look popular but don't match.",
      "Retrain weekly; query trends are slow except for seasonal and new-product spikes.",
    ] },

    { type: "h2", text: "8. Serving and scale" },
    { type: "code", code: `Peak load     : 50K QPS
Index         : 300M products sharded by product id across ~50 shards × 3 replicas;
                each query fans out to all shards, each returns its top 200 (scatter-gather)
Vectors       : 300M × 256 dims int8 ≈ 77 GB → sharded ANN, ~10 ms per query
Ranking       : 1,000 candidates × 50K QPS = 50M scores/s; trees on CPU fleet
Caching       : top ~10% of queries cover a large share of traffic → cache results
                for a few minutes, keyed by query + locale (+ coarse user segment)
Latency plan  : understand 15 ms | retrieve 40 ms | features 30 ms | rank 40 ms | rules 10 ms` },

    { type: "h2", text: "9. Evaluation" },
    { type: "ul", items: [
      "**Offline:** NDCG@10 on human-graded query sets, separately for head, torso and tail queries; recall@1000 for retrieval.",
      "**Interleaving** for fast, sensitive comparison of two rankers on live traffic.",
      "**A/B tests** for launch: search conversion, revenue per search, null-result rate, query reformulation rate (a sign of bad results).",
      "See [ML evaluation](/learn/ml-evaluation-metrics).",
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*What about queries with zero results?* Query relaxation (drop terms), semantic retrieval and category fallbacks.",
      "*How do sponsored products fit?* A separate ads auction blends into fixed slots, with relevance thresholds.",
      "*How do you rank a new product with no clicks?* Text and attribute features plus category priors; behaviour features fill in later.",
    ] },
  ],
  uses: [
    { name: "E-commerce search", text: "Hybrid retrieval and LTR ranking optimised for conversion, with stock and delivery rules." },
    { name: "Local search", text: "Distance and opening hours as key features alongside relevance, as in map search." },
    { name: "Content search", text: "Video or music search mixing text relevance with engagement and freshness." },
  ],
  interview: [
    "Separate query understanding, retrieval and ranking, with counts per stage.",
    "Use both lexical and semantic retrieval and explain what each catches.",
    "Define graded labels from human ratings and implicit feedback, and handle position bias.",
    "Evaluate with NDCG by query segment, interleaving and A/B tests.",
  ],
  related: ["learning-to-rank", "search-and-inverted-index", "hybrid-search-reranking", "vector-databases", "two-stage-processing", "typeahead-autocomplete"],
  practice: ["search-ranking", "autocomplete", "recommendation-engine", "web-crawler"],
  reading: [
    { title: "From RankNet to LambdaRank to LambdaMART: An Overview", publisher: "Chris Burges, Microsoft Research", url: "https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/" },
    { title: "The Probabilistic Relevance Framework: BM25 and Beyond", publisher: "Robertson and Zaragoza, 2009", url: "https://dl.acm.org/doi/10.1561/1500000019" },
  ],
};
