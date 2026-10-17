export default {
  blocks: [
    { type: "p", text: "**Leader election** picks one node out of several to perform a job that must happen exactly once at a time: running a scheduler, being the primary database, owning a partition, or coordinating a cluster. The hard part isn't choosing a leader; it's making sure there is **never more than one** acting as leader, even when networks partition and processes pause." },

    { type: "h2", text: "Why you need a single leader" },
    { type: "ul", items: [
      "**Singleton jobs**: a cron scheduler that must fire each job once, a billing run, a compaction coordinator.",
      "**Write ordering**: a single primary database or partition leader orders writes without conflicts. See [replication](/learn/replication).",
      "**Coordination**: one node assigns shards or tasks to workers.",
      "**Efficiency**: avoid every node doing the same expensive work.",
    ] },

    { type: "h2", text: "Leases: the standard approach" },
    { type: "p", text: "A leader holds a **lease**: a time-limited claim recorded in a strongly consistent store (etcd, ZooKeeper, Consul, or a database row). It must renew the lease before it expires; if it dies or is partitioned away, the lease lapses and another node acquires it." },
    { type: "diagram", kind: "flow", caption: "Candidates compete for a lease in a consensus store. The holder renews it with heartbeats; if renewals stop, the lease expires and a standby takes over.", nodes: [
      { id: "a", label: "Node A", sub: "leader (lease 10 s)", col: 0, row: 0, tone: "ok" },
      { id: "b", label: "Node B", sub: "standby", col: 0, row: 1 },
      { id: "c", label: "Node C", sub: "standby", col: 0, row: 2 },
      { id: "store", label: "etcd / ZooKeeper", sub: "lease: A, term 12", col: 1.5, row: 1, shape: "db", tone: "accent", w: 170 },
      { id: "job", label: "Leader-only work", sub: "scheduler, primary", col: 3, row: 0, tone: "muted" },
    ], edges: [
      { from: "a", to: "store", label: "renew every 3 s" }, { from: "b", to: "store", dashed: true, label: "watch" }, { from: "c", to: "store", dashed: true, label: "watch" },
      { from: "a", to: "job" },
    ] },
    { type: "ul", items: [
      "**ZooKeeper**: each candidate creates an ephemeral sequential node; the lowest number is leader; others watch the node just before theirs, avoiding a herd of notifications.",
      "**etcd**: an election API built on leases and revisions; Kubernetes controllers use Lease objects for the same purpose.",
      "**Database row**: `UPDATE leader SET holder = 'B', expires = now() + 10s WHERE expires < now()`: simple, but only as reliable as the database.",
      "**Consensus protocols** like Raft include election internally. See [consensus](/learn/consensus).",
    ] },

    { type: "h2", text: "Split brain and fencing" },
    { type: "p", text: "Leases expire by time, but a leader can be **paused** (a long garbage-collection pause, a VM migration, an overloaded host) longer than its lease. It wakes up believing it's still leader, while a new leader has already been elected. Now two nodes act as leader: **split brain**. Both may write to the database or both may fire the scheduled job." },
    { type: "p", text: "The fix is a **fencing token**: every time the lease is granted, the store hands out a monotonically increasing number (the term or revision). The leader includes it with every action, and the resources it touches reject any token older than one they've already seen." },
    { type: "diagram", kind: "sequence", caption: "The old leader wakes from a pause and writes with token 33; storage has already seen token 34 from the new leader and rejects the stale write.", actors: ["Old leader", "Lock store", "New leader", "Storage"], steps: [
      { from: 0, to: 1, label: "acquire → token 33" },
      { note: "old leader paused 15 s (GC)", over: [0] },
      { from: 2, to: 1, label: "lease expired → token 34" },
      { from: 2, to: 3, label: "write (token 34)", tone: "accent" },
      { from: 0, to: 3, label: "write (token 33)", tone: "danger" },
      { from: 3, to: 0, label: "rejected: 33 < 34", tone: "danger" },
    ] },
    { type: "p", text: "Without fencing, a lease is only a hint. With it, safety no longer depends on clocks or pause times. See [distributed locks](/learn/distributed-locks)." },

    { type: "h2", text: "Tuning failover" },
    { type: "ul", items: [
      "**Lease length** trades failover speed against false failovers: 10–15 seconds is common; very short leases cause flapping during network blips.",
      "**Renew well before expiry** (every third of the lease) and step down voluntarily if renewal fails.",
      "**Graceful handover**: on shutdown, release the lease so a standby takes over immediately rather than after a timeout.",
      "**Avoid a single leader where you can**: partitioning work so each node leads its own shards (as Kafka does per partition) spreads load and limits the blast radius.",
    ] },
  ],
  uses: [
    { name: "Kubernetes controllers", text: "The scheduler and controller manager run several replicas, with one active leader chosen through Lease objects in etcd." },
    { name: "Kafka", text: "Elects a controller for cluster metadata and a leader per partition; the leader epoch acts as a fencing token for replicas." },
    { name: "PostgreSQL HA (Patroni)", text: "Uses etcd, Consul or ZooKeeper to elect the primary and orchestrate failover with fencing of the old primary." },
    { name: "HDFS NameNode", text: "Active and standby NameNodes coordinate through ZooKeeper, with fencing to prevent two active NameNodes." },
  ],
  interview: [
    "Use a lease in a consensus store (etcd, ZooKeeper) rather than inventing election logic.",
    "Raise split brain proactively and solve it with fencing tokens checked by the resource.",
    "Discuss the lease timeout trade-off between fast failover and false failovers.",
    "Where possible, partition leadership (leader per shard) instead of one global leader.",
  ],
  related: ["consensus", "distributed-locks", "replication", "health-checks-failover", "clocks-and-ordering"],
  practice: ["leader-election", "task-scheduler", "distributed-lock-service", "distributed-message-queue"],
};
