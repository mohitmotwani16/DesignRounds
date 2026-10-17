export default {
  blocks: [
    { type: "p", text: "**Capacity planning** makes sure a system has enough resources (servers, database throughput, network, storage, third-party quotas) to meet demand with acceptable performance, at a reasonable cost, and before the demand arrives. It combines **forecasting** how load will grow, **measuring** how much load each component can actually handle through **load testing**, and keeping **headroom** for spikes and failures." },
    {"type":"diagram","kind":"flow","caption":"Capacity planning is a loop: forecast demand, measure what one unit of capacity handles, find the bottleneck, provision with headroom, then watch real traffic and re-forecast.","nodes":[{"id":"forecast","label":"Forecast demand","sub":"growth, events","col":0,"row":0},{"id":"test","label":"Load test","sub":"per-node limit","col":1,"row":0},{"id":"neck","label":"Find the bottleneck","sub":"CPU, DB, network","col":2,"row":0,"tone":"danger"},{"id":"provision","label":"Provision","sub":"with headroom","col":2,"row":1,"tone":"accent"},{"id":"monitor","label":"Monitor","sub":"utilisation, SLOs","col":0,"row":1,"tone":"ok"}],"edges":[{"from":"forecast","to":"test"},{"from":"test","to":"neck"},{"from":"neck","to":"provision"},{"from":"provision","to":"monitor","label":"real traffic"},{"from":"monitor","to":"forecast","label":"re-forecast","dashed":true}]},

    { type: "h2", text: "The capacity planning loop" },
    { type: "ol", items: [
      "**Measure current demand** in the units that drive cost: requests per second per endpoint, messages per second, storage growth per day, concurrent connections.",
      "**Forecast** growth from trends and known events: organic growth, launches, marketing campaigns, seasonal peaks such as festival sales.",
      "**Find each component's limit** with load tests, and identify the bottleneck that saturates first.",
      "**Plan headroom**: target utilisation that leaves room for spikes and for losing a zone.",
      "**Provision and verify**, then repeat on a schedule, because both demand and the system change.",
    ] },

    { type: "h2", text: "Headroom and utilisation targets" },
    { type: "p", text: "Running at 100% utilisation means no room for spikes, and latency rises sharply well before that because queues grow as utilisation approaches its limit. Typical targets are 50-70% at expected peak for latency-sensitive services. Also plan for **N+1** or **N+2** redundancy: if traffic is spread across three zones and one fails, the other two must absorb its share." },
    { type: "table", head: ["Scenario", "Rule of thumb"], rows: [
      ["Normal peak", "Stay below the utilisation where latency starts climbing (often 60-70% CPU)"],
      ["Zone failure", "With 3 zones, each zone's normal peak share must fit in the remaining 2 (run at ≤ 66% of zone capacity)"],
      ["Known event (sale, launch)", "Forecast the multiple over normal peak and pre-scale; don't rely on autoscaling reacting in time"],
      ["Storage", "Alert well before full; plan expansion time (resharding a database can take weeks)"],
    ] },

    { type: "h2", text: "Load testing" },
    { type: "table", head: ["Test", "Purpose"], rows: [
      ["Load test", "Run expected peak traffic and confirm latency and errors meet targets"],
      ["Stress test", "Increase load until something breaks, to find the true limit and how it fails"],
      ["Soak test", "Hold a high load for hours to find leaks, slow degradation and full disks"],
      ["Spike test", "Jump traffic suddenly, to test autoscaling, caches and connection pools"],
    ] },
    { type: "ul", items: [
      "**Model real traffic:** the same mix of endpoints, payload sizes, cache hit rates and user behaviour as production. A test that only hits a cached endpoint proves nothing.",
      "**Test in a production-like environment,** or carefully in production with synthetic traffic, since staging rarely has the same data size or dependencies.",
      "**Watch the whole path:** database connections, thread pools, queues and downstream services often saturate before CPU does. See [connection pooling](/learn/connection-pooling).",
      "**Measure latency percentiles,** not averages. See [latency vs throughput](/learn/latency-vs-throughput).",
    ] },

    { type: "h2", text: "Finding the bottleneck" },
    { type: "p", text: "Every system has one resource that saturates first, and adding capacity anywhere else does nothing. Use the USE method (utilisation, saturation, errors) per resource and look for the first one to hit its limit: CPU, memory, disk I/O, network, database connections, lock contention, a single-threaded component, or a third-party rate limit. Fix or scale that one, then test again, because the bottleneck moves." },
    { type: "callout", tone: "tip", text: "Back-of-the-envelope maths gets you a first estimate before any test. See [capacity estimation](/learn/back-of-the-envelope-estimation)." },

    { type: "h2", text: "Planning for spiky and unpredictable demand" },
    { type: "ul", items: [
      "**Autoscaling** handles gradual changes but lags by minutes; pre-warm before known events. See [autoscaling](/learn/autoscaling).",
      "**Queues** absorb bursts for work that can be asynchronous. See [message queues](/learn/message-queues).",
      "**Load shedding and rate limits** protect the system when demand exceeds any plan. See [load shedding](/learn/load-shedding).",
      "**Quotas and limits** with cloud providers and third parties must be raised ahead of time.",
    ] },
  ],
  uses: [
    { name: "E-commerce sales events", text: "Forecast a 10x peak, load-test the checkout path, pre-scale and raise payment-provider limits weeks ahead." },
    { name: "Database growth", text: "Track storage and write growth to schedule resharding or larger instances before limits are hit." },
    { name: "Streaming platforms", text: "Plan CDN and origin capacity for live events with predictable, huge spikes." },
  ],
  interview: [
    "Measure demand in cost-driving units and forecast with known events.",
    "Keep headroom for spikes and a zone failure.",
    "Load test with realistic traffic and find the first bottleneck.",
    "Pre-scale for known peaks instead of relying on autoscaling.",
  ],
  related: ["back-of-the-envelope-estimation", "autoscaling", "latency-vs-throughput", "load-shedding", "observability"],
  practice: ["ticket-booking", "metrics-platform", "multi-region"],
  reading: [
    { title: "SRE book: Software Engineering in SRE (capacity planning)", publisher: "Google", url: "https://sre.google/sre-book/software-engineering-in-sre/" },
    { title: "The USE Method", publisher: "Brendan Gregg", url: "https://www.brendangregg.com/usemethod.html" },
  ],
};
