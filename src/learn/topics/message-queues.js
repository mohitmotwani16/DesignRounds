export default {
  blocks: [
    { type: "p", text: "A **message queue** lets one part of a system hand work to another without waiting for it to finish. A **producer** adds a message to the queue; a **consumer** takes it off, processes it, and **acknowledges** it so it is removed. Think of it as email between services: the sender doesn't need the receiver to be available right now. The queue decouples them in time and speed: the producer stays fast, and work survives even if consumers are slow, busy or down." },

    { type: "h2", text: "Asynchronous communication and messages" },
    { type: "p", text: "[Synchronous calls](/learn/sync-vs-async-communication) make the caller wait. **Asynchronous** communication shares data between components without blocking, and messaging is its most common form." },
    { type: "p", text: "A **message** is the unit of communication. It has two parts:" },
    { type: "ul", items: [
      "**Header**: key-value metadata such as a message ID, timestamp, sender, type or priority.",
      "**Body**: the payload, as text or binary. Its format (JSON, Protobuf, XML) isn't fixed by the queue; the system's designers decide it.",
    ] },
    { type: "code", code: `+-----------------------------------------------+
| Header                                        |
| message_id: 12345, timestamp: 1678901234567   |
+-----------------------------------------------+
| Body                                          |
| { "order_id": "A456", "status": "confirmed" } |
+-----------------------------------------------+` },
    { type: "p", text: "Here (for example in RabbitMQ) the header carries a unique `message_id` for tracking and the creation `timestamp`; the body carries an order ID and its status, a typical way for an e-commerce system to tell the inventory service about a confirmed order without calling it directly." },

    { type: "h2", text: "Messaging styles" },
    { type: "h3", text: "One-way notification" },
    { type: "p", text: "A sender sends a message to one recipient and expects no reply: fire and forget. Used for logging, alerts and background jobs." },
    { type: "diagram", kind: "flow", caption: "One-way notification: the producer sends through a message channel to one consumer.", nodes: [
      { id: "a", label: "Service A", sub: "producer", col: 0, row: 0 },
      { id: "ch", label: "Message channel", col: 1.3, row: 0, shape: "queue", tone: "queue" },
      { id: "b", label: "Service B", sub: "consumer", col: 2.6, row: 0 },
    ], edges: [{ from: "a", to: "ch" }, { from: "ch", to: "b" }] },
    { type: "h3", text: "One-way publish/subscribe" },
    { type: "p", text: "A publisher sends messages to a **topic** and every subscriber receives them. Common in event-driven systems where many components react to the same event. See [pub/sub](/learn/pub-sub)." },
    { type: "diagram", kind: "flow", caption: "Pub/sub: one published message reaches every subscriber of the topic.", nodes: [
      { id: "a", label: "Service A", sub: "publisher", col: 0, row: 1 },
      { id: "t", label: "Topic", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "b", label: "Service B", col: 2.6, row: 0 },
      { id: "c", label: "Service C", col: 2.6, row: 1 },
      { id: "d", label: "Service D", sub: "subscribers", col: 2.6, row: 2 },
    ], edges: [{ from: "a", to: "t" }, { from: "t", to: "b" }, { from: "t", to: "c" }, { from: "t", to: "d" }] },
    { type: "h3", text: "Two-way asynchronous request–response" },
    { type: "p", text: "The sender sends a request message and later receives a reply message, which needs two channels: one for requests and one for responses (with a correlation ID linking them). It's less common than the first two." },
    { type: "diagram", kind: "flow", caption: "Async request–response: requests and replies travel on separate channels.", nodes: [
      { id: "a", label: "Service A", col: 0, row: 0.5 },
      { id: "req", label: "Request channel", col: 1.3, row: 0, shape: "queue", tone: "queue" },
      { id: "res", label: "Response channel", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "b", label: "Service B", col: 2.6, row: 0.5 },
    ], edges: [{ from: "a", to: "req" }, { from: "req", to: "b" }, { from: "b", to: "res" }, { from: "res", to: "a" }] },

    { type: "h2", text: "Message brokers" },
    { type: "p", text: "The message channel is usually a **message broker**: an intermediary that every message flows through. The sender writes to the broker and the broker delivers to the receiver. It ensures reliable delivery, manages queues, and supports patterns such as point-to-point and publish–subscribe. Each broker implements the channel idea differently:" },
    { type: "table", head: ["Broker", "Channel type"], rows: [
      ["RabbitMQ", "Queues (and topic exchanges)"],
      ["Apache Kafka", "Topics, split into partitions"],
      ["Amazon SQS", "Queues"],
      ["Google Pub/Sub", "Topics"],
    ] },
    { type: "table", head: ["Pros of async messaging", "Cons"], rows: [
      ["**Loose coupling**: components don't need to know about each other", "**Complexity**: running brokers and guaranteeing reliability adds operational work"],
      ["**Buffering**: messages wait until receivers are ready", "**Latency**: messages can sit in queues, especially under backlog"],
      ["**No service discovery needed**: senders only know the queue or topic", "**Harder error handling and debugging** across decoupled components"],
    ] },

    { type: "h2", text: "Why use a message queue" },
    { type: "diagram", kind: "flow", caption: "Producers add messages to the queue; consumers take them off at their own pace.", nodes: [
      { id: "p1", label: "Producer", col: 0, row: 0, tone: "cache" },
      { id: "p2", label: "Producer", col: 0, row: 1, tone: "cache" },
      { id: "q", label: "Queue", col: 1.3, row: 0.5, shape: "queue", tone: "queue" },
      { id: "c1", label: "Consumer", col: 2.6, row: 0, tone: "store" },
      { id: "c2", label: "Consumer", col: 2.6, row: 1, tone: "store" },
    ], edges: [{ from: "p1", to: "q" }, { from: "p2", to: "q" }, { from: "q", to: "c1" }, { from: "q", to: "c2" }] },
    { type: "ol", items: [
      "**It buffers between components that run at different speeds.** Services that write to a database are usually slower than stateless web services working in memory. With a queue, producers send at their own pace without overwhelming slower consumers. In a photo-sharing app, users upload photos far faster than the image processor and database updater can handle them; on a video platform like YouTube, the frontend accepts comments faster than the database updater can store them. The queue lets the consumers catch up without losing anything.",
      "**It decouples producer and consumer, which adds fault tolerance.** If a consumer goes down, its messages stay in the queue and are processed when it comes back. If the photo processor or the database updater crashes, nothing is lost.",
    ] },
    { type: "p", text: "A concrete case. On Black Friday a store gets 10,000 orders a minute. The order service calls the payment service, which takes 2 seconds per order, and waits for each one: orders pile up and users see timeouts. Then the payment service crashes for 30 seconds; the 5,000 orders that arrive meanwhile all fail, with nothing to retry them, and the revenue is gone. With a queue, the order service publishes each order and replies to the user at once; the payment service works through the queue at its own pace; if it crashes, orders wait in the queue and processing resumes when it recovers. No order is lost." },

    { type: "h2", text: "How delivery works" },
    { type: "ol", items: [
      "**Producers** publish messages, for example `{\"order_id\": 123, \"user_id\": 456, \"total\": 99.99}`.",
      "The **queue stores them durably**: if the queue server crashes, messages persist on disk. They wait until a consumer is ready.",
      "A consumer **receives** a message. The queue hides it from other consumers for a **visibility timeout** (say 30 seconds) but doesn't delete it yet.",
      "The consumer processes it and **acknowledges** it; the queue then deletes it.",
      "If the consumer crashes or the timeout passes without an ack, the message becomes visible again and is **redelivered**, possibly to another consumer.",
    ] },
    { type: "p", text: "This gives **at-least-once delivery**: a message is never lost, but it can be processed more than once (for example if a consumer finishes the work but crashes before acknowledging). Consumers must therefore be **idempotent**. See [delivery guarantees](/learn/delivery-semantics) and [idempotency](/learn/idempotency)." },
    { type: "diagram", kind: "flow", caption: "The API accepts an upload and enqueues a job; a pool of workers processes jobs at its own pace, retries failures and parks poison messages in a dead-letter queue.", nodes: [
      { id: "api", label: "API", sub: "returns 202", col: 0, row: 1 },
      { id: "q", label: "Job queue", col: 1.2, row: 1, shape: "queue", tone: "queue" },
      { id: "w1", label: "Worker", col: 2.4, row: 0 },
      { id: "w2", label: "Worker", col: 2.4, row: 1 },
      { id: "w3", label: "Worker", col: 2.4, row: 2 },
      { id: "dlq", label: "Dead-letter queue", col: 1.2, row: 2.3, shape: "queue", tone: "danger" },
    ], edges: [
      { from: "api", to: "q", label: "enqueue" }, { from: "q", to: "w1" }, { from: "q", to: "w2" }, { from: "q", to: "w3" },
      { from: "w3", to: "dlq", label: "3 failed attempts", dashed: true, tone: "danger" },
    ] },

    { type: "h2", text: "Two families of message queues" },
    { type: "h3", text: "AMQP/JMS-style (traditional) brokers" },
    { type: "p", text: "Built on the Advanced Message Queuing Protocol (AMQP) or the Java Message Service (JMS) standard, originally for passing messages inside large enterprise systems. They support publish/subscribe, point-to-point and request/reply." },
    { type: "ul", items: [
      "Messages are usually held in memory and **deleted once consumed**. The emphasis is on routing, filtering and transforming messages.",
      "Duplicates are possible, and ordering is either not guaranteed or guaranteed only per queue (never globally).",
      "Examples: RabbitMQ, ActiveMQ, Azure Service Bus, IBM MQ.",
    ] },
    { type: "h3", text: "Log-based brokers" },
    { type: "p", text: "Kafka, AWS Kinesis and similar systems store messages in a distributed, **append-only log**. All messages in a partition go to the same consumer, always in the same order; parallelism comes from having many partitions; consumers record their progress by checkpointing the **offset** of the last message they processed. Because messages stay on disk, a consumer can jump back and re-read old ones. These are often called **event streaming platforms**: the difference from a queue is that a stream is persisted and read with an iterator, while a queue's messages are processed independently and deleted when done." },
    { type: "ul", items: [
      "Messages are persisted on disk, enabling long retention, reprocessing and strong fault tolerance.",
      "Built for high throughput and low latency: data streaming and real-time analytics.",
      "Strong durability guarantees at very high volumes.",
      "Messages within a partition are totally ordered, each with a unique offset.",
      "Examples: Apache Kafka, AWS Kinesis, Google Cloud Pub/Sub, Azure Event Hubs. See [event streaming and Kafka](/learn/event-streaming-kafka).",
    ] },
    { type: "p", text: "As with databases, the line blurs: IBM MQ added message deduplication (from version 9.2.3), and Amazon SQS is a hybrid: queue-centric with acknowledgment and deletion, but also distributed with message retention." },
    { type: "table", head: ["", "AMQP/JMS-style queue", "Log-based queue"], rows: [
      ["Message storage", "In memory (usually transient)", "Persistent, on disk"],
      ["Durability", "Optional, configurable", "Strong"],
      ["Ordering", "Unordered or per queue", "Per partition"],
      ["After processing", "Deleted", "Retained for days; can be replayed"],
      ["When to use", "Each message is expensive to process and order doesn't matter", "Messages are cheap to process, volume is high and order matters"],
      ["Example uses", "Encoding videos, fetching hotel prices, downloading large files", "Analytics stream processing, event sourcing (game moves, payment processing), IoT sensor data"],
    ] },

    { type: "h2", text: "Patterns: one-to-one and publish/subscribe" },
    { type: "ul", items: [
      "**One-to-one (point-to-point)**: each message is processed by exactly one consumer, and producers usually know which queue they're sending to. Amazon SQS works this way: a message sent to a queue is processed by one consumer.",
      "**Publish/subscribe**: each message can be processed by many consumers (the fan-out pattern). Producers publish to a central **topic** without knowing who's listening; each subscriber gets its own copy, delivered immediately. A common AWS setup combines SNS and SQS: SNS is the topic, and each subscribing SQS queue receives a copy of every message, so several independent consumers can process it.",
    ] },
    { type: "table", head: ["", "Work queue", "Pub/sub", "Log (Kafka)"], rows: [
      ["Each message goes to", "One consumer", "Every subscriber", "Every consumer group, each reading at its own offset"],
      ["After processing", "Deleted", "Gone once delivered", "Retained for days; can be replayed"],
      ["Typical use", "Background jobs, task distribution", "Notifications, cache invalidation, fan-out", "Event streams, data pipelines, event sourcing"],
      ["Examples", "SQS, RabbitMQ, Celery, Sidekiq", "SNS, Google Pub/Sub, Redis pub/sub", "Kafka, Kinesis, Pulsar, Redpanda"],
    ] },

    { type: "h2", text: "Use case 1: absorbing traffic between tiers" },
    { type: "p", text: "A hotel booking site: customer traffic passes a load balancer to a pool of web servers. When someone books, the web servers call a second tier of booking microservices behind another load balancer, and the booking service writes to a relational database." },
    { type: "diagram", kind: "flow", caption: "Without a queue: web servers call the booking services directly through a second load balancer.", nodes: [
      { id: "net", label: "Internet", col: 0, row: 1, shape: "pill" },
      { id: "lb1", label: "Load balancer", col: 1, row: 1 },
      { id: "s1", label: "Web server", col: 2, row: 0 },
      { id: "s2", label: "Web server", col: 2, row: 1 },
      { id: "s3", label: "Web server", col: 2, row: 2 },
      { id: "lb2", label: "Load balancer", col: 3, row: 1 },
      { id: "bk", label: "Booking services", col: 4, row: 1 },
      { id: "db", label: "Database", col: 5, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "net", to: "lb1" }, { from: "lb1", to: "s1" }, { from: "lb1", to: "s2" }, { from: "lb1", to: "s3" },
      { from: "s1", to: "lb2" }, { from: "s2", to: "lb2" }, { from: "s3", to: "lb2" }, { from: "lb2", to: "bk" }, { from: "bk", to: "db" },
    ] },
    { type: "p", text: "Most traffic is people browsing offers; relatively few actually book. Then a big promotion launches and bookings arrive faster than the system was built for. The many web servers forward a flood of requests to the booking tier, which can't keep up; the database starts timing out and dropping requests, and the errors flow back to customers." },
    { type: "p", text: "The fix: **replace the second load balancer with a queue**. The queue absorbs the burst, and the booking services pull bookings from the backlog at a rate they and the database can handle. The capacity mismatch between the tiers can no longer cause an overload." },
    { type: "diagram", kind: "flow", caption: "With a queue between the tiers, a booking spike becomes a backlog that the booking services drain at a safe rate.", nodes: [
      { id: "net", label: "Internet", col: 0, row: 1, shape: "pill" },
      { id: "lb1", label: "Load balancer", col: 1, row: 1 },
      { id: "s1", label: "Web server", col: 2, row: 0 },
      { id: "s2", label: "Web server", col: 2, row: 1 },
      { id: "s3", label: "Web server", col: 2, row: 2 },
      { id: "q", label: "Booking queue", col: 3, row: 1, shape: "queue", tone: "queue" },
      { id: "bk", label: "Booking services", col: 4, row: 1 },
      { id: "db", label: "Database", col: 5, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "net", to: "lb1" }, { from: "lb1", to: "s1" }, { from: "lb1", to: "s2" }, { from: "lb1", to: "s3" },
      { from: "s1", to: "q" }, { from: "s2", to: "q" }, { from: "s3", to: "q" }, { from: "bk", to: "q", label: "pull", dashed: true }, { from: "bk", to: "db" },
    ] },

    { type: "h2", text: "Use case 2: notifying other services" },
    { type: "p", text: "After a booking completes, the booking service could call the other services directly: payments, the notification service (mobile push), external partner integrations (sending the voucher to the hotel) and more. But each of those differs in speed, call frequency and traffic spikes; any one being slow or down slows or breaks bookings." },
    { type: "p", text: "Instead, the booking service publishes one **\"new booking completed\"** message to a booking topic, and every interested service subscribes. The booking service no longer knows or cares who listens, and adding a new consumer requires no change to it." },
    { type: "diagram", kind: "flow", caption: "A booking topic decouples the booking service from everything that reacts to a booking.", nodes: [
      { id: "b", label: "Booking services", col: 0, row: 1.5 },
      { id: "t", label: "Booking topic", sub: "new booking completed", col: 1.4, row: 1.5, shape: "queue", tone: "queue" },
      { id: "p", label: "Payment services", col: 2.9, row: 0 },
      { id: "n", label: "Notification services", col: 2.9, row: 1 },
      { id: "e", label: "Partner integrations", col: 2.9, row: 2 },
      { id: "o", label: "Other services", col: 2.9, row: 3 },
    ], edges: [{ from: "b", to: "t", label: "publish" }, { from: "t", to: "p" }, { from: "t", to: "n" }, { from: "t", to: "e" }, { from: "t", to: "o" }] },

    { type: "h2", text: "Use case 3: background tasks" },
    { type: "p", text: "After a successful booking, the service must do several things:" },
    { type: "table", head: ["Task", "Time (ms)"], rows: [
      ["Update the booking status in the database", "30"],
      ["Create a PDF voucher", "1,000"],
      ["Send a confirmation email with the voucher", "500"],
      ["Notify other services of the booking", "1,000"],
    ] },
    { type: "p", text: "Done one after another, the user waits 30 + 1,000 + 500 + 1,000 = **2,530 ms**." },
    { type: "code", code: `def synchronous_tasks():
    update_booking_status()
    create_pdf_voucher()
    send_confirmation_email()
    notify_other_services()        # the user waits for all four: about 2.5 s` },
    { type: "p", text: "Only the status update has to happen before responding. Running the rest in background threads cuts the response to about **30 ms**:" },
    { type: "code", code: `from threading import Thread

def asynchronous_tasks():
    update_booking_status()                          # 30 ms, before responding
    for task in (create_pdf_voucher, send_confirmation_email, notify_other_services):
        Thread(target=task, daemon=True).start()     # don't wait for them` },
    { type: "table", head: ["Task", "When", "Time (ms)"], rows: [
      ["Update the booking status", "Before responding", "30"],
      ["Create a PDF voucher", "Background", "1,000"],
      ["Send a confirmation email", "Background", "500"],
      ["Notify other services", "Background", "1,000"],
    ] },
    { type: "p", text: "That's fast, but fragile: if the process crashes or a thread fails, the work is silently lost and nobody knows whether it ran. The better approach is a **task queue**: put the background tasks on a queue and let separate worker processes run them. A worker removes a task only when it's done, so tasks survive crashes, can be retried, and their status can be checked. With Python's Redis Queue (RQ):" },
    { type: "code", code: `import time
from redis import Redis
from rq import Queue

queue = Queue(connection=Redis())

def update_booking_status():   time.sleep(0.03); print("Booking status updated.")
def create_pdf_voucher():      time.sleep(1.0);  print("PDF voucher created.")
def send_confirmation_email(): time.sleep(0.5);  print("Confirmation email sent.")
def notify_other_services():   time.sleep(1.0);  print("Other services notified.")

if __name__ == "__main__":
    update_booking_status()                       # synchronous, before responding
    jobs = [queue.enqueue(task) for task in (create_pdf_voucher, send_confirmation_email, notify_other_services)]
    print([job.id for job in jobs])               # keep the IDs to check status later
    # Run workers in separate processes:  rq worker` },
    { type: "p", text: "In production, put the task functions in their own module so workers can import them, add retries (`Retry(max=3, interval=[10, 30, 60])` in RQ), and make every task idempotent." },

    { type: "h2", text: "Dead-letter queues" },
    { type: "p", text: "A **dead-letter queue (DLQ)** stores messages that couldn't be processed or delivered: the consumer kept crashing on them, their format was invalid, or they exceeded the maximum number of delivery attempts. (The name comes from undeliverable postal mail.) A message that fails every time is called a **poison message**. DLQs help in four ways:" },
    { type: "ol", items: [
      "**Error handling**: a failed message is moved aside instead of being lost or retried forever.",
      "**Monitoring and debugging**: developers inspect the DLQ to find bugs in the processing logic or the messages themselves.",
      "**Isolation**: bad messages no longer block or slow the valid ones behind them.",
      "**Reprocessing**: once the bug is fixed, messages can be moved back to the main queue and processed.",
    ] },
    { type: "p", text: "Alert on DLQ depth, and give operators a way to inspect and replay messages." },

    { type: "h2", text: "When a consumer fails" },
    { type: "p", text: "What to do depends on why it failed and what the application needs:" },
    { type: "ol", items: [
      "**Retry with backoff and jitter**: wait and try again, for transient failures like a network blip. Increase the delay each time and randomize it so consumers don't all retry at once (the thundering-herd problem). See [retries](/learn/retries-and-timeouts).",
      "**Send it to a dead-letter queue**: instead of putting it back on the main queue, move it to the DLQ so the main queue keeps flowing, usually after a fixed number of attempts.",
      "**Discard it**: for non-critical messages it can be acceptable to drop failures.",
    ] },
    { type: "p", text: "Also keep the **visibility timeout longer than processing time**, or extend it with heartbeats for long jobs; otherwise a slow job becomes visible again and is processed twice in parallel." },

    { type: "h2", text: "Ordering" },
    { type: "p", text: "Standard queues with many consumers don't guarantee order: messages are processed in parallel and retries reorder them. **FIFO (first in, first out) queues** guarantee order, so order messages for the same user are processed in sequence, at the cost of throughput; standard queues allow out-of-order processing for higher throughput. To keep order without losing parallelism, use **ordered groups**: SQS FIFO message groups, or Kafka partitions keyed by entity ID, which keep order per key while different keys proceed in parallel. See [event streaming](/learn/event-streaming-kafka)." },

    { type: "h2", text: "Watch the queue depth" },
    { type: "p", text: "A queue hides overload instead of removing it. If producers outpace consumers for long, the backlog grows, latency climbs from seconds to hours, and memory or retention limits are hit. Monitor **queue depth** and **age of the oldest message**, autoscale consumers on them, and apply [backpressure](/learn/backpressure) or load shedding when the backlog can't be cleared." },

    { type: "h2", text: "Common implementations" },
    { type: "table", head: ["Queue", "Strengths", "Use it for"], rows: [
      ["RabbitMQ", "Traditional broker with flexible exchange types that route messages to many queues", "Sophisticated routing and per-message acknowledgments"],
      ["Apache Kafka", "Distributed event log; millions of messages per second, retained for replay", "Event sourcing, real-time analytics, log aggregation"],
      ["Amazon SQS", "Fully managed, autoscaling, no operations work", "Cloud apps that want simplicity over advanced features"],
      ["Redis (RQ, Sidekiq, Celery with Redis)", "Very simple job queues on top of Redis", "Background jobs in web apps"],
    ] },

    { type: "h2", text: "Hands-on: a task queue with Redis Queue" },
    { type: "p", text: "Let's queue a slow task (downloading an image) and have a worker process it. The flow: `main.py` (the producer) enqueues a job in Redis; an `rq worker` process picks it up and runs `download_image`." },
    { type: "diagram", kind: "flow", caption: "The lab: the producer script enqueues a download job in Redis; an RQ worker runs it.", nodes: [
      { id: "p", label: "Producer", sub: "main.py", col: 0, row: 0, tone: "cache" },
      { id: "q", label: "Redis queue", sub: "rq:queue:default", col: 1.4, row: 0, shape: "queue", tone: "queue" },
      { id: "w", label: "rq worker", sub: "image_downloader.py", col: 2.8, row: 0, tone: "store" },
    ], edges: [{ from: "p", to: "q", label: "enqueue" }, { from: "w", to: "q", label: "dequeue", dashed: true }] },
    { type: "p", text: "**1. Set up.** Start Redis (for example `docker run -d --name redis -p 6379:6379 redis:7`) and install the Python libraries from `requirements.txt`:" },
    { type: "code", code: "rq==2.6.0\nrequests==2.32.5\nredis==6.4.0" },
    { type: "code", code: "pip install -r requirements.txt\nredis-cli KEYS '*'        # (empty array): Redis starts clean" },
    { type: "p", text: "**2. The task**, in `image_downloader.py`. It downloads an image and saves it under its file name:" },
    { type: "code", code: `import requests

def download_image(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    filename = url.rstrip("/").split("/")[-1] or "image"
    with open(filename, "wb") as f:
        f.write(response.content)
    print(f"Image downloaded and saved as {filename}")` },
    { type: "p", text: "**3. The producer**, in `main.py`. It connects to Redis, creates a queue and enqueues one job:" },
    { type: "code", code: `from redis import Redis
from rq import Queue
from image_downloader import download_image

queue = Queue(connection=Redis())
job = queue.enqueue(download_image, "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png")
print("Enqueued job", job.id)` },
    { type: "p", text: "**4. Run the producer** and look inside Redis. The job is waiting in the queue:" },
    { type: "code", code: `$ python main.py
Enqueued job 27148712-d3c5-4762-bc8d-8af71001320f

$ redis-cli KEYS '*'
1) "rq:job:27148712-d3c5-4762-bc8d-8af71001320f"
2) "rq:queue:default"
3) "rq:queues"` },
    { type: "p", text: "**5. Start a worker.** It listens on the default queue, picks up the job and runs it:" },
    { type: "code", code: `$ rq worker
09:52:39 Worker 4f16…: started with PID 32, version 2.6.0
09:52:39 *** Listening on default...
09:52:39 default: image_downloader.download_image('https://…/PNG_transparency_demonstration_1.png') (27148712-…)
Image downloaded and saved as PNG_transparency_demonstration_1.png
09:52:41 Successfully completed image_downloader.download_image(...) job in 0:00:02.107133s
09:52:41 default: Job OK (27148712-…)
09:52:41 Result is kept for 500 seconds` },
    { type: "p", text: "Stop the worker and `ls` the directory: the image is there. You've just seen the whole lifecycle: enqueue, wait, dequeue, process, acknowledge. From here, try enqueueing heavier tasks (hashing or converting a video), starting several workers in parallel to see them share the queue, or making the task fail to see retries and the failed-job registry. The RQ documentation at python-rq.org covers scheduling, retries and job dependencies." },
  ],
  uses: [
    { name: "Email and notification sending", text: "Requests enqueue messages; workers send through providers with retries and rate limits. See [notification service](/system-design/notification-service)." },
    { name: "Media processing", text: "Upload events queue jobs for thumbnails, transcoding and moderation, processed by autoscaled worker fleets." },
    { name: "Order and booking processing", text: "Checkouts and bookings are queued so a slow payment provider or hotel partner never blocks the customer." },
    { name: "Background job frameworks", text: "Sidekiq (Redis), Celery (RabbitMQ/Redis), RQ and SQS-based workers run most web apps' async work." },
  ],
  interview: [
    "Move slow or unreliable work (email, media, third-party calls) behind a queue and return 202 or a pending status.",
    "Say delivery is at-least-once and make consumers idempotent.",
    "Mention retries with backoff, a dead-letter queue, and alerting on queue depth and age.",
    "Pick the queue type: a traditional queue for expensive independent jobs, a log like Kafka for ordered, replayable, high-volume streams.",
  ],
  related: ["sync-vs-async-communication", "pub-sub", "event-streaming-kafka", "delivery-semantics", "idempotency", "backpressure", "retries-and-timeouts"],
  practice: ["comment-system", "notification-service", "task-scheduler", "distributed-message-queue", "web-crawler"],
};
