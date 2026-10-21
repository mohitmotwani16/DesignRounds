export default {
  blocks: [
    { type: "p", text: "A **cache** keeps a copy of the result of expensive work (a database query, a computation, a remote call, a file) somewhere faster, so repeated requests skip the work. A user opens a product page and the database query takes 50 ms. A second later another user opens the same product, and the database runs the identical query for the identical row. Thousands of users view that product every minute. Serving it from memory instead is orders of magnitude faster. Caching is usually the single biggest lever for read-heavy systems; its price is that cached data can be **stale**." },

    { type: "h2", text: "The speed gap" },
    { type: "p", text: "Caching starts with how differently storage performs. Each step down the hierarchy adds a big jump in latency, sometimes 10×, sometimes orders of magnitude (1 ms = 1,000,000 ns):" },
    { type: "table", head: ["Operation", "Latency"], rows: [
      ["L1 CPU cache reference", "0.5 ns"],
      ["L2 CPU cache reference", "7 ns"],
      ["Main memory (RAM) reference", "100 ns"],
      ["Read 1 MB sequentially from memory", "250,000 ns (0.25 ms)"],
      ["Disk seek", "8,000,000 ns (8 ms)"],
      ["Read 1 MB sequentially from disk", "20,000,000 ns (20 ms)"],
      ["Round trip US ↔ Europe", "150,000,000 ns (150 ms)"],
    ] },
    { type: "diagram", kind: "bars", log: true, caption: "The same numbers on a log scale (from Peter Norvig's latency table). RAM is five orders of magnitude faster than a disk seek.", values: [
      { label: "L1 cache", value: 0.5, display: "0.5 ns", tone: "ok" },
      { label: "L2 cache", value: 7, display: "7 ns", tone: "ok" },
      { label: "RAM reference", value: 100, display: "100 ns", tone: "ok" },
      { label: "Read 1 MB from RAM", value: 250000, display: "0.25 ms", tone: "store" },
      { label: "Disk seek", value: 8000000, display: "8 ms", tone: "cache" },
      { label: "Read 1 MB from disk", value: 20000000, display: "20 ms", tone: "cache" },
      { label: "US ↔ Europe round trip", value: 150000000, display: "150 ms", tone: "danger" },
    ] },
    { type: "p", text: "RAM versus a disk seek is a gap of five orders of magnitude. Serving from memory instead of disk can multiply the throughput of the same hardware, and often decides whether a system survives production load or collapses under it. See [latency numbers](/learn/latency-vs-throughput)." },

    { type: "h2", text: "Why caching works: power laws" },
    { type: "p", text: "If every request were for something different, caching would be useless. In practice, most read-heavy workloads follow **power-law (Zipf) distributions**: a small fraction of the data serves most of the requests." },
    { type: "ul", items: [
      "A video platform hosts 10 million videos; the top 1,000 get 60% of all views.",
      "An e-commerce site lists millions of products; the homepage and top categories produce 80% of page loads.",
      "A social network stores billions of posts; trending content drives most reads.",
    ] },
    { type: "p", text: "So a small cache has an outsized effect: in a highly skewed catalog, caching just the top 1,000 of 10 million items can absorb most reads. How much depends on how steep the popularity curve is, but real-world popularity is uneven, never uniform." },

    { type: "h2", text: "The mental model: time-bounded copies" },
    { type: "p", text: "A cache is a **time-bounded copy of data stored closer to the requester**. Each part of that definition matters:" },
    { type: "ul", items: [
      "**Copy.** In typical designs the cache is **not** the source of truth; the database is. The cache holds a duplicate that can drift from the original after an update.",
      "**Time-bounded.** Entries don't live forever. Most expire after a set time (a **TTL**, time-to-live); others are explicitly invalidated when the source changes. Either way the cache should eventually reflect reality, though a failed invalidation can leave stale entries behind. Without any expiry, stale data would persist forever.",
      "**Closer to the requester.** Fewer network hops, faster storage, or both. A browser cache is on the user's device (no network at all). A CDN is in a nearby data center (around 10 ms instead of 150 ms across a continent). An application cache is in RAM: microseconds in-process, sub-millisecond to a few milliseconds for a networked cache like Redis, all far faster than a disk-bound database query.",
    ] },
    { type: "p", text: "In one sentence: **pay a small freshness cost to avoid fetching the same data from a slow source again and again.**" },
    { type: "diagram", kind: "sequence", caption: "On a hit the app answers from the cache and never touches the database; on a miss it reads the database, stores the result, then answers.", actors: ["App", "Cache", "Database"], steps: [
      { from: 0, to: 1, label: "get product:42" },
      { from: 1, to: 0, label: "HIT → value (~1 ms)", dashed: true },
      { note: "later, for a key that isn't cached", over: [0, 2] },
      { from: 0, to: 1, label: "get product:77" },
      { from: 1, to: 0, label: "MISS", dashed: true, tone: "danger" },
      { from: 0, to: 2, label: "SELECT … (~50 ms)" },
      { from: 2, to: 0, label: "row", dashed: true },
      { from: 0, to: 1, label: "set product:77 (TTL)" },
    ] },

    { type: "h2", text: "Three benefits" },
    { type: "ul", items: [
      "**Lower latency.** A hit returns from memory in microseconds or a millisecond; a miss costs a database round trip in milliseconds. Across a page that makes 20 backend calls, saving 40 ms per call saves nearly a second.",
      "**Higher throughput.** The database sees far fewer requests. If 90% of reads hit the cache, a database rated for 5,000 queries a second effectively supports 50,000. The same hardware serves 10× the users without new replicas or bigger instances.",
      "**Lower cost.** Fewer queries means less compute and I/O. A system that would need 10 read replicas at full load might need 2. Memory costs more per GB than disk, but a few GB of cache replacing terabytes of repeated disk reads is a net saving.",
    ] },
    { type: "p", text: "In interviews, frame a caching decision around which benefit matters most: a real-time game wants latency, a high-traffic API wants throughput, a cost-sensitive startup wants savings." },
    { type: "h3", text: "How hit rate changes everything" },
    { type: "p", text: "Average latency = hit rate × cache latency + miss rate × database latency, and database load = total load × miss rate. With an (illustrative) 0.5 ms networked cache, a 50 ms database and 10,000 requests a second:" },
    { type: "code", code: `def simulate(hit_rate_percent, cache_ms=0.5, db_ms=50.0, total_rps=10_000):
    hit = hit_rate_percent / 100
    avg_latency = hit * cache_ms + (1 - hit) * db_ms
    db_qps = int(total_rps * (1 - hit))
    print(f"{hit_rate_percent:>3}% hits: avg {avg_latency:5.1f} ms, DB load {db_qps:>6,}/s")

for rate in (0, 50, 80, 90, 95, 99):
    simulate(rate)` },
    { type: "table", head: ["Hit rate", "Average latency", "Database queries per second"], rows: [
      ["0%", "50.0 ms", "10,000"],
      ["50%", "25.3 ms", "5,000"],
      ["80%", "10.4 ms", "2,000"],
      ["90%", "5.5 ms", "1,000"],
      ["95%", "3.0 ms", "500"],
      ["99%", "1.0 ms", "100"],
    ] },
    { type: "p", text: "Even modest caching helps a lot, and the last few percent matter most: 90% → 99% cuts database load another 10×." },

    { type: "h2", text: "The freshness trade-off" },
    { type: "p", text: "Every cache trades **speed for freshness**. A cached copy is fast but may be stale: the database might have changed a second ago while the cache still holds the old value. For most read-heavy data that's fine:" },
    { type: "ul", items: [
      "A product description cached for 5 minutes: fine, descriptions rarely change.",
      "A notification count cached for 60 seconds: tolerable, a short delay is acceptable.",
      "A stock price cached for 5 minutes: dangerous, financial data must be real-time.",
    ] },
    { type: "p", text: "So the question is never \"should we cache?\" but **\"how stale can this data be?\"** Different data has different tolerances, and the rest of this caching series is about managing that trade-off: [key design](/learn/cache-key-design), [read and write strategies](/learn/cache-strategies), [consistency](/learn/cache-consistency), [invalidation and TTLs](/learn/cache-invalidation), [eviction](/learn/cache-eviction), [distribution](/learn/distributed-caching), [high availability](/learn/cache-high-availability), [warming](/learn/cache-warming), [failure modes](/learn/cache-failure-modes), [security and monitoring](/learn/cache-security-and-monitoring) and [caching in interviews](/learn/caching-in-interviews)." },

    { type: "h2", text: "The four caching layers" },
    { type: "p", text: "\"Closer to the requester\" can mean several places. A request can pass up to four caching layers before reaching the database, and each layer can short-circuit the trip. The layers nearest the user are the fastest but the hardest to invalidate; those nearest the database are the freshest but add the most latency. Knowing which layer to use, and which to skip, is a core design skill." },
    { type: "diagram", kind: "flow", caption: "Caching tiers from user to database. The request travels left to right and any layer can answer it: faster on the left, fresher on the right.", nodes: [
      { id: "u", label: "User", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "Browser cache", sub: "~0 ms · static assets", col: 1, row: 0, tone: "store" },
      { id: "c", label: "CDN / edge cache", sub: "5–30 ms · images, pages", col: 2.1, row: 0, tone: "cache" },
      { id: "a", label: "Application cache", sub: "1–5 ms · queries, sessions", col: 3.2, row: 0, tone: "ok" },
      { id: "d", label: "Database", sub: "10–100 ms · source of truth", col: 4.3, row: 0, shape: "db", tone: "danger" },
    ], edges: [{ from: "u", to: "b" }, { from: "b", to: "c", label: "miss" }, { from: "c", to: "a", label: "miss" }, { from: "a", to: "d", label: "miss" }] },
    { type: "h3", text: "1. Browser cache" },
    { type: "p", text: "The browser keeps HTTP responses on the user's device and checks them before making any network request, so a hit costs **zero** network latency. The server controls it with HTTP headers: `Cache-Control: max-age=3600` tells the browser to reuse a response for an hour without asking the server again." },
    { type: "ul", items: [
      "**Great for static assets**: JavaScript bundles, CSS, images and fonts change only on deploy. Put a content hash in the file name (`app.a3f2b1.js`) and you can cache for a year: a new deploy produces a new file name.",
      "**Tricky for dynamic data**: notification counts change every few seconds and carts change on every add. Short TTLs or **ETag revalidation** help: the browser asks \"has this changed?\" with `If-None-Match`, and the server answers with a tiny `304 Not Modified` if not, saving the body but not the round trip. For rapidly changing state, requests usually go deeper.",
    ] },
    { type: "diagram", kind: "flow", caption: "Two browser strategies: max-age means no request at all; ETag revalidation means a small request that returns 304 when nothing changed.", zones: [{ label: "Cache-Control: max-age", from: [0, 0], to: [1.3, 0], tone: "accent" }, { label: "ETag revalidation", from: [0, 1.3], to: [1.3, 1.3] }], nodes: [
      { id: "b1", label: "Browser", col: 0, row: 0 },
      { id: "l", label: "Local cache", sub: "app.a3f2b1.js", col: 1.3, row: 0, tone: "ok" },
      { id: "b2", label: "Browser", col: 0, row: 1.3 },
      { id: "s", label: "Server", col: 1.3, row: 1.3, tone: "cache" },
    ], edges: [{ from: "b1", to: "l", label: "~0 ms", both: true }, { from: "b2", to: "s", label: "If-None-Match", bend: -25 }, { from: "s", to: "b2", label: "304 Not Modified", dashed: true, bend: -25 }] },
    { type: "p", text: "More in [browser caching](/learn/browser-caching)." },
    { type: "h3", text: "2. CDN / edge cache" },
    { type: "p", text: "A **CDN** keeps content on servers spread across regions. A user in Tokyo asking for an image gets it from a Tokyo edge server rather than the origin in Virginia: roughly 150 ms becomes under 10 ms. CDNs cache at the HTTP layer: on a miss the edge fetches from the origin, stores the response, and serves later requests itself, following the same `Cache-Control` headers browsers use." },
    { type: "ul", items: [
      "**Excellent for static content at scale**: images, video, downloads, pre-rendered pages, and absorbing traffic spikes when hit rates are high.",
      "**Weak for personalized or fast-changing content**: a page with the user's name, cart or live prices can't be cached at the edge without careful partitioning. See [CDN vs application cache](/learn/cdn).",
    ] },
    { type: "h3", text: "3. Application cache" },
    { type: "p", text: "An in-memory store such as **Redis** or **Memcached** between the application servers and the database. This is the layer system design interviews care about most. The app checks it first: a hit is sub-millisecond to a few milliseconds over the network; a miss queries the database, stores the result and returns it." },
    { type: "diagram", kind: "flow", caption: "Application cache: check first; on a miss, query the database and store the result for next time.", nodes: [
      { id: "app", label: "App server", sub: "needs user:42", col: 0, row: 0 },
      { id: "c", label: "In-memory cache", sub: "user:42, product:99, feed:42", col: 1.5, row: 0, tone: "ok" },
      { id: "db", label: "Database", col: 3, row: 0, shape: "db", tone: "store" },
    ], edges: [{ from: "app", to: "c", label: "1. check · hit < 1 ms" }, { from: "c", to: "db", label: "2. miss → query", dashed: true, tone: "danger" }, { from: "db", to: "c", label: "3. store result", dashed: true, bend: 35 }] },
    { type: "p", text: "It handles what CDNs can't: **dynamic, personalized data** with complex access patterns: user profiles, product details, sessions, feed timelines, search results. It's also the layer you control most precisely (what to cache, when it expires, how to invalidate on writes), which brings the complexity covered in the rest of this series." },
    { type: "h3", text: "4. Database buffers" },
    { type: "p", text: "Databases cache too. A relational database keeps frequently used pages in a **buffer pool** in RAM (a read from it takes about 0.1 ms versus about 8 ms for a disk seek). The database manages it automatically, so you rarely configure it in an interview, but it explains two things: a database whose working set fits in RAM is dramatically faster, and a freshly restarted (**cold**) database is slow until its buffer pool fills, which is why cache failures that dump traffic onto the database cause cascading slowdowns." },

    { type: "h2", text: "Layers compose" },
    { type: "p", text: "In production the layers work together. A typical request:" },
    { type: "ol", items: [
      "The browser checks its cache: miss (first visit).",
      "The CDN edge checks its cache: hit for static assets, miss for personalized API calls.",
      "The application server checks its in-memory cache: hit for popular data.",
      "Only if everything missed, the database runs the query, from its buffer pool or disk.",
    ] },
    { type: "p", text: "Each layer shields the ones below: the browser absorbs repeat visits, the CDN absorbs geography, the application cache absorbs hot data, and the database handles only cold or freshly written data. The effect is **multiplicative**: if the browser catches 30% of requests, the CDN 40% of the rest and the application cache 90% of what's left, the database sees only **4.2%** of the original traffic." },
    { type: "diagram", kind: "bars", caption: "Layered filtering: 100,000 requests per second shrink to 4,200 at the database.", values: [
      { label: "Incoming", value: 100000, display: "100,000 req/s", tone: "store" },
      { label: "After browser (−30%)", value: 70000, display: "70,000 req/s", tone: "store" },
      { label: "After CDN (−40%)", value: 42000, display: "42,000 req/s", tone: "cache" },
      { label: "After app cache (−90%)", value: 4200, display: "4,200 req/s to the DB", tone: "ok" },
    ] },

    { type: "h2", text: "Choosing the right layer" },
    { type: "table", head: ["Data", "Layer", "Examples"], rows: [
      ["Static, public, rarely changing", "Browser + CDN", "Marketing pages, product images, documentation"],
      ["Dynamic, read-heavy, tolerates seconds of staleness", "Application cache", "User profiles, product catalogs, feed rankings"],
      ["Dynamic, user-specific, needs low latency", "Application cache with a short TTL", "Sessions, notification counts, dashboard metrics"],
      ["Frequently changing, consistency-critical", "No cache, or a very short TTL plus active invalidation", "Inventory counts, account balances, real-time bidding"],
    ] },

    { type: "h2", text: "A worked example" },
    { type: "p", text: "An e-commerce site's product pages query the database for details, price and stock. The database takes 1,000 requests a second, mostly for the same 100 popular products. Each query takes 50 ms, pages feel slow, database CPU sits at 90%, and adding database servers is expensive, yet most queries return the same data as a few minutes ago." },
    { type: "p", text: "Cache the products in memory and serve repeats from the cache: response time drops from about 50 ms to about 1 ms and database load falls by around 80%. Use caching like this when reads far outnumber writes, when some staleness is acceptable (a price a few minutes old on the product page; checked fresh at checkout), and when you need to cut database load and latency." },
    { type: "p", text: "This read-through-the-app approach is **cache-aside**. Alternatives include **write-through** (writes update the cache and database together) and **write-behind** (writes update the cache first and the database asynchronously); see [cache strategies](/learn/cache-strategies). Because memory is limited, an **eviction policy** decides what to drop when the cache is full: **LRU** removes what hasn't been used recently, **LFU** removes what's used rarely, and **TTL** removes entries when they expire; see [eviction](/learn/cache-eviction). **Invalidation** keeps data fresh: a 5-minute TTL for prices, plus deleting a product's entry immediately when its price changes; see [invalidation](/learn/cache-invalidation). Longer TTLs mean staler data but less database load; shorter TTLs mean fresher data and more database hits." },

    { type: "h2", text: "What to cache, and what not to" },
    { type: "ul", items: [
      "**Read-heavy, rarely changing data**: product details, user profiles, configuration, permission sets.",
      "**Expensive computations**: rendered pages, aggregates, recommendation results, search results for popular queries.",
      "**Remote calls**: third-party API responses (within their terms), auth token verification keys.",
      "**Not**: data that must be exact at read time (balances at checkout, stock at purchase); data read once (churn with no hits); highly personalized data with no reuse; secrets and sensitive data (see [cache security](/learn/cache-security-and-monitoring)).",
    ] },

    { type: "h2", text: "Common implementations" },
    { type: "table", head: ["Technology", "What it is", "Use it for"], rows: [
      ["Redis", "In-memory store with sub-millisecond latency and rich data structures (strings, lists, sets, sorted sets, hashes)", "General caching, sessions, leaderboards, rate limits. See [Redis](/learn/redis)"],
      ["Memcached", "A simpler in-memory key-value cache, very fast for plain gets and sets, without Redis's data structures", "Straightforward caching where simplicity wins"],
      ["CDNs (Cloudflare, CloudFront, Akamai)", "Distributed HTTP caches at edge locations worldwide", "Static assets, media, public pages. See [CDN](/learn/cdn)"],
      ["In-process caches (Caffeine, Guava, lru-cache)", "Memory inside the application process", "Tiny, very hot data; per instance and lost on restart"],
    ] },
    { type: "callout", text: "Treat the cache as an optimization, not a source of truth. The system must still be correct (just slower) if the cache is empty or unavailable, and the database must survive a cold cache for at least a short time. See [cache warming](/learn/cache-warming) and [cache high availability](/learn/cache-high-availability)." },
  ],
  uses: [
    { name: "Facebook (Memcache and TAO)", text: "Serves the vast majority of social graph reads from huge cache tiers, with the database behind them handling a small fraction of reads." },
    { name: "Twitter timelines", text: "Precomputed home timelines live in Redis clusters so a timeline read is a cache lookup, not a query. See [Design Twitter](/learn/design-twitter)." },
    { name: "E-commerce product pages", text: "Product data and rendered fragments are cached in Redis and at the CDN; price and stock are checked fresh at checkout." },
    { name: "DNS and browsers", text: "Every layer of DNS resolution and every browser is a cache with TTL-based expiry. See [DNS](/learn/dns)." },
  ],
  interview: [
    "Add a cache when your estimate shows reads dominate, and say which layer, what is cached, the key and the TTL.",
    "State the expected hit ratio and what it means for database load (90% → 10× fewer queries).",
    "Ask \"how stale can this be?\" per data type, and skip caching for consistency-critical values.",
    "Say what happens when the cache is down or cold, and mention stampede protection for hot keys.",
  ],
  related: ["cache-strategies", "cache-invalidation", "cache-eviction", "cdn", "distributed-caching", "cache-failure-modes", "caching-in-interviews", "redis"],
  practice: ["url-shortener", "distributed-cache", "news-feed", "autocomplete"],
};
