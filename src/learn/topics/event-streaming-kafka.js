export default {
  blocks: [
    { type: "p", text: "**Apache Kafka** and similar systems (Amazon Kinesis, Apache Pulsar, Redpanda) are **log-based message brokers**. Instead of deleting messages once consumed, they append events to a durable, ordered **log** and keep them for a retention period. Many consumers can read the same log independently, at their own pace, and can replay history. This makes them the backbone for event-driven architectures and data pipelines." },

    { type: "h2", text: "Topics, partitions and offsets" },
    { type: "ul", items: [
      "A **topic** is a named stream of events, like `orders` or `page-views`.",
      "Each topic is split into **partitions**: ordered, append-only logs spread across brokers. Partitions are the unit of parallelism and ordering.",
      "Each event in a partition has an **offset**, its position in the log. Consumers track which offset they've processed.",
      "Producers choose a partition by **key**: all events with the same key (an order ID, a user ID) go to the same partition, so **order is guaranteed per key**.",
    ] },
    { type: "diagram", kind: "flow", caption: "Events keyed by order ID land in partitions; each consumer group reads every partition independently, with each partition assigned to one consumer in the group.", nodes: [
      { id: "p", label: "Producers", sub: "key = order_id", col: 0, row: 1 },
      { id: "p0", label: "Partition 0", sub: "offsets 0…1,204", col: 1.3, row: 0, shape: "queue", tone: "queue" },
      { id: "p1", label: "Partition 1", sub: "offsets 0…1,187", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "p2", label: "Partition 2", sub: "offsets 0…1,233", col: 1.3, row: 2, shape: "queue", tone: "queue" },
      { id: "a1", label: "Billing #1", col: 2.7, row: 0, tone: "accent" },
      { id: "a2", label: "Billing #2", sub: "partitions 1, 2", col: 2.7, row: 1.5, tone: "accent" },
      { id: "b1", label: "Analytics #1", sub: "all partitions", col: 3.9, row: 1, tone: "ok" },
    ], edges: [
      { from: "p", to: "p0" }, { from: "p", to: "p1" }, { from: "p", to: "p2" },
      { from: "p0", to: "a1" }, { from: "p1", to: "a2" }, { from: "p2", to: "a2" },
      { from: "p1", to: "b1", dashed: true }, { from: "p0", to: "b1", dashed: true, bend: -40 }, { from: "p2", to: "b1", dashed: true, bend: 40 },
    ], zones: [{ label: "Group: billing", from: [2.7, 0], to: [2.7, 1.5], tone: "accent" }] },

    { type: "h2", text: "Consumer groups" },
    { type: "p", text: "Consumers with the same **group ID** share the work: each partition is assigned to exactly one consumer in the group. Different groups each get the full stream. So one topic can feed billing, analytics and search indexing, each scaling independently." },
    { type: "ul", items: [
      "Parallelism within a group is capped by the **number of partitions**: 12 partitions means at most 12 active consumers in a group. Choose partition counts with growth in mind.",
      "When consumers join or leave, partitions are **rebalanced** among the group.",
      "Consumers **commit offsets** after processing. On restart they resume from the last commit, so events since then are reprocessed: at-least-once by default. See [delivery guarantees](/learn/delivery-semantics).",
    ] },

    { type: "h2", text: "Why a log is powerful" },
    { type: "ul", items: [
      "**Replay**: reset a consumer group's offset to reprocess history after fixing a bug, or to build a brand-new service from past events.",
      "**Many independent readers** without the broker tracking per-message state for each.",
      "**High throughput**: sequential disk writes, batching, compression and zero-copy reads let a cluster handle millions of events per second.",
      "**Log compaction**: for topics keyed by entity, Kafka can keep only the latest event per key, turning the topic into a durable table of current state.",
    ] },

    { type: "h2", text: "Durability settings" },
    { type: "table", head: ["Setting", "Meaning"], rows: [
      ["Replication factor 3", "Each partition is copied to 3 brokers; one is the leader"],
      ["`acks=all` + `min.insync.replicas=2`", "A write is acknowledged only when at least 2 in-sync replicas have it, so one broker failure loses nothing"],
      ["Idempotent producer", "Retries don't create duplicate events in the log"],
      ["Retention", "By time (7 days) or size; or compaction for keyed state"],
    ] },

    { type: "h2", text: "Kafka vs a traditional queue" },
    { type: "table", head: ["", "Kafka / log broker", "RabbitMQ / SQS"], rows: [
      ["Messages after consumption", "Retained; replayable", "Deleted"],
      ["Ordering", "Per partition (per key)", "Weak, or per group (FIFO)"],
      ["Consumer model", "Offsets per group; pull", "Per-message acks; push or pull"],
      ["Per-message routing and delays", "Limited", "Rich routing, priorities, delayed messages"],
      ["Best for", "Event streams, pipelines, CDC, analytics, event sourcing", "Task queues, job distribution, request buffering"],
    ] },

    { type: "h2", text: "Pitfalls" },
    { type: "ul", items: [
      "**Hot partitions**: a skewed key (one huge customer) overloads one partition and its consumer. Choose keys with even distribution.",
      "**Slow consumers block their partition**: one slow message delays everything behind it in that partition. Keep processing fast; push slow work to a separate queue.",
      "**Too few partitions** limit scaling; increasing them later changes key-to-partition mapping and breaks per-key ordering during the change.",
      "**Consumer lag** is the key metric: how far behind the latest offset each group is. Alert on it.",
    ] },
  ],
  uses: [
    { name: "LinkedIn", text: "Created Kafka to move activity and operational data between systems; it carries trillions of messages a day there." },
    { name: "Uber and Netflix", text: "Use Kafka as the central event bus for trips, playback events and microservice communication, feeding real-time and batch analytics." },
    { name: "Change data capture", text: "Debezium streams database changes into Kafka so search indexes, caches and warehouses stay in sync. See [outbox and CDC](/learn/outbox-pattern)." },
    { name: "Stream processing", text: "Flink, Kafka Streams and Spark read from Kafka to compute real-time aggregates, fraud signals and dashboards. See [batch vs stream processing](/learn/batch-vs-stream-processing)." },
  ],
  interview: [
    "Choose a log broker when several consumers need the same events, replay matters, or volume is high.",
    "State the partition key and that order is guaranteed only within a partition.",
    "Size partitions for the consumer parallelism you'll need, and mention consumer lag monitoring.",
    "Say delivery is at-least-once and consumers are idempotent (or use transactions for exactly-once within Kafka).",
  ],
  related: ["message-queues", "pub-sub", "delivery-semantics", "outbox-pattern", "batch-vs-stream-processing", "event-sourcing-cqrs"],
  practice: ["distributed-message-queue", "clickstream", "realtime-analytics", "fraud-data-platform"],
};
