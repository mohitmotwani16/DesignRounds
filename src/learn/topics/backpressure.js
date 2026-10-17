export default {
  blocks: [
    { type: "p", text: "**Backpressure** is how a system tells upstream components to slow down when downstream components can't keep up. Without it, a fast producer fills buffers until memory runs out, latency climbs without limit, or the slow component falls over. With it, overload is pushed back to where it can be handled: by waiting, by dropping low-value work, or by rejecting requests early." },

    { type: "h2", text: "The problem: unbounded buffers" },
    { type: "p", text: "Every queue, buffer and thread pool between two components hides a rate mismatch, until it doesn't. If a producer emits 10,000 events/s and a consumer handles 8,000/s, the backlog grows by 2,000 every second: 7.2 million after an hour. Memory grows, every item waits behind millions of others, and when the process finally crashes the buffered work is lost too." },
    { type: "diagram", kind: "flow", caption: "A bounded buffer turns a rate mismatch into a signal: when it's full, the producer must wait, drop, or shed load instead of growing memory forever.", nodes: [
      { id: "p", label: "Producer", sub: "10k/s", col: 0, row: 0 },
      { id: "b", label: "Bounded buffer", sub: "max 10,000 items", col: 1.3, row: 0, shape: "queue", tone: "queue", w: 160 },
      { id: "c", label: "Consumer", sub: "8k/s", col: 2.6, row: 0 },
      { id: "sig", label: "Full → block, drop or reject", col: 1.3, row: 1, tone: "danger", shape: "pill", w: 210 },
    ], edges: [
      { from: "p", to: "b" }, { from: "b", to: "c" }, { from: "sig", to: "p", dashed: true, tone: "danger", label: "slow down" },
    ] },

    { type: "h2", text: "Strategies when downstream is full" },
    { type: "table", head: ["Strategy", "What happens", "Good for"], rows: [
      ["**Block / pull-based flow control**", "The producer waits until there's room; consumers only request what they can handle", "Pipelines where every item matters (file processing, ETL)"],
      ["**Drop**", "Discard new (or oldest) items when full", "Telemetry, metrics, live video frames, location pings"],
      ["**Sample / aggregate**", "Keep a representative subset or combine items", "Analytics events, logs at extreme volume"],
      ["**Reject early**", "Return 429 or 503 at the edge with Retry-After", "User-facing APIs: fail fast instead of timing out slowly. See [rate limiting](/learn/rate-limiting)"],
      ["**Buffer durably**", "Spill to a durable queue or log and catch up later", "Spiky but finite bursts (flash sales). See [message queues](/learn/message-queues)"],
      ["**Scale out**", "Add consumers when lag grows", "Elastic workloads; still needs a limit while scaling happens"],
    ] },

    { type: "h2", text: "Backpressure in practice" },
    { type: "ul", items: [
      "**TCP** has backpressure built in: the receive window shrinks when the receiver's buffer fills, and the sender slows. See [TCP vs UDP](/learn/tcp-vs-udp).",
      "**Pull-based consumers** (Kafka, reactive streams) are naturally backpressured: consumers fetch the next batch only when ready. Lag accumulates in the durable log instead of in memory.",
      "**Bounded thread pools and queues** in services: when the request queue is full, reject immediately rather than queuing for minutes.",
      "**Connection pools** cap concurrent database calls; requests waiting for a connection should time out quickly.",
      "**gRPC and HTTP/2** have per-stream flow control windows.",
    ] },

    { type: "h2", text: "Queues don't remove overload" },
    { type: "p", text: "Putting a queue in front of a slow service converts overload into latency. That's useful for a short burst, but if the average input rate exceeds the processing rate, the queue grows until something breaks. Always pair a queue with **monitoring of depth and oldest-message age**, autoscaling on lag, and a plan for when the backlog can't be cleared (shed the lowest-priority work). See [load shedding](/learn/load-shedding)." },
    { type: "callout", text: "Prefer **failing fast** to **failing slow**. A request rejected in 5 ms can be retried elsewhere or shown as \"try again\"; a request that times out after 30 seconds has already tied up threads, connections and the user's patience." },

    { type: "h2", text: "Little's Law and queue sizing" },
    { type: "p", text: "In-flight work = arrival rate × time in system. If you want at most 500 ms of queueing at 2,000 requests/s, the queue should hold at most about 1,000 requests; anything larger only adds latency nobody will wait for. See [latency vs throughput](/learn/latency-vs-throughput)." },
  ],
  uses: [
    { name: "Reactive streams (Akka, Project Reactor, RxJava)", text: "Downstream stages signal demand, so upstream stages emit only as many elements as requested." },
    { name: "Kafka consumers", text: "Pull at their own pace; growing consumer lag signals the need to scale, without exhausting broker memory." },
    { name: "Netflix and Envoy concurrency limits", text: "Adaptive concurrency limiters reduce allowed in-flight requests when latency rises, rejecting excess load early." },
    { name: "Logging agents", text: "Agents like Fluent Bit use bounded buffers and drop or spill to disk under pressure instead of starving the application of memory." },
  ],
  interview: [
    "Whenever two components run at different speeds, say what bounds the buffer between them and what happens when it fills.",
    "Choose per data type: block for must-not-lose work, drop or sample for telemetry, reject early for user requests.",
    "Monitor queue depth and lag, autoscale consumers on them, and plan for a backlog you can't clear.",
    "Prefer fast rejections (429/503 with Retry-After) over slow timeouts.",
  ],
  related: ["message-queues", "load-shedding", "rate-limiting", "event-streaming-kafka", "latency-vs-throughput", "circuit-breaker"],
  practice: ["clickstream", "realtime-analytics", "notification-service", "web-crawler"],
};
