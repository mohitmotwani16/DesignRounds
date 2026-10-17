export default {
  blocks: [
    { type: "p", text: "A **distributed lock** ensures that only one process, across many machines, works on a shared resource at a time: processing an order, renewing a certificate, running a migration. Unlike a lock inside one process, it must survive crashes, network partitions and pauses, which makes \"exactly one holder\" much harder than it sounds." },

    { type: "h2", text: "Two reasons to lock" },
    { type: "ul", items: [
      "**Efficiency**: avoid doing the same work twice (two workers generating the same report). If the lock occasionally fails, you waste some work. A simple lock is fine.",
      "**Correctness**: two holders would corrupt data or break an invariant (double-spending, two writers to one file). Here the lock must be safe even when processes pause, which requires **fencing**.",
    ] },

    { type: "h2", text: "Lease-based locks" },
    { type: "p", text: "Distributed locks are **leases**: they expire automatically, so a crashed holder can't block everyone forever." },
    { type: "code", code: `
# Acquire: set only if absent, with a 30-second expiry and a unique token
SET lock:invoice:981  "worker-7:uuid-4f2c"  NX  PX 30000

# Release: delete only if we still own it (atomic check-and-delete in a Lua script)
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
` },
    { type: "ul", items: [
      "**Unique owner value**: so a process never deletes a lock someone else now holds (after its own expired).",
      "**Expiry longer than the work**, with renewal (a \"watchdog\" extending the lease) for long tasks.",
      "**Retry with backoff and jitter** when the lock is taken, rather than spinning.",
    ] },

    { type: "h2", text: "Why expiry alone isn't safe" },
    { type: "p", text: "Any lease-based lock has the same flaw: the holder can **pause** after acquiring the lock (a garbage-collection pause, a CPU-starved container, a slow disk) for longer than the lease. The lock expires, another process acquires it, and when the first wakes up, two processes believe they hold the lock. Checking \"do I still hold it?\" right before writing doesn't help, because the pause can happen between the check and the write." },
    { type: "diagram", kind: "sequence", caption: "Fencing tokens: storage remembers the highest token it has seen and rejects writes carrying an older one, so a paused former holder can't corrupt data.", actors: ["Client 1", "Lock service", "Client 2", "Storage"], steps: [
      { from: 0, to: 1, label: "acquire" },
      { from: 1, to: 0, label: "granted, token 41" },
      { note: "client 1 paused past its lease", over: [0] },
      { from: 2, to: 1, label: "acquire" },
      { from: 1, to: 2, label: "granted, token 42" },
      { from: 2, to: 3, label: "write with token 42", tone: "accent" },
      { from: 0, to: 3, label: "write with token 41", tone: "danger" },
      { from: 3, to: 0, label: "rejected (41 < 42)", tone: "danger" },
    ] },
    { type: "p", text: "A **fencing token** is a number that increases every time the lock is granted. The protected resource stores the highest token it has accepted and rejects lower ones. This requires the resource to participate (a database `WHERE version < ?` check, a storage API that accepts tokens). ZooKeeper's zxid and etcd's revision numbers serve as fencing tokens." },

    { type: "h2", text: "Choosing a lock service" },
    { type: "table", head: ["Option", "Safety", "Notes"], rows: [
      ["Single Redis `SET NX PX`", "Efficiency only", "Fast and simple; a Redis failover can lose the lock"],
      ["Redlock (multiple Redis nodes)", "Debated for correctness", "Still timing-dependent; add fencing for correctness"],
      ["etcd / ZooKeeper / Consul", "Strong (consensus-backed) with fencing tokens", "Right choice for correctness-critical locks. See [consensus](/learn/consensus)"],
      ["Database row lock / advisory lock", "Strong within that database", "`SELECT … FOR UPDATE` or `pg_advisory_lock`; simplest when the resource is in the same DB"],
    ] },

    { type: "h2", text: "Often you don't need a lock" },
    { type: "ul", items: [
      "**Database constraints and conditional writes**: a unique constraint or `UPDATE … WHERE status = 'pending'` is atomic and safe without any lock. See [isolation levels](/learn/transactions-isolation-levels).",
      "**Optimistic concurrency**: version numbers detect conflicts at write time.",
      "**Partition ownership**: assign each entity to one worker (Kafka partitions keyed by ID), so no two workers ever touch the same entity.",
      "**Idempotency**: if doing the work twice is harmless, a lock only saves effort. See [idempotency](/learn/idempotency).",
    ] },
  ],
  uses: [
    { name: "Cron jobs on many instances", text: "A Redis or database lock ensures a scheduled job runs on one instance per period (an efficiency lock)." },
    { name: "Google Chubby", text: "A Paxos-based lock service used for master election and coordination in Bigtable and GFS; it issues sequencers that act as fencing tokens." },
    { name: "HBase and Kafka (historically)", text: "Relied on ZooKeeper locks and ephemeral nodes for region and controller ownership." },
    { name: "Database migrations", text: "Migration tools take an advisory lock so only one deployment runs schema changes at a time." },
  ],
  interview: [
    "Ask whether the lock is for efficiency or correctness, and choose accordingly.",
    "Use a lease with expiry, a unique owner token, and safe release.",
    "For correctness, add fencing tokens checked by the resource, and explain the process-pause problem.",
    "Prefer avoiding locks with conditional writes, unique constraints or partition ownership.",
  ],
  related: ["leader-election", "consensus", "transactions-isolation-levels", "idempotency", "clocks-and-ordering"],
  practice: ["distributed-lock-service", "task-scheduler", "ticket-booking", "leader-election"],
};
