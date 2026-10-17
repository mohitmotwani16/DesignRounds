export default {
  blocks: [
    { type: "p", text: "A **transaction** groups reads and writes so they succeed or fail together. **Isolation levels** define how much concurrent transactions can see of each other's uncommitted or in-progress work. Stronger isolation prevents more anomalies but costs throughput; many production bugs come from assuming a stronger level than the database actually provides." },

    { type: "h2", text: "The anomalies" },
    { type: "table", head: ["Anomaly", "What happens", "Example"], rows: [
      ["**Dirty read**", "Reading another transaction's uncommitted change, which may be rolled back", "You see a balance that never actually existed"],
      ["**Non-repeatable read**", "Reading the same row twice in one transaction returns different values", "A report reads an account twice and gets two different balances"],
      ["**Phantom read**", "Re-running a query returns new rows another transaction inserted", "\"Count bookings for this room\" changes mid-transaction"],
      ["**Lost update**", "Two read-modify-write cycles overwrite each other", "Two clicks each read stock = 5, both write 4: one sale vanishes"],
      ["**Write skew**", "Two transactions read overlapping data, then write different rows, together breaking an invariant", "Two doctors each see another doctor on call and both go off call: nobody is on call"],
    ] },

    { type: "h2", text: "The standard levels" },
    { type: "table", head: ["Level", "Prevents", "Still allows", "Notes"], rows: [
      ["Read uncommitted", "Nothing much", "Dirty reads and everything below", "Rarely used"],
      ["**Read committed**", "Dirty reads", "Non-repeatable reads, phantoms, lost updates, write skew", "Default in PostgreSQL, Oracle, SQL Server"],
      ["Repeatable read", "Dirty and non-repeatable reads", "Phantoms (in theory), write skew", "MySQL InnoDB default; in PostgreSQL this level is snapshot isolation"],
      ["**Snapshot isolation**", "Dirty and non-repeatable reads, phantoms, most lost updates", "**Write skew**", "Each transaction reads a consistent snapshot (MVCC)"],
      ["**Serializable**", "All of the above", "Nothing: the result equals some serial order", "Highest cost: locking or aborts and retries"],
    ] },

    { type: "h2", text: "How databases implement it: MVCC" },
    { type: "p", text: "Most modern databases use **multi-version concurrency control**: an update writes a new version of the row instead of overwriting it, tagged with the transaction that created it. Each transaction reads the versions that were committed when its snapshot was taken. Readers never block writers and writers never block readers; old versions are cleaned up later (VACUUM in PostgreSQL)." },
    { type: "p", text: "**Serializable** is implemented either with strict two-phase locking (readers and writers block each other) or, in PostgreSQL, with **Serializable Snapshot Isolation**, which runs optimistically and aborts a transaction when it detects a dangerous pattern. The application must retry aborted transactions." },

    { type: "h2", text: "The lost update, and four ways to prevent it" },
    { type: "diagram", kind: "sequence", caption: "Under read committed, two concurrent read-modify-write transactions both read stock = 5 and both write 4. One purchase is lost.", actors: ["Txn A", "Database", "Txn B"], steps: [
      { from: 0, to: 1, label: "SELECT stock → 5" },
      { from: 2, to: 1, label: "SELECT stock → 5" },
      { from: 0, to: 1, label: "UPDATE stock = 4; COMMIT" },
      { from: 2, to: 1, label: "UPDATE stock = 4; COMMIT", tone: "danger" },
      { note: "two units sold, stock only dropped by one", over: [0, 2] },
    ] },
    { type: "ol", items: [
      "**Atomic update in the database**: `UPDATE items SET stock = stock - 1 WHERE id = 7 AND stock > 0`. The simplest and best when it fits.",
      "**Pessimistic locking**: `SELECT … FOR UPDATE` locks the row until commit, so the second transaction waits.",
      "**Optimistic concurrency**: keep a `version` column and `UPDATE … SET stock = 4, version = 8 WHERE id = 7 AND version = 7`. If zero rows changed, someone else won; reload and retry.",
      "**Serializable isolation**: the database detects the conflict and aborts one transaction, which the app retries.",
    ] },

    { type: "h2", text: "Write skew needs more than snapshots" },
    { type: "p", text: "Write skew slips past snapshot isolation because the two transactions write **different** rows. Typical cases: double-booking a meeting room (two inserts into an empty slot), on-call rotas, and username uniqueness checked with a SELECT. Protections:" },
    { type: "ul", items: [
      "A **unique constraint** or exclusion constraint, so the database enforces the invariant (best for bookings and usernames).",
      "Lock the rows the decision depends on (`SELECT … FOR UPDATE`), or materialise the conflict as a row both transactions must update (a `room_slot` row).",
      "Use **serializable** isolation for that transaction.",
    ] },

    { type: "h2", text: "Distributed transactions" },
    { type: "p", text: "Across shards or services, single-database isolation no longer applies. Distributed SQL databases (Spanner, CockroachDB) provide serializable transactions across nodes using consensus and timestamps; between independent services, use [sagas](/learn/saga-pattern) or [two-phase commit](/learn/two-phase-commit)." },
  ],
  uses: [
    { name: "Ticketing and booking", text: "Seat and room reservations use unique constraints or row locks so two buyers can't get the same seat." },
    { name: "Inventory and wallets", text: "Atomic conditional updates (`stock = stock - 1 WHERE stock > 0`) prevent lost updates and overselling." },
    { name: "PostgreSQL SSI", text: "Applications needing strict correctness run critical transactions at SERIALIZABLE and retry on serialization failures." },
    { name: "Google Spanner", text: "Provides externally consistent, serializable transactions across the globe." },
  ],
  interview: [
    "When two users can modify the same thing (seats, stock, balances), say exactly how you prevent lost updates or double booking.",
    "Prefer database-enforced invariants: atomic conditional updates and unique constraints.",
    "Know your database's default isolation (read committed in Postgres) and don't assume serializable.",
    "Mention optimistic concurrency with version numbers for low-contention updates and retries for aborts.",
  ],
  related: ["acid-vs-base", "consistency-models", "distributed-locks", "two-phase-commit", "saga-pattern", "idempotency"],
  practice: ["ticket-booking", "payment-platform", "collaborative-editor"],
};
