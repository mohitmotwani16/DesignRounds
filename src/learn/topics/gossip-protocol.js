export default {
  blocks: [
    { type: "p", text: "A **gossip protocol** spreads information through a cluster the way rumours spread through a crowd: every second or so, each node picks a few random peers and exchanges what it knows. No node talks to everyone and there's no central coordinator, yet information reaches every node in a number of rounds that grows only **logarithmically** with cluster size. Gossip is widely used for membership, failure detection and sharing cluster state." },

    { type: "h2", text: "How gossip spreads" },
    { type: "diagram", kind: "flow", caption: "Round by round, each informed node tells a few random peers. With fan-out 3, about 1,000 nodes learn an update in roughly 7 rounds.", nodes: [
      { id: "a", label: "Node A", sub: "round 0", col: 0, row: 1.5, tone: "accent" },
      { id: "b", label: "Node B", sub: "round 1", col: 1, row: 0.5, tone: "accent" },
      { id: "c", label: "Node C", sub: "round 1", col: 1, row: 2.5, tone: "accent" },
      { id: "d", label: "Node D", sub: "round 2", col: 2, row: 0, tone: "ok" },
      { id: "e", label: "Node E", sub: "round 2", col: 2, row: 1, tone: "ok" },
      { id: "f", label: "Node F", sub: "round 2", col: 2, row: 2, tone: "ok" },
      { id: "g", label: "Node G", sub: "round 2", col: 2, row: 3, tone: "ok" },
    ], edges: [
      { from: "a", to: "b" }, { from: "a", to: "c" }, { from: "b", to: "d" }, { from: "b", to: "e" }, { from: "c", to: "f" }, { from: "c", to: "g" },
    ] },
    { type: "ul", items: [
      "**Push**: informed nodes send updates to random peers. **Pull**: nodes ask random peers for anything new. **Push-pull** does both and converges fastest.",
      "Messages carry **versions** (a heartbeat counter or generation per node), so nodes keep the newest information and ignore stale gossip.",
      "Each node does a constant amount of work per round, so the protocol scales to thousands of nodes and tolerates many failures: there's no single path that can break.",
    ] },

    { type: "h2", text: "Failure detection" },
    { type: "p", text: "Deciding whether a node is dead is fundamentally uncertain: a slow node looks exactly like a dead one for a while. Two common approaches:" },
    { type: "ul", items: [
      "**Heartbeat gossip**: each node increments its own heartbeat counter and gossips everyone's counters. A node whose counter stops increasing for some time is suspected.",
      "**Phi accrual failure detector** (Cassandra, Akka): instead of a fixed timeout, compute a suspicion level φ from the statistical distribution of past heartbeat arrival times. Applications choose a threshold, so the detector adapts to network jitter instead of using one brittle timeout.",
      "**SWIM** (used by Consul and memberlist): nodes ping a random peer; if it doesn't answer, they ask a few other nodes to ping it indirectly before marking it suspect, which avoids false positives from one bad link. Suspicion and confirmed deaths are disseminated by piggybacking on the pings.",
    ] },

    { type: "h2", text: "Anti-entropy" },
    { type: "p", text: "Gossip is also used to repair data between replicas. Nodes periodically compare their data with a peer and exchange whatever differs. To avoid sending entire datasets, replicas compare **Merkle trees**, hash trees over key ranges: matching root hashes mean the ranges are identical; otherwise they descend only into the branches that differ. See [replication](/learn/replication)." },

    { type: "h2", text: "Trade-offs" },
    { type: "table", head: ["Strength", "Weakness"], rows: [
      ["No single point of failure or coordinator", "Eventually consistent: information takes several rounds to spread"],
      ["Scales to thousands of nodes", "Some redundant messages; bandwidth grows with state size"],
      ["Robust to node and link failures", "Non-deterministic timing makes testing harder"],
      ["Simple to implement", "Not suitable when every node must agree at once (use [consensus](/learn/consensus))"],
    ] },
  ],
  uses: [
    { name: "Apache Cassandra", text: "Nodes gossip membership, token ownership and state every second, and use phi accrual failure detection and Merkle-tree repair." },
    { name: "HashiCorp Consul and Serf", text: "Use SWIM-based gossip for cluster membership and failure detection across data centres." },
    { name: "Amazon S3 and DynamoDB internals", text: "Dynamo-style systems use gossip for membership and to spread partition ownership." },
    { name: "Blockchains", text: "Peer-to-peer networks propagate transactions and blocks with gossip between random peers." },
  ],
  interview: [
    "Use gossip for membership and failure detection in large clusters without a central coordinator.",
    "Explain why failure detection is uncertain and how phi accrual or SWIM's indirect probes reduce false positives.",
    "Mention Merkle trees for efficient anti-entropy between replicas.",
    "Contrast with consensus: gossip is eventually consistent and doesn't produce agreement.",
  ],
  related: ["consensus", "replication", "health-checks-failover", "consistent-hashing", "service-discovery"],
  practice: ["key-value-store", "distributed-cache", "service-discovery"],
};
