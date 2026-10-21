// Cache key design: namespaced, versioned, compact keys; patterns per data type; collisions and
// unbounded key spaces.
export default {
  blocks: [
    { type: "p", text: "Once you know [where to cache](/learn/caching), the next question is practical: when you store something in the cache, **what key do you use?** A badly designed key causes **collisions** (two pieces of data overwriting each other), **stale reads** after schema changes, and painful debugging in production. A good key is namespaced, versioned, short and predictable." },

    { type: "h2", text: "Key structure" },
    { type: "p", text: "A cache key is a string that uniquely identifies a cached value. The naive approach, using the database's primary key directly, breaks immediately: if the user service and the product service both cache item `42`, they collide and one overwrites the other." },
    { type: "p", text: "A **structured key** fixes this. The standard pattern is colon-separated segments:" },
    { type: "diagram", kind: "segments", caption: "Anatomy of a cache key: namespace, schema version, entity type and record ID, separated by colons.", lanes: [
      { label: "Key", parts: [
        { label: "user", sub: "namespace", size: 1, tone: "store" },
        { label: "v2", sub: "version", size: 0.7, tone: "cache" },
        { label: "profile", sub: "entity", size: 1.1, tone: "ok" },
        { label: "42", sub: "identifier", size: 0.8, tone: "queue" },
      ] },
    ] },
    { type: "ul", items: [
      "**Namespace** isolates services or domains: the user service uses `user:`, the product service `product:`. Even in one shared cache cluster, their keys never collide.",
      "**Version** enables clean schema migrations (next section).",
      "**Entity** says what kind of data the key holds. One service may cache several things per user, separately: `user:v1:profile:42`, `user:v1:session:42`, `user:v1:prefs:42`.",
      "**Identifier** points at the specific record, usually the primary key or another unique value such as an email or slug.",
    ] },

    { type: "h2", text: "Versioning keys" },
    { type: "p", text: "Schema changes break caches **silently**. Your cached user profile looks like `{name, email}`; the next deploy adds an `avatar` field. Old cache entries don't have it, so the app reads profiles missing the avatar and users see a broken UI until those entries expire." },
    { type: "p", text: "Put a version in the key and the problem disappears. When the schema changes, bump it: `user:v1:profile:42` becomes `user:v2:profile:42`. New code reads only v2 keys; old v1 entries are never read again and simply age out by TTL or eviction. No cache flush, no stale data." },
    { type: "diagram", kind: "flow", caption: "Key versioning: after a deploy adds a field, new code reads only v2 keys, and the old v1 entries expire on their own.", nodes: [
      { id: "v1", label: "user:v1:profile:42", sub: "{name, email}", col: 0, row: 0, tone: "danger" },
      { id: "dep", label: "Deploy", sub: "adds \"avatar\" field", col: 1.6, row: 0, tone: "cache" },
      { id: "v2", label: "user:v2:profile:42", sub: "{name, email, avatar}", col: 0, row: 1.3, tone: "ok" },
      { id: "old", label: "v1 keys", sub: "never read · expire naturally", col: 1.6, row: 1.3, tone: "muted" },
    ], edges: [{ from: "v1", to: "dep" }, { from: "dep", to: "v2", label: "new code reads v2" }, { from: "v1", to: "old", dashed: true }] },
    { type: "p", text: "The cost is a little extra memory during the transition, when v1 and v2 entries coexist. The overlap is brief: old entries are gone within minutes or hours, depending on their TTL. The same trick works for invalidating a whole group at once: store a version number per namespace (or per user) and include it in every key; bumping it makes every old key unreachable." },

    { type: "h2", text: "Key size" },
    { type: "p", text: "Keys take memory too: every key is stored next to its value. A 200-byte key across a million entries costs at least 200 MB in raw key bytes, plus per-entry metadata and allocator overhead, which is often much more. As a rule of thumb, keep keys to about **100 bytes or less**." },
    { type: "ul", items: [
      "**Short but readable.** `u:v2:prof:42` saves bytes but is hard to debug; `user:v2:profile:42` is clear and still compact.",
      "**Don't put large values in keys.** `search:v1:results:{\"query\":\"long user input...\",\"filters\":{\"category\":\"electronics\",\"price_min\":10}}` is fragile and wasteful. Hash the parameters instead: `search:v1:results:<sha256 prefix>`. Normalize first (sort filters, lowercase the query) so equivalent requests hash to the same key.",
      "**Consistent separators.** Colons are the convention in Redis and most caching libraries. Avoid spaces, newlines and characters that need escaping.",
    ] },
    { type: "code", code: `import hashlib, json

def search_key(query: str, filters: dict) -> str:
    normalized = json.dumps({"q": query.strip().lower(), "f": filters}, sort_keys=True)
    digest = hashlib.sha256(normalized.encode()).hexdigest()[:16]
    return f"search:v1:results:{digest}"

search_key("Running Shoes ", {"price_min": 10, "category": "sport"})
# 'search:v1:results:3b0f…'  (same key for "running shoes" with filters in any order)` },

    { type: "h2", text: "Common key patterns" },
    { type: "table", head: ["Use case", "Pattern", "Example"], rows: [
      ["Entity by ID", "service:version:entity:id", "`user:v2:profile:42`"],
      ["Computed result", "service:version:computation:input_hash", "`search:v1:results:a7f3b2`"],
      ["Per-user state", "service:version:user:uid:entity", "`cart:v1:user:42:items`"],
      ["Sorted collection", "service:version:entity:sort_key", "`feed:v1:timeline:42`"],
      ["Configuration", "config:version:key", "`config:v3:feature_flags`"],
    ] },
    { type: "p", text: "The pattern is always the same: namespace the service, version the schema, name the entity, then the specific record." },
    { type: "p", text: "In a [Redis Cluster](/learn/distributed-caching), you can also control **which node** a key lands on with a hash tag: only the part inside `{…}` is hashed, so `cart:{42}:items` and `profile:{42}` sit on the same node and can be used together in one multi-key command or transaction." },

    { type: "h2", text: "What goes wrong" },
    { type: "ul", items: [
      "**Key collisions**: two different pieces of data map to the same key, because keys are too generic (`cache:42`) or a hash produced a duplicate. Fix: always include the service and entity type; use a long enough hash.",
      "**Unbounded key spaces**: a search cache that stores results for every unique query grows forever, because users can type anything. Fix: an [eviction policy](/learn/cache-eviction) plus short TTLs (cache search results for minutes, not hours).",
      "**Personal data in keys**: keys show up in logs and monitoring tools, so don't put emails or tokens in them; use IDs or hashes. See [cache security](/learn/cache-security-and-monitoring).",
    ] },
    { type: "p", text: "Next: [read and write strategies](/learn/cache-strategies), covering how the application decides when to use the cache and how it fills the cache on a miss." },
  ],
  uses: [
    { name: "Redis key conventions", text: "Colon-separated namespaces (`user:42:profile`) are the de facto standard and make keys scannable and easy to group in tooling." },
    { name: "Schema migrations", text: "Bumping a version segment lets a new deploy ignore old cached shapes without flushing the whole cache." },
    { name: "Search and API response caches", text: "Normalized, hashed request parameters keep keys short and make equivalent requests share one entry." },
    { name: "Multi-tenant caches", text: "Tenant IDs in the namespace (`t:{tenant}:…`) prevent cross-tenant collisions and allow per-tenant invalidation." },
  ],
  interview: [
    "When you add a cache, name the key format: `service:version:entity:id`.",
    "Mention versioned keys for schema changes, and hashing for long or user-supplied inputs.",
    "Bound the key space for user-driven inputs with TTLs and eviction.",
    "Keep sensitive values out of keys.",
  ],
  related: ["caching", "cache-strategies", "cache-invalidation", "cache-eviction", "distributed-caching", "redis"],
  practice: ["distributed-cache", "autocomplete", "url-shortener"],
};
