export default {
  blocks: [
    { type: "p", text: "\"NoSQL\" covers four quite different families of databases. Each is built around one data model and a few access patterns it serves extremely well. Knowing which family fits which problem matters more than knowing any one product." },

    { type: "h2", text: "Key-value stores" },
    { type: "p", text: "The simplest model: a giant dictionary from a key to an opaque value. Operations are `GET`, `PUT` and `DELETE` by key, which makes them very fast and easy to partition by hashing the key." },
    { type: "ul", items: [
      "**Examples**: Redis, Memcached (in-memory), DynamoDB, Riak, etcd (small, strongly consistent).",
      "**Great for**: caches, sessions, feature flags, rate-limit counters, shopping carts, idempotency keys.",
      "**Limits**: no queries by value; anything other than lookup by key needs a separate index you maintain.",
    ] },

    { type: "h2", text: "Document stores" },
    { type: "p", text: "Values are structured documents (JSON/BSON) that the database understands, so you can index and query fields inside them. A document usually holds an entity together with its nested data." },
    { type: "code", code: `
{ "_id": "prod_812", "name": "Trail running shoe", "brand": "Stride",
  "variants": [ { "size": 9, "color": "blue", "stock": 14 } ],
  "attributes": { "drop_mm": 6, "waterproof": false } }
` },
    { type: "ul", items: [
      "**Examples**: MongoDB, Couchbase, Firestore, Azure Cosmos DB, PostgreSQL `jsonb`.",
      "**Great for**: catalogues with varying attributes, user profiles, content management, data read as a whole object.",
      "**Limits**: joins across documents are limited or slow; data shared by many documents gets duplicated.",
    ] },

    { type: "h2", text: "Wide-column stores" },
    { type: "p", text: "Data lives in tables, but each row is identified by a **partition key** (which node stores it) and a **clustering key** (sort order within the partition). Rows in a partition are stored together, sorted, so range scans within a partition are fast. They're built on LSM trees for very high write throughput." },
    { type: "diagram", kind: "flow", caption: "A Cassandra-style table for chat: partition by conversation, cluster by time. \"Latest 50 messages in a conversation\" is one sequential read on one node.", nodes: [
      { id: "q", label: "Query", sub: "conversation = c42, last 50", col: 0, row: 0.5, shape: "pill", w: 170 },
      { id: "n1", label: "Node 1", sub: "partitions c17, c42", col: 1.4, row: 0, shape: "db", tone: "store" },
      { id: "n2", label: "Node 2", sub: "partitions c08, c99", col: 1.4, row: 1, shape: "db", tone: "store" },
      { id: "p", label: "c42 rows, sorted by time", sub: "t1 · t2 · … · t9050", col: 2.8, row: 0, tone: "accent", w: 190 },
    ], edges: [{ from: "q", to: "n1", label: "hash(c42)" }, { from: "n1", to: "p", label: "range scan" }] },
    { type: "ul", items: [
      "**Examples**: Apache Cassandra, ScyllaDB, HBase, Google Bigtable.",
      "**Great for**: time-series, messaging, activity feeds, IoT and event data: huge write volumes read by key and time range.",
      "**Limits**: you design one table per query; no joins; secondary indexes are weak. Picking the partition key is everything (see [sharding](/learn/sharding)).",
    ] },

    { type: "h2", text: "Graph databases" },
    { type: "p", text: "Data is **nodes** and **edges** with properties, and queries traverse relationships: \"friends of friends who like this band\". In a relational database each hop is a join, which becomes expensive at several hops; graph databases follow pointers directly." },
    { type: "ul", items: [
      "**Examples**: Neo4j, Amazon Neptune, JanusGraph, TigerGraph.",
      "**Great for**: social networks, recommendations, fraud rings (accounts sharing devices or cards), knowledge graphs, network topology.",
      "**Limits**: harder to partition across machines; not ideal for bulk aggregation over all data.",
    ] },

    { type: "h2", text: "Choosing between them" },
    { type: "table", head: ["Need", "Family", "Example product"], rows: [
      ["Sub-millisecond lookup by key, caching, counters", "Key-value (in-memory)", "Redis"],
      ["Durable key-value at any scale, managed", "Key-value / wide-column", "DynamoDB"],
      ["Rich objects with varying fields, queried by field", "Document", "MongoDB"],
      ["Massive writes, read by key and time range", "Wide-column", "Cassandra, Bigtable"],
      ["Multi-hop relationship queries", "Graph", "Neo4j, Neptune"],
      ["Full-text search and relevance", "Search engine", "Elasticsearch. See [full-text search](/learn/search-and-inverted-index)"],
      ["Metrics over time with downsampling", "Time-series", "Prometheus, InfluxDB. See [time-series databases](/learn/time-series-databases)"],
    ] },
  ],
  uses: [
    { name: "Discord", text: "Stored trillions of messages in Cassandra (later ScyllaDB), partitioned by channel and time bucket, for fast writes and recent-history reads." },
    { name: "Twitter and Netflix", text: "Use Redis and Memcached heavily as caches and for counters, timelines and sessions in front of durable stores." },
    { name: "eBay and product catalogues", text: "Document stores hold listings whose attributes differ by category." },
    { name: "PayPal and banks", text: "Graph analysis links accounts, devices and cards to spot fraud rings that row-by-row checks miss." },
  ],
  interview: [
    "Name the family before the product, and tie it to the access pattern.",
    "For wide-column stores, state the partition key and clustering key for each query.",
    "Use Redis as a cache or for counters, not as the only copy of important data unless persistence is configured and justified.",
    "Reach for a graph database only when multi-hop traversals are core to the product.",
  ],
  related: ["sql-vs-nosql", "sharding", "database-indexing", "time-series-databases", "search-and-inverted-index", "caching"],
  practice: ["chat-system", "key-value-store", "recommendation-engine", "distributed-cache"],
};
