// Describing load: DAU to requests per second, read/write ratio, connections, throughput,
// latency vs response time, RPS vs QPS, what each QPS tier needs, and real-world profiles.
export default {
  blocks: [
    { type: "p", text: "Resource estimation is one of the most important parts of system design. Starting from a **load parameter**, such as how many people use the product each day, you work out the compute and storage the system needs and, more importantly, **where the bottleneck will be**, so the design can address it. This page covers the load parameters that matter, how to turn product numbers into engineering numbers, and what different levels of QPS demand from an architecture." },

    { type: "h2", text: "Describing load" },
    { type: "p", text: "Product teams talk in **daily active users (DAU)**. Engineers translate that into numbers a design can be checked against:" },
    { type: "table", head: ["Load parameter", "What it tells you"], rows: [
      ["Requests per second (RPS/QPS)", "How many servers and how much database capacity you need; the basis for sizing databases and cache memory"],
      ["Read/write ratio", "Whether to optimize the read path (cache, replicas) or the write path (partitioning, fast write stores, eventual consistency)"],
      ["Concurrent connections", "For WebSocket apps such as chat, often the real bottleneck: you need enough connection servers"],
      ["Throughput (MB/s)", "Network and disk bandwidth for file, image and video systems"],
      ["Latency and response time", "Whether data must be close to users, cached or precomputed"],
      ["Storage and retention", "How much data accumulates, and therefore whether it must be sharded"],
    ] },

    { type: "h2", text: "Requests per second: a worked example" },
    { type: "p", text: "Requests per second are the starting point for sizing databases and caches. Take an online publishing platform with **500,000 DAU**, where each user on average reads **5 posts** and writes **1 post** a day, and a post averages **50 KB**." },
    { type: "code", code: `Reads per day   = 500,000 × 5 = 2,500,000
Writes per day  = 500,000 × 1 =   500,000

Reads per second  = 2,500,000 / 86,400 ≈ 28.9
Writes per second =   500,000 / 86,400 ≈  5.8

Storage per day   = 500,000 × 1 × 50 KB = 25,000,000 KB ≈ 25 GB
Retention         = 10 years = 365 × 10 = 3,650 days
Total storage     = 25 GB × 3,650 ≈ 91,300 GB ≈ 91.3 TB` },
    { type: "p", text: "The verdict: the traffic is tiny (one server handles 30 reads/s easily), but storage reaches about 91 TB over ten years. So the interesting design problem is **storage**: put post bodies in [object storage](/learn/object-storage), keep metadata in a database, and plan for growth. Real traffic isn't flat, so also multiply averages by a peak factor (2–10×) before sizing servers. More in [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation)." },

    { type: "h2", text: "Read/write ratio" },
    { type: "p", text: "The ratio between reads and writes decides how you design the two paths." },
    { type: "ul", items: [
      "**Many more reads than writes.** Use [caching](/learn/caching) to keep reads off the database, and scale database reads with [read replicas](/learn/replication). Reddit is a classic example: most users are \"lurkers\" who read but rarely post.",
      "**Many more writes than reads.** Focus on scaling writes: use fast, high-throughput data stores, [partition](/learn/sharding) them well, and consider **eventual consistency** to speed up writes. An analytics tool that records every click is write-heavy in exactly this way. See [consistency models](/learn/consistency-models).",
    ] },

    { type: "h2", text: "Concurrent connections" },
    { type: "p", text: "In chat apps like WhatsApp, the number of open WebSocket connections is often the bottleneck rather than requests per second. Each server can hold only so many connections, so run many instances of the connection service and put a [load balancer](/learn/load-balancing) in front to spread new connections across them. See [real-time communication](/learn/real-time-communication)." },

    { type: "h2", text: "Throughput is not the same as requests per second" },
    { type: "p", text: "**Throughput** is how much data, work or how many transactions a system handles in a period: bits per second for networks, transactions per second (TPS) for databases. Higher throughput means the system can do more. But throughput alone doesn't describe a workload. Two systems with identical throughput:" },
    { type: "table", head: ["", "File storage service", "Mobile app API"], rows: [
      ["Size of each request", "100 MB (file upload or download)", "1 MB (weather, headlines, updates)"],
      ["Requests per second", "10", "1,000"],
      ["Throughput", "10 × 100 MB = **1,000 MB/s**", "1,000 × 1 MB = **1,000 MB/s**"],
      ["What dominates the design", "Bandwidth, large transfers, resumable uploads", "Per-request overhead, connection handling, caching"],
    ] },
    { type: "p", text: "Same throughput, a 100× difference in request rate, and completely different designs. Always design for the **access pattern**, not a single number." },

    { type: "h2", text: "Latency vs response time" },
    { type: "p", text: "In networking, **latency** is the time for data to travel from one point to another: a packet from New York to London takes roughly 35 ms one way. **Round-trip time (RTT)** is two one-way trips, there and back." },
    { type: "p", text: "In system design the word is used more broadly: latency is the delay from when the client sends a request until it receives the **first byte** of the response. That includes network travel to the server, **queuing** (waiting in load balancers, queues or schedulers) and the server's **initial processing** before it can start replying. **Response time** is the full duration until the **last byte** arrives: latency plus the rest of the server's work plus transmitting the whole response." },
    { type: "diagram", kind: "segments", caption: "Latency ends at the first byte; response time ends at the last byte. For a streamed response the gap between them can be large.", lanes: [
      { label: "Timeline", parts: [
        { label: "network", sub: "to server", size: 2, tone: "store" },
        { label: "queue", sub: "LB, scheduler", size: 1.2, tone: "muted" },
        { label: "first work", sub: "until 1st byte", size: 1.8, tone: "cache" },
        { label: "remaining work + transfer", sub: "until last byte", size: 4, tone: "ok" },
      ] },
    ] },
    { type: "ul", items: [
      "**Buffered responses** (small JSON APIs, buffered downloads): the server sends nothing until the whole response is ready, so the first and last bytes arrive together and latency equals response time.",
      "**Streamed responses** (chunked HTTP, video, real-time APIs, LLM tokens): the first byte can be sent early while the rest is still being produced, so latency can be much smaller than response time.",
    ] },
    { type: "p", text: "Low latency is critical for real-time products such as online games, video calls, live trading and interactive APIs, where users expect instant reactions. Fast response times matter for every interactive web page and app. See [latency vs throughput](/learn/latency-vs-throughput)." },

    { type: "h2", text: "RPS vs QPS" },
    { type: "ul", items: [
      "**RPS (requests per second)**: every request a server receives, including static files (images) and dynamic API calls.",
      "**QPS (queries per second)**: strictly, database queries executed per second.",
    ] },
    { type: "p", text: "[Stateless web services](/learn/stateless-vs-stateful) are easy to scale by adding servers, so the **database is usually the most constrained part** of a system, and engineers watch QPS closely. In practice people say QPS when they mean RPS; this handbook does too." },

    { type: "h2", text: "What each level of QPS needs" },
    { type: "diagram", kind: "bars", log: true, caption: "QPS tiers on a log scale. Each tier is roughly 10–100× the one before, and each needs a different architecture.", values: [
      { label: "Low", value: 100, display: "1–100 QPS · one server", tone: "ok" },
      { label: "Medium", value: 1000, display: "100–1K QPS · replicas, cache", tone: "store" },
      { label: "High", value: 100000, display: "1K–100K QPS · microservices, queues", tone: "cache" },
      { label: "Very high", value: 1000000, display: "100K+ QPS · multi-region, edge", tone: "danger" },
    ] },
    { type: "h3", text: "Low: 1–100 QPS" },
    { type: "p", text: "**Typical**: startups, early products, small internal tools, local community sites. A classic **monolith** is enough; there isn't enough data or traffic to justify anything fancier. The good old MySQL + PHP stack would do." },
    { type: "ul", items: [
      "**Backend**: one simple codebase, for example Django (Python) or Express.js (Node.js).",
      "**Database**: one relational database such as PostgreSQL or MySQL.",
      "**Infrastructure**: a **single server** (an AWS EC2 instance or a DigitalOcean droplet).",
    ] },
    { type: "p", text: "Example: a local online store with a few hundred customers runs happily as one monolithic app with no scaling strategy at all." },
    { type: "h3", text: "Medium: 100–1,000 QPS" },
    { type: "p", text: "**Typical**: growing SaaS apps, popular blogs, community platforms. The monolith starts to struggle, usually on the database or on compute, so **horizontal scaling** and **decoupling** become important." },
    { type: "ul", items: [
      "**Backend**: more modular, sometimes **microservices**, so busy parts scale on their own.",
      "**Database**: **replication, caching** and sometimes **sharding**, for example MySQL read replicas plus Redis.",
      "**Infrastructure**: containers (Docker) and orchestration (Kubernetes) for horizontal scaling and resilience.",
    ] },
    { type: "p", text: "Example: a small social network with frequent posts and likes reaches this level." },
    { type: "h3", text: "High: 1,000–100,000 QPS" },
    { type: "p", text: "**Typical**: large e-commerce sites, popular SaaS products, social media. Services must be highly scalable and resilient to traffic surges, so **microservices, message queues, redundancy and distributed systems** become standard." },
    { type: "ul", items: [
      "**Backend**: full **microservices**, deployed and scaled independently, with efficient service-to-service communication.",
      "**Event-driven architecture**: **message queues** such as Kafka buffer incoming requests and decouple components.",
      "**Data**: **distributed data stores** built to scale out, such as Cassandra or MongoDB, plus streaming (Apache Kafka) for real-time processing.",
      "**In-memory caching**: heavy caching to protect databases, for example caching search results.",
      "**Infrastructure**: container orchestration and advanced load balancing, for example Kubernetes and AWS Elastic Load Balancing.",
    ] },
    { type: "p", text: "Example: Etsy or Shopify during a big sale, combining distributed databases, in-memory caches and scalable microservices." },
    { type: "h3", text: "Very high: 100,000+ QPS" },
    { type: "p", text: "**Typical**: global social networks, financial trading systems, large streaming services. At this scale small inefficiencies become serious problems, and the architecture must be robust, distributed and resilient to failure." },
    { type: "ul", items: [
      "**Globally replicated databases**: data copied across regions to keep latency low. See [geo-replication](/learn/geo-replication).",
      "**Multi-region deployments**: the application runs in several data centers or cloud regions for resilience.",
      "**Edge computing**: code runs close to users at edge locations, for example on a [CDN](/learn/cdn).",
      "**Serverless**: functions scale automatically for unpredictable load. See [serverless](/learn/serverless).",
      "**Multi-cloud**: resources from more than one cloud provider for redundancy.",
    ] },
    { type: "p", text: "Example: Netflix, with millions of people streaming at once, uses a highly distributed architecture with caching at many layers and relies heavily on CDNs for smooth playback." },

    { type: "h2", text: "Real-world load profiles" },
    { type: "p", text: "Different systems have different bottlenecks. These profiles show how the load parameters lead to technology choices." },
    { type: "table", head: ["System", "Read : write", "Throughput", "Latency needs", "Consistency"], rows: [
      ["E-commerce site", "10 : 1", "Moderate–high reads, low–moderate writes", "Low for browsing and search; moderate for orders", "Strong for inventory and orders (no overselling); eventual for the catalog"],
      ["Social media", "3 : 1", "High reads and writes", "Low for content and interactions", "Eventual: a short delay before a post or like appears is fine"],
      ["Analytics platform", "1 : 100", "Low reads, very high writes", "Moderate–high is acceptable", "Eventual: the goal is to ingest and store huge volumes"],
      ["Ticket booking", "5 : 1", "Moderate reads, low–moderate writes", "Low for browsing and booking", "Strong: never sell the same seat twice"],
      ["Chat (WhatsApp)", "2 : 1", "High reads and writes", "Low, real-time", "Mostly eventual; stronger for read receipts and deletion"],
    ] },
    { type: "h3", text: "1. E-commerce website" },
    { type: "p", text: "Access pattern: frequent reads of product information; occasional writes for orders, profile updates and catalog changes." },
    { type: "ul", items: [
      "**Caching**: Redis or Memcached for popular product data, to keep reads off the database.",
      "**Database**: one that handles both read- and write-heavy work with strong consistency for inventory and orders, such as Amazon Aurora or Google Cloud Spanner.",
      "**Read replicas** to scale reads out while the primary keeps the critical data strongly consistent.",
    ] },
    { type: "h3", text: "2. Social media platform" },
    { type: "p", text: "Access pattern: frequent reads of feeds, posts and profiles; frequent writes of posts, comments and likes." },
    { type: "ul", items: [
      "**Caching**: Redis or Memcached for feeds and hot data.",
      "**Database**: Apache Cassandra or Amazon DynamoDB for high write throughput, easy partitioning and eventual consistency.",
      "**Message queues**: RabbitMQ or Apache Kafka to decouple writes, process asynchronously and build feeds. See [Design Twitter](/learn/design-twitter).",
    ] },
    { type: "h3", text: "3. Analytics platform" },
    { type: "p", text: "Access pattern: rare reads for analysis and dashboards; constant, massive writes as events are ingested." },
    { type: "ul", items: [
      "**Database**: Apache Cassandra, Amazon DynamoDB or Apache HBase for high write throughput and partitioning.",
      "**Processing**: Apache Flink, Kafka Streams or Apache Beam for real-time [stream processing](/learn/stream-processing).",
      "**Warehousing**: Google BigQuery, Amazon Redshift or Snowflake for analysis over large structured and semi-structured data. See [OLTP vs OLAP](/learn/oltp-vs-olap).",
    ] },
    { type: "h3", text: "4. Ticket booking system" },
    { type: "p", text: "Access pattern: frequent reads of event and venue information; occasional writes for bookings and orders." },
    { type: "ul", items: [
      "**Caching**: Redis or Memcached for event and venue details.",
      "**Database**: PostgreSQL, Amazon Aurora or Google Cloud Spanner for strongly consistent seat inventory.",
      "**Transactions**: transactions and optimistic concurrency control so concurrent bookings can't take the same seat. See [optimistic vs pessimistic locking](/learn/optimistic-vs-pessimistic-locking).",
      "**Message queues**: RabbitMQ or Apache Kafka for confirmations, payments and notifications after booking.",
    ] },
    { type: "h3", text: "5. Chat application (WhatsApp)" },
    { type: "p", text: "Access pattern: frequent reads of messages and presence; frequent writes of messages, read receipts and online status." },
    { type: "ul", items: [
      "**Caching**: Redis or Memcached for profiles, contact lists and group details.",
      "**Database**: Apache Cassandra or Amazon DynamoDB for high-throughput, partitioned message storage.",
      "**Message queues**: RabbitMQ or Apache Kafka to decouple sending from delivery and process asynchronously.",
      "**WebSockets**: Socket.IO or the WebSocket API for real-time two-way communication.",
      "**Load balancing**: HAProxy or Amazon ELB to spread WebSocket connections, usually the bottleneck in chat apps.",
    ] },
  ],
  uses: [
    { name: "Capacity planning", text: "Translating a growth forecast (DAU next year) into servers, database size and cost. See [capacity planning](/learn/capacity-planning)." },
    { name: "Choosing an architecture", text: "The QPS tier tells you whether a single server is fine or you need replicas, queues and multiple regions." },
    { name: "Interviews", text: "Step 3 of the [interview framework](/learn/system-design-interview): estimate QPS, read/write ratio and storage to find the bottleneck." },
  ],
  interview: [
    "Turn DAU into reads/s and writes/s by dividing daily actions by 86,400, then apply a peak factor.",
    "State the read/write ratio and let it decide the design: cache and replicas for read-heavy, partitioning and fast writes for write-heavy.",
    "Don't overbuild: name the QPS tier and explain why your architecture matches it.",
    "For connection-heavy systems (chat, live updates), estimate concurrent connections, not just QPS.",
  ],
  related: ["back-of-the-envelope-estimation", "latency-vs-throughput", "non-functional-requirements", "scalability", "capacity-planning", "core-design-challenges"],
  practice: ["chat-system", "ticket-booking", "news-feed", "realtime-analytics"],
};
