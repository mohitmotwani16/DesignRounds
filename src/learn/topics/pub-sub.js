export default {
  blocks: [
    { type: "p", text: "**Publish-subscribe (pub/sub)** is a messaging pattern where publishers send messages to a **topic** without knowing who will receive them, and every **subscriber** to that topic gets its own copy. Where a work queue splits work between consumers, pub/sub **broadcasts** events to many independent consumers." },

    { type: "h2", text: "How it works" },
    { type: "diagram", kind: "flow", caption: "One OrderPlaced event fans out to every subscribed service. Adding a new consumer needs no change to the publisher.", nodes: [
      { id: "orders", label: "Orders service", sub: "publishes", col: 0, row: 1.5 },
      { id: "topic", label: "order-events topic", col: 1.3, row: 1.5, shape: "queue", tone: "queue", w: 170 },
      { id: "email", label: "Email service", col: 2.7, row: 0 },
      { id: "inv", label: "Inventory", col: 2.7, row: 1 },
      { id: "ana", label: "Analytics", col: 2.7, row: 2 },
      { id: "fraud", label: "Fraud checks", sub: "added later", col: 2.7, row: 3, tone: "accent" },
    ], edges: [
      { from: "orders", to: "topic", label: "OrderPlaced" },
      { from: "topic", to: "email" }, { from: "topic", to: "inv" }, { from: "topic", to: "ana" }, { from: "topic", to: "fraud", dashed: true },
    ] },
    { type: "p", text: "Each subscriber typically gets its **own queue or subscription** attached to the topic, so it can consume at its own pace, retry independently and be down without affecting the others. Within one subscription, several instances of the same service can share the work (competing consumers)." },

    { type: "h2", text: "Why it's useful" },
    { type: "ul", items: [
      "**Loose coupling**: the publisher doesn't call each downstream service, so it doesn't break or slow down when one of them does.",
      "**Extensibility**: new features (fraud checks, a recommendation update, an audit log) subscribe to existing events without touching the publisher.",
      "**Fan-out**: one event triggers many reactions: notifications, cache invalidation across servers, real-time updates to connected clients.",
    ] },

    { type: "h2", text: "Push vs pull delivery" },
    { type: "table", head: ["", "Push", "Pull"], rows: [
      ["Delivery", "The broker calls subscribers (HTTP endpoints, functions)", "Subscribers poll the broker for messages"],
      ["Flow control", "Broker must back off when subscribers are slow", "Subscribers take only what they can handle"],
      ["Good for", "Webhooks, serverless functions, low volume", "High throughput, batch processing"],
      ["Examples", "SNS → HTTP or Lambda, Google Pub/Sub push", "Kafka consumers, Google Pub/Sub pull, SQS"],
    ] },

    { type: "h2", text: "Durability differs a lot" },
    { type: "ul", items: [
      "**Fire-and-forget pub/sub** (Redis pub/sub, plain MQTT QoS 0): only currently connected subscribers receive messages; anything published while a subscriber is disconnected is lost. Fine for cache invalidation signals and live UI updates.",
      "**Durable pub/sub** (SNS + SQS, Google Pub/Sub, RabbitMQ fanout exchanges with durable queues): messages are stored per subscription until acknowledged.",
      "**Log-based** (Kafka, Pulsar, Kinesis): events are retained for days regardless of who read them, so new subscribers can even start from the beginning. See [event streaming and Kafka](/learn/event-streaming-kafka).",
    ] },

    { type: "h2", text: "Design considerations" },
    { type: "ul", items: [
      "**Event design**: publish facts about what happened (`OrderPlaced` with the order data), not commands to specific services. Include an event ID, type, version and timestamp.",
      "**Schema evolution**: subscribers you don't know about depend on your events. Add fields compatibly; use a schema registry for Avro or Protobuf events.",
      "**Delivery is at-least-once** for durable systems, and order across subscribers isn't coordinated, so subscribers must be [idempotent](/learn/idempotency).",
      "**Publishing reliably**: if you update the database and then publish, a crash between the two loses the event. Use the [transactional outbox](/learn/outbox-pattern).",
      "**Visibility**: with many subscribers, tracing an event's effects needs good observability (correlation IDs on every event).",
    ] },
  ],
  uses: [
    { name: "AWS SNS + SQS fan-out", text: "A common pattern: publish once to an SNS topic, with an SQS queue per consuming service for durable, independent processing." },
    { name: "Real-time chat and presence", text: "Chat gateways subscribe to channels (Redis pub/sub, NATS) to receive messages for the users connected to them. See [WebSockets](/learn/real-time-communication)." },
    { name: "Cache invalidation", text: "When data changes, an invalidation message is broadcast so every app server drops its in-memory copy." },
    { name: "IoT with MQTT", text: "Devices publish telemetry to topics like `building/7/floor/2/temp` and dashboards subscribe with wildcards." },
  ],
  interview: [
    "Use pub/sub when one event must reach several services; use a work queue when one worker should handle each job.",
    "Give each subscriber its own durable subscription so failures stay isolated.",
    "Publish domain events (what happened), versioned and with IDs, and make consumers idempotent.",
    "Mention the outbox pattern to avoid losing events between the database write and the publish.",
  ],
  related: ["message-queues", "event-streaming-kafka", "outbox-pattern", "webhooks", "real-time-communication", "delivery-semantics"],
  practice: ["notification-service", "chat-system", "clickstream"],
};
