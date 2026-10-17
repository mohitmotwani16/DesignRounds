export default {
  blocks: [
    { type: "p", text: "A **time-series database (TSDB)** is optimised for data that is a sequence of timestamped measurements: CPU usage every 10 seconds, a sensor reading every second, a stock price on every trade. These workloads are append-heavy, read in time ranges, and lose value with age, so TSDBs are built very differently from general-purpose databases." },

    { type: "h2", text: "What makes time-series data special" },
    { type: "ul", items: [
      "**Writes vastly outnumber reads**, and almost all writes are appends of new points; old points are rarely updated.",
      "**Queries are over time windows and aggregates**: \"average latency per minute for the last 6 hours, grouped by region\".",
      "**Recent data is hot**, old data is cold and can be summarised.",
      "**Huge volume**: 10,000 servers × 200 metrics every 10 seconds is 200,000 points per second.",
    ] },

    { type: "h2", text: "The data model" },
    { type: "p", text: "A **series** is identified by a metric name plus **labels (tags)**, and holds (timestamp, value) points:" },
    { type: "code", code: `
http_requests_total{service="checkout", region="ap-south-1", status="500"}
  1792123200  1532
  1792123210  1541
  1792123220  1555
` },
    { type: "p", text: "Every unique combination of label values is a separate series. **Cardinality**, the number of series, is the main scaling constraint: a label like `user_id` with millions of values creates millions of series and can overwhelm a TSDB. Keep high-cardinality identifiers out of metric labels and put them in logs or traces instead." },

    { type: "h2", text: "How TSDBs are built" },
    { type: "ul", items: [
      "**Time-partitioned storage**: data is written into chunks or blocks per time window (for example 2 hours), so a query only opens blocks in its range and old blocks are dropped cheaply.",
      "**Compression**: consecutive timestamps are evenly spaced and consecutive values similar, so delta-of-delta encoding for timestamps and XOR encoding for floats (from Facebook's Gorilla) shrink points to around 1–2 bytes each.",
      "**Append-optimised writes**: LSM-style or columnar layouts. See [database indexing](/learn/database-indexing).",
      "**An inverted index of labels** to find all series matching `service=\"checkout\"` quickly.",
    ] },
    { type: "diagram", kind: "flow", caption: "Raw points are kept briefly; older data survives as coarser rollups, then expires.", nodes: [
      { id: "in", label: "Ingest", sub: "200k points/s", col: 0, row: 0, shape: "pill" },
      { id: "raw", label: "Raw, 10 s", sub: "keep 15 days", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "m5", label: "5-min rollups", sub: "keep 90 days", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "h1", label: "1-hour rollups", sub: "keep 2 years", col: 3, row: 0, shape: "db", tone: "store" },
      { id: "gone", label: "Deleted", col: 3, row: 1, tone: "muted", shape: "pill" },
    ], edges: [
      { from: "in", to: "raw" }, { from: "raw", to: "m5" }, { from: "m5", to: "h1" }, { from: "h1", to: "gone", dashed: true },
    ] },

    { type: "h2", text: "Keeping storage bounded: retention policies and rollups" },
    { type: "p", text: "Storing raw 10-second data forever is rarely worth it. A **retention policy** drops raw data after days or weeks, and **downsampling** keeps aggregates (min, max, average, count, percentiles via sketches) at coarser resolution for longer. Storing min and max, not just the average, keeps short spikes visible in long-range graphs." },

    { type: "h2", text: "Options" },
    { type: "table", head: ["System", "Model", "Notes"], rows: [
      ["Prometheus", "Pull-based metrics, local TSDB", "The standard for Kubernetes monitoring; scale out with Thanos, Cortex or Mimir"],
      ["InfluxDB", "Push-based TSDB", "Metrics, IoT and events with SQL-like queries"],
      ["TimescaleDB", "Extension of PostgreSQL", "Time partitioning and compression with full SQL and joins"],
      ["ClickHouse, Apache Druid", "Columnar analytics", "Very fast aggregations over huge event and log volumes"],
      ["Cassandra / Bigtable", "Wide-column", "Roll your own: partition by series and time bucket"],
    ] },
  ],
  uses: [
    { name: "Infrastructure monitoring", text: "Prometheus scrapes metrics from services and nodes; Grafana dashboards and alerts query it. See [observability](/learn/observability)." },
    { name: "IoT and industrial sensors", text: "Fleets of devices stream readings into InfluxDB or TimescaleDB, downsampled for long-term trends." },
    { name: "Financial market data", text: "Tick data is stored in specialised time-series stores (kdb+, ClickHouse) for fast range aggregations." },
    { name: "Product analytics", text: "Event counts per minute by feature or region feed real-time dashboards from Druid or ClickHouse." },
  ],
  interview: [
    "Recognise time-series workloads (metrics, sensors, ticks) and choose a TSDB or a wide-column design partitioned by series and time bucket.",
    "Mention retention and downsampling to keep storage bounded.",
    "Call out cardinality: never use unbounded identifiers as metric labels.",
    "Store min/max alongside averages in rollups so spikes aren't averaged away.",
  ],
  related: ["observability", "nosql-database-types", "batch-vs-stream-processing", "database-indexing", "back-of-the-envelope-estimation"],
  practice: ["metrics-platform", "realtime-analytics", "clickstream", "data-alerting"],
};
