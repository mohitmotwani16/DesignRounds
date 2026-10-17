export default {
  blocks: [
    { type: "p", text: "A **hot key** is a single key that receives far more traffic than others, and a **hot partition** is a shard or partition that carries a disproportionate share of load. Sharding assumes load spreads evenly across partitions; when it doesn't, one node saturates while the rest sit idle, and adding nodes doesn't help. A celebrity's profile, a viral post, a flash-sale product or a huge tenant can each turn a well-sharded system into a single-server bottleneck." },

    { type: "h2", text: "Where skew comes from" },
    { type: "ul", items: [
      "**Popular entities:** a celebrity account, a trending video, a popular product during a sale.",
      "**Poor key choice:** sharding by date sends all of today's writes to one partition; sharding by country sends most traffic to the largest country.",
      "**Monotonic keys:** auto-increment IDs or timestamps with range partitioning concentrate new writes on the last range.",
      "**Big tenants** in a multi-tenant system. See [multi-tenancy](/learn/multi-tenancy).",
      "**Default values:** a null or \"unknown\" key that many rows share, which also causes skew in [Spark joins](/learn/apache-spark-architecture).",
    ] },

    { type: "h2", text: "Detecting hot keys" },
    { type: "ul", items: [
      "Per-partition metrics: request rate, CPU, latency and throttling per shard. A single shard far above the median is the signal.",
      "Top-k key tracking: sample requests or use a count-min sketch to find the heaviest keys without counting everything. See [probabilistic data structures](/learn/probabilistic-data-structures).",
      "Managed databases often report hot partitions or throttle them, which shows up as errors on just some keys.",
    ] },

    { type: "h2", text: "Fixes for read-hot keys" },
    { type: "ul", items: [
      "**Cache aggressively:** a hot key is the ideal cache entry. Put it in an in-process cache or CDN, not only a shared cache, because a single cache node can itself become hot. See [caching](/learn/caching).",
      "**Replicate the hot key:** keep copies under several cache keys (`post:42#1` ... `post:42#8`) and pick one at random per read, spreading load across nodes.",
      "**Request coalescing:** collapse concurrent misses for the same key into one backend request. See [cache stampedes](/learn/cache-invalidation).",
      "**Read replicas** for the partition that owns the key.",
    ] },

    { type: "h2", text: "Fixes for write-hot keys" },
    { type: "ul", items: [
      "**Key salting (write sharding):** split the key into N sub-keys, for example `likes:post42:0` to `likes:post42:15`, write to a random one, and sum them on read. Writes spread across partitions at the cost of a fan-in read.",
      "**Buffer and batch:** accumulate increments in memory or a queue and apply them in batches, so a viral post's like count is updated every second rather than per like.",
      "**Change the key:** use a hash of a high-cardinality attribute, or compose keys (`tenant_id + user_id`) instead of a low-cardinality one.",
      "**Avoid monotonic range keys:** hash them, or prefix with a bucket number, so new writes don't all land on the last range.",
      "**Split or isolate:** move a huge tenant or entity to a dedicated partition or cell.",
    ] },
    { type: "diagram", kind: "flow", caption: "Salting a write-hot counter: writes go to one of N sub-keys on different partitions; a read sums the sub-keys (often cached).", nodes: [
      { id: "w", label: "Many likes", sub: "post 42", col: 0, row: 1, shape: "pill" },
      { id: "s", label: "Pick sub-key", sub: "random 0..N-1", col: 1.3, row: 1, tone: "accent" },
      { id: "p1", label: "Partition 1", sub: "likes:42:0", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "p2", label: "Partition 2", sub: "likes:42:1", col: 2.6, row: 1, shape: "db", tone: "store" },
      { id: "p3", label: "Partition 3", sub: "likes:42:2", col: 2.6, row: 2, shape: "db", tone: "store" },
      { id: "r", label: "Read = sum", sub: "cached", col: 3.9, row: 1, tone: "cache" },
    ], edges: [
      { from: "w", to: "s" }, { from: "s", to: "p1" }, { from: "s", to: "p2" }, { from: "s", to: "p3" },
      { from: "p1", to: "r", dashed: true }, { from: "p2", to: "r", dashed: true }, { from: "p3", to: "r", dashed: true },
    ] },

    { type: "h2", text: "Design-time prevention" },
    { type: "ul", items: [
      "Ask about the distribution of keys, not just the total volume, when choosing a [shard key](/learn/sharding).",
      "Plan for the celebrity case explicitly, as in [feed fan-out](/learn/fan-out).",
      "Use [consistent hashing](/learn/consistent-hashing) with virtual nodes so partitions can be rebalanced at a fine grain.",
      "Rate-limit per key or per tenant so one entity can't consume a shared partition's capacity. See [rate limiting](/learn/rate-limiting).",
    ] },
  ],
  uses: [
    { name: "Social networks", text: "Celebrity posts are cached widely, and their counters are sharded and updated in batches." },
    { name: "E-commerce flash sales", text: "Inventory for a hot product is split into buckets or handled through a queue to avoid one locked row." },
    { name: "Messaging and streaming", text: "A single very active partition key is split to keep consumers balanced." },
  ],
  interview: [
    "Ask about key distribution and name the celebrity or flash-sale case.",
    "Separate read-hot fixes (caching, replication) from write-hot fixes (salting, batching).",
    "Explain the read-time cost of salting.",
    "Detect hot keys with per-partition metrics and top-k sampling.",
  ],
  related: ["sharding", "consistent-hashing", "caching", "fan-out", "cache-invalidation"],
  practice: ["news-feed", "ticket-booking", "distributed-cache"],
  reading: [
    { title: "Designing partition keys to distribute your workload in DynamoDB", publisher: "AWS documentation", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html" },
    { title: "Designing Data-Intensive Applications, chapter 6", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
  ],
};
