export default {
  blocks: [
    { type: "p", text: "This **backend system design roadmap** is for software engineers (SDE) preparing for the two design rounds most companies run: **high-level design (HLD)**, where you architect a whole system, and **low-level design (LLD)**, where you design the classes inside one component. It covers APIs, databases and concurrency, scaling with replicas, shards and caches, asynchronous processing, and the specific mechanisms behind the classic questions such as typeahead, file storage, payments and job scheduling." },
    { type: "callout", tone: "tip", text: "Already comfortable with the basics? Start at step 4. If you've never sat a design round, read the [general system design roadmap](/learn/system-design-roadmap) first; this one assumes its vocabulary." },

    { type: "roadmap", id: "backend" },

    { type: "h2", text: "What backend interviews actually test" },
    { type: "table", head: ["Round", "What you produce", "Where it's covered"], rows: [
      ["High-level design", "Requirements, estimates, an architecture diagram, data model and the trade-offs behind each component", "Steps 1 and 3 to 8"],
      ["Low-level design", "Classes, interfaces and relationships for one component, plus how they handle change and concurrency", "Step 2: [SOLID](/learn/solid-principles) and [design patterns](/learn/design-patterns)"],
      ["Deep dives inside HLD", "One part of the design in detail: the database schema, the cache, the queue consumer, the failure path", "Steps 4 to 7"],
    ] },
    { type: "p", text: "Junior roles lean on a clean architecture and correct storage choices. Mid-level roles add scaling and consistency trade-offs. Senior roles are judged on the deep dives: what breaks first, how you'd know, and what you'd change at ten times the load." },

    { type: "h2", text: "The questions this roadmap prepares you for" },
    { type: "table", head: ["Question", "Topics it leans on"], rows: [
      ["[Design a URL shortener](/system-design/url-shortener)", "API design, unique IDs, key-value storage, caching"],
      ["[Design a ticketing platform](/system-design/ticket-booking)", "Optimistic vs pessimistic locking, transactions, queues for traffic spikes"],
      ["[Design search autocomplete](/system-design/autocomplete)", "Tries, precomputed top-k, caching at the edge"],
      ["[Design cloud file storage](/system-design/file-storage)", "Chunked and resumable uploads, object storage, metadata databases"],
      ["[Design a distributed task scheduler](/system-design/task-scheduler)", "Delayed jobs, leases, at-least-once execution"],
      ["[Design a payment platform](/system-design/payment-platform)", "Idempotency, double-entry ledgers, reconciliation"],
      ["[Design a notification service](/system-design/notification-service)", "Queues, fan-out, retries, delivery guarantees"],
    ] },

    { type: "h2", text: "A four-week plan" },
    { type: "ol", items: [
      "**Week 1:** steps 1 to 3. Practise the interview framework on the URL shortener and write one LLD (a parking lot or a rate limiter class design) using the patterns in step 2.",
      "**Week 2:** steps 4 and 5. For every design you practise, write the main table schema and name the index each query uses.",
      "**Week 3:** step 6 and the first half of step 7. Make one design asynchronous and walk through what happens when a consumer crashes mid-message.",
      "**Week 4:** the rest of step 7 and step 8. Three full timed designs, each followed by a written list of what you'd improve.",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "Is low-level design asked in every company?" },
    { type: "p", text: "No. Many product companies in India and some global ones run an LLD or machine-coding round, especially for SDE-1 and SDE-2. Others fold class design into a coding round or skip it. Check the interview loop with your recruiter, and prepare step 2 if it's listed." },
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
