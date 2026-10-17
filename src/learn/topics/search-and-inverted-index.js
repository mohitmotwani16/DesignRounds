export default {
  blocks: [
    { type: "p", text: "Full-text search finds documents containing words, ranks them by relevance, and does it in milliseconds over millions of documents. A database `LIKE '%shoe%'` query can't do this: it scans every row and has no notion of relevance. Search engines like Elasticsearch, OpenSearch and Solr (built on Lucene) are built around one data structure, the **inverted index**." },

    { type: "h2", text: "The inverted index" },
    { type: "p", text: "A normal (forward) index maps a document to its words. An **inverted index** maps each **term** to the list of documents that contain it (a **postings list**), usually with positions and frequencies." },
    { type: "table", head: ["Term", "Postings (doc id: positions)"], rows: [
      ["running", "doc1: [2], doc3: [1, 7]"],
      ["shoe", "doc1: [3], doc2: [5], doc3: [2]"],
      ["waterproof", "doc2: [1]"],
    ] },
    { type: "p", text: "A query for `running shoe` looks up two short lists and intersects them (doc1 and doc3), instead of reading every document. Positions make phrase queries (`\"running shoe\"`) possible." },

    { type: "h2", text: "From text to terms: analysis" },
    { type: "p", text: "Before indexing, text goes through an **analyzer**, and the same analysis is applied to queries so they match:" },
    { type: "ol", items: [
      "**Tokenize**: split \"Trail-Running Shoes!\" into `Trail`, `Running`, `Shoes`.",
      "**Normalize**: lowercase, strip accents.",
      "**Remove stop words** (optional): drop very common words like \"the\".",
      "**Stem or lemmatize**: `running` → `run`, `shoes` → `shoe`, so different forms match.",
      "**Synonyms and n-grams** (optional): `sneaker` ↔ `shoe`; edge n-grams (`sh`, `sho`, `shoe`) for search-as-you-type.",
    ] },

    { type: "h2", text: "Ranking: why some results come first" },
    { type: "p", text: "Lucene-based engines score documents with **BM25**, which rewards:" },
    { type: "ul", items: [
      "**Term frequency**: the term appears often in this document, with diminishing returns.",
      "**Inverse document frequency**: the term is rare across all documents (\"waterproof\" matters more than \"shoe\").",
      "**Field length normalisation**: a match in a short title counts more than in a long description.",
    ] },
    { type: "p", text: "Real products then add business signals (popularity, recency, price, personalisation), field boosts (title over body), and often a machine-learned re-ranking step over the top results. Semantic search adds **vector embeddings** so \"warm jacket\" can match \"insulated parka\" without shared words, frequently combined with BM25 in **hybrid search**." },

    { type: "h2", text: "Architecture: keeping search in sync" },
    { type: "p", text: "The search index is almost never the source of truth. Data lives in a database and is copied into the search engine:" },
    { type: "diagram", kind: "flow", caption: "Writes go to the database; changes flow through CDC or events into an indexer that updates the search cluster. Search results can lag writes by seconds.", nodes: [
      { id: "app", label: "App", col: 0, row: 0.5, shape: "pill" },
      { id: "db", label: "Database", sub: "source of truth", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "cdc", label: "CDC / events", col: 2, row: 0, shape: "queue", tone: "queue" },
      { id: "idx", label: "Indexer", sub: "transform, enrich", col: 3, row: 0 },
      { id: "es", label: "Search cluster", sub: "shards + replicas", col: 3, row: 1, shape: "db", tone: "accent" },
    ], edges: [
      { from: "app", to: "db", label: "writes" }, { from: "db", to: "cdc" }, { from: "cdc", to: "idx" }, { from: "idx", to: "es" },
      { from: "app", to: "es", label: "search queries", bend: -40 },
    ] },
    { type: "ul", items: [
      "Use [change data capture or an outbox](/learn/outbox-pattern) rather than dual writes from the app, so the index can't silently miss changes.",
      "Support a full **reindex** from the source of truth (into a new index, then switch an alias) for mapping changes and recovery.",
      "Search clusters scale by **sharding** the index (each query fans out to all shards and merges top results) and **replicating** shards for read throughput and availability.",
      "Accept that search is **eventually consistent**: a just-created item may take a second to appear.",
    ] },

    { type: "h2", text: "Database full-text search vs a search engine" },
    { type: "table", head: ["Need", "Good enough", "Use a search engine"], rows: [
      ["Simple keyword search on one table, modest volume", "PostgreSQL full-text (`tsvector` + GIN index)", ""],
      ["Typo tolerance, synonyms, rich relevance tuning", "", "Elasticsearch / OpenSearch / Solr"],
      ["Facets and filters on large catalogues", "", "Search engine aggregations"],
      ["Search-as-you-type across millions of items", "", "Search engine with n-grams or a dedicated autocomplete service"],
      ["Logs and observability search", "", "Elasticsearch / OpenSearch, or a log store"],
    ] },
  ],
  uses: [
    { name: "E-commerce search", text: "Amazon, Flipkart and Shopify stores combine text relevance, filters, facets and popularity signals over product catalogues." },
    { name: "GitHub code search", text: "Indexes billions of files with a custom engine built on inverted indexes over code tokens and n-grams." },
    { name: "Log analytics", text: "The ELK stack (Elasticsearch, Logstash, Kibana) and OpenSearch index logs for fast free-text search during incidents." },
    { name: "Wikipedia and documentation sites", text: "Use Elasticsearch or Lucene-based search with language-specific analyzers." },
  ],
  interview: [
    "Don't do search with LIKE on the primary database; add a search index fed from it.",
    "Explain the inverted index and analysis (tokenize, normalize, stem) in a sentence or two.",
    "Describe how the index stays in sync (CDC or events) and how you'd rebuild it.",
    "Mention ranking signals beyond text match: popularity, recency, personalisation.",
  ],
  related: ["database-indexing", "outbox-pattern", "sharding", "nosql-database-types", "caching"],
  practice: ["autocomplete", "rag-search", "web-crawler"],
};
