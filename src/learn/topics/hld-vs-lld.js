export default {
  blocks: [
    { type: "p", text: "**High-level design (HLD)** is the architecture of a whole system: which services exist, how they communicate, where data is stored, and how it scales and fails. **Low-level design (LLD)** is the design of the code inside one component: its classes, interfaces, data structures and how they collaborate. Many companies interview for both as separate rounds, often called the system design round and the machine-coding or object-oriented design round, and they reward different skills." },
    {"type":"diagram","kind":"flow","caption":"High-level design draws the system as services and data stores; low-level design zooms into one component as classes, interfaces and methods.","nodes":[{"id":"req","label":"Requirements","col":0,"row":1},{"id":"hld","label":"High-level design","sub":"services, data, scale","col":1,"row":0,"tone":"accent"},{"id":"lld","label":"Low-level design","sub":"classes, interfaces","col":1,"row":2,"tone":"queue"},{"id":"sys","label":"System diagram","sub":"boxes and arrows","col":2,"row":0},{"id":"cls","label":"Class diagram","sub":"methods, patterns","col":2,"row":2}],"edges":[{"from":"req","to":"hld"},{"from":"req","to":"lld"},{"from":"hld","to":"sys"},{"from":"lld","to":"cls"},{"from":"sys","to":"cls","label":"zoom into one part","dashed":true}]},

    { type: "h2", text: "HLD vs LLD at a glance" },
    { type: "table", head: ["", "High-level design", "Low-level design"], rows: [
      ["Scope", "The whole system, across many machines", "One service, module or feature"],
      ["Building blocks", "Services, databases, caches, queues, load balancers, CDNs", "Classes, interfaces, enums, methods, design patterns"],
      ["Main concerns", "Scale, latency, availability, consistency, data flow, cost", "Responsibilities, extensibility, readability, testability, concurrency"],
      ["Deliverable", "Architecture diagram, APIs, data model, scaling and failure plan", "Class diagram and working code (or detailed pseudocode)"],
      ["Typical questions", "Design a URL shortener, a chat system, a news feed", "Design a parking lot, an elevator system, a library system, a rate limiter class"],
      ["Assessed on", "Trade-offs and reasoning about requirements and scale", "Clean abstractions, SOLID principles, appropriate patterns, correct behaviour"],
    ] },

    { type: "h2", text: "How an HLD round runs" },
    { type: "ol", items: [
      "Clarify functional and non-functional requirements.",
      "Estimate scale: users, requests per second, storage. See [estimation](/learn/back-of-the-envelope-estimation).",
      "Define the main APIs. See [API design](/learn/api-design).",
      "Draw the high-level architecture and data flow.",
      "Design the data model and choose storage. See [SQL vs NoSQL](/learn/sql-vs-nosql).",
      "Deep dive into the hardest parts: scaling, caching, consistency, failures.",
      "Summarise trade-offs and what you'd improve.",
    ] },
    { type: "p", text: "The full framework is in [how to prepare for a system design interview](/learn/system-design-interview)." },

    { type: "h2", text: "How an LLD round runs" },
    { type: "ol", items: [
      "**Clarify requirements and scope:** for a parking lot, which vehicle types, how many floors, how pricing works, whether multiple entry gates run concurrently.",
      "**Identify entities** (nouns): ParkingLot, Floor, Spot, Vehicle, Ticket, Payment.",
      "**Define responsibilities and relationships:** which class owns what, what's an interface, what's composition vs inheritance.",
      "**Design the key interfaces and methods,** often as a class diagram.",
      "**Apply patterns where they fit:** a strategy for pricing or spot allocation, a factory for vehicles, an observer for display boards. See [design patterns](/learn/design-patterns).",
      "**Write the core code** and walk through a scenario end to end.",
      "**Discuss extensibility and concurrency:** adding a new vehicle type, two cars grabbing the same spot.",
    ] },

    { type: "h2", text: "What good looks like in each" },
    { type: "ul", items: [
      "**HLD:** requirements drive every component, numbers justify choices, the design is proportionate, and failure handling is explicit.",
      "**LLD:** each class has one clear responsibility, behaviour that varies sits behind interfaces, new requirements need additions not rewrites, and shared state is protected. See [SOLID principles](/learn/solid-principles).",
      "**Both:** state assumptions, explain trade-offs, and keep it simple until a requirement demands more.",
    ] },
    { type: "callout", tone: "tip", text: "A common LLD mistake is over-engineering: ten patterns in a parking lot. Use a pattern only when you can name the change it makes easy. A common HLD mistake is the opposite of LLD's: drawing boxes without saying why each is needed." },

    { type: "h2", text: "How they connect" },
    { type: "p", text: "Real systems need both. An HLD might include a rate limiter service; the LLD of that service decides how the token-bucket algorithm, its storage interface and its configuration are structured. Senior candidates move between levels comfortably, zooming into one component's internals during an HLD deep dive when it matters." },
  ],
  uses: [
    { name: "SDE-1 and SDE-2 interviews", text: "Often include a machine-coding or LLD round alongside, or instead of, a light HLD round." },
    { name: "Senior interviews", text: "Weight HLD heavily, with LLD-style deep dives into a critical component." },
    { name: "Design documents at work", text: "Architecture docs (HLD) and component design docs (LLD) are written at both levels." },
  ],
  interview: [
    "Ask which round you're in and adjust the level of detail.",
    "In HLD, start from requirements and scale; in LLD, from entities and responsibilities.",
    "Use design patterns only where they make a named change easy.",
    "Be ready to zoom from HLD into one component's LLD.",
  ],
  related: ["system-design-interview", "solid-principles", "design-patterns", "api-design", "back-of-the-envelope-estimation"],
  practice: ["url-shortener", "rate-limiter", "ticket-booking"],
  reading: [
    { title: "Refactoring Guru: Design Patterns", publisher: "Refactoring Guru", url: "https://refactoring.guru/design-patterns" },
    { title: "The System Design Primer", publisher: "Donne Martin, GitHub", url: "https://github.com/donnemartin/system-design-primer" },
  ],
};
