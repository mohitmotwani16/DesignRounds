export default {
  blocks: [
    { type: "p", text: "A **message queue** lets one part of a system hand off work to another without waiting for it to finish. A **producer** puts a message on the queue; a **consumer** takes it off and processes it later. The queue decouples them in time and speed: the producer stays fast, and work survives even if consumers are slow, busy or down." },

    { type: "h2", text: "Why make work asynchronous" },
    { type: "ul", items: [
      "**Fast responses**: return to the user as soon as the request is recorded, then send the email, resize the image or update the search index in the background.",
      "**Absorbing spikes**: a queue buffers a burst (a flash sale, a marketing email) and consumers drain it at a sustainable rate instead of the database falling over.",
      "**Reliability**: if a downstream service is down, messages wait in the queue and are processed when it recovers, instead of failing the user's request.",
      "**Independent scaling**: add consumers when the queue grows, without touching producers.",
    ] },
    { type: "diagram", kind: "flow", caption: "The API accepts an upload and enqueues a job; a pool of workers processes jobs at its own pace, retries failures and parks poison messages in a dead-letter queue.", nodes: [
      { id: "api", label: "API", sub: "returns 202", col: 0, row: 1 },
      { id: "q", label: "Job queue", col: 1.2, row: 1, shape: "queue", tone: "queue" },
      { id: "w1", label: "Worker", col: 2.4, row: 0 },
      { id: "w2", label: "Worker", col: 2.4, row: 1 },
      { id: "w3", label: "Worker", col: 2.4, row: 2 },
      { id: "dlq", label: "Dead-letter queue", col: 1.2, row: 2.3, shape: "queue", tone: "danger" },
    ], edges: [
      { from: "api", to: "q", label: "enqueue" }, { from: "q", to: "w1" }, { from: "q", to: "w2" }, { from: "q", to: "w3" },
      { from: "w3", to: "dlq", label: "5 failures", dashed: true, tone: "danger" },
    ] },

    { type: "h2", text: "How delivery works" },
    { type: "ol", items: [
      "A consumer **receives** a message. The queue hides it from other consumers for a **visibility timeout** (say 30 seconds), but doesn't delete it yet.",
      "The consumer processes it and **acknowledges** (deletes) it.",
      "If the consumer crashes or the timeout passes without an ack, the message becomes visible again and another consumer retries it.",
    ] },
    { type: "p", text: "This gives **at-least-once delivery**: a message is never lost, but it can be processed more than once (for example if a consumer finishes the work but crashes before acknowledging). Consumers must therefore be **idempotent**. See [delivery guarantees](/learn/delivery-semantics) and [idempotency](/learn/idempotency)." },

    { type: "h2", text: "Handling failures" },
    { type: "ul", items: [
      "**Retries with backoff**: transient errors (a timeout to a dependency) are retried after increasing delays. See [retries](/learn/retries-and-timeouts).",
      "**Dead-letter queue (DLQ)**: after a maximum number of attempts, move the message aside so one bad message (a **poison message**) doesn't block or burn the queue forever. Alert on DLQ depth and provide a way to inspect and replay.",
      "**Visibility timeout longer than processing time**, or extend it with heartbeats for long jobs, otherwise a slow job gets processed twice in parallel.",
    ] },

    { type: "h2", text: "Ordering" },
    { type: "p", text: "Standard queues with many consumers don't guarantee order: messages are processed in parallel and retries reorder them. If order matters (all events for one order, one account, one chat), use **ordered groups**: SQS FIFO message groups, or Kafka partitions keyed by entity ID, which keep order per key while still processing different keys in parallel. See [event streaming](/learn/event-streaming-kafka)." },

    { type: "h2", text: "Queue vs pub/sub vs log" },
    { type: "table", head: ["", "Work queue", "Pub/sub", "Log (Kafka)"], rows: [
      ["Each message goes to", "One consumer", "Every subscriber", "Every consumer group, each reading at its own offset"],
      ["After processing", "Deleted", "Gone once delivered", "Retained for days; can be replayed"],
      ["Typical use", "Background jobs, task distribution", "Notifications, cache invalidation, fan-out", "Event streams, data pipelines, event sourcing"],
      ["Examples", "SQS, RabbitMQ, Celery, Sidekiq", "SNS, Google Pub/Sub, Redis pub/sub", "Kafka, Kinesis, Pulsar, Redpanda"],
    ] },
    { type: "p", text: "See [publish-subscribe](/learn/pub-sub) and [event streaming and Kafka](/learn/event-streaming-kafka)." },

    { type: "h2", text: "Watch the queue depth" },
    { type: "p", text: "A queue hides overload instead of removing it. If producers outpace consumers for long, the backlog grows, latency climbs from seconds to hours, and memory or retention limits are hit. Monitor **queue depth** and **age of the oldest message**, autoscale consumers on them, and apply [backpressure](/learn/backpressure) or load shedding when the backlog can't be cleared." },
  ],
  uses: [
    { name: "Email and notification sending", text: "Requests enqueue messages; workers send through providers with retries and rate limits. See [notification service](/system-design/notification-service)." },
    { name: "Media processing", text: "Upload events queue jobs for thumbnails, transcoding and moderation, processed by autoscaled worker fleets." },
    { name: "Order processing", text: "E-commerce checkouts enqueue fulfilment, invoicing and analytics work so the checkout response stays fast." },
    { name: "Background jobs frameworks", text: "Sidekiq (Redis), Celery (RabbitMQ/Redis) and SQS-based workers run most web apps' async work." },
  ],
  interview: [
    "Move slow or unreliable work (email, media, third-party calls) behind a queue and return 202 or a pending status.",
    "Say delivery is at-least-once and make consumers idempotent.",
    "Mention retries with backoff, a dead-letter queue, and alerting on queue depth and age.",
    "If ordering matters, key messages by entity so per-entity order is preserved.",
  ],
  related: ["pub-sub", "event-streaming-kafka", "delivery-semantics", "idempotency", "backpressure", "retries-and-timeouts"],
  practice: ["notification-service", "task-scheduler", "distributed-message-queue", "web-crawler"],
};
