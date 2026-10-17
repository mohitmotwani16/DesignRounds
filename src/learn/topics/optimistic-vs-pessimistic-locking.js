export default {
  blocks: [
    { type: "p", text: "**Pessimistic locking** prevents conflicts by locking a record before changing it, so other transactions wait. **Optimistic locking** lets transactions proceed without locks and checks at write time that nobody else changed the record, retrying or failing if they did. Both stop the **lost update** problem, where two users read the same value, both change it, and one change silently overwrites the other. Which to use depends on how often conflicts actually happen." },

    { type: "h2", text: "The lost update problem" },
    { type: "diagram", kind: "sequence", caption: "Without concurrency control, both bookings read 1 seat left and both succeed, overselling the last seat.", actors: ["User A", "Database", "User B"], steps: [
      { from: 0, to: 1, label: "read seats_left = 1" },
      { from: 2, to: 1, label: "read seats_left = 1" },
      { from: 0, to: 1, label: "write seats_left = 0, book" },
      { from: 2, to: 1, label: "write seats_left = 0, book" },
      { note: "two bookings for one seat", over: [0, 2] },
    ] },

    { type: "h2", text: "Pessimistic locking" },
    { type: "p", text: "Lock the row while you work on it. In SQL databases this is usually `SELECT ... FOR UPDATE` inside a transaction:" },
    { type: "code", code: `
begin;
select seats_left from shows where id = 42 for update;   -- others wait here
-- application checks seats_left > 0
update shows set seats_left = seats_left - 1 where id = 42;
insert into bookings (show_id, user_id) values (42, 7);
commit;                                                   -- lock released
` },
    { type: "ul", items: [
      "**Correct by construction:** the second transaction waits, then sees 0 seats and fails cleanly.",
      "**Costs:** waiting transactions hold connections; long transactions or slow application code while holding a lock hurt throughput badly.",
      "**Deadlocks:** two transactions locking rows in opposite order wait on each other. Databases detect and abort one; lock rows in a consistent order and keep transactions short.",
      "**Variants:** `FOR UPDATE NOWAIT` fails immediately instead of waiting; `SKIP LOCKED` lets workers take the next unlocked row, which is how many job queues claim work.",
    ] },

    { type: "h2", text: "Optimistic locking" },
    { type: "p", text: "Add a `version` column (or use an updated-at timestamp or ETag). Read the row with its version, then update only if the version hasn't changed:" },
    { type: "code", code: `
-- read: seats_left = 1, version = 17
update shows
   set seats_left = seats_left - 1, version = version + 1
 where id = 42 and version = 17 and seats_left > 0;
-- 1 row updated: success.  0 rows updated: someone else changed it, so re-read and retry, or fail.
` },
    { type: "ul", items: [
      "**No locks held** while the user thinks or the application computes, so it scales well when conflicts are rare.",
      "**Conflicts cost a retry,** so under heavy contention (everyone buying the same item) most attempts fail and retry, wasting work.",
      "**Works across requests:** a web form can carry the version it loaded and submit it with the edit; the API returns `409 Conflict` if it changed. See [API design](/learn/api-design).",
      "Many ORMs support version columns out of the box.",
    ] },

    { type: "h2", text: "Choosing between them" },
    { type: "table", head: ["Situation", "Prefer"], rows: [
      ["Conflicts are rare (editing your own profile, most CRUD)", "Optimistic"],
      ["Conflicts are frequent on hot rows (flash sale stock, seat maps)", "Pessimistic, or a design that avoids the hot row"],
      ["Long user think time between read and write", "Optimistic (never hold a DB lock across user interaction)"],
      ["Short, critical read-modify-write in one transaction", "Pessimistic or an atomic update"],
      ["Distributed resources across services", "Neither alone: use idempotent steps, sagas or [distributed locks](/learn/distributed-locks) with fencing"],
    ] },

    { type: "h2", text: "Often better: avoid the read-modify-write" },
    { type: "ul", items: [
      "**Atomic conditional updates:** `UPDATE stock SET qty = qty - 1 WHERE id = 42 AND qty > 0` does the check and write in one statement, with no lock held across round trips.",
      "**Unique constraints:** a unique index on `(show_id, seat_id)` makes the database reject a double booking of the same seat outright.",
      "**Reservations with expiry:** hold a seat for 10 minutes with a status and timestamp, release it if payment doesn't complete.",
      "**Queues for extreme contention:** funnel purchases for one hot item through a queue processed by a single consumer.",
      "**Split hot rows:** divide inventory into buckets so concurrent buyers update different rows. See [hot partitions](/learn/hot-partitions).",
    ] },
    { type: "callout", tone: "tip", text: "Isolation levels interact with all of this: under snapshot isolation, two transactions can still create write skew. See [isolation levels](/learn/transactions-isolation-levels)." },
  ],
  uses: [
    { name: "Ticket and seat booking", text: "Unique constraints per seat plus short reservations with expiry prevent double booking." },
    { name: "Collaborative forms and admin tools", text: "Version columns and 409 responses stop one editor overwriting another." },
    { name: "Job queues in SQL", text: "`SELECT ... FOR UPDATE SKIP LOCKED` lets many workers claim jobs without conflicts." },
  ],
  interview: [
    "Describe the lost update problem with a concrete race.",
    "Show both SELECT FOR UPDATE and a version-column update.",
    "Choose by conflict rate and never hold locks across user interaction.",
    "Prefer atomic conditional updates and unique constraints where possible.",
  ],
  related: ["transactions-isolation-levels", "distributed-locks", "hot-partitions", "idempotency", "api-design"],
  practice: ["ticket-booking", "payment-platform", "collaborative-editor"],
  reading: [
    { title: "PostgreSQL: Explicit Locking", publisher: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/explicit-locking.html" },
    { title: "Optimistic Offline Lock", publisher: "Martin Fowler, Patterns of Enterprise Application Architecture", url: "https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html" },
  ],
};
