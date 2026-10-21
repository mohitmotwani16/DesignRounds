export default {
  blocks: [
    { type: "p", text: "**Scalability** is a system's ability to handle more load (more users, requests, or data) by adding resources, without being redesigned. A scalable system's cost and latency grow smoothly with load instead of hitting a wall. There are two basic ways to add resources: make a machine bigger, or add more machines." },

    { type: "h2", text: "A story: from one server to many" },
    { type: "p", text: "Say you build an online pet-supplies store for your uncle. It starts like everyone's first web app: a server written in PHP or Node.js, with MySQL or MongoDB behind it, probably on the same machine. The server takes a request, asks the database for data and returns it to the user's device. You rent a $5-a-month VPS (1 GB of memory, a 25 GB SSD) from a provider like DigitalOcean, buy a domain, point its DNS record at the VPS's IP address, and the store is live. Life is simple." },
    { type: "diagram", kind: "flow", caption: "Stage 1: one small server runs both the web app and the database.", zones: [{ label: "One VPS · 1 GB RAM", from: [1, 0], to: [2, 0], tone: "accent" }], nodes: [
      { id: "u", label: "Users", col: 0, row: 0, shape: "pill" },
      { id: "w", label: "Web server", sub: "PHP / Node.js", col: 1, row: 0 },
      { id: "d", label: "Database", sub: "MySQL", col: 2, row: 0, shape: "db", tone: "store" },
    ], edges: [{ from: "u", to: "w", label: "DNS → VPS IP" }, { from: "w", to: "d" }] },
    { type: "p", text: "The store gets popular and the little VPS can't keep up. The obvious fix is a bigger server, say $10 a month for 4 GB of memory and an 80 GB SSD. That is **vertical scaling**." },
    { type: "diagram", kind: "flow", caption: "Stage 2: vertical scaling, the same setup on a bigger machine.", nodes: [
      { id: "s", label: "Small VPS", sub: "$5/mo · 1 GB · 25 GB SSD", col: 0, row: 0 },
      { id: "b", label: "Bigger VPS", sub: "$10/mo · 4 GB · 80 GB SSD", col: 1.6, row: 0, tone: "accent" },
    ], edges: [{ from: "s", to: "b", label: "scale up" }] },
    { type: "p", text: "Business keeps booming: from friends to the whole state, to all 50 states, then to international customers. You keep moving to the next size up, until that stops working:" },
    { type: "ul", items: [
      "**One server is a single point of failure.** If it goes down, the whole store goes down (and your uncle calls, frantically).",
      "**There's a ceiling, and the price climbs steeply near it.** Even very large instances, such as an x1.16xlarge with 64 vCPUs and 976 GiB of memory, or high-memory machines with tens of TiB of RAM, eventually hit limits, and cost grows disproportionately with size.",
    ] },
    { type: "p", text: "So you switch to **horizontal scaling**: instead of one ever-bigger server, run a team of smaller ones, with a [load balancer](/learn/load-balancing) in front acting as foreman: it forwards each request to one of the servers and passes the response back. To make that work, the servers must be [stateless](/learn/stateless-vs-stateful): any of them must be able to handle any user's request." },

    { type: "h2", text: "Vertical scaling (scale up)" },
    { type: "p", text: "Vertical scaling means moving to a bigger machine: more CPU cores, more memory, faster disks. It needs no code changes, which makes it the right first move surprisingly often. A single modern server with 64+ cores and hundreds of GB of RAM can serve tens of thousands of requests per second, and a well-tuned PostgreSQL instance on one machine runs many successful businesses." },
    { type: "ul", items: [
      "**Pros:** simple, no distributed-systems problems, strong consistency for free, low latency (everything is local).",
      "**Cons:** a hard ceiling (the biggest machine you can buy), price grows faster than capacity at the top end, and the machine is a **single point of failure**. Upgrading usually means downtime.",
    ] },

    { type: "h2", text: "Horizontal scaling (scale out)" },
    { type: "p", text: "Horizontal scaling means adding more machines and splitting the work between them. It has no practical ceiling and gives you redundancy, since losing one of twenty servers costs 5% of capacity, not 100%. The price is complexity: requests need routing, data needs splitting or copying, and machines can disagree." },
    { type: "diagram", kind: "flow", caption: "Scale up: one bigger box. Scale out: many identical boxes behind a load balancer, with state moved to shared stores.", nodes: [
      { id: "u1", label: "Users", col: 0, row: 0, shape: "pill" },
      { id: "big", label: "One big server", sub: "64 cores · 512 GB", col: 1, row: 0, tone: "muted", w: 160 },
      { id: "u2", label: "Users", col: 0, row: 1.6, shape: "pill" },
      { id: "lb", label: "Load balancer", col: 1, row: 1.6, tone: "accent" },
      { id: "a1", label: "App server", col: 2, row: 1 },
      { id: "a2", label: "App server", col: 2, row: 1.6 },
      { id: "a3", label: "App server", col: 2, row: 2.2 },
      { id: "db", label: "Shared data", sub: "DB · cache", col: 3, row: 1.6, shape: "db", tone: "store" },
    ], edges: [
      { from: "u1", to: "big" }, { from: "u2", to: "lb" },
      { from: "lb", to: "a1" }, { from: "lb", to: "a2" }, { from: "lb", to: "a3" },
      { from: "a1", to: "db" }, { from: "a2", to: "db" }, { from: "a3", to: "db" },
    ], zones: [{ label: "Vertical", from: [0, 0], to: [1, 0] }, { label: "Horizontal", from: [0, 1], to: [3, 2.2], tone: "accent" }] },

    { type: "h2", text: "The key to scaling out: stateless services" },
    { type: "p", text: "A service is **stateless** when any instance can handle any request because nothing about a user lives in one instance's memory. Stateless tiers scale out trivially: put a [load balancer](/learn/load-balancing) in front and add instances. To get there, move state somewhere shared:" },
    { type: "ul", items: [
      "**Sessions** into Redis or a signed token instead of server memory.",
      "**Uploaded files** into [object storage](/learn/object-storage) instead of local disk.",
      "**Background work** onto a [queue](/learn/message-queues) instead of in-process threads that die with the instance.",
    ] },
    { type: "p", text: "After that, the hard part of scaling is almost always **the data tier**, because data can't simply be copied around freely." },

    { type: "h2", text: "Scaling the data tier" },
    { type: "table", head: ["Technique", "What it scales", "Main cost"], rows: [
      ["[Caching](/learn/caching)", "Reads of hot data", "Staleness and invalidation"],
      ["Read [replicas](/learn/replication)", "Read throughput", "Replication lag: replicas can be slightly behind"],
      ["[Sharding](/learn/sharding)", "Writes and data size", "Cross-shard queries, rebalancing, operational load"],
      ["[Denormalization](/learn/normalization-denormalization)", "Read cost per query", "Duplicate data to keep in sync"],
      ["[Async processing](/learn/message-queues)", "Spiky writes and slow work", "Eventual consistency, more moving parts"],
      ["[CDN](/learn/cdn)", "Static and cacheable content globally", "Invalidation, cost"],
    ] },

    { type: "h2", text: "How systems typically grow" },
    { type: "ol", items: [
      "**One server** runs the app and the database. Fine for a prototype.",
      "**Separate the database** onto its own machine; scale both vertically.",
      "**Stateless app servers behind a load balancer**; sessions in Redis.",
      "**Cache and CDN** take most reads off the database.",
      "**Read replicas** for the remaining read load; writes still go to one primary.",
      "**Async work via queues** for email, image processing, and fan-out.",
      "**Shard** the largest tables, or move them to a horizontally scalable store, once writes or data size outgrow one primary.",
      "**Split services and go multi-region** for team autonomy and global latency.",
    ] },
    { type: "callout", text: "Scale for the load you have plus the next order of magnitude, not for a hypothetical billion users. Every step above adds operational cost; take it when an estimate or a metric says you need it. See [back-of-the-envelope estimation](/learn/back-of-the-envelope-estimation)." },

    { type: "h2", text: "Scalability is not the same as performance" },
    { type: "p", text: "A **performance** problem means the system is slow for a single user. A **scalability** problem means it is fast for one user but slow, or failing, under load. Adding servers fixes the second, not the first. A query that takes 2 seconds on an idle database needs an [index](/learn/database-indexing), not more machines." },
    { type: "p", text: "Also watch for **Amdahl's law**: the part of the work that can't be parallelised caps the speedup. If every request takes a lock on one database row, a thousand app servers won't help." },
  ],
  uses: [
    { name: "Stack Overflow", text: "Famously served one of the busiest sites on the web from a handful of large, vertically scaled SQL Server and web machines, showing how far scaling up can go." },
    { name: "Netflix and Amazon", text: "Run thousands of stateless service instances behind load balancers in auto-scaling groups that grow and shrink with traffic." },
    { name: "Instagram", text: "Scaled PostgreSQL by sharding into thousands of logical shards mapped onto a smaller number of physical servers, moving shards as load grew." },
    { name: "Shopify", text: "Splits merchants into pods, each with its own database shard, so a flash sale on one store can't take down the others." },
  ],
  interview: [
    "Start with a simple design and scale it in response to your own estimates; say which component breaks first and why.",
    "State that app servers are stateless and where the state lives, then put them behind a load balancer.",
    "Spend your scaling discussion on the data tier: caching, replicas, then sharding, with the cost of each.",
    "Separate performance problems from scalability problems: don't add servers to fix a missing index.",
  ],
  related: ["load-balancing", "back-of-the-envelope-estimation", "sharding", "replication", "caching", "autoscaling"],
  practice: ["url-shortener", "news-feed", "chat-system"],
};
