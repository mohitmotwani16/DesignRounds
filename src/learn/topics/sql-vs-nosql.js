export default {
  blocks: [
    { type: "p", text: "**SQL (relational) databases** store data in tables with a fixed schema and let you query it flexibly with joins and transactions. **NoSQL databases** is an umbrella term for non-relational stores (key-value, document, wide-column, graph) that trade some of that flexibility for easier horizontal scaling, flexible schemas or a data model that matches a specific access pattern. Neither is better in general; the right choice follows from how the data is **read and written**." },

    { type: "h2", text: "The core differences" },
    { type: "table", head: ["", "SQL (relational)", "NoSQL"], rows: [
      ["Data model", "Tables, rows, foreign keys", "Key-value, documents, wide columns or graphs. See [NoSQL database types](/learn/nosql-database-types)"],
      ["Schema", "Defined up front, enforced by the database", "Flexible; often enforced by the application"],
      ["Queries", "Ad-hoc SQL: joins, aggregations, any filter with the right index", "Mostly lookups by key or a few designed access paths; limited joins"],
      ["Transactions", "Multi-row, multi-table ACID", "Often single-item atomicity; some offer multi-item transactions with limits"],
      ["Scaling writes", "One primary per database; sharding is extra work", "Built-in partitioning across many nodes"],
      ["Consistency", "Strong by default", "Often eventual or tunable. See [CAP theorem](/learn/cap-theorem)"],
      ["Examples", "PostgreSQL, MySQL, SQL Server, Oracle; Spanner, CockroachDB", "DynamoDB, Cassandra, MongoDB, Redis, Neo4j"],
    ] },

    { type: "h2", text: "The same data, modelled two ways" },
    { type: "diagram", kind: "flow", caption: "Relational: normalised tables joined at query time. Document: one order stored as a nested document, read in a single lookup.", nodes: [
      { id: "users", label: "users", sub: "id, name, email", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "orders", label: "orders", sub: "id, user_id, total", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "items", label: "order_items", sub: "order_id, sku, qty", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "doc", label: "orders collection", sub: "{ user: {...}, items: [...] }", col: 1, row: 1.3, shape: "db", tone: "accent", w: 200 },
    ], edges: [
      { from: "orders", to: "users", label: "FK" }, { from: "items", to: "orders", label: "FK" },
    ], zones: [{ label: "SQL: normalised", from: [0, 0], to: [2, 0] }, { label: "Document: denormalised", from: [0.6, 1.3], to: [1.4, 1.3], tone: "accent" }] },
    { type: "p", text: "The relational version stores each fact once and can answer questions nobody planned for (\"revenue by product category by month\"). The document version reads a whole order in one fast lookup but duplicates user details and makes cross-order queries harder. See [normalization vs denormalization](/learn/normalization-denormalization)." },

    { type: "h2", text: "When SQL is the better default" },
    { type: "ul", items: [
      "Data is **relational**: many entities that reference each other (users, orders, products, payments).",
      "You need **transactions** across several rows or tables: money, inventory, bookings.",
      "Access patterns will **change**, or analysts need ad-hoc queries.",
      "The data fits on one primary (with replicas), which with modern hardware is often terabytes and thousands of writes per second.",
    ] },
    { type: "callout", text: "PostgreSQL is a strong default for a new system. It handles relational data, JSON documents (`jsonb`), full-text search and geospatial queries well enough for many products, and you can move specific workloads elsewhere when numbers demand it." },

    { type: "h2", text: "When NoSQL is the better fit" },
    { type: "ul", items: [
      "**Massive scale with simple access patterns**: billions of items read and written by key (sessions, user timelines, IoT readings, shopping carts).",
      "**Write-heavy workloads** that outgrow a single primary: append-heavy event or time-series data on wide-column stores like Cassandra.",
      "**Flexible or evolving structure**: product catalogues where each category has different attributes (document stores).",
      "**Specialised models**: relationship traversal (graph databases), sub-millisecond caching and counters (Redis), search (Elasticsearch).",
      "**Predictable latency at any scale** with managed operations (DynamoDB).",
    ] },

    { type: "h2", text: "How to choose in a design" },
    { type: "ol", items: [
      "List the **access patterns**: what queries run, how often, with what latency.",
      "Estimate **volume and write rate**. See [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation).",
      "Identify **invariants** that need transactions (no double booking, balance never negative).",
      "Pick the simplest store that serves those patterns at that scale; use different stores for different parts (**polyglot persistence**): Postgres for orders, Redis for sessions, Elasticsearch for search, S3 for media.",
    ] },
    { type: "callout", tone: "warning", text: "NoSQL stores are designed around **known queries**. In DynamoDB or Cassandra you design tables per query, and a new question can mean a new table and a backfill. That's the price of their scalability." },
  ],
  uses: [
    { name: "Instagram", text: "Stores core relational data (users, media metadata, likes) in sharded PostgreSQL, and uses Cassandra for high-volume feed and activity data." },
    { name: "Amazon", text: "Moved many internal workloads from Oracle to DynamoDB for predictable performance at scale, while keeping relational stores where transactions matter." },
    { name: "Uber", text: "Built Schemaless/Docstore on top of MySQL to get a scalable key-document store, showing the line between SQL and NoSQL is often an implementation detail." },
    { name: "Most startups", text: "Start on PostgreSQL or MySQL and add Redis, a search engine and object storage as specific needs appear." },
  ],
  interview: [
    "Justify the database from access patterns and scale, not fashion: \"orders need transactions, so Postgres; the activity feed is append-heavy and read by key, so Cassandra\".",
    "Use different stores for different data and say how they stay in sync (events, CDC).",
    "If you pick NoSQL, show the key or partition design that serves each query.",
    "Mention that relational databases scale further than people think with replicas and caching before sharding is needed.",
  ],
  related: ["nosql-database-types", "normalization-denormalization", "acid-vs-base", "sharding", "replication", "database-indexing"],
  practice: ["url-shortener", "news-feed", "ticket-booking", "key-value-store"],
};
