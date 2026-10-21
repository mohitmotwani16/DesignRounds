export default {
  blocks: [
    { type: "p", text: "Full-text search finds documents containing words, ranks them by relevance, and does it in milliseconds over millions of documents. A database `LIKE '%shoe%'` query can't do this: it scans every row and has no notion of relevance. Search engines like Elasticsearch, OpenSearch and Solr (built on Lucene) are built around one data structure, the **inverted index**." },

    { type: "h2", text: "The LIKE problem" },
    { type: "p", text: "Product descriptions, blog posts and reviews all need text search. SQL offers `LIKE`:" },
    { type: "code", code: `SELECT * FROM products WHERE description LIKE '%wireless%headphones%';` },
    { type: "p", text: "The database checks every row's description against the pattern: a **full table scan**. On a 10-million-row products table that takes seconds. The leading wildcard is what kills it: a B-tree index helps a prefix match like `LIKE 'apple%'` (sorted keys can be range-scanned), but `LIKE '%apple%'` could match anywhere, so every row must be read. E-commerce sites need sub-second search, and `LIKE` can't deliver it. Full-text search engines solve this." },
    { type: "diagram", kind: "flow", caption: "LIKE '%term%' reads every row; an inverted index jumps straight from the term to the matching document IDs.", nodes: [
      { id: "q1", label: "LIKE '%cat%'", col: 0, row: 0, shape: "pill" },
      { id: "scan", label: "Full table scan", sub: "check all 10M rows", col: 1.5, row: 0, tone: "danger" },
      { id: "q2", label: "search \"cat\"", col: 0, row: 1.2, shape: "pill" },
      { id: "idx", label: "Inverted index", sub: "cat → [1, 4]", col: 1.5, row: 1.2, tone: "ok" },
      { id: "res", label: "Docs 1 and 4", col: 3, row: 1.2, shape: "pill", tone: "ok" },
    ], edges: [{ from: "q1", to: "scan", tone: "danger" }, { from: "q2", to: "idx" }, { from: "idx", to: "res", label: "direct lookup" }] },

    { type: "h2", text: "The inverted index" },
    { type: "p", text: "A book's table of contents maps pages to topics; its index at the back maps topics to pages. An **inverted index** does the second: it maps each **term** to the documents that contain it. Take four documents:" },
    { type: "table", head: ["Document ID", "Document"], rows: [
      ["1", "The cat is black"],
      ["2", "The dog is brown"],
      ["3", "The mouse is grey"],
      ["4", "The cat and the dog are friends"],
    ] },
    { type: "p", text: "Tokenize each document into terms and record which documents each term appears in:" },
    { type: "table", head: ["Term", "Document IDs"], rows: [
      ["and", "4"], ["are", "4"], ["black", "1"], ["brown", "2"], ["cat", "1, 4"], ["dog", "2, 4"],
      ["friends", "4"], ["grey", "3"], ["is", "1, 2, 3"], ["mouse", "3"], ["the", "1, 2, 3, 4"],
    ] },
    { type: "p", text: "Documents containing \"cat\"? Look up `cat` and return 1 and 4, with no scan and a lookup cost that doesn't grow with the number of documents. \"cat AND dog\" intersects two lists: document 4. The index can also store **metadata**: term frequencies for ranking, term positions for phrase queries, timestamps for recency sorting." },
    { type: "code", code: `from collections import defaultdict

docs = {1: "The cat is black", 2: "The dog is brown",
        3: "The mouse is grey", 4: "The cat and the dog are friends"}

index = defaultdict(lambda: defaultdict(list))        # term -> doc_id -> positions
for doc_id, text in docs.items():
    for pos, term in enumerate(text.lower().split()):
        index[term][doc_id].append(pos)

def search(*terms):                                   # AND query: intersect postings
    sets = [set(index[t.lower()]) for t in terms]
    return sorted(set.intersection(*sets)) if sets else []

print(dict(index["cat"]))       # {1: [1], 4: [1]}
print(search("cat", "dog"))     # [4]` },
    { type: "p", text: "A normal (forward) index maps a document to its words; real engines store, for each term, a **postings list** of documents with positions and frequencies:" },
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

    { type: "h2", text: "Popular full-text search engines" },
    { type: "table", head: ["Engine", "Where it runs", "Distinct feature"], rows: [
      ["**Elasticsearch**", "AWS, GCP, Azure, open source", "Probably the most popular: real-time analytics, extensive query capabilities, horizontal scaling for large data volumes"],
      ["**Amazon CloudSearch**", "AWS", "Integrates with other AWS services, automatic scaling, language-specific text processing"],
      ["**Azure Cognitive Search** (now Azure AI Search)", "Azure", "AI features such as semantic search, computer vision and natural-language processing"],
      ["**Vertex AI Search**", "GCP", "Machine-learned ranking with semantic and vector search, plus grounding for generative apps"],
      ["**Algolia**", "SaaS", "Thorough typo tolerance and customizable ranking rules"],
      ["**Apache Solr**", "Open source", "Advanced faceted search, distributed search, extensible plugins"],
      ["**Meilisearch**", "Open source", "Small memory footprint, instant search-as-you-type, simple API"],
    ] },

    { type: "h2", text: "Demo: product search with Elasticsearch" },
    { type: "p", text: "A realistic e-commerce search: an index with a mapping (text fields for matching, a keyword field for exact filters, a number for sorting), then a query with pagination, sorting and filtering. Run Elasticsearch locally (`docker run -p 9200:9200 -e discovery.type=single-node -e xpack.security.enabled=false docker.elastic.co/elasticsearch/elasticsearch:8.15.0`) and `pip install elasticsearch`." },
    { type: "code", code: `from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

# Mapping: "text" fields are analyzed for full-text search, "keyword" is matched exactly
es.indices.create(index="products", mappings={"properties": {
    "name": {"type": "text"},
    "description": {"type": "text"},
    "price": {"type": "double"},
    "category": {"type": "keyword"},
}})

products = [
    {"id": 1, "name": "Apple iPhone 13", "description": "Latest iPhone model with a 120Hz display.", "price": 999.0, "category": "smartphones"},
    {"id": 2, "name": "Samsung Galaxy S22", "description": "Flagship Samsung smartphone with a versatile camera system.", "price": 899.0, "category": "smartphones"},
    {"id": 3, "name": "Google Pixel 6", "description": "Google's newest smartphone with stock Android experience.", "price": 799.0, "category": "smartphones"},
    {"id": 4, "name": "Apple MacBook Pro", "description": "High-performance laptop with Apple's M1 Pro chip.", "price": 2499.0, "category": "laptops"},
]
for p in products:
    es.index(index="products", id=p["id"], document=p)
es.indices.refresh(index="products")          # make new documents searchable now

user_input = "smartphone"
response = es.search(
    index="products",
    from_=0, size=10,                                         # pagination
    query={"bool": {
        "must":   {"multi_match": {"query": user_input, "fields": ["name^2", "description"]}},
        "filter": {"term": {"category": "smartphones"}},     # exact filter, not scored
    }},
    sort=[{"price": {"order": "asc"}}],                       # cheapest first
)
for hit in response["hits"]["hits"]:
    print(hit["_source"]["name"], hit["_source"]["price"])
# Google Pixel 6 799.0
# Samsung Galaxy S22 899.0` },
    { type: "p", text: "The iPhone doesn't match because none of its text contains \"smartphone\"; an analyzer with stemming and synonyms (`phone` ↔ `smartphone`) would fix that, which is exactly the tuning search teams do. Elastic's official demo gallery has a fuller example." },

    { type: "h2", text: "Where full-text search is used" },
    { type: "p", text: "Almost every search box is backed by full-text search:" },
    { type: "ul", items: [
      "**E-commerce** (Amazon, eBay): keyword product search ranked by relevance, price and reviews; typo tolerance finds \"wireles headphones\" despite the misspelling.",
      "**Social media** (Twitter/X, Facebook): search posts, profiles and hashtags ranked by recency, relevance and engagement, with real-time indexing so new content appears immediately.",
      "**Document management** (Dropbox, Google Drive): search file names and the text inside PDFs and documents, with metadata filters for file type and modified date.",
      "**Forums and Q&A** (Stack Overflow, Reddit): search keywords, phrases or tags, ranked by recency, relevance and votes, so answers to common questions surface first.",
    ] },
    {"type":"h2","text":"Elasticsearch and OpenSearch, end to end"},
    {"type":"p","text":"Picture Amazon with 100 million products such as `{ \"id\": 101, \"name\": \"Apple iPhone 17 Pro\", \"brand\": \"Apple\", \"description\": \"Latest Apple smartphone with titanium body\", \"price\": 90000 }`. A customer types **iphone**. A plain database would check every product for the word; at 100 million products that's far too slow. Elasticsearch builds an inverted index instead, like a textbook index (\"Docker → pages 18, 42, 91\"), so it jumps straight to matches."},
    {"type":"table","head":["Term","Products"],"rows":[["apple","1 (Apple iPhone 17), 3 (Apple AirPods)"],["iphone","1"],["samsung","2 (Samsung Galaxy)"],["galaxy","2"],["airpods","3"]]},
    {"type":"ul","items":["**Searching**: `apple` returns products 1 and 3 straight from the index; `apple iphone` intersects {1, 3} and {1} → product 1. Normal storage is product → words; an inverted index is word → products.","**New data**: when \"Boat Bluetooth Speaker\" (product 4) arrives, only its terms are added: boat → 4, bluetooth → 4, speaker → 4.","**Understanding text**: analyzers lowercase and stem (`Running` → `running` → `run`), so run, runs, running and runner can match each other.","**Typo tolerance**: `iphne` is close enough to `iphone` (fuzzy matching by edit distance) to still find the right products.","**Relevance ranking**: for Apple Charger, Apple iPhone and Apple Cover, scores weigh term frequency, where the terms appear (title vs description), field boosts and other signals, giving iPhone, then Charger, then Cover.","**Autocomplete**: typing `iph` suggests iPhone, iPhone Charger, iPhone Cover (completion suggesters or edge n-grams; see [typeahead](/learn/typeahead-autocomplete)).","**Filters**: combine text with structured conditions (price < 100000, brand = Apple, color = Black) efficiently in one query."]},
    {"type":"p","text":"**Is it a database?** It stores the documents as well as the indexes, so it's both a document store and a search engine, but not a good **primary** database. Buying a product must reduce inventory, create an order, charge payment and update loyalty points together, and transactional databases (MySQL, PostgreSQL, DynamoDB) are built for that; Elasticsearch is built for search. The usual architecture: the app writes to the source-of-truth database, and changes flow asynchronously via [CDC](/learn/change-data-capture), streams or events into Elasticsearch/OpenSearch, which customers search."},
    {"type":"diagram","kind":"flow","caption":"Typical search architecture: the primary database is the source of truth; CDC or events keep the search index in sync for customer queries.","nodes":[{"id":"app","label":"Application","col":0,"row":1,"tone":"accent"},{"id":"db","label":"MySQL / DynamoDB","sub":"source of truth","col":1.5,"row":1,"shape":"db","tone":"store"},{"id":"cdc","label":"CDC / streams / events","col":3,"row":1,"shape":"queue","tone":"queue","w":190},{"id":"es","label":"OpenSearch / Elasticsearch","sub":"searchable copy","col":3,"row":0,"shape":"db","tone":"ok","w":220},{"id":"cust","label":"Customer search","col":1.5,"row":0,"shape":"pill"}],"edges":[{"from":"app","to":"db","label":"writes"},{"from":"db","to":"cdc"},{"from":"cdc","to":"es","label":"async"},{"from":"cust","to":"es","label":"queries"}]},
    {"type":"p","text":"**Elasticsearch vs OpenSearch**: after Elastic changed Elasticsearch's license in 2021, AWS created **OpenSearch**, an open-source fork now maintained by AWS and the community. For the concepts that matter (documents, indexes, inverted indexes, full-text search, filters, aggregations, distributed shards and replicas) they're nearly identical. Think of either as Google for your own data: the primary database keeps the official records, and the search engine keeps a copy optimized for full-text search, typo correction, autocomplete, ranking, complex filters and very fast queries over millions or billions of documents."},
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
  reading: [
    { title: "Elastic demo gallery", publisher: "Elastic", url: "https://www.elastic.co/demo-gallery/ent-search" },
  ],
};
