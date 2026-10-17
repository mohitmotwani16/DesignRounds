export default {
  blocks: [
    { type: "p", text: "**ACID** and **BASE** describe two philosophies for data correctness. ACID databases guarantee that transactions are all-or-nothing, isolated and durable, which makes reasoning simple. BASE systems relax those guarantees (basically available, soft state, eventually consistent) to gain availability and horizontal scale. Most real systems use both, in different places." },

    { type: "h2", text: "ACID" },
    { type: "table", head: ["Property", "Guarantee", "Example"], rows: [
      ["**Atomicity**", "All operations in a transaction succeed, or none do", "Debit account A and credit account B: never only one of them"],
      ["**Consistency**", "A transaction moves the database from one valid state to another; constraints (foreign keys, uniqueness, checks) always hold", "A balance can't go below zero if a CHECK constraint forbids it"],
      ["**Isolation**", "Concurrent transactions don't see each other's partial work; the result is as if they ran in some order (to a degree set by the isolation level)", "Two transfers on the same account don't lose an update"],
      ["**Durability**", "Once committed, data survives crashes and power loss", "Committed data is in the write-ahead log on disk (and often on replicas)"],
    ] },
    { type: "p", text: "Under the hood: atomicity and durability come from a **write-ahead log** (WAL), where changes are logged before they're applied and replayed after a crash. Isolation comes from locks or **MVCC** (multi-version concurrency control). Isolation has levels with real trade-offs; see [transactions and isolation levels](/learn/transactions-isolation-levels)." },
    { type: "diagram", kind: "sequence", caption: "Atomicity: a transfer is one transaction. If anything fails before COMMIT, the database rolls back both updates.", actors: ["App", "Database"], steps: [
      { from: 0, to: 1, label: "BEGIN" },
      { from: 0, to: 1, label: "UPDATE accounts SET bal = bal − 100 WHERE id = A" },
      { from: 0, to: 1, label: "UPDATE accounts SET bal = bal + 100 WHERE id = B" },
      { from: 0, to: 1, label: "COMMIT", tone: "accent" },
      { note: "WAL flushed: both changes durable together", over: [1] },
      { from: 1, to: 0, label: "OK" },
    ] },

    { type: "h2", text: "BASE" },
    { type: "ul", items: [
      "**Basically available**: the system keeps answering, even if some answers are stale or some features are degraded.",
      "**Soft state**: replicas may hold different values for a while; state changes even without new input as replication catches up.",
      "**Eventually consistent**: given no new writes, all replicas converge to the same value. See [consistency models](/learn/consistency-models).",
    ] },
    { type: "p", text: "BASE came out of large-scale web systems (Amazon's Dynamo, early NoSQL) where staying up during failures and scaling writes across many machines mattered more than multi-row transactions." },

    { type: "h2", text: "Side by side" },
    { type: "table", head: ["", "ACID", "BASE"], rows: [
      ["Focus", "Correctness of each transaction", "Availability and scale"],
      ["Consistency", "Strong, immediate", "Eventual"],
      ["Multi-record updates", "Transactions across rows and tables", "Usually single-item atomicity; multi-item needs app logic or sagas"],
      ["Scaling writes", "Harder: one primary, or distributed transactions", "Easier: partition and replicate freely"],
      ["Failure behaviour", "May reject writes to stay correct", "Keeps accepting writes, reconciles later"],
      ["Typical stores", "PostgreSQL, MySQL, Oracle, SQL Server; Spanner and CockroachDB (distributed ACID)", "Cassandra, DynamoDB (default), Riak, CouchDB"],
    ] },
    { type: "callout", text: "The lines have blurred. DynamoDB and MongoDB now offer ACID transactions, and distributed SQL databases (Spanner, CockroachDB, YugabyteDB) provide ACID across many machines. The useful question isn't \"SQL or NoSQL\" but **which operations need transactional guarantees**." },

    { type: "h2", text: "Getting ACID-like outcomes across services" },
    { type: "p", text: "Once data is split across services or databases, a single ACID transaction can't cover it. The common patterns are:" },
    { type: "ul", items: [
      "**[Sagas](/learn/saga-pattern)**: a sequence of local transactions with compensating actions on failure (cancel the order, refund the payment).",
      "**[Transactional outbox](/learn/outbox-pattern)**: write the business change and the event to publish in one local transaction, so they can't diverge.",
      "**[Idempotency](/learn/idempotency)**: make retries safe so at-least-once delivery doesn't double-apply.",
      "**[Two-phase commit](/learn/two-phase-commit)**: true atomic commit across resources, at the cost of blocking and coupling.",
    ] },
  ],
  uses: [
    { name: "Banking and payments ledgers", text: "Double-entry ledgers rely on ACID transactions so every debit has a matching credit, and on constraints to forbid invalid states." },
    { name: "E-commerce orders", text: "The order and payment records use ACID within a service; cross-service flows (inventory, shipping) use sagas and events." },
    { name: "Social features", text: "Likes, view counts and follower counts live happily in BASE stores where a few seconds of disagreement is invisible." },
    { name: "Amazon Dynamo", text: "The original BASE design: always-writable shopping carts with conflict resolution instead of transactions." },
  ],
  interview: [
    "Identify the invariants that must never break (no double booking, balances never negative) and keep those operations in an ACID store.",
    "Use BASE where staleness is acceptable and say so explicitly: \"the like count can lag by seconds\".",
    "When a flow spans services, propose a saga with compensations rather than hand-waving \"a transaction\".",
    "Don't confuse ACID consistency (constraints hold) with CAP consistency (replicas agree).",
  ],
  related: ["transactions-isolation-levels", "consistency-models", "cap-theorem", "sql-vs-nosql", "saga-pattern"],
  practice: ["ticket-booking", "payment-platform", "scd2-warehouse"],
};
