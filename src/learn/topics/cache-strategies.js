export default {
  blocks: [
    { type: "p", text: "A **caching strategy** decides who loads data into the cache and what happens on writes. The choice determines how stale the cache can get, what happens on a failure, and how much load reaches the database. The five common patterns are cache-aside, read-through, write-through, write-around and write-back." },

    { type: "h2", text: "Cache-aside (lazy loading)" },
    { type: "p", text: "The application owns the logic: check the cache; on a miss, read the database and put the result in the cache. On a write, update the database and **delete** the cache entry. This is the most common pattern by far." },
    { type: "diagram", kind: "sequence", caption: "Cache-aside read: hit returns immediately; miss reads the database and fills the cache with a TTL.", actors: ["App", "Cache", "Database"], steps: [
      { from: 0, to: 1, label: "GET user:42" },
      { from: 1, to: 0, label: "miss", dashed: true },
      { from: 0, to: 2, label: "SELECT … WHERE id = 42" },
      { from: 2, to: 0, label: "row" },
      { from: 0, to: 1, label: "SET user:42 (TTL 10 min)", tone: "accent" },
      { note: "next read: cache hit", over: [0, 1] },
    ] },
    { type: "code", code: `
def get_user(user_id):
    user = cache.get(f"user:{user_id}")
    if user is None:
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        cache.set(f"user:{user_id}", user, ttl=600)
    return user

def update_user(user_id, fields):
    db.update("users", user_id, fields)
    cache.delete(f"user:{user_id}")      # delete, don't set: avoids writing stale data
` },
    { type: "ul", items: [
      "**Pros**: only requested data is cached; the cache failing just means slower reads; works with any store.",
      "**Cons**: the first read of each key is slow; cache logic is spread through the app; a race between a read refilling the cache and a write deleting it can leave stale data (mitigated by TTLs and careful ordering; see [cache invalidation](/learn/cache-invalidation)).",
    ] },

    { type: "h2", text: "Read-through" },
    { type: "p", text: "Like cache-aside, but the **cache library or service** loads missing data itself through a configured loader, so application code just asks the cache. Common with in-process caches (Caffeine, Guava) and some managed caches. Same behaviour, cleaner code, and it makes request coalescing (one load per key) easy." },

    { type: "h2", text: "Write-through" },
    { type: "p", text: "Every write goes to the cache and the database **synchronously** as one operation; it succeeds only when both have it. The cache is always populated and fresh for keys that were written." },
    { type: "ul", items: [
      "**Pros**: reads right after writes hit fresh data; no stale reads for written keys.",
      "**Cons**: higher write latency (two writes); the cache fills with data that may never be read; still needs a read path for data written before the cache existed.",
    ] },

    { type: "h2", text: "Write-around" },
    { type: "p", text: "Writes go straight to the database and **skip the cache**; data enters the cache only when read (usually combined with cache-aside). Good for data that is written often but read rarely, such as logs or bulk imports, so the cache isn't flooded." },

    { type: "h2", text: "Write-back (write-behind)" },
    { type: "p", text: "Writes go to the cache only and are acknowledged immediately; the cache flushes them to the database **asynchronously**, often batched." },
    { type: "ul", items: [
      "**Pros**: very fast writes; batching and coalescing many updates to the same key (a counter incremented 1,000 times becomes one database write).",
      "**Cons**: **data loss** if the cache node dies before flushing; the database is behind the cache; harder to reason about. Use only when losing the latest updates is acceptable or the cache itself is durable and replicated.",
    ] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["Strategy", "Read miss", "Write path", "Staleness", "Risk"], rows: [
      ["Cache-aside", "App loads and fills", "DB, then delete key", "Up to TTL, small race window", "Low: cache is optional"],
      ["Read-through", "Cache loads via loader", "Usually with write-through or delete", "Same as cache-aside", "Low"],
      ["Write-through", "Load on miss", "Cache and DB synchronously", "Fresh for written keys", "Slower writes"],
      ["Write-around", "Load on miss", "DB only", "Until next miss or TTL", "Recent writes read slowly"],
      ["Write-back", "Load on miss", "Cache now, DB later", "DB lags the cache", "Lost writes if cache fails"],
    ] },
    { type: "callout", tone: "tip", text: "Default to **cache-aside with a TTL and delete-on-write**. Reach for write-back only for counters and similar data where batching matters and small losses are tolerable." },
  ],
  uses: [
    { name: "Most web applications", text: "Cache-aside with Redis or Memcached in front of PostgreSQL or MySQL, with TTLs and invalidation on update." },
    { name: "View and like counters", text: "Write-back style: increment counters in Redis and flush aggregated values to the database periodically." },
    { name: "Amazon DynamoDB Accelerator (DAX)", text: "A read-through and write-through cache in front of DynamoDB, transparent to the application." },
    { name: "CPU caches and disk controllers", text: "Write-back caching is the classic hardware technique, protected by batteries or capacitors against power loss." },
  ],
  interview: [
    "Name the strategy you're using (usually cache-aside) and walk through the read and write paths.",
    "On writes, say you delete the cache key rather than update it, and why.",
    "If you choose write-back for speed, state the durability risk and why it's acceptable.",
    "Give every cache entry a TTL as a safety net against missed invalidations.",
  ],
  related: ["caching", "cache-invalidation", "cache-eviction", "consistency-models", "distributed-locks"],
  practice: ["distributed-cache", "url-shortener", "news-feed"],
};
