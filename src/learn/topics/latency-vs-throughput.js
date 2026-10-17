export default {
  blocks: [
    { type: "p", text: "**Latency** is how long one operation takes, measured in time (milliseconds). **Throughput** is how many operations a system completes per unit of time (requests per second, MB per second). They are related but distinct: a highway's latency is the drive time, its throughput is cars per hour. You can widen the highway to carry more cars without making any single trip faster." },

    { type: "h2", text: "Measure latency with percentiles, not averages" },
    { type: "p", text: "Latency is never one number. Most requests are fast; a few are slow because of garbage-collection pauses, cache misses, a slow disk, or a retry. An **average** hides those slow requests. Use **percentiles** instead:" },
    { type: "ul", items: [
      "**p50 (median)**: half of requests are faster than this. The typical experience.",
      "**p95 / p99**: 95% or 99% of requests are faster. The experience of your unluckiest users, often the most active ones.",
      "**p99.9 and max**: the long tail, where timeouts and retries live.",
    ] },
    { type: "table", head: ["Latency", "p50", "p99", "What it means"], rows: [
      ["Healthy API", "40 ms", "120 ms", "Tight distribution; tail close to median"],
      ["Same average, bad tail", "40 ms", "2,000 ms", "1 in 100 requests is painfully slow: likely lock contention, GC or a slow dependency"],
    ] },

    { type: "h2", text: "Why tail latency matters more as systems grow" },
    { type: "p", text: "One page often fans out to many backend calls in parallel, and it is only as fast as the **slowest** of them. If each backend has a 1% chance of being slow, a page that calls 100 backends hits at least one slow call about **63% of the time** (1 − 0.99^100). At scale, every user sees your p99." },
    { type: "diagram", kind: "flow", caption: "A fan-out request waits for its slowest dependency, so backend tail latency becomes the user's typical latency.", nodes: [
      { id: "u", label: "User request", col: 0, row: 1, shape: "pill" },
      { id: "agg", label: "Aggregator", sub: "waits for all", col: 1, row: 1, tone: "accent" },
      { id: "b1", label: "Profile", sub: "12 ms", col: 2, row: 0 },
      { id: "b2", label: "Feed", sub: "18 ms", col: 2, row: 1 },
      { id: "b3", label: "Ads", sub: "p99 hit: 900 ms", col: 2, row: 2, tone: "danger" },
    ], edges: [
      { from: "u", to: "agg" }, { from: "agg", to: "b1" }, { from: "agg", to: "b2" }, { from: "agg", to: "b3", tone: "danger" },
    ] },
    { type: "p", text: "Tactics that cut tail latency: timeouts with a fallback (show the page without ads), **hedged requests** (send a second copy to another replica if the first hasn't answered by the p95), avoiding head-of-line blocking, and keeping garbage-collection pauses short." },

    { type: "h2", text: "Little's Law ties them together" },
    { type: "p", text: "For any stable system, **concurrency = throughput × latency** (L = λW). This simple law is very useful for sizing:" },
    { type: "ul", items: [
      "A service handling **2,000 requests/s** with **50 ms** latency has on average 2,000 × 0.05 = **100 requests in flight**. Size thread pools and connection pools around that.",
      "If latency degrades to 500 ms at the same throughput, in-flight requests jump to 1,000. That is how a slow database exhausts connection pools and turns a slowdown into an outage.",
    ] },

    { type: "h2", text: "The throughput-latency trade-off" },
    { type: "p", text: "Latency stays flat while a system is lightly loaded, then rises sharply as utilization approaches 100%, because requests start queuing. Running a server at 95% CPU maximizes throughput per dollar but makes latency unpredictable. Most latency-sensitive services target 50–70% utilization at peak to leave headroom." },
    { type: "p", text: "Many techniques trade one for the other:" },
    { type: "table", head: ["Technique", "Throughput", "Latency"], rows: [
      ["Batching (writes, network calls)", "Up: fixed costs amortised", "Up: items wait for the batch to fill"],
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
    { type: "p", text: "The ratios matter more than the exact values: memory is about 1,000× faster than SSD random reads, and a cross-region round trip costs as much as hundreds of in-region calls. More in [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation)." },
  ],
  uses: [
    { name: "Amazon", text: "Measures page latency at the 99.9th percentile because its most valuable customers, with long histories and big carts, tend to have the slowest requests." },
    { name: "Google search", text: "Uses hedged and tied requests across replicas to keep tail latency low in huge fan-out queries." },
    { name: "Kafka", text: "Trades a little latency for big throughput gains by batching messages per partition and compressing batches." },
    { name: "SLOs at most companies", text: "Latency objectives are written as percentiles, for example \"p99 under 300 ms\". See [availability and SLOs](/learn/availability)." },
  ],
  interview: [
    "State latency targets as percentiles (\"p99 under 200 ms for reads\"), not averages.",
    "Use Little's Law to size pools or estimate concurrency from QPS and latency.",
    "Point out fan-out and tail latency in feed, search or aggregation designs, and propose timeouts or hedging.",
    "When you add batching or a queue, say what it does to latency as well as throughput.",
  ],
  related: ["back-of-the-envelope-estimation", "scalability", "caching", "retries-and-timeouts", "availability"],
  practice: ["news-feed", "autocomplete", "realtime-analytics"],
};
