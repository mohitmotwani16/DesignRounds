export default {
  blocks: [
    { type: "p", text: "**Replication** keeps copies of the same data on several machines. It serves three goals: **availability** (if one copy dies, others serve), **read scaling** (spread reads over copies) and **latency** (keep a copy near users). The hard part is keeping copies in sync while data changes, and the main designs differ in **who accepts writes**." },

    { type: "h2", text: "Leader-follower (primary-replica)" },
    { type: "p", text: "One node, the **leader**, accepts all writes and streams changes (its write-ahead log or a change log) to **followers**, which serve reads. This is the default for PostgreSQL, MySQL, MongoDB replica sets, Redis and Kafka partitions." },
    { type: "diagram", kind: "flow", caption: "Writes go to the leader; followers replay its log and serve reads. Asynchronous followers may lag behind.", nodes: [
      { id: "app", label: "App servers", col: 0, row: 1, shape: "pill" },
      { id: "l", label: "Leader", sub: "all writes", col: 1.3, row: 1, shape: "db", tone: "accent" },
      { id: "f1", label: "Follower 1", sub: "sync", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "f2", label: "Follower 2", sub: "async, ~100 ms lag", col: 2.6, row: 1, shape: "db", tone: "store" },
      { id: "f3", label: "Follower 3", sub: "other region", col: 2.6, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "app", to: "l", label: "writes" }, { from: "l", to: "f1", label: "WAL stream" }, { from: "l", to: "f2", dashed: true }, { from: "l", to: "f3", dashed: true },
      { from: "app", to: "f2", label: "reads", bend: 60 },
    ] },
    { type: "h3", text: "Synchronous vs asynchronous" },
    { type: "table", head: ["", "Synchronous", "Asynchronous"], rows: [
      ["Write acknowledged after", "At least one follower has it", "The leader alone has it"],
      ["Data loss if leader dies", "None (for the sync follower)", "The last writes not yet replicated"],
      ["Write latency", "Higher (waits for a network round trip)", "Lowest"],
      ["If the follower is slow or down", "Writes stall (unless you fall back)", "No effect on writes"],
    ] },
    { type: "p", text: "A common compromise is **semi-synchronous**: wait for one follower, replicate to the rest asynchronously." },
    { type: "h3", text: "Replication lag and its anomalies" },
    { type: "p", text: "Async followers can be milliseconds or, under load, seconds behind. Reading from them causes the anomalies described in [consistency models](/learn/consistency-models): a user not seeing their own update, or data appearing and disappearing. Fixes include reading your own recent writes from the leader and routing a session to one follower." },
    { type: "h3", text: "Failover" },
    { type: "p", text: "When the leader dies, a follower is promoted. The hard parts: detecting real failure versus a slow network, choosing the most up-to-date follower, making clients write to the new leader, and preventing the old leader from accepting writes if it comes back (**split brain**). Robust systems use a consensus service or [leader election](/learn/leader-election) with fencing for this." },

    { type: "h2", text: "Multi-leader replication" },
    { type: "p", text: "Several nodes accept writes, typically **one leader per region**, and replicate to each other. Users write locally with low latency, and each region keeps working if another is cut off." },
    { type: "p", text: "The cost is **write conflicts**: two regions can change the same record concurrently. Resolution strategies include last-write-wins (simple, silently loses data), merging (for example with CRDTs), or routing all writes for a given record to one \"home\" region to avoid conflicts entirely." },

    { type: "h2", text: "Leaderless replication and quorums" },
    { type: "p", text: "In Dynamo-style systems (Cassandra, Riak, DynamoDB internally), clients or a coordinator write to **N** replicas and wait for **W** acknowledgements; reads query **R** replicas and take the newest version. If **R + W > N**, every read set overlaps every write set, so a read sees the latest acknowledged write." },
    { type: "table", head: ["N / W / R", "Behaviour"], rows: [
      ["3 / 2 / 2", "Balanced: tolerates one slow or down replica for both reads and writes"],
      ["3 / 3 / 1", "Fast reads, but writes fail if any replica is down"],
      ["3 / 1 / 1", "Fastest and most available, but reads may be stale (eventual consistency)"],
    ] },
    { type: "p", text: "Stale replicas are repaired by **read repair** (fix replicas found stale during a read), **hinted handoff** (another node holds writes for a down replica and delivers them later) and **anti-entropy** (background comparison using Merkle trees)." },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Leader-follower", "Multi-leader", "Leaderless"], rows: [
      ["Writes accepted by", "One leader", "Several leaders", "Any replica (quorum)"],
      ["Write conflicts", "None", "Yes: must resolve", "Yes: versioning and repair"],
      ["Failover", "Promote a follower", "Other leaders continue", "No failover needed"],
      ["Typical use", "Most OLTP databases", "Multi-region writes, offline-capable apps", "High-availability key-value and wide-column stores"],
    ] },
  ],
  uses: [
    { name: "PostgreSQL and MySQL", text: "Primary with streaming replicas for read scaling and failover, often managed by tools like Patroni or cloud services like RDS and Aurora." },
    { name: "Cassandra and DynamoDB", text: "Leaderless-style replication with tunable consistency per request (ONE, QUORUM, ALL)." },
    { name: "Kafka", text: "Each partition has a leader and in-sync replicas; producers with acks=all wait for the in-sync set before a write counts." },
    { name: "Google Docs and Notion offline", text: "Client devices act like extra leaders that sync later, a form of multi-leader replication with conflict merging." },
  ],
  interview: [
    "Add read replicas for read-heavy systems, then immediately address replication lag and read-your-writes.",
    "Say whether replication is sync or async and what data could be lost on failover.",
    "For multi-region writes, explain how conflicts are avoided or resolved.",
    "Use R + W > N when proposing quorum reads and writes.",
  ],
  related: ["consistency-models", "sharding", "cap-theorem", "leader-election", "consensus", "disaster-recovery"],
  practice: ["key-value-store", "geo-replicated-database", "multi-region", "distributed-message-queue"],
};
