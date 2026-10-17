export default {
  blocks: [
    { type: "p", text: "Distributed systems constantly need to know **what happened first**: which write wins, whether a reply came after its message, which version of a record is newer. Physical clocks on different machines disagree, so naive timestamps give wrong answers. **Logical clocks** (Lamport timestamps, vector clocks) and **hybrid clocks** track order without trusting wall-clock time." },

    { type: "h2", text: "Why wall clocks lie" },
    { type: "ul", items: [
      "**Clock skew**: machines' clocks drift and are corrected by NTP to within milliseconds at best, sometimes much worse.",
      "**Clock jumps**: NTP corrections, leap seconds and VM migrations can move a clock backwards or forwards.",
      "**No global now**: two events on different machines 1 ms apart can carry timestamps in the wrong order.",
    ] },
    { type: "p", text: "With **last-write-wins** by timestamp, a write from a machine whose clock is 50 ms fast can silently overwrite a later write from a correct machine. Data loss with no error." },

    { type: "h2", text: "Happens-before" },
    { type: "p", text: "Leslie Lamport's insight: what matters is **causality**. Event A **happens before** B if A and B are on the same process with A first, or A is sending a message that B receives, or there's a chain of these. Events with no such chain are **concurrent**: neither could have influenced the other." },

    { type: "h2", text: "Lamport timestamps" },
    { type: "p", text: "Each process keeps a counter. Increment it on every event; attach it to every message; on receive, set the counter to `max(local, received) + 1`." },
    { type: "diagram", kind: "sequence", caption: "Lamport counters: the receiver jumps ahead of any timestamp it receives, so causally later events always have larger numbers.", actors: ["Process A", "Process B", "Process C"], steps: [
      { from: 0, to: 0, label: "event (L=1)" },
      { from: 0, to: 1, label: "msg (L=2)" },
      { from: 1, to: 1, label: "receive → max(0,2)+1 = 3" },
      { from: 1, to: 2, label: "msg (L=4)" },
      { from: 2, to: 2, label: "receive → max(1,4)+1 = 5" },
    ] },
    { type: "ul", items: [
      "**Guarantee**: if A happens before B, then L(A) < L(B).",
      "**Limitation**: the converse doesn't hold. L(A) < L(B) doesn't tell you A caused B; they may be concurrent. Lamport timestamps (with a process ID to break ties) give a **total order** consistent with causality, which is enough for things like ordering log entries or mutual exclusion.",
    ] },

    { type: "h2", text: "Vector clocks" },
    { type: "p", text: "A **vector clock** keeps one counter per process: `{A: 2, B: 1, C: 0}`. Increment your own entry on each event; on receive, take the element-wise maximum and then increment your own. Comparing two vectors tells you whether one happened before the other (every entry ≤, at least one <) or whether they're **concurrent** (each is ahead in some entry)." },
    { type: "table", head: ["Version 1", "Version 2", "Relationship", "Action"], rows: [
      ["{A:2, B:1}", "{A:3, B:1}", "V1 happened before V2", "Keep V2"],
      ["{A:3, B:1}", "{A:2, B:2}", "Concurrent", "Conflict: keep both (siblings) or merge"],
    ] },
    { type: "p", text: "Vector clocks let Dynamo-style databases detect conflicting writes instead of silently dropping one; the application (or a CRDT) then merges them. Their size grows with the number of writers, so systems prune them or use **dotted version vectors**." },

    { type: "h2", text: "Hybrid logical clocks and TrueTime" },
    { type: "ul", items: [
      "**Hybrid logical clocks (HLC)** combine physical time with a logical counter: timestamps stay close to wall-clock time (useful for humans and for snapshot reads) while still respecting causality. CockroachDB and YugabyteDB use them.",
      "**Google TrueTime** exposes clock **uncertainty** as an interval using GPS and atomic clocks. Spanner waits out the uncertainty (a few milliseconds) before committing, so timestamp order matches real-time order globally: external consistency.",
    ] },

    { type: "h2", text: "Practical guidance" },
    { type: "ul", items: [
      "Don't use wall-clock timestamps to decide which concurrent write wins when losing data matters; use versions, logical clocks, or a single leader that orders writes.",
      "Use **monotonic clocks** (not wall time) to measure durations and timeouts inside a process.",
      "Use per-entity **sequence numbers** from a single writer (a partition leader) to order events for that entity.",
      "For mergeable data (counters, sets, collaborative text), use **CRDTs**, which converge regardless of order.",
    ] },
  ],
  uses: [
    { name: "Amazon Dynamo and Riak", text: "Used vector clocks to detect concurrent versions of shopping carts and return them for merging." },
    { name: "Google Spanner", text: "Uses TrueTime's bounded uncertainty to assign globally meaningful commit timestamps." },
    { name: "CockroachDB", text: "Uses hybrid logical clocks for transaction timestamps and MVCC reads across nodes." },
    { name: "Collaborative editors", text: "CRDTs (in tools like Figma-style multiplayer and offline-first apps) use logical clocks to merge concurrent edits." },
  ],
  interview: [
    "Avoid relying on synchronized wall clocks for ordering; mention clock skew explicitly.",
    "Explain happens-before, then Lamport timestamps for total order and vector clocks for detecting concurrency.",
    "When choosing last-write-wins, state the data-loss risk; propose versions or CRDTs where it matters.",
    "Use a single leader per entity to order its events when you need strict ordering.",
  ],
  related: ["consistency-models", "unique-id-generation", "replication", "consensus", "distributed-locks"],
  practice: ["collaborative-editor", "geo-replicated-database", "offline-first-sync", "unique-id-generator"],
};
