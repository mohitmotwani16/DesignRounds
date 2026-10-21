export default {
  blocks: [
    { type: "p", text: "A **database index** is an extra data structure that lets the database find rows matching a condition without scanning the whole table, much like the index at the back of a book. Indexes turn a query from \"read 50 million rows\" into \"read a handful of pages\". This page goes one level deeper than most guides: how a **storage engine** lays data out on disk, and why that makes **hash indexes**, **B-trees** and **LSM trees** good at different things." },
    { type: "callout", text: "You don't need storage-engine internals to pass most design interviews, but knowing them explains why PostgreSQL shines at reads while Cassandra swallows huge write volumes, makes database documentation far easier to follow, and helps when tuning performance." },

    { type: "h2", text: "Storage engines" },
    { type: "p", text: "Every database has a **storage engine** that decides how data is written to and read from disk. MySQL even lets you choose (InnoDB, MyISAM, Memory), each with different trade-offs. InnoDB uses **B-trees** for fast range queries; RocksDB uses **LSM trees** for high write throughput. Behind every such choice is one hardware fact: **sequential writes are much faster than random writes**, often 10–100× on traditional drives. Modern SSDs narrow the gap a lot but still benefit from sequential access, and this one constraint shapes database design throughout." },

    { type: "h2", text: "Sequential vs random I/O" },
    { type: "p", text: "A hard drive has a physical head that must **seek** to the right track and wait for the platter to rotate. Sequential writes keep the head moving in one direction; random writes pay a seek for each one. SSDs have no moving parts, but still prefer sequential access because of how their controllers batch erase and write operations and spread wear across cells." },
    { type: "table", head: ["", "Hard disk (HDD, 7,200 RPM)", "Solid-state drive (SSD)"], rows: [
      ["Sequential throughput", "150+ MB/s", "500+ MB/s"],
      ["Random throughput", "~1–2 MB/s reads, ~5–10 MB/s writes", "~100–300 MB/s"],
      ["Access time", "Seek 8–15 ms + rotation 4–8 ms", "~0.1 ms"],
      ["Why sequential wins", "No head movement between writes", "Writes are batched into whole blocks"],
    ] },
    { type: "diagram", kind: "bars", caption: "Sequential vs random write throughput: on a hard disk and in Kafka vs a database, appending to a log is about an order of magnitude faster than updating scattered pages.", values: [
      { label: "HDD sequential writes", value: 150, display: "150+ MB/s", tone: "ok" },
      { label: "HDD random writes", value: 8, display: "5–10 MB/s", tone: "danger" },
      { label: "Kafka log (sequential)", value: 600, display: "~600 MB/s", tone: "ok" },
      { label: "Random DB page updates", value: 60, display: "~60 MB/s", tone: "danger" },
    ] },
    { type: "p", text: "Kafka shows the payoff: appending sequentially to its logs reaches about **600 MB/s** on commodity hardware, while random database updates might manage **60 MB/s**, a 10× gap. Operating systems help sequential access too (large buffers, read-ahead), so storage engines are designed to **work with** these patterns: append-only logs (Kafka), LSM trees (Cassandra, RocksDB), and B-trees that update pages in place (traditional relational databases)." },

    { type: "h2", text: "Building a database from scratch" },
    { type: "p", text: "At heart a database just stores and retrieves data. Building the simplest possible key-value store shows the problems that real data structures solve: append every operation to a log file (fast sequential writes) and keep an in-memory index from key to file offset." },
    { type: "code", code: `import json, os

class SimpleDatabase:
    """Append-only log + in-memory hash index (key -> byte offset)."""

    def __init__(self, path="simple_db/operations.log"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.path, self.index = path, {}
        self._rebuild_index()

    def _rebuild_index(self):                       # replay the log on startup
        if not os.path.exists(self.path):
            return
        with open(self.path, "rb") as f:
            offset = 0
            for line in f:
                op = json.loads(line)
                if op["type"] == "set":
                    self.index[op["key"]] = offset
                else:                                # "delete"
                    self.index.pop(op["key"], None)
                offset += len(line)

    def _append(self, op):
        with open(self.path, "ab") as f:
            offset = f.tell()
            f.write((json.dumps(op) + "\\n").encode())
        return offset

    def set(self, key, value):
        self.index[key] = self._append({"type": "set", "key": key, "value": value})

    def delete(self, key):
        self._append({"type": "delete", "key": key})
        self.index.pop(key, None)

    def get(self, key):
        offset = self.index.get(key)
        if offset is None:
            return None
        with open(self.path, "rb") as f:             # one seek, one read
            f.seek(offset)
            return json.loads(f.readline())["value"]

db = SimpleDatabase()
db.set("user:1", {"name": "Alice"}); db.set("user:1", {"name": "Alice B."})
print(db.get("user:1"))                              # {'name': 'Alice B.'}` },
    { type: "p", text: "It works, and it exposes the core problems: writes are fast sequential appends, but **the log grows forever** (old versions are never removed); the index lives in memory, so **it must be rebuilt on every restart** and **all keys must fit in RAM**; and there's no way to ask for a range of keys. Real databases solve these with log compaction, persistent indexes and [write-ahead logs](/learn/write-ahead-log), and the different ways they do it are why storage engines differ." },

    { type: "h2", text: "Hash indexes" },
    { type: "p", text: "A **hash index** is exactly that design, made production-grade: an in-memory hash table maps each key to the file offset of its latest value. Writes append records to data files and update the hash table; reads hash the key, find the offset and read the record directly: **O(1)** on average." },
    { type: "diagram", kind: "flow", caption: "Hash index: an in-memory table maps keys to byte offsets in an append-only data file; one lookup and one disk read per get.", nodes: [
      { id: "h", label: "In-memory hash table", sub: "user:123 → 0 · order:456 → 64 · product:789 → 128", col: 0, row: 0, tone: "store", w: 300 },
      { id: "f", label: "Append-only data file", sub: "0: user:123 {…} · 64: order:456 {…} · 128: product:789 {…}", col: 2.4, row: 0, tone: "cache", w: 320 },
    ], edges: [{ from: "h", to: "f", label: "direct offset lookup" }] },
    { type: "p", text: "**Bitcask**, the storage engine behind Riak, works this way: extremely fast writes and reads for workloads with many random key lookups. The limits: **the whole key space must fit in memory**, there are **no range queries** (\"users with IDs 1000–2000\" means scanning everything), and periodic **compaction** is needed to reclaim space from overwritten and deleted records." },

    { type: "h2", text: "B-trees: the default index" },
    { type: "p", text: "**B-trees** keep data **sorted** across fixed-size disk pages, so they handle both fast point lookups and efficient range scans. Most relational databases use them as their primary structure, and they stay balanced automatically as data grows, giving **O(log n)** reads, writes and range queries." },
    { type: "h3", text: "Why not a binary search tree?" },
    { type: "p", text: "Binary search trees work in memory but fail on disk: every node visited is a separate disk read. Searching a million records could take thousands of reads at roughly 5–10 ms each on a spinning disk (SSDs are much faster), so a microsecond operation becomes seconds. **B-trees pack hundreds of keys into each node** (typically 50–500), sized to match a disk page (4–16 KB), so one disk read fetches a whole node and every I/O does as much work as possible. MySQL's InnoDB uses **B+ trees** (a B-tree variant) as its primary storage, and PostgreSQL relies on B-tree indexes; without them, relational databases would be unusably slow on traditional storage." },
    { type: "p", text: "B-trees keep three properties: **balanced** (every leaf at the same depth), **sorted** (keys within a node are ordered) and **wide** (many keys per node). Together they give consistent performance whatever order data is inserted in." },
    { type: "h3", text: "Node structure" },
    { type: "ul", items: [
      "In a B-tree of **order m**, every node holds between ⌈m/2⌉−1 and m−1 keys (the root may hold as few as one). Nodes therefore stay between half full and full, which prevents degenerate, lopsided trees.",
      "The **root** holds up to m−1 keys and m child pointers; **internal nodes** hold sorted keys plus pointers to children, so each node can be binary-searched; **leaf nodes** hold the actual records (or pointers to them), and all leaves are at the same depth.",
      "Database B-trees use orders of 50–500, matching page sizes of 4–16 KB, so each disk read brings back dozens to hundreds of keys.",
    ] },
    { type: "h3", text: "Searching" },
    { type: "p", text: "A lookup walks from root to leaf, binary-searching inside each node to choose which child to follow. With a million records and order 100, that's **3–4 disk reads** at most." },
    { type: "diagram", kind: "tree", caption: "Finding key 65: at the root, 65 is between 50 and 75; in the internal node, it's above 60 and below 70; the leaf contains it. Three disk reads.", root: { label: "25 | 50 | 75", tone: "accent", children: [
      { label: "10 | 20", children: [{ label: "5 | 8", tone: "store" }, { label: "12 | 15", tone: "store" }, { label: "22 | 24", tone: "store" }] },
      { label: "30 | 40", children: [{ label: "26 | 28", tone: "store" }, { label: "32 | 35", tone: "store" }, { label: "42 | 45", tone: "store" }] },
      { label: "60 | 70", tone: "accent", path: true, children: [{ label: "55 | 58", tone: "store" }, { label: "62 | 65", tone: "ok", path: true, sub: "found 65" }, { label: "72 | 74", tone: "store" }] },
      { label: "80 | 90", children: [{ label: "76 | 78", tone: "store" }, { label: "82 | 85", tone: "store" }, { label: "92 | 95", tone: "store" }] },
    ] } },
    { type: "p", text: "**Range queries** are where B-trees shine. After finding the start key, the database scans leaf nodes in order (they're sorted, and in B+ trees linked to their neighbors), so `SELECT * FROM users WHERE age BETWEEN 25 AND 35` needs no further tree walks." },
    { type: "code", code: `class BTreeNode:
    def __init__(self, keys, children=None):
        self.keys, self.children = keys, children or []
        self.is_leaf = not self.children

def btree_search(node, target, path=None):
    path = (path or []) + [node.keys]
    i = 0
    while i < len(node.keys) and target > node.keys[i]:   # binary search in real engines
        i += 1
    if i < len(node.keys) and node.keys[i] == target:
        return True, path
    if node.is_leaf:
        return False, path
    return btree_search(node.children[i], target, path)

root = BTreeNode([25, 50, 75], [
    BTreeNode([10, 20], [BTreeNode([5, 8]), BTreeNode([12, 15]), BTreeNode([22, 24])]),
    BTreeNode([30, 40], [BTreeNode([26, 28]), BTreeNode([32, 35]), BTreeNode([42, 45])]),
    BTreeNode([60, 70], [BTreeNode([55, 58]), BTreeNode([62, 65]), BTreeNode([72, 74])]),
    BTreeNode([80, 90], [BTreeNode([76, 78]), BTreeNode([82, 85]), BTreeNode([92, 95])]),
])
print(btree_search(root, 65))   # (True, [[25, 50, 75], [60, 70], [62, 65]])` },
    { type: "h3", text: "Inserting and splitting nodes" },
    { type: "p", text: "Inserts always land in a **leaf**, which keeps the order sorted and the depth equal. If the leaf has room, the key just goes in its sorted position. If the leaf is already full (m−1 keys), it **splits**:" },
    { type: "ol", items: [
      "Insert the key in sorted position (the node now temporarily holds m keys).",
      "Split it into two nodes of about half the keys each.",
      "Push the middle key up into the parent (in a B+ tree, a copy of the first key of the right half).",
      "If the parent is now full too, split it the same way, recursively.",
      "If the split reaches the root, a new root is created and the tree grows one level taller.",
    ] },
    { type: "diagram", kind: "tree", caption: "Before: inserting 37 into a B+ tree of order 4 (at most 3 keys per node), where the target leaf 30 | 35 | 40 is already full.", root: { label: "25 | 50", tone: "accent", children: [
      { label: "15 | 20", tone: "store" }, { label: "30 | 35 | 40", tone: "danger", sub: "full: + 37?" }, { label: "55 | 60", tone: "store" },
    ] } },
    { type: "diagram", kind: "tree", caption: "After: the leaf splits into 30 | 35 and 37 | 40, and 37 is copied up into the root, which now has three keys. The tree is still balanced.", root: { label: "25 | 37 | 50", tone: "ok", children: [
      { label: "15 | 20", tone: "store" }, { label: "30 | 35", tone: "store" }, { label: "37 | 40", tone: "ok", sub: "new node" }, { label: "55 | 60", tone: "store" },
    ] } },
    { type: "p", text: "Splits are rare (only when a node is full), most inserts cost O(log n) reads and one write, and a split costs up to O(log n) writes as it cascades upward, keeping every node 50–100% full. Production databases often aim for pages about two-thirds full rather than completely full, which reduces split frequency during bulk inserts." },
    { type: "p", text: "The cost of B-trees is **write amplification**: updates change pages **in place**, and one insert can rewrite several pages to keep the tree balanced, which is random I/O. That's what makes B-trees less suited to write-heavy workloads, especially on spinning disks." },
    { type: "callout", text: "**B-trees in one line:** O(log n) point lookups, efficient range scans (find the start, then read leaves in order), a self-balancing structure and cache-friendly access with few disk seeks, paid for with write amplification on updates." },
    { type: "h3", text: "B-trees in production" },
    { type: "ul", items: [
      "**MySQL InnoDB** uses B+ trees (data only in the leaves) for both primary and secondary indexes. The **clustered index** stores table rows in primary-key order; **secondary indexes** store the primary key, not a row location, so a secondary lookup finds the primary key and then walks the clustered index.",
      "**PostgreSQL** uses B-trees for most indexes, with 8 KB pages holding roughly 100–200 entries, plus optimizations such as right-link pointers between sibling pages for better concurrent access.",
      "**File systems** too: ext4 tracks file blocks with extent trees (a B-tree variant), and NTFS organizes directories and allocation with B+ trees.",
    ] },
    { type: "diagram", kind: "flow", caption: "A B+ tree index: one root page, one internal page and one leaf page to find user_id 42. Leaves are linked, so range scans walk sideways.", nodes: [
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
    { type: "p", text: "Because keys are sorted, a B-tree serves **equality** (`=`), **ranges** (`BETWEEN`, `<`, `>`), **prefix matches** (`LIKE 'abc%'`) and **ORDER BY** on the indexed columns." },

    { type: "h2", text: "LSM trees: built for writes" },
    { type: "p", text: "**Log-structured merge trees** take the opposite trade: they never update in place. New writes go to an in-memory sorted table (the **memtable**); when it fills, it's flushed to disk as an immutable sorted file (an **SSTable**); background processes merge small files into larger sorted ones at higher **levels**. Writes stay fast and sequential, at the cost of reads that may check several files." },
    { type: "p", text: "Apache Cassandra uses LSM trees to absorb massive write volumes: writes go to a commit log and the memtable for immediate durability and fast acknowledgement, and background compaction merges SSTables to keep reads fast and reclaim space. Because a key might be in several runs, reads suffer **read amplification**; [Bloom filters](/learn/probabilistic-data-structures) skip files that definitely don't contain the key. The full mechanics are in [LSM trees and SSTables](/learn/lsm-trees-sstables)." },
    { type: "table", head: ["", "B-tree", "LSM tree"], rows: [
      ["Writes", "Update pages in place (random I/O)", "Sequential appends: much higher write throughput"],
      ["Reads", "One tree walk", "May check several files; Bloom filters skip most"],
      ["Space", "Some fragmentation", "Old versions until compaction"],
      ["Background work", "Little", "Compaction uses CPU and I/O, can cause latency spikes"],
      ["Typical home", "OLTP relational databases", "Write-heavy NoSQL, time-series, embedded key-value"],
    ] },

    { type: "h2", text: "Choosing the right structure" },
    { type: "table", head: ["Structure", "Writes", "Reads", "Range queries", "Use cases"], rows: [
      ["Hash index", "Excellent", "Excellent", "Not supported", "Cache stores, session data"],
      ["B-tree", "Good", "Excellent", "Excellent", "OLTP systems, traditional databases"],
      ["LSM tree", "Excellent", "Good", "Good", "Write-heavy analytics, time-series data"],
    ] },
    { type: "p", text: "Modern databases often mix them: MongoDB uses B-trees for most indexes but supports hashed indexes for some cases, and RocksDB (an LSM implementation) powers everything from MySQL storage engines (MyRocks) to blockchain databases." },

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
    { type: "callout", tone: "tip", text: "Use `EXPLAIN` (or `EXPLAIN ANALYZE`) to see whether a query uses an index. Index for the queries you actually run, and drop indexes nothing uses. See [database optimization](/learn/database-optimization)." },
  ],
  uses: [
    { name: "PostgreSQL and MySQL", text: "B+ tree indexes back primary keys and most secondary indexes; GIN, GiST and BRIN cover full-text, geospatial and huge append-only tables." },
    { name: "Cassandra, RocksDB, ScyllaDB", text: "LSM trees sustain very high write rates for messaging, feeds and time-series workloads." },
    { name: "Riak (Bitcask) and caches", text: "Hash indexes give O(1) lookups when every key fits in memory and range queries aren't needed." },
    { name: "Any slow API endpoint", text: "The most common fix for a slow query in production is the right composite index." },
  ],
  interview: [
    "When you define a table, name the indexes that serve its main queries, including column order for composites.",
    "Mention the write cost of indexes on write-heavy tables.",
    "Know hash vs B-tree vs LSM at a high level and match them to point lookups, read-heavy and write-heavy workloads.",
    "Explain why B-trees are wide and shallow (few disk reads) and why LSM trees favor sequential writes.",
  ],
  related: ["lsm-trees-sstables", "sql-vs-nosql", "write-ahead-log", "search-and-inverted-index", "database-optimization", "probabilistic-data-structures"],
  practice: ["url-shortener", "autocomplete", "ride-hailing", "ticket-booking"],
};
