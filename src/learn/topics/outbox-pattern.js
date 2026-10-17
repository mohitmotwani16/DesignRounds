export default {
  blocks: [
    { type: "p", text: "Services often need to **update their database and publish an event** about it: save the order, then tell the world `OrderPlaced`. Doing these as two separate steps (a **dual write**) is unsafe, because a crash or failure between them leaves the database and the event stream disagreeing. The **transactional outbox** pattern and **change data capture (CDC)** solve this by making the event a product of the database write itself." },

    { type: "h2", text: "Why dual writes break" },
    { type: "table", head: ["Order of steps", "Failure between steps", "Result"], rows: [
      ["Write DB, then publish", "Crash or broker down after the DB commit", "Order exists, but no service hears about it: no email, no shipment"],
      ["Publish, then write DB", "DB write fails or rolls back", "Services react to an order that doesn't exist"],
      ["Both, without a transaction", "Any partial failure", "Silent, permanent inconsistency that's hard to detect"],
    ] },
    { type: "p", text: "You can't put a database and a message broker in one ordinary transaction (that would need [two-phase commit](/learn/two-phase-commit), which most brokers don't support and which couples their availability)." },

    { type: "h2", text: "The transactional outbox" },
    { type: "p", text: "Write the event into an **outbox table** in the **same database transaction** as the business change. A separate **relay** reads the outbox and publishes to the broker, marking or deleting rows once published." },
    { type: "diagram", kind: "flow", caption: "The order and its event commit atomically. The relay publishes outbox rows to the broker and retries until it succeeds.", nodes: [
      { id: "svc", label: "Orders service", col: 0, row: 0.5 },
      { id: "orders", label: "orders table", col: 1.3, row: 0, shape: "db", tone: "store" },
      { id: "outbox", label: "outbox table", sub: "OrderPlaced #981", col: 1.3, row: 1, shape: "db", tone: "accent" },
      { id: "relay", label: "Relay", sub: "poll or CDC", col: 2.6, row: 1 },
      { id: "broker", label: "Kafka / queue", col: 3.8, row: 1, shape: "queue", tone: "queue" },
      { id: "subs", label: "Subscribers", col: 3.8, row: 0, shape: "pill" },
    ], edges: [
      { from: "svc", to: "orders", label: "one transaction" }, { from: "svc", to: "outbox" },
      { from: "outbox", to: "relay" }, { from: "relay", to: "broker", label: "publish" }, { from: "broker", to: "subs" },
    ], zones: [{ label: "Same database", from: [1.3, 0], to: [1.3, 1], tone: "accent" }] },
    { type: "code", code: `
BEGIN;
  INSERT INTO orders (id, user_id, total, status) VALUES ('o_981', 'u_42', 1499, 'placed');
  INSERT INTO outbox (id, aggregate_id, type, payload)
    VALUES ('evt_5521', 'o_981', 'OrderPlaced', '{"order_id":"o_981","total":1499}');
COMMIT;
` },
    { type: "ul", items: [
      "**Guarantee**: if the order is committed, the event will eventually be published; if the transaction rolls back, there's no event.",
      "**Delivery is at-least-once**: the relay can publish and then crash before marking the row, so it republishes. Consumers must be [idempotent](/learn/idempotency), using the event ID.",
      "**Ordering**: publish in outbox order per aggregate (key the topic by `aggregate_id`) to keep events for one entity in order.",
      "**Cleanup**: delete or archive published rows so the table stays small.",
    ] },

    { type: "h2", text: "Relay options: polling vs CDC" },
    { type: "table", head: ["", "Polling publisher", "Change data capture"], rows: [
      ["How", "Query `SELECT … FROM outbox WHERE published = false` every few hundred ms", "Read the database's replication log (Postgres WAL, MySQL binlog)"],
      ["Latency", "Polling interval", "Near real time"],
      ["DB load", "Repeated queries", "Minimal: reads the log the database writes anyway"],
      ["Tools", "A small background job", "Debezium, AWS DMS, Postgres logical replication"],
    ] },

    { type: "h2", text: "Change data capture on its own" },
    { type: "p", text: "CDC can also stream changes from **any** table, not just an outbox: every insert, update and delete becomes an event. That's ideal for keeping derived systems in sync (search indexes, caches, data warehouses) without the application doing anything. The trade-off is that table-level change events expose your internal schema to consumers; an outbox lets you publish deliberate, stable **domain events** instead." },
    { type: "callout", text: "Rule of thumb: use the **outbox** for events other services depend on (a public contract), and **raw CDC** for replicating data into your own derived stores like search and analytics." },
  ],
  uses: [
    { name: "Debezium", text: "Open-source CDC that tails database logs into Kafka, with a dedicated outbox event router for the outbox pattern." },
    { name: "Search and cache sync", text: "CDC streams product and user changes into Elasticsearch and cache invalidation, avoiding app-level dual writes. See [full-text search](/learn/search-and-inverted-index)." },
    { name: "Microservices at Shopify, Wix and others", text: "Use outbox tables so domain events are published exactly when business transactions commit." },
    { name: "Data warehouses", text: "CDC replicates OLTP changes into Snowflake, BigQuery or a lakehouse in near real time." },
  ],
  interview: [
    "Whenever you write to a database and publish an event, call out the dual-write problem.",
    "Propose the transactional outbox (or CDC) and explain the at-least-once publish and idempotent consumers.",
    "Use CDC to keep search indexes, caches and warehouses in sync with the source of truth.",
    "Key events by aggregate ID to preserve per-entity order.",
  ],
  related: ["event-streaming-kafka", "delivery-semantics", "idempotency", "saga-pattern", "pub-sub", "search-and-inverted-index"],
  practice: ["payment-platform", "ticket-booking", "notification-service"],
};
