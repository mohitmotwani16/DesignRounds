// Change data capture: the dual-write problem, log-based CDC (Debezium + Kafka), why it beats
// dual writes, implementation approaches, downstream systems, trade-offs and interview use.
export default {
  blocks: [
    { type: "p", text: "**Change data capture (CDC)** turns every committed change in a database into an event stream by reading the database's own transaction log. Search indexes, caches, analytics warehouses and other services subscribe to that stream and stay in sync, without the application writing to each of them and without extra queries against the primary database." },

    { type: "h2", text: "The dual-write problem" },
    { type: "p", text: "Product search must reflect every product update: new prices, changed descriptions. The naive approach has the application write to both the database and the search engine. Then one day the search service times out: the database write succeeds, search misses thousands of products, and the two silently diverge. Writing to several systems from application code fails in three ways:" },
    { type: "ul", items: [
      "**Partial failures**: the database write succeeds and the search write fails, so the product exists in one system but not the other.",
      "**Race conditions**: two updates reach the database as A→B but reach search as B→A, so the final states differ.",
      "**Tight coupling**: every write path must know every downstream system; adding analytics means changing application code.",
    ] },
    { type: "diagram", kind: "flow", caption: "Dual writes: the database commit succeeds but the search write times out, so the two systems disagree with nothing to repair them.", nodes: [
      { id: "app", label: "Application", col: 0, row: 0.6 },
      { id: "db", label: "Product DB", sub: "price = $49 ✓", col: 1.6, row: 0, shape: "db", tone: "store" },
      { id: "es", label: "Search index", sub: "still $59 ✗", col: 1.6, row: 1.2, shape: "db", tone: "danger" },
    ], edges: [{ from: "app", to: "db", label: "write 1 ok" }, { from: "app", to: "es", label: "write 2 timeout", tone: "danger" }] },

    { type: "h2", text: "How CDC works" },
    { type: "p", text: "Databases already keep a transaction log for durability and replication (MySQL's binlog, PostgreSQL's WAL, MongoDB's oplog). CDC taps that existing log: a product price update writes the row **and** appends to the log; the CDC connector reads the entry, produces an event with the new price and publishes it; a search indexer consumes it and updates the index." },
    { type: "ol", items: [
      "The **database** writes each change to its transaction log.",
      "A **CDC connector** (e.g. Debezium) tails the log and publishes change events.",
      "A **message broker** (e.g. Kafka) stores the events durably, in order per key.",
      "**Consumers** update search, caches, analytics and other services' read models.",
    ] },
    { type: "diagram", kind: "flow", caption: "Log-based CDC: the app writes only to its database; Debezium turns the transaction log into Kafka events that any number of consumers apply.", nodes: [
      { id: "app", label: "Application", col: 0, row: 1 },
      { id: "db", label: "Database", sub: "binlog / WAL", col: 1.2, row: 1, shape: "db", tone: "store" },
      { id: "dbz", label: "CDC connector", sub: "Debezium", col: 2.4, row: 1, tone: "accent" },
      { id: "k", label: "Kafka", sub: "products.changes", col: 3.6, row: 1, shape: "queue", tone: "queue" },
      { id: "s", label: "Search index", sub: "Elasticsearch", col: 4.9, row: 0, tone: "ok" },
      { id: "c", label: "Cache invalidator", sub: "Redis DEL", col: 4.9, row: 1, tone: "cache" },
      { id: "w", label: "Warehouse", sub: "BigQuery / Snowflake", col: 4.9, row: 2, tone: "store" },
    ], edges: [{ from: "app", to: "db", label: "commit" }, { from: "db", to: "dbz", label: "tail log" }, { from: "dbz", to: "k" }, { from: "k", to: "s" }, { from: "k", to: "c" }, { from: "k", to: "w" }] },
    { type: "p", text: "A Debezium change event carries the row before and after the change, the operation and the source position:" },
    { type: "code", code: `{
  "op": "u",                                        // c = create, u = update, d = delete
  "before": { "id": 812, "name": "Trail shoe", "price": 59.00 },
  "after":  { "id": 812, "name": "Trail shoe", "price": 49.00 },
  "source": { "db": "shop", "table": "products", "lsn": 24023128, "ts_ms": 1760950000000 }
}` },
    { type: "code", code: `# A consumer that keeps Elasticsearch and Redis in sync with product changes
import json
from kafka import KafkaConsumer
from elasticsearch import Elasticsearch
import redis

es, cache = Elasticsearch("http://localhost:9200"), redis.Redis()
consumer = KafkaConsumer("shop.public.products", bootstrap_servers="localhost:9092",
                         group_id="product-sync", enable_auto_commit=False,
                         value_deserializer=lambda v: json.loads(v) if v else None)

for msg in consumer:
    event = msg.value
    if event is None:                                  # tombstone after a delete
        consumer.commit(); continue
    row = event["after"] or event["before"]
    if event["op"] == "d":
        es.options(ignore_status=404).delete(index="products", id=row["id"])
    else:
        es.index(index="products", id=row["id"], document=event["after"])   # idempotent upsert
    cache.delete(f"product:{row['id']}")              # invalidate; next read refills
    consumer.commit()                                  # commit offset only after applying` },

    { type: "h2", text: "Why CDC beats dual writes" },
    { type: "ul", items: [
      "**Decoupling**: the application knows nothing about downstream systems. A new consumer is a new subscription, not a change to every writer.",
      "**Ordering**: changes flow in commit order per partition (usually per key or shard), so downstream state converges to the same result.",
      "**Completeness**: every committed change is in the log, so partial failures can't drop events, as long as the log is retained long enough and consumer offsets are tracked correctly.",
      "**Efficiency**: tailing a log is cheap. Only modified rows stream: no polling, no full scans, no extra queries on the primary.",
    ] },

    { type: "h2", text: "Implementation approaches" },
    { type: "table", head: ["Approach", "How", "Pros", "Cons"], rows: [
      ["**Log-based** (preferred)", "Read the transaction log directly (Debezium reads PostgreSQL's WAL, MySQL's binlog, MongoDB's oplog)", "Captures every change reliably, no app changes, minimal load on the primary", "Needs log access and retention; more infrastructure"],
      ["**Trigger-based**", "Triggers on insert/update/delete write to a change table; a process publishes from it", "Works where the log isn't accessible", "Every write runs the trigger, adding milliseconds per transaction"],
      ["**Polling-based**", "Every minute, query rows whose `updated_at` is newer than the last poll", "Simple", "Misses deletes (unless soft-deleted) and intermediate updates within an interval; adds query load. Use only when log-based CDC is unavailable"],
    ] },
    { type: "p", text: "Related: the [outbox pattern](/learn/outbox-pattern) writes business events into an outbox table in the same transaction, and CDC publishes that table. It's the standard way to emit domain events reliably." },

    { type: "h2", text: "Use cases and downstream systems" },
    { type: "ul", items: [
      "**Product search**: the primary database keeps transactional integrity while Elasticsearch, Algolia, Typesense or Meilisearch handle full-text search and faceting. A merchant edits a description, and the index updates within seconds without search queries touching the primary. See [full-text search](/learn/search-and-inverted-index).",
      "**Analytics pipelines**: each sale streams to BigQuery, Snowflake or ClickHouse, so analysts query a warehouse that's minutes behind instead of loading production. See [OLTP vs OLAP](/learn/oltp-vs-olap).",
      "**Cache invalidation**: a price change event makes the cache service delete that product's key, coordinating invalidation across cache nodes with no polling. See [cache invalidation](/learn/cache-invalidation).",
      "**Microservice data replication**: the Order Service keeps a local, denormalized read model of product data fed by CDC from the Product Service database, instead of calling its API on every request, which cuts latency and coupling. See [database per service](/learn/database-per-service) and [materialized views](/learn/materialized-views).",
    ] },

    { type: "h2", text: "Trade-offs" },
    { type: "ul", items: [
      "**Eventual consistency**: commit, capture, publish and apply take milliseconds to seconds. Meanwhile the database shows the new price and search shows the old one. Most products tolerate this; for critical reads (inventory counts at checkout), read the source database.",
      "**Operational complexity**: connectors, brokers and consumers must be deployed and monitored; failures and restarts handled; at-least-once (or effectively-once) delivery ensured; and **lag** between source and destination tracked. See [delivery semantics](/learn/delivery-semantics).",
      "**Schema changes need coordination**: a new column may require changes to CDC configuration, the event schema and every consumer. See [data contracts and schema evolution](/learn/data-contracts-schema-evolution).",
      "**For a simple app with one downstream system**, dual writes plus periodic reconciliation may be enough. CDC becomes essential with several consumers, when ordering matters, or when you can't modify application code.",
    ] },

    { type: "h2", text: "Common tools" },
    { type: "table", head: ["Tool", "Notes"], rows: [
      ["**Debezium**", "The most popular open-source CDC connector: MySQL, PostgreSQL, MongoDB, SQL Server and more; publishes to Kafka (via Kafka Connect) or other sinks"],
      ["**AWS DMS**", "Managed CDC and migration for AWS databases"],
      ["**Fivetran / Airbyte**", "Managed and open-source connectors with CDC for loading warehouses"],
      ["**Native streams**", "DynamoDB Streams, MongoDB change streams, PostgreSQL logical replication"],
    ] },

    { type: "h2", text: "Using CDC in an interview" },
    { type: "p", text: "Asked to add search to an e-commerce system, explain that full-text queries on the transactional database would hurt its write performance, then stream product changes via CDC into Elasticsearch or Algolia, reading the log without adding database load. State the eventual consistency explicitly (search may lag by seconds, fine for product search, not for inventory at checkout). Mention other consumers of the same stream: analytics, caches, materialized views. Close on the trade-off: more infrastructure, but at, say, 10 million searches a day you can't run those queries against the primary." },
  ],
  uses: [
    { name: "Search sync", text: "Product, listing and document databases streamed into Elasticsearch so search never queries the primary." },
    { name: "Warehouse loading", text: "Fivetran, Airbyte or Debezium feed BigQuery, Snowflake or ClickHouse continuously instead of nightly dumps." },
    { name: "Cache invalidation", text: "Row-change events delete the matching cache keys across all nodes." },
    { name: "Microservices", text: "Services keep local read models of other services' data, and the outbox pattern publishes domain events reliably." },
  ],
  interview: [
    "Avoid dual writes from application code; propose CDC (or the outbox pattern) to sync search, caches and analytics.",
    "Describe the pipeline: transaction log → Debezium → Kafka → consumers, with offsets committed after applying.",
    "State the consistency window and where it's acceptable.",
    "Mention idempotent consumers, ordering per key and monitoring lag.",
  ],
  related: ["outbox-pattern", "event-streaming-kafka", "search-and-inverted-index", "cache-invalidation", "database-per-service", "write-ahead-log", "materialized-views"],
  practice: ["cdc-pipeline", "etl-framework", "realtime-analytics", "fraud-data-platform"],
};
