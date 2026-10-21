// Stream processing basics: bounded vs unbounded data, brokers as the input layer, the
// read-process-write loop, state, differences from batch, and where streaming fits.
export default {
  blocks: [
    { type: "p", text: "A nightly fraud job flags suspicious accounts by morning, but a fraudster who steals card details at 9 AM has all day to drain them. **Stream processing** handles data **continuously as it arrives** instead of waiting for it to pile up, so results come in seconds rather than hours." },

    { type: "h2", text: "Bounded vs unbounded data" },
    { type: "p", text: "**Batch** jobs read **bounded** data: a finite dataset with a start and an end (\"yesterday's logs\", \"Q3 transactions\"); they read it all, process it and stop. **Stream** processors read **unbounded** data: clicks, sensor readings and payments that never stop arriving, so the processor runs indefinitely. It's counting fish in a bucket versus counting fish swimming past a point in a river: the river never ends, so you report rolling totals. See [batch vs stream processing](/learn/batch-vs-stream-processing)." },
    { type: "diagram", kind: "timeline", caption: "Bounded vs unbounded: a batch job processes a closed range and finishes; a stream processor handles each event as it arrives, forever.", ticks: ["00:00", "06:00", "12:00", "18:00", "24:00", "now →"], spans: [
      { from: 0, to: 4, label: "batch: yesterday's data, processed once at 02:00", lane: 0, tone: "store" },
      { from: 0, to: 5, label: "stream: events processed continuously", lane: 1, tone: "ok" },
    ], events: [{ at: 0.6, tone: "ok" }, { at: 1.3, tone: "ok" }, { at: 2.1, tone: "ok" }, { at: 2.4, tone: "ok" }, { at: 3.2, tone: "ok" }, { at: 4.1, tone: "ok" }, { at: 4.7, tone: "ok" }] },

    { type: "h2", text: "Message brokers: the input layer" },
    { type: "p", text: "Streams usually come from a **message broker** (event bus or streaming platform): Apache Kafka most often, or AWS Kinesis, Apache Pulsar and others. Producers (your services) write events to **topics** such as `user-signups`, `order-placed` or `sensor-readings`; stream processors subscribe and receive them in order. See [Kafka](/learn/event-streaming-kafka)." },
    { type: "diagram", kind: "flow", caption: "Producers write to topics; stream processors consume partitions in parallel and write results to other topics, databases or alerts.", nodes: [
      { id: "p1", label: "Checkout service", col: 0, row: 0 },
      { id: "p2", label: "Web app", col: 0, row: 1 },
      { id: "k", label: "Kafka", sub: "topics: order-placed, clicks", col: 1.5, row: 0.5, shape: "queue", tone: "queue" },
      { id: "s1", label: "Fraud scorer", sub: "instance 1: partitions 0–5", col: 3, row: 0, tone: "accent" },
      { id: "s2", label: "Fraud scorer", sub: "instance 2: partitions 6–11", col: 3, row: 1, tone: "accent" },
      { id: "o", label: "Alerts / DB / topics", col: 4.4, row: 0.5, tone: "ok" },
    ], edges: [{ from: "p1", to: "k" }, { from: "p2", to: "k" }, { from: "k", to: "s1" }, { from: "k", to: "s2" }, { from: "s1", to: "o" }, { from: "s2", to: "o" }] },
    { type: "ul", items: [
      "**Decoupling**: producers don't know who consumes; consumers subscribe to the topics they need.",
      "**Durability**: events are kept for a retention period (hours, days or forever). A crashed consumer resumes where it left off, and a new consumer can replay history.",
      "**Ordering**: events keep their order within a **partition** of a topic.",
      "**Scalability**: topics are split into partitions across brokers, and consumer instances divide the partitions between them.",
    ] },

    { type: "h2", text: "The stream processing loop" },
    { type: "ol", items: [
      "**Read** events from input topics.",
      "**Process** each one: filter, transform, enrich, aggregate.",
      "**Produce** output: write to output topics, update databases, trigger alerts.",
    ] },
    { type: "p", text: "Unlike a batch job, the processor never finishes; it waits for the next event. The hard part is **state**: counting page views needs a running count, and detecting \"three failed logins within 5 minutes\" needs recent attempts per user. Stream processors keep this state, usually in an embedded store (such as RocksDB) backed up to durable storage so it survives restarts." },
    { type: "code", code: `# Stateful stream processing: alert on 3 failed logins for one user within 5 minutes
import json
from collections import defaultdict, deque
from kafka import KafkaConsumer, KafkaProducer

WINDOW_S, LIMIT = 300, 3
consumer = KafkaConsumer("login-attempts", bootstrap_servers="localhost:9092",
                         group_id="login-guard", value_deserializer=json.loads)
producer = KafkaProducer(bootstrap_servers="localhost:9092",
                         value_serializer=lambda v: json.dumps(v).encode())
failures = defaultdict(deque)            # state: user_id -> recent failure timestamps

for msg in consumer:                     # runs forever
    e = msg.value                        # {"user_id": "u1", "ok": false, "ts": 1760950000}
    if e["ok"]:
        failures.pop(e["user_id"], None)
        continue
    recent = failures[e["user_id"]]
    recent.append(e["ts"])
    while recent and recent[0] <= e["ts"] - WINDOW_S:   # drop attempts older than 5 min
        recent.popleft()
    if len(recent) >= LIMIT:
        producer.send("security-alerts", {"user_id": e["user_id"], "failures": len(recent)})
        recent.clear()
# Production engines (Flink, Kafka Streams) keep this state fault-tolerant and partitioned by key.` },

    { type: "h2", text: "How streaming differs from batch" },
    { type: "table", head: ["Aspect", "Batch", "Stream"], rows: [
      ["Input", "Finite dataset", "Continuous events"],
      ["Execution", "Start, process, terminate", "Runs indefinitely"],
      ["Result latency", "Minutes to hours", "Seconds to sub-second (typically)"],
      ["State", "Often rebuilt each run", "Maintained continuously"],
      ["Debugging", "Examine frozen input", "Data keeps flowing"],
    ] },

    { type: "h2", text: "When stream processing fits" },
    { type: "ul", items: [
      "**Real-time decisions**: fraud scoring before the transaction completes; recommendations while the user is still browsing.",
      "**Live dashboards and monitoring**: requests per second, error rates and active users now, not in an hourly batch that's useless during an incident.",
      "**Event-driven architectures**: an order placed triggers inventory reservation, then payment, then a shipping notification, each step reacting to the previous step's events. See [event-driven architecture](/learn/event-sourcing-cqrs).",
      "**Threshold alerts**: page the on-call engineer when errors exceed 5% now, not when the nightly job notices.",
    ] },
    { type: "p", text: "Streaming brings new problems batch never had: aggregating \"per hour\" over a stream that never ends ([windows](/learn/stream-processing-windows-watermarks)), events that arrive late or out of order ([event time and watermarks](/learn/stream-processing-windows-watermarks)), and processing each event exactly once despite failures ([delivery semantics](/learn/delivery-semantics))." },
  ],
  uses: [
    { name: "Fraud detection", text: "Payments scored within milliseconds using per-card state such as recent spend and locations." },
    { name: "Operational dashboards", text: "Error rates and latency percentiles computed continuously from log and metric streams." },
    { name: "Personalization", text: "Recent clicks update recommendations during the same session." },
    { name: "IoT", text: "Sensor readings aggregated and checked against thresholds as they arrive." },
  ],
  interview: [
    "Use streaming when a decision or display must be fresh within seconds; otherwise batch is simpler.",
    "Put a durable, partitioned log (Kafka) in front of stream processors so they can scale, restart and replay.",
    "Call out state: what each processor remembers per key and how it survives restarts.",
    "Mention windows, late events and delivery guarantees as the follow-up topics.",
  ],
  related: ["batch-vs-stream-processing", "event-streaming-kafka", "stream-processing-windows-watermarks", "delivery-semantics", "stream-processing-frameworks", "message-queues"],
  practice: ["realtime-analytics", "fraud-data-platform", "clickstream"],
};
