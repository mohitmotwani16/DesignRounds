export default {
  blocks: [
    { type: "p", text: "**Load shedding** deliberately rejects some work when a system is overloaded, so it can keep serving the rest well. **Graceful degradation** turns off non-essential features to protect the essential ones. Both accept partial failure on purpose, because the alternative under overload is total failure: every request slows down, times out, and gets retried." },

    { type: "h2", text: "Why overload collapses systems" },
    { type: "p", text: "Past a certain load, throughput doesn't plateau; it **drops**. Queues grow, latency exceeds client timeouts, clients retry, the extra retries add more load, and the server spends its capacity on requests whose callers have already given up. This **congestion collapse** is why an overloaded service often serves fewer successful requests than a healthy one at half the traffic." },
    { type: "diagram", kind: "flow", caption: "Shedding at the door keeps accepted requests fast; without it, every request slows down and most time out.", nodes: [
      { id: "in", label: "150% of capacity", col: 0, row: 0.5, shape: "pill", tone: "danger", w: 160 },
      { id: "shed", label: "Admission control", sub: "priority + concurrency limit", col: 1.4, row: 0.5, tone: "accent", w: 200 },
      { id: "ok", label: "Served fast", sub: "checkout, login, core reads", col: 2.9, row: 0, tone: "ok", w: 190 },
      { id: "rej", label: "503 + Retry-After", sub: "prefetch, analytics, batch", col: 2.9, row: 1, tone: "danger", w: 190 },
    ], edges: [{ from: "in", to: "shed" }, { from: "shed", to: "ok" }, { from: "shed", to: "rej", dashed: true, tone: "danger" }] },

    { type: "h2", text: "Load shedding techniques" },
    { type: "ul", items: [
      "**Concurrency limits**: cap in-flight requests per instance; reject immediately when full instead of queueing. Adaptive limiters lower the cap automatically when latency rises.",
      "**Bounded queues with deadlines**: drop requests that have waited longer than the client will wait (if a request queued for 2 s and the client times out at 1 s, processing it is pure waste).",
      "**Prioritisation**: classify traffic and shed the least important first: background sync and prefetch before user-initiated reads, reads before checkout.",
      "**Per-client fairness**: shed the noisiest clients first so one tenant's spike doesn't hurt everyone. See [rate limiting](/learn/rate-limiting).",
      "**Shed early**: reject at the edge or load balancer, before spending work on parsing, auth and database calls.",
      "**Cheap rejections**: return 503 or 429 with `Retry-After` in microseconds.",
    ] },

    { type: "h2", text: "Graceful degradation" },
    { type: "p", text: "Decide in advance which features are **critical** and which can be turned off or simplified under stress:" },
    { type: "table", head: ["Normal", "Degraded mode"], rows: [
      ["Personalised recommendations", "Popular items from a cache, or the section hidden"],
      ["Real-time inventory counts", "\"In stock\" from a cached value, verified at checkout"],
      ["Full search with facets and spelling correction", "Basic keyword search"],
      ["High-resolution images and video", "Lower bitrates"],
      ["Live comment counts and typing indicators", "Updated less often or paused"],
    ] },
    { type: "p", text: "Implement degradations as **feature flags or kill switches** that operators (or automation) can flip, and pair dependencies with [circuit breakers](/learn/circuit-breaker) and fallbacks so degradation also happens automatically when a dependency fails." },

    { type: "h2", text: "Designing for overload" },
    { type: "ul", items: [
      "**Know your capacity** per instance through load testing, and alert well before it's reached.",
      "**Autoscale**, but remember scaling takes minutes; shedding handles the seconds in between. See [autoscaling](/learn/autoscaling).",
      "**Make clients cooperate**: honour Retry-After, back off with jitter, and avoid retrying user actions automatically during an outage. See [retries](/learn/retries-and-timeouts).",
      "**Protect dependencies**: shedding at your service is useless if every rejected request still triggered a database query.",
      "**Test it**: run game days where you push a service past its limits and verify it degrades instead of collapsing.",
    ] },
  ],
  uses: [
    { name: "Google", text: "Services classify request criticality and shed lower-criticality traffic first; client-side throttling stops clients sending requests that are likely to be rejected." },
    { name: "Amazon", text: "Uses admission control and degraded modes so the buy button keeps working on Prime Day even if recommendations or reviews are trimmed." },
    { name: "Netflix", text: "Prioritises playback traffic over less critical requests and has fallbacks for nearly every personalised component." },
    { name: "Ticketing and flash sales", text: "Virtual waiting rooms admit users at a controlled rate instead of letting the whole crowd hit checkout at once." },
  ],
  interview: [
    "Say what happens when traffic exceeds capacity: which requests are rejected, how, and what users see.",
    "Prioritise critical paths (checkout, login) and list features you'd degrade first.",
    "Use concurrency limits and fast 503/429 responses instead of unbounded queues.",
    "Combine shedding with autoscaling, circuit breakers and client backoff.",
  ],
  related: ["backpressure", "rate-limiting", "circuit-breaker", "autoscaling", "availability", "retries-and-timeouts"],
  practice: ["ticket-booking", "news-feed", "video-streaming", "rate-limiter"],
};
