// SSTables (immutable sorted files with sparse indexes) and LSM trees (memtable + WAL,
// leveled SSTables, tombstones, Bloom-filtered reads, compaction), with runnable demos.
export default {
  blocks: [
    { type: "p", text: "Write-heavy databases such as Cassandra, RocksDB, LevelDB, ScyllaDB and HBase are built on two ideas. An **SSTable** (Sorted String Table) is an immutable file of key-value pairs kept in sorted key order. A **log-structured merge tree (LSM tree)** is the storage engine that turns a stream of random writes into a handful of sorted SSTables on disk, merging them in the background. Together they trade a bit of read work for very high, steady write throughput." },
    { type: "callout", text: "This is an internals page. Start with [database indexing](/learn/database-indexing) for why sequential writes beat random ones and how B-trees compare." },

    { type: "h2", text: "SSTables" },
    { type: "h3", text: "The file-format problem" },
    { type: "p", text: "A storage engine needs a file format for sorted data on disk. A CSV-style file has to be scanned from the top, so lookups are O(n). A random-access format can find single keys quickly but makes range queries and compression awkward. SSTables combine **sorted order** with a small **binary-searchable index**, so they're good at both." },
    { type: "p", text: "The idea comes from Google's **Bigtable**: store data in **immutable, sorted files with sparse indexes**. Once written, an SSTable never changes; updates and deletes are handled by writing new SSTables. Immutability makes aggressive caching, compression and concurrent reads easy, with no locking. SSTables are a file format, not a database: Cassandra, RocksDB and LevelDB use them as building blocks inside a larger engine." },

    { type: "h3", text: "SSTable file format" },
    { type: "p", text: "An SSTable has three parts:" },
    { type: "ul", items: [
      "**Data section**: key-value pairs in lexicographic (sorted) key order, so they can be binary-searched.",
      "**Sparse index**: every Nth key with its byte offset in the file. Instead of indexing every key (which would take enormous memory), the engine indexes one key per **block**, with blocks commonly 4–64 KB depending on the engine. That's enough to jump close to any key.",
      "**Metadata**: min and max keys, record count, compression algorithm, Bloom filter data, checksums, creation timestamp and file size.",
    ] },
    { type: "diagram", kind: "flow", caption: "One SSTable file: a sorted data section, a sparse index of every Nth key pointing to byte offsets, and a metadata footer. Immutable, sorted, binary-searchable, compressed and self-describing.", zones: [{ label: "SSTable file (immutable)", from: [0, 0], to: [2.3, 1], tone: "accent" }], nodes: [
      { id: "data", label: "Data section (sorted key-value pairs)", sub: "alice → {age: 30} · bob → {age: 25} · charlie → {age: 35} · david → {age: 28} …", col: 0.5, row: 0, tone: "ok", w: 470 },
      { id: "idx", label: "Sparse index", sub: "alice → 0 · charlie → 256 · frank → 512 · john → 768", col: 2.3, row: 0, tone: "store", w: 300 },
      { id: "meta", label: "Metadata", sub: "min/max keys \"alice\"…\"zoe\" · 1,048,576 records · Snappy compression · Bloom filter · checksums · 64 MB", col: 1.3, row: 1, tone: "cache", w: 560 },
    ], edges: [{ from: "idx", to: "data", label: "byte offsets" }] },

    { type: "h3", text: "Reading from an SSTable" },
    { type: "p", text: "A point lookup is a two-step search: **binary-search the sparse index** to find the block that could hold the key, then **search inside that block**. That's O(log B) for B blocks plus O(log K) for K keys per block, O(log N) overall, while only the small sparse index has to live in RAM; data blocks are read on demand. Real engines check a [Bloom filter](/learn/probabilistic-data-structures) first, skipping any SSTable that definitely doesn't contain the key." },
    { type: "diagram", kind: "flow", caption: "SSTable read for GET(\"charlie\"): the sparse index points at the block starting at offset 256; a search inside that block finds charlie → data3.", nodes: [
      { id: "q", label: "Query", sub: "GET(\"charlie\")", col: 0, row: 0, shape: "pill" },
      { id: "idx", label: "1. Binary-search sparse index", sub: "alice → 0 · charlie → 256 · frank → 512", col: 1.6, row: 0, tone: "store", w: 270 },
      { id: "blk", label: "2. Search inside the block", sub: "bob → data2 · charlie → data3 · david → data4", col: 1.6, row: 1.2, tone: "ok", w: 300 },
      { id: "r", label: "Result", sub: "\"data3\"", col: 3.1, row: 1.2, shape: "pill", tone: "ok" },
    ], edges: [{ from: "q", to: "idx" }, { from: "idx", to: "blk", label: "block at offset 256" }, { from: "blk", to: "r", label: "found" }] },
    { type: "p", text: "**Range queries** are where the sorted layout pays off: find the start key with the sparse index, then read sequentially until you pass the end key. That makes SSTables a natural fit for analytics workloads that process ranges of data." },
    { type: "code", code: `import bisect

class SSTableReader:
    """Read-only SSTable: a sorted data section plus a sparse index of every Nth key."""

    def __init__(self, entries, block_size=3):
        self.data = sorted(entries)                                    # data section
        self.sparse_index = [(self.data[i][0], i)                      # (first key, position)
                             for i in range(0, len(self.data), block_size)]
        self.index_keys = [key for key, _ in self.sparse_index]

    def _block(self, key):
        b = max(0, bisect.bisect_right(self.index_keys, key) - 1)     # step 1: sparse index
        start = self.sparse_index[b][1]
        end = self.sparse_index[b + 1][1] if b + 1 < len(self.sparse_index) else len(self.data)
        return start, end

    def get(self, key):
        if not self.data:
            return None
        start, end = self._block(key)
        keys = [k for k, _ in self.data[start:end]]                    # step 2: inside the block
        i = bisect.bisect_left(keys, key)
        return self.data[start + i][1] if i < len(keys) and keys[i] == key else None

    def range(self, lo, hi):
        start, _ = self._block(lo)                                     # find the start once...
        for k, v in self.data[start:]:                                 # ...then scan sequentially
            if k > hi:
                break
            if k >= lo:
                yield k, v

table = SSTableReader([("alice", "data1"), ("bob", "data2"), ("charlie", "data3"),
                       ("david", "data4"), ("eve", "data5"), ("frank", "data6"), ("grace", "data7")])
print(table.sparse_index)               # [('alice', 0), ('david', 3), ('grace', 6)]
print(table.get("charlie"))             # data3
print(list(table.range("bob", "eve")))  # bob, charlie, david, eve` },

    { type: "h3", text: "Immutability and its limits" },
    { type: "p", text: "SSTables are **immutable by design**: there's no way to write to one after it's created. Adding or updating a key means writing a **new** SSTable with the newer value and relying on the read path to find the most recent version; the engine's compaction later merges files and atomically deletes obsolete ones. That limitation is exactly why LSM trees exist. The upside is that immutable files are ideal for distributed systems: they can be replicated, cached aggressively and read by many readers at once with no coordination, and copied or moved without affecting ongoing operations." },

    { type: "h2", text: "LSM trees" },
    { type: "p", text: "SSTables give sorted, immutable files but raise a new question: how do you handle a continuous stream of writes without creating thousands of tiny files? B-tree engines suffer **write amplification** because each small change reads a page, modifies it and writes it back to a random disk location. LSM trees remove that bottleneck by **batching writes in memory** and turning them into efficient sequential writes of SSTables." },
    { type: "h3", text: "Why batching works" },
    { type: "p", text: "Writing straight into existing sorted files would be catastrophic: **adding one key to an existing 1 GB SSTable means reading the whole file, merging in the new entry and writing more than 1 GB back to disk.** Patrick O'Neil's 1996 paper on the LSM tree introduced the fix: **buffer writes in memory, flush them as sorted runs, and merge those runs when the system has spare I/O capacity.** Disk work is deferred until it can be done efficiently, turning random writes into predictable sequential ones." },
    { type: "h3", text: "Core architecture" },
    { type: "p", text: "An LSM tree has three parts: a **memtable** (an in-memory sorted structure, often a skip list or balanced tree) for recent writes; **immutable SSTables** on disk, organized into levels; and a **write-ahead log (WAL)** that records every operation before it's acknowledged, so nothing in the memtable is lost in a crash." },
    { type: "diagram", kind: "flow", caption: "LSM tree structure: writes land in the memtable (backed by the WAL), flush to small level-0 SSTables, and compaction pushes data into larger files at deeper levels.", zones: [{ label: "Memory (fast, volatile)", from: [0, 0], to: [0, 0], tone: "accent" }], nodes: [
      { id: "mem", label: "Memtable (sorted)", sub: "key1, key2, key3 …", col: 0, row: 0, tone: "accent" },
      { id: "wal", label: "Write-ahead log", sub: "on disk, append-only", col: 0, row: 1, tone: "muted" },
      { id: "l0", label: "Level 0: newest SSTables", sub: "SST-1 · SST-2 · SST-3 · SST-4 (may overlap)", col: 2, row: 0, tone: "cache", w: 300 },
      { id: "l1", label: "Level 1: larger SSTables", sub: "SST-A · SST-B · SST-C (10 MB each)", col: 2, row: 1, tone: "ok", w: 300 },
      { id: "l2", label: "Level 2+: largest SSTables", sub: "SST-X · SST-Y (100 MB each)", col: 2, row: 2, tone: "danger", w: 300 },
    ], edges: [{ from: "mem", to: "l0", label: "flush" }, { from: "l0", to: "l1", label: "compact" }, { from: "l1", to: "l2", label: "compact" }, { from: "wal", to: "mem", dashed: true, label: "replay after crash" }] },

    { type: "h3", text: "Leveled organization" },
    { type: "p", text: "Frequent flushing without structure would create thousands of tiny files and ruin read performance. LSM trees use a pyramid: fresh data starts at **level 0** and older data migrates to deeper, larger levels through background compaction:" },
    { type: "ol", items: [
      "The memtable fills up and is flushed as a new level-0 file (the newest data).",
      "After several flushes, level 0 holds 4–8 separate files whose key ranges may overlap.",
      "Background compaction merges the level-0 files into level-1 files.",
      "When level 1 grows too large (typically 10× the size of level 0), it compacts into level-2 files.",
      "The pattern continues; each deeper level is about 10× larger, and level 0 always holds the newest data.",
    ] },
    { type: "p", text: "That bounds lookup cost. **Without levels, one lookup might check hundreds of files. With levels, level 0 holds a small, configurable number of overlapping files and each deeper level contributes at most one file per lookup**, because files within a level don't overlap. Query latency stays steady even as the database grows to terabytes. Bigtable popularized the pattern; today Cassandra, DynamoDB and RocksDB rely on LSM variants for sustained write throughput. The price is complexity: reads may check several places, and compaction consumes significant I/O bandwidth." },

    { type: "h3", text: "Write path" },
    { type: "p", text: "Writes favor fast acknowledgement over disk efficiency. Each write **appends to the WAL**, **updates the memtable** and returns success. When the memtable reaches its size threshold (typically **64–256 MB**), it becomes read-only, a fresh memtable takes new writes, and the full one is flushed to disk as a new level-0 SSTable. Because SSTables are immutable, flushing needs no coordination with concurrent readers." },
    { type: "diagram", kind: "sequence", caption: "LSM write flow: durability first (WAL), then a fast memory insert and an immediate ack; flushing and compaction happen later in the background without blocking writes.", actors: ["Client", "Write-ahead log", "Memtable", "Level 0 SSTables"], steps: [
      { from: 0, to: 1, label: "PUT(key, value): append \"SET key value\"" },
      { from: 1, to: 2, label: "insert key → value in memory" },
      { from: 2, to: 0, label: "success (no disk seek)", dashed: true },
      { note: "memtable reaches its limit (e.g. 64 MB)", over: [2, 3] },
      { from: 2, to: 3, label: "flush as a sorted SSTable" },
      { note: "a new empty memtable takes writes; WAL truncated", over: [1, 2] },
    ] },
    { type: "ul", items: [
      "Fast in-memory insert and a sequential WAL append per write.",
      "Immediate acknowledgement; flushes never block new writes.",
      "Background compaction later merges level-0 files (say, 4 of them) into a merged, sorted level-1 SSTable.",
    ] },
    { type: "h3", text: "The write-ahead log" },
    { type: "p", text: "The memtable lives in memory and vanishes in a crash, along with every write since the last flush. The WAL prevents that loss by recording each operation in an append-only disk file **before** the write is acknowledged. Entries look like this:" },
    { type: "code", code: `2024-01-15 14:30:25.123 PUT    user:123    "alice"
2024-01-15 14:30:25.456 DELETE user:456
2024-01-15 14:30:25.789 PUT    session:abc "active"` },
    { type: "p", text: "Recovery replays every WAL entry since the last successful flush to rebuild the memtable. Once a memtable's data is safely in an SSTable, its WAL entries are redundant and the log can be truncated. See [write-ahead logging](/learn/write-ahead-log)." },

    { type: "h3", text: "Updates and deletes: tombstones" },
    { type: "p", text: "LSM trees never modify existing data. An **update** writes a newer value for the same key. A **delete** writes a **tombstone**, a marker meaning \"this key is deleted\". Reads search from newest to oldest data, so recent entries automatically **shadow** older ones." },
    { type: "diagram", kind: "flow", caption: "Tombstones: PUT v1, PUT v2, DELETE land in three SSTables. A read checks the newest first, finds the tombstone and reports \"deleted\"; compaction later removes key1 entirely.", nodes: [
      { id: "s3", label: "SSTable-3 (newest)", sub: "key1 → TOMBSTONE (T3: DELETE)", col: 0, row: 0, tone: "danger", w: 230 },
      { id: "s2", label: "SSTable-2", sub: "key1 → \"v2\" (T2: update)", col: 1.4, row: 0, tone: "cache", w: 200 },
      { id: "s1", label: "SSTable-1 (oldest)", sub: "key1 → \"v1\" (T1: write)", col: 2.8, row: 0, tone: "muted", w: 200 },
      { id: "get", label: "GET(key1)", col: 0, row: 1.3, shape: "pill" },
      { id: "m", label: "Merged SSTable", sub: "after compaction: key1 gone", col: 2.8, row: 1.3, tone: "ok", w: 200 },
    ], edges: [{ from: "get", to: "s3", label: "newest first → deleted" }, { from: "s2", to: "m", dashed: true }, { from: "s1", to: "m", dashed: true, label: "compaction" }] },
    { type: "ul", items: [
      "No in-place edits: SSTables stay immutable, so readers always see consistent snapshots.",
      "Newer values shadow older ones; immutable files use **logical deletion**.",
      "The cost: obsolete values and tombstones keep using disk space until compaction removes them.",
    ] },

    { type: "h3", text: "Read path" },
    { type: "p", text: "A read may have to look in several places. It checks the **memtable** first (the newest writes), then the SSTables from **newest to oldest**, stopping at the first match. **Bloom filters** answer \"definitely not here\" for most SSTables without touching disk; sparse indexes and block caches speed up the files that do need checking." },
    { type: "diagram", kind: "flow", caption: "LSM read for GET(\"alice\"): miss in the memtable, Bloom filters rule out two level-0 SSTables, the third is searched and returns the value. If every filter said no, the read continues to level 1.", nodes: [
      { id: "q", label: "GET(\"alice\")", col: 0, row: 0, shape: "pill" },
      { id: "mem", label: "Memtable (newest)", sub: "\"alice\" not found", col: 1.5, row: 0, tone: "accent" },
      { id: "s3", label: "SSTable-003", sub: "Bloom filter: negative", col: 0.5, row: 1.3, tone: "muted" },
      { id: "s2", label: "SSTable-002", sub: "Bloom filter: positive", col: 1.5, row: 1.3, tone: "ok" },
      { id: "s1", label: "SSTable-001", sub: "Bloom filter: negative", col: 2.5, row: 1.3, tone: "muted" },
      { id: "l1", label: "Level 1 SSTables", sub: "only if not found above", col: 3.6, row: 1.3, tone: "store" },
      { id: "d", label: "Read SSTable-002 data", sub: "alice → {\"v\": 2}", col: 1.5, row: 2.5, tone: "ok" },
    ], edges: [
      { from: "q", to: "mem", label: "1" }, { from: "mem", to: "s3", dashed: true }, { from: "mem", to: "s2", label: "2" }, { from: "mem", to: "s1", dashed: true },
      { from: "s1", to: "l1", dashed: true }, { from: "s2", to: "d", label: "3. found" },
    ] },
    { type: "ul", items: [
      "**Best case**: the key is in the memtable, a pure memory lookup.",
      "**Worst case**: every level must be checked. This extra work is **read amplification**; compaction reduces it by keeping the number of files and levels small.",
      "**Range scans** stream across files in key order (a merge of the sorted inputs) and are cheapest once compaction has merged overlapping ranges.",
    ] },

    { type: "h3", text: "Compaction" },
    { type: "p", text: "Without maintenance, flushes would pile up hundreds of small SSTables. **Compaction** periodically merges overlapping files into larger ones: pick the overlapping files, stream them in sorted key order (a priority-queue merge), and write a new SSTable with only the **most recent version** of each key. Sequence numbers decide which version is newest; tombstones override older live values (and a tombstone itself can be dropped once it reaches the bottom level, where no older copy of the key can remain). The new file gets fresh metadata, Bloom filters and checksums, and only after it is safely on disk does the engine update its **manifest** to swap out the input files." },
    { type: "diagram", kind: "flow", caption: "Compaction: three overlapping SSTables are merged in key order; the newest version of each key wins, bob's tombstone removes it, and the inputs are deleted after the manifest switches.", nodes: [
      { id: "a", label: "SSTable-A (oldest)", sub: "alice=v1, bob=v2", col: 0, row: 0, tone: "cache" },
      { id: "b", label: "SSTable-B", sub: "alice=v3, charlie=v1", col: 1.3, row: 0, tone: "cache" },
      { id: "c", label: "SSTable-C (newest)", sub: "bob=TOMBSTONE, dave=v1", col: 2.6, row: 0, tone: "cache" },
      { id: "pq", label: "Priority-queue merge (key order)", sub: "alice: v1 vs v3 → v3 · bob: v2 vs TOMB → drop · charlie → v1", col: 1.3, row: 1.2, tone: "accent", w: 470 },
      { id: "out", label: "Compacted SSTable", sub: "alice=v3, charlie=v1, dave=v1", col: 0.6, row: 2.4, tone: "ok" },
      { id: "clean", label: "Cleanup", sub: "manifest updated, inputs deleted", col: 2.2, row: 2.4, tone: "muted" },
    ], edges: [{ from: "a", to: "pq" }, { from: "b", to: "pq" }, { from: "c", to: "pq" }, { from: "pq", to: "out", label: "write" }, { from: "out", to: "clean", dashed: true }] },
    { type: "table", head: ["Stage", "Guarantees"], rows: [
      ["During compaction", "Input SSTables stay untouched; readers keep using a consistent catalog; the new file is built completely before it's used"],
      ["Merge rules", "Newest value wins for the same key; tombstones remove older versions; output stays sorted"],
      ["After completion", "Manifest updated atomically; input files marked for deletion; readers switch to the new file"],
      ["Benefits", "Fewer files to check on reads; space reclaimed from deletes and overwrites; better sequential locality"],
    ] },
    { type: "p", text: "**Write amplification** is the fundamental trade-off: each byte is rewritten several times as it moves down the levels. Depending on workload and configuration, RocksDB can see write amplification of **10× or more**. The cost is amortized over many operations and runs in background threads, so it doesn't block user requests." },
    { type: "table", head: ["Compaction strategy", "How it works", "Reads", "Writes"], rows: [
      ["**Leveled**", "One sorted run per level; files merged into the next level as it fills", "Fewer files to check (low read amplification)", "More rewriting (higher write amplification)"],
      ["**Tiered** (size-tiered)", "Several runs per level; similar-sized files merged together", "More files to check per read", "Less rewriting (lower write cost)"],
    ] },
    { type: "p", text: "Production systems tune level sizes, fan-out ratios and compaction concurrency to balance these trade-offs." },

    { type: "h2", text: "Running LSM storage in production" },
    { type: "ul", items: [
      "**Compaction debt**: heavy write bursts, node repairs or failed compactions leave many overlapping level-0 files. Reads still work but check more Bloom filters and disk blocks, so tail latency rises. Operators throttle writes or add resources until compaction catches up. Monitor level-0 file counts and pending compaction bytes as an early warning.",
      "**Hot partitions**: one partition key receiving most of the writes can saturate a single shard's WAL and memtable. Spread hot keys across partitions or shed load adaptively before compaction debt builds. See [hot partitions](/learn/hot-partitions).",
      "**Tuning**: level size ratios, target file sizes and the compaction strategy matter. Files that are too small cause constant rewrites; files that are too large slow recovery and reads. Watch write amplification together with read latency percentiles.",
    ] },

    { type: "h2", text: "When to use LSM trees" },
    { type: "table", head: ["", "LSM tree", "B-tree"], rows: [
      ["Strengths", "Fast sequential writes, high write throughput", "Single-walk reads, no compaction overhead"],
      ["Watch out for", "Read amplification, background compaction cost", "Write amplification from random in-place updates"],
      ["Typical workloads", "Time-series ingestion, logging pipelines, message stores, write-heavy NoSQL", "Read-heavy OLTP with strong locality"],
      ["Examples", "Cassandra, RocksDB, LevelDB, ScyllaDB, HBase", "PostgreSQL, MySQL InnoDB, SQL Server"],
    ] },
    { type: "p", text: "The choice comes down to whether your bottleneck is **write throughput** or **read efficiency**." },

    { type: "h2", text: "A tiny LSM tree you can run" },
    { type: "p", text: "This demo shows every mechanism above: writes go to a WAL and memtable, full memtables flush into sorted runs, too many runs at a level trigger compaction into the next level, deletes are tombstones, and reads search newest to oldest." },
    { type: "code", code: `class LSMTree:
    TOMBSTONE = None

    def __init__(self, memtable_limit=4, fanout=2):
        self.memtable, self.wal = {}, []
        self.levels = []                    # levels[i] = list of sorted runs, newest first
        self.memtable_limit, self.fanout = memtable_limit, fanout

    def put(self, key, value):
        self._write(key, value)

    def delete(self, key):
        self._write(key, self.TOMBSTONE)    # a delete is just a newer "tombstone" entry

    def _write(self, key, value):
        self.wal.append((key, value))       # 1. durability first
        self.memtable[key] = value          # 2. fast in-memory update
        if len(self.memtable) >= self.memtable_limit:
            self._flush()

    def _flush(self):
        self._add_run(0, dict(sorted(self.memtable.items())))   # immutable sorted run
        self.memtable, self.wal = {}, []    # data is on "disk": the WAL can be truncated

    def _add_run(self, level, run):
        while len(self.levels) <= level:
            self.levels.append([])
        self.levels[level].insert(0, run)
        if len(self.levels[level]) > self.fanout:
            self._compact(level)

    def _compact(self, level):
        merged = {}
        for run in reversed(self.levels[level]):  # oldest first, so newer values overwrite
            merged.update(run)
        self.levels[level] = []
        if not any(self.levels[level + 1:]):      # nothing older below: tombstones can go
            merged = {k: v for k, v in merged.items() if v is not self.TOMBSTONE}
        self._add_run(level + 1, dict(sorted(merged.items())))

    def get(self, key):
        if key in self.memtable:                  # newest data first
            return self.memtable[key]
        for runs in self.levels:                  # level 0, then deeper levels
            for run in runs:                      # newest to oldest (real engines: Bloom filter first)
                if key in run:
                    return run[key]               # a tombstone reads as "not found"
        return None

    def recover(self, wal_entries):
        for key, value in wal_entries:            # after a crash: replay the WAL
            self.memtable[key] = value

db = LSMTree(memtable_limit=2, fanout=2)
db.put("user:1", "alice"); db.put("user:2", "bob")          # flush -> level-0 run
db.put("user:1", "alice-v2"); db.delete("user:2")           # flush -> newer level-0 run
print(db.get("user:1"), db.get("user:2"))                   # alice-v2 None
db.put("user:3", "carol"); db.put("user:4", "dan")          # 3rd run -> compaction into level 1
print([len(runs) for runs in db.levels])                    # [0, 1]
print(db.levels[1][0])   # {'user:1': 'alice-v2', 'user:3': 'carol', 'user:4': 'dan'}` },
    { type: "p", text: "Writes batch in memory, flushes create sorted runs, compaction merges overlapping data (dropping user:2 because its tombstone reached the bottom level), and no existing run is ever modified in place." },
  ],
  uses: [
    { name: "Apache Cassandra and ScyllaDB", text: "Commit log + memtable + SSTables absorb huge write volumes for messaging, IoT and activity feeds." },
    { name: "RocksDB and LevelDB", text: "Embedded LSM engines inside MySQL (MyRocks), Kafka Streams state stores, CockroachDB-style databases and blockchain nodes." },
    { name: "Bigtable and HBase", text: "The original SSTable design: sorted, immutable files with sparse indexes, compacted in the background." },
    { name: "Time-series and logging pipelines", text: "Sustained append-heavy ingestion where write throughput matters more than single-key read latency." },
  ],
  interview: [
    "When a design is write-heavy (metrics, chat messages, event logs), justify an LSM-based store by its sequential writes.",
    "Explain the write path in one breath: WAL append, memtable insert, ack; flush to SSTables; compact in the background.",
    "Mention read amplification and how Bloom filters and compaction keep it bounded.",
    "Know that deletes are tombstones and that space is reclaimed only by compaction.",
  ],
  related: ["database-indexing", "write-ahead-log", "probabilistic-data-structures", "time-series-databases", "nosql-database-types", "hot-partitions"],
  practice: ["chat-system", "realtime-analytics", "distributed-message-queue"],
};
