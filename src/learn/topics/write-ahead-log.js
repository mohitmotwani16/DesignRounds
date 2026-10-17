export default {
  blocks: [
    { type: "p", text: "A **write-ahead log (WAL)** is an append-only file where a database records every change **before** applying it to its main data structures. If the process crashes halfway through an update, the database replays the log on restart and ends up in a consistent state. Because appending sequentially to one file is much faster than updating scattered pages on disk, the WAL is also what lets databases commit quickly and durably. The same log is often what replicas copy." },

    { type: "h2", text: "Why log first" },
    { type: "p", text: "Updating a B-tree index might change several pages. If power fails after writing two of five pages, the tree is corrupted. With a WAL, the database first appends a record describing the change and makes it durable. Only then does it modify pages, which can happen lazily in memory. After a crash, anything in the log but not yet in the pages is **redone**, and incomplete transactions are **undone**, so either the whole change happened or none of it did." },
    { type: "diagram", kind: "flow", caption: "A commit is durable once its log record is flushed; data pages are written later, and checkpoints bound how much log must be replayed after a crash.", nodes: [
      { id: "tx", label: "Transaction", sub: "UPDATE ...", col: 0, row: 1, shape: "pill" },
      { id: "buf", label: "In-memory pages", sub: "modified (dirty)", col: 1.4, row: 0, tone: "cache" },
      { id: "wal", label: "WAL", sub: "append + fsync", col: 1.4, row: 2, shape: "queue", tone: "accent" },
      { id: "data", label: "Data files", sub: "written lazily", col: 2.8, row: 0, shape: "db", tone: "store" },
      { id: "rep", label: "Replicas", sub: "stream the WAL", col: 2.8, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "tx", to: "wal", label: "1. log" }, { from: "tx", to: "buf", label: "2. apply" },
      { from: "buf", to: "data", dashed: true, label: "checkpoint" }, { from: "wal", to: "rep", dashed: true },
    ] },

    { type: "h2", text: "Durability, fsync and group commit" },
    { type: "ul", items: [
      "Writing to a file usually lands in the operating system's cache, not on disk. A commit is only durable after **fsync** (or an equivalent) forces the log to stable storage.",
      "fsync is slow relative to memory, so databases use **group commit**: transactions that commit at about the same time share one flush, raising throughput dramatically.",
      "Some systems let you trade durability for speed, for example by acknowledging commits before the flush. A crash can then lose the last few milliseconds of committed transactions. Know which setting you're running.",
      "Durability on one machine isn't enough if the disk dies; replicating the log to other machines before acknowledging protects against that.",
    ] },

    { type: "h2", text: "Checkpoints and log truncation" },
    { type: "p", text: "Replaying a log from the beginning of time would take forever. A **checkpoint** writes dirty pages to the data files and records the log position up to which all changes are on disk. Recovery starts from the last checkpoint, and older log segments can be archived or deleted, unless replicas or backups still need them." },

    { type: "h2", text: "The log as the source of truth" },
    { type: "ul", items: [
      "**Replication:** followers apply the leader's log in order to stay in sync. Physical log shipping copies page-level changes; logical replication sends row-level changes. See [replication](/learn/replication).",
      "**Point-in-time recovery:** a base backup plus archived log segments can restore the database to any moment, such as just before a bad migration. See [disaster recovery](/learn/disaster-recovery).",
      "**Change data capture:** tools read the log to publish row changes as events to other systems. See [outbox and CDC](/learn/outbox-pattern).",
      "**LSM-tree databases** use a commit log for the same purpose: writes go to the log and an in-memory table, which is flushed to sorted files later. See [indexing](/learn/database-indexing).",
      "**Consensus systems** such as Raft are built around a replicated log: agreeing on the log is agreeing on the state. See [consensus](/learn/consensus).",
    ] },
    { type: "callout", tone: "tip", text: "\"The log is the database, and everything else is a cache of it\" is a useful mental model. Kafka applies the same idea to whole systems: a durable, ordered log that many consumers can replay. See [event streaming](/learn/event-streaming-kafka)." },
  ],
  uses: [
    { name: "Relational databases", text: "PostgreSQL's WAL and MySQL InnoDB's redo log provide crash recovery and replication." },
    { name: "Key-value and wide-column stores", text: "A commit log protects memtable contents until they're flushed to disk." },
    { name: "Coordination services", text: "etcd and ZooKeeper persist a replicated log of every state change." },
  ],
  interview: [
    "Explain why changes are logged before data pages are modified.",
    "Mention fsync and group commit when discussing durability and throughput.",
    "Describe checkpoints and how they bound recovery time.",
    "Connect the WAL to replication, point-in-time recovery and CDC.",
  ],
  related: ["replication", "database-indexing", "transactions-isolation-levels", "outbox-pattern", "consensus"],
  practice: ["key-value-store", "distributed-message-queue"],
  reading: [
    { title: "PostgreSQL: Write-Ahead Logging", publisher: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/wal-intro.html" },
    { title: "Write-ahead logging", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Write-ahead_logging" },
  ],
};
