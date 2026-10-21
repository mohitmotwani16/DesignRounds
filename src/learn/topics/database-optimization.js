// Database optimization: indexing choices, partitioning/replication, hot vs cold data tiering,
// EXPLAIN-driven query tuning, denormalization and materialized views.
export default {
  blocks: [
    { type: "p", text: "A query scans all 10 million rows of `orders` to find user 12345's orders: 8 seconds, and users abandon the page. With the right index, data layout and query, the same request takes about 10 milliseconds. Once the data model is designed, **optimization** decides how the database stores and retrieves that data: an unoptimized database full-scans on every query, while an optimized one serves millions of queries per second." },

    { type: "h2", text: "Indexing" },
    { type: "p", text: "Without an index on `user_id`, `SELECT * FROM orders WHERE user_id = 12345` reads every row. With one, the database walks a B-tree straight to that user's rows. See [database indexing](/learn/database-indexing)." },
    { type: "diagram", kind: "flow", caption: "Without an index the database scans 10M rows; with an index on user_id it walks a few B-tree pages to the matching rows.", nodes: [
      { id: "q", label: "WHERE user_id = 12345", col: 0, row: 0.6, shape: "pill", w: 200 },
      { id: "scan", label: "Full table scan", sub: "10,000,000 rows · ~8 s", col: 1.7, row: 0, tone: "danger", w: 210 },
      { id: "idx", label: "B-tree index on user_id", sub: "3–4 page reads · ~10 ms", col: 1.7, row: 1.2, tone: "ok", w: 210 },
    ], edges: [{ from: "q", to: "scan", label: "no index", tone: "danger" }, { from: "q", to: "idx", label: "index" }] },
    { type: "ul", items: [
      "**Single-column index**: for queries that filter on one field you query often, such as `user_id`.",
      "**Composite (multi-column) index**: for queries that filter on several fields together. An index on `(user_id, status)` helps queries on `user_id` alone or on both, but **not** on `status` alone; column order matters.",
      "**Selectivity**: an index works when it shrinks the candidate set a lot. `user_id` across 1 million users is great (few rows each); `status` with values active/inactive/pending is poor because each matches about a third of rows, so the database still reads hundreds of thousands.",
      "**Write cost**: every insert, update and delete must update every relevant index. Index only fields that matter for performance, find slow queries with `EXPLAIN` first, and note in interviews that over-indexing wastes memory and slows writes.",
    ] },
    { type: "code", code: `-- Composite index for "a user's orders by status, newest first"
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);

EXPLAIN ANALYZE
SELECT id, total, created_at FROM orders
WHERE user_id = 12345 AND status = 'shipped'
ORDER BY created_at DESC LIMIT 20;
-- Before: Seq Scan on orders (rows=10000000) ... Execution Time: 8012 ms
-- After:  Index Scan using idx_orders_user_status_created (rows=20) ... Execution Time: 0.4 ms` },

    { type: "h2", text: "Partitioning and replication" },
    { type: "p", text: "[Partitioning](/learn/sharding) splits data across servers to handle more writes and storage; [replication](/learn/replication) copies it for availability and read scaling. They're the foundation of [scaling databases](/learn/scaling-databases); the techniques below make them work well." },

    { type: "h2", text: "Separating hot and cold data" },
    { type: "p", text: "**Hot** data is accessed often; **cold** data rarely. Keeping both on fast, expensive storage wastes money and memory. Recent orders are hot: users check status constantly in the first few days, so they stay on SSDs in the primary database. Orders older than 30 days are cold and get archived to cheaper storage (HDDs, or object storage like Amazon S3). The application checks the primary first and falls back to the archive." },
    { type: "diagram", kind: "flow", caption: "Hot/cold tiering: recent orders stay on fast primary storage; a nightly job archives older ones; reads try hot first, then the archive.", nodes: [
      { id: "app", label: "Order service", col: 0, row: 0.6 },
      { id: "hot", label: "Primary DB (SSD)", sub: "orders < 30 days · hot", col: 1.6, row: 0, shape: "db", tone: "ok" },
      { id: "cold", label: "Archive (S3 / HDD)", sub: "orders ≥ 30 days · cold", col: 1.6, row: 1.2, shape: "db", tone: "muted" },
    ], edges: [{ from: "app", to: "hot", label: "1. try" }, { from: "app", to: "cold", label: "2. if not found", dashed: true }, { from: "hot", to: "cold", label: "nightly archive", dashed: true }] },
    { type: "p", text: "A smaller primary database fits more of its working set in memory, so the hot path gets faster. Cold queries are slower, which is fine because they're rare." },
    { type: "code", code: `-- Nightly archive job (PostgreSQL): move one batch of old orders atomically
WITH moved AS (
  DELETE FROM orders
  WHERE id IN (SELECT id FROM orders
               WHERE created_at < now() - interval '30 days'
               LIMIT 10000)
  RETURNING *
)
INSERT INTO orders_archive SELECT * FROM moved;
-- Repeat until no rows move. At scale, range-partition orders by month and
-- detach old partitions (then export them to object storage) instead.` },

    { type: "h2", text: "Query optimization" },
    { type: "p", text: "Use `EXPLAIN` to see the execution plan. A query that scans 1 million rows when it should scan 1,000 points to a missing index or a badly shaped query (functions on indexed columns, `SELECT *` on wide rows, N+1 query loops, `OFFSET` pagination deep into a table; see [pagination](/learn/pagination))." },
    { type: "ul", items: [
      "**Denormalization** trades storage for speed: store the customer name directly on each order instead of joining `orders` to `customers` on every read. Reads get faster; writes get harder because a name change must reach every order. Use it when reads far outnumber writes. See [normalization vs denormalization](/learn/normalization-denormalization).",
      "**Materialized views** precompute expensive queries: a dashboard of monthly sales by region would otherwise re-aggregate millions of rows on each load. The view stores the result, and you refresh it hourly or when source data changes. See [materialized views](/learn/materialized-views).",
    ] },
    { type: "code", code: `CREATE MATERIALIZED VIEW monthly_sales_by_region AS
SELECT c.region, date_trunc('month', o.created_at) AS month, SUM(o.total) AS revenue
FROM orders o JOIN customers c ON c.id = o.customer_id
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON monthly_sales_by_region (region, month);
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales_by_region;   -- e.g. hourly via cron` },

    { type: "h2", text: "Using this in an interview" },
    { type: "p", text: "Designing a social network's database? Index users by `user_id` and posts by `(author_id, created_at)`; point to partitioning and replication for horizontal scale; then add use-case optimizations: denormalize author name and avatar into posts for fast timeline rendering, a materialized view for trending topics, and archive posts older than a year to cold storage. Then state each trade-off: indexes speed reads but slow writes; denormalization speeds reads but complicates updates; materialized views cost storage and refresh work; cold storage saves money but makes old data slower." },
    { type: "table", head: ["Optimization", "Gain", "Cost"], rows: [
      ["Index", "Fast lookups and sorts", "Slower writes, memory"],
      ["Denormalization", "Fewer joins on reads", "Update fan-out, possible inconsistency"],
      ["Materialized view", "Instant aggregates", "Storage, refresh cost, staleness"],
      ["Hot/cold tiering", "Smaller, faster primary; cheaper storage", "Slower access to old data, archive logic"],
      ["Caching", "Fewer database reads", "Invalidation complexity. See [caching](/learn/caching)"],
    ] },
  ],
  uses: [
    { name: "E-commerce order history", text: "Composite indexes for \"my orders\" plus archiving orders older than 30–90 days." },
    { name: "Dashboards", text: "Materialized views or rollup tables refreshed on a schedule instead of live aggregation." },
    { name: "Social timelines", text: "Denormalized author data on posts so a feed renders without joins." },
    { name: "Logs and events", text: "Time-partitioned tables where old partitions are dropped or moved to object storage." },
  ],
  interview: [
    "Name the index for each main query, including column order.",
    "Mention EXPLAIN, selectivity and the write cost of indexes.",
    "Propose hot/cold separation when data grows without bound.",
    "Use denormalization and materialized views for read-heavy paths, and state what they cost.",
  ],
  related: ["database-indexing", "scaling-databases", "normalization-denormalization", "materialized-views", "sharding", "caching", "object-storage"],
  practice: ["news-feed", "url-shortener", "ticket-booking"],
};
