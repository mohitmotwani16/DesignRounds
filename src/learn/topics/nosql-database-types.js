// NoSQL databases: the schema-rigidity and horizontal-scaling problems they solve, how they
// work, the four families (key-value, document, wide-column, graph), when to use them and
// what they give up.
export default {
  blocks: [
    { type: "p", text: "Relational databases are excellent at structured data with complex relationships, but they struggle with two modern problems: **schemas that keep changing** and **scaling writes across many machines**. **NoSQL** (\"Not Only SQL\") databases give up some SQL guarantees to solve those two problems. The term covers four quite different families (**key-value**, **document**, **wide-column** and **graph**), each built around one data model and a few access patterns it serves extremely well. Knowing which family fits which problem matters more than knowing any one product." },

    { type: "h2", text: "Problem 1: schema rigidity" },
    { type: "p", text: "A social media startup keeps user profiles in PostgreSQL with a clean schema:" },
    { type: "code", code: `CREATE TABLE users (
    user_id int PRIMARY KEY,
    name    varchar(255),
    email   varchar(255),
    bio     text
);` },
    { type: "p", text: "Three months later the product team wants **verified badges**: add a column. Six months in, premium users get **custom themes**: another column. A year in, influencers need **follower counts, engagement rates and top hashtags**. Every feature means a migration on a 10-million-row table, each migration locks the table, and deployments take hours. A competitor on MongoDB adds fields instantly, with no migration and no downtime, and ships weekly while the SQL team ships monthly." },
    { type: "p", text: "Rich nested data shows the same strain. An Instagram post has an image, caption, hashtags, location, timestamp and comments, and comments have authors and nested replies. In relational tables, reading one post joins Posts → Comments → Users → Locations, five tables for one screen. When the product adds \"story reactions\" one week and \"polls\" the next, every change needs coordinated migrations. A document database stores the whole post (image, caption, comments array, location object) as **one document**: no joins, and new fields need no migration." },
    { type: "code", code: `{
  "post_id": "p_9001",
  "author": { "user_id": 42, "name": "Alice" },
  "image_url": "https://cdn.example.com/p_9001.jpg",
  "caption": "Sunset hike",
  "hashtags": ["hiking", "sunset"],
  "location": { "name": "Twin Peaks", "lat": 37.75, "lng": -122.45 },
  "created_at": "2026-03-14T18:22:00Z",
  "comments": [
    { "author": "bob", "text": "Wow!", "replies": [ { "author": "alice", "text": "Thanks!" } ] }
  ],
  "poll": { "question": "Next trail?", "options": ["Mt Tam", "Big Sur"] }
}` },

    { type: "h2", text: "Problem 2: horizontal scaling" },
    { type: "p", text: "An e-commerce site keeps its product catalog in MySQL. Traffic grows until the database hits CPU limits. Vertical scaling buys time: 8 cores, then 16, 32, 64. Then hardware limits appear, and a 128-core server costs far more than two 64-core servers. Sharding a relational database means choosing partition keys by hand and routing in the application; joins across shards get expensive and foreign keys stop working. The team spends months on sharding logic instead of features. See [scaling databases](/learn/scaling-databases)." },

    { type: "h2", text: "How NoSQL databases work" },
    { type: "p", text: "NoSQL databases store data **without a fixed schema**: different records can have different fields, and adding a field needs no migration. They also **partition data automatically** across nodes. Because a distributed system must keep working through network partitions, many NoSQL stores favor **availability** and offer **eventual** or **tunable** consistency rather than strong consistency by default: writes reach every replica within seconds, and strong consistency, where offered, costs some availability and latency. See [CAP theorem](/learn/cap-theorem)." },
    { type: "h3", text: "Schema flexibility" },
    { type: "p", text: "Two user profiles can live side by side in the same collection, one with a badge and one without. The database accepts both; application code handles missing fields." },
    { type: "diagram", kind: "flow", caption: "One users collection, two shapes: Bob has verified and badge_color fields that Alice doesn't. No migration was needed to add them.", zones: [{ label: "users collection", from: [0, 0], to: [1.6, 0], tone: "accent" }], nodes: [
      { id: "a", label: "{ user_id: 123 }", sub: "name: Alice · email · bio: \"Software engineer\"", col: 0, row: 0, tone: "store", w: 290 },
      { id: "b", label: "{ user_id: 456 }", sub: "name: Bob · email · verified: true · badge_color: gold", col: 1.6, row: 0, tone: "ok", w: 330 },
    ], edges: [] },
    { type: "code", code: `{ "user_id": 123, "name": "Alice", "email": "alice@example.com", "bio": "Software engineer" }

{ "user_id": 456, "name": "Bob", "email": "bob@example.com", "verified": true, "badge_color": "gold" }` },
    { type: "h3", text: "Automatic partitioning and replication" },
    { type: "p", text: "**DynamoDB** spreads items across servers by **partition key**; add capacity and it rebalances data automatically. **Cassandra** replicates each partition to several nodes with **configurable consistency**: for example, write to three replicas for durability and read from one for speed. The system stays available when individual nodes fail. See [consistent hashing](/learn/consistent-hashing) and [quorums](/learn/quorums)." },
    { type: "diagram", kind: "flow", caption: "Automatic partitioning: the partition key is hashed to pick a node, and each partition is copied to replicas so a node failure doesn't lose data or availability.", nodes: [
      { id: "c", label: "PUT item", sub: "partition key = user_456", col: 0, row: 1, shape: "pill", w: 190 },
      { id: "h", label: "hash(partition key)", col: 1.3, row: 1, tone: "accent" },
      { id: "n1", label: "Node 1", sub: "partitions A–F + replicas", col: 2.7, row: 0, shape: "db", tone: "store" },
      { id: "n2", label: "Node 2", sub: "partitions G–M + replicas", col: 2.7, row: 1, shape: "db", tone: "store" },
      { id: "n3", label: "Node 3", sub: "partitions N–Z + replicas", col: 2.7, row: 2, shape: "db", tone: "store" },
    ], edges: [{ from: "c", to: "h" }, { from: "h", to: "n2", label: "owner" }, { from: "n2", to: "n1", dashed: true, label: "replica" }, { from: "n2", to: "n3", dashed: true, label: "replica" }] },

    { type: "h2", text: "The four NoSQL families" },
    { type: "p", text: "Each family optimizes for a different access pattern. Choose by **access pattern**, not just by the shape of the data." },
    { type: "h3", text: "Key-value stores" },
    { type: "p", text: "The simplest model: a giant hash map from a key to a value. Operations are `GET`, `PUT` and `DELETE` by key, O(1) and easy to partition by hashing the key, but there are no queries across values. Full detail in [key-value databases](/learn/key-value-databases)." },
    { type: "code", code: `session:abc123    →  { "user_id": 456, "login_time": "2026-03-14T09:12:00Z", "exp": 1773480720 }
cart:u456         →  ["sku_1", "sku_9"]
rate:ip:1.2.3.4   →  27` },
    { type: "ul", items: [
      "**Examples**: Redis, Memcached (in-memory), DynamoDB, Riak, etcd (small, strongly consistent).",
      "**Great for**: caches, sessions, feature flags, rate-limit counters, shopping carts, idempotency keys. Redis keeps session data for logged-in users; DynamoDB handles high-throughput lookups with predictable performance.",
      "**Limits**: no queries by value; anything other than lookup by key needs a separate index you maintain.",
    ] },
    { type: "h3", text: "Document stores" },
    { type: "p", text: "Values are structured JSON-like (JSON/BSON) documents that the database understands, so you can index and query fields inside them. A document is self-contained: an entity with its nested fields and arrays, matching how application code models objects. Full detail in [document databases](/learn/document-databases)." },
    { type: "code", code: `{ "_id": "prod_812", "name": "Trail running shoe", "brand": "Stride",
  "variants": [ { "size": 9, "color": "blue", "stock": 14 } ],
  "attributes": { "drop_mm": 6, "waterproof": false } }` },
    { type: "ul", items: [
      "**Examples**: MongoDB (product catalogs), CouchDB (content management), Couchbase, Firestore, Azure Cosmos DB, PostgreSQL `jsonb`.",
      "**Great for**: catalogs with varying attributes, user profiles, content management, user-generated content, data read as a whole object.",
      "**Limits**: joins across documents are limited or slow; data shared by many documents gets duplicated.",
    ] },
    { type: "h3", text: "Wide-column (column-family) stores" },
    { type: "p", text: "Data lives in tables, but each row is identified by a **partition key** (which node stores it) and a **clustering key** (sort order within the partition). Rows in a partition are stored together, sorted, so range scans within a partition are fast, and data is organized by column families so reading specific columns is efficient while full-row scans stay expensive. They're built on [LSM trees](/learn/lsm-trees-sstables) for very high write throughput." },
    { type: "diagram", kind: "flow", caption: "A Cassandra-style table for chat: partition by conversation, cluster by time. \"Latest 50 messages in a conversation\" is one sequential read on one node.", nodes: [
      { id: "q", label: "Query", sub: "conversation = c42, last 50", col: 0, row: 0.5, shape: "pill", w: 170 },
      { id: "n1", label: "Node 1", sub: "partitions c17, c42", col: 1.4, row: 0, shape: "db", tone: "store" },
      { id: "n2", label: "Node 2", sub: "partitions c08, c99", col: 1.4, row: 1, shape: "db", tone: "store" },
      { id: "p", label: "c42 rows, sorted by time", sub: "t1 · t2 · … · t9050", col: 2.8, row: 0, tone: "accent", w: 190 },
    ], edges: [{ from: "q", to: "n1", label: "hash(c42)" }, { from: "n1", to: "p", label: "range scan" }] },
    { type: "code", code: `-- Cassandra CQL: one table per query
CREATE TABLE messages (
    conversation_id text,
    sent_at         timestamp,
    message_id      uuid,
    author_id       text,
    body            text,
    PRIMARY KEY ((conversation_id), sent_at, message_id)   -- partition key, then clustering keys
) WITH CLUSTERING ORDER BY (sent_at DESC, message_id DESC);

SELECT * FROM messages WHERE conversation_id = 'c42' LIMIT 50;` },
    { type: "ul", items: [
      "**Examples**: Apache Cassandra (time-series, messaging), HBase (analytics workloads), ScyllaDB, Google Bigtable.",
      "**Great for**: time-series, messaging, activity feeds, logs, IoT and event data: huge write volumes read by key and time range.",
      "**Limits**: you design one table per query; no joins; secondary indexes are weak. Picking the partition key is everything (see [sharding](/learn/sharding)).",
    ] },
    { type: "h3", text: "Graph databases" },
    { type: "p", text: "Data is **nodes** and **edges** with properties, and relationships are first-class. Queries traverse relationships (\"friends of friends who like this band\"), which is fast because the database follows pointers directly. In a relational database each hop is a join, which gets expensive at several hops. Aggregations over the whole dataset remain slow." },
    { type: "diagram", kind: "flow", caption: "A tiny social graph: \"who should Alice follow?\" walks Alice → Bob → Carol and Alice → Dan → Carol, two hops instead of two self-joins.", nodes: [
      { id: "al", label: "Alice", col: 0, row: 1, shape: "pill", tone: "accent" },
      { id: "bo", label: "Bob", col: 1.3, row: 0, shape: "pill" },
      { id: "da", label: "Dan", col: 1.3, row: 2, shape: "pill" },
      { id: "ca", label: "Carol", sub: "suggested", col: 2.6, row: 1, shape: "pill", tone: "ok" },
      { id: "band", label: "Band: The Lumens", col: 3.9, row: 1, tone: "cache" },
    ], edges: [{ from: "al", to: "bo", label: "FOLLOWS" }, { from: "al", to: "da", label: "FOLLOWS" }, { from: "bo", to: "ca", label: "FOLLOWS" }, { from: "da", to: "ca", label: "FOLLOWS" }, { from: "ca", to: "band", label: "LIKES" }] },
    { type: "code", code: `// Cypher (Neo4j): friends of friends Alice doesn't follow yet
MATCH (a:User {name: 'Alice'})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(fof:User)
WHERE NOT (a)-[:FOLLOWS]->(fof) AND fof <> a
RETURN fof.name, count(*) AS mutuals ORDER BY mutuals DESC LIMIT 10;` },
    { type: "ul", items: [
      "**Examples**: Neo4j (social networks), ArangoDB (recommendation engines), Amazon Neptune, JanusGraph, TigerGraph.",
      "**Great for**: social networks, recommendations, fraud rings (accounts sharing devices or cards), knowledge graphs, network topology.",
      "**Limits**: harder to partition across machines; not ideal for bulk aggregation over all data.",
    ] },

    { type: "h2", text: "When to use NoSQL" },
    { type: "ul", items: [
      "**Unpredictable schemas**: when features evolve fast and profile fields change weekly, document and wide-column stores absorb new fields without locking migrations on a large table.",
      "**High write throughput**: a single database can't take millions of writes per second. Discord stores trillions of messages; Cassandra-style stores partition writes across hundreds of nodes.",
      "**Simple access patterns**: shopping carts are key-value lookups by session ID, and session data needs no joins or transactions. Redis serves these from memory, so end-to-end latency is typically sub-millisecond (in-memory access takes microseconds; the network round trip is the rest).",
      "**Global distribution**: social feeds tolerate seconds of staleness; nobody notices if a like count updates slightly late. DynamoDB global tables replicate across regions with configurable consistency. See [geo-replication](/learn/geo-replication).",
      "**Large unstructured datasets**: log aggregation can ingest gigabytes per second; Elasticsearch indexes and searches text without a fixed schema, where SQL full-text search becomes impractical. See [full-text search](/learn/search-and-inverted-index).",
    ] },

    { type: "h2", text: "What NoSQL gives up" },
    { type: "ul", items: [
      "**Eventual consistency complicates application logic.** Two users editing the same document may see different versions, and the application must resolve conflicts. Amazon's Dynamo shopping cart merged conflicting versions by keeping every item ever added, so deleted items occasionally reappeared. See [conflict resolution with CRDTs](/learn/crdts).",
      "**No ACID transactions across records** (or limited ones). A money transfer becomes two separate updates; if the system fails between them, money disappears or is duplicated. Applications fall back to [sagas](/learn/saga-pattern) or accept some inconsistency.",
      "**Limited queries mean denormalization.** Without joins, data is duplicated to avoid them: a user's name is copied into each of their posts, and a name change means updating thousands of posts. See [normalization vs denormalization](/learn/normalization-denormalization).",
      "**Operational complexity.** SQL has mature tooling for backup, monitoring and debugging. NoSQL stores need new tools and skills: Cassandra's eventual consistency makes debugging harder, and DynamoDB's pricing model needs careful capacity planning.",
    ] },

    { type: "h2", text: "Common implementations" },
    { type: "table", head: ["Product", "Family", "Known for", "Use it for"], rows: [
      ["**MongoDB**", "Document", "The most popular document database; rich queries with filters, aggregations and text search", "Product catalogs, user-generated content, documents with varying schemas"],
      ["**Redis**", "Key-value (in-memory)", "Sub-millisecond latency; lists, sets, sorted sets beyond plain values. See [Redis](/learn/redis)", "Caching, real-time leaderboards, rate limiting, sessions"],
      ["**Apache Cassandra**", "Wide-column", "Distributed with no single point of failure; millions of writes per second across nodes", "Time-series data, event logging, high-write applications"],
      ["**Amazon DynamoDB**", "Key-value and document (managed)", "Auto-scaling, single-digit millisecond latency at any scale", "Serverless apps, unpredictable traffic"],
      ["**Neo4j**", "Graph", "Native graph storage and the Cypher query language", "Social graphs, recommendations, fraud detection"],
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
    { type: "callout", text: "Need millions of writes per second? Cassandra. Schema changes deploying daily? MongoDB. Only simple key lookups? Redis. Otherwise a relational database is usually the simpler start; see [SQL vs NoSQL](/learn/sql-vs-nosql)." },
  ],
  uses: [
    { name: "Discord", text: "Stored trillions of messages in Cassandra (later ScyllaDB), partitioned by channel and time bucket, for fast writes and recent-history reads." },
    { name: "Twitter and Netflix", text: "Use Redis and Memcached heavily as caches and for counters, timelines and sessions in front of durable stores." },
    { name: "eBay and product catalogs", text: "Document stores hold listings whose attributes differ by category." },
    { name: "PayPal and banks", text: "Graph analysis links accounts, devices and cards to spot fraud rings that row-by-row checks miss." },
  ],
  interview: [
    "Name the family before the product, and tie it to the access pattern.",
    "For wide-column stores, state the partition key and clustering key for each query.",
    "Say what you give up (cross-record transactions, joins, sometimes strong consistency) and how the design copes.",
    "Use Redis as a cache or for counters, not as the only copy of important data unless persistence is configured and justified.",
    "Reach for a graph database only when multi-hop traversals are core to the product.",
  ],
  related: ["sql-vs-nosql", "key-value-databases", "document-databases", "relational-databases", "sharding", "lsm-trees-sstables", "time-series-databases", "search-and-inverted-index"],
  practice: ["chat-system", "key-value-store", "recommendation-engine", "distributed-cache"],
  reading: [
    { title: "How Discord stores trillions of messages", publisher: "Discord", url: "https://discord.com/blog/how-discord-stores-trillions-of-messages" },
    { title: "Dynamo: Amazon's Highly Available Key-value Store", publisher: "All Things Distributed", url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf" },
  ],
};
