// The two-stage processing pattern: a fast, recall-oriented filter followed by precise, expensive
// ranking on a small candidate set; scaling, applications and design considerations.
export default {
  blocks: [
    { type: "p", text: "A search engine holds 10 million documents, and a query for \"distributed systems\" must return the 10 most relevant, ranked by quality. Running a complex relevance model over all 10 million takes far too long. **Two-stage processing** splits the work: a **fast filter** cuts the data down to a small set of candidates, then an **expensive, precise algorithm** runs only on those." },

    { type: "h2", text: "Fast filter, then precise ranking" },
    { type: "diagram", kind: "flow", caption: "Two-stage processing: a cheap filter shrinks 10 million documents to 50,000 candidates in milliseconds; an expensive ranker scores only those and returns the top 10.", nodes: [
      { id: "all", label: "10,000,000 documents", col: 0, row: 0, shape: "db", tone: "store", w: 190 },
      { id: "s1", label: "Stage 1: filter", sub: "inverted index, AND of terms", col: 1.6, row: 0, tone: "accent", w: 210 },
      { id: "c", label: "50,000 candidates", sub: "IDs only", col: 3.1, row: 0, tone: "cache" },
      { id: "s2", label: "Stage 2: rank", sub: "TF, popularity, location, clicks", col: 4.6, row: 0, tone: "ok", w: 220 },
      { id: "top", label: "Top 10", col: 6, row: 0, shape: "pill", tone: "ok" },
    ], edges: [{ from: "all", to: "s1" }, { from: "s1", to: "c", label: "~20 ms" }, { from: "c", to: "s2" }, { from: "s2", to: "top", label: "~80 ms" }] },
    { type: "ul", items: [
      "**Stage one favors speed over precision.** An [inverted index](/learn/search-and-inverted-index) maps keywords to documents; \"distributed systems\" looks up both terms and intersects the lists, finding 50,000 documents in milliseconds with hash lookups and set operations and no scoring.",
      "**Stage two favors precision.** The ranker scores each candidate using term frequency, document popularity, user location and click-through history, then sorts and returns the top 10. That's expensive per document, but feasible on 50,000 instead of 10 million.",
    ] },

    { type: "h2", text: "Why it scales" },
    { type: "p", text: "The filter removes orders of magnitude. Running a complex algorithm over 10 million items might take 30 seconds; filtering to 1,000 candidates in 20 ms and scoring them in 80 ms finishes in **100 ms**. The cheap stage handles most of the data; the slow stage sees only a sliver." },
    { type: "ul", items: [
      "**Stages scale independently**: filtering machines with fast SSDs and lots of RAM for indexes; ranking machines with GPUs for ML models. Add filter capacity for more queries, ranking capacity when scoring is the bottleneck.",
      "**Stage one can be approximate**: a recommender uses collaborative filtering to find 500 similar users quickly (some not truly similar), and a deep model in stage two predicts what to recommend from those, correcting the filter's mistakes.",
    ] },
    { type: "code", code: `import heapq

def search(query: str, index: dict[str, set[int]], score, k: int = 10, max_candidates: int = 50_000):
    # Stage 1: cheap, recall-oriented filter (set intersection on the inverted index)
    terms = query.lower().split()
    postings = sorted((index.get(t, set()) for t in terms), key=len)
    candidates = set.intersection(*postings) if postings else set()
    candidates = list(candidates)[:max_candidates]          # cap the work for stage 2

    # Stage 2: expensive, precision-oriented scoring on the few candidates only
    return heapq.nlargest(k, candidates, key=lambda doc_id: score(doc_id, terms))

index = {"distributed": {1, 2, 3, 7}, "systems": {2, 3, 7, 9}}
popularity = {2: 0.4, 3: 0.9, 7: 0.6}
print(search("distributed systems", index, lambda d, t: popularity.get(d, 0), k=2))   # [3, 7]` },

    { type: "h2", text: "Where it's used" },
    { type: "table", head: ["Domain", "Stage 1 (fast filter)", "Stage 2 (precise)"], rows: [
      ["Web search", "Inverted index drops ~99.99% of pages in milliseconds", "Ranking over the remaining candidates (Google-scale)"],
      ["Recommendations", "Viewing history / collaborative filtering finds ~1,000 possible movies", "A neural network predicts ratings and returns the top 10 (Netflix-style). See [recommendation systems](/learn/recommendation-system-design)"],
      ["Fraud detection", "Simple rules on amount, merchant category and location flag ~0.1% of transactions", "ML models, external lookups and history analysis on the flagged few"],
      ["Image similarity", "Locality-sensitive hashing on embeddings narrows 10 million images to ~500", "Precise feature-by-feature similarity scores. See [vector databases](/learn/vector-databases)"],
    ] },

    { type: "h2", text: "Design considerations" },
    { type: "ul", items: [
      "**Stage one must not drop the right answers.** Stage two can't recover what was filtered out, so err toward passing too many candidates (better 10,000 than missing the best result).",
      "**Pass IDs, not documents.** Shipping 50,000 full documents between stages wastes bandwidth; pass IDs (plus only the fields stage two needs) and let stage two fetch details.",
      "**Watch the reduction ratio.** If stage one emits 100,000 items and stage two can't keep up, tighten the filter; if it emits 10 and stage two is idle, loosen it for better quality. Tune both stages together.",
    ] },
    { type: "p", text: "In an interview, say plainly that ranking every document is too slow, propose index-based retrieval followed by ranking, discuss the recall vs speed trade-off of the filter, and name techniques for each stage: hash lookups, inverted indexes, [Bloom filters](/learn/probabilistic-data-structures) or LSH for stage one; ML models, graph algorithms or detailed similarity for stage two." },
  ],
  uses: [
    { name: "Search engines", text: "Retrieval from an inverted index, then learning-to-rank on the top few thousand." },
    { name: "Feeds and recommendations", text: "Candidate generation from many sources, then a heavy ranking model." },
    { name: "Ads", text: "Targeting filters pick eligible ads; an auction and click-prediction model ranks them." },
    { name: "Security", text: "Cheap rules flag events; expensive analysis runs only on flagged ones." },
  ],
  interview: [
    "When a precise algorithm is too slow for the whole dataset, add a cheap high-recall filter in front of it.",
    "Give numbers: 10M → 50K → top 10, with the latency of each stage.",
    "Tune the filter for recall, pass IDs between stages, and scale the stages separately.",
  ],
  related: ["search-and-inverted-index", "recommendation-system-design", "vector-databases", "precomputation-pattern", "probabilistic-data-structures", "learning-to-rank", "design-search-ranking"],
  practice: ["autocomplete", "recommendation-engine", "rag-search"],
};
