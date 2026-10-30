export default {
  blocks: [
    { type: "p", text: "Vector search finds passages with similar **meaning**; keyword search finds passages with the same **words**. Each misses things the other catches, so production retrieval for RAG and search usually runs both (**hybrid search**), merges the results, and then **reranks** the top candidates with a slower, more accurate model. This guide explains each piece, how to fuse rankings, and the latency each step costs." },

    { type: "h2", text: "Why one retriever isn't enough" },
    { type: "table", head: ["Query", "Keyword (BM25)", "Vector (embeddings)"], rows: [
      ["\"error E4012 on checkout\"", "Finds the exact code", "May return generic checkout errors"],
      ["\"how do I get my money back\"", "Misses a page titled \"Refund policy\"", "Finds it by meaning"],
      ["\"SKU 88-1932 dimensions\"", "Exact match on the SKU", "Numbers embed poorly"],
      ["\"laptop for a kid starting school\"", "Weak: few literal matches", "Strong"],
      ["Rare names and acronyms", "Strong", "Often weak, especially for new terms"],
    ] },

    { type: "h2", text: "The hybrid retrieval pipeline" },
    { type: "diagram", kind: "flow", caption: "Hybrid retrieval: run keyword and vector search in parallel, fuse their rankings, rerank the top candidates with a cross-encoder, and pass the best few to the model.", nodes: [
      { id: "q", label: "Query", sub: "+ ACL filter", col: 0, row: 1, shape: "pill" },
      { id: "bm", label: "BM25 search", sub: "top 50", col: 1.4, row: 0.3, tone: "cache" },
      { id: "vec", label: "Vector search", sub: "top 50", col: 1.4, row: 1.7, tone: "store" },
      { id: "rrf", label: "Fusion (RRF)", sub: "~80 unique", col: 2.8, row: 1, tone: "accent" },
      { id: "rr", label: "Cross-encoder rerank", sub: "top 80 → 8", col: 4.2, row: 1, tone: "accent", w: 170 },
      { id: "ctx", label: "Prompt context", col: 5.6, row: 1, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "q", to: "bm" }, { from: "q", to: "vec" }, { from: "bm", to: "rrf" }, { from: "vec", to: "rrf" }, { from: "rrf", to: "rr" }, { from: "rr", to: "ctx" },
    ] },

    { type: "h2", text: "Keyword search: BM25" },
    { type: "p", text: "BM25 scores a document by how often query terms appear in it (with diminishing returns), how rare those terms are across the corpus, and the document's length. It runs on an [inverted index](/learn/search-and-inverted-index), handles exact identifiers perfectly, needs no training, and is fast. Its weakness is vocabulary mismatch: synonyms and paraphrases score zero." },

    { type: "h2", text: "Vector search: bi-encoders" },
    { type: "p", text: "A **bi-encoder** embeds the query and each passage separately, so passage vectors are computed once at ingestion, and query time is one embedding plus an [ANN search](/learn/vector-databases). Quality depends heavily on the embedding model and domain; fine-tuning on your own query-passage pairs often helps. See [embeddings](/learn/embeddings)." },

    { type: "h2", text: "Fusing two rankings" },
    { type: "p", text: "BM25 scores and cosine similarities live on different scales, so adding them directly is fragile. **Reciprocal rank fusion (RRF)** uses only ranks:" },
    { type: "code", code: `RRF score(d) = Σ over retrievers r of  1 / (k + rank_r(d))      (k ≈ 60 is common)

doc   BM25 rank   vector rank   RRF
A        1            8         1/61 + 1/68 = 0.0311
B        5            1         1/65 + 1/61 = 0.0318   ← top: strong in both
C        2            —         1/62         = 0.0161
D        —            2         1/62         = 0.0161` },
    { type: "p", text: "Alternatives: normalise each score to [0, 1] and take a weighted sum (tunable, but sensitive to score distributions), or learn the combination with a small ranking model if you have labelled data." },

    { type: "h2", text: "Reranking with cross-encoders" },
    { type: "p", text: "A **cross-encoder** reads the query and a passage **together** and outputs a relevance score. Because it sees both at once, it's much more accurate than comparing two separate embeddings, but it can't precompute anything, so it only runs on the top tens of candidates." },
    { type: "table", head: ["", "Bi-encoder", "Cross-encoder", "LLM as reranker"], rows: [
      ["Input", "Query and passage separately", "Query + passage together", "Query + several passages in a prompt"],
      ["Precompute passages?", "Yes", "No", "No"],
      ["Speed", "Milliseconds over millions", "Tens of ms for ~50 passages on a GPU", "Slowest and most expensive"],
      ["Accuracy", "Good", "Better", "Often best on nuanced relevance"],
      ["Role", "First-stage retrieval", "Second-stage reranking", "Final selection in high-value flows"],
    ] },

    { type: "h2", text: "Latency budget" },
    { type: "diagram", kind: "bars", caption: "An illustrative retrieval latency budget for a RAG request. Reranking is usually the most expensive retrieval step; it's worth it when precision matters.", unit: "ms", values: [
      { label: "Embed query", value: 15, display: "~15 ms", tone: "store" },
      { label: "BM25 (parallel)", value: 20, display: "~20 ms", tone: "cache" },
      { label: "ANN (parallel)", value: 15, display: "~15 ms", tone: "cache" },
      { label: "Fusion", value: 2, display: "~2 ms", tone: "ok" },
      { label: "Cross-encoder (80)", value: 60, display: "~60 ms", tone: "accent" },
    ] },
    { type: "p", text: "Keyword and vector searches run in parallel, so retrieval costs roughly the slower of the two, plus reranking. The LLM's own generation (seconds) usually dwarfs all of it." },

    { type: "h2", text: "Filters and permissions" },
    { type: "ul", items: [
      "Apply **access-control filters inside both searches**, not after retrieval, or users can be shown (or the model can quote) documents they shouldn't see.",
      "Pre-filtering in ANN indexes can hurt recall when the filter is very selective; use indexes with filter-aware search or partition by tenant.",
      "Metadata filters (product, language, date range) narrow results cheaply and improve precision.",
    ] },

    { type: "h2", text: "Evaluating retrieval" },
    { type: "p", text: "Measure recall@k for each retriever alone and for the hybrid, then NDCG or MRR after reranking, on a labelled set of queries with known relevant passages. Retrieval quality should be tracked separately from answer quality; see [LLM evaluation](/learn/llm-evaluation)." },
  ],
  uses: [
    { name: "Enterprise RAG", text: "Hybrid search with permission filters and cross-encoder reranking over internal documents." },
    { name: "E-commerce search", text: "Lexical matching for brands and SKUs plus semantic retrieval for descriptive queries." },
    { name: "Support bots", text: "Error codes found by keyword, how-to questions by meaning, merged with RRF." },
  ],
  interview: [
    "Explain what keyword and vector search each miss, with examples.",
    "Fuse with reciprocal rank fusion and say why raw scores don't add.",
    "Rerank the top candidates with a cross-encoder, and give its latency.",
    "Apply permission filters inside retrieval, not afterwards.",
  ],
  related: ["retrieval-augmented-generation", "vector-databases", "search-and-inverted-index", "rag-chunking-strategies", "design-search-ranking"],
  practice: ["rag-search", "autocomplete"],
  reading: [
    { title: "Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods", publisher: "Cormack, Clarke and Buettcher, SIGIR 2009", url: "https://dl.acm.org/doi/10.1145/1571941.1572114" },
    { title: "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks", publisher: "Reimers and Gurevych, EMNLP 2019", url: "https://arxiv.org/abs/1908.10084" },
    { title: "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction", publisher: "Khattab and Zaharia, SIGIR 2020", url: "https://arxiv.org/abs/2004.12832" },
  ],
};
