export default {
  blocks: [
    { type: "p", text: "A **vector database** stores **embeddings**, lists of numbers that represent the meaning of text, images or users, and finds the stored vectors most similar to a query vector. Exact search compares the query against every vector, which is too slow for millions of items, so vector databases use **approximate nearest neighbour (ANN)** indexes such as **HNSW** and **IVF** that trade a little accuracy (**recall**) for very large speed-ups." },
    {"type":"diagram","kind":"flow","caption":"Semantic search with a vector database: documents and queries go through the same embedding model, and an approximate nearest-neighbour index finds the closest vectors.","nodes":[{"id":"docs","label":"Documents","col":0,"row":0},{"id":"embed","label":"Embedding model","col":1,"row":0,"tone":"accent"},{"id":"index","label":"Vector index","sub":"HNSW","col":2,"row":0,"shape":"db","tone":"store"},{"id":"query","label":"Query","col":0,"row":1},{"id":"qembed","label":"Embed query","col":1,"row":1,"tone":"accent"},{"id":"search","label":"ANN search","sub":"top-k + filters","col":2,"row":1},{"id":"results","label":"Results","sub":"re-ranked","col":3,"row":1,"tone":"ok"}],"edges":[{"from":"docs","to":"embed"},{"from":"embed","to":"index","label":"vectors"},{"from":"query","to":"qembed"},{"from":"qembed","to":"search"},{"from":"index","to":"search","label":"nearest","dashed":true},{"from":"search","to":"results"}]},

    { type: "h2", text: "Embeddings and similarity" },
    { type: "p", text: "An embedding model maps similar things to nearby points: \"refund policy\" and \"how do I get my money back\" end up close together even though they share no words. Similarity is measured with:" },
    { type: "table", head: ["Measure", "Meaning", "Notes"], rows: [
      ["Cosine similarity", "Angle between vectors", "The usual choice for text embeddings"],
      ["Dot product", "Angle and length", "Equals cosine when vectors are normalised; used by many retrieval models"],
      ["Euclidean (L2) distance", "Straight-line distance", "Common for image and other embeddings"],
    ] },
    { type: "p", text: "Use the measure the embedding model was trained for. Vectors typically have a few hundred to a few thousand dimensions; a million 768-dimension vectors in 32-bit floats take about 3 GB before index overhead." },

    { type: "h2", text: "ANN index types" },
    { type: "table", head: ["Index", "How it works", "Strengths", "Weaknesses"], rows: [
      ["Flat (exact)", "Compare against every vector", "Perfect recall, simple", "Linear cost; fine only for small sets"],
      ["HNSW", "A multi-layer graph where each vector links to near neighbours; search greedily walks the graph from the top layer down", "Very high recall at low latency; supports incremental inserts", "Memory-hungry; deletes and rebuilds are costly"],
      ["IVF", "Cluster vectors into many lists; search only the lists nearest the query", "Smaller memory, fast builds, good for very large sets", "Recall depends on how many lists you probe; needs training on sample data"],
      ["Product quantisation (PQ)", "Compress vectors into short codes; often combined with IVF", "Large memory savings", "Lower precision; re-rank with full vectors to recover"],
      ["Disk-based graphs (e.g. DiskANN-style)", "Graph index stored on SSD with a small in-memory part", "Billions of vectors without all of them in RAM", "Higher latency than in-memory"],
    ] },
    { type: "p", text: "Each index has knobs that trade recall for speed, such as HNSW's search breadth or IVF's number of probed lists. Tune them against a measured recall target on your own data, for example 95% recall@10 compared with exact search." },

    { type: "h2", text: "Filtering and hybrid queries" },
    { type: "p", text: "Real queries combine similarity with conditions: \"similar products, in stock, under ₹2,000, in this category\", or \"chunks this user is allowed to read\". How filters are applied matters:" },
    { type: "ul", items: [
      "**Post-filtering** (search, then drop non-matching results) can return too few results when the filter is selective.",
      "**Pre-filtering** (restrict the candidate set first) is accurate but can be slow if the index can't skip efficiently.",
      "Good vector databases apply filters **during** graph or list traversal, and partition indexes by high-level filters such as tenant.",
      "For text, combine vector search with keyword search (**hybrid search**) to handle exact terms and IDs. See [RAG](/learn/retrieval-augmented-generation).",
    ] },

    { type: "h2", text: "Scaling vector search" },
    { type: "ul", items: [
      "**Shard** vectors across nodes and query all shards in parallel, merging their top-k results; replicate shards for read throughput and availability. See [sharding](/learn/sharding).",
      "**Separate indexing from serving:** build or rebuild indexes in the background and swap them in.",
      "**Freshness:** newly inserted vectors may sit in a small unindexed buffer that's searched exactly until it's merged into the main index.",
      "**Re-embedding:** changing the embedding model invalidates every vector, so plan a full rebuild with a dual-write or blue-green index switch.",
      "**Multi-tenancy:** a namespace or partition per tenant keeps filters cheap and data isolated.",
    ] },

    { type: "h2", text: "Do you need a dedicated vector database?" },
    { type: "p", text: "Not always. Many relational and search databases now support vector indexes (for example PostgreSQL with the pgvector extension, or Elasticsearch and OpenSearch). For thousands to a few million vectors that live alongside relational data, an extension keeps one system and transactional consistency. Dedicated vector databases earn their place at hundreds of millions of vectors, with heavy filtering, high query rates or tight latency targets." },
  ],
  uses: [
    { name: "RAG and semantic search", text: "Retrieve document chunks similar in meaning to a question, filtered by the user's permissions." },
    { name: "Recommendations", text: "Two-tower models embed users and items; ANN search over item vectors generates candidates in milliseconds." },
    { name: "Deduplication and similarity", text: "Find near-duplicate images, products or support tickets by embedding distance." },
  ],
  interview: [
    "Explain embeddings and pick the similarity measure the model expects.",
    "Compare HNSW and IVF in terms of recall, latency, memory and updates.",
    "Explain how filters interact with ANN search.",
    "Plan for sharding, freshness and re-embedding when the model changes.",
  ],
  related: ["retrieval-augmented-generation", "recommendation-system-design", "search-and-inverted-index", "sharding", "ai-application-architecture", "embeddings", "hybrid-search-reranking", "design-visual-search"],
  practice: ["rag-search", "recommendation-engine"],
  reading: [
    { title: "Efficient and robust approximate nearest neighbor search using HNSW graphs", publisher: "Malkov and Yashunin, arXiv", url: "https://arxiv.org/abs/1603.09320" },
    { title: "Faiss documentation", publisher: "Meta AI", url: "https://faiss.ai/" },
    { title: "pgvector", publisher: "GitHub", url: "https://github.com/pgvector/pgvector" },
  ],
};
