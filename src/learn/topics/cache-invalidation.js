export default {
  blocks: [
    { type: "p", text: "**Cache invalidation** is keeping cached copies from serving outdated data after the source changes. It's famously one of the hard problems in computing because caches and databases update separately, concurrently and over unreliable networks. A related failure, the **cache stampede**, happens when a popular entry disappears and a flood of requests hits the backend at once." },

    { type: "h2", text: "Invalidation strategies" },
    { type: "table", head: ["Strategy", "How it works", "Trade-off"], rows: [
      ["**TTL expiry**", "Entries expire after a fixed time", "Simple and self-healing; data can be stale for up to the TTL"],
      ["**Delete on write**", "After updating the database, delete the cache key", "Fresh quickly; vulnerable to races and missed deletes"],
      ["**Update on write**", "After updating the database, write the new value into the cache", "Fresh, but concurrent writers can leave the older value cached"],
      ["**Versioned keys**", "Include a version in the key (`product:42:v17`); bump the version on change", "Old entries are simply never read again; no deletes needed"],
      ["**Event-driven**", "Database changes (CDC or events) trigger deletes in all caches", "Decoupled and complete; a short lag after each write"],
    ] },
    { type: "callout", text: "Use more than one: delete on write (or events) for freshness, **plus a TTL** as a safety net, so any missed invalidation heals itself." },

    { type: "h2", text: "The classic race" },
    { type: "p", text: "Cache-aside with delete-on-write has a subtle race: a slow reader can put an old value back into the cache **after** a writer deleted it." },
    { type: "diagram", kind: "sequence", caption: "Reader A misses, reads the old value, then stalls. Writer B updates the DB and deletes the key. A finally writes the stale value into the cache, where it stays until the TTL.", actors: ["Reader A", "Cache", "Database", "Writer B"], steps: [
      { from: 0, to: 1, label: "GET item (miss)" },
      { from: 0, to: 2, label: "read → price = 100" },
      { note: "A pauses (GC, slow network)", over: [0] },
      { from: 3, to: 2, label: "UPDATE price = 120" },
      { from: 3, to: 1, label: "DELETE item" },
      { from: 0, to: 1, label: "SET item = 100 (stale!)", tone: "danger" },
    ] },
    { type: "p", text: "Mitigations:" },
    { type: "ul", items: [
      "**Short TTLs** limit how long the stale value survives.",
      "**Delayed double delete**: delete again a second or two after the write.",
      "**Conditional set**: only fill the cache if the key wasn't deleted since the read began (Facebook's memcache **leases** do this: a miss returns a lease token, and a delete invalidates outstanding leases).",
      "**Versioned values**: store the row version with the cached value and never overwrite a newer version with an older one.",
    ] },

    { type: "h2", text: "Cache stampedes (thundering herd)" },
    { type: "p", text: "When a hot key expires, every concurrent request misses at the same moment and they all query the database, recompute, and write the cache. For a key read 50,000 times a second, that can be thousands of identical expensive queries in a few milliseconds, enough to topple the database, which then makes the cache refill slower still." },
    { type: "h3", text: "Prevention techniques" },
    { type: "table", head: ["Technique", "How it helps"], rows: [
      ["**Request coalescing (single flight)**", "Only one request per key recomputes; others wait for its result (in-process, or across servers via a short lock)"],
      ["**Lock / lease on miss**", "The first miss takes a short lock (`SET key:lock NX EX 5`); others briefly serve stale data or wait and retry"],
      ["**Serve stale while revalidating**", "Keep the old value past its soft expiry and refresh it in the background"],
      ["**Probabilistic early refresh**", "Each request has a small, rising chance to refresh a key before it expires, so one request refreshes it early instead of all at once"],
      ["**TTL jitter**", "Randomise TTLs so keys cached together don't expire together"],
      ["**Pre-warming**", "Fill the cache before traffic arrives: after deploys, before a known event"],
    ] },
    { type: "diagram", kind: "flow", caption: "Request coalescing: thousands of concurrent misses for one key produce a single database query.", nodes: [
      { id: "r1", label: "Request", col: 0, row: 0, shape: "pill", w: 100 },
      { id: "r2", label: "Request", col: 0, row: 1, shape: "pill", w: 100 },
      { id: "r3", label: "Request ×5,000", col: 0, row: 2, shape: "pill", w: 130 },
      { id: "sf", label: "Single flight", sub: "one loader per key", col: 1.3, row: 1, tone: "accent" },
      { id: "db", label: "Database", sub: "1 query", col: 2.6, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "r1", to: "sf" }, { from: "r2", to: "sf" }, { from: "r3", to: "sf" }, { from: "sf", to: "db", tone: "accent" },
    ] },

    { type: "h2", text: "Invalidating many caches" },
    { type: "p", text: "With in-process caches on hundreds of servers, a single delete isn't enough. Broadcast invalidations over [pub/sub](/learn/pub-sub) (Redis pub/sub, Kafka) or keep in-process TTLs very short. For CDNs, prefer versioned URLs and use purge APIs (by URL or tag) only when you must. See [CDN](/learn/cdn)." },
  ],
  uses: [
    { name: "Facebook memcache", text: "Uses leases to prevent stale sets and thundering herds, and invalidation daemons that read the MySQL replication stream to delete keys in every region." },
    { name: "Fastly and Cloudflare", text: "Offer surrogate keys (cache tags) so one purge call invalidates every cached page that includes a changed product." },
    { name: "Go singleflight and Caffeine", text: "Libraries provide request coalescing so concurrent misses for a key run one load." },
    { name: "HTTP stale-while-revalidate", text: "Browsers and CDNs serve the cached copy instantly while fetching a fresh one in the background." },
  ],
  interview: [
    "State your invalidation approach explicitly: delete on write plus TTL, or events from CDC.",
    "Acknowledge the read-after-delete race and how you limit it (short TTL, leases, versions).",
    "For any hot key, describe stampede protection: coalescing, locks, or serving stale while refreshing.",
    "Add TTL jitter and say how you'd warm the cache after a deploy or failover.",
  ],
  related: ["caching", "cache-strategies", "cache-eviction", "outbox-pattern", "distributed-locks", "cdn"],
  practice: ["distributed-cache", "news-feed", "ticket-booking"],
};
