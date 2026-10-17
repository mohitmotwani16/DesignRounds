export default {
  blocks: [
    { type: "p", text: "A **database index** is an extra data structure that lets the database find rows matching a condition without scanning the whole table, much like the index at the back of a book. Indexes turn a query from \"read 50 million rows\" into \"read a handful of pages\". They aren't free: every index uses storage and slows down writes." },

    { type: "h2", text: "Without and with an index" },
    { type: "p", text: "`SELECT * FROM orders WHERE user_id = 42` on a 50-million-row table without an index is a **full table scan**: every page is read, so the cost grows with the table. With an index on `user_id`, the database walks a tree to the matching entries in a few steps, then fetches only those rows. The cost grows with the **logarithm** of the table size, which barely changes from a thousand rows to a billion." },

    { type: "h2", text: "B-trees: the default index" },
    { type: "p", text: "Most relational databases (PostgreSQL, MySQL InnoDB, SQL Server, Oracle) use **B+ trees**. Keys are kept sorted in fixed-size pages (often 8–16 KB) organised as a wide, shallow tree. Each page holds hundreds of keys, so even a billion keys need only 3–4 levels." },
    { type: "diagram", kind: "flow", caption: "Finding user_id 42 in a B+ tree: one root page, one internal page, one leaf page. Leaves are linked, so range scans walk sideways.", nodes: [
      { id: "root", label: "Root", sub: "< 1000 | ≥ 1000", col: 1.5, row: 0, tone: "accent" },
      { id: "i1", label: "Internal", sub: "< 40 | 40–99 | …", col: 0.75, row: 1 },
      { id: "i2", label: "Internal", sub: "1000–1999 | …", col: 2.25, row: 1 },
      { id: "l1", label: "Leaf", sub: "40, 41, 42 → rows", col: 0, row: 2, tone: "ok" },
      { id: "l2", label: "Leaf", sub: "43 … 99 → rows", col: 1.5, row: 2 },
      { id: "l3", label: "Leaf", sub: "1000 … → rows", col: 3, row: 2 },
    ], edges: [
      { from: "root", to: "i1", tone: "accent" }, { from: "root", to: "i2" }, { from: "i1", to: "l1", tone: "accent" }, { from: "i1", to: "l2" }, { from: "i2", to: "l3" },
      { from: "l1", to: "l2", dashed: true, label: "next" }, { from: "l2", to: "l3", dashed: true, label: "next" },
    ] },
    { type: "p", text: "Because keys are sorted, a B-tree serves **equality** (`=`), **ranges** (`BETWEEN`, `<`, `>`), **prefix matches** (`LIKE 'abc%'`) and **ORDER BY** on the indexed columns. Writes update pages in place, which can mean random I/O." },

    { type: "h2", text: "LSM trees: built for writes" },
    { type: "p", text: "**Log-structured merge trees** (used by Cassandra, RocksDB, LevelDB, ScyllaDB, HBase) never update in place. Writes go to an in-memory sorted table (memtable) and a write-ahead log; when the memtable fills, it's flushed to disk as an immutable sorted file (**SSTable**). Background **compaction** merges files and drops overwritten or deleted values." },
    { type: "table", head: ["", "B-tree", "LSM tree"], rows: [
      ["Writes", "Update pages in place (random I/O)", "Sequential appends: much higher write throughput"],
      ["Reads", "One tree walk", "May check several files; Bloom filters skip most. See [Bloom filters](/learn/probabilistic-data-structures)"],
      ["Space", "Some fragmentation", "Old versions until compaction"],
      ["Background work", "Little", "Compaction uses CPU and I/O, can cause latency spikes"],
      ["Typical home", "OLTP relational databases", "Write-heavy NoSQL, time-series, embedded key-value"],
    ] },

    { type: "h2", text: "Other index types" },
    { type: "table", head: ["Index", "Good for", "Example"], rows: [
      ["Hash", "Exact-match lookups only", "Hash indexes, in-memory key-value stores"],
      ["Composite (multi-column)", "Queries filtering on several columns", "`(user_id, created_at)` for \"a user's recent orders\""],
      ["Covering", "Answering a query from the index alone, no table lookup", "Include `status, total` in the index"],
      ["Partial", "Indexing only rows matching a condition", "`WHERE status = 'pending'`: small and fast"],
      ["Inverted / full-text", "Searching words in text", "GIN in PostgreSQL, Elasticsearch. See [full-text search](/learn/search-and-inverted-index)"],
      ["Geospatial (R-tree, GiST)", "Nearby and within-area queries", "PostGIS. See [geospatial indexing](/learn/geospatial-indexing)"],
      ["Bitmap", "Low-cardinality columns in analytics", "Data warehouses"],
    ] },

    { type: "h2", text: "Composite indexes: column order matters" },
    { type: "p", text: "A composite index on `(user_id, created_at)` is sorted by `user_id`, then by `created_at` within each user. It serves:" },
    { type: "ul", items: [
      "`WHERE user_id = 42` ✔",
      "`WHERE user_id = 42 AND created_at > '2026-01-01'` ✔",
      "`WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20` ✔: no sort needed.",
      "`WHERE created_at > '2026-01-01'` ✘: the leading column isn't constrained (the **leftmost prefix rule**).",
    ] },
    { type: "p", text: "A good rule: put **equality** columns first, then the **range or sort** column." },

    { type: "h2", text: "The costs" },
    { type: "ul", items: [
      "**Slower writes**: every insert, update and delete must update every index on the table. A table with 10 indexes does about 11 writes per insert.",
      "**Storage and memory**: indexes compete with data for the buffer cache.",
      "**Low selectivity** makes an index useless: an index on a boolean column matching 50% of rows is slower than a scan.",
      "**Functions hide indexes**: `WHERE LOWER(email) = ...` won't use an index on `email` unless you create an expression index.",
    ] },
    { type: "callout", tone: "tip", text: "Use `EXPLAIN` (or `EXPLAIN ANALYZE`) to see whether a query uses an index. Index for the queries you actually run, and drop indexes nothing uses." },
  ],
  uses: [
    { name: "PostgreSQL and MySQL", text: "B+ tree indexes back primary keys and most secondary indexes; GIN, GiST and BRIN cover full-text, geospatial and huge append-only tables." },
    { name: "Cassandra, RocksDB, ScyllaDB", text: "LSM trees sustain very high write rates for messaging, feeds and time-series workloads." },
    { name: "Elasticsearch", text: "Inverted indexes over every text field make full-text search fast." },
    { name: "Any slow API endpoint", text: "The most common fix for a slow query in production is the right composite index." },
  ],
  interview: [
    "When you define a table, name the indexes that serve its main queries, including column order for composites.",
    "Mention the write cost of indexes on write-heavy tables.",
    "Know B-tree vs LSM at a high level and match them to read-heavy vs write-heavy workloads.",
    "Use specialised indexes (full-text, geospatial) instead of LIKE '%term%' scans.",
  ],
  related: ["sql-vs-nosql", "search-and-inverted-index", "geospatial-indexing", "probabilistic-data-structures", "sharding"],
  practice: ["url-shortener", "autocomplete", "ride-hailing", "ticket-booking"],
};
