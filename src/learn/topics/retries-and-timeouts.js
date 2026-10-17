export default {
  blocks: [
    { type: "p", text: "Every call over a network can fail or hang. **Timeouts** bound how long you wait; **retries** recover from transient failures. Done carelessly, both cause outages: no timeout means threads pile up behind a hung dependency, and naive retries multiply traffic exactly when a service is already struggling. Done well, they make systems resilient to the everyday blips of distributed computing." },

    { type: "h2", text: "Timeouts" },
    { type: "ul", items: [
      "**Always set one**. Many client libraries default to waiting forever or for minutes.",
      "Set separate **connect** and **request** timeouts: connecting should take milliseconds; a request's budget depends on the operation.",
      "Base the value on the dependency's latency distribution: a bit above its p99 (say p99 = 120 ms → timeout 300 ms), not an arbitrary 30 seconds.",
      "**Propagate deadlines**: if the user's request has 1 second left, a downstream call shouldn't be given 5 seconds. gRPC passes deadlines along automatically; with HTTP, pass a header with the remaining budget.",
    ] },

    { type: "h2", text: "Retries: only when it's safe and useful" },
    { type: "table", head: ["Retry?", "Cases"], rows: [
      ["Yes", "Connection errors, timeouts, 503 Service Unavailable, 429 (after Retry-After), 502/504 from a proxy"],
      ["No", "400, 401, 403, 404, 409, validation errors: the same request will fail the same way"],
      ["Only if idempotent", "Any operation with side effects (POST, payments) unless it carries an [idempotency key](/learn/idempotency)"],
    ] },

    { type: "h2", text: "Exponential backoff with jitter" },
    { type: "p", text: "Retrying immediately hits the dependency again while it's still overloaded. **Exponential backoff** waits longer each time: 100 ms, 200 ms, 400 ms, 800 ms, capped at a maximum. But if a thousand clients fail at the same moment, they all retry at the same moments too, in synchronised waves. **Jitter** randomises each wait to spread them out." },
    { type: "code", code: `
base, cap = 0.1, 5.0                     # seconds
for attempt in range(max_attempts):      # e.g. 3 to 5 attempts in total
    try:
        return call(timeout=remaining_deadline())
    except RetryableError:
        sleep(random.uniform(0, min(cap, base * 2 ** attempt)))   # "full jitter"
raise GiveUp()
` },
    { type: "diagram", kind: "flow", caption: "Without jitter, failed clients retry in synchronised spikes that knock the service down again; with jitter, retries spread into a gentle load.", nodes: [
      { id: "f", label: "1,000 clients fail", sub: "t = 0", col: 0, row: 0.5, tone: "danger", w: 160 },
      { id: "nj", label: "No jitter", sub: "all retry at 100, 200, 400 ms", col: 1.4, row: 0, tone: "danger", w: 200 },
      { id: "j", label: "Full jitter", sub: "retries spread over the window", col: 1.4, row: 1, tone: "ok", w: 200 },
      { id: "s1", label: "Spike → overload again", col: 2.8, row: 0, tone: "danger", shape: "pill", w: 190 },
      { id: "s2", label: "Smooth load → recovery", col: 2.8, row: 1, tone: "ok", shape: "pill", w: 190 },
    ], edges: [{ from: "f", to: "nj" }, { from: "f", to: "j" }, { from: "nj", to: "s1" }, { from: "j", to: "s2" }] },

    { type: "h2", text: "Retry storms and how to prevent them" },
    { type: "p", text: "Retries multiply across layers. If each of 4 layers retries 3 times, one user request can become 3^4 = 81 calls to the bottom service during an outage, which keeps it down. Defences:" },
    { type: "ul", items: [
      "**Retry at one layer** (usually closest to the user or at the edge), not every layer.",
      "**Retry budgets**: allow retries to add at most, say, 10% extra traffic; past that, fail fast. gRPC and Envoy support this.",
      "**[Circuit breakers](/learn/circuit-breaker)** stop retrying a dependency that is clearly down.",
      "**Respect Retry-After** and server-sent backpressure signals (429, 503).",
      "**Cap attempts** (3 is common) and total time with the deadline.",
    ] },

    { type: "h2", text: "Hedged requests" },
    { type: "p", text: "For latency-critical reads, instead of waiting for a timeout, send a **second request** to another replica if the first hasn't answered by roughly the p95 latency, and use whichever responds first. This trims tail latency at the cost of a few percent extra load. Only for idempotent reads. See [latency vs throughput](/learn/latency-vs-throughput)." },
  ],
  uses: [
    { name: "AWS SDKs", text: "Retry throttling and transient errors with exponential backoff and jitter by default, with a client-side retry quota." },
    { name: "gRPC", text: "Supports deadlines that propagate across services, configurable retry policies, retry throttling and hedging." },
    { name: "Envoy and service meshes", text: "Per-route timeouts, retry policies and retry budgets configured centrally instead of in each service." },
    { name: "Payment clients", text: "Retry network failures with the same idempotency key so a retried charge can't double-bill." },
  ],
  interview: [
    "Put a timeout on every network call and size it from the dependency's latency, with deadline propagation.",
    "Retry only transient errors and only idempotent operations (or with idempotency keys).",
    "Use exponential backoff with jitter, a small attempt cap, and retries at one layer.",
    "Mention retry storms and pair retries with circuit breakers and budgets.",
  ],
  related: ["circuit-breaker", "idempotency", "latency-vs-throughput", "rate-limiting", "load-shedding", "delivery-semantics"],
  practice: ["payment-platform", "notification-service", "web-crawler", "api-gateway"],
};
