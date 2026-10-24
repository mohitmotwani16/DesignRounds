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

    {"type":"h2","text":"Time-series patterns you can build anywhere"},
    {"type":"p","text":"Pre-computed aggregates (see [materialized views](/learn/materialized-views)) are themselves time series, and they grow forever. Three patterns keep them fast and bounded, whether you use a TSDB or plain Redis."},
    {"type":"h3","text":"Bucketing on fixed time boundaries"},
    {"type":"p","text":"Store each aggregate under a key that includes its aligned time boundary:"},
    {"type":"code","code":"metric:page_views:minute:2024-01-15T10:05:00\nmetric:page_views:minute:2024-01-15T10:06:00\nmetric:page_views:minute:2024-01-15T10:07:00"},
    {"type":"p","text":"\"Views in the last 10 minutes\" is exactly 10 key reads: no scanning, no filtering, and you know which keys to fetch before reading anything. Arbitrary timestamps would force a scan-and-filter; aligned buckets turn range queries into point lookups."},
    {"type":"diagram","kind":"timeline","caption":"Minute-aligned buckets: events are counted into the bucket for their minute, so a 10-minute query reads exactly ten known keys.","ticks":["10:00","10:01","10:02","10:03","10:04","10:05"],"spans":[{"from":0,"to":1,"label":"…:10:00 → 41","lane":0,"tone":"accent"},{"from":1,"to":2,"label":"…:10:01 → 37","lane":0,"tone":"ok"},{"from":2,"to":3,"label":"…:10:02 → 52","lane":0,"tone":"accent"},{"from":3,"to":4,"label":"…:10:03 → 44","lane":0,"tone":"ok"},{"from":4,"to":5,"label":"…:10:04 → 39","lane":0,"tone":"accent"}],"events":[{"at":0.3},{"at":0.7},{"at":1.2},{"at":1.6},{"at":2.4},{"at":2.5},{"at":3.8},{"at":4.1},{"at":4.6}]},
    {"type":"table","head":["Granularity","Typical use","Points per day"],"rows":[["1 second","Real-time monitoring, rapid feedback loops","86,400"],["1 minute","Operational dashboards, alerting","1,440"],["1 hour","Business metrics, daily patterns","24"],["1 day","Historical trends, weekly and monthly reports","1"]]},
    {"type":"h3","text":"Rollups: coarser as data ages"},
    {"type":"p","text":"A year of 1-second data is about **31 million points per metric**, yet nobody zooms into one second from six months ago. A **rollup** aggregates fine buckets into coarser ones as data ages:"},
    {"type":"diagram","kind":"segments","caption":"A tiered retention policy: about 2,500 points per metric per year, no matter how many years you keep, instead of 31 million raw 1-second points.","width":640,"lanes":[{"label":"Retention","parts":[{"label":"last 24 h: 1-minute","size":1440,"tone":"accent","sub":"1,440 points"},{"label":"last 30 days: 1-hour","size":720,"tone":"ok","sub":"720 points"},{"label":"last year: 1-day","size":365,"tone":"store","sub":"365"}]}]},
    {"type":"ol","items":["A background job reads the 60 one-minute buckets for 10:00–10:59.","It computes sum, average, min, max and count into one 1-hour bucket.","It writes the hourly bucket.","The minute buckets are deleted or left to expire."]},
    {"type":"p","text":"Run minute→hour rollups hourly and hour→day rollups daily, **after** late data for the period has arrived. Keep the aggregates your queries need: sums for totals; **sum and count** (not just the average) for latency, so averages stay correct across rolled-up periods; min and max for peaks and alerting."},
    {"type":"h3","text":"Retention with TTLs"},
    {"type":"p","text":"Many stores (Redis, most TSDBs, some NoSQL databases) expire keys automatically. Set TTLs per tier: minute buckets 24 hours, hour buckets 30 days, day buckets a year or forever, and cleanup needs no deletion jobs. Tune from query logs: if nobody reads minute-level data older than 2 hours, shorten that TTL and save storage with no user impact."},
    {"type":"code","code":"import redis, time\nr = redis.Redis()\n\ndef record(metric: str, value: float, ts: float):\n    minute = int(ts) // 60 * 60\n    key = f\"metric:{metric}:minute:{minute}\"\n    pipe = r.pipeline()\n    pipe.hincrbyfloat(key, \"sum\", value); pipe.hincrby(key, \"count\", 1)\n    pipe.expire(key, 24 * 3600)                     # tier 1: keep minutes for a day\n    pipe.execute()\n\ndef rollup_hour(metric: str, hour_start: int):      # run hourly, after late data settles\n    keys = [f\"metric:{metric}:minute:{hour_start + 60 * i}\" for i in range(60)]\n    rows = [r.hgetall(k) for k in keys]\n    total = sum(float(x.get(b\"sum\", 0)) for x in rows)\n    count = sum(int(x.get(b\"count\", 0)) for x in rows)\n    hkey = f\"metric:{metric}:hour:{hour_start}\"\n    r.hset(hkey, mapping={\"sum\": total, \"count\": count})\n    r.expire(hkey, 30 * 24 * 3600)                  # tier 2: keep hours for 30 days\n\nrecord(\"latency_ms\", 182.0, time.time())\n# average latency for an hour = sum / count, still exact after the rollup"},
    {"type":"h3","text":"High-cardinality dimensions"},
    {"type":"p","text":"\"Page views by user\" with millions of users means millions of keys per bucket, mostly holding 1 or 2. Use approximations instead (see [probabilistic data structures](/learn/probabilistic-data-structures)):"},
    {"type":"ul","items":["**HyperLogLog** for distinct counts: \"unique users today\" within a few percent using fixed memory (Redis uses about 12 KB for roughly 0.8% error), whether the answer is 1,847,293 or 1,852,106.","**Count-min sketch** for approximate frequencies (\"how often did each URL appear?\") without storing every distinct value.","**Sampling**: keep 1% of events in full detail and use aggregates for the rest; statistically valid for large-scale patterns."]},
    {"type":"p","text":"For dashboards, \"roughly 1.8 million users\" is as useful as the exact number, at a tiny fraction of the storage."},
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
  practice: ["iot-telemetry", "metrics-platform", "realtime-analytics", "clickstream", "data-alerting"],
};
