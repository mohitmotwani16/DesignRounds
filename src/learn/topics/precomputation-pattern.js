// The pre-computing pattern: compute on write instead of on read, the many forms it takes
// (materialized views, denormalization, indexes, fan-out, write-through), trade-offs, hybrids.
export default {
  blocks: [
    { type: "p", text: "A product manager clicks \"View dashboard\" and watches a spinner while the database aggregates millions of rows, joins user data and computes percentiles, and 200 colleagues are waiting on the same computation. The insight behind **pre-computing**: for predictable, repeated queries, **compute the result when the data changes, not when someone asks**." },

    { type: "h2", text: "The problem: repeated expensive queries" },
    { type: "code", code: `SELECT DATE(created_at), COUNT(DISTINCT user_id)
FROM events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY 1;` },
    { type: "p", text: "Over 50 million events this scans gigabytes, and 200 product managers run it all day. If the data changes once a minute but is queried 100 times a minute, you do roughly **100× more computation than necessary**." },

    { type: "h2", text: "Trade write cost for read speed" },
    { type: "diagram", kind: "flow", caption: "Compute-on-read pays the full cost on every request; compute-on-write pays once (often incrementally) when data changes, and every read is a lookup.", zones: [{ label: "Compute on read", from: [0, 0], to: [2, 0], tone: "danger" }, { label: "Compute on write", from: [0, 1.5], to: [3, 1.5], tone: "ok" }], nodes: [
      { id: "u1", label: "10 users", col: 0, row: 0, shape: "pill" },
      { id: "q1", label: "Heavy query × 10", sub: "scan, join, aggregate each time", col: 1, row: 0, tone: "danger", w: 220 },
      { id: "db1", label: "Raw data", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "w", label: "Data changes", col: 0, row: 1.5, shape: "pill" },
      { id: "c", label: "Compute once", sub: "incremental update", col: 1, row: 1.5, tone: "accent" },
      { id: "s", label: "Pre-computed result", col: 2, row: 1.5, shape: "db", tone: "ok" },
      { id: "u2", label: "10 users: 10 lookups", col: 3, row: 1.5, shape: "pill", w: 170 },
    ], edges: [{ from: "u1", to: "q1" }, { from: "q1", to: "db1" }, { from: "w", to: "c" }, { from: "c", to: "s" }, { from: "u2", to: "s" }] },
    { type: "p", text: "With **compute-on-read**, every query pays the full cost and response time grows with data volume. With **compute-on-write**, the cost is paid when data is written (often incrementally), and reads become simple lookups. The pattern goes by many names:" },
    { type: "ul", items: [
      "**[Materialized views](/learn/materialized-views)** persist query results, often aggregations.",
      "**[Denormalization](/learn/normalization-denormalization)** pre-joins related tables.",
      "**[Search indexes](/learn/search-and-inverted-index)** pre-process text for fast retrieval.",
      "**[Fan-out on write](/learn/fan-out)** pre-distributes content to followers' feeds.",
      "**[Write-through caches](/learn/cache-strategies)** populate cache entries as data is written.",
    ] },

    { type: "h2", text: "Worked example: a social feed" },
    { type: "p", text: "Compute-on-read joins your follow list with all posts on every request:" },
    { type: "code", code: `SELECT posts.* FROM posts
JOIN follows ON posts.author_id = follows.following_id
WHERE follows.follower_id = ?
ORDER BY posts.created_at DESC
LIMIT 20;` },
    { type: "p", text: "Follow 500 accounts with 1,000 posts each and the database may consider up to 500,000 candidate posts, depending on indexes and the plan. Pre-computing reverses the work:" },
    { type: "ol", items: [
      "**Author publishes**: the post is saved to the posts table.",
      "**Fan-out**: a background worker reads the author's followers and inserts the post reference into each follower's feed (e.g. a Redis list or a feed table).",
      "**User opens the feed**: read the pre-built list; some filtering and hydration remain, but the expensive follows-to-posts join is gone and reads typically take low milliseconds.",
    ] },
    { type: "code", code: `import redis
r = redis.Redis()
FEED_LEN = 800

def on_post_created(post_id: int, author_id: int, followers: list[int]):   # write path (async worker)
    pipe = r.pipeline()
    for f in followers:
        pipe.lpush(f"feed:{f}", post_id)
        pipe.ltrim(f"feed:{f}", 0, FEED_LEN - 1)     # keep the newest 800 only
    pipe.execute()

def read_feed(user_id: int, page: int = 0, size: int = 20) -> list[int]:  # read path
    start = page * size
    return [int(x) for x in r.lrange(f"feed:{user_id}", start, start + size - 1)]` },

    { type: "h2", text: "The trade-offs" },
    { type: "ul", items: [
      "**More storage**: denormalized copies and materialized results take space; storing post references for millions of followers multiplies it.",
      "**More write-side work**: every write triggers computation, synchronously or in background workers. When an account with 10 million followers posts, fan-out takes a while, so async processing trades latency for eventual consistency.",
      "**Staleness**: results reflect the moment they were computed; decide how stale is acceptable.",
      "**Less flexibility**: it speeds up known queries only; a new aggregation or filter may not benefit.",
      "**More complexity**: source data and derived views must both be maintained; schema changes touch both, and debugging spans several data paths.",
    ] },

    { type: "h2", text: "When to pre-compute, and when not to" },
    { type: "table", head: ["Pre-compute when", "Compute on read when"], rows: [
      ["**Read-heavy**: reads far outnumber writes (a dashboard viewed 1,000 times a day, updated hourly)", "**Write-heavy**: you'd pay on every write but rarely serve reads"],
      ["**Predictable queries**: fixed dashboard metrics, known feeds", "**Unpredictable queries**: exploration, debugging, ad-hoc analysis"],
      ["**Staleness is acceptable**: \"updated every 5 minutes\" is fine", "**Strict consistency**: balances, inventory counts (or maintain views synchronously)"],
      ["**Expensive computation**: big aggregations, multi-table joins, scans of millions of rows", "**Cheap queries** that already run fast, or a **tight storage budget**"],
    ] },

    { type: "h2", text: "Implementation strategies" },
    { type: "table", head: ["Strategy", "Fits"], rows: [
      ["Materialized views (database or streaming)", "Dashboards and reports; refreshed automatically, manually or on a schedule"],
      ["Application-level cache (Redis, Memcached with TTLs)", "Computed API responses; see [cache-aside](/learn/cache-strategies)"],
      ["Denormalization", "Data that's always joined; accept keeping copies in sync"],
      ["Fan-out on write", "Content distribution: push at creation instead of pulling at read; see [push vs pull](/learn/dataflow-patterns)"],
      ["Search indexes", "Text queries; Elasticsearch pre-processes documents for full-text search"],
      ["CQRS read models", "Separate read-optimized models fed from writes; see [CQRS](/learn/event-sourcing-cqrs)"],
    ] },

    { type: "h2", text: "Hybrid approaches" },
    { type: "p", text: "Production systems mix strategies. Twitter historically fanned out on write for most users but computed on read for accounts with millions of followers, because fan-out for them would be prohibitive. The same idea generalizes: pre-compute common cases and compute edge cases on demand; pre-compute hot data and let cold data compute on read; pre-compute where staleness is fine and compute fresh on critical paths. Match the strategy to the access pattern rather than applying one everywhere." },
  ],
  uses: [
    { name: "News feeds", text: "Fan-out on write into per-user timelines, with on-read merging for celebrity accounts." },
    { name: "Dashboards", text: "Rollups and materialized views refreshed every few minutes instead of live scans." },
    { name: "E-commerce listings", text: "Denormalized product documents with price, stock and rating ready to render." },
    { name: "Leaderboards", text: "Redis sorted sets updated on each score change, read in O(log n)." },
  ],
  interview: [
    "When a read is expensive and repeated, move the work to write time and say how stale the result may be.",
    "Name the concrete form: materialized view, denormalized table, cache, index or fan-out.",
    "Quantify the write amplification (e.g. followers per post) and add a hybrid path for outliers.",
  ],
  related: ["materialized-views", "fan-out", "normalization-denormalization", "cache-strategies", "event-sourcing-cqrs", "two-stage-processing"],
  practice: ["news-feed", "realtime-analytics", "autocomplete"],
};
