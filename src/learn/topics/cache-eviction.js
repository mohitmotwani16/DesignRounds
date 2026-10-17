export default {
  blocks: [
    { type: "p", text: "Caches have limited memory. When a cache is full and a new item arrives, an **eviction policy** decides what to remove. A good policy keeps the items most likely to be requested again, which directly determines the hit ratio. Separately, **expiration (TTL)** removes items that are too old to trust, regardless of memory pressure." },

    { type: "h2", text: "The main policies" },
    { type: "table", head: ["Policy", "Evicts", "Strength", "Weakness"], rows: [
      ["**LRU** (least recently used)", "The item not accessed for the longest time", "Simple, adapts to changing popularity", "One big scan of rarely used items can flush the hot set"],
      ["**LFU** (least frequently used)", "The item with the fewest accesses", "Keeps long-term favourites", "Slow to adapt; old popular items linger without decay"],
      ["FIFO", "The oldest inserted item", "Trivial to implement", "Ignores popularity entirely"],
      ["Random", "A random item", "No bookkeeping", "Lower hit ratio than LRU, but surprisingly decent"],
      ["**TTL-based**", "Items past their expiry time", "Bounds staleness", "Not a capacity policy on its own"],
      ["W-TinyLFU / ARC", "Combine recency and frequency adaptively", "Best hit ratios in practice", "More complex"],
    ] },

    { type: "h2", text: "How an LRU cache works" },
    { type: "p", text: "A classic LRU cache combines a **hash map** (key → node) with a **doubly linked list** ordered by recency. Every access moves the node to the front; eviction removes from the back. Both operations are O(1)." },
    { type: "diagram", kind: "flow", caption: "LRU: the hash map finds nodes in O(1); the list keeps them in recency order. A hit moves the node to the head; a full cache evicts the tail.", nodes: [
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
    { type: "code", code: `
from collections import OrderedDict

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
            self.items.popitem(last=False)   # evict the least recently used
` },

    { type: "h2", text: "Approximations in real systems" },
    { type: "p", text: "Maintaining an exact global list is expensive under heavy concurrency, so production caches approximate:" },
    { type: "ul", items: [
      "**Redis** samples a few keys (5 by default) and evicts the best candidate among them, which gets very close to true LRU or LFU at a fraction of the cost. Its policies include `allkeys-lru`, `allkeys-lfu`, `volatile-ttl` and `noeviction` (reject writes when full).",
      "**Memcached** uses a segmented LRU per slab class.",
      "**Caffeine** (Java) uses **W-TinyLFU**: a small admission window plus a frequency sketch decides whether a new item is worth admitting at all, which protects against one-off scans. See [count-min sketch](/learn/probabilistic-data-structures).",
    ] },

    { type: "h2", text: "Sizing the cache" },
    { type: "p", text: "Size for the **working set**, the data actively requested in a typical period, not the whole dataset. Estimate it from traffic (unique keys requested per hour or day × item size), then measure the hit ratio versus memory curve: hit ratio usually climbs steeply then flattens, and the knee of that curve is the efficient size. See [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation)." },
    { type: "callout", tone: "warning", text: "Choose what happens when the cache is full. Redis's `noeviction` makes writes fail; for a cache you almost always want an eviction policy, while for a Redis used as a primary store you want alerts long before memory runs out." },

    { type: "h2", text: "TTL and eviction together" },
    { type: "p", text: "Use TTLs to bound staleness and eviction to bound memory. Add **jitter** to TTLs (for example 10 minutes ± 10%) so keys written at the same time don't all expire together and cause a synchronized wave of misses. See [cache invalidation and stampedes](/learn/cache-invalidation)." },
  ],
  uses: [
    { name: "Redis", text: "Configurable maxmemory policies (LRU, LFU, TTL-based, random) implemented with sampling for efficiency." },
    { name: "Caffeine and Ristretto", text: "In-process caches using TinyLFU-style admission to reach near-optimal hit ratios." },
    { name: "CDNs", text: "Evict rarely requested objects from edge storage while popular content stays resident." },
    { name: "Operating system page cache", text: "Uses LRU-like algorithms (with active and inactive lists) to decide which file pages stay in memory." },
  ],
  interview: [
    "Mention the eviction policy when you size a cache, usually LRU or LFU, and why it suits the access pattern.",
    "Size the cache from the working set, not the full dataset.",
    "Be ready to implement an LRU cache with a hash map and doubly linked list in O(1).",
    "Add TTL jitter to avoid synchronized expiry.",
  ],
  related: ["caching", "cache-strategies", "cache-invalidation", "probabilistic-data-structures", "back-of-the-envelope-estimation"],
  practice: ["distributed-cache", "autocomplete", "url-shortener"],
};
