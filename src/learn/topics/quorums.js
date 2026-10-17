export default {
  blocks: [
    { type: "p", text: "In **quorum replication**, each value is stored on **N** replicas, a write must be acknowledged by **W** of them, and a read queries **R** of them. If **R + W > N**, every read set overlaps every write set in at least one replica, so a read can always find the latest acknowledged write. Tuning N, R and W lets a system trade consistency, latency and availability, which is why leaderless stores such as Dynamo-style databases expose them as settings." },

    { type: "h2", text: "Why R + W > N works" },
    { type: "p", text: "With N = 3, W = 2 and R = 2, a write reaches at least two of the three replicas, and a read asks two. Any two-replica set and any other two-replica set out of three must share a member, so at least one replica in the read has the latest value. Versions (timestamps or [vector clocks](/learn/clocks-and-ordering)) tell the reader which response is newest." },
    { type: "diagram", kind: "flow", caption: "N = 3, W = 2, R = 2: the write reached A and B; the read asked B and C. B is in both sets, so the read sees version 7.", nodes: [
      { id: "w", label: "Write v7", col: 0, row: 0.4, shape: "pill", tone: "accent" },
      { id: "r", label: "Read", col: 0, row: 1.8, shape: "pill" },
      { id: "a", label: "Replica A", sub: "v7", col: 1.6, row: 0, shape: "db", tone: "ok" },
      { id: "b", label: "Replica B", sub: "v7", col: 1.6, row: 1.1, shape: "db", tone: "ok" },
      { id: "c", label: "Replica C", sub: "v6 (stale)", col: 1.6, row: 2.2, shape: "db", tone: "muted" },
    ], edges: [
      { from: "w", to: "a" }, { from: "w", to: "b" }, { from: "r", to: "b", dashed: true }, { from: "r", to: "c", dashed: true },
    ] },

    { type: "h2", text: "Choosing N, R and W" },
    { type: "table", head: ["Setting (N = 3)", "Effect", "Fits"], rows: [
      ["W = 2, R = 2", "Overlapping quorums; tolerates one replica down for both reads and writes", "A common balanced default"],
      ["W = 3, R = 1", "Fast reads, slow writes; any one replica down blocks writes", "Read-heavy data that rarely changes"],
      ["W = 1, R = 3", "Fast writes, slow reads; reads fail if any replica is down", "Write-heavy data, rarely read"],
      ["W = 1, R = 1", "Fastest and most available, but R + W ≤ N: reads may miss recent writes", "Caches, metrics, data where staleness is acceptable"],
    ] },
    { type: "p", text: "Latency follows the slowest replica in the quorum, so the client waits for the W-th or R-th fastest response. Sending requests to all N replicas and using the first W or R replies hides a slow node." },

    { type: "h2", text: "Quorums don't make everything linearizable" },
    { type: "p", text: "R + W > N is necessary but not sufficient for strong consistency. Edge cases include:" },
    { type: "ul", items: [
      "**Concurrent writes** to the same key with last-write-wins by timestamp can lose a write if clocks are skewed.",
      "**Failed writes** that reached fewer than W replicas aren't rolled back on the replicas they did reach, so later reads may see them.",
      "**A read concurrent with a write** may return the new value from one replica and then the old value on a subsequent read from different replicas.",
      "**Sloppy quorums** (below) break the overlap guarantee.",
    ] },
    { type: "p", text: "Systems that need linearizable reads and writes use a single leader with [consensus](/learn/consensus), or add read repair and coordination on top. See [consistency models](/learn/consistency-models)." },

    { type: "h2", text: "Sloppy quorums and hinted handoff" },
    { type: "p", text: "If some of a key's N home replicas are unreachable, a strict quorum fails the write. A **sloppy quorum** accepts the write on other healthy nodes instead, which store it with a **hint** naming the intended replica. When the home replica recovers, **hinted handoff** sends it the data. This raises write availability during failures, at the cost that a read quorum may not overlap the nodes holding the newest value until handoff completes." },

    { type: "h2", text: "Keeping replicas converged" },
    { type: "ul", items: [
      "**Read repair:** when a read sees replicas with different versions, it writes the newest value back to the stale ones.",
      "**Anti-entropy:** a background process compares replicas and copies missing data, using [Merkle trees](/learn/merkle-trees) to find differences cheaply.",
      "**Conflict resolution:** concurrent versions are reconciled with last-write-wins, version vectors with application merges, or [CRDTs](/learn/crdts).",
    ] },
  ],
  uses: [
    { name: "Dynamo-style stores", text: "Cassandra and similar databases let each query choose its consistency level, such as ONE, QUORUM or ALL." },
    { name: "Consensus systems", text: "Raft and Paxos use majority quorums (a special case where W and R are majorities) for leader election and commits." },
    { name: "Geo-distributed data", text: "Local-region quorums keep latency low, with cross-region replication done asynchronously." },
  ],
  interview: [
    "Explain why R + W > N gives overlap, with a concrete N = 3 example.",
    "Show how changing R and W shifts latency and availability.",
    "Point out that quorums alone don't guarantee linearizability.",
    "Describe sloppy quorums, hinted handoff, read repair and anti-entropy.",
  ],
  related: ["replication", "dynamo-style-key-value-store", "consistency-models", "merkle-trees", "consensus"],
  practice: ["key-value-store", "geo-replicated-database"],
  reading: [
    { title: "Dynamo: Amazon's Highly Available Key-value Store", publisher: "All Things Distributed (Werner Vogels)", url: "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html" },
    { title: "Apache Cassandra: Tunable consistency", publisher: "Apache Cassandra documentation", url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html" },
  ],
};
