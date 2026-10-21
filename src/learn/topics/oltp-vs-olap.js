// OLTP vs OLAP: transactional vs analytical workloads, row vs column storage, compression,
// parallel processing, and how ETL connects the two.
export default {
  blocks: [
    { type: "p", text: "Applications store users, process orders and manage content. Organizations also need to **analyze** that data: revenue by region, products bought together, signups per month. These two jobs have opposite access patterns, so they use different databases. **OLTP** (online transaction processing) databases run the application; **OLAP** (online analytical processing) databases answer business questions." },

    { type: "h2", text: "Two different workloads" },
    { type: "ul", items: [
      "**OLTP** serves the application in real time: insert an order, update inventory, delete a comment. Each operation touches a **few rows**, and thousands run per second.",
      "**OLAP** serves business intelligence: \"total revenue by region?\", \"which products sell together?\", \"signups per month?\". Each query scans **millions of rows**; far fewer queries run, but each is expensive.",
    ] },
    { type: "p", text: "Production systems use both. The OLTP database records transactions, and an [ETL pipeline](/learn/etl-vs-elt) extracts that data, transforms it and loads it into the OLAP system for analysis." },
    { type: "diagram", kind: "flow", caption: "OLTP and OLAP side by side: the app's database handles many small reads and writes; ETL copies the data into a column-oriented warehouse that analysts query.", nodes: [
      { id: "u", label: "Users", col: 0, row: 0, shape: "pill" },
      { id: "app", label: "Application", col: 1.1, row: 0 },
      { id: "oltp", label: "OLTP database", sub: "PostgreSQL, MySQL", col: 2.3, row: 0, shape: "db", tone: "store" },
      { id: "etl", label: "ETL / CDC", sub: "extract, transform, load", col: 2.3, row: 1.2, shape: "queue", tone: "queue" },
      { id: "olap", label: "OLAP warehouse", sub: "Redshift, BigQuery", col: 3.6, row: 1.2, shape: "db", tone: "accent" },
      { id: "bi", label: "Analysts / BI dashboards", col: 3.6, row: 0, shape: "pill" },
    ], edges: [{ from: "u", to: "app" }, { from: "app", to: "oltp", label: "small reads/writes" }, { from: "oltp", to: "etl" }, { from: "etl", to: "olap" }, { from: "bi", to: "olap", label: "big scans" }] },

    { type: "h2", text: "Transactional (OLTP) databases" },
    { type: "p", text: "OLTP databases are built for **high throughput of small operations**. Each query touches a few rows by primary key or index: an e-commerce site looks up a user by ID, updates the cart and commits, thousands of times a second." },
    { type: "ul", items: [
      "**Indexes are crucial.** OLTP queries need millisecond latency, and B-tree indexes make key lookups fast; without them, queries scan whole tables and take seconds. See [database indexing](/learn/database-indexing).",
      "**Storage models vary.** MySQL and PostgreSQL use B-trees and update data in place; Cassandra and HBase use [LSM trees](/learn/lsm-trees-sstables), appending writes and compacting later. Each balances read and write performance differently.",
      "**Normalized data**: each fact stored once so updates are cheap and consistent. See [normalization](/learn/normalization-denormalization).",
    ] },
    { type: "code", code: `-- Typical OLTP: touch one customer's rows by key, in milliseconds
BEGIN;
SELECT * FROM carts WHERE user_id = 42;
UPDATE inventory SET stock = stock - 1 WHERE sku = 'tee-m-blue' AND stock > 0;
INSERT INTO orders (user_id, sku, amount) VALUES (42, 'tee-m-blue', 19.99);
COMMIT;` },

    { type: "h2", text: "Analytical (OLAP) databases" },
    { type: "p", text: "OLAP databases are built for **throughput of large scans**. \"Total sales by region\" scans the whole orders table, groups by region and sums amounts." },
    { type: "code", code: `-- Typical OLAP: scan millions of rows, read few columns, aggregate
SELECT region, date_trunc('month', order_date) AS month, SUM(amount) AS revenue
FROM fact_orders
GROUP BY region, month
ORDER BY month, revenue DESC;` },
    { type: "ul", items: [
      "**Indexes matter less.** An index on region finds one region's rows, but this query needs every region, so the database reads most of the table anyway. When a query touches a large fraction of a table, a sequential scan beats index lookups (for selective filters matching few rows, an index still wins).",
      "**Column-oriented storage is essential.** Analytical queries read a few columns of wide tables: summing revenue doesn't need product names or descriptions. Column stores keep each column separately, so only the revenue column is read, which cuts disk I/O dramatically.",
      "**Compression saves space and I/O.** A column holds values of one type with similar values side by side, so it compresses far better than rows. Amazon Redshift and Google BigQuery are column stores for this reason.",
      "**Parallel processing.** MapReduce, Hadoop and Spark split a query across many servers, each processing a partition, then merge results; that's how petabytes get queried. See [MapReduce](/learn/mapreduce).",
      "**Denormalized models** such as star and snowflake schemas: a central fact table (orders) surrounded by dimension tables (customers, products, dates), so queries need few joins.",
    ] },
    { type: "diagram", kind: "segments", caption: "Row vs column layout for the same three orders. Summing revenue reads every field in a row store, but only the revenue column in a column store.", width: 620, lanes: [
      { label: "Row store", parts: [
        { label: "1 · Alice · EU · $30", size: 3, tone: "store" }, { label: "2 · Bob · US · $20", size: 3, tone: "store" }, { label: "3 · Cara · EU · $50", size: 3, tone: "store" },
      ] },
      { label: "Column store", parts: [
        { label: "ids 1,2,3", size: 2, tone: "muted" }, { label: "names", size: 2, tone: "muted" }, { label: "regions EU,US,EU", size: 2.5, tone: "muted" }, { label: "revenue 30,20,50", size: 2.5, tone: "ok", sub: "only this is read" },
      ] },
    ] },

    { type: "h2", text: "OLTP vs OLAP compared" },
    { type: "table", head: ["Feature", "OLTP (transaction processing)", "OLAP (analytical processing)"], rows: [
      ["Primary use", "Transactional processing, user-facing", "Internal analytics, data warehousing"],
      ["Read pattern", "Few records per query, usually by key", "Aggregations over many records"],
      ["Write pattern", "Random-access, low-latency writes from users", "Bulk imports via ETL pipelines or event streams"],
      ["Transactions", "High frequency, small", "Low frequency, large analytical queries"],
      ["Indexes", "Crucial", "Less important; sequential scans dominate"],
      ["Storage model", "Log-structured (Cassandra, HBase) or update-in-place (MySQL, PostgreSQL)", "Column-oriented (Google Dremel, Amazon Redshift)"],
      ["Data model", "Normalized (relational)", "Denormalized (star, snowflake schema)"],
      ["Data encoding", "Not a primary focus", "Compact encoding is essential"],
      ["Processing frameworks", "Not applicable", "MapReduce, Hadoop, Spark"],
      ["Examples", "MySQL, PostgreSQL, Oracle, SQL Server, Cassandra, HBase", "Google Dremel/BigQuery, Spark, Amazon Redshift, Cloudera, Snowflake, ClickHouse"],
      ["Queries per second", "High", "Low"],
    ] },
    { type: "callout", tone: "warning", text: "Don't run heavy analytics on the production OLTP database: one big report can saturate its disks and slow every user request. Point analytics at a replica at minimum, and at a warehouse once data grows." },
  ],
  uses: [
    { name: "E-commerce", text: "PostgreSQL or MySQL for orders and carts (OLTP); a warehouse like BigQuery or Redshift for sales dashboards (OLAP)." },
    { name: "Product analytics", text: "Click and event streams loaded into ClickHouse or Snowflake for funnels and retention reports." },
    { name: "Finance reporting", text: "Nightly ETL from the ledger database into a star schema for month-end reports." },
    { name: "Real-time dashboards", text: "Streams feed column stores for near-real-time aggregates. See [real-time analytics](/learn/real-time-analytics-architecture)." },
  ],
  interview: [
    "Separate the serving database (OLTP) from analytics (OLAP) and say how data flows between them (ETL, CDC or streams).",
    "Explain why a warehouse is column-oriented: queries read few columns, columns compress well.",
    "Keep heavy reporting off the primary database.",
    "Mention star schemas for warehouse modeling.",
  ],
  related: ["etl-vs-elt", "data-warehouse-vs-data-lake", "dimensional-modeling", "database-indexing", "normalization-denormalization", "mapreduce", "change-data-capture"],
  practice: ["realtime-analytics", "clickstream", "scd2-warehouse"],
};
