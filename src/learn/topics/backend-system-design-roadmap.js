export default {
  blocks: [
    { type: "p", text: "This **backend system design roadmap** is for backend and full-stack engineers (the SDE roles most companies hire for). Backend interviews run two kinds of design round: **high-level design (HLD)**, where you architect a whole system, and **low-level design (LLD)**, where you design the classes inside one component. The [core system design roadmap](/learn/system-design-roadmap) already covers most of the HLD round. This one picks up where it ends: low-level design, the depth interviewers probe in APIs and databases, async work that's safe to retry, and the mechanisms behind the classic questions." },
    { type: "callout", tone: "tip", text: "New to system design? Do the [core roadmap](/learn/system-design-roadmap) first. Already comfortable with load balancers, caches, queues and sharding? Start here." },

    { type: "roadmap", id: "backend" },

    { type: "h2", text: "What backend interviews actually test" },
    { type: "table", head: ["Round", "What you produce", "Where it's covered"], rows: [
      ["High-level design", "Requirements, estimates, an architecture diagram, data model and the trade-offs behind each component", "The [core roadmap](/learn/system-design-roadmap), then steps 2 to 5 here for the deep dives"],
      ["Low-level design", "Classes, interfaces and relationships for one component, plus how they handle change and concurrency", "Step 1: [SOLID](/learn/solid-principles) and [design patterns](/learn/design-patterns)"],
      ["Deep dives inside HLD", "One part of the design in detail: the API contract, the schema and its locks, the queue consumer, the failure path", "Steps 2 to 4"],
    ] },
    { type: "p", text: "Junior roles lean on a clean architecture and correct storage choices. Mid-level roles add concurrency and consistency trade-offs. Senior roles are judged on the deep dives: what breaks first, how you'd know, and what you'd change at ten times the load." },

    { type: "h2", text: "The questions this roadmap prepares you for" },
    { type: "table", head: ["Question", "Topics it leans on"], rows: [
      ["[Design a URL shortener](/system-design/url-shortener)", "API design, idempotent writes, unique IDs, caching"],
      ["[Design a ticketing platform](/system-design/ticket-booking)", "Optimistic vs pessimistic locking, transactions, queues for traffic spikes"],
      ["[Design search autocomplete](/system-design/autocomplete)", "Tries, precomputed top-k, caching at the edge"],
      ["[Design cloud file storage](/system-design/file-storage)", "Chunked and resumable uploads, object storage, metadata databases"],
      ["[Design a distributed task scheduler](/system-design/task-scheduler)", "Delayed jobs, leases, at-least-once execution"],
      ["[Design a payment platform](/system-design/payment-platform)", "Idempotency, double-entry ledgers, sagas, reconciliation"],
      ["[Design a notification service](/system-design/notification-service)", "The outbox pattern, retries, delivery guarantees"],
    ] },

    { type: "h2", text: "A three-week plan" },
    { type: "p", text: "This assumes you've finished the core roadmap, or know its topics well enough to explain them without notes." },
    { type: "ol", items: [
      "**Week 1:** steps 1 and 2. Write one LLD (a parking lot or a rate limiter class design) using the patterns in step 1, then design the API for the URL shortener with pagination, idempotency keys and error responses.",
      "**Week 2:** steps 3 and 4. For every design you practise, write the main table schema, name the index each query uses, and say what happens when two requests change the same row. Make one flow asynchronous with an outbox and walk through a consumer crashing mid-message.",
      "**Week 3:** step 5. Three full timed designs from the table above, each followed by a written list of what you'd improve.",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "How is this different from the core system design roadmap?" },
    { type: "p", text: "The core roadmap teaches the building blocks every design round uses, whatever your role: networking, storage, caching, queues, distributed systems basics and reliability. This roadmap only covers what backend interviews go deeper on, so no topic appears in both. Do the core first unless you already know it." },
    { type: "h3", text: "Is low-level design asked in every company?" },
    { type: "p", text: "No. Many product companies in India and some global ones run an LLD or machine-coding round, especially for SDE-1 and SDE-2. Others fold class design into a coding round or skip it. Check the interview loop with your recruiter, and prepare step 1 if it's listed." },
    { type: "h3", text: "Which language should I use for LLD?" },
    { type: "p", text: "Any object-oriented language you write fluently: Java, C++, Python, C# or TypeScript. Interviewers judge the structure (responsibilities, interfaces, extensibility), not the syntax." },
    { type: "h3", text: "How many design questions should I practise?" },
    { type: "p", text: "Ten to fifteen distinct questions, done properly with a review afterwards, is more useful than skimming fifty solutions. The [interview questions list](/learn/system-design-interview-questions) groups them by level." },
  ],
  related: ["system-design-roadmap", "hld-vs-lld", "system-design-interview", "api-design", "optimistic-vs-pessimistic-locking"],
  practice: ["url-shortener", "ticket-booking", "autocomplete", "file-storage"],
  reading: [
    { title: "Designing Data-Intensive Applications", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
    { title: "Refactoring Guru: Design Patterns", publisher: "Refactoring Guru", url: "https://refactoring.guru/design-patterns" },
    { title: "Microsoft REST API Guidelines", publisher: "Microsoft, GitHub", url: "https://github.com/microsoft/api-guidelines" },
  ],
};
