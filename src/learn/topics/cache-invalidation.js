export default {
  blocks: [
    { type: "p", text: "**Cache invalidation** is how stale entries get removed or refreshed after the source data changes. Caches can hold stale data (see [cache consistency](/learn/cache-consistency)); invalidation is the mechanism that limits it. Get it wrong and users see outdated data; make it too aggressive and the cache stops helping, because every request falls through to the database. It's famously one of the hard problems in computing, because caches and databases update separately, concurrently, over unreliable networks." },

    { type: "h2", text: "Time-to-live (TTL)" },
    { type: "p", text: "A **TTL** attaches a countdown to each entry. When it reaches zero the entry is removed automatically; the next read misses, fetches fresh data from the database, and stores it with a new TTL." },
    { type: "diagram", kind: "timeline", caption: "TTL lifecycle: an entry is cached at 0:00 with a 5-minute TTL; reads hit until it expires, the next read misses and re-caches it with a fresh TTL.", ticks: ["0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00"], spans: [
      { from: 0, to: 5, label: "fresh: reads are cache hits", tone: "ok" },
      { from: 5.15, to: 6, label: "re-cached", tone: "ok" },
    ], events: [{ at: 0, tone: "store", label: "SET (TTL 5 min)" }, { at: 1.5, tone: "ok" }, { at: 3.2, tone: "ok" }, { at: 5.15, tone: "danger", label: "miss → DB" }], marks: [{ at: 5, label: "expires", tone: "danger" }] },
    { type: "p", text: "TTL is the simplest form of invalidation: no coordination between services is needed, because each entry removes itself on schedule. The cost is staleness: data can be out of date for up to the whole TTL. Choose the TTL by how stale the data can be without hurting users:" },
    { type: "table", head: ["Data", "Typical TTL", "Why"], rows: [
      ["Session tokens", "30 minutes", "Match the session timeout policy"],
      ["Product catalog", "5–60 minutes", "Prices change rarely but must update the same day"],
      ["User profile", "5–15 minutes", "Changes are rare; brief staleness is fine"],
      ["Search results", "1–5 minutes", "Results change often; short freshness window"],
      ["Configuration", "Hours to days", "Rarely changes; a long life saves load"],
      ["Feature flags", "30–60 seconds", "Changes should reach every instance quickly"],
    ] },
    { type: "p", text: "Too short a TTL defeats caching (the database takes nearly the full load); too long means users see old data. Most teams start around **5–15 minutes** and tune from observed staleness complaints and hit rates." },

    { type: "h2", text: "Explicit invalidation" },
    { type: "p", text: "TTL is **passive**: it waits for time to pass. Explicit invalidation is **active**: when the data changes, the application deletes (or overwrites) the cache entry immediately. That's the \"delete the key\" step of [write-around](/learn/cache-strategies). If the delete is synchronous and race-free, staleness is limited to the brief gap between the database write and the cache delete." },
    { type: "p", text: "The challenge is making sure **every write path** invalidates. If user data is changed by an API endpoint, a background job and an admin panel, all three must delete the key; miss one and you have a silent staleness bug that is hard to track down." },
    { type: "h3", text: "Event-driven invalidation" },
    { type: "p", text: "Instead of every writer knowing about the cache, the database emits **change events** (via [change data capture](/learn/change-data-capture) or application events). A single subscriber listens and deletes the matching keys. Invalidation logic lives in one place, and no write path can forget it." },
    { type: "diagram", kind: "flow", caption: "Event-driven invalidation: every writer just writes the database; one subscriber turns change events into cache deletes.", nodes: [
      { id: "api", label: "API endpoint", col: 0, row: 0 },
      { id: "job", label: "Background job", col: 0, row: 1 },
      { id: "adm", label: "Admin panel", col: 0, row: 2 },
      { id: "db", label: "Database", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "ev", label: "Change events", sub: "CDC / binlog", col: 2.5, row: 1, shape: "queue", tone: "queue" },
      { id: "sub", label: "Invalidator", col: 3.6, row: 1, tone: "accent" },
      { id: "c", label: "Cache", col: 4.7, row: 1, tone: "cache" },
    ], edges: [{ from: "api", to: "db" }, { from: "job", to: "db" }, { from: "adm", to: "db" }, { from: "db", to: "ev" }, { from: "ev", to: "sub" }, { from: "sub", to: "c", label: "DEL key" }] },

    { type: "h2", text: "TTL as a safety net" },
    { type: "p", text: "Production systems use **both**. Explicit invalidation handles the normal case: data changes and the cache is cleared at once. The TTL is the safety net: if an invalidation fails (a lost message, a crashed subscriber, a mismatched key name), the stale entry still removes itself when its TTL runs out. The worst case becomes **bounded** staleness (at most one TTL) rather than **unbounded** staleness (stale until the next write, which may never come)." },
    { type: "callout", text: "Use more than one: delete on write (or events) for freshness, **plus a TTL** as a safety net, so any missed invalidation heals itself." },

    { type: "h2", text: "Stale-while-revalidate" },
    { type: "p", text: "A plain TTL is binary: fresh (return it) or expired (miss, wait for the database). The moment of expiry causes a **latency spike** for whichever user arrives first. **Stale-while-revalidate** softens the edge: when an entry is past its freshness window, the cache returns the stale value **immediately** and refreshes it in the background. That user gets a fast, slightly stale answer; once the refresh finishes, everyone gets fresh data." },
    { type: "diagram", kind: "sequence", caption: "Stale-while-revalidate: the first request after expiry gets the old value at cache speed while a background refresh fetches the new one.", actors: ["User", "Cache", "Refresher", "Database"], steps: [
      { from: 0, to: 1, label: "GET product:42 (past soft TTL)" },
      { from: 1, to: 0, label: "stale value, instantly", dashed: true },
      { from: 1, to: 2, label: "trigger async refresh" },
      { from: 2, to: 3, label: "SELECT fresh row" },
      { from: 2, to: 1, label: "SET product:42 (new TTL)" },
      { from: 0, to: 1, label: "next GET → fresh value" },
    ] },
    { type: "p", text: "This largely removes the expiry spike; the trade is that one request after expiry gets stale data, which is invisible for product pages, search results or recommendations. HTTP caches and CDNs support it with the `stale-while-revalidate` directive in `Cache-Control` (RFC 5861). Application caches need a little custom logic: keep a **soft TTL** (when to refresh) shorter than the **hard TTL** (when to delete), return the value if past the soft TTL, and start an async refresh." },
    { type: "code", code: `import time, threading

SOFT_TTL, HARD_TTL = 300, 3600                 # refresh after 5 min, keep for 1 h

def get(key, loader):
    entry = cache.get(key)                     # {"value": ..., "fetched_at": ...}
    if entry is None:                          # hard miss: load synchronously
        return _load(key, loader)
    if time.time() - entry["fetched_at"] > SOFT_TTL and cache.set_if_absent(f"{key}:refreshing", 1, ttl=30):
        threading.Thread(target=_load, args=(key, loader), daemon=True).start()   # one refresher only
    return entry["value"]                      # stale-but-fast

def _load(key, loader):
    value = loader()
    cache.set(key, {"value": value, "fetched_at": time.time()}, ttl=HARD_TTL)
    return value` },

    { type: "h2", text: "TTL jitter" },
    { type: "p", text: "When many entries get the same TTL (common when a batch of data is cached at once, or after a deploy warms the cache), they all expire at the same instant. The result is a **synchronized miss storm**: thousands of requests hit the database together and can overwhelm it." },
    { type: "p", text: "**Jitter** spreads expirations out randomly. Instead of a fixed 300-second TTL, give each entry a TTL between 270 and 330 seconds (300 ± 10%); expirations are now spread evenly over a minute instead of piling up on one second." },
    { type: "diagram", kind: "timeline", caption: "Without jitter (top) a batch cached together expires at one instant; with ±10% jitter (bottom) the same entries expire spread across a minute.", ticks: ["270 s", "285 s", "300 s", "315 s", "330 s"], spans: [
      { from: 1.9, to: 2.1, label: "", tone: "danger" },
      { from: 0, to: 4, label: "expirations spread out", tone: "ok", lane: 1 },
    ], events: [{ at: 0.2, tone: "ok" }, { at: 0.7, tone: "ok" }, { at: 1.3, tone: "ok" }, { at: 1.8, tone: "ok" }, { at: 2.4, tone: "ok" }, { at: 2.9, tone: "ok" }, { at: 3.4, tone: "ok" }, { at: 3.8, tone: "ok" }], marks: [{ at: 2, label: "fixed TTL: all expire here", tone: "danger" }] },
    { type: "code", code: `import random

def ttl_with_jitter(base_seconds=300, spread=0.10):
    return int(base_seconds * random.uniform(1 - spread, 1 + spread))   # 270–330 s

cache.set(key, value, ttl=ttl_with_jitter())` },
    { type: "p", text: "Jitter is the same defense used against the [cache avalanche](/learn/cache-failure-modes), where a whole cache's worth of entries expires together." },

    { type: "h2", text: "Invalidation strategies compared" },
    { type: "table", head: ["Strategy", "How it works", "Trade-off"], rows: [
      ["TTL expiry", "Entries expire after a fixed time", "Simple and self-healing; stale for up to the TTL"],
      ["Delete on write", "After updating the database, delete the key", "Fresh quickly; can be missed or raced (see [consistency](/learn/cache-consistency))"],
      ["Update on write", "After updating the database, write the new value to the cache", "No miss after writes; out-of-order updates can leave wrong values"],
      ["Event-driven (CDC)", "A subscriber deletes keys from the database's change stream", "Can't be forgotten by any writer; small delay, more infrastructure"],
      ["Versioned keys", "Bump a version in the key; old entries are never read", "No deletes needed; old entries use memory until evicted. See [key design](/learn/cache-key-design)"],
      ["Stale-while-revalidate", "Serve stale past a soft TTL while refreshing in the background", "No expiry spikes; one slightly stale response"],
    ] },

    { type: "h2", text: "Invalidating many caches" },
    { type: "p", text: "With in-process caches on hundreds of servers, a single delete isn't enough. Broadcast invalidations over [pub/sub](/learn/pub-sub) (Redis pub/sub, Kafka) or keep in-process TTLs very short. For CDNs, prefer versioned URLs and use purge APIs (by URL or tag) only when you must. See [CDN](/learn/cdn)." },
  ],
  uses: [
    { name: "Facebook memcache", text: "Invalidates from the database's commit log and uses leases so a slow reader can't refill a just-deleted key with stale data." },
    { name: "CDNs (Fastly, Cloudflare)", text: "Support `stale-while-revalidate`, tag-based purges and instant invalidation APIs." },
    { name: "Feature-flag systems", text: "Short TTLs (30–60 s) plus push notifications so flag changes reach every instance quickly." },
    { name: "E-commerce catalogs", text: "Product entries cached 5–60 minutes with jittered TTLs, explicitly deleted when a merchant edits a product." },
  ],
  interview: [
    "Give every cached type a TTL chosen from its staleness tolerance, with jitter.",
    "Add explicit or event-driven invalidation for data that must update quickly, with the TTL as a safety net.",
    "Mention stale-while-revalidate for hot keys where expiry spikes would hurt latency.",
    "For many app servers with local caches, broadcast invalidations or keep local TTLs short.",
  ],
  related: ["cache-consistency", "cache-strategies", "cache-eviction", "cache-failure-modes", "change-data-capture", "cdn"],
  practice: ["distributed-cache", "news-feed", "ticket-booking"],
};
