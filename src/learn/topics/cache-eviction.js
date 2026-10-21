export default {
  blocks: [
    { type: "p", text: "A TTL removes entries that have outlived their freshness. But what happens when the cache is **full** and nothing has expired yet? New data needs space, and the **eviction policy** decides which existing entry to sacrifice. A good policy keeps the entries most likely to be read again, which directly determines the hit rate; a bad one evicts entries that will be needed soon, turning cache writes into wasted work." },

    { type: "h2", text: "Why eviction matters" },
    { type: "p", text: "Memory is finite and expensive. A Redis instance with 16 GB of RAM holds roughly 100–200 million small key-value pairs, depending on value size. Once it's at capacity, every new entry must evict an old one, and whether the evicted entry was useful (causing a future miss) or dead weight (never read again) depends entirely on the policy." },

    { type: "h2", text: "LRU: least recently used" },
    { type: "p", text: "LRU evicts the entry that hasn't been accessed for the longest time. Its bet: what was used recently will be used again soon, and what has sat untouched is probably cold." },
    { type: "diagram", kind: "segments", caption: "LRU order, most recently used on the left. A hit on user:3 moves it to the front; when the cache is full, the entry at the right (least recently used) is evicted.", lanes: [
      { label: "Before", parts: [{ label: "user:7", size: 1, tone: "ok" }, { label: "user:42", size: 1, tone: "store" }, { label: "user:3", size: 1, tone: "store" }, { label: "user:9", sub: "evict next", size: 1, tone: "danger" }] },
      { label: "After GET user:3", parts: [{ label: "user:3", size: 1, tone: "ok" }, { label: "user:7", size: 1, tone: "store" }, { label: "user:42", size: 1, tone: "store" }, { label: "user:9", sub: "evict next", size: 1, tone: "danger" }] },
      { label: "After SET user:5", parts: [{ label: "user:5", sub: "new", size: 1, tone: "ok" }, { label: "user:3", size: 1, tone: "store" }, { label: "user:7", size: 1, tone: "store" }, { label: "user:42", size: 1, tone: "store" }] },
    ] },
    { type: "p", text: "LRU suits workloads with **temporal locality**, where recent activity predicts near-future activity: web sessions, user profiles, page content. Someone browsing a category will probably revisit the same products within minutes." },
    { type: "p", text: "**Weakness: scan pollution.** A one-time scan over many keys pushes out the hot entries. A batch job that reads 50,000 user records once fills the cache with entries nobody will read again, the hit rate drops, and it only recovers as normal traffic re-caches the hot set." },
    { type: "h3", text: "How an LRU cache works" },
    { type: "p", text: "A classic LRU cache combines a **hash map** (key → node) with a **doubly linked list** ordered by recency. Every access moves the node to the front; eviction removes from the back. Both operations are O(1)." },
    { type: "diagram", kind: "flow", caption: "LRU internals: the hash map finds nodes in O(1); the list keeps them in recency order. A hit moves the node to the head; a full cache evicts the tail.", nodes: [
      { id: "map", label: "Hash map", sub: "key → node", col: 0, row: 1, tone: "accent" },
      { id: "head", label: "HEAD", sub: "most recent", col: 0.9, row: 0, shape: "pill", tone: "ok", w: 110 },
      { id: "a", label: "user:7", col: 1.75, row: 0, tone: "cache", w: 110 },
      { id: "b", label: "user:42", col: 2.6, row: 0, tone: "cache", w: 110 },
      { id: "c", label: "user:3", col: 3.45, row: 0, tone: "cache", w: 110 },
      { id: "tail", label: "TAIL", sub: "evict next", col: 4.3, row: 0, shape: "pill", tone: "danger", w: 110 },
    ], edges: [
      { from: "head", to: "a", both: true }, { from: "a", to: "b", both: true }, { from: "b", to: "c", both: true }, { from: "c", to: "tail", both: true },
      { from: "map", to: "a", dashed: true }, { from: "map", to: "b", dashed: true }, { from: "map", to: "c", dashed: true },
    ] },
    { type: "code", code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity, self.items = capacity, OrderedDict()

    def get(self, key):
        if key not in self.items:
            return None
        self.items.move_to_end(key)          # mark as most recently used
        return self.items[key]

    def put(self, key, value):
        self.items[key] = value
        self.items.move_to_end(key)
        if len(self.items) > self.capacity:
            self.items.popitem(last=False)   # evict the least recently used` },
    { type: "p", text: "**Redis approximates LRU** (`allkeys-lru` or `volatile-lru`). Keeping every key in a perfectly ordered list would cost too much memory, so Redis samples a few keys and evicts the least recently used among them, trading a little accuracy for very low overhead. Note that Redis **defaults to `noeviction`**: you must set `maxmemory` and an eviction policy, or writes start failing when memory is full." },

    { type: "h2", text: "LFU: least frequently used" },
    { type: "p", text: "LFU evicts the entry with the **fewest accesses**. It counts reads per entry and removes the lowest count. Its bet: entries read many times are important; rarely read ones are disposable." },
    { type: "p", text: "LFU **resists scan pollution**: a batch job that reads 50,000 keys once gives each a count of 1, while the hot entries with counts of 500+ stay safe." },
    { type: "p", text: "**Weakness: cold start.** A newly cached entry starts with a count of 1. If the cache is full of high-count entries, the newcomer is evicted at once, even if it's about to become the most popular key. Some implementations add **frequency decay**: counts shrink over time, so entries that were popular long ago but are cold now gradually lose their protection." },
    { type: "p", text: "Redis implements LFU with a **logarithmic counter** and a decay factor (`lfu-log-factor` and `lfu-decay-time`). Because the counter is logarithmic it saturates quickly (the difference between 100 and 1,000 accesses is small), so old entries can't become permanently immune." },

    { type: "h2", text: "Other policies" },
    { type: "table", head: ["Policy", "Evicts", "Strength", "Weakness"], rows: [
      ["**LRU**", "The entry not accessed for the longest time", "Simple; adapts to changing popularity", "Scans can flush the hot set"],
      ["**LFU**", "The entry with the fewest accesses", "Keeps long-term favorites; scan-resistant", "Cold start; needs decay to adapt"],
      ["FIFO", "The oldest inserted entry", "Trivial to implement", "Ignores popularity entirely"],
      ["Random", "A random entry", "No bookkeeping", "Lower hit rate than LRU, but surprisingly decent"],
      ["**TTL-based** (`volatile-ttl`)", "Entries closest to expiry", "Bounds staleness", "Not a capacity policy on its own"],
      ["W-TinyLFU / ARC", "Combine recency and frequency adaptively", "Best hit rates in practice", "More complex"],
    ] },
    { type: "p", text: "Production caches approximate these for efficiency. **Memcached** uses a segmented LRU per slab class. **Caffeine** (Java) uses **W-TinyLFU**: a small admission window plus a frequency sketch decides whether a new item is worth admitting at all, which protects against one-off scans (see [count-min sketch](/learn/probabilistic-data-structures))." },

    { type: "h2", text: "Choosing a policy" },
    { type: "table", head: ["Workload", "Best policy", "Why"], rows: [
      ["User sessions, page views", "LRU", "Recent access predicts near-future access"],
      ["Product catalog, trending items", "LFU", "Popular items should survive regardless of recency"],
      ["Mixed with batch jobs", "LFU", "Resists scan pollution"],
      ["Streaming data, event logs", "Short TTL", "Read-once data gains little from caching; use a short TTL if caching for brief replays"],
      ["Unknown or uniform access", "LRU", "Simpler; a good default"],
    ] },
    { type: "p", text: "For most web applications **LRU is the safer default**. Switch to LFU when you see scan pollution (the hit rate drops during batch operations) or when a small set of keys gets most of the traffic." },

    { type: "h2", text: "Memory math: sizing the cache" },
    { type: "p", text: "Too small and the cache evicts constantly with a low hit rate; too large and you pay for unused RAM. Start from the **working set**: the number of distinct keys accessed within one TTL window." },
    { type: "ol", items: [
      "**Estimate the hot keys.** If the app serves 10,000 unique product pages an hour and the TTL is 15 minutes, the working set is about 2,500 keys (a quarter-hour of unique accesses).",
      "**Estimate the entry size.** Key + value + Redis per-key overhead (~70–100 bytes). A product page entry: key `product:v1:detail:12345` ≈ 30 bytes, value (serialized JSON) ≈ 2 KB, overhead ≈ 80 bytes, total ≈ **2.1 KB**.",
      "**Multiply and add headroom.** 2,500 × 2.1 KB ≈ 5.3 MB; add 20–30% for fragmentation and spikes ≈ **7 MB**.",
    ] },
    { type: "p", text: "The same arithmetic scales: 1 million unique keys at 2 KB each is about 2 GB, so allocate roughly 2.5–3 GB." },
    { type: "diagram", kind: "segments", caption: "One cached product entry: the value dominates, but per-key overhead adds up across millions of keys.", lanes: [
      { label: "~2.1 KB entry", parts: [{ label: "key", sub: "30 B", size: 30, tone: "store" }, { label: "value (JSON)", sub: "2,048 B", size: 2048, tone: "ok" }, { label: "overhead", sub: "80 B", size: 80, tone: "cache" }] },
    ] },
    { type: "p", text: "**The 80/20 heuristic.** Many read-heavy workloads are skewed (Zipf-like): roughly 20% of keys get 80% of the traffic. Confirm the skew from your access logs before relying on it, but if it holds, caching only the hot 20% captures most of the benefit: with 10 million keys in total, caching the hottest 2 million may give a 90%+ hit rate. The cache can be far smaller than the dataset." },
    { type: "p", text: "In practice, measure the **hit-rate-versus-memory curve**: the hit rate climbs steeply, then flattens, and the knee of the curve is the efficient size. See [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation)." },

    { type: "h2", text: "Monitoring eviction health" },
    { type: "ul", items: [
      "**Hit rate**: the share of reads served from the cache. Below about 90% on a well-tuned cache suggests the working set doesn't fit; consistently above 99% may mean you're paying for memory you don't need.",
      "**Eviction rate**: evictions per second. A steady rate at max memory is normal for a full cache. A **spike** usually lines up with batch jobs or traffic bursts that are pushing out hot entries.",
    ] },
    { type: "p", text: "High evictions with a falling hit rate: add memory or switch policy (often LRU → LFU). Rare evictions with a hit rate always above 99%: the cache is probably over-provisioned. See [cache monitoring](/learn/cache-security-and-monitoring)." },
    { type: "callout", tone: "warning", text: "Choose what happens when the cache is full. Redis's `noeviction` makes writes fail; for a cache you almost always want an eviction policy, while for a Redis used as a primary store you want alerts long before memory runs out." },

    { type: "h2", text: "TTL and eviction together" },
    { type: "p", text: "Use TTLs to bound **staleness** and eviction to bound **memory**. Add jitter to TTLs (for example 10 minutes ± 10%) so keys written together don't all expire together. See [cache invalidation](/learn/cache-invalidation). When one machine can't hold the working set at all, shard the cache across nodes: see [distributed caching](/learn/distributed-caching)." },
  ],
  uses: [
    { name: "Redis", text: "Configurable maxmemory policies (approximated LRU and LFU, TTL-based, random) implemented with sampling for efficiency." },
    { name: "Caffeine and Ristretto", text: "In-process caches using TinyLFU-style admission to reach near-optimal hit rates." },
    { name: "CDNs", text: "Evict rarely requested objects from edge storage while popular content stays resident." },
    { name: "Operating system page cache", text: "Uses LRU-like algorithms (with active and inactive lists) to decide which file pages stay in memory." },
  ],
  interview: [
    "Name the eviction policy when you size a cache (LRU by default, LFU for skewed or scan-heavy workloads) and why.",
    "Size from the working set with explicit memory math, plus 20–30% headroom.",
    "Be ready to implement an LRU cache with a hash map and doubly linked list in O(1).",
    "Monitor hit rate and eviction rate, and configure maxmemory so Redis doesn't refuse writes.",
  ],
  related: ["caching", "cache-invalidation", "distributed-caching", "cache-strategies", "probabilistic-data-structures", "back-of-the-envelope-estimation", "redis"],
  practice: ["distributed-cache", "autocomplete", "url-shortener"],
};
