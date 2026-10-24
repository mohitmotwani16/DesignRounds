export default {
  blocks: [
    { type: "p", text: "**Data modeling** in a system design interview means deciding what you store, how it's shaped, and how it's keyed so the system's main reads and writes are fast and correct at the stated scale. It sits between the API and the architecture: once you know the operations, the data model decides which database fits, what the primary and partition keys are, which indexes you need, and what you denormalise. Interviewers use it to test whether a design will actually work, because most scaling problems are data model problems in disguise." },

    { type: "h2", text: "Where it fits in the interview" },
    { type: "p", text: "A typical flow is requirements, then core entities and APIs, then the data model, then the high-level design, then deep dives. You don't need every column. You need the handful of entities that matter, their keys, their relationships, and the access patterns each table serves. Two to five tables, drawn with keys, is usually right." },

    { type: "h2", text: "A method in six steps" },
    { type: "ol", items: [
      "**List the core entities** from the requirements: users, posts, follows, likes for a social feed; links and clicks for a URL shortener.",
      "**Mark the relationships** and their cardinality: one-to-few, one-to-many, many-to-many. Cardinality decides whether data is embedded, referenced or joined.",
      "**Write down the access patterns**: the queries the system runs, with rough rates. \"Get the 50 newest posts from people I follow\" and \"redirect a short code\" are access patterns; \"store users\" is not.",
      "**Choose the store per entity** from the access patterns and consistency needs, not from habit.",
      "**Choose keys**: the primary key that identifies a row, and for distributed stores the **partition key** that decides which machine holds it and the **sort key** that orders rows within a partition.",
      "**Add indexes and denormalisation** only where an access pattern needs them, and state what each costs on writes.",
    ] },
    { type: "callout", tone: "tip", text: "Access patterns first. In a relational database you can usually add an index later for a new query; in a key-value or wide-column store, a query the key doesn't support often means a new table and a backfill. Interviewers want to see you design the keys around the queries." },

    { type: "h2", text: "Conceptual, logical and physical models" },
    { type: "table", head: ["Level", "What it captures", "In an interview"], rows: [
      ["Conceptual", "Entities and relationships in business terms (a rider requests a trip; a driver accepts it)", "Your entity list and arrows; a minute of talk"],
      ["Logical", "Attributes, keys and cardinality, independent of any database", "The tables or documents with their keys"],
      ["Physical", "How a specific database stores it: types, partition and sort keys, indexes, replication", "Where the scaling discussion happens: partition key choice, hot partitions, indexes"],
    ] },

    { type: "h2", text: "Relationships and how each model handles them" },
    { type: "table", head: ["Relationship", "Example", "Relational", "Document", "Wide-column / key-value"], rows: [
      ["One-to-few", "A user's addresses, a product's variants", "Child table with a foreign key", "Embed in the parent document", "Store inside the parent row"],
      ["One-to-many (unbounded)", "A post's comments, a channel's messages", "Child table indexed by parent id", "Separate collection referencing the parent; embedding grows without limit", "Partition by parent id, sort by time: one partition holds the parent's children in order"],
      ["Many-to-many", "Users follow users; students and courses", "Junction table with two foreign keys", "Arrays of references on one or both sides; joins move to the application", "Two tables, one per direction (followers of X, following of X)"],
      ["Deeply connected", "Social graphs, recommendations, fraud rings", "Recursive queries get slow and complex", "Poor fit", "Poor fit; a graph database or a precomputed adjacency table"],
    ] },
    { type: "p", text: "Two practical rules follow. Documents work well for **self-contained, tree-shaped data that is read as a whole** and changes as a unit, such as a product page or a user profile with a few addresses. They work badly for **unbounded children** (a celebrity's comments) or **shared entities referenced from many places** (a company name copied into a million profiles must be updated a million times)." },

    { type: "h2", text: "Choosing a store from the access patterns" },
    { type: "table", head: ["If the access patterns are…", "Reach for", "Example"], rows: [
      ["Varied queries, joins, transactions, strong integrity", "Relational (PostgreSQL, MySQL)", "Orders and payments, bookings, inventory"],
      ["Get a whole object by id, flexible attributes", "Document (MongoDB, DynamoDB documents)", "Product catalogue, user settings"],
      ["Very high write rate, reads by a known key and time range", "Wide-column (Cassandra, ScyllaDB, Bigtable)", "Chat messages, activity feeds, IoT readings"],
      ["Lookup by a single key at extreme rates", "Key-value (Redis, DynamoDB)", "Sessions, short-link redirects, counters, caches"],
      ["Traversing relationships several hops deep", "Graph (Neo4j, Neptune)", "Friends-of-friends, fraud rings"],
      ["Full-text and faceted search", "Search index (Elasticsearch, OpenSearch)", "Product search, log search"],
      ["Aggregations over huge history", "Columnar warehouse or OLAP store", "Analytics, dashboards"],
    ] },
    { type: "p", text: "Most real systems use several, each serving the access patterns it is good at, with one of them as the source of truth and the others kept in sync by events or change data capture. See [SQL vs NoSQL](/learn/sql-vs-nosql) and [NoSQL database types](/learn/nosql-database-types)." },

    { type: "h2", text: "Keys: primary, partition and sort" },
    { type: "ul", items: [
      "**Primary key** uniquely identifies a record. Prefer stable, meaningless ids (a generated id) over natural values like email addresses, which change.",
      "**Partition key** (or shard key) decides which node stores the record. It must spread load evenly and match the main query, so that query hits one partition. See [sharding](/learn/sharding).",
      "**Sort key** (or clustering key) orders records inside a partition, which makes range queries such as \"newest 50 messages in this conversation\" a single sequential read.",
      "**Id generation** at scale needs a strategy: database sequences don't work across shards, so use [unique ID generators](/learn/unique-id-generation) such as Snowflake-style ids, which are also roughly time-ordered.",
    ] },
    { type: "callout", tone: "warning", text: "Hot partitions are the classic trap: partitioning messages by conversation works until one group chat has a million members, and partitioning by date sends all of today's writes to one node. Say how you'd spread a hot key (add a bucket suffix, split by time window). See [hot partitions](/learn/hot-partitions)." },

    { type: "h2", text: "Indexes and their cost" },
    { type: "p", text: "Every secondary index speeds up one read pattern and slows every write, because each insert or update must also update the index. Name the index each query needs, prefer composite indexes that match the filter and sort order (`(user_id, created_at desc)` for a user's latest posts), and use covering indexes for very hot reads. In distributed stores, a secondary index is either local to each partition (cheap writes, scatter-gather reads) or global (fast reads, slower and eventually consistent writes). See [database indexing](/learn/database-indexing)." },

    { type: "h2", text: "Normalise or denormalise" },
    { type: "p", text: "Normalised data stores each fact once, so updates are simple and consistent, at the cost of joins on read. Denormalised data copies fields to where they're read, so reads are one lookup, at the cost of more writes and possible inconsistency. In interviews, start normalised for the source of truth and denormalise deliberately for the hot read paths, saying how the copies are kept up to date: synchronously in the same transaction, or asynchronously through events. Precomputed counts (likes on a post) and fan-out feeds are the most common examples. See [normalization vs denormalization](/learn/normalization-denormalization)." },

    { type: "h2", text: "Schema flexibility and evolution" },
    { type: "p", text: "Relational databases enforce the schema on write: changing it is an explicit migration, and every row follows the new shape. Document stores read whatever was written, so the schema lives in application code, which must handle old and new shapes until old records are migrated, either lazily on read or by a background job. Flexibility is useful for genuinely varied records, but most data has a stable shape, and a JSON column in a relational database often gives enough flexibility without giving up joins and constraints. Whatever the store, plan changes as backward compatible steps: add, backfill, switch reads, then remove." },

    { type: "h2", text: "Worked examples" },
    { type: "h3", text: "URL shortener" },
    { type: "code", code: `
links      (short_code PK, long_url, owner_id, created_at, expires_at)
           -- key-value or wide-column store, partitioned by short_code
           -- access: get long_url by short_code (very hot, cached); create link
clicks     (short_code, clicked_at, country, referrer)
           -- append-only; partition by short_code + day bucket, sort by clicked_at
           -- access: click counts per link over time (aggregated asynchronously)
` },
    { type: "p", text: "The redirect is a single-key lookup at enormous read rates, so a key-value store plus a cache fits. Clicks are a high-volume append stream aggregated offline, not counted on the redirect path. See [design a URL shortener](/learn/design-url-shortener)." },
    { type: "h3", text: "Chat messages" },
    { type: "code", code: `
messages      (conversation_id, message_id, sender_id, body, sent_at)
              -- wide-column: partition key conversation_id, sort key message_id (time-ordered)
              -- access: newest N messages in a conversation; page backwards
conversations (conversation_id PK, type, title, created_at)          -- relational
members       (conversation_id, user_id, role, last_read_message_id) -- relational, indexed both ways
inbox         (user_id, last_activity_at, conversation_id)
              -- per-user list of conversations sorted by recent activity (denormalised)
` },
    { type: "p", text: "Messages are written constantly and read as a recent range per conversation, which is exactly what a partition key plus a time-ordered sort key serves. The inbox is a deliberate denormalised copy for the \"my chats\" screen, updated on every message." },
    { type: "h3", text: "Social follow graph and feed" },
    { type: "code", code: `
follows_by_follower  (follower_id, followee_id, created_at)   -- who do I follow?
follows_by_followee  (followee_id, follower_id, created_at)   -- who follows me? (same data, other direction)
posts                (author_id, post_id, body, created_at)    -- partition by author, sort by time
feed                 (user_id, post_id, author_id, created_at) -- precomputed timeline per user (fan-out on write)
post_counters        (post_id PK, likes, comments)             -- denormalised counts, updated asynchronously
` },
    { type: "p", text: "The many-to-many follow relationship is stored twice, once per direction, because both questions are hot and a single table can only be partitioned one way. Feeds are precomputed for most users and assembled at read time for accounts with millions of followers. See [fan-out](/learn/fan-out) and [design Twitter](/learn/design-twitter)." },

    { type: "h2", text: "Operational data model vs analytical data model" },
    { type: "p", text: "Everything above is about **operational** data that serves the product: small reads and writes, shaped by access patterns. Analytics needs a different shape: a few huge scans and aggregations over history, which is what warehouses and [dimensional modeling](/learn/dimensional-modeling) are for. Don't try to serve both from one schema; stream changes from the operational store into the analytical one. See [OLTP vs OLAP](/learn/oltp-vs-olap)." },

    { type: "h2", text: "Common mistakes" },
    { type: "ul", items: [
      "Listing tables and columns without saying which queries they serve.",
      "Choosing a NoSQL store and then needing joins or ad-hoc queries it can't do.",
      "Partition keys that create hot spots: by date, by a celebrity's id, or by a low-cardinality status.",
      "Embedding unbounded lists in a document.",
      "Adding indexes for every field without mentioning the write cost.",
      "Denormalising without saying how the copies stay in sync.",
      "Using mutable natural values (email, username) as primary keys.",
    ] },
  ],
  uses: [
    { name: "Every system design round", text: "The data model is where interviewers check that the high-level design can actually serve its main queries at scale." },
    { name: "Choosing databases in production", text: "Access-pattern-first modeling is how teams pick between relational, document, wide-column and key-value stores." },
    { name: "Migrations", text: "Planning keys and evolution up front avoids painful repartitioning when traffic grows." },
  ],
  interview: [
    "List entities, then access patterns with rough rates, before choosing a database.",
    "Draw two to five tables with primary, partition and sort keys.",
    "Name the index each hot query needs and what it costs on writes.",
    "Call out hot partitions and how you'd spread them.",
    "Denormalise deliberately and say how copies stay consistent.",
  ],
  related: ["sql-vs-nosql", "nosql-database-types", "normalization-denormalization", "database-indexing", "sharding", "hot-partitions", "dimensional-modeling"],
  practice: ["url-shortener", "chat-system", "news-feed"],
  reading: [
    { title: "Data Modeling — System Design Series", publisher: "Mohamed Shaaban, Medium", url: "https://medium.com/@mohamed.shaaban.elbay/data-modeling-system-design-series-e889b3c1fa9f" },
    { title: "Data Modeling for System Design Interviews", publisher: "DeployAndPray, Medium", url: "https://medium.com/@DeployAndPray/data-modeling-for-system-design-interviews-c7d5b9dbd15a" },
    { title: "Designing Data-Intensive Applications (chapters on data models and storage)", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
  ],
};
