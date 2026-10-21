export default {
  blocks: [
    { type: "p", text: "**Open table formats** such as **Apache Iceberg**, **Delta Lake** and **Apache Hudi** turn a folder of data files on object storage into a real table. They track exactly which files belong to each version of the table in metadata, so writes become atomic commits, readers always see a consistent snapshot, schemas can evolve safely, and you can query the table as it was yesterday. They're what makes a [lakehouse](/learn/data-warehouse-vs-data-lake) possible." },

    { type: "h2", text: "The problem with plain files" },
    { type: "ul", items: [
      "**No atomicity:** a job writing 500 files fails after 300; readers now see a partial table.",
      "**No isolation:** a reader listing files during a write sees some old and some new files.",
      "**Slow planning:** listing millions of files on object storage just to plan a query is slow and costly.",
      "**No safe updates or deletes:** changing one row means rewriting files with no coordination, which matters for corrections and privacy deletion requests.",
      "**Fragile schema changes:** renaming or reordering a column can silently misalign old files.",
    ] },

    { type: "h2", text: "How a table format works" },
    { type: "p", text: "The table's state is a chain of **snapshots** described by metadata files. Each snapshot lists the data files that make up the table at that moment, with per-file statistics. A writer creates new data files, writes new metadata describing the next snapshot, then **atomically swaps** the catalog's pointer to that metadata. If two writers race, one commit wins and the other retries on top of it (**optimistic concurrency**)." },
    { type: "diagram", kind: "flow", caption: "Iceberg-style layout: the catalog points at the current metadata; snapshots reference manifests, which list data files and their statistics.", nodes: [
      { id: "cat", label: "Catalog", sub: "table → current metadata", col: 0, row: 1, tone: "accent" },
      { id: "meta", label: "Metadata file", sub: "schema · snapshots", col: 1.3, row: 1 },
      { id: "s1", label: "Snapshot 41", col: 2.6, row: 0.4, tone: "muted" },
      { id: "s2", label: "Snapshot 42", sub: "current", col: 2.6, row: 1.6, tone: "cache" },
      { id: "man", label: "Manifests", sub: "file lists + stats", col: 3.9, row: 1 },
      { id: "files", label: "Data files", sub: "Parquet", col: 5.1, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "cat", to: "meta" }, { from: "meta", to: "s1", dashed: true }, { from: "meta", to: "s2" },
      { from: "s1", to: "man", dashed: true }, { from: "s2", to: "man" }, { from: "man", to: "files" },
    ] },
    { type: "p", text: "Delta Lake records the same information as an ordered transaction log of JSON commits with periodic checkpoints. Hudi uses a timeline of actions. The mechanisms differ, but all three give atomic commits and snapshot reads." },

    { type: "h2", text: "What you get" },
    { type: "table", head: ["Capability", "What it means", "Why it matters"], rows: [
      ["ACID commits", "A write is all or nothing; concurrent writers are serialised", "Retries and failures never leave half-written tables"],
      ["Snapshot isolation", "Readers see one complete version", "Dashboards don't see partial loads"],
      ["Time travel", "Query `AS OF` an earlier snapshot", "Debugging, reproducible ML training sets, audits"],
      ["Schema evolution", "Add, drop, rename and reorder columns by ID, not position", "Producers can change without breaking old files"],
      ["Row-level changes", "MERGE, UPDATE and DELETE", "CDC upserts, corrections, privacy deletion"],
      ["File-level statistics", "Min/max per column per file in metadata", "Prune files without listing storage"],
    ] },

    { type: "h2", text: "Copy-on-write vs merge-on-read" },
    { type: "table", head: ["", "Copy-on-write", "Merge-on-read"], rows: [
      ["On update", "Rewrite affected data files with changes applied", "Write small delete or delta files alongside the data"],
      ["Write cost", "Higher", "Lower"],
      ["Read cost", "Lower: files are already final", "Higher: readers merge deltas until compaction"],
      ["Good for", "Read-heavy tables, infrequent updates", "Frequent upserts and streaming CDC"],
    ] },

    { type: "h2", text: "Operating them" },
    { type: "ul", items: [
      "**Compaction:** rewrite many small files into fewer large ones (see [the small files problem](/learn/columnar-file-formats)), and fold merge-on-read deltas into base files.",
      "**Snapshot expiry:** old snapshots keep old files alive; expire them on a schedule, which also sets how far back time travel works.",
      "**Orphan file cleanup:** remove files left behind by failed writes.",
      "**Catalog choice:** the catalog (Hive metastore, a REST catalog, or a managed one) is the source of truth for the current table version and the place to apply access control.",
      "**Deletion requirements:** a DELETE removes rows from the current snapshot, but data stays in old files until snapshots expire and files are cleaned up.",
    ] },
    { type: "callout", tone: "tip", text: "Choose by ecosystem more than features: which engines and catalogs your team already uses, and which format they support best. The core guarantees are similar." },
  ],
  uses: [
    { name: "CDC into the lake", text: "Database changes are merged into Iceberg or Hudi tables continuously, keeping a queryable copy of operational data." },
    { name: "Reproducible ML", text: "A training job records the snapshot ID it read, so the exact dataset can be reloaded later." },
    { name: "Privacy compliance", text: "Row-level deletes plus snapshot expiry remove a user's data from the lake within a deadline." },
  ],
  interview: [
    "Explain that the format adds a metadata layer with atomic snapshot swaps over immutable files.",
    "Mention time travel for debugging and reproducibility.",
    "Choose copy-on-write or merge-on-read from the update pattern.",
    "Include compaction and snapshot expiry in the operating plan.",
  ],
  related: ["lakehouse-architecture", "data-warehouse-vs-data-lake", "columnar-file-formats", "medallion-architecture", "optimistic-vs-pessimistic-locking", "outbox-pattern"],
  practice: ["etl-framework", "fraud-data-platform"],
  reading: [
    { title: "Apache Iceberg specification", publisher: "Apache Software Foundation", url: "https://iceberg.apache.org/spec/" },
    { title: "Delta Lake documentation", publisher: "Delta Lake (Linux Foundation)", url: "https://docs.delta.io/index.html" },
    { title: "Apache Hudi concepts", publisher: "Apache Software Foundation", url: "https://hudi.apache.org/docs/concepts/" },
  ],
};
