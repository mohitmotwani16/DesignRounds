export default {
  blocks: [
    { type: "p", text: "**Typeahead (search autocomplete)** suggests completions as a user types, such as \"system des\" → \"system design interview\". It must respond within roughly 100 ms on every keystroke for millions of users, so the design precomputes as much as possible: a **prefix index** (often a **trie**) maps each prefix to its **top-k** most popular completions, built offline from search logs, served from memory, and cached at the edge for common prefixes." },

    { type: "h2", text: "Requirements that shape the design" },
    { type: "ul", items: [
      "**Latency:** suggestions in under ~100 ms end to end, or they feel laggy; each keystroke is a request.",
      "**Read-heavy:** far more suggestion reads than updates; popularity can be recomputed periodically.",
      "**Relevance:** rank by popularity, freshness (trending queries) and sometimes personalisation or location.",
      "**Safety:** filter offensive or harmful suggestions.",
    ] },

    { type: "h2", text: "The trie with precomputed top-k" },
    { type: "p", text: "A **trie** stores strings character by character, so all queries sharing a prefix share a path. Walking to the node for \"sys\" finds every query starting with \"sys\". Searching the whole subtree on each keystroke would be too slow, so each node **stores its top-k completions** (say, 10) directly, computed when the trie is built. A lookup is then just a walk of a few characters plus reading a short list." },
    { type: "diagram", kind: "flow", caption: "Each trie node caches the top completions for its prefix, so serving a keystroke is a short walk and a list read.", nodes: [
      { id: "root", label: "root", col: 0, row: 1, tone: "muted" },
      { id: "s", label: "s", col: 1, row: 1 },
      { id: "sy", label: "sy", col: 2, row: 1 },
      { id: "sys", label: "sys", sub: "top-k: system design, sys admin…", col: 3.2, row: 1, tone: "accent", w: 230 },
      { id: "syst", label: "syst", sub: "top-k: system design interview…", col: 4.6, row: 0.2, w: 230 },
      { id: "sysa", label: "sysa", sub: "top-k: sysadmin jobs…", col: 4.6, row: 1.8, w: 200 },
    ], edges: [
      { from: "root", to: "s" }, { from: "s", to: "sy" }, { from: "sy", to: "sys" }, { from: "sys", to: "syst" }, { from: "sys", to: "sysa" },
    ] },
    { type: "p", text: "Because the trie is read-only between builds, it can be serialised into a compact format and loaded into memory on every serving node. Alternatives with the same idea are a key-value store keyed by prefix (`prefix → top-k list`) or a search engine with edge n-gram indexes. See [search and the inverted index](/learn/search-and-inverted-index)." },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "Logs feed an offline aggregation that rebuilds the prefix index; serving nodes hold it in memory behind a CDN and browser cache.", nodes: [
      { id: "client", label: "Search box", sub: "debounced", col: 0, row: 0.6, shape: "pill" },
      { id: "cdn", label: "CDN / edge cache", sub: "popular prefixes", col: 1.3, row: 0.6, tone: "cache" },
      { id: "svc", label: "Suggest service", sub: "in-memory trie", col: 2.6, row: 0.6, tone: "accent" },
      { id: "logs", label: "Query logs", col: 0, row: 2, shape: "queue", tone: "queue" },
      { id: "agg", label: "Aggregation job", sub: "counts · decay · filters", col: 1.3, row: 2 },
      { id: "build", label: "Index builder", sub: "trie + top-k", col: 2.6, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "client", to: "cdn" }, { from: "cdn", to: "svc" }, { from: "logs", to: "agg" }, { from: "agg", to: "build" }, { from: "build", to: "svc", dashed: true, label: "deploy snapshot" },
    ] },
    { type: "ul", items: [
      "**Collect** completed searches into a log (not every keystroke, which is noisy).",
      "**Aggregate** counts per query over a window, with time decay so recent popularity counts more, and apply blocklists.",
      "**Build** the trie or prefix table with top-k per node, then publish the snapshot to serving nodes, swapping atomically.",
      "**Trending queries:** a streaming job tracks sudden spikes and merges them into a small fresh index alongside the main one.",
    ] },

    { type: "h2", text: "Making it fast" },
    { type: "ul", items: [
      "**Client:** debounce (send after ~100-200 ms pause), cancel in-flight requests for older prefixes, cache results per prefix in the browser, and prefetch likely next prefixes.",
      "**Edge:** short-TTL CDN caching of responses for common prefixes, since a few thousand prefixes cover most traffic. See [CDN](/learn/cdn).",
      "**Server:** in-memory index, no database on the hot path; shard by prefix range if the index is too big for one node, and replicate for throughput.",
      "**Personalisation** as a light re-ranking step on top of the global top-k, mixing in the user's recent searches.",
    ] },
    { type: "callout", tone: "tip", text: "State the numbers: if users type 6 characters per search and debouncing halves requests, 10,000 searches per second become about 30,000 suggestion requests per second, mostly absorbed by edge and browser caches." },
  ],
  uses: [
    { name: "Web search", text: "Global top-k completions from billions of queries, refreshed daily plus a streaming trending layer." },
    { name: "E-commerce", text: "Product and category suggestions ranked by popularity and conversion, filtered by stock." },
    { name: "Apps and IDEs", text: "Local tries for contact names or code symbols give instant offline suggestions." },
  ],
  interview: [
    "Precompute top-k completions per prefix offline; don't search on each keystroke.",
    "Explain the trie and how it's built, published and swapped.",
    "Use debouncing, request cancellation and edge caching.",
    "Handle trending queries and offensive suggestions explicitly.",
  ],
  related: ["search-and-inverted-index", "caching", "cdn", "batch-vs-stream-processing", "probabilistic-data-structures"],
  practice: ["autocomplete"],
  reading: [
    { title: "Trie data structure", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Trie" },
    { title: "Elasticsearch: Search-as-you-type field type", publisher: "Elastic documentation", url: "https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/search-as-you-type" },
  ],
};
