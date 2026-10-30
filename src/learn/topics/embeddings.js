export default {
  blocks: [
    { type: "p", text: "An **embedding** is a dense vector of numbers (typically 64 to 1,536 of them) that represents an item, a user, a query, a piece of text or an image, so that **similar things end up close together**. Embeddings are how ML systems handle ids with millions of values, compare text and images by meaning, and retrieve a thousand good candidates out of a billion in milliseconds. This guide covers how they are learned, stored, served and refreshed, which is what system design interviews probe." },

    { type: "h2", text: "What an embedding gives you" },
    { type: "ul", items: [
      "**Compression:** a user id with 500 million values becomes a 128-number vector instead of a 500-million-wide one-hot column.",
      "**Similarity:** distance between vectors (cosine similarity or dot product) measures relatedness, so \"find items like this\" becomes a nearest-neighbour search.",
      "**Transfer:** an embedding learned on one task (say watch history) is a strong feature for another (say notifications).",
      "**Cross-modal matching:** text and images embedded in one space let a text query find photos.",
    ] },

    { type: "h2", text: "How embeddings are learned" },
    { type: "table", head: ["Method", "Training signal", "Typical use"], rows: [
      ["Embedding layer in a model", "The model's own task loss (click, purchase)", "Id features in ranking models"],
      ["Two-tower (dual encoder)", "Pull users towards items they engaged with, push away others", "Candidate retrieval for recommendations and search"],
      ["Contrastive learning", "Two views of the same thing should match (image + caption)", "Visual search, multimodal retrieval"],
      ["Co-occurrence (word2vec style)", "Items that appear in the same sessions are similar", "Item-to-item recommendations"],
      ["Graph embeddings", "Nodes close in a graph should be close in space", "People You May Know, fraud rings"],
      ["Pretrained text / image encoders", "Large-scale pretraining, optionally fine-tuned", "Semantic search, RAG, classification features"],
    ] },
    { type: "h3", text: "The two-tower model" },
    { type: "p", text: "The workhorse of retrieval. One tower encodes the **query side** (user, context, or search text), the other the **item side**. Training uses (user, item engaged) pairs as positives and other items in the batch as negatives. Because the towers only meet at a final dot product, item vectors can be **precomputed** and indexed, and only the user vector is computed at request time." },
    { type: "diagram", kind: "flow", caption: "A two-tower model. Item embeddings are computed offline and loaded into an ANN index; at request time only the query tower runs, and the index returns the nearest items.", zones: [{ label: "offline", from: [2.4, 1.6], to: [4.8, 1.6], tone: "muted" }], nodes: [
      { id: "uf", label: "User + context", sub: "history, locale", col: 0, row: 0.3 },
      { id: "ut", label: "Query tower", col: 1.2, row: 0.3, tone: "accent" },
      { id: "uv", label: "User vector", col: 2.4, row: 0.3, tone: "accent", shape: "pill" },
      { id: "ann", label: "ANN index", sub: "top-k by dot product", col: 3.7, row: 0.3, shape: "db", tone: "cache" },
      { id: "out", label: "~1,000 candidates", col: 5, row: 0.3, shape: "pill" },
      { id: "if", label: "Item features", col: 2.4, row: 1.6 },
      { id: "it", label: "Item tower", sub: "batch inference", col: 3.6, row: 1.6, tone: "accent" },
    ], edges: [
      { from: "uf", to: "ut" }, { from: "ut", to: "uv" }, { from: "uv", to: "ann" }, { from: "ann", to: "out" },
      { from: "if", to: "it" }, { from: "it", to: "ann", label: "item vectors" },
    ] },
    { type: "p", text: "In-batch negatives over-penalise popular items (they appear as negatives more often), so production systems correct the logits by item frequency, and mix in **hard negatives**: items that look relevant but weren't chosen." },

    { type: "h2", text: "Serving embeddings" },
    { type: "ul", items: [
      "**Item vectors** live in an [approximate nearest neighbour index](/learn/vector-databases) (HNSW, IVF-PQ) for retrieval, and in a key-value store for lookup as ranking features.",
      "**User vectors** are either precomputed daily (cheap, stale) or computed per request from recent behaviour (fresh, costs a model call).",
      "**Embedding tables** inside ranking models can be huge: 1 billion ids × 64 floats × 4 bytes is 256 GB, so they are sharded across parameter servers or GPUs, and rare ids are hashed together.",
      "**Quantisation** (float32 to int8, or product quantisation) cuts index memory 4× or more with a small recall loss.",
    ] },
    { type: "code", code: `Index sizing: 200M items × 256 dims
  float32 : 200M × 256 × 4 B ≈ 205 GB   → shard across ~4-8 machines
  int8    : 200M × 256 × 1 B ≈  51 GB   → fits on 1-2 large machines
  PQ (32 B per vector)        ≈ 6.4 GB  → one machine, lower recall; rerank exact
Query cost: ~1-10 ms per ANN search at recall@100 ≈ 0.95 (tuned)` },

    { type: "h2", text: "Refreshing and versioning" },
    { type: "p", text: "Embeddings from different model versions live in **different spaces**: a user vector from model v2 compared to item vectors from v1 is meaningless. So:" },
    { type: "ol", items: [
      "Tag every stored vector with the model version that produced it.",
      "On a new model, re-embed the whole corpus into a **new index** in the background.",
      "Switch user-side and item-side together (blue-green), and keep the old index until the new one is verified.",
      "New items between full rebuilds are embedded on arrival with the current model and inserted incrementally.",
    ] },
    { type: "callout", tone: "warning", text: "Re-embedding a large corpus is a real batch job: 200M items at 2,000 items per second per GPU is about 28 GPU-hours. Budget for it whenever you change the encoder." },

    { type: "h2", text: "Evaluating embeddings" },
    { type: "ul", items: [
      "**Retrieval metrics:** recall@k against held-out engagements (did the item the user actually watched appear in the top 500?).",
      "**Downstream impact:** offline ranking metrics or an online test using the new candidates.",
      "**Sanity checks:** nearest neighbours of known items, clustering by category, and drift in the vector distribution between versions.",
    ] },
  ],
  uses: [
    { name: "Recommendations", text: "Two-tower retrieval over a catalogue of hundreds of millions of items, with user vectors refreshed from the current session." },
    { name: "Semantic search and RAG", text: "Text chunks embedded with a pretrained encoder and searched by meaning; see [RAG](/learn/retrieval-augmented-generation)." },
    { name: "Visual search", text: "Contrastively trained image embeddings find visually similar products; see [visual search](/learn/design-visual-search)." },
  ],
  interview: [
    "Use a two-tower model for retrieval and explain why item vectors can be precomputed.",
    "Size the index and propose quantisation or sharding if it doesn't fit.",
    "Explain negatives: in-batch, popularity correction and hard negatives.",
    "Say how you re-embed and swap indexes when the encoder changes.",
  ],
  related: ["vector-databases", "recommendation-system-design", "feature-engineering", "design-visual-search", "retrieval-augmented-generation"],
  practice: ["visual-search", "video-recommendations", "recommendation-engine", "rag-search"],
  reading: [
    { title: "Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations", publisher: "Yi et al., Google, RecSys 2019", url: "https://research.google/pubs/sampling-bias-corrected-neural-modeling-for-large-corpus-item-recommendations/" },
    { title: "Efficient Estimation of Word Representations in Vector Space", publisher: "Mikolov et al., 2013", url: "https://arxiv.org/abs/1301.3781" },
  ],
};
