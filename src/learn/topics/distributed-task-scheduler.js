export default {
  blocks: [
    { type: "p", text: "A **distributed job scheduler** runs work at the right time across many machines: delayed jobs (\"send a reminder in 24 hours\"), recurring cron jobs (\"generate invoices at 2 a.m.\"), and retries. It has to fire millions of jobs on time, never lose one, and run each one once in effect, even when workers crash mid-job. The core pieces are a durable job store, a time-indexed way to find due jobs, **leases** so workers can claim jobs safely, and **at-least-once** execution with idempotent handlers." },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "Jobs are stored durably and indexed by run time; a dispatcher moves due jobs to ready queues; workers lease jobs, heartbeat, and acknowledge or retry.", nodes: [
      { id: "api", label: "Schedule API", sub: "create · cancel", col: 0, row: 1, shape: "pill" },
      { id: "store", label: "Job store", sub: "by run_at, durable", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "disp", label: "Dispatcher", sub: "poll due jobs", col: 2.6, row: 1, tone: "accent" },
      { id: "q", label: "Ready queues", sub: "by priority", col: 3.9, row: 1, shape: "queue", tone: "queue" },
      { id: "w", label: "Workers", sub: "lease · heartbeat", col: 5.1, row: 0.4 },
      { id: "dlq", label: "Dead-letter queue", col: 5.1, row: 1.8, shape: "queue", tone: "danger" },
    ], edges: [
      { from: "api", to: "store" }, { from: "store", to: "disp" }, { from: "disp", to: "q" }, { from: "q", to: "w" },
      { from: "w", to: "store", dashed: true, label: "ack / retry" }, { from: "w", to: "dlq", dashed: true },
    ] },

    { type: "h2", text: "Finding due jobs efficiently" },
    { type: "ul", items: [
      "**Database index on run time:** `SELECT ... WHERE run_at <= now() AND status = 'scheduled' ORDER BY run_at LIMIT 100 FOR UPDATE SKIP LOCKED`. Simple and transactional; it scales well with partitioning and is plenty for many systems. See [optimistic vs pessimistic locking](/learn/optimistic-vs-pessimistic-locking).",
      "**Time buckets:** group jobs by minute (`bucket = run_at rounded to the minute`), so the dispatcher reads one bucket at a time, sharded across dispatchers.",
      "**Sorted sets:** a Redis sorted set scored by run time gives fast \"what's due\" queries; durability must be handled carefully. See [Redis](/learn/redis).",
      "**Delay queues:** some brokers support delayed delivery directly, convenient for short delays.",
      "**Hierarchical timing wheels** in memory handle huge numbers of near-term timers cheaply.",
    ] },

    { type: "h2", text: "Leases and at-least-once execution" },
    { type: "p", text: "A worker **leases** a job: it marks it running with an owner and a lease expiry (for example 60 seconds) and renews the lease with heartbeats while working. If the worker crashes, the lease expires and the job becomes available to another worker. This guarantees the job eventually runs, but it can run **more than once**: a worker might pause (garbage collection, network partition), lose its lease, and resume after another worker started." },
    { type: "ul", items: [
      "Make handlers **idempotent**: send the reminder with a deduplication key, write results with upserts. See [idempotency](/learn/idempotency).",
      "Check the lease on completion, and use **fencing tokens** when a job writes to external systems that must reject stale workers. See [distributed locks](/learn/distributed-locks).",
      "Exactly-once execution isn't achievable in general; effectively-once comes from at-least-once plus idempotency. See [delivery guarantees](/learn/delivery-semantics).",
    ] },

    { type: "h2", text: "Retries, failures and dead letters" },
    { type: "ul", items: [
      "Retry failed jobs with **exponential backoff and jitter**, up to a maximum number of attempts. See [retries and timeouts](/learn/retries-and-timeouts).",
      "Separate retryable errors (timeouts, 503s) from permanent ones (invalid input), which fail immediately.",
      "Move jobs that exhaust retries to a **dead-letter queue** with the error, for inspection and replay.",
      "Give each job type a timeout and a concurrency limit, so a slow downstream service doesn't consume every worker.",
    ] },

    { type: "h2", text: "Cron and recurring jobs" },
    { type: "ul", items: [
      "Store the schedule (a cron expression and time zone) and compute the next run time after each execution, inserting the next occurrence as a normal delayed job.",
      "Ensure **one instance per occurrence**: a unique key on `(schedule_id, scheduled_time)` stops two dispatchers creating the same run.",
      "Decide the **missed-run policy** after an outage: run once to catch up, run every missed occurrence, or skip.",
      "Handle daylight-saving changes and month ends explicitly; \"2:30 a.m. daily\" may not exist or may happen twice.",
    ] },
    { type: "callout", tone: "tip", text: "Avoid a single scheduler machine that's a single point of failure. Run several dispatchers that coordinate through the database's row locks, or elect one active dispatcher with a lease. See [leader election](/learn/leader-election)." },
  ],
  uses: [
    { name: "Reminders and notifications", text: "Millions of delayed sends scheduled for specific times, with idempotent delivery." },
    { name: "Billing", text: "Recurring invoice and renewal jobs with strict once-per-period guarantees." },
    { name: "Data platforms", text: "Pipeline triggers and backfills scheduled across worker pools. See [pipeline orchestration](/learn/data-pipeline-orchestration)." },
  ],
  interview: [
    "Store jobs durably, indexed by run time, and explain how due jobs are found.",
    "Use leases with heartbeats, and accept at-least-once execution.",
    "Make handlers idempotent and use fencing for external side effects.",
    "Cover retries with backoff, dead letters, cron dedup and missed-run policy.",
  ],
  related: ["message-queues", "delivery-semantics", "distributed-locks", "retries-and-timeouts", "data-pipeline-orchestration"],
  practice: ["task-scheduler", "notification-service"],
  reading: [
    { title: "Distributed Periodic Scheduling with Cron", publisher: "Google, Site Reliability Engineering book", url: "https://sre.google/sre-book/distributed-periodic-scheduling/" },
    { title: "PostgreSQL: SELECT ... FOR UPDATE SKIP LOCKED", publisher: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/sql-select.html" },
  ],
};
