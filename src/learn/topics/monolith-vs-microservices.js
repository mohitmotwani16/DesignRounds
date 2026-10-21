export default {
  blocks: [
    { type: "p", text: "A **monolith** is one unified application: user interface, business logic and data access live in one codebase, run as one process and are deployed together, usually with one database. **Microservices** split the product into small, loosely coupled services, each responsible for one capability and owning its own database, deployed independently and talking to each other over APIs. The choice is mostly about **teams and change**, not raw scalability: microservices buy independent deployment and scaling at the price of distributed-systems complexity." },

    { type: "h2", text: "Monolithic architecture" },
    { type: "p", text: "Take an e-commerce store. As a monolith, managing products, carts, orders and payments are all modules inside one application, sharing one database and calling each other as ordinary function calls." },
    { type: "diagram", kind: "flow", caption: "A monolithic e-commerce store: every module lives in one application and shares one database.", zones: [{ label: "One application, one deploy", from: [1, 0], to: [1, 2], tone: "accent" }], nodes: [
      { id: "c", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "inv", label: "Inventory module", col: 1, row: 0 },
      { id: "ord", label: "Order module", col: 1, row: 1 },
      { id: "pay", label: "Payment module", col: 1, row: 2 },
      { id: "db", label: "Database", col: 2.3, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "c", to: "ord" }, { from: "inv", to: "db" }, { from: "ord", to: "db" }, { from: "pay", to: "db" }] },
    { type: "table", head: ["Pros", "Cons"], rows: [
      ["**Simplicity**: easy to build, test and deploy while the app is small", "**Reliability**: a failure in one part (a memory leak in catalog code) can bring down everything"],
      ["**Performance**: modules call each other in-process, which is fast", "**Scalability**: you can't scale one busy part on its own; you scale the whole app"],
      ["**Easy debugging**: all the code is in one place, so issues are easy to trace", "**Complexity at scale**: the codebase gets hard to maintain; a new engineer on the payments team has to learn the inventory and order code too"],
      ["**Low initial cost**: little infrastructure or process overhead", "**Deployment bottleneck**: a change to one module means redeploying the whole application"],
    ] },

    { type: "h2", text: "Microservices architecture" },
    { type: "p", text: "In the microservices version, the product catalog, cart, orders and payments are each their own service with their own database, and they communicate over APIs." },
    { type: "diagram", kind: "flow", caption: "The same store as microservices: an API gateway routes to independent services, each owning its database.", nodes: [
      { id: "c", label: "Client", col: 0, row: 1.5, shape: "pill" },
      { id: "gw", label: "API gateway", col: 1.1, row: 1.5, tone: "accent" },
      { id: "p", label: "Product service", col: 2.3, row: 0 },
      { id: "u", label: "User service", col: 2.3, row: 1 },
      { id: "o", label: "Order service", col: 2.3, row: 2 },
      { id: "pay", label: "Payment service", col: 2.3, row: 3 },
      { id: "pdb", label: "Product DB", col: 3.5, row: 0, shape: "db", tone: "store" },
      { id: "udb", label: "User DB", col: 3.5, row: 1, shape: "db", tone: "store" },
      { id: "odb", label: "Order DB", col: 3.5, row: 2, shape: "db", tone: "store" },
      { id: "paydb", label: "Payment DB", col: 3.5, row: 3, shape: "db", tone: "store" },
    ], edges: [
      { from: "c", to: "gw" }, { from: "gw", to: "p" }, { from: "gw", to: "u" }, { from: "gw", to: "o" }, { from: "gw", to: "pay" },
      { from: "p", to: "pdb" }, { from: "u", to: "udb" }, { from: "o", to: "odb" }, { from: "pay", to: "paydb" },
    ] },
    { type: "table", head: ["Pros", "Cons"], rows: [
      ["**Scalability**: scale each service on its own load", "**Complexity**: many services to deploy, monitor and operate"],
      ["**Resilience**: one service failing doesn't have to take down the rest", "**Inter-service communication**: network calls fail and add latency, so you need timeouts, retries and circuit breakers"],
      ["**Flexibility**: each service can use the language and tools that suit it", "**Data consistency**: keeping data consistent across services is hard, and transactions across services are difficult"],
      ["**Faster development**: teams work on different services in parallel", "**Higher initial cost**: more infrastructure for orchestration, discovery and monitoring"],
      ["**Continuous deployment**: ship one service without touching the others", ""],
    ] },

    { type: "h2", text: "Why teams move to microservices" },
    { type: "p", text: "A startup builds an e-commerce app as one codebase: catalog, checkout, payments, accounts. It handles 100 orders a day and the monolith works well." },
    { type: "p", text: "Two years later it handles 10,000 orders a day, and the cracks show. Checkout needs more servers, but you can't scale just checkout; you must scale the whole monolith. The payments team wants to ship fraud detection but can't deploy without coordinating with every other team. A bug in the catalog crashes the application and takes checkout and payments down with it." },
    { type: "p", text: "Splitting into product, cart, user, order and payment services fixes exactly these problems: each service **deploys independently, scales independently and fails independently**." },

    { type: "h2", text: "How microservices work" },
    { type: "ul", items: [
      "**Separate processes, talking over APIs.** Each service runs on its own and communicates through APIs, usually REST over HTTP or gRPC. The payment service calls the order service to verify an order; the order service calls the inventory service to check stock. See [synchronous vs asynchronous communication](/learn/sync-vs-async-communication).",
      "**Each service owns its database.** The user service manages the user database, the order service the order database, and no service reads another's tables. If the user service changes its schema, nothing else breaks. See [database per service](/learn/database-per-service).",
      "**Service discovery.** Services register with a **service registry** (Consul, Eureka). When the payment service starts it announces its address; callers ask the registry where to find it. See [service discovery](/learn/service-discovery).",
      "**Independent scaling.** On Black Friday, checkout traffic spikes: run 10 more order-service instances while the product service stays at 2. Different services have different load patterns.",
      "**Fault isolation.** If the recommendation service crashes, checkout still works. [Circuit breakers](/learn/circuit-breaker) detect a failing service and stop sending it requests, preventing cascading failures.",
    ] },
    { type: "diagram", kind: "flow", caption: "Services call each other through APIs, never through each other's databases, and find each other through a registry.", nodes: [
      { id: "pay", label: "Payment service", col: 0, row: 1 },
      { id: "ord", label: "Order service", col: 1.4, row: 1 },
      { id: "inv", label: "Inventory service", col: 2.8, row: 1 },
      { id: "paydb", label: "Payment DB", col: 0, row: 2.2, shape: "db", tone: "store" },
      { id: "odb", label: "Order DB", col: 1.4, row: 2.2, shape: "db", tone: "store" },
      { id: "idb", label: "Inventory DB", col: 2.8, row: 2.2, shape: "db", tone: "store" },
      { id: "reg", label: "Service registry", sub: "Consul / Eureka", col: 1.4, row: 0, tone: "accent" },
    ], edges: [
      { from: "pay", to: "ord", label: "verify order" }, { from: "ord", to: "inv", label: "check stock" },
      { from: "pay", to: "paydb" }, { from: "ord", to: "odb" }, { from: "inv", to: "idb" },
      { from: "pay", to: "reg", dashed: true, label: "where is Order?" },
    ] },
    { type: "h3", text: "Common implementations" },
    { type: "table", head: ["Stack", "Strengths", "Good for"], rows: [
      ["Java + Spring Boot", "Built-in REST, service discovery and distributed tracing; mature tooling and strong typing", "Enterprise systems"],
      ["Node.js + Express", "Fast development, huge npm ecosystem", "Lightweight services, TypeScript or JavaScript teams"],
      ["Go (Gin, Echo)", "High performance and built-in concurrency", "High-throughput, low-latency services such as real-time bidding or stream processing"],
    ] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Monolith", "Microservices"], rows: [
      ["Deployment", "One unit; every change redeploys everything", "Each service deploys independently"],
      ["Team scaling", "Coordination grows as teams grow; merge and release contention", "Teams own services end to end and move independently"],
      ["Calls between parts", "In-process function calls: fast and reliable", "Network calls: latency, partial failure, retries, versioning"],
      ["Data", "One database, joins and transactions everywhere", "Database per service; cross-service queries and consistency are hard"],
      ["Scaling", "Scale the whole app (usually fine)", "Scale hot services independently"],
      ["Failure isolation", "A memory leak can take down everything", "Failures can be contained, if resilience patterns are in place"],
      ["Technology", "One stack", "Each service can choose (but too much diversity hurts)"],
      ["Operational cost", "Low: one thing to deploy, monitor and debug", "High: service discovery, tracing, CI/CD per service, on-call per service"],
    ] },

    { type: "h2", text: "The modular monolith" },
    { type: "p", text: "Between the two sits the **modular monolith**: one deployable, but internally divided into modules with clear boundaries, their own tables and explicit interfaces, and no reaching into each other's data. It keeps the simplicity of one deployment while preparing clean seams to extract services later, if and when a team or scaling need actually requires it." },

    { type: "h2", text: "Microservices in interviews vs in real life" },
    { type: "p", text: "**In interviews**, most large-scale design questions expect you to lean towards microservices. The real question is how you **decompose the requirements into services**: which capabilities become services, which data each one owns, and how they talk. The [problem decomposition framework](/learn/problem-decomposition-framework) helps here." },
    { type: "p", text: "**In real life**, microservices are not always the right call. For small applications a monolith is often perfectly sufficient:" },
    { type: "ul", items: [
      "**Premature optimization**: building many services before you understand the business domain wastes effort, and you will draw the boundaries in the wrong places.",
      "**Iterative learning**: a monolith lets you learn and reshape the domain model cheaply before paying the overhead of distributed services.",
    ] },
    { type: "p", text: "Martin Fowler observed that almost every system he had seen built as microservices from scratch ran into serious trouble, and advised against starting a new project with microservices even when you're sure it will grow large. The best time to split is when you have **outgrown** the monolith and understand the system and its requirements well." },

    { type: "h2", text: "When microservices make sense" },
    { type: "ul", items: [
      "**Many teams** (dozens of engineers or more) are slowing each other down in one codebase and release train.",
      "**Different scaling or reliability needs**: video transcoding needs GPUs and scales differently from the user profile API.",
      "**Different change rates**: a fast-moving recommendations team shouldn't wait on a slow-moving billing release.",
      "**Strong domain boundaries** are understood, so services won't need to change together for every feature.",
    ] },

    { type: "h2", text: "Doing microservices well" },
    { type: "ul", items: [
      "**Split by business capability** (orders, payments, catalog), not by technical layer (a \"database service\").",
      "**Own your data**: no other service reads your tables; share through APIs or events.",
      "**Prefer asynchronous events** for cross-service workflows, and [sagas](/learn/saga-pattern) for multi-step transactions.",
      "**Invest in the platform first**: [service discovery](/learn/service-discovery), [observability](/learn/observability) with distributed tracing, CI/CD, [circuit breakers](/learn/circuit-breaker) and timeouts.",
      "**Avoid the distributed monolith**: services that must be deployed together, or that chain synchronous calls through five services for every request, get the costs of both styles and the benefits of neither.",
    ] },
    { type: "callout", text: "Start with a well-structured monolith and extract services where a real pressure (team autonomy, scaling, isolation) justifies the cost. Many successful companies run large modular monoliths (Shopify, Basecamp, Stack Overflow)." },
  ],
  uses: [
    { name: "Amazon and Netflix", text: "Moved to hundreds or thousands of services owned by small teams, with heavy investment in tooling for deployment, discovery and resilience." },
    { name: "Shopify", text: "Runs one of the largest Ruby on Rails monoliths, organized as a modular monolith with enforced component boundaries." },
    { name: "Segment", text: "Publicly described moving from microservices back to a monolith for a part of its system when the operational overhead outweighed the benefits." },
    { name: "Uber", text: "Grew to thousands of microservices, then introduced domain-oriented groupings to tame the complexity." },
  ],
  interview: [
    "Lean towards services for large-scale designs, but justify each boundary by ownership, scaling or isolation needs.",
    "Give each service its own data and explain how data flows between them (APIs, events).",
    "Address cross-service consistency with sagas and the outbox pattern.",
    "Mention the platform you need: discovery, gateway, tracing, resilience patterns; and say a monolith is fine for a small product.",
  ],
  related: ["sync-vs-async-communication", "database-per-service", "service-discovery", "api-gateway", "saga-pattern", "circuit-breaker", "observability"],
  practice: ["service-platform", "payment-platform", "micro-frontend-platform"],
};
