export default {
  blocks: [
    { type: "p", text: "A **distributed SQL** database (sometimes called NewSQL) offers what a traditional relational database does, with SQL, transactions and strong consistency, while scaling horizontally across many machines and surviving node and zone failures. Google **Spanner** pioneered the approach, and systems such as **CockroachDB**, **YugabyteDB** and **TiDB** follow similar designs: split data into ranges, replicate each range with **Raft** or Paxos, and coordinate transactions across ranges with careful use of time." },

    { type: "h2", text: "The architecture" },
    { type: "diagram", kind: "flow", caption: "Tables are split into key ranges; each range is a Raft group replicated across zones, with a leader serving consistent reads and writes.", nodes: [
      { id: "client", label: "SQL client", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "SQL layer", sub: "parse · plan · coordinate", col: 1.3, row: 1, tone: "accent" },
      { id: "r1", label: "Range [a-h)", sub: "Raft group", col: 2.7, row: 0, shape: "db", tone: "store" },
      { id: "r2", label: "Range [h-p)", sub: "Raft group", col: 2.7, row: 1, shape: "db", tone: "store" },
      { id: "r3", label: "Range [p-z)", sub: "Raft group", col: 2.7, row: 2, shape: "db", tone: "store" },
      { id: "zones", label: "Replicas in 3 zones", sub: "leader + 2 followers each", col: 4.1, row: 1, tone: "muted" },
    ], edges: [
      { from: "client", to: "gw" }, { from: "gw", to: "r1" }, { from: "gw", to: "r2" }, { from: "gw", to: "r3" },
      { from: "r1", to: "zones", dashed: true }, { from: "r2", to: "zones", dashed: true }, { from: "r3", to: "zones", dashed: true },
    ] },
    { type: "ul", items: [
      "**Range partitioning:** tables (and indexes) are stored as sorted key-value data split into ranges of a bounded size. Ranges split as they grow and move between nodes to balance load.",
      "**Consensus per range:** each range is replicated, typically three or five ways across zones, and a [Raft](/learn/consensus) group agrees on every write, so a range survives the loss of a minority of replicas without losing committed data.",
      "**Leaseholders:** one replica holds a lease to serve consistent reads without a round of consensus, which keeps reads fast.",
      "**A stateless SQL layer** on every node plans queries and routes them to the right ranges.",
    ] },

    { type: "h2", text: "Transactions across ranges" },
    { type: "p", text: "A transaction that touches rows in several ranges must commit atomically across Raft groups. Distributed SQL databases use a variant of **two-phase commit** where the participants are themselves fault-tolerant Raft groups, avoiding the classic blocking problem of 2PC with a single coordinator (see [two-phase commit](/learn/two-phase-commit)). A transaction record stored in one range acts as the commit point, and writes are provisional \"intents\" until it commits." },
    { type: "p", text: "Concurrency control is usually multi-version (MVCC) with serializable or snapshot isolation. Conflicts are detected at commit, and conflicting transactions are retried, so applications must be prepared to retry. See [isolation levels](/learn/transactions-isolation-levels)." },

    { type: "h2", text: "The role of time" },
    { type: "p", text: "To give **external consistency** (if transaction A commits before B starts, B sees A), transactions need timestamps that respect real time across machines. Spanner uses **TrueTime**, an API backed by GPS and atomic clocks that returns a time interval with bounded uncertainty, and waits out that uncertainty (\"commit wait\") before acknowledging a commit. Systems without specialised hardware use **hybrid logical clocks** combined with a maximum allowed clock offset, and handle uncertainty by restarting reads that might have missed a write. See [clocks and ordering](/learn/clocks-and-ordering)." },

    { type: "h2", text: "Latency and data placement" },
    { type: "table", head: ["Choice", "Effect"], rows: [
      ["Replicas within one region (multi-zone)", "Writes commit in a few milliseconds; survives a zone failure"],
      ["Replicas across regions", "Survives a region failure, but every write waits for a cross-region quorum (tens to hundreds of ms)"],
      ["Pin ranges to a region by row (geo-partitioning)", "Users' data and leaders live near them; meets data residency rules"],
      ["Follower reads (slightly stale)", "Low-latency reads from a nearby replica when a few seconds of staleness is acceptable"],
    ] },
    { type: "p", text: "Strong consistency across regions always costs write latency, because a majority must hear about each write. See [geo-replication](/learn/geo-replication)." },

    { type: "h2", text: "When to choose distributed SQL" },
    { type: "ul", items: [
      "**Choose it** when you need relational transactions and strong consistency at a scale or availability level a single primary can't provide, such as financial ledgers, inventory, or global user accounts.",
      "**Think twice** when one well-sized PostgreSQL or MySQL instance with replicas fits: it's simpler, cheaper and faster per query.",
      "**Choose something else** for very high-volume, simple-key workloads that tolerate eventual consistency, where a [Dynamo-style store](/learn/dynamo-style-key-value-store) is cheaper.",
      "**Design schemas for distribution:** avoid sequential primary keys that create a hot range (use UUIDs or hashed keys), and keep frequently joined data in the same ranges or region.",
    ] },
  ],
  uses: [
    { name: "Global financial systems", text: "Ledgers need serializable transactions and survival of a zone or region loss." },
    { name: "Multi-region SaaS", text: "Geo-partitioned tables keep each customer's data in their region while sharing one logical database." },
    { name: "Inventory and orders", text: "Strongly consistent stock levels across a horizontally scaled database." },
  ],
  interview: [
    "Describe ranges replicated by Raft groups with leaseholders.",
    "Explain cross-range commits as 2PC over fault-tolerant participants.",
    "Explain why timestamps and clock uncertainty matter for consistency.",
    "Weigh the write latency of cross-region replication against availability.",
  ],
  related: ["consensus", "two-phase-commit", "clocks-and-ordering", "geo-replication", "transactions-isolation-levels"],
  practice: ["geo-replicated-database", "payment-platform"],
  reading: [
    { title: "Spanner: Google's Globally-Distributed Database", publisher: "Corbett et al., OSDI 2012", url: "https://research.google/pubs/spanner-googles-globally-distributed-database-2/" },
    { title: "CockroachDB architecture overview", publisher: "Cockroach Labs documentation", url: "https://www.cockroachlabs.com/docs/stable/architecture/overview" },
  ],
};
