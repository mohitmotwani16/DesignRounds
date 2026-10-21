export default {
  blocks: [
    { type: "p", text: "**Apache Kafka** and similar systems (Amazon Kinesis, Apache Pulsar, Redpanda) are **log-based message brokers**. Queues such as Redis Queue keep messages in memory and delete them once processed: fast, but with no long-term storage. A log-based broker instead **appends** events to a durable, ordered log on disk and keeps them for a retention period. Because messages stay on disk, **one message can be consumed by many consumers**, independently and at their own pace, and history can be replayed. That makes these systems the backbone of event-driven architectures and data pipelines." },
    { type: "p", text: "For example, a hotel booking service writes each booking to a log; the order processing, customer notification and analytics services each read the same booking event and do their own work. Every consumer sees every event, nothing is lost if one of them is down, and adding a new consumer requires no change to the producer." },

    { type: "h2", text: "Components of a log-based message queue" },
    { type: "ol", items: [
      "**Log**: an ordered, append-only sequence of records (messages). Each message has a unique, ever-increasing sequence number called its **offset**. Logs can be partitioned and spread across machines for horizontal scaling and parallel processing.",
      "**Producers**: services that send messages. They append to the end of the log, and each appended message gets the next offset, giving a total order within its partition.",
      "**Partitions**: a topic's log is split into partitions, each its own ordered, append-only sequence. Partitions live on different nodes, which adds parallelism and throughput, and each can be **replicated** to other nodes for fault tolerance (just like [database replication](/learn/replication)).",
      "**Consumers**: services that read messages. Each consumer keeps its own **offset** (its position in the log), reads sequentially from it, and advances it as it processes. Many consumers can read the same partition independently without affecting each other.",
      "**Consumer groups**: consumers that share the work. Each consumer in a group gets a distinct set of partitions; when a consumer fails or joins, partitions are **reassigned** among the group, giving both scalability and fault tolerance.",
    ] },
    { type: "diagram", kind: "segments", caption: "Two topics' partition logs. Producers append at the right end (green: newly appended messages); each consumer reads sequentially from its own saved offset (orange).", lanes: [
      { label: "Topic 1 · P0", parts: [{ label: "0", size: 1 }, { label: "1", size: 1 }, { label: "2", size: 1 }, { label: "3", size: 1 }, { label: "4", size: 1 }, { label: "5", size: 1 }, { label: "6", size: 1 }, { label: "7", size: 1 }, { label: "8", size: 1, tone: "ok" }, { label: "9", size: 1, tone: "ok" }, { label: "", size: 2, tone: "muted" }] },
      { label: "Topic 1 · P1", parts: [{ label: "0", size: 1 }, { label: "1", size: 1 }, { label: "2", size: 1 }, { label: "3", size: 1 }, { label: "4", size: 1, tone: "cache" }, { label: "5", size: 1 }, { label: "6", size: 1 }, { label: "7", size: 1, tone: "ok" }, { label: "", size: 4, tone: "muted" }] },
      { label: "Topic 2 · P0", parts: [{ label: "0", size: 1 }, { label: "1", size: 1 }, { label: "2", size: 1, tone: "cache" }, { label: "3", size: 1 }, { label: "4", size: 1 }, { label: "5", size: 1 }, { label: "6", size: 1 }, { label: "7", size: 1, tone: "ok" }, { label: "", size: 4, tone: "muted" }] },
      { label: "Topic 2 · P1", parts: [{ label: "0", size: 1 }, { label: "1", size: 1 }, { label: "2", size: 1 }, { label: "3", size: 1 }, { label: "4", size: 1 }, { label: "5", size: 1 }, { label: "6", size: 1 }, { label: "7", size: 1 }, { label: "8", size: 1, tone: "cache" }, { label: "9", size: 1 }, { label: "10", size: 1 }, { label: "11", size: 1 }] },
    ], total: 12 },
    { type: "p", text: "In the strip above, highlighted (orange) cells are where consumers currently are: one consumer is at offset 4 of topic 1 partition 1 and offset 2 of topic 2 partition 0; another is at offset 8 of topic 2 partition 1. Each consumer resumes from its saved offset if it disconnects, exactly like a follower resuming from its position in a database's replication log." },

    { type: "h2", text: "What happens when a message arrives" },
    { type: "ol", items: [
      "**Production**: a producer builds a message (key, metadata, topic or partition, payload) and sends it.",
      "**Serialization**: the producer turns it into bytes for efficient storage and transfer, using JSON, Avro or Protocol Buffers.",
      "**Partition selection**: if the producer didn't name a partition, the system picks one, round-robin or by hashing the message **key**, so load spreads evenly and same-key messages land together.",
      "**Appending**: the message is appended to the end of the chosen partition. This is a sequential disk write, so it's very fast, and the message gets the next offset.",
      "**Consumption**: consumers subscribed to the topic eventually read it, sequentially from their current offset, and advance their offset. Consumers in the same group split the partitions between them.",
    ] },
    { type: "diagram", kind: "flow", caption: "A message's path: the producer serializes it, the broker picks a partition by key and appends it at the next offset, and the consumer that owns that partition reads it and advances its offset.", nodes: [
      { id: "p", label: "Producer", col: 0, row: 1 },
      { id: "s", label: "Serialized message", sub: "1 build · 2 serialize", col: 1.2, row: 1 },
      { id: "r", label: "Partitioner", sub: "3 hash(key)", col: 2.4, row: 1, tone: "accent" },
      { id: "p0", label: "Topic 2 · P0", sub: "4 append at offset 2", col: 3.6, row: 0, shape: "queue", tone: "queue" },
      { id: "p1", label: "Topic 2 · P1", col: 3.6, row: 1, shape: "queue", tone: "queue" },
      { id: "p2", label: "Topic 2 · P2", col: 3.6, row: 2, shape: "queue", tone: "queue" },
      { id: "c", label: "Consumer", sub: "5 read, offset → 2", col: 4.9, row: 0, tone: "store" },
    ], edges: [{ from: "p", to: "s" }, { from: "s", to: "r" }, { from: "r", to: "p0" }, { from: "p0", to: "c" }] },
    { type: "callout", tone: "warning", text: "In a typical setup **one partition is read by only one consumer in a group at a time**. If one message is slow to process, everything behind it in that partition waits. That's why, when individual messages are expensive to process (encoding a video, calling a slow partner API), a traditional queue such as RabbitMQ or SQS, where any free worker can take the next message, is usually the better fit. See [message queues](/learn/message-queues)." },

    { type: "h2", text: "Kafka's building blocks" },
    { type: "p", text: "Kafka's architecture closely follows the general log-based design above:" },
    { type: "ul", items: [
      "**Event**: a record that something happened, with the state of the system or an entity, encoded as JSON, Avro or Protobuf. Kafka stores events as **key-value pairs**.",
      "**Topic**: like a table in a database, a named category of events (`orders`, `page-views`). Each topic is made of partitions holding append-only logs. Logs are **immutable** and simple to reason about; they're read by offset (scanning forward, no random access by content); they're durable files on disk, kept forever or for a retention period; and they replicate easily.",
      "**Partition**: lets a topic spread across many machines. The **key** decides the partition: no key means round-robin; with a key, `hash(key)` picks the partition. Messages with the same key always go to the same partition and, because the log is append-only, stay **in order**. There is **no ordering across partitions**.",
      "**Broker**: a machine running Kafka. Brokers host partitions, handle replication, and serve reads and writes.",
      "**Replication**: every partition is copied to several brokers using leader-based replication: one leader takes writes and N−1 followers copy it. It's automatic, and producers can tune how many copies must confirm a write.",
      "**Producer**: written with the `Producer` / `ProducerRecord` API; chooses the partition from the event's key.",
      "**Consumer**: written with the `Consumer` / `ConsumerRecord` API, usually in a **consumer group** that subscribes to a topic; the topic's partitions are divided among the group's consumers. A group should have **no more consumers than partitions**, since extra consumers sit idle.",
      "**Kafka Connect**: an integration framework that moves data between Kafka and other systems, acting as a producer or consumer. Ready-made connectors exist for Elasticsearch, relational databases and many more, so you don't write boilerplate; the Datagen connector generates demo data.",
      "**Schema Registry**: a separate service holding a database (itself a Kafka topic) of message schemas, cached for speed. Producers and consumers check messages against it so formats stay compatible as they evolve. See [data contracts and schema evolution](/learn/data-contracts-schema-evolution).",
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

    { type: "h2", text: "Use cases" },
    { type: "ul", items: [
      "**Service-to-service communication**: like a traditional queue, a link between services, with the bonus that many services can consume the same events.",
      "**Event sourcing**: store the sequence of events that changed application state, and rebuild the current state by replaying them in order. See [event sourcing and CQRS](/learn/event-sourcing-cqrs).",
      "**Stream processing**: analyze real-time streams with Kafka Streams or Apache Flink: aggregate data from many sources, compute over time windows, and trigger actions. See [stream processing](/learn/stream-processing).",
      "**Data pipelines and change data capture**: move database changes and activity data into search indexes, caches and warehouses. See [change data capture](/learn/change-data-capture).",
    ] },

    { type: "h2", text: "Popular log-based systems" },
    { type: "table", head: ["System", "From", "Key features"], rows: [
      ["Apache Kafka", "Apache Software Foundation (created at LinkedIn)", "Highly scalable, distributed, fault-tolerant publish–subscribe log"],
      ["Apache Pulsar", "Yahoo, now Apache", "Scalable, low-latency messaging with multi-tenancy and tiered storage"],
      ["Amazon Kinesis", "AWS", "Managed real-time streaming, integrated with other AWS services"],
      ["Google Cloud Pub/Sub", "Google Cloud", "Managed messaging between independent apps, for streaming and batch"],
      ["NATS Streaming / JetStream", "nats.io", "High-performance, low-latency messaging with at-most-once or at-least-once delivery"],
      ["Apache Flink", "Apache Software Foundation", "Not a broker but a stream processing framework that reads from logs like Kafka"],
      ["Apache Samza", "Apache Software Foundation", "Stateful, fault-tolerant stream processing used with Kafka"],
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
      ["Slow messages", "Block their partition", "Other workers take the next message"],
      ["Per-message routing and delays", "Limited", "Rich routing, priorities, delayed messages"],
      ["Best for", "Event streams, pipelines, CDC, analytics, event sourcing", "Task queues, job distribution, request buffering"],
    ] },

    { type: "h2", text: "Hands-on: partitions, keys and ordering" },
    { type: "p", text: "This exercise shows how Kafka spreads keyed messages across partitions and what ordering you get. We'll create a topic with **3 partitions**, run a producer that sends increasing integers, run **3 consumers** each reading one partition, and watch the output." },
    { type: "p", text: "**1. Start Kafka.** Setting Kafka up by hand is more involved than Redis: you need a JDK, the Kafka distribution and Python. The easiest route is the official Docker image, which runs a single-node broker in KRaft mode (no ZooKeeper):" },
    { type: "code", code: "docker run -d --name kafka -p 9092:9092 apache/kafka:3.8.0\npip install kafka-python" },
    { type: "p", text: "**2. Create a topic with 3 partitions** and describe it:" },
    { type: "code", code: `docker exec kafka /opt/kafka/bin/kafka-topics.sh --create --topic multi_partition_ordered \\
  --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
Created topic multi_partition_ordered.

docker exec kafka /opt/kafka/bin/kafka-topics.sh --describe --topic multi_partition_ordered --bootstrap-server localhost:9092
Topic: multi_partition_ordered  PartitionCount: 3  ReplicationFactor: 1
    Topic: multi_partition_ordered  Partition: 0  Leader: 1  Replicas: 1  Isr: 1
    Topic: multi_partition_ordered  Partition: 1  Leader: 1  Replicas: 1  Isr: 1
    Topic: multi_partition_ordered  Partition: 2  Leader: 1  Replicas: 1  Isr: 1` },
    { type: "p", text: "**3. The producer**, `kafka_producer.py`. It sends 0, 1, 2, … once a second, with key `key-{n % 3}`. Kafka's default partitioner hashes the key, so every message with the same key lands on the same partition:" },
    { type: "code", code: `import time
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers="localhost:9092")

number = 0
while True:
    key = f"key-{number % 3}"            # three keys -> (usually) three partitions
    producer.send("multi_partition_ordered", key=key.encode(), value=str(number).encode())
    number += 1
    time.sleep(1)` },
    { type: "p", text: "Run `python kafka_producer.py` and leave it running (it prints nothing)." },
    { type: "p", text: "**4. The consumers**, `kafka_consumer.py`. Three threads, each assigned one partition of the topic:" },
    { type: "code", code: `import threading, time
from kafka import KafkaConsumer, TopicPartition

TOPIC = "multi_partition_ordered"

def consume_partition(partition_id):
    consumer = KafkaConsumer(bootstrap_servers="localhost:9092",
                             group_id="ordered_partition_group",
                             auto_offset_reset="earliest")
    partitions = None
    while not partitions:                           # wait until the topic exists
        partitions = consumer.partitions_for_topic(TOPIC)
        if not partitions:
            time.sleep(1)
    consumer.assign([TopicPartition(TOPIC, sorted(partitions)[partition_id])])
    print(f"Consuming partition {partition_id}")
    for msg in consumer:
        print(f"Partition: {msg.partition} - Offset: {msg.offset} - Key: {msg.key} - Value: {msg.value}")

if __name__ == "__main__":
    for i in range(3):                              # consumers must be <= partitions
        threading.Thread(target=consume_partition, args=(i,)).start()` },
    { type: "p", text: "**5. Run the consumers** in a second terminal with `python kafka_consumer.py`:" },
    { type: "code", code: `Consuming partition 2
Consuming partition 0
Consuming partition 1
Partition: 1 - Offset: 0 - Key: b'key-0' - Value: b'0'
Partition: 1 - Offset: 1 - Key: b'key-0' - Value: b'3'
Partition: 1 - Offset: 2 - Key: b'key-0' - Value: b'6'
Partition: 1 - Offset: 3 - Key: b'key-0' - Value: b'9'
Partition: 1 - Offset: 4 - Key: b'key-0' - Value: b'12'
...
Partition: 1 - Offset: 23 - Key: b'key-0' - Value: b'69'` },
    { type: "p", text: "Key `key-0` (values 0, 3, 6, …) hashed to partition 1, and within that partition the values are **always increasing**, each at the next offset. Messages for other keys appear on other partitions, interleaved in whatever order the consumers happen to print them. That's the guarantee in one picture: **order within a partition, none across partitions**. (With only three keys, two may hash to the same partition, leaving one consumer idle, which is also why the number of distinct keys should comfortably exceed the number of partitions.)" },

    { type: "h2", text: "Pitfalls" },
    { type: "ul", items: [
      "**Hot partitions**: a skewed key (one huge customer) overloads one partition and its consumer. Choose keys with even distribution. See [hot partitions](/learn/hot-partitions).",
      "**Slow consumers block their partition**: one slow message delays everything behind it in that partition. Keep processing fast; push slow work to a separate queue.",
      "**Too few partitions** limit scaling; increasing them later changes key-to-partition mapping and breaks per-key ordering during the change.",
      "**Consumer lag** is the key metric: how far behind the latest offset each group is. Alert on it.",
    ] },
  ],
  uses: [
    { name: "LinkedIn", text: "Created Kafka to move activity and operational data between systems; it carries trillions of messages a day there." },
    { name: "Uber and Netflix", text: "Use Kafka as the central event bus for trips, playback events and microservice communication, feeding real-time and batch analytics." },
    { name: "Change data capture", text: "Debezium streams database changes into Kafka so search indexes, caches and warehouses stay in sync. See [change data capture](/learn/change-data-capture)." },
    { name: "Stream processing", text: "Flink, Kafka Streams and Spark read from Kafka to compute real-time aggregates, fraud signals and dashboards. See [stream processing](/learn/stream-processing)." },
  ],
  interview: [
    "Choose a log broker when several consumers need the same events, replay matters, or volume is high.",
    "State the partition key and that order is guaranteed only within a partition.",
    "Size partitions for the consumer parallelism you'll need, and mention consumer lag monitoring.",
    "Say delivery is at-least-once and consumers are idempotent (or use transactions for exactly-once within Kafka).",
  ],
  related: ["message-queues", "pub-sub", "delivery-semantics", "change-data-capture", "stream-processing", "event-sourcing-cqrs"],
  practice: ["distributed-message-queue", "clickstream", "realtime-analytics", "fraud-data-platform"],
  reading: [
    { title: "Kafka 101 (with hands-on exercises)", publisher: "Confluent Developer", url: "https://developer.confluent.io/learn-kafka/apache-kafka/events/" },
  ],
};
