export default {
  blocks: [
    { type: "p", text: "A **consistency model** is a contract between a data store and its users about what reads can return when data is replicated and updated concurrently. Stronger models are easier to program against but cost latency and availability; weaker models are faster and more available but push complexity into the application." },

    { type: "h2", text: "From strongest to weakest" },
    { type: "table", head: ["Model", "Guarantee", "Typical cost"], rows: [
      ["**Linearizable** (strong)", "Every operation appears to happen at a single instant between its start and end; reads see the latest completed write, globally", "Coordination (a leader or quorum) on every operation; unavailable on the minority side of a partition"],
      ["**Sequential**", "All clients see all operations in the same order, consistent with each client's own order, but not necessarily real time", "Still needs agreement on a total order"],
      ["**Causal**", "Operations that are causally related (a reply after the post it answers) are seen in that order by everyone; unrelated ones may differ", "Tracking dependencies (e.g. vector clocks); available during partitions"],
      ["**Read-your-writes**", "A client always sees its own earlier writes", "Session stickiness or version tokens"],
      ["**Monotonic reads**", "A client never sees data go back in time", "Stick a session to one replica, or track a version"],
      ["**Eventual**", "If writes stop, all replicas eventually converge", "Cheapest; stale and out-of-order reads are possible"],
    ] },

    { type: "h2", text: "What goes wrong with weak consistency" },
    { type: "p", text: "Imagine asynchronous replication from a primary to read replicas, with a lag of a few hundred milliseconds:" },
    { type: "diagram", kind: "sequence", caption: "Without read-your-writes, a user can update their profile and immediately see the old version because the read hit a lagging replica.", actors: ["User", "Primary", "Replica"], steps: [
      { from: 0, to: 1, label: "UPDATE name = 'Asha'" },
      { from: 1, to: 0, label: "OK" },
      { from: 1, to: 2, label: "replicate (lagging…)", dashed: true },
      { from: 0, to: 2, label: "GET profile" },
      { from: 2, to: 0, label: "name = 'A. Kumar' (stale!)", tone: "danger" },
      { note: "replica catches up 300 ms later", over: [1, 2] },
    ] },
    { type: "p", text: "Other anomalies under eventual consistency:" },
    { type: "ul", items: [
      "**Non-monotonic reads**: refreshing a page shows a comment, then on the next refresh it disappears, because the second read hit a staler replica.",
      "**Causality violations**: you see a reply before the message it replies to.",
      "**Lost updates**: two concurrent writes to different replicas, and one silently overwrites the other (last-write-wins).",
    ] },

    {"type":"h3","text":"Worked example: who sees what, right after a write"},
    {"type":"p","text":"The author updates a value from v1 to **v2** at t = 0, and the replica needs 3 ticks to catch up. The levels differ only in what reads return during those 3 ticks:"},
    {"type":"table","head":["Level","Author reads (t = 1)","Another user reads (t = 1)","After the replica syncs (t ≥ 3)"],"rows":[["**Strong**","v2","v2 (reads go to the leader or wait for replicas)","v2 / v2"],["**Read-your-writes**","v2 (the author's reads are routed to fresh data)","v1 (may be stale)","v2 / v2"],["**Eventual**","v1 (even the author may see stale data)","v1","v2 / v2"]]},
    {"type":"p","text":"Stronger levels send reads to the leader or wait for replicas to confirm, which costs latency and availability; weaker levels read the nearest replica and may be stale. Pick the **weakest model the feature tolerates**: read-your-writes is often the sweet spot for profile edits and posts."},
    { type: "h2", text: "Practical techniques" },
    { type: "ul", items: [
      "**Read your own writes**: after a user writes, route their reads to the primary for a short window, or return a version (an LSN or timestamp) with the write and have replicas wait until they've caught up to it.",
      "**Monotonic reads**: pin a user's session to one replica (by hashing the user id).",
      "**Quorums**: with N replicas, writing to W and reading from R where **R + W > N** guarantees a read overlaps the latest write. See [replication](/learn/replication).",
      "**Conflict handling** for concurrent writes: last-write-wins (simple, loses data), version vectors that surface conflicts to the app, or **CRDTs**, data types like counters and sets that merge automatically. See [clocks and ordering](/learn/clocks-and-ordering).",
    ] },

    { type: "h2", text: "Choosing a model per feature" },
    { type: "table", head: ["Data", "Model that fits", "Why"], rows: [
      ["Account balance, inventory count, unique usernames", "Linearizable", "Two people must not both get the last seat or the same username"],
      ["A user editing their own profile or settings", "Read-your-writes", "Seeing your own change disappear looks like a bug"],
      ["Comments and replies, chat messages", "Causal", "Replies must not appear before what they answer"],
      ["Like counts, view counts, recommendations", "Eventual", "Being a few seconds behind is invisible to users"],
      ["Search index, analytics dashboards", "Eventual, with a known lag", "Updated asynchronously from the source of truth"],
    ] },
    { type: "callout", text: "Strong consistency isn't free, but neither is weak consistency: every anomaly you allow becomes a bug someone has to reason about. Use strong consistency for invariants that matter, and weaker models where staleness is harmless." },
  ],
  uses: [
    { name: "Google Spanner and CockroachDB", text: "Offer externally consistent (linearizable) transactions across regions using consensus and carefully bounded clocks." },
    { name: "Amazon DynamoDB", text: "Defaults to eventually consistent reads; a strongly consistent read option reads from the leader at higher cost." },
    { name: "Facebook TAO", text: "The social graph cache is eventually consistent but provides read-after-write for a user's own actions within a region." },
    { name: "Collaborative editors", text: "Google Docs-style editing relies on operational transforms or CRDTs so concurrent edits converge without coordination." },
  ],
  interview: [
    "Don't say \"strongly consistent\" or \"eventually consistent\" for the whole system; pick a model per kind of data and justify it.",
    "Call out read-your-writes whenever you add read replicas or caches, and say how you'll provide it.",
    "Use R + W > N when discussing quorum replication.",
    "For concurrent writes, say how conflicts are resolved: last-write-wins, version vectors, or CRDTs.",
  ],
  related: ["cap-theorem", "replication", "acid-vs-base", "clocks-and-ordering", "transactions-isolation-levels"],
  practice: ["collaborative-editor", "geo-replicated-database", "chat-system", "offline-first-sync"],
};
