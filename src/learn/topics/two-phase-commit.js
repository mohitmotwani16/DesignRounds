export default {
  blocks: [
    { type: "p", text: "**Two-phase commit (2PC)** is a protocol that makes a transaction spanning several databases or resources **atomic**: either every participant commits, or every participant rolls back. A **coordinator** first asks everyone to prepare, then tells everyone the outcome. It provides real atomicity across systems, at the cost of latency and a well-known blocking problem." },

    { type: "h2", text: "The two phases" },
    { type: "diagram", kind: "sequence", caption: "Phase 1: every participant prepares and votes. Phase 2: the coordinator records the decision and tells everyone to commit (or abort).", actors: ["Coordinator", "Database A", "Database B"], steps: [
      { note: "phase 1: prepare", over: [0, 2] },
      { from: 0, to: 1, label: "PREPARE" },
      { from: 0, to: 2, label: "PREPARE" },
      { from: 1, to: 0, label: "YES (locked, durable)" },
      { from: 2, to: 0, label: "YES (locked, durable)" },
      { note: "phase 2: decision logged → commit", over: [0, 2] },
      { from: 0, to: 1, label: "COMMIT", tone: "accent" },
      { from: 0, to: 2, label: "COMMIT", tone: "accent" },
      { from: 1, to: 0, label: "ack", dashed: true },
      { from: 2, to: 0, label: "ack", dashed: true },
    ] },
    { type: "ol", items: [
      "**Prepare**: the coordinator asks each participant to prepare. A participant that votes YES has written everything durably and **promises** it can commit, holding its locks until told the outcome.",
      "**Commit or abort**: if all vote YES, the coordinator durably logs COMMIT and tells everyone to commit. If any votes NO or doesn't answer, it logs ABORT and everyone rolls back.",
    ] },
    { type: "p", text: "The key moment is the coordinator writing its decision to its own log: from then on, the outcome is fixed, and it will keep retrying until every participant has applied it." },

    { type: "h2", text: "The blocking problem" },
    { type: "p", text: "A participant that has voted YES is **in doubt**: it can't commit on its own (others may have voted NO) and can't abort (the coordinator may have decided COMMIT). If the coordinator crashes at that point, participants must **wait, holding locks**, until it recovers. Rows stay locked, other transactions pile up behind them, and availability suffers." },
    { type: "ul", items: [
      "Run the coordinator with a **replicated log** (on a consensus system) so its decision survives a crash and another node can take over. Distributed databases like Spanner and CockroachDB do this.",
      "**Three-phase commit** tries to remove blocking but fails under network partitions, so it's rarely used in practice.",
    ] },

    { type: "h2", text: "Costs" },
    { type: "ul", items: [
      "**Latency**: at least two round trips plus durable log writes on every participant before the transaction completes.",
      "**Lock duration**: locks are held across network round trips, reducing concurrency.",
      "**Availability coupling**: every participant must be up for the transaction to commit; the system is as available as its least available participant.",
      "**Limited support**: many message brokers, NoSQL stores and third-party APIs don't support XA/2PC at all.",
    ] },

    { type: "h2", text: "Where 2PC is used today" },
    { type: "ul", items: [
      "**Inside distributed databases**: Spanner, CockroachDB, YugabyteDB and TiDB use 2PC across shards, with Paxos or Raft replicating each participant and the coordinator, so blocking is short and failures are masked.",
      "**XA transactions** between a relational database and a JMS broker in some enterprise systems.",
      "**Kafka transactions** use a 2PC-like protocol between partitions and a transaction coordinator to make produce-and-commit-offsets atomic.",
    ] },
    { type: "callout", text: "Between independently deployed microservices, prefer [sagas](/learn/saga-pattern) with compensations and the [outbox pattern](/learn/outbox-pattern). Use 2PC when atomicity is essential, the participants are few and support it, or it's hidden inside a database built for it." },
  ],
  uses: [
    { name: "Google Spanner", text: "Runs two-phase commit across Paxos groups for multi-shard transactions, giving global ACID transactions." },
    { name: "CockroachDB and YugabyteDB", text: "Use a 2PC variant with transaction records stored in Raft-replicated ranges." },
    { name: "Java EE / XA", text: "Application servers coordinated XA transactions across databases and message queues." },
    { name: "Kafka exactly-once", text: "A transaction coordinator commits writes across partitions and consumer offsets atomically." },
  ],
  interview: [
    "Explain prepare and commit phases and why the coordinator's logged decision matters.",
    "Name the blocking problem when the coordinator fails while participants are in doubt.",
    "Recommend sagas between microservices and keep 2PC for databases designed around it.",
    "Mention latency and lock duration as reasons 2PC limits throughput.",
  ],
  related: ["saga-pattern", "transactions-isolation-levels", "consensus", "acid-vs-base", "sharding"],
  practice: ["payment-platform", "geo-replicated-database", "key-value-store"],
};
