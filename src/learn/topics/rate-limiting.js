export default {
  blocks: [
    { type: "p", text: "**Rate limiting** caps how many requests a client can make in a period, for example 100 requests per minute per API key. It protects services from overload and abuse (scraping, brute-force logins, runaway scripts), enforces fair use between customers, and controls cost. Requests over the limit are rejected, usually with HTTP **429 Too Many Requests**." },

    { type: "h2", text: "Algorithms" },
    { type: "h3", text: "Token bucket" },
    { type: "p", text: "Each client has a bucket holding up to **B** tokens, refilled at **R** tokens per second. A request spends one token; if the bucket is empty, it's rejected. This allows **bursts** up to B while enforcing an average rate of R, which matches how real clients behave. It's the most widely used algorithm." },
    { type: "diagram", kind: "flow", caption: "Token bucket: tokens drip in at a steady rate up to the bucket size; each request takes one; an empty bucket means 429.", nodes: [
      { id: "refill", label: "Refill", sub: "10 tokens/s", col: 0, row: 0, shape: "pill", tone: "ok" },
      { id: "bucket", label: "Bucket", sub: "capacity 20 · now 3", col: 1.3, row: 0, tone: "accent", w: 160 },
      { id: "req", label: "Requests", col: 0, row: 1.2, shape: "pill" },
      { id: "ok", label: "Allowed", sub: "token taken", col: 2.6, row: 0, tone: "ok" },
      { id: "no", label: "429", sub: "bucket empty", col: 2.6, row: 1.2, tone: "danger" },
    ], edges: [
      { from: "refill", to: "bucket" }, { from: "req", to: "bucket" }, { from: "bucket", to: "ok", label: "token?" }, { from: "bucket", to: "no", dashed: true, tone: "danger" },
    ] },
    { type: "h3", text: "Leaky bucket" },
    { type: "p", text: "Requests enter a queue that drains at a fixed rate; when the queue is full, new requests are dropped. Output is perfectly smooth, which suits protecting a fragile downstream, but bursts wait in the queue (added latency)." },
    { type: "h3", text: "Fixed window counter" },
    { type: "p", text: "Count requests per key per fixed window (`user:42:2026-10-17T10:05`) and reject above the limit. Trivial with Redis `INCR` + `EXPIRE`. The flaw: a client can send the full limit at the end of one window and again at the start of the next, **double the rate** across the boundary." },
    { type: "h3", text: "Sliding window log and sliding window counter" },
    { type: "ul", items: [
      "**Sliding log**: store a timestamp per request (a Redis sorted set) and count those in the last 60 seconds. Exact, but memory grows with the limit.",
      "**Sliding window counter**: keep counts for the current and previous fixed windows and weight the previous by how much of it still overlaps: `count = current + previous × (1 − elapsed fraction)`. Nearly exact with two counters per key, and the common production choice alongside token buckets.",
    ] },
    { type: "table", head: ["Algorithm", "Bursts", "Accuracy", "Memory per key"], rows: [
      ["Token bucket", "Allowed up to bucket size", "Good", "2 values (tokens, last refill)"],
      ["Leaky bucket", "Smoothed (queued)", "Good", "Queue"],
      ["Fixed window", "2× at window edges", "Rough", "1 counter"],
      ["Sliding log", "None beyond limit", "Exact", "1 entry per request"],
      ["Sliding window counter", "Minimal", "Near exact", "2 counters"],
    ] },

    { type: "h2", text: "Distributed rate limiting" },
    { type: "p", text: "With many API servers, limits must be shared, or each server allows the full limit. The usual design keeps counters in **Redis**, updated atomically with a Lua script or `INCR`, sharded by key. Considerations:" },
    { type: "ul", items: [
      "**Atomicity**: read-check-update must be one operation (Lua script), or concurrent requests slip through.",
      "**Latency**: a Redis call per request adds ~1 ms; for very high volume, keep **local token buckets** per server with a share of the limit, synced periodically, accepting slight inaccuracy.",
      "**Failure mode**: decide whether to **fail open** (allow traffic if Redis is down; usual for APIs) or **fail closed** (block; for security-critical limits like login attempts).",
      "**Where to enforce**: at the [API gateway](/learn/api-gateway) or edge for coarse limits (per IP, per key), deeper in services for expensive operations.",
    ] },

    { type: "h2", text: "What to limit by" },
    { type: "ul", items: [
      "**API key or user ID** for fair use and plan tiers (free: 60/min, paid: 1,000/min).",
      "**IP address** for unauthenticated endpoints, with care for shared IPs (offices, mobile carriers).",
      "**Endpoint cost**: a search or report export can cost 100× a simple read; weight requests or use separate limits.",
      "**Global** limits to protect a dependency (only 500 calls/s to a payment provider), regardless of who's calling.",
    ] },

    { type: "h2", text: "Telling clients" },
    { type: "p", text: "Return **429** with a `Retry-After` header, and expose remaining budget with headers like `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`. Well-behaved clients then back off instead of hammering. See [timeouts and retries](/learn/retries-and-timeouts)." },
  ],
  uses: [
    { name: "GitHub, Stripe and Twitter APIs", text: "Per-token limits with rate-limit headers, and stricter limits on expensive or abuse-prone endpoints." },
    { name: "Cloudflare and AWS WAF", text: "Edge rate limiting by IP and path stops brute-force and scraping before traffic reaches origin servers." },
    { name: "Login and OTP endpoints", text: "Tight per-account and per-IP limits stop password guessing and SMS/email cost attacks." },
    { name: "Envoy and NGINX", text: "Local and global rate limit filters (Envoy calls a central rate-limit service backed by Redis)." },
  ],
  interview: [
    "Pick an algorithm and say why: token bucket for bursty API clients, sliding window counter for accuracy.",
    "Describe a distributed limiter with Redis and atomic Lua updates, and its fail-open or fail-closed behaviour.",
    "Choose the limiting key per endpoint (API key, user, IP) and weight expensive operations.",
    "Return 429 with Retry-After and rate-limit headers.",
  ],
  related: ["api-gateway", "load-shedding", "backpressure", "retries-and-timeouts", "circuit-breaker", "probabilistic-data-structures"],
  practice: ["rate-limiter", "api-gateway", "notification-service"],
};
