// Case study: visual image search with embeddings (Pinterest Lens / Google Lens style).
export default {
  blocks: [
    { type: "p", text: "**The question**: design a visual search system: a user uploads a photo (or crops part of one) and gets visually similar images or products back, like Pinterest Lens or a shop-the-look feature. The core is an **embedding model** that maps images to vectors where similar images are close, an **approximate nearest neighbour index** over billions of images, and a **re-ranker** that turns similar-looking into useful." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Query?", "An image or a crop; optionally combined with text (\"this but in blue\")"],
      ["Results?", "Visually similar images; for shopping, similar purchasable products"],
      ["Scale?", "5B indexed images; 2M new images per day; 5K queries per second"],
      ["Latency?", "Under 500 ms including upload processing"],
      ["Freshness?", "New images searchable within an hour"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "**Representation learning plus retrieval**: learn an encoder f(image) → vector such that similar images have high cosine similarity. Retrieval is nearest-neighbour search; ranking then orders the neighbours by predicted usefulness (for example p(click or save)). See [embeddings](/learn/embeddings)." },

    { type: "h2", text: "3. Training the embedding model" },
    { type: "diagram", kind: "flow", caption: "Contrastive training: two views of the same image (or an image and an image the user engaged with next) are pulled together; other images in the batch are pushed apart.", nodes: [
      { id: "img", label: "Image", col: 0, row: 1, shape: "pill" },
      { id: "a1", label: "View A", sub: "crop · colour jitter", col: 1.3, row: 0.3 },
      { id: "a2", label: "View B / co-engaged", col: 1.3, row: 1.7, w: 160 },
      { id: "enc", label: "Image encoder", sub: "shared weights", col: 2.7, row: 1, tone: "accent" },
      { id: "loss", label: "Contrastive loss", sub: "pull pairs · push batch", col: 4.1, row: 1, tone: "ok", w: 170 },
    ], edges: [
      { from: "img", to: "a1" }, { from: "img", to: "a2" }, { from: "a1", to: "enc" }, { from: "a2", to: "enc" }, { from: "enc", to: "loss" },
    ] },
    { type: "ul", items: [
      "**Self-supervised pairs:** augmentations of the same image (crops, flips, colour changes) as positives; no labels needed.",
      "**Engagement pairs:** a query image and the result the user then saved or clicked, which teaches the product's notion of \"similar\".",
      "**Image-text pairs:** training jointly with captions (CLIP-style) enables text and image queries in one space.",
      "**Hard negatives:** images that look close but were skipped sharpen the model.",
      "Start from a pretrained backbone and fine-tune; training from scratch is rarely needed.",
    ] },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "Indexing (bottom) embeds every new image and inserts it into a sharded ANN index; querying (top) detects objects, embeds the crop, retrieves neighbours, and re-ranks them.", zones: [{ label: "indexing", from: [0, 1.9], to: [4.2, 1.9], tone: "muted" }], nodes: [
      { id: "q", label: "Query photo", col: 0, row: 0.4, shape: "pill" },
      { id: "det", label: "Object detection", sub: "pick a crop", col: 1.3, row: 0.4 },
      { id: "qe", label: "Encoder", col: 2.6, row: 0.4, tone: "accent" },
      { id: "ann", label: "ANN index", sub: "sharded · 5B vectors", col: 3.9, row: 1.15, shape: "db", tone: "cache", w: 160 },
      { id: "rr", label: "Re-rank", sub: "dedupe · quality", col: 5.2, row: 0.4, tone: "ok" },
      { id: "new", label: "New images", col: 0, row: 1.9, shape: "queue", tone: "queue" },
      { id: "be", label: "Batch encoder", sub: "GPU workers", col: 1.3, row: 1.9, tone: "accent" },
      { id: "meta", label: "Image metadata", col: 2.6, row: 1.9, shape: "db", tone: "store" },
    ], edges: [
      { from: "q", to: "det" }, { from: "det", to: "qe" }, { from: "qe", to: "ann" }, { from: "ann", to: "rr" },
      { from: "new", to: "be" }, { from: "be", to: "ann", label: "insert" }, { from: "be", to: "meta" }, { from: "meta", to: "rr", dashed: true },
    ] },

    { type: "h2", text: "5. Indexing at scale" },
    { type: "code", code: `Vectors     : 5B images × 256 dims
  float32   : 5B × 1 KB ≈ 5 TB      → far too much RAM
  PQ (64 B) : 5B × 64 B ≈ 320 GB    → shard over ~10-20 machines, re-rank top
                                       candidates with full vectors from SSD
Index type  : IVF-PQ (coarse clusters + compressed codes) or HNSW on smaller shards
Query       : fan out to all shards, each returns top 100, merge → top 500
New images  : 2M/day ≈ 23/s → embed on arrival, insert into a small fresh index,
              merged into the main index in nightly rebuilds` },
    { type: "p", text: "Changing the encoder means re-embedding all 5B images into a new index before switching, a large but parallel batch job. See [vector databases](/learn/vector-databases) for index types and the recall-latency trade-off." },

    { type: "h2", text: "6. Re-ranking" },
    { type: "ul", items: [
      "Remove near-duplicates (the same image uploaded many times) using a tight similarity threshold or perceptual hashes.",
      "Combine visual similarity with quality and engagement features in a learned ranker.",
      "Apply safety filters and, for shopping, availability and region.",
      "For text-refined queries (\"in blue\"), combine the image vector with a text vector or filter by attributes.",
    ] },

    { type: "h2", text: "7. Evaluation" },
    { type: "table", head: ["Offline", "Online"], rows: [
      ["Recall@k and mAP on human-labelled similar pairs", "Click-through and save rate on results"],
      ["Recall of exact-product matches for shopping", "Purchases or outbound clicks from visual search"],
      ["Per-category slices (fashion, furniture, food)", "Query abandonment and reformulation"],
    ] },
  ],
  uses: [
    { name: "Shopping", text: "Find a product from a photo, matched against catalogue images with availability filters." },
    { name: "Inspiration platforms", text: "Related pins and visual discovery from any crop of an image." },
    { name: "Duplicate and copyright detection", text: "The same embedding and index machinery finds near-copies of images." },
  ],
  interview: [
    "Frame it as representation learning plus nearest-neighbour retrieval plus re-ranking.",
    "Explain contrastive training with augmentation and engagement pairs.",
    "Size the index and use product quantization and sharding.",
    "Plan for re-embedding the corpus when the model changes.",
  ],
  related: ["embeddings", "vector-databases", "learning-to-rank", "design-search-ranking", "hybrid-search-reranking"],
  practice: ["visual-search", "rag-search", "recommendation-engine"],
  reading: [
    { title: "Learning Transferable Visual Models From Natural Language Supervision (CLIP)", publisher: "Radford et al., OpenAI, 2021", url: "https://arxiv.org/abs/2103.00020" },
    { title: "Graph Convolutional Neural Networks for Web-Scale Recommender Systems (PinSage)", publisher: "Ying et al., Pinterest, KDD 2018", url: "https://arxiv.org/abs/1806.01973" },
  ],
};
