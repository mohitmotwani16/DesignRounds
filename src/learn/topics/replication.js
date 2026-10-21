export default {
  blocks: [
    { type: "p", text: "**Replication** keeps copies of the same data on several machines. It serves three goals: **availability** (if one copy dies, others serve), **read scaling** (spread reads over copies) and **latency** (keep a copy near users). The hard part is keeping copies in sync while data changes, and the main designs differ in **who accepts writes**." },

    { type: "p", text: "Each machine holding a copy is a **replica** (or node). If data never changed, replication would be trivial: copy it once and you're done. The difficulty is **mutable** data: every change must reach every replica while you keep the consistency, availability and performance you need. Terminology: **leader = primary**, **follower = secondary = replica**." },
    { type: "h2", text: "Which replication does my database use?" },
    { type: "ul", items: [
      "**Most relational databases default to single-leader replication.** One source of truth makes conflict resolution far simpler. The weak point is the leader failing: a new leader must be elected, and if a network partition splits the remaining nodes, two leaders could be elected (**split brain**). Most systems therefore use [consensus algorithms](/learn/consensus) for leader election.",
      "**Dynamo-style databases** (Amazon's original Dynamo, Cassandra, Riak) use **leaderless** replication.",
      "**Multi-region cloud databases differ in how they take writes.** DynamoDB global tables are genuinely **multi-leader**: every region accepts writes. Google Spanner multi-region keeps a single Paxos leader per data split, replicated to synchronous voting replicas, and Azure SQL active geo-replication has one primary with asynchronous readable secondaries; neither accepts writes in more than one region at once, so neither is multi-leader. See [geo-replication](/learn/geo-replication).",
      "**Managed services** handle much of it for you: Amazon RDS includes automated backups and replication, and Cloud SQL replicates managed MySQL and PostgreSQL across zones. It's still worth knowing what happens underneath.",
    ] },
    { type: "h2", text: "Leader-follower (primary-replica)" },
    { type: "p", text: "One node, the **leader**, accepts all writes and streams changes (its write-ahead log or a change log) to **followers**, which serve reads. This is the default for PostgreSQL, MySQL, MongoDB replica sets, Redis and Kafka partitions." },
    { type: "diagram", kind: "flow", caption: "Writes go to the leader; followers replay its log and serve reads. Asynchronous followers may lag behind.", nodes: [
      { id: "app", label: "App servers", col: 0, row: 1, shape: "pill" },
      { id: "l", label: "Leader", sub: "all writes", col: 1.3, row: 1, shape: "db", tone: "accent" },
      { id: "f1", label: "Follower 1", sub: "sync", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "f2", label: "Follower 2", sub: "async, ~100 ms lag", col: 2.6, row: 1, shape: "db", tone: "store" },
      { id: "f3", label: "Follower 3", sub: "other region", col: 2.6, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "app", to: "l", label: "writes" }, { from: "l", to: "f1", label: "WAL stream" }, { from: "l", to: "f2", dashed: true }, { from: "l", to: "f3", dashed: true },
      { from: "app", to: "f2", label: "reads", bend: 60 },
    ] },
    { type: "h3", text: "Replication logs" },
    { type: "p", text: "The leader tells followers what changed through a **replication log**. There are three kinds:" },
    { type: "ul", items: [
      "**Statement-based logs** record the exact SQL that changed data, e.g. `INSERT INTO students (name, age) VALUES ('John', 15);`, `UPDATE students SET age = 16 WHERE name = 'John';`. Simple, but non-deterministic statements (`NOW()`, `RAND()`, auto-increments) can produce different results on each replica.",
      "**Write-ahead logs (physical)** record changes at the **byte** level, in a form only the storage engine understands; other applications can't easily read them. PostgreSQL ships its WAL to replicas. MySQL's equivalent physical log is the **redo log**, used for crash recovery, but MySQL replication doesn't ship it; it uses the binlog. Physical logs are fast and compact but tie leader and followers to the same engine version. See [write-ahead logging](/learn/write-ahead-log).",
      "**Logical (row-based) logs** describe each change in terms of rows: all new column values for an insert, enough to identify the row (usually the primary key) for a delete, and the row's identity plus new values for an update. Examples: MySQL's **binlog** (row format) and PostgreSQL's **logical decoding**. They're independent of the storage engine, so other applications can parse them, which is why [change data capture](/learn/change-data-capture) uses them.",
    ] },
    { type: "code", code: `# A PostgreSQL WAL record (pg_waldump): byte-level, engine-specific
rmgr: Heap  len (rec/tot): 24/24, tx: 5828, lsn: 0/016F4130, prev 0/016F410C,
desc: INSERT+INIT off 3, xmax 0, xmin 5828, cmin 0, cmax 0, blkref #0: rel 1663/16384/1259 blk 0

# The same kind of change in a logical log: readable by any consumer
{"op": "insert", "table": "students", "after": {"id": 7, "name": "John", "age": 15}}` },
    { type: "h3", text: "Synchronous vs asynchronous" },
    { type: "p", text: "With **asynchronous** replication the leader sends the log without waiting for acknowledgment: fast, but if the leader dies before any follower has the change, that write is lost. With **synchronous** replication the leader waits for followers to confirm before treating the write as done: followers match the leader, but one slow or crashed follower blocks every new write, so fully synchronous replication is rarely practical. Most setups are configured **async** for performance." },
    { type: "diagram", kind: "sequence", caption: "Synchronous vs asynchronous: the sync leader acknowledges only after the follower confirms; the async leader acknowledges immediately and replicates afterwards.", actors: ["Client", "Leader", "Follower"], steps: [
      { note: "synchronous", over: [0, 2] },
      { from: 0, to: 1, label: "write" },
      { from: 1, to: 2, label: "replicate" },
      { from: 2, to: 1, label: "ack", dashed: true },
      { from: 1, to: 0, label: "ok (follower has it)", dashed: true },
      { note: "asynchronous", over: [0, 2] },
      { from: 0, to: 1, label: "write" },
      { from: 1, to: 0, label: "ok (leader only)", dashed: true },
      { from: 1, to: 2, label: "replicate later" },
    ] },
    { type: "table", head: ["", "Synchronous", "Asynchronous"], rows: [
      ["Write acknowledged after", "At least one follower has it", "The leader alone has it"],
      ["Data loss if leader dies", "None (for the sync follower)", "The last writes not yet replicated"],
      ["Write latency", "Higher (waits for a network round trip)", "Lowest"],
      ["If the follower is slow or down", "Writes stall (unless you fall back)", "No effect on writes"],
    ] },
    { type: "p", text: "A common compromise is **semi-synchronous**: wait for one follower, replicate to the rest asynchronously." },
    { type: "p", text: "MySQL is asynchronous by default and has no fully synchronous mode out of the box, but its **semi-synchronous** plugin waits for at least one replica to receive and log each transaction before the commit completes, so at least one replica always matches the primary. It costs some write latency; choose it by how much data loss you can tolerate. Enable it in `my.cnf` and restart each server:" },
    { type: "code", code: `# Primary: my.cnf
[mysqld]
plugin-load-add = semisync_source.so
rpl_semi_sync_source_enabled = 1
rpl_semi_sync_source_timeout = 1000      # ms; falls back to async if no replica acks

# Each replica: my.cnf
[mysqld]
plugin-load-add = semisync_replica.so
rpl_semi_sync_replica_enabled = 1

# (MySQL before 8.0.26 names these semisync_master.so / rpl_semi_sync_master_* and
#  semisync_slave.so / rpl_semi_sync_slave_*)` },
    { type: "h3", text: "Replication lag and its anomalies" },
    { type: "p", text: "Async followers can be milliseconds or, under load, seconds behind. Reading from them causes the anomalies described in [consistency models](/learn/consistency-models): a user not seeing their own update, or data appearing and disappearing. Fixes include reading your own recent writes from the leader and routing a session to one follower." },
    { type: "h3", text: "Failover" },
    { type: "p", text: "When the leader dies, a follower is promoted. The hard parts: detecting real failure versus a slow network, choosing the most up-to-date follower, making clients write to the new leader, and preventing the old leader from accepting writes if it comes back (**split brain**). Robust systems use a consensus service or [leader election](/learn/leader-election) with fencing for this." },

    { type: "p", text: "Nodes go down for hardware failures or just routine updates. The two cases differ:" },
    { type: "ul", items: [
      "**A follower goes down**: it keeps its position in its local log, so when it returns it asks the leader for every change since that point, applies them, and carries on once caught up.",
      "**The leader goes down**: a follower must be promoted and every follower must switch to it (**failover**). Manual failover is simpler because a human decides. Automatic failover has three steps: confirm the leader is dead (say, unreachable for 30 seconds), elect a new leader (a consensus problem; see [leader election](/learn/leader-election)), and reconfigure clients and followers to use it.",
      "**What goes wrong**: the old leader comes back still believing it's the leader and must learn it isn't; or two nodes both believe they lead (**split brain**), both accept writes, and followers receive conflicting updates. Consensus algorithms and fencing tokens exist to prevent this.",
    ] },
    { type: "h3", text: "Try it: leader-follower replication with Redis" },
    { type: "p", text: "Start a primary on the default port and a replica that follows it (or run both with `docker run redis:7`):" },
    { type: "code", code: `redis-server                                           # primary on 6379
redis-server --port 6380 --replicaof 127.0.0.1 6379    # replica following it` },
    { type: "code", code: `import redis

primary = redis.Redis(host="localhost", port=6379, decode_responses=True)
replica = redis.Redis(host="localhost", port=6380, decode_responses=True)

primary.set("key", "value")                        # write only to the primary
print("Primary node value:", primary.get("key"))   # value
print("Replica node value:", replica.get("key"))   # value: it was replicated

try:
    replica.set("key", "other")                    # replicas are read-only
except redis.exceptions.ReadOnlyError as err:
    print(err)        # You can't write against a read only replica.` },
    { type: "p", text: "The replica's log shows it syncing on start (`PRIMARY <-> REPLICA sync started` … `Successful partial resynchronization with primary`). Stop the primary briefly, as a network partition would, and the replica logs `PRIMARY timeout: no data nor PING received`, `Connection with primary lost`, then keeps reconnecting and resynchronizes from where it left off as soon as the primary is reachable. Plain replication doesn't promote the replica; that's what Redis Sentinel or Redis Cluster add (see [cache high availability](/learn/cache-high-availability))." },
    { type: "h2", text: "Multi-leader replication" },
    { type: "p", text: "Several nodes accept writes, typically **one leader per region**, and replicate to each other. Users write locally with low latency, and each region keeps working if another is cut off." },
    { type: "p", text: "The cost is **write conflicts**: two regions can change the same record concurrently. Resolution strategies include last-write-wins (simple, silently loses data), merging (for example with CRDTs), or routing all writes for a given record to one \"home\" region to avoid conflicts entirely." },

    { type: "h2", text: "Leaderless replication and quorums" },
    { type: "p", text: "In Dynamo-style systems (Cassandra, Riak, DynamoDB internally), clients or a coordinator write to **N** replicas and wait for **W** acknowledgements; reads query **R** replicas and take the newest version. If **R + W > N**, every read set overlaps every write set, so a read sees the latest acknowledged write." },
    { type: "table", head: ["N / W / R", "Behaviour"], rows: [
      ["3 / 2 / 2", "Balanced: tolerates one slow or down replica for both reads and writes"],
      ["3 / 3 / 1", "Fast reads, but writes fail if any replica is down"],
      ["3 / 1 / 1", "Fastest and most available, but reads may be stale (eventual consistency)"],
    ] },
    { type: "p", text: "Stale replicas are repaired by **read repair** (fix replicas found stale during a read), **hinted handoff** (another node holds writes for a down replica and delivers them later) and **anti-entropy** (background comparison using Merkle trees)." },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Leader-follower", "Multi-leader", "Leaderless"], rows: [
      ["Writes accepted by", "One leader", "Several leaders", "Any replica (quorum)"],
      ["Write conflicts", "None", "Yes: must resolve", "Yes: versioning and repair"],
      ["Failover", "Promote a follower", "Other leaders continue", "No failover needed"],
      ["Typical use", "Most OLTP databases", "Multi-region writes, offline-capable apps", "High-availability key-value and wide-column stores"],
    ] },
  ],
  uses: [
    { name: "PostgreSQL and MySQL", text: "Primary with streaming replicas for read scaling and failover, often managed by tools like Patroni or cloud services like RDS and Aurora." },
    { name: "Cassandra and DynamoDB", text: "Leaderless-style replication with tunable consistency per request (ONE, QUORUM, ALL)." },
    { name: "Kafka", text: "Each partition has a leader and in-sync replicas; producers with acks=all wait for the in-sync set before a write counts." },
    { name: "Google Docs and Notion offline", text: "Client devices act like extra leaders that sync later, a form of multi-leader replication with conflict merging." },
  ],
  interview: [
    "Add read replicas for read-heavy systems, then immediately address replication lag and read-your-writes.",
    "Say whether replication is sync or async and what data could be lost on failover.",
    "For multi-region writes, explain how conflicts are avoided or resolved.",
    "Use R + W > N when proposing quorum reads and writes.",
  ],
  related: ["consistency-models", "sharding", "cap-theorem", "leader-election", "consensus", "disaster-recovery"],
  practice: ["key-value-store", "geo-replicated-database", "multi-region", "distributed-message-queue"],
  reading: [
    { title: "Global tables: multi-active, multi-Region replication", publisher: "AWS DynamoDB docs", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html" },
    { title: "Spanner instance configurations", publisher: "Google Cloud docs", url: "https://cloud.google.com/spanner/docs/instance-configurations" },
    { title: "Active geo-replication overview", publisher: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/azure/azure-sql/database/active-geo-replication-overview?view=azuresql" },
  ],
};
