export default {
  blocks: [
    { type: "p", text: "A distributed system is one where a computer you didn't know existed can stop yours from working. The core difficulty is **partial failure**: some parts of the system work while others don't, and a node often can't tell whether a remote peer is slow, crashed, or cut off. The **fallacies of distributed computing** are eight assumptions that look reasonable on one machine and break across a network. Designing well starts with not making them." },

    { type: "h2", text: "Partial failure and uncertainty" },
    { type: "p", text: "On one machine, an operation usually either succeeds or the whole process crashes. Across a network, a request to another service can end in many ways, and the caller often can't distinguish them:" },
    { type: "diagram", kind: "sequence", caption: "After a timeout, the client can't know whether the request never arrived, the server crashed mid-way, or the work succeeded and only the reply was lost.", actors: ["Client", "Network", "Server"], steps: [
      { from: 0, to: 1, label: "charge ₹500" },
      { from: 1, to: 2, label: "delivered (or lost?)" },
      { note: "server may process, crash, or pause", over: [2] },
      { from: 2, to: 1, label: "OK (or lost?)", dashed: true },
      { note: "client times out: did it happen?", over: [0] },
    ] },
    { type: "p", text: "That uncertainty is why retries need [idempotency](/learn/idempotency), why timeouts are mandatory (see [timeouts and retries](/learn/retries-and-timeouts)), and why \"exactly once\" is so hard (see [delivery guarantees](/learn/delivery-semantics))." },

    { type: "h2", text: "The eight fallacies" },
    { type: "table", head: ["Fallacy", "Reality", "Design response"], rows: [
      ["The network is reliable", "Packets are lost, connections reset, switches fail", "Timeouts, retries with backoff, idempotent operations, acknowledgements"],
      ["Latency is zero", "Each hop costs milliseconds; cross-region costs tens to hundreds", "Avoid chatty calls, batch, cache, put data near users"],
      ["Bandwidth is infinite", "Large payloads saturate links and cost money", "Compress, paginate, send deltas, keep payloads small"],
      ["The network is secure", "Traffic can be observed or tampered with, even internally", "TLS everywhere, mutual authentication, zero-trust networking"],
      ["Topology doesn't change", "Instances come and go; IPs change; routes move", "[Service discovery](/learn/service-discovery), health checks, no hard-coded addresses"],
      ["There is one administrator", "Many teams, vendors and policies control parts of the path", "Clear contracts, defensive limits, observability across boundaries"],
      ["Transport cost is zero", "Serialisation, network egress and connection setup all cost CPU and money", "Efficient formats, connection reuse, colocating chatty services"],
      ["The network is homogeneous", "Different hardware, protocols, versions and clouds", "Standard protocols, versioned APIs, compatibility testing"],
    ] },

    { type: "h2", text: "Failure models" },
    { type: "p", text: "Distributed algorithms are designed against a **failure model**, a statement of what can go wrong. Weaker assumptions make algorithms harder but more realistic." },
    { type: "table", head: ["Model", "What a faulty node may do", "Typical handling"], rows: [
      ["Crash-stop", "Stop and never return", "Simplest model; rarely realistic on its own"],
      ["Crash-recovery", "Stop, then restart, possibly losing in-memory state", "Persist state durably, e.g. with a [write-ahead log](/learn/write-ahead-log); most databases and consensus systems assume this"],
      ["Omission", "Fail to send or receive some messages", "Retries, acknowledgements, timeouts"],
      ["Timing (performance)", "Respond, but too slowly, e.g. long GC pauses", "Timeouts, leases with [fencing](/learn/distributed-locks)"],
      ["Byzantine", "Behave arbitrarily or maliciously: send wrong or conflicting data", "Byzantine fault-tolerant protocols; needed in blockchains and some aerospace systems, rarely inside one company's datacenter"],
    ] },
    { type: "callout", tone: "tip", text: "A long garbage-collection or VM pause is the failure people forget: the node isn't dead, just frozen, and when it resumes it may act on stale beliefs, such as still thinking it's the leader. See [leader election](/learn/leader-election)." },

    { type: "h2", text: "Timing assumptions" },
    { type: "ul", items: [
      "**Synchronous systems** have known upper bounds on message delay and processing time. Real networks don't.",
      "**Asynchronous systems** have no timing bounds at all, which makes some problems impossible to solve deterministically. See [FLP impossibility](/learn/two-generals-and-flp).",
      "**Partially synchronous systems** behave synchronously most of the time but have periods of unbounded delay. This is the realistic model, and algorithms like [Raft](/learn/consensus) are safe always and live (make progress) when the network behaves.",
    ] },

    { type: "h2", text: "Practical habits" },
    { type: "ul", items: [
      "Give every remote call a timeout and decide what happens when it fires.",
      "Make operations safe to retry, and assume duplicates and reordering.",
      "Detect failures with heartbeats and timeouts, knowing they can be wrong. See [gossip and failure detection](/learn/gossip-protocol).",
      "Prefer designs where nodes can make progress independently and reconcile later, when correctness allows.",
      "Test failure: inject latency, drops and partitions. See [chaos engineering](/learn/chaos-engineering).",
    ] },
  ],
  uses: [
    { name: "Payments", text: "Uncertain outcomes after timeouts are resolved with idempotency keys and status queries, never blind retries." },
    { name: "Databases", text: "Crash-recovery assumptions drive write-ahead logging and replication protocols." },
    { name: "Microservices", text: "Timeouts, circuit breakers and service discovery address unreliable networks and changing topology." },
  ],
  interview: [
    "Explain partial failure and why a timeout doesn't tell you what happened.",
    "Name a few fallacies and the design response to each.",
    "State the failure model your design assumes (usually crash-recovery with partial synchrony).",
    "Mention process pauses as a realistic, often-ignored failure.",
  ],
  related: ["two-generals-and-flp", "retries-and-timeouts", "idempotency", "delivery-semantics", "consensus"],
  practice: ["key-value-store", "distributed-message-queue", "payment-platform"],
  reading: [
    { title: "Fallacies of distributed computing", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing" },
    { title: "Designing Data-Intensive Applications, chapter 8", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
  ],
};
