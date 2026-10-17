export default {
  blocks: [
    { type: "p", text: "The **CAP theorem** says that when a network **partition** splits a replicated data system, it must give up either **consistency** (every read sees the latest write) or **availability** (every request gets a non-error answer). It cannot keep both. It is often misquoted as \"pick two of three\"; the precise version is about what you do **during** a partition." },

    { type: "h2", text: "The three properties, precisely" },
    { type: "ul", items: [
      "**Consistency (C)**: here this means **linearizability**: every read returns the most recent completed write, as if there were one copy of the data. This is stronger than the C in ACID. See [consistency models](/learn/consistency-models).",
      "**Availability (A)**: every request to a non-failed node receives a response (not an error or a timeout), though it may not be the latest data.",
      "**Partition tolerance (P)**: the system keeps working when messages between nodes are lost or delayed indefinitely.",
    ] },
    { type: "p", text: "In any system spread over a network, partitions **will** happen: a switch fails, a cable is cut, a cloud zone loses connectivity, or a long GC pause looks like a partition. So P is not optional, and the real choice is **C or A when a partition occurs**." },

    { type: "h2", text: "What a partition forces" },
    { type: "diagram", kind: "flow", caption: "The link between the replicas is broken. A write reaches node 1. Should node 2 answer reads with stale data (AP) or refuse (CP)?", nodes: [
      { id: "c1", label: "Client A", sub: "write x = 2", col: 0, row: 0, shape: "pill" },
      { id: "n1", label: "Node 1", sub: "x = 2", col: 0.95, row: 0, shape: "db", tone: "store" },
      { id: "n2", label: "Node 2", sub: "x = 1 (stale)", col: 2.85, row: 0, shape: "db", tone: "store" },
      { id: "c2", label: "Client B", sub: "read x", col: 3.8, row: 0, shape: "pill" },
      { id: "cut", label: "partition", col: 1.9, row: 0, tone: "danger", shape: "pill", w: 110 },
    ], edges: [
      { from: "c1", to: "n1" }, { from: "c2", to: "n2" },
      { from: "n1", to: "cut", dashed: true, tone: "danger" }, { from: "n2", to: "cut", dashed: true, tone: "danger" },
    ] },
    { type: "ul", items: [
      "**CP choice**: node 2 can't confirm it has the latest value, so it returns an error or waits. The system stays correct but part of it is unavailable. Typically the side holding a majority of replicas keeps serving.",
      "**AP choice**: node 2 answers with x = 1. Everyone gets an answer, but some answers are stale, and if both sides accept writes, the conflicting writes must be reconciled when the partition heals.",
    ] },

    { type: "h2", text: "CP and AP systems in practice" },
    { type: "table", head: ["Leaning", "Behaviour in a partition", "Examples", "Good for"], rows: [
      ["CP", "Minority side rejects requests; no stale or conflicting data", "etcd, ZooKeeper, Consul, Spanner, HBase, MongoDB with majority writes", "Config, leader election, locks, money, inventory counts"],
      ["AP", "All sides keep serving; reconcile later", "Cassandra, DynamoDB (eventually consistent reads), Riak, CouchDB, DNS", "Shopping carts, feeds, likes, sessions, telemetry"],
    ] },
    { type: "p", text: "Many databases let you choose **per request**. Cassandra and DynamoDB use tunable quorums: reading and writing at QUORUM behaves more like CP, ONE behaves like AP. See [replication](/learn/replication)." },

    { type: "h2", text: "PACELC: the trade-off you face every day" },
    { type: "p", text: "Partitions are rare, but replication has a cost all the time. **PACELC** extends CAP: if there is a **P**artition, choose **A** or **C**; **E**lse, in normal operation, choose **L**atency or **C**onsistency." },
    { type: "ul", items: [
      "Waiting for a write to reach a majority of replicas, possibly in another region, makes it **consistent but slower**.",
      "Acknowledging after one replica and replicating in the background is **fast but briefly inconsistent**.",
    ] },
    { type: "table", head: ["System", "PACELC class", "Meaning"], rows: [
      ["DynamoDB, Cassandra (defaults)", "PA/EL", "Favour availability in partitions and low latency otherwise"],
      ["Spanner, etcd, ZooKeeper", "PC/EC", "Pay latency for consistency, always"],
      ["MongoDB (typical config)", "PA/EC-ish", "Consistent reads from the primary; tunable"],
    ] },

    { type: "h2", text: "Common misconceptions" },
    { type: "ul", items: [
      "**\"Pick any two.\"** You can't choose CA for a distributed system; partitions happen whether you like it or not. A single-node database is \"CA\" only because there's nothing to partition.",
      "**\"AP means no consistency.\"** AP systems are usually **eventually consistent** and often offer stronger guarantees like read-your-writes per session.",
      "**\"CP means always unavailable.\"** CP systems are unavailable only on the minority side of a partition, and only for strongly consistent operations.",
      "**The C in CAP is not the C in ACID.** ACID consistency means invariants hold after a transaction; CAP consistency is about replicas agreeing. See [ACID vs BASE](/learn/acid-vs-base).",
    ] },
  ],
  uses: [
    { name: "Amazon's shopping cart (Dynamo)", text: "Chose availability: the cart always accepts \"add to cart\", and conflicting versions are merged, because a lost sale costs more than a duplicated item." },
    { name: "Kubernetes and etcd", text: "Cluster state lives in etcd, a CP store using Raft: a minority partition can't change cluster state, which prevents split-brain decisions." },
    { name: "Google Spanner", text: "Chooses consistency and uses synchronized clocks (TrueTime) and Paxos to keep latency acceptable for global strongly consistent transactions." },
    { name: "DNS", text: "A classic AP system: updates propagate slowly through caches, but lookups keep working through outages." },
  ],
  interview: [
    "Don't recite \"pick two\"; say \"partitions happen, so for this data we choose consistency (or availability) during a partition, because…\".",
    "Make the choice per piece of data: payments and inventory CP, likes and feeds AP.",
    "Bring up PACELC when discussing multi-region writes: synchronous cross-region replication costs latency on every write.",
    "Explain what users see in each mode: errors and retries for CP, stale or conflicting data for AP, and how conflicts are resolved.",
  ],
  related: ["consistency-models", "replication", "consensus", "acid-vs-base", "availability"],
  practice: ["key-value-store", "geo-replicated-database", "ticket-booking"],
};
