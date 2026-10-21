// How microservices talk: synchronous request/response vs asynchronous messaging, the coupling
// and thread-exhaustion problems of blocking calls, and when to use each.
export default {
  blocks: [
    { type: "p", text: "Splitting an application into [microservices](/learn/monolith-vs-microservices) gives each service one job and its own database. But services can't work in isolation: when a customer places an order, the order service has to check inventory, charge the payment and trigger a confirmation email. How the services coordinate is one of the biggest decisions in a design. There are two basic styles: **synchronous** (ask and wait for the answer) and **asynchronous** (send a message and move on)." },

    { type: "h2", text: "The communication problem" },
    { type: "p", text: "An e-commerce site runs three services: orders, inventory and payments. A customer buys something. The order service receives the request, but it needs inventory data to confirm the item is in stock and the payment service to charge the customer. Unless the services can talk to each other, the order can't complete." },

    { type: "h2", text: "Synchronous communication" },
    { type: "p", text: "Synchronous communication is a direct **request–response** exchange: service A sends a request to service B and **waits** for the answer before continuing. The calling thread is blocked while it waits." },
    { type: "diagram", kind: "sequence", caption: "Synchronous: the order service blocks until inventory and payment have both answered.", actors: ["Client", "Order service", "Inventory service", "Payment service"], steps: [
      { from: 0, to: 1, label: "POST /orders" },
      { from: 1, to: 2, label: "GET /stock/42 (waits)" },
      { from: 2, to: 1, label: "{ in_stock: 7 }", dashed: true },
      { from: 1, to: 3, label: "POST /charges (waits)" },
      { from: 3, to: 1, label: "{ status: paid }", dashed: true },
      { from: 1, to: 0, label: "201 order placed", dashed: true },
    ] },
    { type: "p", text: "REST over HTTP is the most common implementation: the order service sends a GET to the inventory service, which queries its database and returns JSON with the stock level. gRPC is a faster alternative that uses HTTP/2 and Protocol Buffers. See [REST vs gRPC vs GraphQL](/learn/api-styles)." },
    { type: "h3", text: "How it works in practice" },
    { type: "p", text: "A user asks for their order details. The [API gateway](/learn/api-gateway) calls the order service with order ID 12345 and its thread waits. The order service queries its database, finds the order and returns JSON; the gateway receives it and forwards it to the user. This is the familiar web-development model: Express.js, Spring Boot and Flask handle requests synchronously by default, HTTP and gRPC support it natively, and most developers write their first service this way." },
    { type: "h3", text: "The simplicity advantage" },
    { type: "ul", items: [
      "**Easy to write and reason about.** Code reads top to bottom: fetch the user, then their orders, then return both. The execution path matches the code.",
      "**Easy to debug.** Logs show the whole chain. A request that failed at 10:05:23 shows the gateway calling the order service calling the database, each step with clear inputs and outputs. You can test any endpoint with curl or Postman.",
      "**Errors are immediate and unambiguous.** A `404` means the resource doesn't exist, a `500` means the server failed. The caller knows right away that the operation failed and can retry or show an error.",
    ] },
    { type: "h3", text: "The coupling problem" },
    { type: "p", text: "Synchronous calls create **runtime dependencies**: A can't work if B is down. A user opens their profile; the profile service calls the achievements service for their badges. If achievements is offline, the whole profile request fails and the user sees an error, even though their basic profile data was perfectly available." },
    { type: "p", text: "It gets worse along **chains** of calls. A calls B, B calls C, C calls D. If D takes 200 ms and C, B and A each add 50 ms of their own work, the user waits 350 ms. If D slows to 2 seconds, the whole chain waits 2 seconds plus overhead. And failures **cascade**: if C crashes, B gets no answer and returns an error to A, which returns an error to the user. One broken service breaks three, and the blast radius grows with the length of the chain." },
    { type: "diagram", kind: "flow", caption: "A synchronous chain: latencies add up (50 + 50 + 50 + 200 = 350 ms), and if C fails, B, A and the user all fail with it.", nodes: [
      { id: "u", label: "User", col: 0, row: 0, shape: "pill" },
      { id: "a", label: "Service A", sub: "+50 ms", col: 1, row: 0 },
      { id: "b", label: "Service B", sub: "+50 ms", col: 2, row: 0 },
      { id: "c", label: "Service C", sub: "+50 ms · crashes", col: 3, row: 0, tone: "danger" },
      { id: "d", label: "Service D", sub: "200 ms", col: 4, row: 0 },
    ], edges: [
      { from: "u", to: "a" }, { from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" },
      { from: "c", to: "b", label: "error", tone: "danger", bend: 40 }, { from: "b", to: "a", label: "error", tone: "danger", bend: 40 },
    ] },
    { type: "h3", text: "Resource contention: thread pool exhaustion" },
    { type: "p", text: "Every synchronous request holds resources while it waits. A thread takes the request and sits blocked until the downstream answer arrives. Under load, every thread can end up waiting, and new requests queue or get rejected." },
    { type: "p", text: "Say the order service has **100 threads** and each request calls the inventory service, which has slowed from its usual 50 ms to **500 ms**. All 100 threads end up blocked waiting on inventory. The next request finds no free thread and either waits in a queue or fails. The problem then spreads **upstream**: if 10 gateway instances each have 100 threads, and all of them are waiting on the order service, the gateway can't serve anything and clients see timeouts. (By [Little's Law](/learn/latency-vs-throughput), 100 threads at 500 ms can serve at most 200 requests a second, versus 2,000 at 50 ms.)" },
    { type: "diagram", kind: "flow", caption: "Thread pool exhaustion: a slow dependency (500 ms instead of 50 ms) leaves all 100 threads blocked, so new requests are rejected.", nodes: [
      { id: "new", label: "New request", col: 0, row: 1, shape: "pill", tone: "danger" },
      { id: "t1", label: "Threads 1–20", sub: "WAITING", col: 1.3, row: 0, tone: "danger" },
      { id: "t2", label: "Threads 21–60", sub: "WAITING", col: 1.3, row: 1, tone: "danger" },
      { id: "t3", label: "Threads 61–100", sub: "WAITING", col: 1.3, row: 2, tone: "danger" },
      { id: "inv", label: "Inventory service", sub: "500 ms per request (normally 50 ms)", col: 2.9, row: 1, tone: "ok" },
    ], zones: [{ label: "Order service · 100 threads, all blocked", from: [1.3, 0], to: [1.3, 2], tone: "danger" }], edges: [
      { from: "new", to: "t2", label: "rejected", dashed: true, tone: "danger" },
      { from: "t1", to: "inv", dashed: true }, { from: "t2", to: "inv", dashed: true }, { from: "t3", to: "inv", dashed: true },
    ] },
    { type: "h3", text: "When synchronous communication works" },
    { type: "ul", items: [
      "**You need the answer to continue**: checking credentials before granting access, fetching the data you're about to display, confirming a payment before completing checkout.",
      "**Chains are short**: one or two hops are manageable; three or more add real latency and failure risk. If you're chaining four services, ask whether all that data is needed right now, or whether some of it can be fetched asynchronously.",
      "**The system is small**: an application with three services can use plain REST calls without elaborate failure handling. As it grows you'll need [timeouts and retries](/learn/retries-and-timeouts), [circuit breakers](/learn/circuit-breaker) and [fallbacks](/learn/fallbacks-graceful-degradation) to survive the failures that will inevitably happen.",
    ] },

    { type: "h2", text: "Asynchronous communication" },
    { type: "p", text: "Asynchronous communication **decouples** services. The sender publishes a message and carries on without waiting; the receiver processes it later." },
    { type: "h3", text: "Option 1: a shared database" },
    { type: "p", text: "Service A writes rows to a table; service B polls the table and processes new rows. It's simple, but it couples both services tightly to the table's schema (they must agree on its structure and change it together), and under high load the database becomes the bottleneck. See [dataflow patterns](/learn/dataflow-patterns)." },
    { type: "diagram", kind: "flow", caption: "Asynchronous through a shared table: A writes, B polls. Simple, but both depend on the same schema and database.", nodes: [
      { id: "a", label: "Service A", col: 0, row: 0 },
      { id: "db", label: "Shared table", col: 1.3, row: 0, shape: "db", tone: "store" },
      { id: "b", label: "Service B", col: 2.6, row: 0 },
    ], edges: [{ from: "a", to: "db", label: "write rows" }, { from: "b", to: "db", label: "poll for new rows", dashed: true }] },
    { type: "h3", text: "Option 2: a message queue (better)" },
    { type: "p", text: "Service A publishes a message to a broker such as RabbitMQ or Kafka. The broker guarantees delivery to service B **even if B is temporarily offline**, and B processes messages at its own pace. See [message queues](/learn/message-queues)." },
    { type: "p", text: "When a user places an order, the order service publishes an **OrderCreated** event. The inventory service subscribes and reserves stock; the notification service also subscribes and sends the confirmation email. Each works independently, so if email sending fails, the order still completes." },
    { type: "diagram", kind: "flow", caption: "Event-driven: the order service publishes OrderCreated once; each subscriber reacts independently, and a failing subscriber doesn't fail the order.", nodes: [
      { id: "o", label: "Order service", col: 0, row: 1 },
      { id: "q", label: "Message broker", sub: "OrderCreated", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "i", label: "Inventory service", sub: "reserve stock", col: 2.7, row: 0 },
      { id: "n", label: "Notification service", sub: "send email", col: 2.7, row: 1 },
      { id: "an", label: "Analytics", sub: "update dashboards", col: 2.7, row: 2 },
    ], edges: [{ from: "o", to: "q", label: "publish" }, { from: "q", to: "i" }, { from: "q", to: "n" }, { from: "q", to: "an" }] },
    { type: "p", text: "Async handles **high throughput** well: nobody blocks waiting for responses, and the queue absorbs traffic spikes. The cost is complexity: tracing a flow across asynchronous hops is much harder than reading a synchronous call chain, and you have to handle duplicates, ordering and eventual consistency. See [delivery guarantees](/learn/delivery-semantics) and [idempotency](/learn/idempotency)." },

    { type: "h2", text: "Choosing a pattern" },
    { type: "table", head: ["", "Synchronous (REST, gRPC)", "Asynchronous (queues, events)"], rows: [
      ["Caller waits?", "Yes, it blocks until the reply", "No, it publishes and moves on"],
      ["Coupling", "Tight at runtime: B down means A fails", "Loose: the broker holds messages until B is back"],
      ["Latency", "Adds up along the chain", "Request returns fast; the work finishes later"],
      ["Throughput under spikes", "Threads exhaust; requests rejected", "The queue buffers the spike"],
      ["Debugging", "Easy: linear logs, immediate errors", "Harder: distributed flows, needs tracing"],
      ["Consistency", "Immediate result", "Eventual"],
      ["Use for", "Login, reading data for a screen, payment confirmation", "Emails, analytics, file processing, fan-out to many consumers"],
    ] },
    { type: "p", text: "Use **synchronous** calls when you need an immediate answer: authenticating a user, fetching data to show on screen, confirming a payment before finishing checkout. Use **asynchronous** messaging for work that can happen eventually: sending notification emails, updating analytics dashboards, processing uploaded files that take minutes." },
    { type: "p", text: "Most systems use **both**. A REST API answers user requests synchronously, while background jobs run off message queues. A common shape is an API that responds immediately and publishes events for everything downstream." },
  ],
  uses: [
    { name: "E-commerce checkout", text: "Stock check and payment authorization are synchronous; confirmation emails, invoices and analytics are triggered by an OrderCreated event." },
    { name: "Social apps", text: "Loading a profile is a synchronous read; posting fans out to followers, notifications and search indexing asynchronously." },
    { name: "Media uploads", text: "The upload request returns at once; transcoding, thumbnails and moderation run as asynchronous jobs." },
  ],
  interview: [
    "For every arrow between services, say whether it is synchronous or asynchronous and why.",
    "Keep synchronous chains to one or two hops; move anything the user doesn't need right now to events.",
    "When you use synchronous calls, mention timeouts, retries, circuit breakers and fallbacks.",
    "When you use async, mention at-least-once delivery, idempotent consumers and eventual consistency.",
  ],
  related: ["monolith-vs-microservices", "api-styles", "message-queues", "retries-and-timeouts", "circuit-breaker", "dataflow-patterns", "pub-sub"],
  practice: ["notification-service", "payment-platform", "ticket-booking"],
};
