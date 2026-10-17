export default {
  blocks: [
    { type: "p", text: "**Sharding** (horizontal partitioning) splits one large dataset across several databases, called **shards**, each holding a subset of the rows. It is how a system scales **writes and storage** beyond one machine, after caching and read replicas have run out. It is also the most invasive scaling step, so it's worth understanding the choices well." },

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

    { type: "h2", text: "Choosing the shard key" },
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
};
