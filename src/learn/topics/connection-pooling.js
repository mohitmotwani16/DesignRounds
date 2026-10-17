export default {
  blocks: [
    { type: "p", text: "**Connection pooling** keeps a set of open database connections that application code borrows for each query or transaction and returns afterwards, instead of opening a new connection every time. Opening a connection is slow (network handshake, TLS, authentication, server-side process setup), and databases can only handle a limited number of connections efficiently. Pools make database access fast and protect the database from being overwhelmed." },

    { type: "h2", text: "Why connections are expensive" },
    { type: "ul", items: [
      "**Setup latency:** TCP and TLS handshakes plus authentication can take several milliseconds, often more than the query itself.",
      "**Server resources:** many databases dedicate a process or thread and memory to each connection. PostgreSQL, for example, uses a process per connection, so thousands of idle connections waste memory and slow the server.",
      "**Contention:** past a point, more concurrent connections make total throughput worse, because they compete for CPU, locks and disk.",
    ] },

    { type: "h2", text: "How a pool works" },
    { type: "diagram", kind: "flow", caption: "Requests borrow connections from a bounded pool; when all are busy, requests wait briefly in a queue rather than opening new connections.", nodes: [
      { id: "r", label: "Requests", sub: "hundreds concurrent", col: 0, row: 1, shape: "pill" },
      { id: "q", label: "Wait queue", sub: "timeout", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "pool", label: "Connection pool", sub: "e.g. 20 connections", col: 2.6, row: 1, tone: "accent" },
      { id: "db", label: "Database", col: 3.9, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "r", to: "q" }, { from: "q", to: "pool", label: "borrow" }, { from: "pool", to: "db", label: "reuse" },
    ] },
    { type: "ul", items: [
      "**Minimum and maximum size:** keep a few connections warm; cap the total.",
      "**Acquire timeout:** if no connection is free within, say, 1-2 seconds, fail fast instead of piling up requests.",
      "**Health checks and max lifetime:** validate or recycle connections periodically, so failovers, network changes and server restarts don't leave dead connections in the pool.",
      "**Idle timeout:** close connections that sit unused too long.",
    ] },

    { type: "h2", text: "Sizing the pool" },
    { type: "p", text: "Bigger isn't better. A database with a handful of CPU cores and fast disks often reaches peak throughput with a few dozen active connections in total; beyond that, queries just wait on each other inside the database. A common starting point is a total across all app instances of roughly a small multiple of the database's CPU cores, tuned by load testing. See [capacity planning](/learn/capacity-planning)." },
    { type: "callout", tone: "warning", text: "Multiply per-instance pool size by the number of instances. Fifty app servers with a pool of 20 each is 1,000 connections, which can exhaust the database even though each pool looks small. Autoscaling app servers can push it over the limit during a traffic spike." },

    { type: "h2", text: "External poolers" },
    { type: "p", text: "When many app instances (or many short-lived processes) connect to one database, a **proxy pooler** such as PgBouncer for PostgreSQL or a cloud database proxy sits in between. Applications open many cheap connections to the proxy, which multiplexes them onto a small number of real database connections." },
    { type: "table", head: ["Pooling mode", "A server connection is held for", "Trade-off"], rows: [
      ["Session", "The whole client session", "Full feature support, least sharing"],
      ["Transaction", "One transaction", "Much better sharing; session state (some prepared statements, session settings, advisory locks) doesn't carry across transactions"],
      ["Statement", "One statement", "Maximum sharing; no multi-statement transactions"],
    ] },

    { type: "h2", text: "Serverless and pool exhaustion" },
    { type: "ul", items: [
      "**Serverless functions** can scale to thousands of concurrent instances, each with its own connections, and overwhelm a database instantly. Use a proxy pooler, a database built for many connections, or an HTTP-based data API, and cap function concurrency. See [serverless](/learn/serverless).",
      "**Pool exhaustion** usually comes from leaked connections (not returned on an error path), long transactions holding connections, or slow queries during an incident. Monitor active, idle and waiting counts and wait time, and always return connections in a finally block or with a managed helper.",
      "**Don't hold a connection during slow work** such as calling another service; acquire it just for the database work.",
    ] },
  ],
  uses: [
    { name: "Web backends", text: "Each app instance runs a bounded pool; a proxy pooler caps total connections to the primary database." },
    { name: "Serverless APIs", text: "A database proxy absorbs bursts of function instances that would otherwise exhaust connections." },
    { name: "Batch jobs", text: "Workers share a small pool sized to avoid starving online traffic on the same database." },
  ],
  interview: [
    "Explain why opening connections is costly and why databases limit them.",
    "Size the total pool across instances, not per instance.",
    "Use acquire timeouts, health checks and max lifetimes.",
    "Add a proxy pooler for many instances or serverless functions.",
  ],
  related: ["serverless", "capacity-planning", "sql-vs-nosql", "retries-and-timeouts", "backpressure"],
  practice: ["ticket-booking", "url-shortener"],
  reading: [
    { title: "PgBouncer documentation", publisher: "PgBouncer project", url: "https://www.pgbouncer.org/usage.html" },
    { title: "About Pool Sizing", publisher: "HikariCP wiki, GitHub", url: "https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing" },
  ],
};
