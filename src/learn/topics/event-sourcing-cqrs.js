export default {
  blocks: [
    { type: "p", text: "**Event sourcing** stores every change to an entity as an immutable **event** (`MoneyDeposited`, `ItemAddedToCart`) instead of storing only its current state. The current state is derived by replaying events. **CQRS** (command query responsibility segregation) separates the model that handles writes from one or more models optimised for reads. They're often used together, but each can be used alone." },

    { type: "h2", text: "Event sourcing" },
    { type: "p", text: "A traditional table stores `balance = 1,200`, losing how it got there. An event-sourced account stores the history; the balance is a fold over it:" },
    { type: "table", head: ["#", "Event", "Data", "Balance after"], rows: [
      ["1", "AccountOpened", "owner: Asha", "0"],
      ["2", "MoneyDeposited", "1,500", "1,500"],
      ["3", "MoneyWithdrawn", "200", "1,300"],
      ["4", "FeeCharged", "100", "1,200"],
    ] },
    { type: "ul", items: [
      "The **event store** is append-only. Events are never updated or deleted; mistakes are corrected with new compensating events.",
      "To handle a command (\"withdraw 500\"), load the entity's events, rebuild its state, check business rules, and append new events, using an **expected version** so concurrent commands can't both succeed (optimistic concurrency).",
      "**Snapshots** (state at event 10,000) avoid replaying long histories every time.",
    ] },

    { type: "h2", text: "CQRS" },
    { type: "p", text: "Write and read workloads often want different shapes. CQRS splits them: commands go to a write model that enforces invariants; events (or change feeds) update **read models** (projections) designed for specific queries." },
    { type: "diagram", kind: "flow", caption: "Commands are validated against the write model and stored as events. Projectors build read models for each query; reads are fast but slightly behind writes.", nodes: [
      { id: "cmd", label: "Commands", sub: "PlaceOrder", col: 0, row: 0, shape: "pill" },
      { id: "w", label: "Write model", sub: "rules, versions", col: 1, row: 0, tone: "accent" },
      { id: "es", label: "Event store", sub: "append-only", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "proj", label: "Projectors", col: 3, row: 0.5 },
      { id: "r1", label: "Order history view", col: 4, row: 0, shape: "db", tone: "cache", w: 150 },
      { id: "r2", label: "Search index", col: 4, row: 1, shape: "db", tone: "cache", w: 150 },
      { id: "q", label: "Queries", col: 2, row: 1.5, shape: "pill" },
    ], edges: [
      { from: "cmd", to: "w" }, { from: "w", to: "es" }, { from: "es", to: "proj" },
      { from: "proj", to: "r1" }, { from: "proj", to: "r2" }, { from: "q", to: "r1", dashed: true }, { from: "q", to: "r2", dashed: true },
    ] },

    { type: "h2", text: "What you gain" },
    { type: "ul", items: [
      "**Complete audit trail**: every change, who made it and when, by construction. Valuable in finance, healthcare and compliance-heavy domains.",
      "**Time travel**: reconstruct state at any past moment to debug or answer \"what did we know then?\"",
      "**New views from old data**: add a read model later and build it by replaying history.",
      "**Independent read scaling**: read models can live in different stores (Elasticsearch, Redis, a warehouse), each tuned for its queries.",
      "**Natural integration**: the events are already there for other services to consume. See [event streaming](/learn/event-streaming-kafka).",
    ] },

    { type: "h2", text: "What it costs" },
    { type: "ul", items: [
      "**Eventual consistency on reads**: projections lag the write. The UI must cope, for example by showing the user's own command result directly.",
      "**Event schema evolution**: events are forever, so old versions must remain readable (upcasting, versioned events).",
      "**Complexity**: rebuilding projections, handling replays idempotently, and reasoning about two models is real work. Debugging needs good tooling.",
      "**Deletion requirements**: privacy laws may require erasing personal data from an immutable log; techniques like crypto-shredding (delete the per-user key) are needed.",
    ] },
    { type: "callout", tone: "warning", text: "Apply event sourcing to the parts of a domain where history and auditability are core (ledgers, orders, workflows), not to a whole application by default. CQRS read models, on the other hand, are useful almost anywhere reads and writes differ, even without event sourcing." },
  ],
  uses: [
    { name: "Banking and accounting ledgers", text: "Ledgers are inherently event-sourced: balances are sums of immutable entries, never edited in place." },
    { name: "Git", text: "A repository is an event log of commits; any version of the code can be rebuilt by replaying history." },
    { name: "E-commerce order pipelines", text: "Orders move through events (placed, paid, packed, shipped), with separate read models for customer history, warehouse dashboards and analytics." },
    { name: "Collaborative tools", text: "Editors store operations rather than snapshots, enabling undo, history and syncing between clients." },
  ],
  interview: [
    "Suggest event sourcing when auditability or history is a requirement, and say why plain state would lose information.",
    "Describe CQRS as separate write and read models, with read models updated asynchronously.",
    "Address read lag in the UX and optimistic concurrency on the write side.",
    "Mention snapshots, event versioning and rebuilding projections as operational concerns.",
  ],
  related: ["event-streaming-kafka", "outbox-pattern", "normalization-denormalization", "consistency-models", "saga-pattern"],
  practice: ["payment-platform", "collaborative-editor", "scd2-warehouse"],
};
