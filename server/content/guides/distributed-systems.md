<!--
Interviewer guides: Distributed systems track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
-->

# guide: key-value-store
## Scope and scale
A Dynamo-style store: get/put/delete by key, survives node loss without losing acknowledged writes, scales by adding nodes.
## Core components
Partitioning via consistent hashing with virtual nodes, replication factor N with preference lists, coordinator node per request, quorum reads/writes (R, W), versioning (vector clocks or timestamps), anti-entropy (Merkle trees), hinted handoff, gossip membership and failure detection, storage engine (LSM: commit log, memtable, SSTables, compaction).
## Key decisions and trade-offs
- R + W > N gives read-your-writes style overlap; tune for latency vs consistency.
- Conflict resolution: last-writer-wins (simple, loses data) vs vector clocks with client/app merge.
- Durability: write to commit log before ack; replication before ack depends on W.
- Rebalancing moves only neighbouring ranges thanks to consistent hashing.
## Common mistakes
Acking writes before they're durable; modulo partitioning; no story for conflicting concurrent writes; no repair of divergent replicas.
## Deep-dive questions
With N=3, W=2, R=2, what happens when one replica is down? Two clients write the same key concurrently: what is stored? How do replicas that missed writes catch up? How does adding a node move data?
## What strong looks like
Consistent hashing with replication, quorum configuration explained, durable writes, conflict resolution chosen with trade-offs, hinted handoff and anti-entropy repair, membership/failure detection.

# guide: unique-id-generator
## Scope and scale
Generate unique 64-bit IDs across many generators at high rate (e.g. 10k+/s per node), roughly time-ordered, without a central bottleneck.
## Core components
Snowflake-style layout (timestamp ms since custom epoch | worker/datacenter ID | per-ms sequence), worker ID assignment (config, coordination service lease, or registry), clock monitoring, client library or ID service.
## Key decisions and trade-offs
- Bit allocation: e.g. 41 bits time (~69 years), 10 bits worker, 12 bits sequence (4096/ms/worker); adjust for scale.
- Alternatives: UUIDv4 (no order, 128-bit), UUIDv7 (time-ordered, 128-bit), DB ticket servers/ranges (simple, coordination).
- Clock skew/rollback: wait until clock catches up, or refuse and alert; never reuse timestamps.
- Worker ID uniqueness is the critical coordination point; obtain once at startup and keep working if coordination is briefly down.
## Common mistakes
Two workers sharing an ID; ignoring clock going backwards (NTP); sequence overflow within a millisecond; relying on a central DB for every ID.
## Deep-dive questions
What happens if the system clock jumps back 5 ms? How are worker IDs assigned and reclaimed? How many IDs per second per worker does your layout allow? Why roughly ordered rather than strictly?
## What strong looks like
Justified bit layout, safe worker ID assignment with leases, clock-rollback handling, sequence overflow handling, and comparison with alternatives.

# guide: distributed-message-queue
## Scope and scale
Kafka-like system: producers append to topics, consumer groups read independently and resume after failure, acknowledged messages survive broker failure; high throughput.
## Core components
Topics split into partitions (append-only logs on disk with segments and indexes), brokers hosting partition replicas, leader per partition with follower replication, in-sync replica set, controller/metadata (consensus) for leadership and assignments, consumer groups with partition assignment and committed offsets, retention policies.
## Key decisions and trade-offs
- Ordering only within a partition; partition key selection balances ordering vs parallelism.
- Durability: acks=all with min in-sync replicas; unclean leader election trade-off.
- Delivery semantics: at-least-once by default (commit after processing); exactly-once needs idempotent producers and transactional writes or idempotent consumers.
- Consumer rebalancing on membership change.
## Common mistakes
Expecting global ordering; acking before replication; committing offsets before processing (data loss) without stating the trade-off; ignoring rebalancing.
## Deep-dive questions
The leader broker dies right after acking a write: is it lost? How does a consumer resume after a crash? How do you get ordering per user? What happens during a consumer group rebalance?
## What strong looks like
Partitioned replicated logs, ISR-based durability, leader election via controller, consumer groups with offsets, explicit delivery semantics, retention and scaling via partitions.

# guide: distributed-lock-service
## Scope and scale
Clients acquire named locks with timeouts; a crashed holder must not keep a lock forever; two clients must never both believe they hold a lock.
## Core components
Consensus-backed store (Raft/Paxos, e.g. etcd/ZooKeeper-like) for lock state, lease-based locks with TTL and keepalive, monotonically increasing fencing tokens returned on acquire, client library with session handling, watch/notify for waiters.
## Key decisions and trade-offs
- Leases solve crashed holders but create the "paused client" problem (GC pause past lease expiry); fencing tokens checked by the protected resource solve it.
- Consensus store vs single Redis instance (Redlock debate): correctness needs consensus and fencing.
- Fairness (queue waiters) vs simplicity (retry with backoff).
- Lease length: short (fast recovery) vs long (fewer false expirations).
## Common mistakes
Locks without expiry; leases without fencing (stale holder writes after expiry); a single non-replicated lock server; relying on clocks across machines for safety.
## Deep-dive questions
A client pauses for 30 s while holding the lock and the lease expires: what prevents corruption? How does the service stay available if a node fails? How do waiting clients learn the lock is free?
## What strong looks like
Consensus-backed state, leases with keepalive, fencing tokens enforced by resources, clear failure semantics, and waiter notification.

# guide: leader-election
## Scope and scale
A service cluster needs exactly one active leader that followers can discover; failover should happen within seconds; a deposed leader must stop acting.
## Core components
Election mechanism (Raft-style terms/votes, or lease in a consensus store), heartbeats and election timeouts (randomised), leader discovery (store key, or ask any node), term/epoch numbers attached to leader actions, fencing at downstream resources.
## Key decisions and trade-offs
- Build on an existing consensus store (simpler, proven) vs implement Raft.
- Timeout tuning: fast failover vs false elections during GC pauses or network blips.
- Majority quorum prevents split-brain under partitions; minority side cannot elect.
- Deposed leader: step down when it cannot renew its lease/heartbeat quorum; resources reject stale epochs.
## Common mistakes
Simple "first to grab a flag" without leases; no epochs, so an old leader keeps writing after a partition heals; even-sized clusters without quorum understanding.
## Deep-dive questions
The network partitions the leader from the majority: what happens on both sides? How fast is a new leader elected and what affects that? How do downstream systems reject a stale leader?
## What strong looks like
Quorum-based election with terms, randomised timeouts, leader discovery, step-down on lost quorum, and epoch-based fencing.

# guide: geo-replicated-database
## Scope and scale
A database spanning regions: low-latency local reads, writes from any region visible elsewhere within a bound, no committed data lost on full region outage.
## Core components
Per-region replicas, replication protocol (single-leader with async/sync followers, multi-leader, or consensus groups spanning regions), conflict resolution for multi-leader (LWW, CRDTs, app merges), partitioning with leader placement near writers (follow-the-workload), clock/timestamp strategy (hybrid logical clocks, TrueTime-style), failover.
## Key decisions and trade-offs
- Single leader: simple consistency, cross-region write latency for remote writers.
- Multi-leader: local writes, needs conflict resolution.
- Consensus across regions (e.g. 3 or 5 regions): no data loss on region failure, write latency = cross-region round trip.
- Read consistency options: local stale reads vs bounded staleness vs strong (leader) reads.
## Common mistakes
Claiming zero data loss with async replication; multi-leader without conflict strategy; ignoring cross-region latency in write path; relying on wall-clock LWW without acknowledging lost updates.
## Deep-dive questions
A whole region goes down: which committed writes could be lost under your design? Two regions update the same row simultaneously: what wins? What staleness bound do reads get?
## What strong looks like
Explicit replication model tied to RPO and latency, conflict handling if multi-leader, read consistency levels, leader placement, failover and clock strategy.
