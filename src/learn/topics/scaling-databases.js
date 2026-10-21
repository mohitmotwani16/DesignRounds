// How to scale a database: vertical vs horizontal, replication and caching for reads,
// partitioning for writes, and combining partitioning with replication.
export default {
  blocks: [
    { type: "p", text: "Sooner or later one database server isn't enough: too many reads, too many writes, or too much data. There are three main tools, each aimed at a different bottleneck: **replication** (copies, to scale reads), **caching** (hot data in memory, to scale reads further) and **partitioning or sharding** (split the data, to scale writes and storage). This page shows how they fit together; each has its own deep-dive page." },

    { type: "h2", text: "Vertical vs horizontal scaling" },
    { type: "p", text: "**Vertical scaling** is like upgrading your computer: add CPU, memory or disk to the one server. It's the quickest and easiest step, but it gets expensive, the biggest machines still have limits, and cloud providers only offer certain hardware sizes, so there's a ceiling. **Horizontal scaling** connects many machines to share the work: keep adding machines as needed, which is more flexible and usually cheaper at scale. Because of vertical scaling's ceiling, system designs almost always scale **horizontally**. See [scalability](/learn/scalability)." },
    { type: "diagram", kind: "flow", caption: "Vertical scaling makes one machine bigger; horizontal scaling adds more machines that share the load.", zones: [{ label: "Vertical: scale up", from: [0, 0], to: [1, 0] }, { label: "Horizontal: scale out", from: [2.3, 0], to: [4.3, 0], tone: "accent" }], nodes: [
      { id: "s", label: "DB server", sub: "8 cores", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "b", label: "Bigger DB server", sub: "64 cores, more RAM", col: 1, row: 0, shape: "db", tone: "store", w: 150 },
      { id: "n1", label: "Node 1", col: 2.3, row: 0, shape: "db", tone: "accent" },
      { id: "n2", label: "Node 2", col: 3.3, row: 0, shape: "db", tone: "accent" },
      { id: "n3", label: "Node 3 …", col: 4.3, row: 0, shape: "db", tone: "accent" },
    ], edges: [{ from: "s", to: "b", label: "upgrade" }] },
    { type: "p", text: "Terminology: machines connected to work together form a **distributed system**, and each machine is a **node**. \"Machine\" and \"node\" mean the same thing in the rest of these guides." },

    { type: "h2", text: "Scaling reads with replication" },
    { type: "p", text: "**Replication** keeps extra copies of the data on other machines (**replicas**) and lets clients read from them, so more read requests can be served at once. The most common setup is **single-leader** (primary–replica) replication, the default in relational databases:" },
    { type: "ul", items: [
      "**Writes**: the client writes to the primary, which asynchronously sends each change to the read replicas.",
      "**Reads**: the client can read from any replica.",
    ] },
    { type: "diagram", kind: "flow", caption: "Single-leader replication: all writes go to the primary, which streams changes to replicas; reads spread across every copy.", nodes: [
      { id: "w", label: "Writes", col: 0, row: 0, shape: "pill" },
      { id: "r", label: "Reads", col: 0, row: 1.5, shape: "pill" },
      { id: "p", label: "Primary", col: 1.4, row: 0, shape: "db", tone: "accent" },
      { id: "r1", label: "Replica 1", col: 2.8, row: 0.8, shape: "db", tone: "store" },
      { id: "r2", label: "Replica 2", col: 2.8, row: 1.8, shape: "db", tone: "store" },
    ], edges: [{ from: "w", to: "p" }, { from: "p", to: "r1", dashed: true, label: "async" }, { from: "p", to: "r2", dashed: true }, { from: "r", to: "r1" }, { from: "r", to: "r2" }] },
    { type: "p", text: "Replication also gives **redundancy** (several copies, so a failed machine's traffic can be redirected with little disruption) and **high availability** (the service keeps running when some machines break). Multi-leader and leaderless replication are covered in [replication](/learn/replication)." },

    { type: "h2", text: "Scaling reads with caching" },
    { type: "p", text: "A **cache** keeps frequently read data in fast storage, usually memory. The goal is for the cache to answer as many requests as possible and touch the database only on a miss. See [caching](/learn/caching)." },
    { type: "diagram", kind: "flow", caption: "Cache in front of the database: hits are served from memory; only misses reach the database, and the result is stored for next time.", nodes: [
      { id: "app", label: "App server", col: 0, row: 0 },
      { id: "c", label: "Cache", sub: "Redis / Memcached", col: 1.5, row: 0, tone: "cache" },
      { id: "db", label: "Database", col: 3, row: 0, shape: "db", tone: "store" },
    ], edges: [{ from: "app", to: "c", label: "1. get" }, { from: "c", to: "db", label: "2. miss only", dashed: true }] },

    { type: "h2", text: "Scaling writes with partitioning (sharding)" },
    { type: "p", text: "Replicas copy **all** the data and every write still hits the one primary, so replication doesn't help writes. **Partitioning** (sharding) splits a table's rows across machines: each partition has the same schema but different rows. A write goes to just one partition, so write load (and storage) spreads over all of them, and adding machines adds capacity." },
    { type: "p", text: "The field that decides where a row goes is the **partition key**. Since the goal is to spread write load, keys should distribute as evenly as possible. The simplest scheme hashes with MOD: `partition = user_id % 4`." },
    { type: "diagram", kind: "flow", caption: "Hash partitioning with user_id % 4: each user's rows land on exactly one of four partitions.", nodes: [
      { id: "w", label: "INSERT comment", sub: "user_id = 6", col: 1.5, row: 0, shape: "pill" },
      { id: "h", label: "6 % 4 = 2", col: 1.5, row: 1, tone: "accent" },
      { id: "p0", label: "Partition 0", sub: "user 4, 8, 12 …", col: 0, row: 2.2, shape: "db", tone: "store" },
      { id: "p1", label: "Partition 1", sub: "user 1, 5, 9 …", col: 1, row: 2.2, shape: "db", tone: "store" },
      { id: "p2", label: "Partition 2", sub: "user 2, 6, 10 …", col: 2, row: 2.2, shape: "db", tone: "ok" },
      { id: "p3", label: "Partition 3", sub: "user 3, 7, 11 …", col: 3, row: 2.2, shape: "db", tone: "store" },
    ], edges: [{ from: "w", to: "h" }, { from: "h", to: "p2", label: "route" }] },
    { type: "p", text: "Simple, but three problems appear quickly:" },
    { type: "ol", items: [
      "**Range queries**: with hash partitioning, \"all records with user_id between x and y\" must ask every partition. Fine for IDs, painful for fields you count or scan by range (timestamps, prices).",
      "**Hot partitions**: in a social app where users comment on each other's profiles, partitioning comments by profile owner sends a celebrity's flood of comments to one partition, which runs far hotter than the rest. See [hot partitions](/learn/hot-partitions).",
      "**Rebalancing**: when partitions fill up and you add a 5th, `% 4` no longer covers it. Switching to `% 5` changes the partition of most keys, so data moves across **all** partitions. [Consistent hashing](/learn/consistent-hashing) fixes this.",
    ] },
    { type: "p", text: "Partitioning strategies, range vs hash keys and rebalancing are covered in [sharding](/learn/sharding)." },

    { type: "h2", text: "Partitioning and replication together" },
    { type: "p", text: "Real systems combine both for fault tolerance: each partition is copied to several nodes. A record lives in exactly one partition, but that partition lives on several nodes, and each node is the **leader for some partitions and a follower for others**. If a node fails, nodes holding replicas of its partitions keep serving." },
    { type: "diagram", kind: "flow", caption: "Three nodes, three partitions, two copies each: every node leads one partition and follows another, so any single node can fail without losing data.", nodes: [
      { id: "n1", label: "Node 1", sub: "P1 leader · P3 follower", col: 0, row: 0, shape: "db", tone: "store", w: 190 },
      { id: "n2", label: "Node 2", sub: "P2 leader · P1 follower", col: 1.5, row: 0, shape: "db", tone: "store", w: 190 },
      { id: "n3", label: "Node 3", sub: "P3 leader · P2 follower", col: 3, row: 0, shape: "db", tone: "store", w: 190 },
    ], edges: [{ from: "n1", to: "n2", label: "P1", dashed: true }, { from: "n2", to: "n3", label: "P2", dashed: true }, { from: "n3", to: "n1", label: "P3", dashed: true, bend: 60 }] },

    { type: "h2", text: "Summary and a typical order of moves" },
    { type: "table", head: ["Technique", "What it does", "Scales"], rows: [
      ["Vertical scaling", "Bigger machine", "Everything, up to a ceiling"],
      ["Replication", "Copies of the data on more machines", "Reads, plus availability"],
      ["Caching", "Frequently used data in memory", "Reads (hot data)"],
      ["Partitioning / sharding", "Split data into pieces stored separately", "Writes and storage"],
    ] },
    { type: "ol", items: [
      "Optimize first: indexes, query fixes, connection pooling. See [database optimization](/learn/database-optimization).",
      "Scale up the machine while it's cheap.",
      "Add a cache for hot reads, then read replicas.",
      "Split by function (separate databases per service or domain). See [database per service](/learn/database-per-service).",
      "Shard when writes or data size outgrow one primary.",
    ] },
  ],
  uses: [
    { name: "Read-heavy web apps", text: "A primary plus read replicas and Redis serve 100× more reads than writes." },
    { name: "Write-heavy feeds and chat", text: "Messages partitioned by conversation or user across many nodes." },
    { name: "Global products", text: "Replicas placed near users cut read latency; partitions keep each region's write load manageable." },
    { name: "Managed databases", text: "Aurora, Cloud SQL and DynamoDB package replication, failover and partitioning behind one endpoint." },
  ],
  interview: [
    "Name the bottleneck first (reads, writes or storage), then the matching tool.",
    "Reads: cache plus replicas, and mention replication lag. Writes: shard on a key that spreads load evenly.",
    "Call out hot partitions, cross-shard queries and rebalancing as the costs of sharding.",
    "Combine partitioning with replication so a node failure doesn't lose data.",
  ],
  related: ["replication", "sharding", "consistent-hashing", "caching", "scalability", "hot-partitions", "database-optimization"],
  practice: ["url-shortener", "news-feed", "chat-system", "key-value-store"],
};
