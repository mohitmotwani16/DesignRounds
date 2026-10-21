// Cache cold starts: why an empty cache can take the database down, when cold starts happen, warm-up
// strategies (gradual, ramped, pre-loaded), protecting the database, and monitoring.
export default {
  blocks: [
    { type: "p", text: "Replication and failover keep a cache serving through node failures, but when a **new or replacement node** comes online its memory is empty. Every request it receives is a miss, and the database suddenly sees load it hasn't seen since the cache was first deployed. This is the **cold start** problem, and **cache warming** is how you survive it." },

    { type: "h2", text: "The problem" },
    { type: "p", text: "A system serves 50,000 reads a second with a 95% hit rate, so the database handles about 2,500 queries a second and is sized for that. If the cache goes cold, all 50,000 become misses: a **20× spike** on the database, instantly." },
    { type: "diagram", kind: "bars", caption: "Database load with a warm cache (95% hits) versus a cold cache (0% hits) at 50,000 reads per second.", values: [
      { label: "Warm cache (95% hits)", value: 2500, display: "2,500 queries/s", tone: "ok" },
      { label: "Cold cache (0% hits)", value: 50000, display: "50,000 queries/s (20×)", tone: "danger" },
    ] },
    { type: "p", text: "It isn't just slow, it can cascade: the database saturates, query latency spikes, application threads block waiting, connection pools run out, and users get errors. The cache was protecting the database; remove that protection even briefly and you can cause an outage." },

    { type: "h2", text: "When cold starts happen" },
    { type: "ul", items: [
      "**Fresh deployments** of a new cache cluster.",
      "**Node replacement after a failure**: if the replacement is a fresh instance rather than a promoted replica, it starts empty.",
      "**Scaling out**: adding a shard to a Redis Cluster moves hash slots, and keys migrated to the new shard must be fetched from the database on first access.",
      "**A cache flush after a bug**: code wrote corrupt data into the cache, and the fix is flushing the affected keys, or everything.",
      "**Mass TTL expiration**: many keys written together with the same TTL (a batch import) expire together, and that key range goes cold at once. [TTL jitter](/learn/cache-invalidation) prevents this.",
    ] },

    { type: "h2", text: "Warm-up strategies" },
    { type: "diagram", kind: "timeline", caption: "Hit rate after a cold start: pre-loading starts high, a controlled ramp limits exposure, and gradual warm-up starts from zero and climbs as traffic fills the cache.", ticks: ["0 min", "2 min", "4 min", "6 min", "8 min"], spans: [
      { from: 0, to: 4, label: "pre-loaded: ~70–80% from the start, then steady", tone: "ok", lane: 0 },
      { from: 0, to: 4, label: "controlled ramp: 10% → 25% → 50% → 100% of traffic", tone: "store", lane: 1 },
      { from: 0, to: 4, label: "gradual: 0% → steady state as misses fill the cache", tone: "cache", lane: 2 },
    ] },
    { type: "h3", text: "1. Gradual warm-up" },
    { type: "p", text: "Let natural traffic fill the cache: the first request for each key goes to the database, later ones hit. The hit rate climbs from 0% to steady state over minutes as popular keys accumulate. It's the simplest approach, and fine **if the database has headroom**: in the example it must handle 50,000 queries a second for several minutes instead of 2,500. If it can't, the system degrades before the cache has time to warm." },
    { type: "h3", text: "2. Controlled ramp-up" },
    { type: "p", text: "Send traffic to the new cache node **gradually**: 10% first, let it warm for a few minutes, then 25%, 50% and finally 100%. Meanwhile the old cache (or the database) serves the rest, so the cold-start spike is limited to a fraction of total load. Load balancers or service meshes do this with **weighted routing**; the cost is operational tooling to manage the ramp and monitoring to decide when to step up." },
    { type: "h3", text: "3. Pre-loading (cache priming)" },
    { type: "p", text: "Before the node takes any traffic, load the most popular keys into it. That needs to know which keys are hot:" },
    { type: "ul", items: [
      "**Recent access logs**: extract the most-requested keys from the last hour.",
      "**A popularity index** in the database: a counter table that tracks access frequency.",
      "**A snapshot of an existing replica**: copy the key-value pairs directly.",
    ] },
    { type: "p", text: "Pre-loading typically gets the hit rate to 70–80% of steady state **before** the node serves real traffic; the rest fills in through normal misses. It's common in large systems where a full cold start would overwhelm the database." },
    { type: "code", code: `def prime_cache(cache, db, access_log, top_n=50_000, batch=500):
    """Load the hottest keys before the node joins the load balancer."""
    hot_ids = access_log.top_requested("product", window="1h", limit=top_n)
    for i in range(0, len(hot_ids), batch):
        rows = db.fetch_products(hot_ids[i:i + batch])          # batched, gentle on the DB
        with cache.pipeline() as pipe:
            for row in rows:
                pipe.set(f"product:v1:detail:{row['id']}", serialize(row), ex=ttl_with_jitter(900))
            pipe.execute()
    mark_ready()                                                # only now start taking traffic` },

    { type: "h2", text: "Protecting the database during warm-up" },
    { type: "p", text: "Even with warm-up, some extra database load is unavoidable. Two mechanisms stop it from cascading:" },
    { type: "ul", items: [
      "**Rate limiting the miss path.** Cap concurrent database queries triggered by misses. With a 5,000 queries-a-second limit and 50,000 misses arriving, 45,000 requests wait or get a degraded response (stale data from another source, or a brief error), and the database stays within capacity. See [rate limiting](/learn/rate-limiting).",
      "**Request coalescing.** When many requests miss on the same key at once, only one queries the database and the rest wait for its result: the **single-flight** pattern. It's especially effective during cold starts, because many users ask for the same popular keys. See [cache failure modes](/learn/cache-failure-modes).",
    ] },

    { type: "h2", text: "Monitoring cold starts" },
    { type: "p", text: "The **hit rate** is the main signal: a sudden drop from steady state (say 95%) towards 0% means a cold start. Correlate it with deploys, node replacements and flushes to find the cause. Then watch the **warm-up curve**, meaning how fast the hit rate recovers. A healthy warm-up reaches 80% of steady state within minutes for most workloads; if recovery is slow, the working set is too large for natural traffic to refill quickly, and pre-loading would help." },
  ],
  uses: [
    { name: "Large web platforms", text: "New cache nodes are primed from replicas or hot-key lists before joining, so deploys and failures don't flood the database." },
    { name: "Black Friday and launches", text: "Caches are pre-warmed with the products and pages expected to be hot before traffic arrives." },
    { name: "CDNs", text: "Pre-warm (prefetch) popular assets at edges before a release or live event." },
    { name: "Database buffer pools", text: "Databases like PostgreSQL (pg_prewarm) and MySQL (buffer pool dump/load) reload hot pages after a restart for the same reason." },
  ],
  interview: [
    "Point out that a cold or failed cache multiplies database load (95% hits → 20× more queries).",
    "Offer a warm-up strategy: pre-load hot keys, ramp traffic gradually, or rely on gradual fill only if the DB has headroom.",
    "Protect the database with request coalescing and rate limits on the miss path.",
    "Prevent self-inflicted cold starts with TTL jitter and versioned keys instead of full flushes.",
  ],
  related: ["cache-high-availability", "cache-failure-modes", "cache-invalidation", "distributed-caching", "caching", "rate-limiting"],
  practice: ["distributed-cache", "ticket-booking", "video-streaming"],
};
