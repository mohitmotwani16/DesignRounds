// Non-functional requirements: availability, scalability, latency and consistency, the
// strategies behind each, and how the standard building blocks affect every one of them.
export default {
  blocks: [
    { type: "p", text: "Functional requirements say **what** a system does: post a photo, send a message, book a seat. Non-functional requirements say **how well** it must do it: how often it may be down, how much traffic it must absorb, how fast it must answer, and how accurate its data must be. In an interview they are what turns a toy design into a real one, because each requirement forces specific components into the architecture." },
    { type: "p", text: "**Scale is what drives complexity.** A chat app for 100 users works fine with plain request–response calls to one database. The same app for 100 million users needs caching layers, message queues and distributed databases. Twitter's timeline shows the same thing: a simple database query works for thousands of users, but millions need precomputed feeds cached in Redis." },
    { type: "p", text: "Four come up in nearly every design. Others matter in specific problems: **reliability** (correct results), **durability** (data is never lost), **efficiency** (no wasted work), **security and privacy**, and cost." },

    { type: "h2", text: "Availability: staying online" },
    { type: "p", text: "Availability is the share of time a system is up, written as a percentage. The decimals matter enormously: **99.9%** allows about **8.77 hours** of downtime a year, while **99.99%** allows only **52.6 minutes**. Those two targets lead to completely different architectures. See [availability, SLAs and the nines](/learn/availability) for the full table." },
    { type: "ul", items: [
      "**Redundancy removes single points of failure.** Production systems run several servers spread over different data centers, and traffic moves automatically to healthy ones when one fails. Netflix runs each service across three AWS availability zones; if a whole zone goes down, people keep streaming.",
      "**Health checks enable fast recovery.** Load balancers probe their backends every few seconds, and a failed check reroutes traffic within roughly 10–30 seconds. Slack's load balancers detect failed servers and move WebSocket connections elsewhere before most users notice. See [health checks and failover](/learn/health-checks-failover).",
      "**Geographic distribution limits the blast radius.** Critical systems replicate across regions and continents. When AWS us-east-1 has an outage, globally distributed services like Route 53 keep answering from other regions, so one region's failure doesn't become a global outage. See [geo-replication](/learn/geo-replication).",
    ] },
    { type: "diagram", kind: "flow", caption: "Redundancy across availability zones: if one zone fails, the load balancer's health checks route all traffic to the others.", nodes: [
      { id: "u", label: "Users", col: 0, row: 1, shape: "pill" },
      { id: "lb", label: "Load balancer", sub: "health checks", col: 1.2, row: 1, tone: "accent" },
      { id: "a", label: "Zone A", sub: "service copies", col: 2.5, row: 0, tone: "ok" },
      { id: "b", label: "Zone B", sub: "service copies", col: 2.5, row: 1, tone: "ok" },
      { id: "c", label: "Zone C", sub: "down", col: 2.5, row: 2, tone: "danger" },
    ], edges: [{ from: "u", to: "lb" }, { from: "lb", to: "a" }, { from: "lb", to: "b" }, { from: "lb", to: "c", dashed: true, tone: "danger", label: "removed" }] },

    { type: "h2", text: "Scalability: handling growth" },
    { type: "p", text: "Scalability means **keeping performance steady as load grows**. In practice, scaling out with many small servers usually beats scaling up to ever-bigger machines: you can grow and shrink with demand, and one failed server is a small loss. See [scalability](/learn/scalability)." },
    { type: "ul", items: [
      "**Stateless services scale horizontally.** Each server handles requests on its own, keeping no sessions or temporary data in memory, so servers can be added or removed freely. Uber's ride-matching runs hundreds of identical stateless containers that autoscaling adds at peak hours. See [stateless vs stateful](/learn/stateless-vs-stateful).",
      "**Caching takes pressure off the database.** Hot data lives in memory instead of on disk. Reddit keeps post rankings and user profiles in Redis so millions of requests don't overwhelm PostgreSQL; hit rates above 90% are normal for read-heavy workloads. See [caching](/learn/caching).",
      "**Async processing smooths spikes.** Queues separate accepting a request from doing the work. When you upload a video to YouTube the upload completes at once and transcoding happens in the background, so encoding delays never slow the upload during a surge. See [message queues](/learn/message-queues).",
    ] },

    { type: "h2", text: "Latency: speed matters" },
    { type: "p", text: "Latency is **response time**: the delay between sending a request and getting the answer. People expect web pages in under a second and API calls in milliseconds, and higher latency measurably hurts engagement and revenue. See [latency vs throughput](/learn/latency-vs-throughput)." },
    { type: "ul", items: [
      "**Get close to users.** Light travels at a fixed speed, so distance adds unavoidable delay. [CDNs](/learn/cdn) serve static files from locations near users; Cloudflare serves images and CSS from 270+ cities, cutting typical latency for distant users from around 200 ms to 20 ms.",
      "**Fix slow queries.** Slow database queries dominate many response times. Instagram brought feed queries from about 1 second to 50 ms by adding indexes and removing joins. Profile queries to find where the time goes. See [database optimization](/learn/database-optimization).",
      "**Compute at the edge.** Instead of sending every request to a central region, edge nodes run code near users. Fastly runs customer code at its edge locations so many API requests never go to the origin, cutting latency by up to 10× for global apps.",
    ] },

    { type: "h2", text: "Consistency: data accuracy" },
    { type: "p", text: "Consistency means **every replica shows the same data**. In a distributed system this is hard, because network partitions and failed servers can leave nodes temporarily disagreeing. See [consistency models](/learn/consistency-models) and the [CAP theorem](/learn/cap-theorem)." },
    { type: "ul", items: [
      "**Strong consistency costs availability.** A bank balance must be identical everywhere: you can't withdraw the same $100 twice. Banks use synchronous replication, where every replica confirms a write before the transaction completes. Accuracy is guaranteed, but writes stall when a replica is slow or down.",
      "**Eventual consistency enables scale.** Social networks accept brief disagreement for speed. When you post on Facebook, people in different regions may see it at slightly different moments while the update propagates; within seconds everyone converges.",
      "**Mix models by operation.** Most systems use both. Amazon's shopping cart is eventually consistent (an item might briefly vanish and reappear), but charging your card is strongly consistent. Each operation gets the level it needs.",
    ] },

    { type: "h2", text: "Patterns for each requirement" },
    { type: "table", head: ["Requirement", "Core strategy", "Key technologies", "Production example"], rows: [
      ["Availability", "Remove single points of failure", "Load balancers, multi-region deployment, health checks", "Netflix: three availability zones per service"],
      ["Scalability", "Scale out with stateless services", "Autoscaling, caching, message queues", "Uber: container orchestration for demand spikes"],
      ["Latency", "Fewer network hops, less processing", "CDNs, database indexes, edge computing", "Instagram: 50 ms feed queries"],
      ["Consistency", "Pick the right model per operation", "Synchronous replication, consensus algorithms", "Amazon: strong for payments, eventual for recommendations"],
    ] },
    { type: "p", text: "**Trade-offs shape the architecture.** These requirements pull against each other. Strong consistency lowers availability during network partitions. Lower latency usually means more complexity and cost. Good systems rank the requirements by what the business needs rather than trying to maximize all of them." },

    { type: "h2", text: "How each building block affects the requirements" },
    { type: "p", text: "Every standard component helps some requirements and can hurt others. Knowing both sides is what lets you justify a component in an interview." },
    { type: "table", head: ["Component", "Availability", "Scalability", "Latency", "Consistency"], rows: [
      ["Load balancing", "Helps: no single server is a point of failure", "Helps: more servers share the requests", "Helps: no server is overwhelmed", "Neutral"],
      ["Caching", "Helps indirectly: less load, fewer overloads", "Helps: fewer database reads", "Helps a lot: memory is fast", "Hurts: cached data can be stale"],
      ["Partitioning", "Helps: one failed shard doesn't take down the rest", "Helps: data and load spread over nodes", "Helps: queries go to one shard", "Harder: cross-shard updates need coordination"],
      ["Replication", "Helps: copies survive failures", "Helps: reads spread over replicas", "Helps: replicas near users", "Harder: replicas can lag"],
      ["Message queue", "Helps: messages persist until processed", "Helps: work is offloaded and smoothed", "Helps the request path; the work itself finishes later", "Eventual: consumers apply changes later"],
      ["Batch processing", "Neutral", "Helps: large volumes processed efficiently", "Hurts: results wait for the next batch", "Neutral"],
    ] },
    { type: "h3", text: "Load balancing" },
    { type: "p", text: "A [load balancer](/learn/load-balancing) spreads traffic over many servers. **Availability**: if one server dies, traffic goes to the others, so no single server is a point of failure. **Scalability**: more servers can serve more requests in parallel. **Latency**: because no server is swamped, each one keeps answering quickly." },
    { type: "h3", text: "Caching" },
    { type: "p", text: "A [cache](/learn/caching) keeps a copy of data in fast temporary storage so later requests are served quickly. **Availability**: it indirectly prevents overloads and crashes by cutting load. **Scalability**: the database handles fewer reads, so the system serves more users. **Latency**: memory reads are far faster than the source. **Consistency** is the cost: when the database changes but the cached copy doesn't, users get **stale data**. Managing that is the job of [cache invalidation](/learn/cache-invalidation)." },
    { type: "h3", text: "Partitioning" },
    { type: "p", text: "[Partitioning (sharding)](/learn/sharding) splits a database into smaller pieces on different nodes." },
    { type: "ul", items: [
      "**Availability**: a failure in one partition leaves the others serving; combined with replication, even the failed partition's data stays available.",
      "**Scalability**: data is divided among nodes, so the system can store and process more than a single database server (DBMS) could, and new partitions can be added as it grows.",
      "**Latency**: keeping related data in one partition lets queries go straight to it instead of scanning everything.",
      "**Throughput**: queries on different partitions run in parallel, so the system handles more operations per second.",
      "**Consistency**: harder, because data spread over nodes must be kept in sync. Protocols like [two-phase commit](/learn/two-phase-commit) make strong consistency possible, and the simplest fix is to keep data that must change together in the same partition.",
    ] },
    { type: "h3", text: "Replication" },
    { type: "p", text: "[Replication](/learn/replication) keeps several copies of the same data. **Availability**: if the primary fails, a copy takes over. **Scalability**: reads spread across copies. **Consistency**: the copies must change together, and if one is updated before the others, users can see different answers depending on which copy they read. Consistency models (strong, eventual, causal) define what readers are guaranteed." },
    { type: "h3", text: "Message queues" },
    { type: "p", text: "A [message queue](/learn/message-queues) lets sender and receiver work asynchronously: they never need to be active at the same moment. **Availability and reliability**: messages are stored until processed, so work isn't lost when a component fails. **Scalability**: tasks move off the request path and are processed in the background, so larger volumes can be handled." },
    { type: "h3", text: "Batch processing" },
    { type: "p", text: "[Batch processing](/learn/batch-vs-stream-processing) runs many jobs together instead of one at a time, often off-peak. It improves **throughput** and **scalability** for non-interactive work such as analytics or backups. The cost is **latency**: each item waits for its batch." },

    { type: "h2", text: "Stating requirements in an interview" },
    { type: "p", text: "Vague requirements (\"it should be fast and scalable\") don't constrain anything. Turn each one into a target the design can be checked against:" },
    { type: "table", head: ["Vague", "Specific"], rows: [
      ["Highly available", "99.99% for reads, 99.9% for writes; survive the loss of one availability zone"],
      ["Fast", "Feed loads in under 500 ms at p99; posting returns in under 200 ms"],
      ["Scalable", "10M daily users, 2K writes/s and 200K reads/s at peak, growing 2× a year"],
      ["Consistent", "Balances strongly consistent; likes and view counts may lag a few seconds"],
      ["Durable", "No acknowledged write is ever lost; recover to any point in the last 7 days"],
    ] },
  ],
  uses: [
    { name: "Streaming video", text: "Availability and latency dominate: multi-zone redundancy plus CDNs; view counts can be eventually consistent." },
    { name: "Banking and payments", text: "Consistency and durability dominate: synchronous replication and transactions, accepting higher latency." },
    { name: "Social media", text: "Scalability and latency dominate: caches, queues and eventual consistency for feeds and counters." },
    { name: "Ride hailing", text: "Low latency for matching and location, high availability for requests, strong consistency only for payments." },
  ],
  interview: [
    "List the non-functional requirements right after the functional ones, with numbers where you can.",
    "Rank them for the problem at hand; say which one you'll trade away and why.",
    "When you add a component, name the requirement it serves and the one it puts at risk (a cache helps latency, risks staleness).",
    "Mix consistency levels by operation rather than choosing one for the whole system.",
  ],
  related: ["core-design-challenges", "availability", "scalability", "latency-vs-throughput", "consistency-models", "cap-theorem", "system-design-interview"],
  practice: ["url-shortener", "payment-platform", "video-streaming"],
};
