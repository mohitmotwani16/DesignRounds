export default {
  blocks: [
    { type: "p", text: "**Latency** is how long one operation takes, measured in time (milliseconds or microseconds). **Throughput** is how many operations a system completes per unit of time (requests per second, MB per second). They are related but distinct: a highway's latency is the drive time, its throughput is cars per hour. You can widen the highway to carry more cars without making any single trip faster." },
    { type: "p", text: "Both are core non-functional requirements. High latency makes a system feel slow and hurts user satisfaction, and in real-time products such as video streaming, online games or high-frequency trading even a few extra milliseconds can be damaging. Throughput decides how much load the system can carry as demand grows." },

    { type: "h2", text: "What latency is made of" },
    { type: "p", text: "In the simplest terms latency is a **delay**: the time from when a request is sent until the response arrives. Seen from the client, that total (also called **response time**) has two parts:" },
    { type: "ul", items: [
      "**Network latency**: the time for the request to travel from the client to the server and for the response to travel back, the time spent \"on the wire\". It depends on physical distance, the number of hops (routers, proxies) the data passes through, and the speed of each link.",
      "**Server-side latency**: the time the server takes to understand the request, do the work (calculations, database reads, calls to other services) and build the response. It depends on hardware, how efficient the software is, and how complex the request is.",
    ] },
    { type: "diagram", kind: "segments", caption: "Response time as the client sees it: network time out and back plus the server's processing time. Optimizing one part can't fix the other.", lanes: [
      { label: "Nearby user", parts: [{ label: "network", sub: "10 ms", size: 10, tone: "store" }, { label: "server processing", sub: "60 ms", size: 60, tone: "cache" }, { label: "network", sub: "10 ms", size: 10, tone: "store" }] },
      { label: "Far-away user", parts: [{ label: "network", sub: "90 ms", size: 90, tone: "store" }, { label: "server", sub: "60 ms", size: 60, tone: "cache" }, { label: "network", sub: "90 ms", size: 90, tone: "store" }] },
    ], total: 240 },
    { type: "p", text: "Managing latency means working on both: getting closer to users and fewer hops for the network part, faster code, queries and caches for the server part." },

    { type: "h2", text: "Measure latency with percentiles, not averages" },
    { type: "p", text: "Latency is never one number. Most requests are fast; a few are slow because of garbage-collection pauses, cache misses, a slow disk or a retry. An **average** hides those slow requests, so latency is measured in **percentiles**:" },
    { type: "ul", items: [
      "**p50 (median)**: the slowest of the fastest 50% of requests. Half of requests finish within this time; it's the typical experience.",
      "**p95 / p99**: 95% or 99% of requests finish within this time. This is what your unluckiest users see, and they are often your most active ones.",
      "**p99.9 and max**: the long tail, where timeouts and retries live.",
    ] },
    { type: "p", text: "By definition p99 is always greater than or equal to p50. A real example from a database service (Firestore on Google Cloud) at one moment:" },
    { type: "diagram", kind: "bars", caption: "Request latency percentiles for one database at one moment: the median is 28 ms, but 1% of requests take longer than 45 ms.", unit: " ms", values: [
      { label: "p50", value: 28, tone: "ok" },
      { label: "p95", value: 44, tone: "cache" },
      { label: "p99", value: 45, tone: "danger" },
    ] },
    { type: "table", head: ["Service", "p50", "p99", "What it means"], rows: [
      ["Healthy API", "40 ms", "120 ms", "Tight distribution; tail close to median"],
      ["Same median, bad tail", "40 ms", "2,000 ms", "1 in 100 requests is painfully slow: likely lock contention, GC or a slow dependency"],
    ] },

    { type: "h2", text: "Tail latency" },
    { type: "p", text: "**Tail latency** is the latency of the slowest requests: the 99th, 99.9th or even 99.99th percentile. Sort the latencies of millions of operations from fastest to slowest and the tail is the long stretch of slow ones at the end." },
    { type: "p", text: "It matters because it matches the worst user experiences. An average describes general performance but hides the occasional slowdowns people actually notice, so engineers work to cut the tail, not just the average. That is often hard and expensive: it can mean tuning server software, upgrading hardware, changing the architecture, improving load balancing, or adding failover for peaks and outages. Weigh the effort against the benefit." },
    { type: "p", text: "Tail latency matters more as systems grow. One page often fans out to many backend calls in parallel, and it is only as fast as the **slowest** of them. If each backend has a 1% chance of being slow, a page that calls 100 backends hits at least one slow call about **63% of the time** (1 − 0.99^100). At scale, every user sees your p99." },
    { type: "diagram", kind: "flow", caption: "A fan-out request waits for its slowest dependency, so backend tail latency becomes the user's typical latency.", nodes: [
      { id: "u", label: "User request", col: 0, row: 1, shape: "pill" },
      { id: "agg", label: "Aggregator", sub: "waits for all", col: 1.2, row: 1, tone: "accent" },
      { id: "b1", label: "Profile", sub: "12 ms", col: 2.4, row: 0 },
      { id: "b2", label: "Feed", sub: "18 ms", col: 2.4, row: 1 },
      { id: "b3", label: "Ads", sub: "p99 hit: 900 ms", col: 2.4, row: 2, tone: "danger" },
    ], edges: [{ from: "u", to: "agg" }, { from: "agg", to: "b1" }, { from: "agg", to: "b2" }, { from: "agg", to: "b3", tone: "danger" }] },
    { type: "p", text: "Tactics that cut tail latency: timeouts with a fallback (show the page without ads), **hedged requests** (send a second copy to another replica if the first hasn't answered by the p95), avoiding head-of-line blocking, and keeping garbage-collection pauses short. See [retries and timeouts](/learn/retries-and-timeouts)." },

    { type: "h2", text: "Reducing latency" },
    { type: "ol", items: [
      "**Use a CDN.** A [content delivery network](/learn/cdn) keeps copies of content in many locations worldwide, so data travels a shorter distance.",
      "**Load balance.** Spreading traffic over many servers prevents congestion on any one of them, keeping response times low. See [load balancing](/learn/load-balancing).",
      "**Cache.** Keeping frequently used data in memory, close to where it's needed, cuts the time to fetch it. See [caching](/learn/caching).",
      "**Pick the right data center location.** Put servers near most of your users: for users in the US, a data center in San Francisco beats one in Singapore.",
      "**Optimize the server path.** Add indexes, remove unnecessary calls, and parallelize independent work. See [database optimization](/learn/database-optimization).",
    ] },

    { type: "h2", text: "Throughput and how to raise it" },
    { type: "p", text: "**Throughput** is the amount of data or number of transactions a system processes in a given period. It directly measures performance and efficiency: higher throughput means the system handles more load, and it decides how well the system copes as demand rises. There are two ways to raise it:" },
    { type: "ul", items: [
      "**Reduce the time per request** (lower latency), so each worker finishes more requests per second.",
      "**Process more requests at once** (more concurrency), by adding parallel capacity.",
    ] },
    { type: "p", text: "Concurrency is usually where the big gains are. Three standard moves:" },
    { type: "h3", text: "Scale reads with replication" },
    { type: "p", text: "Copy the data onto several servers so many reads can run at the same time. The primary stays the source of truth and sends updates to the replicas; read requests are spread across the replicas, so the system keeps answering quickly under heavy read load. See [replication](/learn/replication)." },
    { type: "diagram", kind: "flow", caption: "Read requests spread over replicas; the primary database pushes updates to all of them.", nodes: [
      { id: "r", label: "Read requests", col: 0, row: 1 },
      { id: "r1", label: "Replica 1", col: 1.4, row: 0, shape: "db", tone: "store" },
      { id: "r2", label: "Replica 2", col: 1.4, row: 1, shape: "db", tone: "store" },
      { id: "r3", label: "Replica M", col: 1.4, row: 2, shape: "db", tone: "store" },
      { id: "m", label: "Primary database", sub: "source of truth", col: 2.8, row: 1, shape: "db", tone: "cache" },
    ], edges: [{ from: "r", to: "r1" }, { from: "r", to: "r2" }, { from: "r", to: "r3" }, { from: "m", to: "r1", label: "updates" }, { from: "m", to: "r2" }, { from: "m", to: "r3" }] },
    { type: "h3", text: "Scale writes with partitioning (sharding)" },
    { type: "p", text: "Split the database into smaller parts, each on its own server. Write requests are spread across the partitions, so no single server takes the whole write load and total write throughput grows with the number of partitions. See [sharding](/learn/sharding)." },
    { type: "diagram", kind: "flow", caption: "Writes are routed by key to different partitions, each handling only its share.", nodes: [
      { id: "w", label: "Write requests", col: 0, row: 1 },
      { id: "p", label: "Partition router", sub: "by key", col: 1.2, row: 1, tone: "accent" },
      { id: "s1", label: "Partition 1", col: 2.5, row: 0, shape: "db", tone: "store" },
      { id: "s2", label: "Partition 2", col: 2.5, row: 1, shape: "db", tone: "store" },
      { id: "s3", label: "Partition N", col: 2.5, row: 2, shape: "db", tone: "store" },
    ], edges: [{ from: "w", to: "p" }, { from: "p", to: "s1" }, { from: "p", to: "s2" }, { from: "p", to: "s3" }] },
    { type: "h3", text: "Scale data flow with queues and consumers" },
    { type: "p", text: "A [message queue](/learn/message-queues) sits between producers and the processes that do the work. Requests are handled asynchronously, and **consumers** can be scaled out to add processing capacity. This works best when requests can be processed independently of each other." },
    { type: "diagram", kind: "flow", caption: "Many producers write to a queue; adding consumers raises how many messages are processed per second.", nodes: [
      { id: "p1", label: "Producer", col: 0, row: 0, tone: "cache" },
      { id: "p2", label: "Producer", col: 0, row: 1, tone: "cache" },
      { id: "p3", label: "Producer", col: 0, row: 2, tone: "cache" },
      { id: "q", label: "Message queue", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "c1", label: "Consumer", col: 2.6, row: 0, tone: "store" },
      { id: "c2", label: "Consumer", col: 2.6, row: 1, tone: "store" },
      { id: "c3", label: "Consumer", col: 2.6, row: 2, tone: "store" },
    ], edges: [{ from: "p1", to: "q" }, { from: "p2", to: "q" }, { from: "p3", to: "q" }, { from: "q", to: "c1" }, { from: "q", to: "c2" }, { from: "q", to: "c3" }] },

    { type: "h2", text: "Little's Law ties them together" },
    { type: "p", text: "For any stable system, **concurrency = throughput × latency** (L = λW). This simple law is very useful for sizing:" },
    { type: "ul", items: [
      "A service handling **2,000 requests/s** with **50 ms** latency has on average 2,000 × 0.05 = **100 requests in flight**. Size thread pools and connection pools around that.",
      "If latency degrades to 500 ms at the same throughput, in-flight requests jump to 1,000. That is how a slow database exhausts connection pools and turns a slowdown into an outage.",
    ] },

    { type: "h2", text: "The throughput–latency trade-off" },
    { type: "p", text: "Latency stays flat while a system is lightly loaded, then rises sharply as utilization approaches 100%, because requests start queuing. Running a server at 95% CPU maximizes throughput per dollar but makes latency unpredictable. Most latency-sensitive services target 50–70% utilization at peak to leave headroom." },
    { type: "table", head: ["Technique", "Throughput", "Latency"], rows: [
      ["Batching (writes, network calls)", "Up: fixed costs amortized", "Up: items wait for the batch to fill"],
      ["Caching", "Up", "Down"],
      ["Async processing via a queue", "Up: absorbs bursts", "Down for the caller, up for the work itself"],
      ["Compression", "Up on slow networks", "Up slightly for CPU time"],
      ["More parallel workers", "Up, until a shared resource saturates", "Unchanged or worse under contention"],
    ] },

    { type: "h2", text: "Latency numbers worth knowing" },
    { type: "table", head: ["Operation", "Approximate time"], rows: [
      ["L1 cache reference", "1 ns"],
      ["Main memory reference", "100 ns"],
      ["Read 1 MB sequentially from memory", "~10 µs"],
      ["Random read from SSD", "~100 µs"],
      ["Round trip within a data center", "~0.5 ms"],
      ["Read 1 MB sequentially from SSD", "~1 ms"],
      ["Disk (HDD) seek", "~10 ms"],
      ["Round trip between continents", "100–200 ms"],
    ] },
    { type: "p", text: "The ratios matter more than the exact values: memory is about 1,000× faster than SSD random reads, and a cross-region round trip costs as much as hundreds of in-region calls. More in [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation) and [caching](/learn/caching)." },
  ],
  uses: [
    { name: "Amazon", text: "Measures page latency at the 99.9th percentile because its most valuable customers, with long histories and big carts, tend to have the slowest requests." },
    { name: "Google search", text: "Uses hedged and tied requests across replicas to keep tail latency low in huge fan-out queries." },
    { name: "Kafka", text: "Trades a little latency for big throughput gains by batching messages per partition and compressing batches." },
    { name: "Cloud databases", text: "Managed databases such as Cloud Spanner and Firestore report p50, p95 and p99 latency so you can see the tail, not just the average." },
  ],
  interview: [
    "State latency targets as percentiles (\"p99 under 200 ms for reads\"), not averages.",
    "Split latency into network and server time and say which part your design attacks (CDN and region choice vs caching and indexes).",
    "Raise throughput with concurrency: replicas for reads, shards for writes, more consumers behind a queue.",
    "Use Little's Law to size pools; mention fan-out and tail latency in feed or search designs.",
  ],
  related: ["non-functional-requirements", "measuring-load-qps", "back-of-the-envelope-estimation", "scalability", "caching", "cdn", "retries-and-timeouts"],
  practice: ["news-feed", "autocomplete", "realtime-analytics"],
  reading: [
    { title: "Use metrics to diagnose latency", publisher: "Google Cloud Spanner docs", url: "https://cloud.google.com/spanner/docs/latency-metrics" },
  ],
};
