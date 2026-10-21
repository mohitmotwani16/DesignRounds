// Key-value databases: why they exist (the Dynamo observation), the get/put/delete model,
// why it's fast and easy to scale, when to use one, popular products and real deployments.
export default {
  blocks: [
    { type: "p", text: "A **key-value database** is the simplest NoSQL store: it works like a giant hash map. You **put** a value under a key, **get** it back by key, and **delete** it by key. That's the whole interface. Many features need nothing more (sessions, caches, shopping carts, user preferences), and in return a key-value store gives very fast lookups and almost effortless horizontal scaling." },

    { type: "h2", text: "Why key-value databases exist" },
    { type: "p", text: "Amazon's engineers spelled out the pattern in the original **Dynamo** paper: many services on Amazon's platform (best-seller lists, shopping carts, customer preferences, session management, sales rank, the product catalog) only ever access their data **by primary key**. Running them on relational databases used those databases inefficiently and limited scale and availability. Dynamo offered a simple primary-key-only interface built for exactly those needs, and it inspired DynamoDB, Cassandra and Riak. See [Dynamo-style key-value stores](/learn/dynamo-style-key-value-store)." },

    { type: "h2", text: "How key-value databases work" },
    { type: "p", text: "Each record has two parts, a **unique key** and a **value**, and the database offers three operations: `get(key)`, `put(key, value)` and `delete(key)`. No schemas, no relationships, no joins." },
    { type: "diagram", kind: "flow", caption: "A key-value store hashes each key to the one partition that owns it. Every operation touches a single partition, so adding servers adds capacity linearly.", nodes: [
      { id: "ops", label: "get / put / delete", sub: "key = cart:u456", col: 0, row: 1, shape: "pill", w: 180 },
      { id: "h", label: "hash(key) → partition", col: 1.4, row: 1, tone: "accent" },
      { id: "p1", label: "Server 1", sub: "keys in hash range 0–33%", col: 2.9, row: 0, shape: "db", tone: "store" },
      { id: "p2", label: "Server 2", sub: "keys in hash range 33–66%", col: 2.9, row: 1, shape: "db", tone: "ok" },
      { id: "p3", label: "Server 3", sub: "keys in hash range 66–100%", col: 2.9, row: 2, shape: "db", tone: "store" },
    ], edges: [{ from: "ops", to: "h" }, { from: "h", to: "p2", label: "owner" }, { from: "h", to: "p1", dashed: true }, { from: "h", to: "p3", dashed: true }] },
    { type: "ul", items: [
      "**Primary-key lookups are fast.** The database hashes the key to find its exact location: no table scans, no index traversals. In-memory stores answer in microseconds.",
      "**Horizontal scaling is straightforward.** Partition keys by range or by hash and add servers for capacity; each server owns a subset of keys. Because no query ever spans partitions, the partitioning logic stays simple. See [consistent hashing](/learn/consistent-hashing).",
      "**The API matches programming-language dictionaries.** Developers already know get and put: no SQL to learn, no ORM, and the application's model lines up with the database.",
    ] },
    { type: "code", code: `import json
import boto3
import redis

# In-memory key-value: a session store with a 30-minute expiry
r = redis.Redis(host="localhost", port=6379, decode_responses=True)
r.set("session:abc123", json.dumps({"user_id": 456, "role": "member"}), ex=1800)
session = json.loads(r.get("session:abc123") or "null")
r.delete("session:abc123")                                  # logout

# Durable key-value: a DynamoDB table "file_metadata" keyed by "file_id"
table = boto3.resource("dynamodb", region_name="us-east-1").Table("file_metadata")
table.put_item(Item={"file_id": "f_789", "owner": "u456", "size": 52480, "path": "/docs/plan.pdf"})
item = table.get_item(Key={"file_id": "f_789"}).get("Item")
table.delete_item(Key={"file_id": "f_789"})` },
    { type: "h3", text: "Designing keys" },
    { type: "p", text: "With lookup by key as the only query, the **key is the design**. Namespacing keys keeps different kinds of data apart and makes them predictable to build:" },
    { type: "table", head: ["Need", "Key", "Value"], rows: [
      ["Session for a logged-in user", "`session:{session_id}`", "User ID, roles, expiry"],
      ["Shopping cart", "`cart:{user_id}`", "List of SKUs and quantities"],
      ["Rate-limit counter", "`rate:{ip}:{minute}`", "Request count, with a TTL"],
      ["Cached web page", "`page:{url}`", "Rendered HTML"],
      ["Feature flag", "`flag:{name}`", "On/off plus rollout percentage"],
      ["Idempotency record", "`idem:{request_id}`", "The stored response"],
    ] },
    { type: "p", text: "Anything beyond lookup by key (\"all carts containing SKU 9\", \"sessions older than a day\") needs a second structure you maintain yourself, or a different kind of database. Some stores relax this: DynamoDB adds a sort key and secondary indexes, and Redis offers sorted sets and other data structures. See [cache key design](/learn/cache-key-design)." },

    { type: "h2", text: "When to use a key-value database" },
    { type: "ul", items: [
      "**High-performance reads and writes**: reading and writing by key is about as fast as storage gets, so applications that need high-speed operations choose key-value stores.",
      "**Simple data structures**: customer details, web pages keyed by URL, shopping-cart contents, product categories and e-commerce product details, where each entity is accessed independently with no relationships.",
      "**Basic query requirements**: no complex queries and no updates that must span several records together; plain storage and retrieval.",
    ] },
    { type: "p", text: "Avoid them when you need ad-hoc queries, joins, or transactions across many records; use a [relational database](/learn/relational-databases) or a [document database](/learn/document-databases) instead." },

    { type: "h2", text: "Popular key-value databases" },
    { type: "p", text: "Thanks to their speed and simplicity, key-value stores rank high in popularity. The DB-Engines ranking of key-value stores in March 2023 (popularity score, not performance):" },
    { type: "diagram", kind: "bars", caption: "DB-Engines key-value ranking, March 2023 (popularity scores). Redis and DynamoDB lead the category by a wide margin.", values: [
      { label: "Redis", value: 172.45, tone: "danger" },
      { label: "Amazon DynamoDB", value: 80.77, tone: "accent" },
      { label: "Azure Cosmos DB", value: 36.10, tone: "store" },
      { label: "Memcached", value: 22.61, tone: "store" },
      { label: "Hazelcast", value: 8.63, tone: "muted" },
      { label: "etcd", value: 8.60, tone: "muted" },
      { label: "Aerospike", value: 6.54, tone: "muted" },
      { label: "Ehcache", value: 6.03, tone: "muted" },
      { label: "Google Cloud Bigtable", value: 5.44, tone: "muted" },
      { label: "Apache Ignite", value: 5.29, tone: "muted" },
    ] },
    { type: "p", text: "Further down the same list: Riak KV, ArangoDB, RocksDB, OrientDB, GemFire, Oracle NoSQL, LevelDB, Infinispan, Oracle Berkeley DB, InterSystems IRIS, LMDB, InterSystems Caché and Amazon SimpleDB." },
    { type: "table", head: ["", "Redis", "DynamoDB"], rows: [
      ["Where data lives", "In memory (optional disk persistence)", "Durable, replicated storage across availability zones"],
      ["Latency", "Microseconds in-process; typically sub-millisecond over the network", "Single-digit milliseconds"],
      ["Extras", "Lists, sets, sorted sets, streams, TTLs, pub/sub. See [Redis](/learn/redis)", "Sort keys, secondary indexes, streams, global tables"],
      ["Typical use", "Caching, sessions, counters, leaderboards, rate limits", "Primary store for key-based data at any scale, serverless apps"],
    ] },

    { type: "h2", text: "Real-world examples" },
    { type: "ul", items: [
      "**Dropbox** keeps file metadata in DynamoDB through its Alki system: each file's metadata maps to a unique file ID, relationships between files don't matter, and simple key lookups give the speed it needs. It saved millions in infrastructure costs compared with the previous on-premises storage.",
      "**Snapchat** stores Stories in DynamoDB: a story ID maps to its content metadata, stories don't relate to each other, and their short-lived nature suits key-value simplicity. Snap handles over **10 million queries per second** and cut median latency by **20%**.",
      "**Disney+** uses DynamoDB for content metadata and user interactions: a video ID maps to its title, description and thumbnail URL, and each video loads independently. It ingests billions of customer actions a day for watchlists and personalized recommendations.",
    ] },
  ],
  uses: [
    { name: "Sessions and login state", text: "`session:{id}` with a TTL in Redis: read on every request, so speed matters and relationships don't." },
    { name: "Shopping carts", text: "Amazon's original Dynamo use case: always writable, keyed by user, merged on conflict." },
    { name: "Caching and rate limiting", text: "Rendered pages, API responses and per-client counters with expiry. See [caching](/learn/caching) and [rate limiting](/learn/rate-limiting)." },
    { name: "Metadata at huge scale", text: "File, story and video metadata keyed by ID (Dropbox, Snapchat, Disney+)." },
  ],
  interview: [
    "Choose a key-value store when every access is by a known key; say what the key is.",
    "Mention how it scales: hash partitioning (often consistent hashing) plus replication.",
    "Say what you lose: no ad-hoc queries or joins, so any other access path needs its own index or table.",
    "Distinguish an in-memory cache (Redis) from a durable primary store (DynamoDB).",
  ],
  related: ["nosql-database-types", "dynamo-style-key-value-store", "redis", "consistent-hashing", "document-databases", "caching"],
  practice: ["key-value-store", "distributed-cache", "url-shortener", "rate-limiter"],
  reading: [
    { title: "Dynamo: Amazon's Highly Available Key-value Store", publisher: "All Things Distributed", url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf" },
    { title: "Alki, or how we learned to stop worrying and love cold metadata", publisher: "Dropbox Tech", url: "https://dropbox.tech/infrastructure/alki--or-how-we-learned-to-stop-worrying-and-love-cold-metadata" },
    { title: "Snapchat Stories on DynamoDB (conference talk)", publisher: "YouTube", url: "https://www.youtube.com/watch?v=WUleQzu9l_8" },
    { title: "DB-Engines ranking of key-value stores", publisher: "DB-Engines", url: "https://db-engines.com/en/ranking/key-value+store" },
    { title: "Amazon DynamoDB use cases for media and entertainment customers", publisher: "AWS Database Blog", url: "https://aws.amazon.com/blogs/database/amazon-dynamodb-use-cases-for-media-and-entertainment-customers/" },
  ],
};
