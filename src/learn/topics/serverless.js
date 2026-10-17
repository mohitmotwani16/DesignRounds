export default {
  blocks: [
    { type: "p", text: "**Serverless** computing lets you run code without managing servers: you deploy functions or containers, and the platform runs them on demand, scales them automatically (including **to zero**), and bills only for actual usage. AWS Lambda, Google Cloud Functions and Cloud Run, Azure Functions, Cloudflare Workers and Vercel Functions are common examples." },

    { type: "h2", text: "How functions as a service work" },
    { type: "diagram", kind: "flow", caption: "Events (HTTP, queue messages, file uploads, schedules) invoke functions. The platform starts as many instances as needed and stops them when idle.", nodes: [
      { id: "http", label: "HTTP request", col: 0, row: 0, shape: "pill" },
      { id: "q", label: "Queue message", col: 0, row: 1, shape: "pill" },
      { id: "s3", label: "File uploaded", col: 0, row: 2, shape: "pill" },
      { id: "cron", label: "Schedule", col: 0, row: 3, shape: "pill" },
      { id: "plat", label: "Serverless platform", sub: "scales 0 → N", col: 1.4, row: 1.5, tone: "accent", w: 170 },
      { id: "f1", label: "fn instance", col: 2.8, row: 0.5, tone: "ok" },
      { id: "f2", label: "fn instance", col: 2.8, row: 1.5, tone: "ok" },
      { id: "f3", label: "fn instance", col: 2.8, row: 2.5, tone: "ok" },
    ], edges: [
      { from: "http", to: "plat" }, { from: "q", to: "plat" }, { from: "s3", to: "plat" }, { from: "cron", to: "plat" },
      { from: "plat", to: "f1" }, { from: "plat", to: "f2" }, { from: "plat", to: "f3" },
    ] },
    { type: "ul", items: [
      "Each instance typically handles one request at a time (Lambda) or several (Cloud Run, Vercel's concurrency options); the platform adds instances as concurrency rises.",
      "Instances are **ephemeral**: no local state survives between invocations reliably. Keep state in databases, caches and [object storage](/learn/object-storage).",
      "Billing is per request plus compute time (often per millisecond × memory), so idle costs nothing.",
    ] },

    { type: "h2", text: "Cold starts" },
    { type: "p", text: "When no warm instance is available, the platform must create one: start a micro-VM or container, load the runtime and your code, run initialisation. This **cold start** adds anywhere from tens of milliseconds (lightweight runtimes, V8 isolates at the edge) to seconds (large Java or .NET apps, big dependencies, VPC networking)." },
    { type: "ul", items: [
      "Keep deployment packages small and initialisation light; move work out of the startup path.",
      "Use **provisioned concurrency** or minimum instances for latency-sensitive endpoints (you pay for them while idle).",
      "Reuse connections across invocations by creating clients outside the handler.",
    ] },

    { type: "h2", text: "Limits to design around" },
    { type: "table", head: ["Limit", "Typical values", "Design implication"], rows: [
      ["Max execution time", "Lambda: 15 min; HTTP functions often less", "Long jobs need queues, step functions or containers"],
      ["Concurrency limits", "Account-level caps (e.g. 1,000 by default on Lambda)", "A traffic spike can be throttled; reserve concurrency for critical functions"],
      ["Database connections", "Thousands of instances × connections", "Use connection poolers or proxies (RDS Proxy, PgBouncer) or HTTP-based databases"],
      ["Payload sizes", "A few MB per request/response", "Large files go directly to object storage via presigned URLs"],
      ["Local disk and memory", "Limited, ephemeral", "No big local caches; use Redis or similar"],
    ] },

    { type: "h2", text: "When serverless fits" },
    { type: "ul", items: [
      "**Spiky or unpredictable traffic**, and workloads that are idle much of the time: scale to zero saves money and effort.",
      "**Event-driven glue**: processing uploads, reacting to queue messages, webhooks, scheduled jobs. See [message queues](/learn/message-queues).",
      "**APIs and web backends** for small teams that want zero server management.",
      "**Edge logic** (redirects, auth checks, personalisation) with edge functions close to users. See [CDN](/learn/cdn).",
    ] },
    { type: "p", text: "It fits less well for steady high-throughput services (always-on containers are cheaper), latency-critical paths that can't tolerate cold starts, long-running or stateful workloads (WebSocket servers, streaming), and heavy local caching." },
  ],
  uses: [
    { name: "Image and video pipelines", text: "Uploads to object storage trigger functions that create thumbnails, extract metadata or start transcoding." },
    { name: "Webhooks and integrations", text: "Functions receive Stripe, GitHub or Slack webhooks and push work onto queues. See [webhooks](/learn/webhooks)." },
    { name: "Web apps on Vercel and Netlify", text: "Pages and API routes run as serverless functions with automatic scaling and preview deployments." },
    { name: "Coca-Cola, iRobot and many startups", text: "Built large parts of their backends on Lambda to avoid managing servers for spiky, event-driven workloads." },
  ],
  interview: [
    "Suggest serverless for spiky, event-driven or low-traffic workloads, and justify with cost and operations.",
    "Address cold starts, execution time limits and concurrency limits explicitly.",
    "Keep functions stateless; put state in managed stores and use a connection proxy for relational databases.",
    "Prefer containers for steady high-throughput or long-lived connection workloads.",
  ],
  related: ["autoscaling", "message-queues", "object-storage", "monolith-vs-microservices", "webhooks", "cdn"],
  practice: ["notification-service", "image-feed-client", "task-scheduler"],
};
