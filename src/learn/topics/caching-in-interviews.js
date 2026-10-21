// How to discuss caching in a system design interview: eight dimensions walked through with an
// e-commerce product page, with what to say, common mistakes and what interviewers look for.
export default {
  blocks: [
    { type: "p", text: "Candidates often treat caching as a one-liner: \"We'll add Redis here for performance.\" That shows no understanding. Interviewers want reasoning: **why** cache this data, **which** pattern, **what happens** when it fails. This guide walks through eight dimensions using one running example, with what to say, common mistakes, and what the interviewer is looking for in each." },
    { type: "callout", text: "**The running example:** an e-commerce **product page** showing product details, pricing, a reviews summary and seller information. Peak traffic is **50,000 page views per second**; product data changes a few times a day." },
    { type: "diagram", kind: "flow", caption: "The design the walkthrough builds: CDN for static assets, a local cache for viral products, Redis for product data, PostgreSQL as the source of truth, and inventory read directly.", nodes: [
      { id: "u", label: "Shoppers", sub: "50K views/s", col: 0, row: 1, shape: "pill" },
      { id: "cdn", label: "CDN", sub: "images, JS, CSS", col: 1.2, row: 0, tone: "cache" },
      { id: "app", label: "Product service", sub: "+ local cache (5 s)", col: 1.2, row: 1.6 },
      { id: "r", label: "Redis", sub: "product:v1:detail:{id}", col: 2.6, row: 1, tone: "ok" },
      { id: "db", label: "PostgreSQL", sub: "source of truth", col: 3.9, row: 1.6, shape: "db", tone: "store" },
      { id: "inv", label: "Inventory", sub: "always read live", col: 2.6, row: 2.4, tone: "danger" },
    ], edges: [{ from: "u", to: "cdn" }, { from: "u", to: "app" }, { from: "app", to: "r", label: "cache-aside" }, { from: "r", to: "db", label: "miss", dashed: true }, { from: "app", to: "inv" }, { from: "inv", to: "db" }] },

    { type: "h2", text: "1. What to cache" },
    { type: "p", text: "Start by picking the data worth caching. The best candidates are **read often and changed rarely**, though caches also help with expensive computations and session state." },
    { type: "p", text: "**Thought process.** Look at the read-to-write ratio. Product details are read 50,000 times a second and updated a few times a day: an extreme ratio and an ideal candidate. A shopping cart changes on every click, so caching it cache-aside barely helps, since every change invalidates it (although Redis is often used as the cart's **primary** store instead)." },
    { type: "p", text: "**What to say.** \"The product detail query runs on every page view, 50,000 QPS at peak, and the data changes a few times a day, so it's a strong caching candidate. The cart changes on every interaction, so caching it in front of the database gains little.\"" },
    { type: "p", text: "**Common mistakes.** \"Cache everything\" without reasoning, rather than separating hot data from cold. Caching at only one layer: consider both the query result (application cache) and the rendered response or assets (CDN)." },
    { type: "p", text: "**Interviewer looks for:** can you find the specific queries creating database load, and quantify the benefit (hit rate, load reduction)?" },

    { type: "h2", text: "2. Cache key design" },
    { type: "p", text: "**Thought process.** The key must uniquely identify the content. `product:v1:detail:12345` encodes the entity (product), a schema version (v1), the data scope (detail) and the ID. When the schema changes, bumping to `v2` avoids serving old-format data. See [cache key design](/learn/cache-key-design)." },
    { type: "p", text: "**What to say.** \"Keys like `product:v1:detail:{id}`; the version segment lets new code write v2 keys while v1 entries expire naturally. The reviews summary gets its own key, `product:v1:reviews:{id}`, with a shorter TTL because reviews change more often.\"" },
    { type: "p", text: "**Common mistakes.** Generic keys (`product:12345`) that collide when different views of the same product (detail, list, admin) are cached. Forgetting versioning, which forces a cache flush on every deploy." },
    { type: "p", text: "**Interviewer looks for:** awareness of collisions, versioning, and different freshness needs per data type." },

    { type: "h2", text: "3. Read and write patterns" },
    { type: "p", text: "**Thought process.** Read-heavy, rare writes: **cache-aside** fits. Reads check the cache, then the database on a miss, then fill the cache; writes update the database and delete the key. The application controls everything and Redis stays a plain key-value store. If this were an inventory count updated on every purchase, write-behind might be tempting, but its durability risk makes it wrong for inventory, where accuracy matters. See [cache strategies](/learn/cache-strategies)." },
    { type: "p", text: "**What to say.** \"Cache-aside for product details: reads check Redis, fall back to PostgreSQL on a miss and store the result. On a product update we delete the key and the next read repopulates it. Write-through would add latency for no benefit, since reads vastly outnumber writes and most writes aren't read immediately.\"" },
    { type: "p", text: "**Common mistakes.** Choosing write-through \"for consistency\" without noticing that write-around (delete on write) gives the same consistency with less cache pollution. Discussing only reads and ignoring the write path." },
    { type: "p", text: "**Interviewer looks for:** reasoning about the consistency–performance trade-off and when each pattern applies." },

    { type: "h2", text: "4. Invalidation strategy" },
    { type: "p", text: "This is where many candidates lack depth. **Thought process.** Two mechanisms together: explicit invalidation (delete the key on update) handles the normal case, and a **TTL** is the safety net if the delete is lost. TTLs follow each type's staleness tolerance: product details 15 minutes (worst case if invalidation fails), pricing 60 seconds, reviews summary 5–10 minutes. See [cache invalidation](/learn/cache-invalidation)." },
    { type: "table", head: ["Data on the page", "TTL", "Invalidation"], rows: [
      ["Product details", "15 min", "Delete on update"],
      ["Price", "60 s", "Delete on update"],
      ["Reviews summary", "5–10 min", "TTL only is fine"],
      ["Inventory count", "Not cached", "Read live"],
    ] },
    { type: "p", text: "**What to say.** \"Each type gets a TTL matching its staleness tolerance: details 15 minutes, price 60 seconds, reviews 5 minutes. Any product write also deletes the key explicitly, so normal staleness is near zero and the TTL only matters if invalidation fails. I'd add ±10% jitter so batch-loaded products don't expire together.\"" },
    { type: "p", text: "**Common mistakes.** One TTL for everything. Relying only on TTL (accepting up to 15 minutes of staleness after every write). Worst: no invalidation strategy at all (\"it will eventually expire\")." },
    { type: "p", text: "**Interviewer looks for:** different freshness guarantees per data type, and layering explicit and TTL-based invalidation." },

    { type: "h2", text: "5. Eviction policy" },
    { type: "p", text: "**Thought process.** LRU is the default for web workloads: people browse a category and revisit the same products within minutes. If nightly batch jobs scan the whole catalog (indexing, analytics), LFU resists the scan pollution that would push hot products out. See [eviction](/learn/cache-eviction)." },
    { type: "p", text: "**What to say.** \"LRU by default, switching to LFU if catalog scans pollute the cache. For sizing, the hot 20% of products, about 200K entries at ~2 KB, needs roughly 400 MB, well within one Redis node.\"" },
    { type: "p", text: "**Common mistakes.** Ignoring eviction entirely. Over-engineering a custom eviction policy when LRU covers most cases." },
    { type: "p", text: "**Interviewer looks for:** understanding the memory trade-off and sizing the cache with rough math." },

    { type: "h2", text: "6. Scaling" },
    { type: "p", text: "**Thought process.** One Redis node handles roughly 100K–200K operations a second. 50,000 page views a second means about 50K cache reads a second, so **one node is enough for now**. If traffic doubles or the working set outgrows one node, shard with Redis Cluster: 16,384 hash slots across nodes, where adding a node remaps only the moved slots (about 25% of keys going from 3 to 4). Replicas per shard add read capacity. See [distributed caching](/learn/distributed-caching)." },
    { type: "p", text: "**What to say.** \"At 50K QPS with typical payloads, one Redis node likely handles it. Beyond one node's throughput or memory, I'd shard with Redis Cluster; hash slots let us grow incrementally. For viral products, a local in-process cache with a 5-second TTL absorbs repeated reads before they reach Redis.\"" },
    { type: "p", text: "**Common mistakes.** Sharding a system that doesn't need it. Ignoring the hot key problem: sharding spreads keys by hash, not by popularity." },
    { type: "p", text: "**Interviewer looks for:** knowing when scaling is actually needed, and the hot key problem that sharding doesn't solve." },

    { type: "h2", text: "7. Failure modes" },
    { type: "p", text: "**Thought process.** For a product page the main risk is a **stampede**: a popular product's entry expires and thousands of concurrent requests all miss and query the database at once. **Penetration** matters if users can request arbitrary product IDs; **avalanche** if products are batch-loaded with identical TTLs. See [cache failure modes](/learn/cache-failure-modes)." },
    { type: "p", text: "**What to say.** \"The main risk is a stampede on popular products: when a viral item expires, 5,000 concurrent requests miss together. I'd use request coalescing: the first miss takes a lock, fetches from the database and fills the cache; the other 4,999 wait and read the cache. For lookup by ID I'd add a Bloom filter so non-existent products are rejected before reaching the database.\"" },
    { type: "p", text: "**Common mistakes.** Knowing no failure modes beyond \"the cache could go down\". Listing all three without saying which matters most for this system." },
    { type: "p", text: "**Interviewer looks for:** the specific risk for this system and a concrete defense with its mechanism." },

    { type: "h2", text: "8. Consistency trade-off" },
    { type: "p", text: "**Thought process.** Fields on the same page tolerate different staleness. The name and images can be hours old (they rarely change). The price must be current (a stale price causes complaints or losses). The review count can lag minutes (nobody notices 4,201 vs 4,203). See [cache consistency](/learn/cache-consistency)." },
    { type: "p", text: "**What to say.** \"Caching trades consistency for performance, and the acceptable trade varies by data. Price: 60-second TTL plus synchronous invalidation, so at worst 60 seconds stale. Descriptions: 15 minutes, invisible to users. Inventory count bypasses the cache and reads the database directly, because overselling is worse than a few extra milliseconds.\"" },
    { type: "p", text: "**Common mistakes.** The same TTL for everything. Claiming the cache provides strong consistency (it fundamentally doesn't). Never mentioning the trade-off at all." },
    { type: "p", text: "**Interviewer looks for:** treating caching as a trade-off rather than free performance, and stating acceptable staleness per data type." },

    { type: "h2", text: "Matching depth to the problem" },
    { type: "p", text: "Not every interview needs all eight. Focus on what matters for the system in front of you:" },
    { type: "table", head: ["System", "Emphasize", "De-emphasize"], rows: [
      ["Social media feed", "Read patterns, stampede, hot keys", "Write patterns, security"],
      ["Payment system", "Consistency, what not to cache, security", "Eviction, scaling"],
      ["E-commerce catalog", "All eight dimensions apply", "—"],
      ["Real-time dashboard", "Write-behind, observability, staleness", "Eviction, penetration"],
      ["Chat application", "Session caching, HA, scaling", "Write patterns, avalanche"],
    ] },
    { type: "p", text: "The goal is to show reasoning, not to recite a list. Pick the **3–4 dimensions** most relevant to the problem and discuss them in depth rather than skimming all eight. And remember the two topics covered elsewhere: [security](/learn/cache-security-and-monitoring) (never cache credentials; scope keys by user) and [observability](/learn/cache-security-and-monitoring) (hit rate, latency, evictions, memory)." },
  ],
  uses: [
    { name: "E-commerce catalogs", text: "The full eight-dimension treatment: what to cache, keys, cache-aside, per-field TTLs, LRU/LFU, sharding, stampede protection and per-field consistency." },
    { name: "Social feeds", text: "Precomputed timelines in Redis, hot-key handling for celebrities and stampede protection. See [Design Twitter](/learn/design-twitter)." },
    { name: "URL shorteners", text: "Redirect lookups cached aggressively; Bloom filters block random-code penetration. See [Design URL Shortener](/learn/design-url-shortener)." },
    { name: "Payment systems", text: "Mostly about what not to cache: balances and authorizations are read from the source of truth." },
  ],
  interview: [
    "Never say just \"add Redis\": name what is cached, the key, the pattern, the TTL and the invalidation.",
    "Quantify: read/write ratio, expected hit rate, memory size, ops/sec per node.",
    "Name the failure mode most relevant to the system and its defense.",
    "State acceptable staleness per data type and what bypasses the cache entirely.",
  ],
  related: ["caching", "cache-strategies", "cache-invalidation", "cache-failure-modes", "distributed-caching", "system-design-interview"],
  practice: ["distributed-cache", "news-feed", "url-shortener", "ticket-booking"],
};
