export default {
  blocks: [
    { type: "p", text: "**Normalization** organises data so each fact is stored exactly once, with relationships expressed through keys. **Denormalization** deliberately duplicates data so common reads need fewer joins or lookups. Normalised schemas are easier to keep correct; denormalised ones are faster to read. Most systems normalise the source of truth and denormalise selected read paths." },

    { type: "h2", text: "Normalization in practice" },
    { type: "p", text: "The normal forms formalise one idea: **don't repeat facts**. In everyday terms:" },
    { type: "ul", items: [
      "**1NF**: each column holds one value. No comma-separated lists of tags in a column; use a separate table.",
      "**2NF**: every non-key column depends on the whole key, not part of a composite key.",
      "**3NF**: non-key columns depend only on the key, not on other non-key columns. A customer's city belongs in the `customers` table, not repeated in every order.",
    ] },
    { type: "p", text: "Benefits: an update touches one row (change a customer's email once), no **update anomalies** (two copies disagreeing), smaller storage, and flexibility to answer new questions with joins." },

    { type: "h2", text: "Why denormalize" },
    { type: "p", text: "Normalised reads can need many joins. At high read volumes, or when data is sharded across machines where joins are impossible, it's often better to store data in the shape it's read:" },
    { type: "diagram", kind: "flow", caption: "A feed item stores a copy of the author's name and avatar, so rendering a feed doesn't need a join per item. Changing a name means updating the copies.", nodes: [
      { id: "users", label: "users", sub: "id, name, avatar", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "posts", label: "posts", sub: "id, author_id, text", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "feed", label: "feed_items", sub: "post, author_name, avatar", col: 2, row: 0.5, shape: "db", tone: "accent", w: 180 },
      { id: "worker", label: "Fan-out worker", col: 1, row: 0.5 },
    ], edges: [
      { from: "users", to: "worker", label: "copy name" }, { from: "posts", to: "worker" }, { from: "worker", to: "feed", label: "write" },
    ] },
    { type: "table", head: ["Technique", "Example"], rows: [
      ["Duplicate columns", "Store `author_name` on each post or feed item"],
      ["Precomputed aggregates", "`like_count` on the post instead of `COUNT(*)` on every view"],
      ["Embedded documents", "An order document containing its line items"],
      ["Materialized views / read models", "A table per screen, rebuilt from events. See [event sourcing and CQRS](/learn/event-sourcing-cqrs)"],
      ["Per-query tables (NoSQL)", "In Cassandra, `messages_by_conversation` and `messages_by_user` hold the same messages for different queries"],
    ] },

    { type: "h2", text: "The costs of duplication" },
    { type: "ul", items: [
      "**Write amplification**: one change updates many copies (a name change touches every post).",
      "**Inconsistency windows**: copies are usually updated asynchronously, so they can disagree for a while.",
      "**More code**: something must keep copies in sync: application logic, triggers, [change data capture](/learn/outbox-pattern) or stream processing.",
    ] },
    { type: "callout", text: "Decide how stale each copy may be. A denormalised author name that updates within a minute is fine; a denormalised account balance is not, so it shouldn't be denormalised at all." },

    { type: "h2", text: "A practical approach" },
    { type: "ol", items: [
      "Model the **source of truth** normalised, in a store with transactions.",
      "Find the hot read paths (feeds, product pages, dashboards) from your access patterns.",
      "Build **derived, denormalised views** for those paths: caches, read models, search indexes, aggregated counters.",
      "Update derived views from changes (events or CDC), and make it possible to **rebuild** them from the source of truth.",
    ] },
  ],
  uses: [
    { name: "Social feeds", text: "Feed entries carry denormalised author details and counters so a feed renders from one read. See [fan-out](/learn/fan-out)." },
    { name: "Data warehouses", text: "Star schemas denormalise dimensions (product, customer, date) around fact tables for fast analytics." },
    { name: "Cassandra and DynamoDB", text: "Data modelling starts from queries, duplicating data into one table per access pattern." },
    { name: "E-commerce", text: "Orders copy the product name and price at purchase time, intentionally, so later catalogue changes don't rewrite history." },
  ],
  interview: [
    "Normalise the core model, then justify each denormalisation with a hot read path.",
    "Say how duplicated data is kept in sync and how stale it may get.",
    "Use precomputed counters for likes and views instead of counting rows on every read.",
    "Point out data that should be copied at a point in time (the price on an order) versus data that should stay in sync.",
  ],
  related: ["sql-vs-nosql", "event-sourcing-cqrs", "fan-out", "outbox-pattern", "caching"],
  practice: ["news-feed", "scd2-warehouse", "ticket-booking"],
};
