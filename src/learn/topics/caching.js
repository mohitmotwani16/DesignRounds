export default {
  blocks: [
    { type: "p", text: "A **cache** stores the result of expensive work (a database query, a computation, a remote call, a file) somewhere faster, so repeated requests skip the work. Caching is usually the single biggest lever for read-heavy systems: it cuts latency from milliseconds to microseconds and can remove most of the load from a database. Its price is that cached data can be **stale**." },

    { type: "h2", text: "Where caches live" },
    { type: "diagram", kind: "flow", caption: "Caches at every layer between the user and the data. Each one closer to the user saves more work, but is harder to keep fresh.", nodes: [
      { id: "browser", label: "Browser / app", sub: "HTTP cache", col: 0, row: 0, shape: "pill", tone: "cache" },
      { id: "cdn", label: "CDN edge", sub: "static, media", col: 1, row: 0, tone: "cache" },
      { id: "app", label: "App server", sub: "in-process cache", col: 2, row: 0, tone: "cache" },
      { id: "redis", label: "Distributed cache", sub: "Redis / Memcached", col: 2, row: 1, tone: "cache", w: 160 },
      { id: "db", label: "Database", sub: "buffer pool", col: 3, row: 0.5, shape: "db", tone: "store" },
    ], edges: [
      { from: "browser", to: "cdn" }, { from: "cdn", to: "app" }, { from: "app", to: "redis", both: true }, { from: "app", to: "db", label: "on miss" },
    ] },
    { type: "table", head: ["Layer", "Caches", "Notes"], rows: [
      ["Client (browser, mobile)", "Static assets, API responses with Cache-Control/ETag", "Free capacity; you can't purge it, so use versioned URLs"],
      ["[CDN](/learn/cdn)", "Assets, images, video, public pages", "Global, absorbs spikes"],
      ["In-process (app memory)", "Config, hot lookups, small reference data", "Fastest (no network), but per instance and lost on restart"],
      ["Distributed cache", "Query results, sessions, computed views, counters", "Shared by all instances; Redis or Memcached"],
      ["Database", "Pages in the buffer pool, query plans", "Automatic; a large buffer pool is itself a cache"],
    ] },

    { type: "h2", text: "Hit ratio is everything" },
    { type: "p", text: "The **hit ratio** is the fraction of reads served from the cache. Its effect on the backend is dramatic: at 90% hits the database sees 10% of reads; at 99% it sees 1%, a **10× difference** for a few points of hit ratio. Average latency follows the same math: with a 1 ms cache and a 20 ms database, 95% hits average about 2 ms." },
    { type: "p", text: "Hit ratios depend on **access skew**: most real workloads follow a power law (a small fraction of items gets most of the traffic), which is why a cache much smaller than the dataset can still serve most reads." },

    { type: "h2", text: "What to cache" },
    { type: "ul", items: [
      "**Read-heavy, rarely changing data**: product details, user profiles, configuration, permission sets.",
      "**Expensive computations**: rendered pages, aggregates, recommendation results, search results for popular queries.",
      "**Remote calls**: third-party API responses (respecting their terms), auth token verification keys.",
      "**Not**: data that must always be exact at read time (balances at checkout, stock at purchase); data read once (cache churn with no hits); highly personalised data with no reuse.",
    ] },

    { type: "h2", text: "The hard parts" },
    { type: "ul", items: [
      "**Staleness and invalidation**: when the source changes, cached copies must be updated, deleted or allowed to expire. See [cache invalidation](/learn/cache-invalidation).",
      "**Read and write strategy**: whether the app or the cache loads data, and whether writes go through the cache. See [cache strategies](/learn/cache-strategies).",
      "**Eviction**: what to drop when memory is full. See [eviction policies](/learn/cache-eviction).",
      "**Stampedes**: when a hot key expires, thousands of requests miss at once and hit the database together.",
      "**Cold starts**: an empty cache after a restart or deploy sends full load to the database; warm caches gradually or keep a replica.",
      "**Consistency between layers**: a CDN and Redis can each hold different stale versions.",
    ] },
    { type: "callout", text: "Treat the cache as an optimisation, not a source of truth. The system must still be correct (just slower) if the cache is empty or unavailable, and the database must survive a cold cache for at least a short time." },
  ],
  uses: [
    { name: "Facebook (Memcache and TAO)", text: "Serves the vast majority of social graph reads from huge cache tiers, with the database behind them handling a small fraction of reads." },
    { name: "Twitter timelines", text: "Precomputed home timelines live in Redis clusters so a timeline read is a cache lookup, not a query." },
    { name: "E-commerce product pages", text: "Product data and rendered fragments are cached in Redis and at the CDN; price and stock are checked fresh at checkout." },
    { name: "DNS and browsers", text: "Every layer of DNS resolution and every browser is a cache with TTL-based expiry. See [DNS](/learn/dns)." },
  ],
  interview: [
    "Add a cache when your estimate shows reads dominate, and say what is cached, the key, and the TTL.",
    "State the expected hit ratio and what it means for database load.",
    "Explain how cached data is invalidated or how stale it may be, per data type.",
    "Say what happens when the cache is down or cold, and mention stampede protection for hot keys.",
  ],
  related: ["cache-strategies", "cache-eviction", "cache-invalidation", "cdn", "latency-vs-throughput", "consistency-models"],
  practice: ["url-shortener", "distributed-cache", "news-feed", "autocomplete"],
};
