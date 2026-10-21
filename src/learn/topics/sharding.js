export default {
  blocks: [
    { type: "p", text: "**Sharding** (horizontal partitioning) splits one large dataset across several databases, called **shards**, each holding a subset of the rows. It is how a system scales **writes and storage** beyond one machine, after caching and read replicas have run out. It is also the most invasive scaling step, so it's worth understanding the choices well." },

    { type: "h2", text: "Partitioning vs sharding: one idea, many names" },
    { type: "p", text: "Partitioning and sharding mean the same thing: breaking data into smaller pieces. Every database names the piece differently, which helps when reading documentation:" },
    { type: "table", head: ["Database", "Name for a partition"], rows: [
      ["MongoDB, Elasticsearch", "Shard"], ["Apache Cassandra", "Partition, vnode"], ["Apache HBase", "Region"],
      ["Google Cloud Bigtable", "Tablet"], ["Google Cloud Spanner", "Split"], ["Amazon DynamoDB", "Partition"],
      ["CockroachDB", "Range"], ["Azure Cosmos DB", "Physical partition"], ["Redis Cluster", "Hash slot"],
      ["Apache Kafka", "Partition"], ["Riak", "vnode"], ["Couchbase", "vBucket"],
    ] },
    { type: "p", text: "Why partition? **Performance and scalability**: reads and writes spread across many nodes instead of one. **Fault tolerance**: if one server or partition goes down, the others keep operating. Each partition is like a mini-database with its own rows and indexes, responsible for a subset of the data; queries and updates are routed to the right partition by the value of the **partition key**." },
    { type: "p", text: "Cloud databases often partition automatically: **DynamoDB** splits partitions by partition key as data or traffic grows (each partition holds up to about 10 GB); **Cloud Spanner** splits and moves data by primary key based on size and load; **Cosmos DB** splits a physical partition as it approaches its limits (about 20 GB in the notes' example, larger in current versions). You rarely manage this by hand there, but the same rules about choosing keys apply." },
    { type: "h2", text: "Partitioning vs replication" },
    { type: "p", text: "Replication copies **all** the data to several machines (more read capacity, same write capacity). Sharding splits the data so each machine has **some** of it (more write capacity and storage). Real systems do both: each shard is itself replicated. See [replication](/learn/replication)." },
    { type: "diagram", kind: "flow", caption: "A routing layer maps each key to a shard; each shard is a leader with its own replicas.", nodes: [
      { id: "app", label: "App", col: 0, row: 1, shape: "pill" },
      { id: "router", label: "Shard router", sub: "user_id → shard", col: 1, row: 1, tone: "accent" },
      { id: "s1", label: "Shard 1", sub: "users A–H", col: 2.2, row: 0, shape: "db", tone: "store" },
      { id: "s2", label: "Shard 2", sub: "users I–Q", col: 2.2, row: 1, shape: "db", tone: "store" },
      { id: "s3", label: "Shard 3", sub: "users R–Z", col: 2.2, row: 2, shape: "db", tone: "store" },
      { id: "r1", label: "replicas", col: 3.3, row: 0, tone: "muted", w: 100 },
      { id: "r2", label: "replicas", col: 3.3, row: 1, tone: "muted", w: 100 },
      { id: "r3", label: "replicas", col: 3.3, row: 2, tone: "muted", w: 100 },
    ], edges: [
      { from: "app", to: "router" }, { from: "router", to: "s1" }, { from: "router", to: "s2" }, { from: "router", to: "s3" },
      { from: "s1", to: "r1", dashed: true }, { from: "s2", to: "r2", dashed: true }, { from: "s3", to: "r3", dashed: true },
    ] },

    { type: "h2", text: "Partitioning strategies" },
    { type: "table", head: ["Strategy", "How it assigns rows", "Strengths", "Weaknesses"], rows: [
      ["**Range**", "Contiguous key ranges per shard (A–H, I–Q…), or time ranges", "Efficient range scans; easy to split a range", "Hot spots: sequential keys (timestamps, auto-increment ids) all hit the last shard"],
      ["**Hash**", "`hash(key)` decides the shard, usually via [consistent hashing](/learn/consistent-hashing) or fixed slots", "Even distribution", "Range queries must hit every shard"],
      ["**Directory / lookup**", "A lookup table maps each key (or tenant) to a shard", "Total flexibility: move any tenant anytime", "The directory is an extra dependency and must be fast and highly available"],
      ["**Geographic**", "By user region", "Data residency and low latency", "Uneven sizes; users who move or travel"],
    ] },
    { type: "callout", text: "Many systems split into many more **logical** shards than physical machines (Instagram used thousands of logical shards on far fewer servers). Rebalancing then means moving whole logical shards between machines, which is much easier than splitting data." },

    { type: "h3", text: "Range partitioning and hot spots" },
    { type: "p", text: "Range partitioning is like a dictionary split by first letter: A–B, C–D and so on. Most databases support it, adjacent keys stay together and range queries are easy. The catch is **uneven load**: English words aren't spread evenly over letters, so the partition holding the busy letters gets far more data and traffic." },
    { type: "diagram", kind: "segments", caption: "English words partitioned by first letter: the ranges look tidy, but partitions 0 and 2 hold far more words (and traffic) than partition 1.", width: 640, lanes: [
      { label: "Words", parts: [
        { label: "Partition 0: A–G", size: 5, tone: "danger", sub: "many words" },
        { label: "Partition 1: H–O", size: 2.5, tone: "store", sub: "fewer" },
        { label: "Partition 2: P–Z", size: 4.5, tone: "danger", sub: "many words" },
      ] },
    ] },
    { type: "p", text: "Access patterns cause hot spots too: partition comments by year, and if 2019 had an unusual number of comments, that partition is busy while others sit idle; partition by date, and **today's** partition takes every write. That's why many systems prefer hash partitioning." },
    { type: "h3", text: "Hash partitioning in practice" },
    { type: "p", text: "A good hash function turns skewed input into uniformly spread output: even nearly identical keys hash far apart. Each node owns a range of hash values. Take the first 5 hex characters of an MD5 hash and three partitions: **A** = `00000`–`55555`, **B** = `55556`–`aaaa9`, **C** = `aaaaa`–`fffff`. Timestamps one second apart land evenly:" },
    { type: "table", head: ["Timestamp", "MD5", "First 5", "Partition"], rows: [
      ["2023-04-21 12:34:54", "`6058cc2a7f0280832794cfb5486890c7`", "`6058c`", "B"],
      ["2023-04-21 12:34:55", "`54d679a328e25dfc19be52b861061c4a`", "`54d67`", "A"],
      ["2023-04-21 12:34:56", "`1ebf4017501cbd58501342837cac574d`", "`1ebf4`", "A"],
      ["2023-04-21 12:34:57", "`ab7c7d772edfcefe519c35720e653422`", "`ab7c7`", "C"],
      ["2023-04-21 12:34:58", "`df948197ae6fa8b9408f78192d056f14`", "`df948`", "C"],
      ["2023-04-21 12:34:59", "`5f54041ea86d2bb7917f3393d3f54c0b`", "`5f540`", "B"],
    ] },
    { type: "code", code: `import hashlib

def partition_for(key: str) -> str:
    prefix = hashlib.md5(key.encode()).hexdigest()[:5]
    return "A" if prefix <= "55555" else "B" if prefix <= "aaaa9" else "C"

for s in range(54, 60):
    ts = f"2023-04-21 12:34:{s}"
    print(ts, partition_for(ts))      # B A A C C B: two per partition` },
    { type: "p", text: "Hash partitioning is available in most databases; the price is that adjacent keys scatter, so range queries must ask every partition." },
    { type: "h3", text: "The mixed approach: composite primary keys" },
    { type: "p", text: "A **composite key** hashes the first column to pick the partition and uses the remaining columns to **sort** rows inside it. Cassandra, DynamoDB and Spanner work this way. For a social app's posts, `(user_id, timestamp)`: `user_id` is the hash (partition) key and `timestamp` the range (sort) key, so all of one user's posts sit in one partition, in time order: \"Alice's latest 20 posts\" is a single sorted read. In DynamoDB, creating a table asks for a **partition key** and optionally a **sort key**; supplying both makes a composite primary key." },
    { type: "diagram", kind: "flow", caption: "Composite key (user_id, timestamp): user_id picks the partition by hash; timestamp orders that user's rows inside it.", nodes: [
      { id: "w", label: "Post by user 42", sub: "(42, 2026-03-14 09:00)", col: 0, row: 0.5, shape: "pill", w: 190 },
      { id: "h", label: "hash(42) → P2", col: 1.4, row: 0.5, tone: "accent" },
      { id: "p2", label: "Partition P2", sub: "user 42: 08:10 · 08:55 · 09:00 · … (sorted)", col: 2.9, row: 0, shape: "db", tone: "ok", w: 300 },
      { id: "p3", label: "Partition P3", sub: "user 77: 07:02 · 09:41 …", col: 2.9, row: 1, shape: "db", tone: "store", w: 240 },
    ], edges: [{ from: "w", to: "h" }, { from: "h", to: "p2", label: "insert in time order" }] },
    { type: "h2", text: "Choosing the shard key" },
    { type: "p", text: "A favorite interview question. Design for the **access patterns**, and weigh:" },
    { type: "ul", items: [
      "**Access patterns**: how the app reads data. A ticketing system looks up events by location, date or type, and the key should make those queries efficient.",
      "**Write distribution**: writes should spread evenly so no shard is overloaded while others idle.",
      "**Query isolation**: most queries should be answerable from one shard; cross-shard queries are complex and slow.",
      "**Data growth**: data should stay balanced as it grows over time.",
      "Prefer **high-cardinality** columns (`user_id`, `order_id`), use **composite keys** that match the access pattern (comments loaded per video in time order → `(video_id, timestamp)`), and add a **random suffix** only for genuinely write-heavy keys.",
    ] },
    { type: "p", text: "The shard key decides almost everything. A good one:" },
    { type: "ul", items: [
      "**Has high cardinality** and spreads load evenly. `country` is a terrible key; `user_id` is usually fine.",
      "**Matches the main access pattern**, so most queries hit one shard: shard a chat app by `conversation_id`, a SaaS app by `tenant_id`.",
      "**Keeps data that is used together on the same shard**, so transactions and joins stay local: a user's orders live with the user.",
      "**Avoids monotonic values** with range partitioning: sharding by timestamp sends every new write to one shard.",
    ] },

    { type: "h2", text: "Hot spots and celebrity keys" },
    { type: "p", text: "Even with a good key, one key can be far hotter than others: a celebrity's account, a viral post, a huge tenant. Mitigations:" },
    { type: "ul", items: [
      "**Cache** hot reads aggressively in front of the shard.",
      "**Split hot keys**: append a suffix (`post_123#0` … `post_123#9`) to spread writes like counters across 10 rows, and sum them on read.",
      "**Isolate big tenants** on dedicated shards (directory-based sharding makes this easy).",
    ] },

    { type: "p", text: "**Skewed loads and key salting.** A celebrity with millions of followers generates a disproportionate share of comments and likes. Appending a random number to the key spreads one hot key over several partitions (AWS's DynamoDB guide uses invoice data as its example); the cost is that reading the item now means querying every suffix and merging. For most keys that's unnecessary overhead; know it for the hot ones." },
    { type: "code", code: `import random

SUFFIXES = 10                                     # spread one hot key over 10 partitions

def write_key(post_id):                           # writes pick a random suffix
    return f"likes#{post_id}#{random.randrange(SUFFIXES)}"

def read_keys(post_id):                           # reads must gather every suffix
    return [f"likes#{post_id}#{i}" for i in range(SUFFIXES)]

# total_likes = sum(db.get(k) or 0 for k in read_keys("celebrity_post"))` },
    { type: "h2", text: "Secondary indexes on a partitioned database" },
    { type: "p", text: "The partition key finds a row by its primary key. To look rows up by **another** field (books partitioned by `book_id`, but queried by `genre`) you need a secondary index, and the data doesn't map neatly to partitions. There are two ways to store it:" },
    { type: "diagram", kind: "flow", caption: "Local secondary index (partition by document): each partition indexes only its own books, so a genre query must scatter to every partition and gather the results.", nodes: [
      { id: "q", label: "genre = fiction", col: 1, row: 0, shape: "pill" },
      { id: "p1", label: "Partition 1", sub: "books 1–3 · index: fiction → [1, 3]", col: 0, row: 1.2, shape: "db", tone: "store", w: 250 },
      { id: "p2", label: "Partition 2", sub: "books 4–6 · index: fiction → [5]", col: 2, row: 1.2, shape: "db", tone: "store", w: 250 },
    ], edges: [{ from: "q", to: "p1", label: "scatter" }, { from: "q", to: "p2", label: "scatter" }] },
    { type: "diagram", kind: "flow", caption: "Global secondary index (partition by term): the genre index is partitioned by genre, independently of the books, so a genre query reads one index partition.", nodes: [
      { id: "q", label: "genre = fiction", col: 0, row: 0.5, shape: "pill" },
      { id: "g1", label: "Index partition A–M", sub: "fiction → [1, 3, 5] · history → [2]", col: 1.6, row: 0, shape: "db", tone: "ok", w: 260 },
      { id: "g2", label: "Index partition N–Z", sub: "poetry → [4] · science → [6]", col: 1.6, row: 1, shape: "db", tone: "store", w: 240 },
    ], edges: [{ from: "q", to: "g1", label: "one lookup" }] },
    { type: "table", head: ["", "Local secondary index (LSI)", "Global secondary index (GSI)"], rows: [
      ["Also called", "Partition by document", "Partition by term"],
      ["Where the index lives", "Each partition indexes its own rows", "A separate index, partitioned by the indexed value"],
      ["Reads", "Scatter/gather across all partitions", "Usually one index partition"],
      ["Writes", "Cheap: index is on the same partition as the row", "Slower: the index entry may live on another node"],
      ["DynamoDB consistency", "Eventual or strong reads", "Eventual reads only"],
    ] },
    { type: "h2", text: "Rebalancing partitions" },
    { type: "p", text: "Data grows and nodes fail, so partitions must move: new nodes take some load, and a dead node's partitions are taken over by others. Managed cloud databases do this for you, but three strategies sit underneath:" },
    { type: "ul", items: [
      "**Fixed number of partitions**: create several times more partitions than nodes up front (say 20 partitions on 4 nodes, 5 each). A new node steals a few partitions from each existing node; a failed node's partitions are spread over the rest. Partitions never split, only move, which is simple, but the count is permanent and hard to pick when data size varies wildly. Moving a partition takes time because data crosses the network.",
      "**Dynamic partitioning**: the system watches size and load and **splits** partitions that grow too big or hot and **merges** small ones, so the count follows the data (HBase, MongoDB, DynamoDB, Spanner).",
      "**Consistent hashing**: nodes and keys sit on a hash ring, and adding or removing a node moves only the keys next to it. See [consistent hashing](/learn/consistent-hashing).",
    ] },
    { type: "diagram", kind: "segments", caption: "Fixed partitions: 20 partitions on 4 nodes; adding a 5th node moves one partition from each existing node, and no keys are rehashed.", width: 640, lanes: [
      { label: "4 nodes", parts: [
        { label: "Node 1: P0–P4", size: 5, tone: "store" }, { label: "Node 2: P5–P9", size: 5, tone: "store" }, { label: "Node 3: P10–P14", size: 5, tone: "store" }, { label: "Node 4: P15–P19", size: 5, tone: "store" },
      ] },
      { label: "5 nodes", parts: [
        { label: "N1: P0–P3", size: 4, tone: "store" }, { label: "N2: P5–P8", size: 4, tone: "store" }, { label: "N3: P10–P13", size: 4, tone: "store" }, { label: "N4: P15–P18", size: 4, tone: "store" }, { label: "N5: P4, P9, P14, P19", size: 4, tone: "ok" },
      ] },
    ] },
    { type: "p", text: "Partitioning isn't only for databases: message queues (Kafka partitions), caches (Redis Cluster hash slots), search indexes and blob stores are partitioned with the same ideas. Azure's data partitioning guide covers strategies for each." },
    { type: "h2", text: "Try it: range partitioning in MySQL" },
    { type: "p", text: "A comments table partitioned by the year a comment was created (MySQL or MariaDB):" },
    { type: "code", code: `CREATE TABLE comments (
  comment_id   INT NOT NULL,
  page_id      INT NOT NULL,
  user_id      INT NOT NULL,
  content      TEXT NOT NULL,
  created_time DATETIME NOT NULL
)
PARTITION BY RANGE (YEAR(created_time)) (
  PARTITION pold VALUES LESS THAN (2019),
  PARTITION p19  VALUES LESS THAN (2020),
  PARTITION p20  VALUES LESS THAN (2021),
  PARTITION p21  VALUES LESS THAN (2022),
  PARTITION p22  VALUES LESS THAN (2023),
  PARTITION pmax VALUES LESS THAN MAXVALUE      -- catch-all so newer rows don't fail
);

INSERT INTO comments (comment_id, page_id, user_id, content, created_time) VALUES
  (1, 1, 1, 'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks', '2009-01-03 18:15:05'),
  (2, 2, 2, 'Hello from 2021', '2021-10-11 18:45:02');

SELECT * FROM comments;                    -- both rows (all partitions)
SELECT * FROM comments PARTITION (pold);   -- only the 2009 comment
SELECT * FROM comments PARTITION (p21);    -- only the 2021 comment` },
    { type: "p", text: "This is partitioning **within one server** (it helps pruning and dropping old data); sharding applies the same idea **across servers**." },
    { type: "h2", text: "What sharding makes hard" },
    { type: "ul", items: [
      "**Cross-shard queries**: \"top 10 products across all users\" becomes a scatter-gather over every shard, slow and fragile. Maintain a separate aggregated view, or use an analytics store.",
      "**Cross-shard transactions**: need [two-phase commit](/learn/two-phase-commit) or a [saga](/learn/saga-pattern). Design keys so they're rare.",
      "**Global uniqueness**: unique constraints and auto-increment ids no longer work across shards. Use [distributed ID generation](/learn/unique-id-generation).",
      "**Rebalancing**: adding shards means moving data while serving traffic: copy, catch up with changes, then switch routing.",
      "**Operations**: backups, schema migrations and monitoring are multiplied by the number of shards.",
    ] },
    { type: "callout", tone: "warning", text: "Shard late. A single well-tuned primary with replicas and caching carries most products a long way, and many databases (Vitess for MySQL, Citus for Postgres, DynamoDB, Cassandra, CockroachDB) now handle sharding for you." },
  ],
  uses: [
    { name: "Instagram", text: "Sharded PostgreSQL into thousands of logical shards keyed by user, with IDs that embed the shard number." },
    { name: "Slack and Shopify", text: "Shard by workspace or shop (tenant), so a tenant's data and transactions live together; very large tenants get their own shards." },
    { name: "YouTube (Vitess)", text: "Built Vitess to shard MySQL transparently; it now runs at many companies, including Slack and GitHub." },
    { name: "DynamoDB and Cassandra", text: "Hash-partition automatically by partition key; the design work moves to choosing that key well." },
  ],
  interview: [
    "Justify sharding with numbers: write rate or data size beyond one primary.",
    "Name the shard key and explain why it keeps the main queries on one shard.",
    "Address hot keys and how you'd rebalance when adding shards.",
    "Call out what gets harder (cross-shard queries, transactions, unique IDs) and how you handle each.",
  ],
  related: ["consistent-hashing", "replication", "unique-id-generation", "scalability", "nosql-database-types", "two-phase-commit"],
  practice: ["url-shortener", "chat-system", "key-value-store", "news-feed"],
  reading: [
    { title: "Choosing the right DynamoDB partition key", publisher: "AWS Database Blog", url: "https://aws.amazon.com/blogs/database/choosing-the-right-dynamodb-partition-key/" },
    { title: "Schema design best practices (avoiding hotspots)", publisher: "Google Cloud Spanner docs", url: "https://cloud.google.com/spanner/docs/schema-design" },
    { title: "Partitioning and horizontal scaling in Azure Cosmos DB", publisher: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview" },
    { title: "Data partitioning strategies", publisher: "Azure Architecture Center", url: "https://learn.microsoft.com/en-us/azure/architecture/best-practices/data-partitioning-strategies" },
    { title: "Improving data access with secondary indexes", publisher: "AWS DynamoDB docs", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html" },
  ],
};
