// Materialized views and pre-aggregation: compute on write instead of read, a streaming
// page-views example, dimension explosion, late events, and the 80/20 two-tier approach.
export default {
  blocks: [
    { type: "p", text: "A dashboard shows page views per minute. Each refresh runs a query that scans millions of raw events and groups them by minute. Fine for a small site; at scale, with hundreds of people refreshing, it melts the database. A **materialized view** fixes this by computing the aggregate **as data arrives** and storing the result, so a dashboard read becomes a quick lookup instead of a scan." },

    { type: "h2", text: "The problem: queries that don't scale" },
    { type: "code", code: `SELECT date_trunc('minute', ts) AS minute, COUNT(*)
FROM page_events
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY minute;` },
    { type: "p", text: "At **10 million events a day**, the last hour holds roughly **400,000 rows**. Fifty dashboard users refreshing every 10 seconds means 5 queries per second, each scanning 400,000 rows: **2 million row scans per second for one chart**. An index on the timestamp only narrows the range; the GROUP BY still reads every matching row. Query cost keeps growing with data volume." },

    { type: "h2", text: "Compute on write, not on read" },
    { type: "p", text: "A regular **view** is a saved query, recomputed on every read. A **materialized view** stores the computed result, so the work moves from read time to write time. In streaming systems, the stream processor keeps running aggregates updated by every event, and when someone asks, the answer is already there. See [precomputation](/learn/precomputation-pattern)." },
    { type: "diagram", kind: "flow", caption: "Streaming materialized view: page-view events are counted per (page, minute) as they arrive; the dashboard reads 60 small keys instead of scanning raw events.", nodes: [
      { id: "web", label: "Web servers", col: 0, row: 0.6 },
      { id: "k", label: "Kafka", sub: "page-views topic", col: 1.3, row: 0.6, shape: "queue", tone: "queue" },
      { id: "sp", label: "Stream processor", sub: "1-min tumbling windows by page", col: 2.7, row: 0.6, tone: "accent", w: 230 },
      { id: "r", label: "Redis", sub: "page:42:minute:10:05 → 1,873", col: 4.2, row: 0, shape: "db", tone: "cache", w: 230 },
      { id: "raw", label: "Raw events", sub: "warehouse, for ad-hoc", col: 4.2, row: 1.2, shape: "db", tone: "store" },
      { id: "d", label: "Dashboard", sub: "GET 60 keys", col: 5.6, row: 0, shape: "pill" },
    ], edges: [{ from: "web", to: "k" }, { from: "k", to: "sp" }, { from: "sp", to: "r", label: "on window close" }, { from: "k", to: "raw", dashed: true }, { from: "d", to: "r" }] },
    { type: "ol", items: [
      "**Events flow from the source**: page-view events (page ID, user ID, timestamp, metadata) land in Kafka.",
      "**The stream processor windows them**: 1-minute [tumbling windows](/learn/stream-processing-windows-watermarks) grouped by (page_id, minute).",
      "**Window results go to a fast store**: when a window closes, write key `page:{id}:minute:{timestamp}` → count to Redis.",
      "**The dashboard reads the store**: the last hour is 60 key lookups, microseconds each, no matter how many events happened.",
    ] },
    { type: "code", code: `import json
from collections import Counter
from kafka import KafkaConsumer
import redis

r = redis.Redis()
consumer = KafkaConsumer("page-views", bootstrap_servers="localhost:9092",
                         group_id="views-per-minute", value_deserializer=json.loads)
counts, current_minute = Counter(), None

for msg in consumer:
    e = msg.value                                   # {"page_id": 42, "ts": 1760950000}
    minute = e["ts"] // 60 * 60
    if current_minute is not None and minute > current_minute:   # window closed
        pipe = r.pipeline()
        for page_id, n in counts.items():
            key = f"page:{page_id}:minute:{current_minute}"
            pipe.incrby(key, n); pipe.expire(key, 2 * 3600)      # keep 2 hours
        pipe.execute()
        counts.clear()
    current_minute = max(current_minute or minute, minute)
    counts[e["page_id"]] += 1
# Simplified: real engines use event-time watermarks so late events still count.

def last_hour(page_id, now_minute):                 # dashboard read: 60 lookups
    keys = [f"page:{page_id}:minute:{now_minute - 60 * i}" for i in range(60)]
    return [int(v or 0) for v in r.mget(keys)]` },
    { type: "p", text: "The dashboard query goes from \"scan 400,000 rows\" to \"fetch 60 keys\". Databases offer the same idea natively: `CREATE MATERIALIZED VIEW … ; REFRESH MATERIALIZED VIEW` in PostgreSQL, incrementally maintained views in ClickHouse, Materialize or RisingWave. See [database optimization](/learn/database-optimization)." },

    { type: "h2", text: "The trade-offs" },
    { type: "ul", items: [
      "**Storage grows with every dimension.** Page × minute is manageable. Add region, device, browser and experiment variant and keys multiply: 10,000 pages × 50 regions × 5 devices × 10 variants = **25 million keys per minute**, about **1.5 billion per hour**. Pre-aggregating every possible slice is impractical.",
      "**Late events complicate updates.** An event stamped 10:05 arrives at 10:08, after its window closed. Ignore it (simple, but counts run low), update the view (correct, but consumers must handle changing values), or wait longer before closing windows (more accurate, slower). It depends on whether accuracy or freshness matters more.",
      "**Pre-aggregation locks in the questions.** Aggregated by page and minute? \"Hourly views by device\" now needs new code and time for data to accumulate. You trade query flexibility for query speed.",
    ] },

    { type: "h2", text: "The 80/20 approach" },
    { type: "p", text: "A few dashboards usually account for most query load: request rates, error counts, active users. **Pre-aggregate those.** For ad-hoc exploration (\"click rate for German mobile users last Tuesday?\"), keep raw events in a [warehouse](/learn/oltp-vs-olap), where seconds of latency is fine. That two-tier design gives instant answers for the metrics everyone watches and flexibility for questions nobody has asked yet. See [real-time analytics architecture](/learn/real-time-analytics-architecture)." },
  ],
  uses: [
    { name: "Live dashboards", text: "Requests, errors and active users per minute, pre-aggregated by a stream job into Redis or a time-series store." },
    { name: "Counters in products", text: "Like, view and follower counts kept as running totals instead of COUNT(*) at read time." },
    { name: "Reporting", text: "PostgreSQL or warehouse materialized views refreshed hourly for monthly revenue by region." },
    { name: "Microservice read models", text: "Denormalized views of another service's data maintained from CDC events." },
  ],
  interview: [
    "When a read aggregates lots of raw data on every request, precompute it on write: stream processor → fast store.",
    "Name the key design (e.g. page:{id}:minute:{ts}) and how many keys you'll keep.",
    "Discuss late events and dimension explosion, and keep raw data for ad-hoc queries.",
  ],
  related: ["precomputation-pattern", "real-time-analytics-architecture", "stream-processing-windows-watermarks", "database-optimization", "change-data-capture", "time-series-databases"],
  practice: ["realtime-analytics", "news-feed", "clickstream"],
};
