export default {
  blocks: [
    { type: "p", text: "Storage is the backbone of a scalable system. It isn't just somewhere to put data: it decides how fast you can read it, how safely it's kept and how far it can grow. Most designs pick from three kinds of storage: **SQL (relational) databases**, **NoSQL databases** and **blob/object storage**. This page explains what each is for, then how to choose between SQL and NoSQL, which is one of the first decisions in almost every design." },

    { type: "h2", text: "What storage does in a system" },
    { type: "p", text: "Think of a huge, carefully organized library. The library is the storage system and the books are the data; how the shelves are organized decides how quickly you find a book. Storage serves four purposes:" },
    { type: "ul", items: [
      "**Persistence**: data outlives the process that created it: user profiles, transaction records, session data.",
      "**Performance**: read and write speed directly shape how responsive the application feels.",
      "**Scalability**: as the application grows, so does its data, and storage must grow without slowing down. See [scalability](/learn/scalability).",
      "**Reliability and availability**: data must be protected against loss and stay reachable through failures. See [replication](/learn/replication).",
    ] },

    { type: "h2", text: "Three kinds of storage" },
    { type: "diagram", kind: "flow", caption: "The three storage families: tables with relationships, flexible NoSQL models, and objects (files plus metadata) addressed by a unique key over HTTP.", nodes: [
      { id: "sql", label: "SQL databases", sub: "Users(1 Alice, 2 Bob) ← Orders(101→1, 102→2)", col: 0, row: 0, shape: "db", tone: "store", w: 290 },
      { id: "nosql", label: "NoSQL databases", sub: "{ userID: 2, name: Bob, orders: [...] }", col: 1.7, row: 0, shape: "db", tone: "accent", w: 270 },
      { id: "blob", label: "Blob / object storage", sub: "images · movies · music · logs · backups", col: 3.3, row: 0, shape: "db", tone: "cache", w: 270 },
    ], edges: [] },
    { type: "h3", text: "SQL (relational) databases" },
    { type: "p", text: "The traditional choice for **structured** data: tables that relate to each other through primary and foreign keys, supporting complex queries and transactions. Use them for complex transactions that need ACID guarantees, for systems where data integrity and relationships are crucial, and when a structured schema and SQL's querying power help. See [relational databases](/learn/relational-databases)." },
    { type: "h3", text: "NoSQL databases" },
    { type: "p", text: "Built to store and manage **semi-structured and unstructured** data, in several forms: key-value, document, column-family and graph. Known for flexibility, scalability and performance with large volumes. A document database might store a user together with their orders:" },
    { type: "code", code: `{
  "userID": "2",
  "name": "Bob",
  "orders": [{ "orderID": "102", "details": "Order details here..." }]
}` },
    { type: "p", text: "Use them when you need high scalability and a flexible data model, when the data structure changes fast during development, or for large volumes of unstructured or semi-structured data. See [NoSQL databases](/learn/nosql-database-types)." },
    { type: "h3", text: "Blob / object storage" },
    { type: "p", text: "Blob (Binary Large Object) or **object storage** holds unstructured files such as images, videos, audio, backups and logs. Each object bundles the data, its metadata and a unique identifier, and is reached over HTTP/HTTPS. It scales almost without limit. Use it for large media files, backups and disaster recovery, and content served straight to browsers (often through a [CDN](/learn/cdn)). See [object storage](/learn/object-storage)." },
    { type: "table", head: ["Feature", "SQL databases", "NoSQL databases", "Blob/object storage"], rows: [
      ["Data structure", "Structured", "Semi-structured / unstructured", "Unstructured"],
      ["Scalability", "Vertical (horizontal with sharding work)", "Horizontal", "Horizontal"],
      ["Transactions", "ACID", "Varies", "Not applicable"],
      ["Querying", "Complex queries", "Flexible, schema-less queries", "Metadata-based"],
      ["Typical use", "Traditional web apps, ERP systems", "Big data, real-time analytics", "Media storage, backups"],
    ] },

    { type: "h2", text: "Choosing the right storage" },
    { type: "p", text: "You wouldn't use a hammer on a screw, and you wouldn't use a key-value store for relational data that needs complex joins. The choice affects performance and scalability, and also complexity and cost. Ask:" },
    { type: "ul", items: [
      "**Data model**: is the data structured, semi-structured or unstructured? Does it fit neatly into tables or is it free-form?",
      "**Access patterns**: more reads or more writes? Do you need fast reads, fast writes, or both?",
      "**Scale**: how much data now and later? Do you need to scale out across machines or up on one machine?",
      "**Consistency**: do you need strong consistency, or is eventual consistency acceptable?",
      "**Cost**: capacity, transaction rates and operational overhead give each option a different cost profile.",
    ] },

    { type: "h2", text: "SQL vs NoSQL: the core differences" },
    { type: "p", text: "**SQL databases** store data in tables with a fixed schema and let you query it flexibly with joins and transactions. **NoSQL** is an umbrella term for non-relational stores that trade some of that flexibility for easier horizontal scaling, flexible schemas or a data model matched to a specific access pattern. Neither is better in general; the right choice follows from how the data is **read and written**." },
    { type: "table", head: ["", "SQL (relational)", "NoSQL"], rows: [
      ["Data model", "Tables, rows, foreign keys", "Key-value, documents, wide columns or graphs. See [NoSQL database types](/learn/nosql-database-types)"],
      ["Schema", "Defined up front, enforced by the database", "Flexible; often enforced by the application"],
      ["Queries", "Ad-hoc SQL: joins, aggregations, any filter with the right index", "Mostly lookups by key or a few designed access paths; limited joins"],
      ["Transactions", "Multi-row, multi-table ACID", "Often single-item atomicity; some offer multi-item transactions with limits"],
      ["Scaling writes", "One primary per database; sharding is extra work", "Built-in partitioning across many nodes"],
      ["Consistency", "Strong by default", "Often eventual or tunable. See [CAP theorem](/learn/cap-theorem)"],
      ["Examples", "PostgreSQL, MySQL, SQL Server, Oracle; Spanner, CockroachDB", "DynamoDB, Cassandra, MongoDB, Redis, Neo4j"],
    ] },

    { type: "h2", text: "The same data, modeled two ways" },
    { type: "diagram", kind: "flow", caption: "Relational: normalized tables joined at query time. Document: one order stored as a nested document, read in a single lookup.", nodes: [
      { id: "users", label: "users", sub: "id, name, email", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "orders", label: "orders", sub: "id, user_id, total", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "items", label: "order_items", sub: "order_id, sku, qty", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "doc", label: "orders collection", sub: "{ user: {...}, items: [...] }", col: 1, row: 1.3, shape: "db", tone: "accent", w: 200 },
    ], edges: [
      { from: "orders", to: "users", label: "FK" }, { from: "items", to: "orders", label: "FK" },
    ], zones: [{ label: "SQL: normalized", from: [0, 0], to: [2, 0] }, { label: "Document: denormalized", from: [0.6, 1.3], to: [1.4, 1.3], tone: "accent" }] },
    { type: "p", text: "The relational version stores each fact once and can answer questions nobody planned for (\"revenue by product category by month\"). The document version reads a whole order in one fast lookup but duplicates user details and makes cross-order queries harder. See [normalization vs denormalization](/learn/normalization-denormalization)." },

    { type: "h2", text: "How to choose between SQL and NoSQL" },
    { type: "h3", text: "Most of the time, either works" },
    { type: "p", text: "Many systems could be built on either, and the choice often comes down to team familiarity or existing infrastructure. The popular saying **\"Just use Postgres\"** captures this: beginners and experts alike end up recommending PostgreSQL, while the people in the middle agonize over object stores, key-value stores, event sourcing, time-series and graph databases. The line is blurry anyway: PostgreSQL supports NoSQL-style **JSON fields** that you can index and query." },
    { type: "code", code: `-- PostgreSQL: a flexible JSON column inside a relational table
CREATE TABLE products (
    id    bigserial PRIMARY KEY,
    name  text NOT NULL,
    attrs jsonb                                  -- different keys per product category
);
CREATE INDEX products_attrs ON products USING gin (attrs);

SELECT name FROM products WHERE attrs @> '{"waterproof": true}';` },
    { type: "p", text: "This is especially true for small systems: if QPS is low, pick the simpler option and don't over-engineer. PostgreSQL covers the vast majority of use cases, including JSON data and horizontal-scaling extensions." },
    { type: "h3", text: "If you need transactions, go with SQL" },
    { type: "p", text: "SQL databases suit cases that need strong consistency and ACID transactions: banking systems and e-commerce checkout flows need strict transactional integrity." },
    { type: "h3", text: "Then check the data model, consistency and queries" },
    { type: "table", head: ["Question", "Points to SQL", "Points to NoSQL"], rows: [
      ["**Data model**: is it structured and relational?", "Structured, relational data", "Semi-structured or unstructured data"],
      ["**Consistency vs availability**", "Strong consistency required (financial transactions)", "Availability matters more (content feeds)"],
      ["**Query requirements**", "Complex queries, relational operations, JOINs", "Fast lookups, simple key-value operations"],
    ] },
    { type: "h3", text: "When SQL is the better default" },
    { type: "ul", items: [
      "Data is **relational**: many entities that reference each other (users, orders, products, payments).",
      "You need **transactions** across several rows or tables: money, inventory, bookings.",
      "Access patterns will **change**, or analysts need ad-hoc queries.",
      "The data fits on one primary (with replicas), which with modern hardware is often terabytes and thousands of writes per second.",
    ] },
    { type: "callout", text: "PostgreSQL is a strong default for a new system. It handles relational data, JSON documents (`jsonb`), full-text search and geospatial queries well enough for many products, and you can move specific workloads elsewhere when numbers demand it." },
    { type: "h3", text: "When NoSQL is the better fit" },
    { type: "ul", items: [
      "**Massive scale with simple access patterns**: billions of items read and written by key (sessions, user timelines, IoT readings, shopping carts).",
      "**Write-heavy workloads** that outgrow a single primary: append-heavy event or time-series data on wide-column stores like Cassandra (millions of writes per second).",
      "**Flexible or evolving structure**: product catalogs where each category has different attributes, or schema changes deploying daily (document stores like MongoDB).",
      "**Specialized models**: relationship traversal (graph databases), sub-millisecond caching and counters (Redis), search (Elasticsearch).",
      "**Predictable latency at any scale** with managed operations (DynamoDB).",
    ] },
    { type: "h3", text: "Hybrid systems: several databases in one design" },
    { type: "p", text: "Modern systems commonly use several databases, even of different types, each for the component it fits (**polyglot persistence**):" },
    { type: "diagram", kind: "flow", caption: "A typical e-commerce backend: each kind of data lives in the store that suits it.", nodes: [
      { id: "app", label: "E-commerce services", col: 1.5, row: 0, tone: "accent" },
      { id: "pg", label: "PostgreSQL", sub: "orders, payments (ACID)", col: 0, row: 1.2, shape: "db", tone: "store" },
      { id: "redis", label: "Redis", sub: "sessions, cache", col: 1, row: 1.2, shape: "db", tone: "cache" },
      { id: "mongo", label: "MongoDB", sub: "product catalog", col: 2, row: 1.2, shape: "db", tone: "ok" },
      { id: "es", label: "Elasticsearch", sub: "product search", col: 3, row: 1.2, shape: "db", tone: "queue" },
    ], edges: [{ from: "app", to: "pg" }, { from: "app", to: "redis" }, { from: "app", to: "mongo" }, { from: "app", to: "es" }] },
    { type: "ul", items: [
      "**E-commerce**: PostgreSQL for orders and transactions, Redis for session storage and caching, MongoDB for the product catalog, Elasticsearch for product search.",
      "**Social network**: PostgreSQL for user information, a graph or wide-column store (Neo4j or Cassandra) for friendship relations, Redis for pending user feeds.",
    ] },
    { type: "p", text: "Keep the stores in sync with events or [change data capture](/learn/change-data-capture) rather than dual writes from application code." },
    { type: "h3", text: "A checklist for interviews" },
    { type: "ol", items: [
      "List the **access patterns**: what queries run, how often, with what latency.",
      "Estimate **volume and write rate**. See [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation).",
      "Identify **invariants** that need transactions (no double booking, balance never negative).",
      "Pick the simplest store that serves those patterns at that scale; use different stores for different parts: Postgres for orders, Redis for sessions, Elasticsearch for search, S3 for media.",
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
    "For small or low-QPS systems, choose the simpler option and say you'd revisit at scale.",
    "Use different stores for different data and say how they stay in sync (events, CDC).",
    "If you pick NoSQL, show the key or partition design that serves each query.",
    "Mention that relational databases scale further than people think with replicas and caching before sharding is needed.",
  ],
  related: ["relational-databases", "nosql-database-types", "object-storage", "normalization-denormalization", "acid-vs-base", "sharding", "replication", "database-indexing"],
  practice: ["url-shortener", "news-feed", "ticket-booking", "key-value-store"],
  reading: [
    { title: "Just use Postgres", publisher: "Ethan McCue", url: "https://mccue.dev/pages/8-16-24-just-use-postgres" },
    { title: "JSON types", publisher: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/datatype-json.html" },
    { title: "JSON functions and operators", publisher: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/functions-json.html" },
  ],
};
