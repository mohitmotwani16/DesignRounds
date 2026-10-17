export default {
  blocks: [
    { type: "p", text: "**Disaster recovery (DR)** is how a system comes back after a major failure: a region outage, data corruption, a deleted database, ransomware. It's defined by two numbers: **RPO**, how much data you can afford to lose, and **RTO**, how long you can afford to be down. The DR strategy you need, and what it costs, follows from those targets." },

    { type: "h2", text: "RPO and RTO" },
    { type: "ul", items: [
      "**Recovery point objective (RPO)**: the maximum acceptable data loss, measured in time. RPO = 1 hour means losing the last hour of writes is tolerable; RPO = 0 means no committed write may be lost.",
      "**Recovery time objective (RTO)**: the maximum acceptable downtime before service is restored.",
    ] },
    { type: "p", text: "Different parts of a system deserve different targets: a payments ledger may need RPO ≈ 0 and RTO in minutes, while an analytics warehouse can tolerate RPO = 24 hours and RTO = a day." },

    { type: "h2", text: "DR strategies, from cheap to expensive" },
    { type: "table", head: ["Strategy", "How it works", "Typical RPO", "Typical RTO", "Cost"], rows: [
      ["**Backup and restore**", "Regular backups copied to another region; rebuild everything on disaster", "Hours (since last backup)", "Hours to days", "$"],
      ["**Pilot light**", "Data continuously replicated; minimal core services idle in the standby region", "Minutes", "Tens of minutes to hours", "$$"],
      ["**Warm standby**", "A scaled-down full copy running in the standby region, scaled up on failover", "Seconds to minutes", "Minutes", "$$$"],
      ["**Active-active (multi-site)**", "Two or more regions serve traffic all the time", "~0 to seconds", "Seconds to minutes (reroute traffic)", "$$$$"],
    ] },
    { type: "diagram", kind: "flow", caption: "Warm standby: the primary region serves traffic and replicates data asynchronously; on disaster, DNS shifts users to the standby, which scales up.", nodes: [
      { id: "users", label: "Users", col: 0, row: 0.5, shape: "pill" },
      { id: "dns", label: "DNS failover", sub: "health-checked", col: 1, row: 0.5, tone: "accent" },
      { id: "app1", label: "App (full scale)", col: 2, row: 0 },
      { id: "db1", label: "Primary DB", col: 3, row: 0, shape: "db", tone: "store" },
      { id: "app2", label: "App (2 instances)", col: 2, row: 1, tone: "muted" },
      { id: "db2", label: "Replica DB", sub: "async, ~seconds behind", col: 3, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "users", to: "dns" }, { from: "dns", to: "app1" }, { from: "dns", to: "app2", dashed: true, label: "on failover" },
      { from: "app1", to: "db1" }, { from: "app2", to: "db2" }, { from: "db1", to: "db2", dashed: true, label: "replication" },
    ], zones: [{ label: "Primary region", from: [2, 0], to: [3, 0], tone: "accent" }, { label: "Standby region", from: [2, 1], to: [3, 1] }] },

    { type: "h2", text: "Backups: the last line of defence" },
    { type: "p", text: "Replication protects against machines and regions failing, but it faithfully copies mistakes too: a `DROP TABLE` or corrupting bug reaches every replica in milliseconds. Only **backups** let you go back in time." },
    { type: "ul", items: [
      "**Point-in-time recovery**: full snapshots plus continuous write-ahead log archiving let you restore to any second (PostgreSQL PITR, RDS, Aurora).",
      "**3-2-1 rule**: 3 copies, on 2 different media or services, 1 offsite (another region or account).",
      "**Immutable and isolated backups**: write-once storage (object lock) in a separate account, so ransomware or a compromised admin can't delete them.",
      "**Test restores regularly**. An untested backup is a hope, not a plan; measure how long a full restore takes (it's part of your RTO).",
    ] },

    { type: "h2", text: "Multi-region considerations" },
    { type: "ul", items: [
      "**Data replication across regions** is usually asynchronous (synchronous adds the cross-region round trip to every write), so RPO is a few seconds unless you pay that latency. See [replication](/learn/replication) and [CAP / PACELC](/learn/cap-theorem).",
      "**Traffic steering** with DNS or anycast; DNS TTLs and client caching add to RTO. See [DNS](/learn/dns).",
      "**Avoid hidden single-region dependencies**: auth, secrets, CI/CD, monitoring and the DNS provider itself must survive the regional failure too.",
      "**Capacity**: the surviving region must absorb the failed region's traffic; reserve capacity or be ready to shed load.",
      "**Failback**: plan how to return to the primary region after recovery, including resyncing data written during the failover.",
    ] },

    { type: "h2", text: "Practise failure" },
    { type: "p", text: "Run regular **DR drills** and game days: fail over a region on purpose, restore a database from backup, revoke a critical credential. Write runbooks, automate the steps, and measure the actual RPO and RTO you achieve against the targets." },
  ],
  uses: [
    { name: "Netflix", text: "Runs active-active across multiple AWS regions and regularly evacuates a whole region to prove it can (Chaos Kong exercises)." },
    { name: "Banks and payment networks", text: "Keep synchronous or near-synchronous replicas in a second data centre to meet near-zero RPO for transactions." },
    { name: "GitLab's 2017 incident", text: "An accidental deletion revealed that several backup mechanisms weren't working; a public lesson in testing restores." },
    { name: "AWS Aurora Global Database", text: "Replicates across regions with typically under a second of lag and supports promoting a secondary region in about a minute." },
  ],
  interview: [
    "Ask for or propose RPO and RTO per part of the system, then pick the matching DR strategy.",
    "Distinguish replication (survives hardware/region loss) from backups (survives bad writes and deletes).",
    "For multi-region, discuss async replication lag, traffic steering and hidden single-region dependencies.",
    "Mention testing restores and failover drills.",
  ],
  related: ["availability", "replication", "health-checks-failover", "dns", "cap-theorem", "object-storage"],
  practice: ["multi-region", "geo-replicated-database", "payment-platform"],
};
