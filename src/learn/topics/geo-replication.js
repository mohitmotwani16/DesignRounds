export default {
  blocks: [
    { type: "p", text: "**Geo-replication** keeps copies of data in several geographic regions so users get low latency wherever they are, and the system survives the loss of an entire region. The hard part is that light takes tens to hundreds of milliseconds to cross continents, so every design chooses how much consistency to pay for in latency: **single-leader** setups keep one region authoritative, **multi-leader** setups let every region accept writes and resolve conflicts, and **consensus-based** setups make every write wait for a cross-region majority." },
    {"type":"diagram","kind":"flow","caption":"Single-leader geo-replication: reads stay in the user's region, writes cross to the primary, and each replica lags by the replication delay.","nodes":[{"id":"us","label":"US users","col":0,"row":0},{"id":"eu","label":"EU users","col":0,"row":2},{"id":"east","label":"us-east","sub":"primary","col":1,"row":0,"shape":"db","tone":"store"},{"id":"west","label":"eu-west","sub":"replica","col":1,"row":2,"shape":"db","tone":"cache"},{"id":"south","label":"ap-south","sub":"replica","col":2,"row":1,"shape":"db","tone":"cache"}],"edges":[{"from":"us","to":"east","label":"reads, writes"},{"from":"eu","to":"west","label":"reads"},{"from":"eu","to":"east","label":"writes","dashed":true},{"from":"east","to":"west","label":"async"},{"from":"east","to":"south","label":"async"}]},

    { type: "h2", text: "The physics" },
    { type: "table", head: ["Path", "Approximate round trip"], rows: [
      ["Within a data centre", "Under 1 ms"],
      ["Between zones in one region", "1-2 ms"],
      ["Mumbai to Singapore", "~60-70 ms"],
      ["Mumbai to Frankfurt", "~110-130 ms"],
      ["Mumbai to US East", "~190-220 ms"],
    ] },
    { type: "p", text: "Any write that must be acknowledged by another continent before success inherits that delay. That's the cost the PACELC framing describes: even without a partition, you trade latency for consistency. See [CAP and PACELC](/learn/cap-theorem)." },

    { type: "h2", text: "Replication topologies" },
    { type: "table", head: ["Topology", "Writes go to", "Read freshness", "Region failure", "Conflicts"], rows: [
      ["Single leader, async followers", "One region", "Followers may lag seconds", "Promote a follower; may lose recent writes", "None"],
      ["Single leader per partition (data homed by user)", "The user's home region", "Fresh at home, lagging elsewhere", "Fail over that partition's leader", "None, if each key has one home"],
      ["Multi-leader", "Any region", "Each region sees its own writes first", "Other regions keep accepting writes", "Must be resolved"],
      ["Consensus across regions", "A cross-region majority", "Linearizable", "Survives a minority of regions", "None, but slow writes"],
    ] },

    { type: "h2", text: "Conflict resolution in multi-leader setups" },
    { type: "p", text: "If two regions update the same record during the same window, both writes succeed locally and conflict when they replicate. Options:" },
    { type: "ul", items: [
      "**Last-write-wins** by timestamp: simple, loses one write, sensitive to clock skew.",
      "**Avoid conflicts by design:** home each record (each user, each tenant) in one region so only that region writes it.",
      "**Merge with CRDTs** for counters, sets and collaborative data. See [CRDTs](/learn/crdts).",
      "**Application-level resolution:** keep both versions and resolve with domain rules or the user.",
    ] },
    { type: "callout", tone: "warning", text: "Invariants like \"don't oversell the last seat\" or \"balance can't go negative\" can't be enforced by two regions independently. Route those operations to one authoritative region or use cross-region consensus." },

    { type: "h2", text: "Reading your own writes across regions" },
    { type: "p", text: "A user updates their profile through a nearby region, then a request is served by another region whose replica hasn't caught up, and the old profile appears. Fixes include routing a user to their home region for a while after a write, tracking the replication position the user has seen and waiting until the replica reaches it, or reading from the leader for that user's own data. See [consistency models](/learn/consistency-models)." },

    { type: "h2", text: "Data residency and sovereignty" },
    { type: "p", text: "Laws and contracts may require some data, such as personal or financial records, to stay within a country or region. Geo-partitioning puts each record's authoritative copy (and sometimes all copies) in its required region, while shared, non-sensitive data replicates globally. Plan this into the data model; it's hard to retrofit." },

    { type: "h2", text: "Failover between regions" },
    { type: "ul", items: [
      "Decide the **RPO** (how much recent data can be lost) and **RTO** (how fast service must return) per dataset. Asynchronous replication means a non-zero RPO. See [disaster recovery](/learn/disaster-recovery).",
      "Automate failover, but guard against **split brain**: two regions both believing they're the leader after a partition. Use a consensus-based arbiter or fencing. See [leader election](/learn/leader-election).",
      "Practise regional failover regularly with game days. See [chaos engineering](/learn/chaos-engineering).",
    ] },
  ],
  uses: [
    { name: "Global consumer apps", text: "Users are homed to the nearest region; their data's leader lives there, with async copies elsewhere for reads and disaster recovery." },
    { name: "Collaborative tools", text: "Multi-leader replication with CRDT merges keeps editing fast in every region." },
    { name: "Financial systems", text: "Cross-region consensus or a single authoritative region protects balances, accepting higher write latency." },
  ],
  interview: [
    "Quote rough cross-region latencies and what they mean for synchronous writes.",
    "Choose a topology per dataset: homed single-leader, multi-leader or consensus.",
    "Explain conflict resolution and which invariants need a single authority.",
    "Cover read-your-writes, data residency and regional failover with RPO and RTO.",
  ],
  related: ["replication", "distributed-sql", "crdts", "disaster-recovery", "consistency-models"],
  practice: ["geo-replicated-database", "multi-region"],
  reading: [
    { title: "Designing Data-Intensive Applications, chapter 5", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
    { title: "Disaster recovery options in the cloud", publisher: "AWS Whitepaper", url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" },
  ],
};
