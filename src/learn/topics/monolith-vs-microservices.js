export default {
  blocks: [
    { type: "p", text: "A **monolith** is one deployable application containing all of a product's functionality, usually with one database. **Microservices** split the product into many small services, each owning a capability and its data, deployed independently and talking over the network. The choice is mostly about **teams and change**, not raw scalability: microservices buy independent deployment at the price of distributed-systems complexity." },

    { type: "h2", text: "The architectures" },
    { type: "diagram", kind: "flow", caption: "Monolith: modules call each other in-process and share a database. Microservices: each service owns its data and communicates over APIs and events.", nodes: [
      { id: "mono", label: "Monolith", sub: "users · orders · billing", col: 0, row: 0.5, tone: "accent", w: 170 },
      { id: "mdb", label: "One database", col: 0, row: 1.8, shape: "db", tone: "store" },
      { id: "gw", label: "API gateway", col: 1.6, row: 0.5, tone: "accent" },
      { id: "u", label: "Users svc", col: 2.7, row: 0 },
      { id: "o", label: "Orders svc", col: 2.7, row: 1 },
      { id: "b", label: "Billing svc", col: 2.7, row: 2 },
      { id: "udb", label: "users DB", col: 3.8, row: 0, shape: "db", tone: "store" },
      { id: "odb", label: "orders DB", col: 3.8, row: 1, shape: "db", tone: "store" },
      { id: "bdb", label: "billing DB", col: 3.8, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "mono", to: "mdb" }, { from: "gw", to: "u" }, { from: "gw", to: "o" }, { from: "o", to: "b", label: "event", dashed: true },
      { from: "u", to: "udb" }, { from: "o", to: "odb" }, { from: "b", to: "bdb" },
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

    { type: "h2", text: "When microservices make sense" },
    { type: "ul", items: [
      "**Many teams** (dozens of engineers or more) are slowing each other down in one codebase and release train.",
      "**Different scaling or reliability needs**: video transcoding needs GPUs and scales differently from the user profile API.",
      "**Different change rates**: a fast-moving recommendations team shouldn't wait on a slow-moving billing release.",
      "**Strong domain boundaries** are understood, so services won't need to change together for every feature.",
    ] },

    { type: "h2", text: "Doing microservices well" },
    { type: "ul", items: [
      "**Split by business capability** (orders, payments, catalogue), not by technical layer (a \"database service\").",
      "**Own your data**: no other service reads your tables; share through APIs or events.",
      "**Prefer asynchronous events** for cross-service workflows, and [sagas](/learn/saga-pattern) for multi-step transactions.",
      "**Invest in the platform first**: [service discovery](/learn/service-discovery), [observability](/learn/observability) with distributed tracing, CI/CD, [circuit breakers](/learn/circuit-breaker) and timeouts.",
      "**Avoid the distributed monolith**: services that must be deployed together, or that chain synchronous calls through five services for every request, get the costs of both styles and the benefits of neither.",
    ] },
    { type: "callout", text: "Start with a well-structured monolith and extract services where a real pressure (team autonomy, scaling, isolation) justifies the cost. Many successful companies run large modular monoliths (Shopify, Basecamp, Stack Overflow)." },
  ],
  uses: [
    { name: "Amazon and Netflix", text: "Moved to hundreds or thousands of services owned by small teams, with heavy investment in tooling for deployment, discovery and resilience." },
    { name: "Shopify", text: "Runs one of the largest Ruby on Rails monoliths, organised as a modular monolith with enforced component boundaries." },
    { name: "Segment", text: "Publicly described moving from microservices back to a monolith for a part of its system when the operational overhead outweighed the benefits." },
    { name: "Uber", text: "Grew to thousands of microservices, then introduced domain-oriented groupings to tame the complexity." },
  ],
  interview: [
    "Don't default to microservices; justify service boundaries by team ownership, scaling or isolation needs.",
    "Give each service its own data and explain how data flows between them (APIs, events).",
    "Address cross-service consistency with sagas and the outbox pattern.",
    "Mention the platform you need: discovery, gateway, tracing, resilience patterns.",
  ],
  related: ["service-discovery", "service-mesh", "api-gateway", "saga-pattern", "observability", "event-streaming-kafka"],
  practice: ["service-platform", "payment-platform", "micro-frontend-platform"],
};
