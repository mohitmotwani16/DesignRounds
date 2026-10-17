export default {
  blocks: [
    { type: "p", text: "Two classic results explain why agreement between machines is fundamentally hard. The **Two Generals Problem** shows that two parties communicating over an unreliable channel can never be certain they agree. The **FLP impossibility result** (Fischer, Lynch and Paterson, 1985) proves that in a fully asynchronous system, no deterministic algorithm can guarantee that nodes reach consensus if even one may crash. Real systems still agree every day, by changing the assumptions these proofs rely on." },

    { type: "h2", text: "The Two Generals Problem" },
    { type: "p", text: "Two armies on opposite hills must attack a city at the same time to win; attacking alone means defeat. They can only communicate by messengers who cross a valley where they may be captured. General A sends \"attack at dawn\". Even if it arrives, A doesn't know it arrived, so B sends an acknowledgement. But B doesn't know whether the acknowledgement arrived, so A must acknowledge the acknowledgement, and so on forever." },
    { type: "diagram", kind: "sequence", caption: "Every message needs confirmation, and the last message in any finite exchange might be lost, so neither side can ever be certain.", actors: ["General A", "General B"], steps: [
      { from: 0, to: 1, label: "attack at dawn?" },
      { from: 1, to: 0, label: "agreed (ack)" },
      { from: 0, to: 1, label: "got your ack" },
      { note: "...was that one lost?", over: [0, 1] },
    ] },
    { type: "p", text: "There is no protocol with a finite number of messages that guarantees both sides know they agree. The practical lesson: **you can't make an outcome certain over an unreliable network; you can only make uncertainty manageable**. That's why systems use idempotent retries, timeouts with status checks, and protocols where one party's decision is durable and the other can ask again." },
    { type: "callout", tone: "tip", text: "The same issue appears in every API call that times out. TCP doesn't solve it: a TCP acknowledgement tells you the bytes reached the other kernel, not that the application processed them." },

    { type: "h2", text: "FLP impossibility" },
    { type: "p", text: "Consensus means a set of nodes must agree on one value such that every non-faulty node decides (**termination**), all decide the same value (**agreement**), and the value was proposed by someone (**validity**). FLP proves that in an **asynchronous** model, where messages can be delayed arbitrarily long but not lost forever, and where nodes can't tell a crashed node from a slow one, **no deterministic algorithm can guarantee all three if even one node may crash**." },
    { type: "p", text: "Intuitively, the algorithm can always be kept undecided: just before it would commit, the one message that would tip the decision is delayed, and the algorithm can't distinguish \"delayed\" from \"crashed\" to move on." },

    { type: "h2", text: "How real systems get around it" },
    { type: "table", head: ["Approach", "Assumption relaxed", "Example"], rows: [
      ["Partial synchrony with timeouts", "The network is eventually well-behaved for long enough", "[Raft](/learn/consensus) and Paxos: always safe, make progress when timeouts are reasonable"],
      ["Randomisation", "Determinism", "Randomised election timeouts in Raft; randomised consensus algorithms that terminate with probability 1"],
      ["Failure detectors", "Perfect knowledge, replaced with an unreliable detector that's eventually accurate", "Heartbeat-based leader election"],
      ["Giving up consensus", "The need for agreement on one order", "[CRDTs](/learn/crdts) and eventually consistent stores that merge instead of agree"],
    ] },
    { type: "p", text: "The crucial design choice in practical consensus is to **never sacrifice safety**: two nodes must never decide different values, even in the worst network conditions. What's given up during bad periods is **liveness**: the cluster may stall without a leader until the network calms down. That's the right trade-off for a database or a lock service." },

    { type: "h2", text: "Related results" },
    { type: "ul", items: [
      "**CAP theorem:** during a network partition, a system must choose between consistency and availability. See [CAP theorem](/learn/cap-theorem).",
      "**Majority quorums:** consensus with crash faults needs a majority of nodes, so 2f + 1 nodes tolerate f failures. See [quorums](/learn/quorums).",
      "**Byzantine agreement** needs 3f + 1 nodes to tolerate f arbitrarily faulty ones.",
    ] },
  ],
  uses: [
    { name: "Consensus systems", text: "etcd, ZooKeeper and Consul stay safe in all conditions and rely on timeouts for progress, accepting brief stalls." },
    { name: "API design", text: "Idempotency keys and status endpoints exist because a client can never be sure a timed-out request failed." },
    { name: "Collaborative apps", text: "CRDT-based editors avoid needing agreement at all, so they keep working offline." },
  ],
  interview: [
    "Use the Two Generals Problem to explain why timeouts leave outcomes uncertain.",
    "State FLP precisely: asynchronous, deterministic, one crash failure.",
    "Explain how timeouts and randomisation let Raft and Paxos work in practice.",
    "Say that safety is never given up; liveness can pause.",
  ],
  related: ["fallacies-of-distributed-computing", "consensus", "cap-theorem", "quorums", "crdts"],
  practice: ["leader-election", "distributed-lock-service"],
  reading: [
    { title: "Impossibility of Distributed Consensus with One Faulty Process", publisher: "Fischer, Lynch and Paterson, JACM 1985", url: "https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf" },
    { title: "A Brief Tour of FLP Impossibility", publisher: "Paper Trail (Henry Robinson)", url: "https://www.the-paper-trail.org/post/2008-08-13-a-brief-tour-of-flp-impossibility/" },
  ],
};
