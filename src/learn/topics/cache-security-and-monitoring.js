// Cache security (auth leakage, cached credentials, PII) and observability (hit rate, latency,
// evictions, memory) with starting alert thresholds.
export default {
  blocks: [
    { type: "p", text: "Two cache concerns are easy to forget until they hurt: **security**, because a cache's whole purpose is to share data across requests (dangerous when the data shouldn't be shared), and **observability**, because a cache without metrics is a black box until the database falls over." },

    { type: "h2", text: "Security: what not to cache" },
    { type: "h3", text: "Auth leakage through generic keys" },
    { type: "p", text: "A key like `user:profile:123` holds one user's profile. If code accidentally uses a key **without** the user's identity, such as `profile:current`, one user's data gets served to another. That is a serious authorization breach, not a performance bug." },
    { type: "diagram", kind: "flow", caption: "Auth leakage: a cache key without the user ID makes Bob's request return Alice's cached profile.", nodes: [
      { id: "a", label: "Alice", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "Bob", col: 0, row: 1.2, shape: "pill" },
      { id: "c", label: "Cache", sub: "profile:current → Alice's data", col: 1.6, row: 0.6, tone: "danger" },
    ], edges: [{ from: "a", to: "c", label: "SET (first)" }, { from: "b", to: "c", label: "GET → Alice's profile ✗", tone: "danger" }] },
    { type: "p", text: "**Fix:** always include the **identity scope** in the key: the user ID for per-user data, the tenant ID for per-tenant data. Never cache personalized data under a generic key. See [cache key design](/learn/cache-key-design)." },
    { type: "h3", text: "Cached responses that contain credentials" },
    { type: "p", text: "If an API response containing an access token or a session cookie gets cached, the next user who hits that entry receives **someone else's credentials**. CDNs are especially exposed: a `Cache-Control: public` header on an authenticated endpoint can leak tokens to everyone who comes after." },
    { type: "p", text: "**Fix:** never cache responses that contain tokens, cookies or credentials. Send `Cache-Control: private, no-store` on authenticated endpoints, make sure the CDN doesn't cache responses that set cookies, and review cache headers as part of every deployment checklist." },
    { type: "code", code: `# Authenticated API responses: never stored by shared caches or browsers
Cache-Control: private, no-store

# Public, versioned static assets: cache aggressively
Cache-Control: public, max-age=31536000, immutable` },
    { type: "h3", text: "Personal data (PII) in the cache" },
    { type: "p", text: "Cached profiles with emails, phone numbers or payment details sit in memory. If the cache node's memory is reachable (debug tools, memory dumps, side-channel attacks), that data is exposed, and cached copies **bypass the database's encryption and access controls**." },
    { type: "ul", items: [
      "Cache only the fields needed for display (name, avatar), not sensitive ones (SSNs or other national ID numbers, payment details).",
      "If sensitive fields must be cached, **encrypt the values** before storing them.",
      "Give PII-containing entries **short TTLs** to shrink the exposure window.",
      "Include caches in **data-retention and GDPR deletion** procedures: deleting a user must also delete their cached entries.",
      "Lock the cache down like a database: no public network exposure, authentication and TLS enabled, and least-privilege access. See [encryption](/learn/encryption).",
    ] },

    { type: "h2", text: "Observability: four key metrics" },
    { type: "table", head: ["Metric", "What it tells you", "Typical signal"], rows: [
      ["**Hit rate** = hits ÷ (hits + misses)", "Whether the cache is doing its job; the single most important metric", "Many read-heavy systems aim for 90%+. A drop means the working set no longer fits, TTLs are too short, or a failure mode (penetration, avalanche) is happening"],
      ["**Latency** (p50, p95, p99)", "How long cache operations take", "Redis reads are often sub-millisecond to a few milliseconds on a fast network. A p99 spike points to network congestion, oversized values or a node near CPU saturation"],
      ["**Eviction rate**", "Entries removed per second because of memory pressure", "Some evictions at max memory are normal; sustained high rates suggest undersizing; a sudden spike means the working set just grew (a launch, a traffic increase)"],
      ["**Memory usage** vs `maxmemory`", "How close the cache is to full", "At `maxmemory`, Redis evicts if a policy is set, otherwise rejects writes with OOM errors. Track the trend to forecast when to add capacity"],
    ] },
    { type: "p", text: "Example **starting** alert thresholds (tune to your baseline and SLOs):" },
    { type: "ul", items: [
      "Hit rate below **85%** for 5 minutes.",
      "p99 latency above **5 ms**.",
      "Eviction rate **10×** above baseline.",
      "Memory above **90%** of the configured maximum.",
    ] },
    { type: "p", text: "A worked reading of an example dashboard against those thresholds:" },
    { type: "table", head: ["Metric", "Current", "Threshold", "Status"], rows: [
      ["Hit rate", "94%", "alert below 85%", "OK"],
      ["p99 latency", "1.8 ms", "alert above 5 ms", "OK"],
      ["Memory used", "71% of maxmemory", "alert above 90%", "OK"],
      ["Eviction rate", "12× baseline", "alert above 10×", "**Alert**: the working set has outgrown the cache; hit rate will fall next"],
    ] },
    { type: "p", text: "Also track **database QPS from cache misses** (the real cost of a falling hit rate), **connection counts** to the cache, and **key count by namespace**, which catches unbounded key spaces early. Redis exposes most of these through `INFO stats` and `INFO memory`; export them to your monitoring system. See [observability](/learn/observability) and [eviction health](/learn/cache-eviction)." },
  ],
  uses: [
    { name: "Authenticated APIs", text: "`Cache-Control: private, no-store` on every response that depends on the caller; shared caches only for public data." },
    { name: "Multi-tenant SaaS", text: "Tenant IDs in every cache key prevent one customer's data from being served to another." },
    { name: "Compliance (GDPR, HIPAA, PCI)", text: "Caches are in scope for retention, deletion and encryption requirements just like databases." },
    { name: "SRE dashboards", text: "Hit rate, p99 latency, evictions and memory per cache cluster, with alerts before users notice." },
  ],
  interview: [
    "Say what you will not cache: credentials, tokens and sensitive PII, and why.",
    "Scope every per-user or per-tenant key by its identity.",
    "List the four cache metrics (hit rate, latency, evictions, memory) and what a change in each means.",
    "Mention alerting on hit-rate drops, since they translate directly into database load.",
  ],
  related: ["caching", "cache-key-design", "cache-eviction", "encryption", "observability", "authorization-rbac-abac-oauth"],
  practice: ["distributed-cache", "payment-platform", "secrets-platform"],
};
