export default {
  blocks: [
    { type: "p", text: "**CQRS** (command query responsibility segregation) separates the part of a system that **changes** data from the part that **reads** it, so each can use its own model, its own storage and its own scaling. **Event sourcing** stores every change to an entity as an immutable **event** (`MoneyDeposited`, `ItemAddedToCart`) instead of storing only its current state, and derives the current state by replaying events. They're often used together, but each can be used alone." },

    { type: "h2", text: "Why separate reads and writes" },
    { type: "p", text: "Reads and writes usually have very different traffic. On a social network millions of people scroll feeds while a small fraction post. An online store sees far more browsing than buying, and a content platform far more consumers than creators. An IoT system is the opposite: devices write constantly and people rarely read. That asymmetry is an opportunity: handle reads and writes differently and **scale each independently**." },
    { type: "h3", text: "Level 1: database replication" },
    { type: "p", text: "The classic form of read/write separation is [replication](/learn/replication): one **primary** database takes all writes, and several **replicas** that continuously copy it serve reads." },
    { type: "diagram", kind: "flow", caption: "Read/write separation with replication: writes go to the primary; replicas sync from it and serve reads.", nodes: [
      { id: "w", label: "Writes", col: 0, row: 0, shape: "pill" },
      { id: "r", label: "Reads", col: 0, row: 1.6, shape: "pill" },
      { id: "p", label: "Primary DB", col: 1.3, row: 0, shape: "db", tone: "store" },
      { id: "r1", label: "Replica", col: 2.6, row: 0.8, shape: "db", tone: "cache" },
      { id: "r2", label: "Replica", col: 2.6, row: 1.8, shape: "db", tone: "cache" },
    ], edges: [{ from: "w", to: "p" }, { from: "p", to: "r1", label: "sync" }, { from: "p", to: "r2" }, { from: "r", to: "r1" }, { from: "r", to: "r2" }] },
    { type: "ul", items: [
      "**Gains**: much higher read capacity, better availability and fault tolerance (if a replica fails, others keep serving reads), and read capacity that grows by adding replicas.",
      "**Costs**: **replication lag**, the delay before a write appears on replicas, so readers can briefly see stale data; and you need a solid [failover](/learn/health-checks-failover) plan for when the primary fails.",
    ] },
    { type: "h3", text: "Level 2: CQRS" },
    { type: "p", text: "CQRS goes further. Instead of copying the same data, it splits the whole data-access architecture into a **command** path (create, update, delete) and a **query** path (read). It's the same idea as replication, but done at the **application** level, so the two sides can have entirely different models." },
    { type: "ul", items: [
      "**Commands** (mutations, the C, U and D of CRUD) change state. They use a **normalized** model built for consistency and integrity, often in a relational database with ACID transactions.",
      "**Queries** (the R) read state. They use **denormalized** views shaped for the questions users ask, often in a store built for fast reads, such as a document database or search engine.",
    ] },
    { type: "diagram", kind: "flow", caption: "CQRS: commands go to the write service and write database; changes flow as events to a separate read database that the query service reads.", nodes: [
      { id: "c1", label: "Client", sub: "commands (create, update, delete)", col: 0, row: 0, shape: "pill" },
      { id: "ws", label: "Write service", col: 1.4, row: 0 },
      { id: "wdb", label: "Write DB", sub: "normalized", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "ev", label: "Events", sub: "async update", col: 3.7, row: 0.8, shape: "queue", tone: "queue" },
      { id: "c2", label: "Client", sub: "queries (read)", col: 0, row: 1.6, shape: "pill" },
      { id: "rs", label: "Read service", col: 1.4, row: 1.6 },
      { id: "rdb", label: "Read DB", sub: "denormalized views", col: 2.6, row: 1.6, shape: "db", tone: "cache" },
    ], edges: [
      { from: "c1", to: "ws" }, { from: "ws", to: "wdb" }, { from: "wdb", to: "ev", dashed: true }, { from: "ev", to: "rdb", dashed: true },
      { from: "c2", to: "rs" }, { from: "rs", to: "rdb" },
    ] },
    { type: "p", text: "**Eventual consistency** is central to most CQRS systems. When a command runs, the system emits events describing the change, and those events **update the read models asynchronously**. The write side is never slowed down by having to update every read view immediately, and each side can evolve on its own. The price is a short window in which the read side doesn't yet show the latest write." },

    { type: "h2", text: "Real-world CQRS examples" },
    { type: "h3", text: "MySQL for commands, Elasticsearch for queries" },
    { type: "p", text: "A classic pairing when a system needs both ACID transactions and rich search. Changes flow from MySQL to Elasticsearch through events or [change data capture](/learn/change-data-capture)." },
    { type: "table", head: ["Command side: MySQL", "Query side: Elasticsearch"], rows: [
      ["Order processing and inventory", "Full-text product search"],
      ["User account changes", "Complex filter combinations"],
      ["Financial transactions", "Faceted navigation (brand, price, rating counts)"],
      ["Referential integrity (foreign keys)", "Real-time search suggestions, analytics and reporting"],
    ] },
    { type: "h3", text: "One database, two table shapes: a notification system" },
    { type: "p", text: "The two sides can also live in the **same database** as different tables; the query side is simply a **denormalized view** optimized for reads. Take notifications in DynamoDB. The **write table** gets simple, fast inserts: no data transformation and no aggregates to update:" },
    { type: "code", code: `// notifications_write: optimized for fast inserts
{
  "notification_id": "uuid-123",
  "user_id": "user_789",
  "type": "friend_request",
  "sender_id": "user_456",
  "created_at": "2024-03-20T10:30:00Z",
  "status": "unread"
}` },
    { type: "p", text: "The **read table** holds pre-computed views: one item per user per month, with the sender's details already joined in and the unread count already calculated:" },
    { type: "code", code: `// notifications_read: optimized for the "open my notifications" screen
{
  "user_id": "user_789#2024-03",          // partition key: one feed per user per month
  "unread_count": 5,                       // pre-calculated aggregate
  "notifications": [
    {
      "id": "uuid-123",
      "type": "friend_request",
      "sender": { "id": "user_456", "name": "John Doe", "avatar_url": "https://..." },
      "created_at": "2024-03-20T10:30:00Z",
      "status": "unread"
    }
  ]
}` },
    { type: "p", text: "Reading the notifications screen is now **one** key lookup: pre-joined data (no extra queries for sender names), pre-calculated aggregates (`unread_count`), a key designed for the exact access pattern, and reads that scale independently of writes." },
    { type: "table", head: ["Without CQRS", "With CQRS"], rows: [
      ["Writes must update several aggregates at once", "The write service just records the notification quickly"],
      ["Reads join across many records", "An async processor enriches the data (fetches sender details)"],
      ["One table design compromises between write and read patterns", "The read model keeps pre-computed views shaped for each screen"],
      ["Reads and writes can't scale separately when their loads differ", "Each side scales on its own load"],
    ] },

    { type: "h2", text: "Pros and cons of CQRS" },
    { type: "table", head: ["Advantages", "Drawbacks"], rows: [
      ["**Faster reads**: denormalized structures and pre-computed views; heavy read traffic doesn't slow writes, and vice versa", "**Complexity**: two models plus the synchronization between them make the system harder to understand and maintain"],
      ["**Complex queries**: use specialized stores, such as Elasticsearch for search, without hurting transactional writes in MySQL", "**Eventual consistency**: the read side can show outdated data for a while; the product and users must tolerate that"],
      ["**Decoupled evolution**: each side can change its model and technology independently", "**Infrastructure overhead**: extra databases and message queues to run, monitor and deploy together"],
    ] },
    { type: "h3", text: "Lightweight CQRS" },
    { type: "p", text: "Not every CQRS system needs two databases and an asynchronous pipeline. In smaller systems the command and query models often share **one database** and are kept in sync **within the same transaction**. You keep separate command and query models in the code, keep strong consistency, and add no infrastructure. Teams typically grow from this into the \"commands in the OLTP (transactional) store, queries in a read store\" design only when scale or specialized queries justify the extra moving parts." },
    { type: "h3", text: "CQRS on the major clouds" },
    { type: "table", head: ["Cloud", "Write (command) side", "Events", "Read (query) side"], rows: [
      ["AWS", "AWS Lambda functions handle commands", "Amazon SNS or SQS; EventBridge coordinates event flows", "DynamoDB with global secondary indexes; ElastiCache or OpenSearch (Elasticsearch) to speed up queries"],
      ["Azure", "Azure Functions or App Service process commands", "Azure Service Bus or Event Grid", "Cosmos DB or Azure SQL Database holding denormalized views, maintained by projection Functions"],
      ["Google Cloud", "Cloud Functions process commands", "Pub/Sub", "Firestore or BigQuery, updated by Cloud Functions triggered by the events; good for analytics and reporting"],
    ] },

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
    { type: "diagram", kind: "flow", caption: "CQRS with event sourcing: commands are validated against the write model and stored as events; projectors build read models for each query, slightly behind the writes.", nodes: [
      { id: "cmd", label: "Commands", sub: "PlaceOrder", col: 0, row: 0, shape: "pill" },
      { id: "w", label: "Write model", sub: "rules, versions", col: 1.1, row: 0, tone: "accent" },
      { id: "es", label: "Event store", sub: "append-only", col: 2.2, row: 0, shape: "db", tone: "store" },
      { id: "proj", label: "Projectors", col: 3.3, row: 0.5 },
      { id: "r1", label: "Order history view", col: 4.5, row: 0, shape: "db", tone: "cache", w: 150 },
      { id: "r2", label: "Search index", col: 4.5, row: 1, shape: "db", tone: "cache", w: 150 },
      { id: "q", label: "Queries", col: 2.2, row: 1.5, shape: "pill" },
    ], edges: [
      { from: "cmd", to: "w" }, { from: "w", to: "es" }, { from: "es", to: "proj" },
      { from: "proj", to: "r1" }, { from: "proj", to: "r2" }, { from: "q", to: "r1", dashed: true }, { from: "q", to: "r2", dashed: true },
    ] },
    { type: "h3", text: "What event sourcing gives you" },
    { type: "ul", items: [
      "**Complete audit trail**: every change, who made it and when, by construction. Valuable in finance, healthcare and compliance-heavy domains.",
      "**Time travel**: reconstruct state at any past moment to debug or answer \"what did we know then?\"",
      "**New views from old data**: add a read model later and build it by replaying history.",
      "**Natural integration**: the events are already there for other services to consume. See [event streaming](/learn/event-streaming-kafka).",
    ] },
    { type: "h3", text: "What it costs" },
    { type: "ul", items: [
      "**Eventual consistency on reads**: projections lag the write. The UI must cope, for example by showing the user's own command result directly.",
      "**Event schema evolution**: events are forever, so old versions must remain readable (upcasting, versioned events).",
      "**Complexity**: rebuilding projections, handling replays idempotently, and reasoning about two models is real work. Debugging needs good tooling.",
      "**Deletion requirements**: privacy laws may require erasing personal data from an immutable log; techniques like crypto-shredding (delete the per-user key) are needed.",
    ] },
    { type: "callout", tone: "warning", text: "Apply event sourcing to the parts of a domain where history and auditability are core (ledgers, orders, workflows), not to a whole application by default. CQRS read models, on the other hand, are useful almost anywhere reads and writes differ, even without event sourcing." },
  ],
  uses: [
    { name: "E-commerce search", text: "Orders and inventory live in a relational database; product search, filters and facets are served from Elasticsearch kept in sync by events or CDC." },
    { name: "Notification feeds", text: "Raw notifications are written fast; per-user, pre-joined feeds with unread counts are maintained asynchronously for one-lookup reads." },
    { name: "Banking and accounting ledgers", text: "Ledgers are inherently event-sourced: balances are sums of immutable entries, never edited in place." },
    { name: "Git", text: "A repository is an event log of commits; any version of the code can be rebuilt by replaying history." },
  ],
  interview: [
    "Start with replicas for read/write separation; move to CQRS when reads need a different shape or store (search, feeds, analytics).",
    "Describe the command model (normalized, transactional) and the query model (denormalized, per screen), updated asynchronously by events.",
    "Address read lag in the UX, and mention the lightweight single-database variant for smaller systems.",
    "Suggest event sourcing only when auditability or history is a requirement; mention snapshots and event versioning.",
  ],
  related: ["core-design-challenges", "replication", "change-data-capture", "event-streaming-kafka", "outbox-pattern", "normalization-denormalization", "materialized-views"],
  practice: ["payment-platform", "notification-service", "collaborative-editor"],
};
