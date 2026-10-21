export default {
  blocks: [
    { type: "p", text: "A **webhook** is an HTTP callback: when an event happens in one system, it sends an HTTP POST to a URL that another system registered in advance. Instead of a customer polling \"has the payment succeeded yet?\", the payment provider calls them the moment it does. Webhooks are the standard way SaaS platforms notify each other." },

    { type: "h2", text: "The flow" },
    { type: "diagram", kind: "sequence", caption: "The receiver acknowledges quickly and processes asynchronously; the sender retries with backoff if it doesn't get a 2xx response.", actors: ["Provider (sender)", "Your endpoint", "Your queue"], steps: [
      { note: "event: payment.succeeded", over: [0] },
      { from: 0, to: 1, label: "POST /webhooks/pay (signed)" },
      { from: 1, to: 1, label: "verify signature + timestamp" },
      { from: 1, to: 2, label: "enqueue event (dedupe by id)" },
      { from: 1, to: 0, label: "200 OK (fast)", tone: "accent" },
      { from: 2, to: 2, label: "process: mark order paid" },
    ] },

    { type: "h2", text: "Building a reliable sender" },
    { type: "p", text: "If you're the platform sending webhooks to customers, you're calling thousands of endpoints you don't control: some slow, some down, some misconfigured." },
    { type: "ul", items: [
      "**Never send from the request path**: record the event (via an [outbox](/learn/outbox-pattern)) and deliver from a background queue.",
      "**Retry with exponential backoff** over hours or days (e.g. 1 min, 5 min, 30 min, 2 h, …), then mark the endpoint failing and notify the customer. See [retries](/learn/retries-and-timeouts).",
      "**Short timeouts** (5–10 s) and **per-endpoint isolation**: one slow customer endpoint must not delay deliveries to others (separate queues or concurrency limits per endpoint). See [bulkheads](/learn/circuit-breaker).",
      "**Sign every payload** with an HMAC over the body and a timestamp, using a per-endpoint secret, so receivers can verify it came from you and wasn't replayed.",
      "**Include an event ID**, type, creation time and API version in every payload.",
      "**Delivery logs and replay**: let customers see attempts and responses, and re-send events.",
      "**Thin events option**: send just the event type and object ID, and let receivers fetch the current state from your API, which also solves ordering problems.",
    ] },

    { type: "h2", text: "Building a robust receiver" },
    { type: "ul", items: [
      "**Verify the signature** using the raw request body and reject requests with old timestamps (replay protection).",
      "**Respond fast**: acknowledge with 200 after durably queuing the event; do the real work asynchronously. A slow response triggers sender timeouts and retries.",
      "**Be idempotent**: delivery is at-least-once, so the same event can arrive several times. Deduplicate by event ID. See [idempotency](/learn/idempotency).",
      "**Don't assume order**: `payment.succeeded` can arrive before `payment.created`. Use timestamps or versions, or fetch the latest state from the provider's API.",
      "**Reconcile periodically**: webhooks can be missed during long outages; a periodic job that lists recent objects from the provider's API catches anything lost.",
    ] },
    { type: "code", code: `
expected = hmac_sha256(secret, f"{timestamp}.{raw_body}")
if not constant_time_equals(expected, header_signature): reject(401)
if abs(now() - timestamp) > 300: reject(401)            # 5-minute replay window
if seen(event_id): return 200                             # duplicate delivery
queue.publish(event); mark_seen(event_id); return 200
` },

    { type: "h2", text: "Webhooks vs alternatives" },
    { type: "table", head: ["Mechanism", "Good for"], rows: [
      ["Webhooks", "Server-to-server notifications across organisations"],
      ["Polling", "When the receiver can't expose a public endpoint; simple but wasteful and delayed"],
      ["[WebSockets / SSE](/learn/real-time-communication)", "Pushing to browsers and apps with live connections"],
      ["[Pub/sub](/learn/pub-sub) / event streams", "Events between your own services, with durability and replay"],
    ] },
  ],
  uses: [
    { name: "Stripe", text: "Sends signed webhooks for payment events with retries over up to three days, and documents idempotent, order-independent handling." },
    { name: "GitHub", text: "Push, pull request and issue webhooks trigger CI pipelines, bots and deployments." },
    { name: "Shopify and Twilio", text: "Notify apps of orders, inventory changes, delivered messages and call status via webhooks." },
    { name: "Slack and Discord", text: "Incoming webhooks let any system post messages into channels with a simple HTTP POST." },
  ],
  interview: [
    "When integrating with an external provider, receive webhooks: verify signatures, ack fast, queue, process idempotently.",
    "As a sender, deliver from a queue with retries, backoff, timeouts, signing and per-endpoint isolation.",
    "Handle out-of-order and duplicate events, and add periodic reconciliation.",
    "Mention event IDs and versioned payloads.",
  ],
  related: ["idempotency", "message-queues", "retries-and-timeouts", "outbox-pattern", "pub-sub", "authentication-authorization"],
  practice: ["webhook-service", "payment-platform", "notification-service"],
};
