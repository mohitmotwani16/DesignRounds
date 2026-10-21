// Cache high availability: primary–replica replication, Sentinel failover and split brain, Redis
// Cluster's built-in HA, and treating the cache as a non-critical layer.
export default {
  blocks: [
    { type: "p", text: "A [sharded cache](/learn/distributed-caching) spreads keys over several nodes, but if one node crashes, **every key on it becomes a miss at once**. If it held popular keys, the database suddenly takes their full load. **High availability** keeps the cache serving when individual nodes fail, through replication and automatic failover." },

    { type: "h2", text: "Replication: primary and replicas" },
    { type: "p", text: "Each cache node (the **primary**) has one or more **replicas** that mirror its data. The primary takes all writes and replicates them **asynchronously** to the replicas; reads can be served by the primary or any replica." },
    { type: "diagram", kind: "flow", caption: "Primary–replica: writes go to the primary and stream asynchronously to replicas; reads can use any of them.", nodes: [
      { id: "w", label: "Writes", col: 0, row: 0, shape: "pill" },
      { id: "r", label: "Reads", col: 0, row: 1.5, shape: "pill" },
      { id: "p", label: "Primary", col: 1.3, row: 0, tone: "cache" },
      { id: "r1", label: "Replica 1", col: 2.7, row: 0.8, tone: "store" },
      { id: "r2", label: "Replica 2", col: 2.7, row: 1.8, tone: "store" },
    ], edges: [{ from: "w", to: "p" }, { from: "p", to: "r1", label: "async", dashed: true }, { from: "p", to: "r2", dashed: true }, { from: "r", to: "p", dashed: true }, { from: "r", to: "r1" }, { from: "r", to: "r2" }] },
    { type: "ul", items: [
      "**Fast recovery**: when the primary fails, a replica already holds a nearly complete copy in memory, so promoting it is quick. Only writes that reached the primary after the last replication batch are lost, typically milliseconds of data.",
      "**Read scaling**: replicas add read capacity. A primary with 2 replicas handles roughly 3× the reads of one node. Read from replicas for eventually consistent data and from the primary when you need the latest value.",
      "**Replication lag**: because replication is asynchronous, replicas can trail the primary by milliseconds to seconds under load. For caches that's usually fine, since a cache is already eventually consistent.",
    ] },

    { type: "h2", text: "Automatic failover with Redis Sentinel" },
    { type: "p", text: "When a primary dies, something must notice and promote a replica. **Redis Sentinel** automates it: a separate process, run as 3 or more instances for a quorum, that monitors the primaries and replicas. When a majority of Sentinels agree a primary is unreachable, they start a failover:" },
    { type: "ol", items: [
      "Pick the replica with the most up-to-date data.",
      "Promote it to primary.",
      "Point the other replicas at the new primary.",
      "Tell client libraries about the new topology.",
    ] },
    { type: "diagram", kind: "flow", caption: "Sentinel failover: a quorum of Sentinels detects the dead primary, promotes the most up-to-date replica, and repoints clients and replicas.", nodes: [
      { id: "s1", label: "Sentinel 1", col: 0, row: 0, tone: "accent" },
      { id: "s2", label: "Sentinel 2", col: 1, row: 0, tone: "accent" },
      { id: "s3", label: "Sentinel 3", col: 2, row: 0, tone: "accent" },
      { id: "old", label: "Old primary", sub: "unreachable", col: 0, row: 1.4, tone: "danger" },
      { id: "new", label: "Replica → new primary", col: 1.5, row: 1.4, tone: "ok" },
      { id: "rep", label: "Other replica", sub: "now follows new primary", col: 3, row: 1.4, tone: "store" },
      { id: "c", label: "Clients", sub: "reconnect", col: 1.5, row: 2.6, shape: "pill" },
    ], edges: [
      { from: "s1", to: "old", dashed: true, tone: "danger", label: "down?" }, { from: "s2", to: "new", label: "promote" },
      { from: "new", to: "rep", label: "replicate" }, { from: "c", to: "new" },
    ] },
    { type: "p", text: "Failover takes a few seconds, during which writes to the failed primary are lost and reads may fail. Client libraries that support Sentinel then reconnect to the new primary automatically." },
    { type: "p", text: "**Split-brain risk.** If the old primary wasn't actually dead, just cut off by a network partition, both it and the new primary may accept writes. When the partition heals, the old primary finds it has been demoted and discards its writes, so anything written to it during the partition is lost. For a cache that's acceptable, because the data can be re-fetched from the database; it's exactly why a database needs stronger guarantees. See [leader election](/learn/leader-election)." },

    { type: "h2", text: "Redis Cluster: built-in HA" },
    { type: "p", text: "Redis Cluster combines sharding and replication. Each shard (a range of hash slots) has a primary and one or more replicas, and when a shard's primary fails the cluster promotes a replica itself; no separate Sentinel is needed. The cluster stays available as long as **every shard has at least one surviving node**. If an entire shard (primary and all replicas) is lost, only that shard's keys become unavailable." },
    { type: "diagram", kind: "flow", caption: "Redis Cluster with 3 primaries and 1 replica each: any single node per shard can fail and the cluster keeps serving.", zones: [{ label: "Shard 1 · slots 0–5460", from: [0, 0], to: [0, 1] }, { label: "Shard 2 · 5461–10922", from: [1.4, 0], to: [1.4, 1] }, { label: "Shard 3 · 10923–16383", from: [2.8, 0], to: [2.8, 1] }], nodes: [
      { id: "p1", label: "Primary 1", col: 0, row: 0, tone: "cache" },
      { id: "r1", label: "Replica 1", col: 0, row: 1, tone: "store" },
      { id: "p2", label: "Primary 2", col: 1.4, row: 0, tone: "cache" },
      { id: "r2", label: "Replica 2", col: 1.4, row: 1, tone: "store" },
      { id: "p3", label: "Primary 3", col: 2.8, row: 0, tone: "cache" },
      { id: "r3", label: "Replica 3", col: 2.8, row: 1, tone: "store" },
    ], edges: [{ from: "p1", to: "r1", dashed: true }, { from: "p2", to: "r2", dashed: true }, { from: "p3", to: "r3", dashed: true }] },
    { type: "table", head: ["Configuration", "Nodes", "Tolerates", "Total memory"], rows: [
      ["3 primaries, 1 replica each", "6", "1 failure per shard", "3× shard size"],
      ["3 primaries, 2 replicas each", "9", "2 failures per shard", "3× shard size"],
      ["6 primaries, 1 replica each", "12", "1 failure per shard", "6× shard size"],
    ] },
    { type: "p", text: "The `cluster-require-full-coverage` setting decides what happens when a whole shard is down. With `yes` (the default) the cluster stops serving key operations (reads and writes) and reports `CLUSTERDOWN`. With `no`, the surviving shards keep serving their keys and only the failed shard's keys return errors, usually the better choice for a cache." },

    { type: "h2", text: "The cache as a non-critical layer" },
    { type: "p", text: "A cache differs from a database in one crucial way: **the database is the source of truth**. If the cache fails completely, the application can query the database directly. It will be slower, but nothing is lost. That changes the HA calculation:" },
    { type: "ul", items: [
      "For a **database**, losing a node risks losing data, so it may need stronger durability (sometimes synchronous replication), depending on its recovery point objective (RPO). See [disaster recovery](/learn/disaster-recovery).",
      "For a **cache**, losing a node risks only slower responses, so asynchronous replication (faster, simpler) is acceptable: the worst case is re-fetching from the database.",
    ] },
    { type: "p", text: "**Degrade gracefully.** When a cache node fails, the application must handle the burst of misses without a cascade: [circuit breakers](/learn/circuit-breaker) stop the database being overwhelmed by a miss storm, and [rate limits](/learn/rate-limiting) on the miss path keep database load within capacity. The cache re-warms naturally as requests flow; see [cache warming](/learn/cache-warming)." },
    { type: "code", code: `from pybreaker import CircuitBreaker, CircuitBreakerError
db_breaker = CircuitBreaker(fail_max=20, reset_timeout=10)

def get_product(product_id):
    key = f"product:v1:detail:{product_id}"
    try:
        cached = cache.get(key)               # cache down? treat as a miss, don't crash
    except ConnectionError:
        cached = None
    if cached is not None:
        return cached
    try:
        row = db_breaker.call(db.fetch_product, product_id)
    except CircuitBreakerError:
        return {"id": product_id, "unavailable": True}   # protect the DB during a miss storm
    try:
        cache.set(key, row, ex=600)
    except ConnectionError:
        pass
    return row` },
  ],
  uses: [
    { name: "Session stores", text: "Redis with a replica and Sentinel so a node failure doesn't log everyone out." },
    { name: "Managed caches (ElastiCache, Memorystore, Azure Cache)", text: "Multi-AZ replicas with automatic failover, configured with a checkbox." },
    { name: "Large Redis Cluster deployments", text: "3+ primaries with replicas in different zones; full-coverage disabled so one bad shard doesn't take down all keys." },
    { name: "Read-heavy APIs", text: "Replicas double as read capacity for hot data while also providing failover." },
  ],
  interview: [
    "Give each cache shard a replica in another zone and automatic failover (Sentinel or Redis Cluster).",
    "Say asynchronous replication is fine because the cache isn't the source of truth.",
    "Explain what happens during failover (seconds of errors) and how the app degrades: treat errors as misses, protect the DB with breakers and rate limits.",
    "Mention split brain and why it's acceptable for a cache but not a database.",
  ],
  related: ["distributed-caching", "cache-warming", "replication", "leader-election", "redis", "circuit-breaker"],
  practice: ["distributed-cache", "multi-region", "ticket-booking"],
};
