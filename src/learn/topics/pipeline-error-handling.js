// Error handling in data pipelines: dead-letter queues, failure categories, retries with
// backoff and jitter, circuit breakers, retry limits, and monitoring pipelines as products.
export default {
  blocks: [
    { type: "p", text: "Production pipelines fail all the time: network partitions, schemas that drift between producers and consumers, malformed records from buggy upstream systems, external services that rate-limit or time out. A robust pipeline expects this. Its three goals: **don't lose data**, **don't block progress on unrelated records**, and **surface problems** for someone to fix." },

    { type: "h2", text: "Dead-letter queues: don't drop, don't block" },
    { type: "p", text: "When a record can't be processed you can **drop it** (silent data loss), **block the pipeline** (one bad record stops everything), or **sideline it**: put it in a **dead-letter queue (DLQ)** and keep going. Good records flow to the output; failed ones go to the DLQ with details of why." },
    { type: "diagram", kind: "flow", caption: "Dead-letter queue: good records continue; failures are retried, then parked with error metadata so the pipeline never stalls on one bad record.", nodes: [
      { id: "in", label: "Input topic", col: 0, row: 0.6, shape: "queue", tone: "queue" },
      { id: "p", label: "Processor", sub: "validate, transform, write", col: 1.4, row: 0.6, tone: "accent" },
      { id: "out", label: "Output", sub: "warehouse / topic", col: 2.9, row: 0, shape: "db", tone: "ok" },
      { id: "dlq", label: "Dead-letter queue", sub: "record + error + stage + version", col: 2.9, row: 1.2, shape: "queue", tone: "danger", w: 250 },
      { id: "ops", label: "Operators", sub: "inspect, fix, replay", col: 4.4, row: 1.2, shape: "pill" },
    ], edges: [{ from: "in", to: "p" }, { from: "p", to: "out", label: "success" }, { from: "p", to: "dlq", label: "failed after retries", tone: "danger" }, { from: "dlq", to: "ops" }, { from: "ops", to: "in", dashed: true, label: "replay", bend: 70 }] },
    { type: "p", text: "Operators then triage the DLQ: **transient** failures (timeouts, rate limits) usually succeed when replayed; **data bugs** (malformed JSON) are fixed upstream and discarded; **pipeline bugs** mean fixing the code and reprocessing. Enrich every DLQ entry with the original record, error message, timestamp, pipeline version and the failing stage, and tag an error category (validation, serialization, downstream timeout) to prioritize." },

    { type: "h2", text: "Kinds of failure" },
    { type: "table", head: ["Category", "Example", "Usual fix"], rows: [
      ["Schema validation", "Null where a value is required; a string where a number is expected", "Producer bug or schema drift: fix the source. See [data contracts](/learn/data-contracts-schema-evolution)"],
      ["Business rule violation", "Negative quantity, future timestamp, unknown user ID", "Either valid data your pipeline doesn't handle yet, or an upstream bug"],
      ["Transient downstream failure", "Database timeout, API rate limit, service briefly down", "Retry with backoff"],
      ["Serialization / parsing", "Can't decode JSON or deserialize Avro", "Usually a producer/consumer schema version mismatch"],
    ] },

    { type: "h2", text: "Retrying the right way" },
    { type: "ul", items: [
      "**Immediate retry is usually wrong**: the service timed out because it's overloaded, and instant retries add load and keep it down: a feedback loop of failure.",
      "**Exponential backoff** spaces attempts out (1 s, 2 s, 4 s, 8 s), giving the dependency time to recover.",
      "**Jitter** adds randomness. Without it, 100 workers that failed together retry together (a thundering herd) and fail again; with it, they spread out (1.3 s, 0.9 s, 1.7 s…).",
      "**Circuit breaker**: if a dependency keeps failing (say 50% failures over 10 seconds), stop calling it and fail fast; probe periodically and resume when it recovers. That protects both you and the struggling service. See [circuit breakers](/learn/circuit-breaker).",
      "**Cap retries**: without a limit, records retry forever, burning resources and hiding the real problem.",
    ] },
    { type: "diagram", kind: "timeline", caption: "Exponential backoff with jitter: waits roughly double after each failure, with random spread so many workers don't retry in lockstep; after the last attempt the record goes to the DLQ.", ticks: ["0 s", "1 s", "2 s", "3 s", "4 s", "5 s", "6 s", "7 s", "8 s"], events: [{ at: 0, tone: "danger", label: "fail" }, { at: 1.2, tone: "danger", label: "retry 1" }, { at: 3.4, tone: "danger", label: "retry 2" }, { at: 7.6, tone: "danger", label: "retry 3" }], marks: [{ at: 7.9, label: "→ DLQ + alert", tone: "danger" }] },
    { type: "code", code: `retry_delay = base_delay * 2 ** attempt + random(0, base_delay)` },
    { type: "p", text: "A typical policy: try; on failure retry up to **3 times** with exponential backoff and jitter; then write to the DLQ, alert, and move on to other records. Network blips recover in 2–3 retries; longer outages (deployments, database failover) may need more attempts or longer backoff. See [retries and timeouts](/learn/retries-and-timeouts)." },
    { type: "code", code: `import json, random, time
from kafka import KafkaConsumer, KafkaProducer

MAX_RETRIES, BASE_DELAY = 3, 1.0
consumer = KafkaConsumer("orders", bootstrap_servers="localhost:9092",
                         group_id="orders-loader", enable_auto_commit=False)
producer = KafkaProducer(bootstrap_servers="localhost:9092")

class Transient(Exception): ...           # timeouts, 429s, connection resets

def process(record: dict):
    if record.get("quantity", 0) < 0:
        raise ValueError("negative quantity")       # permanent: retrying won't help
    write_to_warehouse(record)                       # may raise Transient

for msg in consumer:
    error = None
    try:
        record = json.loads(msg.value)
        for attempt in range(MAX_RETRIES + 1):
            try:
                process(record); error = None; break
            except Transient as e:
                error = e
                time.sleep(BASE_DELAY * 2 ** attempt + random.uniform(0, BASE_DELAY))
    except (ValueError, json.JSONDecodeError) as e:   # bad data: no retries
        error = e
    if error is not None:
        producer.send("orders.dlq", json.dumps({
            "original": msg.value.decode(errors="replace"), "error": repr(error),
            "category": type(error).__name__, "topic": msg.topic, "offset": msg.offset,
            "pipeline_version": "2026.10.1", "failed_at": time.time()}).encode())
    consumer.commit()                                  # progress continues either way` },

    { type: "h2", text: "Monitoring: make failures visible" },
    { type: "p", text: "Pipelines have no user staring at them, so failures must surface through monitoring, not complaints:" },
    { type: "table", head: ["Signal", "What it tells you"], rows: [
      ["**Lag**", "How far behind real time the pipeline is (processing 9:45 events at 10:00 = 15 minutes). Growing lag means throughput dropped or input grew"],
      ["**Error rate**", "Share of records failing. A spike points to a bad deploy, schema change or dependency outage; a slow rise to degrading upstream data"],
      ["**DLQ depth**", "Some DLQ entries are normal; rapid growth means an ongoing problem"],
      ["**Data quality checks**", "Output counts match inputs (allowing for filtering), values in valid ranges, duplicates at expected rates; catches bugs that produce wrong results without errors. See [data quality](/learn/data-quality)"],
      ["**End-to-end latency**", "Event creation to availability in the serving layer: what users actually experience, even if every stage looks fast"],
    ] },
    { type: "p", text: "Treat pipelines as production systems: health dashboards, alerts before users notice, on-call rotations with escalation paths, runbooks for common failures, and capacity planning. A silent pipeline failure that corrupts analytics for a week is often worse than a user-facing outage fixed in minutes. See [observability](/learn/observability)." },
  ],
  uses: [
    { name: "Event ingestion", text: "Kafka consumers send unparseable or invalid events to a DLQ topic and keep consuming." },
    { name: "Queue-based workers", text: "SQS and RabbitMQ move messages to a DLQ after a maximum receive count." },
    { name: "Warehouse loads", text: "Rejected rows land in an errors table with the reason, and the load continues." },
    { name: "Third-party API syncs", text: "Backoff with jitter plus a circuit breaker around rate-limited APIs." },
  ],
  interview: [
    "For every pipeline, say what happens to a bad record: retry transient errors with backoff and jitter, then DLQ with metadata, and never block the stream.",
    "Separate permanent errors (don't retry) from transient ones.",
    "Name the monitoring: lag, error rate, DLQ depth, data quality and end-to-end latency.",
  ],
  related: ["retries-and-timeouts", "circuit-breaker", "backfill-and-reprocessing", "data-quality", "message-queues", "observability"],
  practice: ["etl-framework", "data-alerting", "notification-service"],
};
