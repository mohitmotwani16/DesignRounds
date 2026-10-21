// The cache-first pattern at scale: why caching becomes mandatory at 100M users, what to cache,
// which strategy, when not to cache, and how to present it in interviews.
export default {
  blocks: [
    { type: "p", text: "Indexes and sharding make a database faster, but even a well-optimized database can't serve **100 million daily active users reading directly**. The **cache-first pattern** puts fast in-memory storage between users and databases and makes the cache the **first** place every read looks. Reading a database takes milliseconds; reading a cache takes microseconds to a millisecond. At scale, that gap decides whether a system rides out a traffic spike or collapses under it." },

    { type: "h2", text: "Why cache aggressively" },
    { type: "ul", items: [
      "**Speed.** In-memory caches such as Redis and Memcached return data far faster than uncached database queries, often by orders of magnitude depending on the query. A product page that loads in about 50 ms with the cache can take several times longer straight from the database, and users notice.",
      "**Protection.** A viral news article draws 100,000 requests a second. Without a cache, all of them hit the database, which saturates while query times explode. With a cache, the first request fetches from the database and stores the result; the next 99,999 are cache hits. The database serves roughly **one** query instead of 100,000. (Without [request coalescing](/learn/cache-failure-modes), concurrent misses can still slip through in the brief window before the cache is filled.)",
      "**Cost.** Databases charge, directly or indirectly, per read. An endpoint serving 10 million requests a day with a 99% hit rate sends only 100,000 misses to the database instead of 10 million reads, a proportional cut in per-read cost.",
    ] },
    { type: "diagram", kind: "flow", caption: "Cache-first on a viral article: one request fills the cache from the database, and the other 99,999 per second are served from memory.", nodes: [
      { id: "u", label: "100,000 requests/s", sub: "viral article", col: 0, row: 0, tone: "cache" },
      { id: "c", label: "Cache", sub: "article:v1:991", col: 1.6, row: 0, tone: "ok" },
      { id: "db", label: "Database", sub: "~1 query", col: 3.2, row: 0, shape: "db", tone: "store" },
    ], edges: [{ from: "u", to: "c", label: "99,999 hits" }, { from: "c", to: "db", label: "1 miss", dashed: true }] },

    { type: "h2", text: "Scale makes it mandatory" },
    { type: "p", text: "Take a social feed at **100 million daily active users**. Each user loads their feed 10 times a day: **1 billion** feed requests. Each feed aggregates posts from about 500 friends. Without caching, that's a billion complex aggregation queries a day, and no database survives it." },
    { type: "p", text: "With caching, the system pre-computes feeds or caches query results, most requests hit the cache, and database load drops to something manageable. The cache also absorbs peak-hour spikes: when a celebrity posts and 10 million followers refresh, the cache serves the content without touching the database. See [pre-computing](/learn/precomputation-pattern) and [fan-out](/learn/fan-out)." },
    { type: "p", text: "The economics settle it. Database clusters are priced by compute and I/O, so scaling them to high QPS is expensive, while in-memory caches serve orders of magnitude more operations per dollar because RAM reads skip disk access and query planning. The **hit rate directly determines total infrastructure cost**." },

    { type: "h2", text: "What to cache" },
    { type: "table", head: ["Cache this", "Example", "Effect"], rows: [
      ["API responses that change rarely", "A product catalog updated hourly but read thousands of times a second; cache with a 1-hour TTL", "One database query an hour replaces thousands"],
      ["Session data", "Login state, cart contents, temporary preferences", "A user browsing 20 pages makes 20 cache lookups instead of 20 database queries. See [stateless servers](/learn/stateless-vs-stateful)"],
      ["Repeated query results", "A popular blog post rendered for every reader; cache it for 5 minutes", "Thousands of readers share one database query"],
      ["Computed values", "Recommendations, trending topics, aggregates that take seconds to compute but stay valid for minutes", "Compute once, serve many: saves CPU and latency"],
    ] },

    { type: "h2", text: "Strategies" },
    { type: "ul", items: [
      "**TTL expiration**: automatic invalidation. A news article cached for 5 minutes is refetched by the first request after it expires. Shorter TTLs keep data current; longer TTLs cut database load.",
      "**Write-through**: update cache and database together. When a user edits their profile, write both. Consistent, at the cost of write latency; use it for critical data that must stay in sync.",
      "**Write-behind**: update the cache immediately and the database asynchronously (within seconds). Changes appear instantly and writes are fast, but data can be lost if the cache crashes before persisting.",
      "**Cache-aside**: the application manages the cache. On read, check the cache, query the database on a miss and populate; on write, update the database and invalidate the key. Maximum control, but it needs careful implementation. It's the default for most systems.",
    ] },
    { type: "p", text: "Details and trade-offs: [cache strategies](/learn/cache-strategies) and [invalidation](/learn/cache-invalidation)." },

    { type: "h2", text: "When not to cache" },
    { type: "ul", items: [
      "**High-frequency sensor data.** Industrial systems reading sensors 1,000 times a second need the current value; a cache adds latency without benefit. Push-based streaming works better.",
      "**Fast-moving market data.** Prices that update several times a second: even a 100 ms cache shows traders stale prices. Stream updates or read the source directly.",
      "**Robotics and industrial control.** Systems that need immediate, precise responses can't accept caching delays, for safety and precision reasons. These sit outside typical web-service patterns.",
      "**Correctness-critical reads**: account balances at the moment of payment, stock at the moment of purchase. Read the source of truth. See [cache consistency](/learn/cache-consistency).",
    ] },
    { type: "p", text: "For web services, APIs and user-facing applications serving millions of users, though, caching is mandatory: the performance gain and cost reduction justify the complexity." },

    { type: "h2", text: "In an interview" },
    { type: "ul", items: [
      "**Suggest caching immediately** for any system at 100 million users, and explain that direct database reads can't scale that far. Say exactly where: feeds, API responses, sessions.",
      "**Discuss invalidation per data type.** In a social network, posts get a short TTL because likes and comments keep changing them; profiles cache longer because they change rarely.",
      "**Default to cache-aside**: check the cache, fall back to the database on a miss, populate the cache. Mention that other patterns exist but cache-aside fits most cases.",
      "**Quantify the hit rate.** At 95%, only 5% of requests reach the database: with 10 million requests a day, 500,000 queries instead of 10 million.",
    ] },
    { type: "p", text: "For a fuller checklist, see [caching in interviews](/learn/caching-in-interviews)." },
  ],
  uses: [
    { name: "News and media sites", text: "Viral articles are served almost entirely from cache and CDN, so traffic spikes never reach the database." },
    { name: "Social feeds", text: "Precomputed or cached feeds turn a billion daily aggregation queries into cache lookups." },
    { name: "E-commerce catalogs", text: "Hourly-changing catalogs cached with TTLs; sessions and carts in Redis." },
    { name: "Recommendation and trending services", text: "Expensive computations cached for minutes and shared by every user who asks." },
  ],
  interview: [
    "At large scale, make the cache the first stop for every read and say which data goes there.",
    "Quantify: hit rate × request volume = database load and cost saved.",
    "Use different TTLs per data type and cache-aside by default.",
    "Name what you won't cache: real-time sensor or market data and correctness-critical reads.",
  ],
  related: ["caching", "cache-strategies", "precomputation-pattern", "cache-failure-modes", "caching-in-interviews", "database-optimization"],
  practice: ["news-feed", "url-shortener", "distributed-cache"],
};
