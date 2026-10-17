export default {
  blocks: [
    { type: "p", text: "**Consensus** is the problem of getting several machines to agree on a value, or a sequence of values, even when some of them crash or messages are delayed. It's the foundation of anything that needs one source of truth across machines: leader election, configuration stores, distributed locks, and strongly consistent replicated databases. **Raft** and **Paxos** are the two best-known algorithms." },

    { type: "h2", text: "What consensus guarantees" },
    { type: "ul", items: [
      "**Agreement**: all non-faulty nodes decide the same value.",
      "**Validity**: the decided value was proposed by some node.",
      "**Termination**: eventually a decision is reached, as long as a **majority** of nodes are up and can talk to each other.",
    ] },
    { type: "p", text: "Majorities are the trick. Any two majorities of the same cluster overlap in at least one node, so two conflicting decisions can never both win. A cluster of **2f + 1** nodes tolerates **f** failures: 3 nodes survive 1 failure, 5 survive 2. That's why consensus clusters have odd sizes; a 4th node adds cost without extra fault tolerance." },

    { type: "h2", text: "Raft in three parts" },
    { type: "p", text: "Raft was designed to be understandable. Each node is a **follower**, **candidate** or **leader**, and time is divided into numbered **terms**." },
    { type: "h3", text: "1. Leader election" },
    { type: "ul", items: [
      "Followers expect regular **heartbeats** from the leader. If one hears nothing for a randomised election timeout (for example 150–300 ms), it becomes a candidate, increments the term, votes for itself and asks others for votes.",
      "A node votes for at most one candidate per term, and only for a candidate whose log is at least as up to date as its own.",
      "A candidate with votes from a **majority** becomes leader. Randomised timeouts make split votes rare.",
    ] },
    { type: "h3", text: "2. Log replication" },
    { type: "diagram", kind: "sequence", caption: "The leader appends a command, replicates it, and commits once a majority (including itself) has stored it. Only then is the client answered.", actors: ["Client", "Leader", "Follower 1", "Follower 2"], steps: [
      { from: 0, to: 1, label: "SET x = 5" },
      { from: 1, to: 1, label: "append to log (index 7, term 3)" },
      { from: 1, to: 2, label: "AppendEntries #7" },
      { from: 1, to: 3, label: "AppendEntries #7" },
      { from: 2, to: 1, label: "ok" },
      { note: "2 of 3 have it → committed", over: [1, 2] },
      { from: 1, to: 0, label: "OK", tone: "accent" },
      { from: 3, to: 1, label: "ok (late, fine)", dashed: true },
    ] },
    { type: "p", text: "Every node applies committed log entries, in order, to its own **state machine** (a key-value map, say). Since all logs are identical up to the commit point, all state machines end up identical. This is **state machine replication**." },
    { type: "h3", text: "3. Safety" },
    { type: "p", text: "Raft guarantees a committed entry is never lost: a new leader must have every committed entry (enforced by the voting rule), and leaders never overwrite their own log. Followers with conflicting uncommitted entries are brought back in line by the leader." },

    { type: "h2", text: "Paxos" },
    { type: "p", text: "Paxos (Leslie Lamport) solves the same problem with **proposers**, **acceptors** and **learners** in two phases: proposers obtain promises from a majority of acceptors for a numbered proposal, then ask them to accept a value. **Multi-Paxos** elects a stable leader to skip the first phase for each value, which makes it behave much like Raft. Paxos is proven and flexible but notoriously hard to implement correctly, which is why Raft became popular." },

    { type: "h2", text: "Costs and limits" },
    { type: "ul", items: [
      "**Latency**: every write needs a round trip to a majority; across regions that means tens to hundreds of milliseconds per commit.",
      "**Throughput** is bounded by the leader; scale by **partitioning** data into many independent consensus groups (as CockroachDB, TiKV and Spanner do).",
      "**Availability**: a minority partition can't make progress, which is the CP choice in the [CAP theorem](/learn/cap-theorem).",
      "Crash failures only: Raft and Paxos assume nodes don't lie. Tolerating malicious nodes needs Byzantine fault-tolerant protocols, as in blockchains.",
    ] },

    { type: "h2", text: "Use it, don't build it" },
    { type: "p", text: "Implementing consensus correctly is very hard. Systems almost always use an existing consensus service or library: **etcd** (Raft), **ZooKeeper** (ZAB, a Paxos-like protocol), **Consul** (Raft), or a database that embeds Raft or Paxos. Typical uses: storing cluster membership and configuration, [leader election](/learn/leader-election), [distributed locks](/learn/distributed-locks), and strongly consistent metadata." },
  ],
  uses: [
    { name: "Kubernetes (etcd)", text: "All cluster state lives in etcd, a 3- or 5-node Raft cluster, so the control plane always agrees on what should be running." },
    { name: "Kafka (KRaft) and ZooKeeper", text: "Kafka now uses a built-in Raft quorum to manage cluster metadata and controller election, replacing ZooKeeper." },
    { name: "CockroachDB, TiDB, YugabyteDB", text: "Split data into ranges, each replicated by its own Raft group, giving strongly consistent distributed SQL." },
    { name: "Google Chubby and Spanner", text: "Chubby (a Paxos-based lock service) inspired ZooKeeper; Spanner replicates every shard with Paxos." },
  ],
  interview: [
    "Use a consensus-backed store (etcd, ZooKeeper) for leader election, locks and critical metadata rather than inventing your own.",
    "Explain majority quorums: 2f+1 nodes tolerate f failures, so use 3 or 5 nodes.",
    "Describe Raft at a high level: elect a leader with timeouts and votes, replicate a log, commit on majority.",
    "Mention the latency cost of consensus across regions and partitioning data into many groups for throughput.",
  ],
  related: ["leader-election", "distributed-locks", "replication", "cap-theorem", "two-phase-commit", "clocks-and-ordering"],
  practice: ["leader-election", "distributed-lock-service", "config-control-plane", "key-value-store"],
};
