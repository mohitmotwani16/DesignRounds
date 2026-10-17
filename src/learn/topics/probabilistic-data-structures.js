export default {
  blocks: [
    { type: "p", text: "**Probabilistic data structures** answer questions about huge datasets using a tiny, fixed amount of memory, in exchange for a small, controllable error. \"Have we seen this URL before?\", \"How many unique visitors today?\", \"Which search terms are trending?\" can be answered over billions of items with kilobytes or megabytes instead of gigabytes." },

    { type: "h2", text: "Bloom filter: \"definitely not\" or \"probably yes\"" },
    { type: "p", text: "A **Bloom filter** tests set membership. It's a bit array of m bits and k hash functions. To add an item, set the k bits its hashes point to. To check an item, look at those k bits: if any is 0, the item was **definitely never added**; if all are 1, it was **probably** added (the bits might have been set by other items)." },
    { type: "diagram", kind: "flow", caption: "Adding \"cat\" sets bits 1, 4 and 7. Checking \"dog\" finds bit 2 is 0, so \"dog\" was definitely never added, with no disk lookup needed.", nodes: [
      { id: "cat", label: "add \"cat\"", col: 0, row: 0, shape: "pill" },
      { id: "dog", label: "check \"dog\"", col: 0, row: 1.4, shape: "pill" },
      { id: "b1", label: "bit 1 = 1", col: 1.4, row: 0, tone: "accent", w: 110 },
      { id: "b4", label: "bit 4 = 1", col: 2.2, row: 0, tone: "accent", w: 110 },
      { id: "b7", label: "bit 7 = 1", col: 3, row: 0, tone: "accent", w: 110 },
      { id: "b2", label: "bit 2 = 0", col: 1.4, row: 1.4, tone: "danger", w: 110 },
      { id: "ans", label: "definitely absent", col: 2.6, row: 1.4, tone: "ok", shape: "pill", w: 150 },
    ], edges: [
      { from: "cat", to: "b1" }, { from: "cat", to: "b4", bend: -30 }, { from: "cat", to: "b7", bend: -50 },
      { from: "dog", to: "b2" }, { from: "b2", to: "ans" },
    ] },
    { type: "ul", items: [
      "**No false negatives**, a tunable **false positive** rate. About **10 bits per item** gives ~1% false positives; 15 bits gives ~0.1%.",
      "1 billion items at 1% error needs about 1.2 GB, versus tens of GB to store the items themselves.",
      "Standard Bloom filters **can't delete** items (clearing a bit could remove others). **Counting Bloom filters** and **cuckoo filters** support deletion.",
    ] },
    { type: "p", text: "**Typical uses**: skip disk reads for keys that don't exist (LSM-tree databases check a Bloom filter per SSTable; see [indexing](/learn/database-indexing)), avoid re-crawling URLs, block known-malicious URLs, and avoid recommending items a user has already seen." },

    { type: "h2", text: "HyperLogLog: counting distinct items" },
    { type: "p", text: "Counting unique visitors exactly needs memory proportional to the number of uniques. **HyperLogLog** estimates the count using the observation that among random hashes, the longest run of leading zeros you've seen hints at how many distinct values you've hashed. It averages many such registers to reduce error." },
    { type: "ul", items: [
      "About **12 KB** estimates cardinalities in the billions with roughly **0.8% standard error**.",
      "HLLs **merge**: union daily sketches into weekly counts, or per-server sketches into a global count, without double-counting.",
      "Redis provides `PFADD` / `PFCOUNT` / `PFMERGE`; BigQuery, Presto and Druid expose approximate distinct counts built on HLL.",
    ] },

    { type: "h2", text: "Count-min sketch: frequencies" },
    { type: "p", text: "A **count-min sketch** estimates how often each item appears in a stream: a grid of counters with one hash function per row. Each arrival increments one counter per row; the estimate is the **minimum** across rows. It may **overestimate** (collisions add counts) but never underestimates." },
    { type: "ul", items: [
      "Fixed memory regardless of how many distinct items appear.",
      "**Heavy hitters / top-K**: combine with a small heap to track trending hashtags, hottest keys or most frequent search queries.",
      "Used for rate limiting at scale, network traffic analysis, and cache admission (TinyLFU uses a count-min-style sketch). See [cache eviction](/learn/cache-eviction).",
    ] },

    { type: "h2", text: "Choosing" },
    { type: "table", head: ["Question", "Structure", "Error type"], rows: [
      ["Is X in the set?", "Bloom / cuckoo filter", "False positives only"],
      ["How many distinct items?", "HyperLogLog", "± ~1% on the count"],
      ["How often does X appear? What are the top items?", "Count-min sketch (+ heap)", "Overestimates only"],
      ["What's the p99 of these values?", "t-digest / DDSketch", "Bounded relative error on quantiles"],
    ] },
    { type: "callout", text: "Use these where an approximate answer is fine and exact answers would be expensive: analytics, monitoring, pre-filters in front of exact checks. Never use them where a false positive would be harmful without an exact fallback." },
  ],
  uses: [
    { name: "Cassandra, HBase, RocksDB", text: "Keep a Bloom filter per SSTable so reads skip files that can't contain the key." },
    { name: "Google Chrome Safe Browsing (historically)", text: "Used a local Bloom-filter-like structure to check URLs against a list of malicious sites before asking the server." },
    { name: "Redis HyperLogLog", text: "Counts unique visitors, searches or IPs per day in 12 KB per counter." },
    { name: "Trending topics", text: "Streaming systems use count-min sketches and top-K heaps to find the hottest hashtags or queries in real time." },
  ],
  interview: [
    "Reach for a Bloom filter to avoid expensive lookups for things that don't exist (crawled URLs, usernames, cache misses).",
    "Use HyperLogLog for unique counts at scale, and mention mergeability across time windows.",
    "Use count-min sketch plus a heap for top-K and heavy hitters in streams.",
    "State the error type and that exact verification follows a positive answer where correctness matters.",
  ],
  related: ["database-indexing", "cache-eviction", "batch-vs-stream-processing", "rate-limiting", "back-of-the-envelope-estimation"],
  practice: ["web-crawler", "autocomplete", "clickstream", "realtime-analytics"],
};
