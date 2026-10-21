// How data moves between processes: through a shared database, synchronous service calls, or
// message queues; and push vs pull delivery, including long polling and SSE.
export default {
  blocks: [
    { type: "p", text: "A user service runs on server A; an order service runs on server B. To process a purchase, the order service needs user data, but processes on different machines can't share memory. How does the data get across? Moving data between separate processes is called **dataflow**, and there are three patterns for it: a **shared database**, **synchronous service calls**, and **message queues**. Within each, data can be **pushed** by the producer or **pulled** by the consumer." },

    { type: "h2", text: "The inter-process communication problem" },
    { type: "p", text: "Processes on the same machine can share memory: read a variable, write to an array, fast and simple. A distributed system runs processes on different machines with no shared memory, so data has to travel over the network: the order service's request and the user service's answer must be **encoded**, sent over TCP and **decoded** on the other side. The choice of channel decides latency, coupling and what happens when something fails." },

    { type: "h2", text: "Pattern 1: the database as a communication channel" },
    { type: "p", text: "One process writes to a database and another reads from it; the database is the intermediary. Both services connect to the same PostgreSQL instance: the user service inserts rows into `users`, and the order service queries that table when it processes an order." },
    { type: "diagram", kind: "flow", caption: "Dataflow through a database: one service writes rows, another reads them; the database is the shared intermediary.", nodes: [
      { id: "u", label: "User service", col: 0, row: 0 },
      { id: "db", label: "PostgreSQL", sub: "users table", col: 1.4, row: 0, shape: "db", tone: "store" },
      { id: "o", label: "Order service", col: 2.8, row: 0 },
    ], edges: [{ from: "u", to: "db", label: "INSERT / UPDATE" }, { from: "o", to: "db", label: "SELECT" }] },
    { type: "ul", items: [
      "**Centralized data**: every service reads the same source of truth. Schema changes affect all readers, but at least everyone sees one consistent structure.",
      "**Concurrency handled for you**: the database's transactions and locks stop two services updating the same row from clobbering each other.",
      "**A bottleneck under load**: every service hits the same instance. Read replicas help but add complexity, and each database round trip adds latency (a service chain that queries the database five times adds five network hops).",
      "**Tight coupling to the schema**: services depend on each other's tables, which is why microservice designs usually give each service [its own database](/learn/database-per-service).",
    ] },
    { type: "p", text: "Use it when **consistency matters more than latency**: configuration data, user profiles, inventory counts. It's a poor fit for real-time chat messages." },

    { type: "h2", text: "Pattern 2: synchronous service calls" },
    { type: "p", text: "The order service calls the user service directly over HTTP or gRPC: send a GET, wait, get the response. This is **request–response**. See [sync vs async communication](/learn/sync-vs-async-communication)." },
    { type: "diagram", kind: "sequence", caption: "Synchronous call: the order service asks the user service's API and blocks until it answers.", actors: ["Order service", "User service", "User DB"], steps: [
      { from: 0, to: 1, label: "GET /users/42" },
      { from: 1, to: 2, label: "SELECT …" },
      { from: 2, to: 1, label: "row", dashed: true },
      { from: 1, to: 0, label: "200 {user}", dashed: true },
    ] },
    { type: "ul", items: [
      "**The caller decides when to fetch**: services expose APIs and others call them on demand, only when needed for an active order. No polling, no background updates.",
      "**Encapsulation**: the user service owns user data, and the order service can't query the user database directly; it must use the API. The user service can change its schema freely as long as the API contract stays stable.",
      "**Blocking and compounding latency**: if the user service takes 200 ms, the order service waits 200 ms. Chain A → B → C → D and the total is the sum of every call plus network overhead.",
      "**Failure propagation**: if the user service is down, orders fail even though the order service is fine. [Timeouts and retries](/learn/retries-and-timeouts) and [circuit breakers](/learn/circuit-breaker) mitigate this, at the cost of complexity.",
    ] },
    { type: "p", text: "Use it when you **need the data now to proceed**: payment confirmation, verifying credentials, real-time queries that need current data." },

    { type: "h2", text: "Pattern 3: message queues for asynchronous flow" },
    { type: "p", text: "The order service publishes an **OrderCreated** event and doesn't wait for anyone. A broker such as Kafka or RabbitMQ stores it; the inventory service, subscribed to OrderCreated, processes it when ready and reserves stock. See [message queues](/learn/message-queues)." },
    { type: "diagram", kind: "flow", caption: "Asynchronous dataflow: one published event is consumed independently by several services; the producer never waits.", nodes: [
      { id: "o", label: "Order service", col: 0, row: 1 },
      { id: "b", label: "Broker", sub: "OrderCreated", col: 1.3, row: 1, shape: "queue", tone: "queue" },
      { id: "i", label: "Inventory", sub: "reserve stock", col: 2.7, row: 0 },
      { id: "n", label: "Notifications", sub: "send email", col: 2.7, row: 1 },
      { id: "a", label: "Analytics", sub: "log event", col: 2.7, row: 2 },
    ], edges: [{ from: "o", to: "b", label: "publish" }, { from: "b", to: "i" }, { from: "b", to: "n" }, { from: "b", to: "a" }] },
    { type: "ul", items: [
      "**Decoupled**: the order service doesn't know who consumes its events. One message can serve many consumers: inventory reserves stock, notifications sends an email, analytics logs it.",
      "**Buffered**: if inventory is slow, messages queue up and the order service keeps publishing, so a temporary slowdown never blocks senders. If a consumer crashes, its messages wait until it recovers.",
      "**One-way**: the sender publishes and forgets; there's no response. For two-way communication the receiver must publish a separate reply message. The result is **eventual consistency**, fine when immediate confirmation isn't required.",
    ] },
    { type: "p", text: "Use it when services run at **different speeds** or **one event triggers many actions**: background jobs, notifications, data pipeline events. Don't use it when you need an immediate answer or strong consistency." },

    { type: "h2", text: "Comparing the three patterns" },
    { type: "table", head: ["Pattern", "Recipients", "Sync / async", "Response", "Use when"], rows: [
      ["Database", "Many", "Async", "None", "Centralized data with many readers"],
      ["Service calls", "One", "Sync", "Immediate", "You need the data now to proceed"],
      ["Message queue", "Many", "Async", "None", "Decoupling producers and consumers"],
    ] },
    { type: "p", text: "Database dataflow suits read-heavy workloads with stable schemas; service calls suit interactive requests that need real-time answers; queues suit asynchronous processing with consumers of varying speed. Real systems combine them: an e-commerce platform uses **service calls for checkout**, **queues for order processing** and a **database for the product catalog**. Choose by latency needs, consistency needs and how much coupling you can tolerate." },

    { type: "h2", text: "Push vs pull" },
    { type: "p", text: "Within any of these patterns, data moves one of two ways: the producer **pushes** it to consumers, or consumers **pull** it from the producer. The choice affects latency, scalability and resource use." },
    { type: "h3", text: "Push" },
    { type: "p", text: "The **server starts** the transfer: when new data appears, it sends it to clients straight away without waiting to be asked. In a chat app, when Alice sends a message the server pushes it to Bob's device; Bob doesn't poll. The server keeps connections to all online clients and pushes updates as they happen. On the web this is done with **WebSockets**: the client opens a persistent connection and the server sends data whenever events occur. Trading platforms push price changes, news apps push breaking stories, IoT sensors push measurements. See [real-time communication](/learn/real-time-communication)." },
    { type: "diagram", kind: "sequence", caption: "Push: clients hold open connections and the server sends each update the moment it happens.", actors: ["Alice", "Chat server", "Bob"], steps: [
      { from: 2, to: 1, label: "open WebSocket (once)" },
      { from: 0, to: 1, label: "send \"Hi Bob\"" },
      { from: 1, to: 2, label: "push \"Hi Bob\" (immediately)" },
      { from: 1, to: 2, label: "push next update…" },
    ] },
    { type: "ul", items: [
      "**Minimal latency**: updates arrive as soon as they're produced; there's no polling delay.",
      "**Server cost**: the server tracks every connected client and keeps a connection (and state) open for each. A million concurrent users means a million connections, and memory and network overhead grow with the client count.",
      "**Best when** updates are frequent and unpredictable and clients need them immediately: live sports scores, financial data every second, chat messages arriving at random.",
    ] },
    { type: "h3", text: "Pull" },
    { type: "p", text: "The **client starts** each request, at intervals or on demand: \"any new data?\" The server replies with whatever it has. Browsers work this way (click a link, request a page), and so do APIs: a mobile app calls `GET /notifications` every 30 seconds and gets back new notifications, or an empty list." },
    { type: "diagram", kind: "sequence", caption: "Pull: the client polls on its own schedule; most polls come back empty when updates are rare.", actors: ["Mobile app", "API server"], steps: [
      { from: 0, to: 1, label: "GET /notifications" },
      { from: 1, to: 0, label: "[] (nothing new)", dashed: true },
      { note: "30 seconds later", over: [0, 1] },
      { from: 0, to: 1, label: "GET /notifications" },
      { from: 1, to: 0, label: "[1 new notification]", dashed: true },
    ] },
    { type: "ul", items: [
      "**Client control**: a slow client can poll less often, a client catching up can poll more. The server tracks no client state; it just answers requests.",
      "**Added latency**: new data waits on the server until the next poll; polling every minute means updates up to a minute late.",
      "**Wasted polls**: polling every second when data changes hourly makes 3,600 pointless requests an hour, and under heavy polling most responses are empty, burning resources on both sides.",
      "**Scales well on the server**: no persistent connections, so a stateless server handles millions of sporadic requests more easily than millions of open connections.",
      "**Best when** updates are infrequent or consumers run at different speeds: an app checking configuration hourly, background sync jobs fetching on their own schedule.",
    ] },
    { type: "table", head: ["", "Push", "Pull"], rows: [
      ["Latency", "Immediate", "Delayed by the polling interval"],
      ["Server resources", "High (open connections)", "Low (stateless responses)"],
      ["Client control", "Limited", "Full control of timing"],
      ["Network efficiency", "High (no empty polls)", "Low (many empty polls)"],
      ["Scalability", "Hard with many clients", "Easier to scale horizontally"],
      ["Best for", "Real-time updates", "Infrequent or scheduled updates"],
    ] },
    { type: "h3", text: "Hybrids" },
    { type: "ul", items: [
      "**Push + pull together**: email clients pull new messages periodically, but mobile push notifications alert you instantly: real-time awareness without constant polling.",
      "**Long polling**: the client sends a request and the server **holds it open** until data arrives or a timeout passes, then responds; the client immediately sends the next request. Near-real-time updates without WebSockets.",
      "**Server-Sent Events (SSE)**: the client opens a normal HTTP request, and the server keeps it open and streams updates. Unlike WebSockets it's **one-way**: the server pushes, and the client can't send messages back on that connection.",
    ] },
    { type: "p", text: "Choose by update frequency, latency needs and scale: high-frequency real-time data favors push; sporadic or scheduled data favors pull. Twitter's timeline is the classic case of using both at once; see [fan-out](/learn/fan-out)." },
  ],
  uses: [
    { name: "E-commerce", text: "Service calls for checkout, queues for order fulfilment, a shared catalog database for product reads." },
    { name: "Chat and live updates", text: "Push over WebSockets for messages; pull (REST) for loading history and settings." },
    { name: "Mobile notifications", text: "Push notifications for alerts combined with periodic pulls to sync full state." },
    { name: "Dashboards", text: "SSE or long polling to stream metrics without the complexity of two-way WebSockets." },
  ],
  interview: [
    "For each interaction, choose a channel (database, sync call, queue) and justify it by latency, consistency and coupling.",
    "Prefer APIs over sharing another service's database; use queues when one event has many consumers.",
    "For real-time features, compare push (WebSockets/SSE) with pull (polling), and mention the connection cost of push at scale.",
    "Mention hybrids: long polling, SSE, and push notifications plus periodic sync.",
  ],
  related: ["sync-vs-async-communication", "message-queues", "real-time-communication", "fan-out", "database-per-service", "pub-sub"],
  practice: ["chat-system", "notification-service", "news-feed"],
};
