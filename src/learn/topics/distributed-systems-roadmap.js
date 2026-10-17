export default {
  blocks: [
    { type: "p", text: "This **distributed systems roadmap** is an ordered path through the ideas behind databases, message queues and coordination services: why partial failure makes everything hard, how data is replicated and partitioned, how machines order events without a shared clock, how they agree through consensus, how replicas detect failures and repair themselves, and how real systems such as Dynamo-style stores, distributed SQL databases and collaborative editors combine these pieces." },
    { type: "callout", tone: "tip", text: "Distributed systems interviews are less about naming algorithms and more about failure scenarios. For each step, practise answering: what happens if this message is lost, delayed, duplicated, or arrives after a node restarts?" },

    { type: "roadmap", id: "distributed-systems" },

    { type: "h2", text: "Why the order matters" },
    { type: "p", text: "Each step answers a problem created by the one before it. Replication creates the question of which copy is correct, so you need [consistency models](/learn/consistency-models) and [quorums](/learn/quorums). Partitioning creates [hot partitions](/learn/hot-partitions). Many replicas accepting writes create ordering problems, which is why [clocks](/learn/clocks-and-ordering) come before [consensus](/learn/consensus). And once you understand all of them, systems like [Dynamo](/learn/dynamo-style-key-value-store) and [Spanner-style databases](/learn/distributed-sql) read as a set of choices rather than magic." },

    { type: "h2", text: "Key trade-offs to be able to argue" },
    { type: "table", head: ["Trade-off", "One side", "Other side", "Guide"], rows: [
      ["Consistency vs availability under partition", "Refuse requests to stay correct (CP)", "Answer with possibly stale data (AP)", "[CAP theorem](/learn/cap-theorem)"],
      ["Latency vs consistency without partitions", "Wait for a quorum or leader", "Read the nearest replica", "[Geo-replication](/learn/geo-replication)"],
      ["Coordination vs convergence", "Agree on one order with consensus", "Merge concurrent updates with CRDTs", "[CRDTs](/learn/crdts)"],
      ["Atomic commit vs autonomy", "Two-phase commit across services", "Sagas with compensation", "[Sagas](/learn/saga-pattern)"],
    ] },

    { type: "h2", text: "A six-week plan" },
    { type: "ol", items: [
      "**Week 1:** step 1. Write down every way a single RPC can fail and what the caller can and can't know afterwards.",
      "**Week 2:** steps 2 and 3. Work through N, R and W choices for a store, and design the [key-value store round](/system-design/key-value-store).",
      "**Week 3:** step 4. Explain why wall clocks can't order writes, and design the [unique ID generator](/system-design/unique-id-generator).",
      "**Week 4:** step 5. Walk through a Raft leader failure step by step, then design a [lock service](/system-design/distributed-lock-service) with fencing.",
      "**Week 5:** steps 6 and 7. Explain how two replicas find which keys differ, and when you'd accept a saga over 2PC.",
      "**Week 6:** step 8. Design a [distributed message queue](/system-design/distributed-message-queue) and a [geo-replicated database](/system-design/geo-replicated-database).",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "Do I need to read research papers?" },
    { type: "p", text: "Not for most interviews, but the Dynamo, Raft and Spanner papers are readable and worth it for senior storage or infrastructure roles. The guides here explain their ideas and link the originals." },
    { type: "h3", text: "Is this roadmap only for database engineers?" },
    { type: "p", text: "No. Any backend engineer whose services talk over a network benefits from steps 1 to 5. Steps 6 to 8 matter most for storage, infrastructure and platform roles." },
  ],
  related: ["fallacies-of-distributed-computing", "replication", "quorums", "consensus", "crdts"],
  practice: ["key-value-store", "unique-id-generator", "distributed-message-queue", "geo-replicated-database"],
  reading: [
    { title: "Dynamo: Amazon's Highly Available Key-value Store", publisher: "All Things Distributed (Werner Vogels)", url: "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html" },
    { title: "The Raft Consensus Algorithm", publisher: "raft.github.io", url: "https://raft.github.io/" },
    { title: "Consistency Models", publisher: "Jepsen", url: "https://jepsen.io/consistency" },
  ],
};
