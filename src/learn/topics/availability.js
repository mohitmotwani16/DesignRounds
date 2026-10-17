export default {
  blocks: [
    { type: "p", text: "**Availability** is the fraction of time a system does its job for users: answering requests correctly and quickly enough. It is usually written as a percentage of \"nines\". Teams make it concrete with **SLIs** (what they measure), **SLOs** (the targets they set) and **SLAs** (what they promise customers)." },

    { type: "h2", text: "The nines" },
    { type: "table", head: ["Availability", "Downtime per year", "Downtime per month", "Typical for"], rows: [
      ["99% (two nines)", "3.65 days", "7.3 hours", "Internal tools, batch systems"],
      ["99.9% (three nines)", "8.8 hours", "43.8 minutes", "Most SaaS products"],
      ["99.95%", "4.4 hours", "21.9 minutes", "Many cloud services' SLAs"],
      ["99.99% (four nines)", "52.6 minutes", "4.4 minutes", "Payments, core infrastructure"],
      ["99.999% (five nines)", "5.3 minutes", "26 seconds", "Telecom, the most critical systems"],
    ] },
    { type: "p", text: "Each extra nine costs roughly an order of magnitude more engineering. Five nines leaves no time for a human to even notice a problem, so it requires fully automated failover." },

    { type: "h2", text: "SLI, SLO, SLA and error budgets" },
    { type: "ul", items: [
      "**SLI (service level indicator)**: a measured ratio of good events to total events, for example \"successful requests that completed within 300 ms ÷ all requests\".",
      "**SLO (service level objective)**: the internal target for an SLI over a window, for example \"99.9% of requests are good over 30 days\".",
      "**SLA (service level agreement)**: a contractual promise, with penalties such as service credits. SLAs are set looser than SLOs so the team has a safety margin.",
      "**Error budget**: 100% − SLO. At 99.9% you may \"spend\" 0.1% of requests on failures each month. While budget remains, ship features; when it runs out, prioritise reliability. This turns availability into a shared, measurable trade-off instead of an argument.",
    ] },

    { type: "h2", text: "How availability composes" },
    { type: "p", text: "Components **in series** (each request needs all of them) multiply availabilities, so the total is lower than the weakest part. Components **in parallel** (redundant copies, any one is enough) multiply failure probabilities, so the total is far higher." },
    { type: "diagram", kind: "flow", caption: "Three 99.9% components in series give about 99.7%. Two 99.9% replicas in parallel give about 99.9999%, if their failures are independent.", nodes: [
      { id: "a", label: "LB", sub: "99.9%", col: 0, row: 0 },
      { id: "b", label: "App", sub: "99.9%", col: 1, row: 0 },
      { id: "c", label: "Database", sub: "99.9%", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "r", label: "= 99.7% total", col: 3, row: 0, tone: "danger", shape: "pill" },
      { id: "p0", label: "Request", col: 0, row: 1.5, shape: "pill" },
      { id: "p1", label: "Replica A", sub: "99.9%", col: 1, row: 1 },
      { id: "p2", label: "Replica B", sub: "99.9%", col: 1, row: 2 },
      { id: "pr", label: "= 99.9999%", col: 2, row: 1.5, tone: "ok", shape: "pill" },
    ], edges: [
      { from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "r", dashed: true },
      { from: "p0", to: "p1" }, { from: "p0", to: "p2" }, { from: "p1", to: "pr", dashed: true }, { from: "p2", to: "pr", dashed: true },
    ], zones: [{ label: "In series", from: [0, 0], to: [3, 0], tone: "danger" }, { label: "In parallel", from: [0, 1], to: [2, 2] }] },
    { type: "callout", tone: "warning", text: "Parallel redundancy only helps when failures are **independent**. Two replicas in the same rack, deployed with the same bad config, or depending on the same DNS provider, fail together. Most big outages are correlated failures: a bad deploy, an expired certificate, a shared dependency." },

    { type: "h2", text: "Techniques that raise availability" },
    { type: "ul", items: [
      "**Redundancy with automatic failover**: multiple instances behind [health-checked load balancers](/learn/health-checks-failover), database replicas that can be promoted.",
      "**Isolation across failure domains**: spread instances across availability zones, and for the highest targets across regions. See [disaster recovery](/learn/disaster-recovery).",
      "**Removing hard dependencies**: [cache](/learn/caching) data so reads survive a database blip, use [queues](/learn/message-queues) so writes survive a slow consumer, and [degrade gracefully](/learn/load-shedding) when an optional dependency fails.",
      "**Resilience patterns**: [timeouts and retries](/learn/retries-and-timeouts) with backoff, [circuit breakers](/learn/circuit-breaker), and [rate limiting](/learn/rate-limiting) to stop overload cascading.",
      "**Safe change**: most incidents start with a change, so [canary deployments](/learn/deployment-strategies), feature flags and fast rollback buy more availability than extra hardware.",
      "**Fast detection and recovery**: availability is roughly MTBF / (MTBF + MTTR). Halving time to recover (MTTR) helps as much as halving failure frequency, and is usually cheaper.",
    ] },

    { type: "h2", text: "Availability vs consistency" },
    { type: "p", text: "During a network partition, a replicated system must choose between staying available (answering, possibly with stale data) and staying consistent (refusing until it can be sure). That choice is the [CAP theorem](/learn/cap-theorem), and it is a product decision as much as a technical one: a shopping cart should accept writes, a bank transfer should not." },
  ],
  uses: [
    { name: "Google SRE", text: "Popularised SLOs and error budgets: when a service burns its budget, launches pause until reliability work restores it." },
    { name: "AWS and cloud SLAs", text: "Publish per-service SLAs (for example 99.99% for multi-AZ services) and refund credits when they're missed." },
    { name: "Payment networks", text: "Run active-active across data centres and regions because even minutes of downtime mean lost transactions." },
    { name: "Status pages", text: "Services like GitHub and Stripe report availability per component, reflecting SLIs measured from the user's side." },
  ],
  interview: [
    "Ask for an availability target early and translate it into downtime: \"99.99% is about 4 minutes a month, so failover must be automatic\".",
    "Show series vs parallel reasoning: every hard dependency lowers availability, redundancy raises it.",
    "Name failure domains (instance, zone, region) and which ones your design survives.",
    "Mention that the cheapest availability wins are safe deploys and fast recovery, not just more replicas.",
  ],
  related: ["health-checks-failover", "disaster-recovery", "cap-theorem", "replication", "circuit-breaker", "observability"],
  practice: ["payment-platform", "multi-region", "notification-service"],
};
