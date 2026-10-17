export default {
  blocks: [
    { type: "p", text: "A **Dynamo-style key-value store** is a highly available, leaderless database designed to always accept reads and writes, even during failures, and to scale by adding nodes. Amazon's Dynamo paper (2007) combined several techniques that now appear in Cassandra, Riak and others: **consistent hashing** to partition data, **replication** to N nodes, **tunable quorums**, **versioning** to detect conflicting writes, **hinted handoff** for temporary failures and **Merkle-tree anti-entropy** for repair. It's the canonical answer to \"design a distributed key-value store\"." },

    { type: "h2", text: "The building blocks" },
    { type: "table", head: ["Problem", "Technique", "Guide"], rows: [
      ["Spread data over many nodes and add nodes with little data movement", "Consistent hashing with virtual nodes", "[Consistent hashing](/learn/consistent-hashing)"],
      ["Survive node loss", "Replicate each key to the next N distinct nodes on the ring", "[Replication](/learn/replication)"],
      ["Trade consistency and latency per request", "Quorum reads and writes (R, W)", "[Quorums](/learn/quorums)"],
      ["Detect concurrent conflicting writes", "Vector clocks or version vectors per value", "[Clocks and ordering](/learn/clocks-and-ordering)"],
      ["Accept writes when home replicas are down", "Sloppy quorum and hinted handoff", "[Quorums](/learn/quorums)"],
      ["Repair replicas that diverged", "Read repair and Merkle-tree anti-entropy", "[Merkle trees](/learn/merkle-trees)"],
      ["Know which nodes are alive and own which ranges", "Gossip-based membership and failure detection", "[Gossip protocols](/learn/gossip-protocol)"],
      ["Persist writes durably on each node", "Commit log plus an LSM-tree storage engine", "[Write-ahead log](/learn/write-ahead-log), [indexing](/learn/database-indexing)"],
    ] },

    { type: "h2", text: "The write path" },
    { type: "diagram", kind: "flow", caption: "Any node can coordinate a request: it hashes the key, finds the N replicas on the ring, and succeeds once W of them acknowledge.", nodes: [
      { id: "client", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "coord", label: "Coordinator node", sub: "hash(key) → replicas", col: 1.3, row: 1, tone: "accent" },
      { id: "r1", label: "Replica 1", sub: "commit log → memtable", col: 2.7, row: 0, shape: "db", tone: "store" },
      { id: "r2", label: "Replica 2", col: 2.7, row: 1, shape: "db", tone: "store" },
      { id: "r3", label: "Replica 3", sub: "down → hint stored", col: 2.7, row: 2, shape: "db", tone: "muted" },
      { id: "hint", label: "Fallback node", sub: "hinted handoff", col: 4, row: 2, shape: "db", tone: "queue" },
    ], edges: [
      { from: "client", to: "coord", label: "put(k, v)" }, { from: "coord", to: "r1" }, { from: "coord", to: "r2" },
      { from: "coord", to: "r3", dashed: true }, { from: "coord", to: "hint", dashed: true },
    ] },
    { type: "ol", items: [
      "The client sends a write to any node (or a token-aware client sends it to a replica directly). That node acts as **coordinator**.",
      "The coordinator hashes the key, finds the N replicas clockwise on the ring, and attaches a new version.",
      "Each replica appends to its commit log for durability, updates an in-memory table, and acknowledges. Memtables are later flushed to sorted files on disk.",
      "Once W replicas acknowledge, the write succeeds. If a replica is down, a fallback node stores the write with a hint and forwards it when the replica returns.",
    ] },

    { type: "h2", text: "The read path and conflicts" },
    { type: "p", text: "The coordinator asks R replicas and compares versions. If one version descends from the others, it's returned and stale replicas are fixed by **read repair**. If versions are **concurrent** (neither descends from the other, because two clients wrote during a partition), the store must resolve them:" },
    { type: "ul", items: [
      "**Last-write-wins** by timestamp: simple, but silently drops one write and depends on clock accuracy.",
      "**Return all siblings** to the client, which merges them using application knowledge. Dynamo's shopping cart merged by union, which is why deleted items occasionally reappeared.",
      "**CRDTs** that merge automatically and correctly, such as counters and sets. See [CRDTs](/learn/crdts).",
    ] },

    { type: "h2", text: "Membership, scaling and repair" },
    { type: "ul", items: [
      "**Adding a node:** it takes ownership of some virtual-node ranges and streams their data from existing replicas; only those ranges move.",
      "**Failure detection:** nodes gossip heartbeats; a node suspected dead is routed around, but its data isn't moved until an operator or a timeout decides it's gone for good, to avoid needless rebalancing during short outages.",
      "**Anti-entropy:** replicas periodically exchange Merkle trees per range and sync only the parts that differ.",
      "**Tombstones:** deletes are written as markers that must replicate everywhere before being garbage-collected, or deleted data can resurrect from a stale replica.",
    ] },

    { type: "h2", text: "Trade-offs" },
    { type: "table", head: ["Strength", "Cost"], rows: [
      ["Always writable, even during partitions", "Conflicts must be resolved, and reads may be stale"],
      ["Linear scaling by adding nodes", "No cross-key transactions or joins; data modelled around access patterns"],
      ["No single leader or master to fail", "Operational complexity: repair, compaction, tombstones"],
      ["Per-request consistency tuning", "Developers must understand what each level guarantees"],
    ] },
    { type: "p", text: "When you need strong consistency and transactions across keys, a [distributed SQL](/learn/distributed-sql) or single-leader design with [consensus](/learn/consensus) fits better." },
  ],
  uses: [
    { name: "Shopping carts and sessions", text: "The original Dynamo use case: never reject an add-to-cart, and merge conflicts afterwards." },
    { name: "Time-series and activity data", text: "Wide-column stores such as Cassandra handle very high write rates spread across many nodes." },
    { name: "User profiles and feature data", text: "Key lookups at low latency with replicas in several zones." },
  ],
  interview: [
    "Assemble the design from consistent hashing, replication, quorums, versioning, hinted handoff and anti-entropy.",
    "Walk through the write and read paths, including the coordinator.",
    "Explain how concurrent writes are detected and resolved.",
    "Mention tombstones and why deletes are tricky in leaderless stores.",
  ],
  related: ["consistent-hashing", "quorums", "merkle-trees", "gossip-protocol", "clocks-and-ordering"],
  practice: ["key-value-store", "distributed-cache"],
  reading: [
    { title: "Dynamo: Amazon's Highly Available Key-value Store", publisher: "All Things Distributed (Werner Vogels)", url: "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html" },
    { title: "Apache Cassandra: Dynamo architecture", publisher: "Apache Cassandra documentation", url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html" },
  ],
};
