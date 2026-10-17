export default {
  blocks: [
    { type: "p", text: "**Redis** is an in-memory data store that serves reads and writes in well under a millisecond and offers rich data structures, not just key-value strings: hashes, lists, sets, sorted sets, streams and more. In system design it's the default choice for caching, but also for session storage, rate limiting, leaderboards, counters, distributed locks with care, and lightweight queues. Knowing which data structure fits each problem, and what happens when Redis restarts, is what interviewers look for." },
    {"type":"diagram","kind":"flow","caption":"One Redis, many jobs: the same in-memory store serves as a cache, a leaderboard and a rate limiter, with snapshots or an append-only file for durability.","nodes":[{"id":"app","label":"App server","col":0,"row":1},{"id":"redis","label":"Redis","sub":"in memory","col":1,"row":1,"shape":"db","tone":"cache"},{"id":"cache","label":"Cache","sub":"GET/SET with TTL","col":2,"row":0},{"id":"rank","label":"Leaderboard","sub":"sorted set","col":2,"row":1},{"id":"limit","label":"Rate limiter","sub":"INCR + EXPIRE","col":2,"row":2},{"id":"disk","label":"RDB / AOF","sub":"persistence","col":1,"row":2,"shape":"db","tone":"store"}],"edges":[{"from":"app","to":"redis"},{"from":"redis","to":"cache"},{"from":"redis","to":"rank"},{"from":"redis","to":"limit"},{"from":"redis","to":"disk","dashed":true}]},

    { type: "h2", text: "Data structures and what they're for" },
    { type: "table", head: ["Structure", "Key commands", "Typical use"], rows: [
      ["String", "`GET`, `SET key value EX 60`, `INCR`", "Cached values, counters, flags"],
      ["Hash", "`HSET`, `HGET`, `HGETALL`", "An object's fields, such as a session or user profile"],
      ["List", "`LPUSH`, `RPOP`, `LRANGE`", "Recent items, simple queues"],
      ["Set", "`SADD`, `SISMEMBER`, `SINTER`", "Unique members, tags, \"who's online\""],
      ["Sorted set", "`ZADD`, `ZRANGE`, `ZREVRANK`, `ZRANGEBYSCORE`", "Leaderboards, priority queues, time-ordered indexes, sliding-window rate limits"],
      ["Stream", "`XADD`, `XREADGROUP`, `XACK`", "Append-only event logs with consumer groups"],
      ["HyperLogLog", "`PFADD`, `PFCOUNT`", "Approximate unique counts with tiny memory. See [probabilistic data structures](/learn/probabilistic-data-structures)"],
      ["Geo", "`GEOADD`, `GEOSEARCH`", "Nearby search within a radius. See [geospatial indexing](/learn/geospatial-indexing)"],
    ] },

    { type: "h2", text: "Common patterns" },
    { type: "ul", items: [
      "**Cache-aside:** read Redis, fall back to the database on a miss and populate with a TTL. See [cache strategies](/learn/cache-strategies).",
      "**Leaderboard:** `ZINCRBY leaderboard 10 user:42` on each score; `ZREVRANGE leaderboard 0 9 WITHSCORES` for the top ten; `ZREVRANK` for a user's position. Every operation is logarithmic.",
      "**Rate limiting:** `INCR` a per-user, per-minute key with an expiry for a fixed window, or a sorted set of timestamps for a sliding window. Use a Lua script so check-and-increment is atomic. See [rate limiting](/learn/rate-limiting).",
      "**Sessions:** a hash per session with an expiry, shared by all app servers, so the app servers stay stateless. See [scalability](/learn/scalability).",
      "**Counters:** `INCR` is atomic, so millions of likes or views can be counted without races, flushed to the database periodically.",
      "**Pub/sub and streams:** pub/sub for fire-and-forget fan-out (no persistence); streams when messages must be durable and acknowledged.",
    ] },
    { type: "callout", tone: "tip", text: "Redis runs commands one at a time on a single main thread, so each command is atomic. That's why `INCR` and Lua scripts need no locks, and also why one slow command (`KEYS *` on millions of keys) blocks everything. Use `SCAN` instead." },

    { type: "h2", text: "Persistence and durability" },
    { type: "table", head: ["Option", "How", "Data at risk on crash"], rows: [
      ["None", "Pure cache", "Everything (rebuilt from the source of truth)"],
      ["RDB snapshots", "Periodic point-in-time dumps", "Changes since the last snapshot (minutes)"],
      ["AOF (append-only file)", "Log every write; fsync every second or always", "About a second with everysec, or none with always (slower)"],
      ["RDB + AOF", "Both", "Small, with faster restarts"],
    ] },
    { type: "p", text: "Treat Redis as a cache unless you've deliberately configured and tested durability. If losing its contents would lose business data, that data should also live in a durable database." },

    { type: "h2", text: "Memory and eviction" },
    { type: "p", text: "Everything lives in RAM, so set `maxmemory` and an eviction policy such as `allkeys-lru` for caches (evict the least recently used keys) or `volatile-ttl` to evict keys closest to expiry. Without a limit, memory grows until the process is killed. Use TTLs on cache keys, keep values small, and watch for big keys (a hash with millions of fields) that are slow to read and delete. See [cache eviction](/learn/cache-eviction)." },

    { type: "h2", text: "Scaling and availability" },
    { type: "ul", items: [
      "**Replication:** a primary with replicas for read scaling and failover. Replication is asynchronous, so a failover can lose the last writes.",
      "**Sentinel or managed failover:** monitors the primary and promotes a replica automatically.",
      "**Redis Cluster:** shards keys across primaries using 16,384 hash slots; multi-key operations work only when keys share a slot, which you can force with hash tags such as `{user42}:cart` and `{user42}:profile`.",
      "**Hot keys:** a single very popular key can overload one shard; replicate it or cache it in-process. See [hot partitions](/learn/hot-partitions).",
      "**Locks:** Redis-based locks are fine for efficiency (avoid duplicate work) but need fencing tokens when correctness depends on them. See [distributed locks](/learn/distributed-locks).",
    ] },
  ],
  uses: [
    { name: "Caching and sessions", text: "Hot database rows and user sessions served in under a millisecond, shared by stateless app servers." },
    { name: "Gaming and social", text: "Sorted-set leaderboards and atomic counters for scores, likes and views." },
    { name: "API platforms", text: "Per-key rate limiting with atomic Lua scripts across a fleet of gateways." },
  ],
  interview: [
    "Pick the right data structure: sorted sets for leaderboards, hashes for objects, INCR for counters.",
    "Explain single-threaded atomicity and why slow commands are dangerous.",
    "State the persistence setting and what's lost on a crash.",
    "Cover maxmemory with eviction, replication and Redis Cluster hash slots.",
  ],
  related: ["caching", "cache-strategies", "cache-eviction", "rate-limiting", "distributed-locks"],
  practice: ["distributed-cache", "rate-limiter", "url-shortener"],
  reading: [
    { title: "Redis data types", publisher: "Redis documentation", url: "https://redis.io/docs/latest/develop/data-types/" },
    { title: "Redis persistence", publisher: "Redis documentation", url: "https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/" },
  ],
};
