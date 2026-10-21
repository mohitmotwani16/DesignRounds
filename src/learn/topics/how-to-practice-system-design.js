// How to study and practice: why memorizing answers fails, what to learn in which order,
// and how books, mock interviews and AI practice fit together.
export default {
  blocks: [
    { type: "p", text: "There are four common ways to prepare for system design interviews: reading books and articles, watching videos, doing mock interviews with people, and practicing with an AI interviewer. They are not interchangeable. Each one trains a different part of the skill, and the best preparation combines them. Just as important is **what** you study and **how**: learning the building blocks from first principles beats memorizing finished answers." },
    { type: "diagram", kind: "flow", caption: "The practice loop that builds interview skill: learn one concept, use it in a timed round, read the review, fix the gaps, and go again.", nodes: [
      { id: "learn", label: "Learn a concept", sub: "handbook guide", col: 0, row: 0 },
      { id: "mock", label: "Timed mock round", sub: "45 minutes", col: 1, row: 0, tone: "accent" },
      { id: "review", label: "Review", sub: "rubric scores", col: 1, row: 1 },
      { id: "fix", label: "Fix the gaps", sub: "re-read, redesign", col: 0, row: 1, tone: "ok" },
    ], edges: [{ from: "learn", to: "mock" }, { from: "mock", to: "review" }, { from: "review", to: "fix" }, { from: "fix", to: "learn", label: "next round", dashed: true }] },

    { type: "h2", text: "The memorization trap" },
    { type: "p", text: "The most common way people prepare goes like this: find the popular interview problems, watch videos of their solutions, read blog posts with architecture diagrams, memorize the answers, repeat. At first it seems to work. You watch someone design Twitter with microservices, a message queue, a Redis cache and Cassandra. It makes sense, you remember it, and if you are asked to design Twitter you can redraw it." },
    { type: "p", text: "It breaks down in three ways, and more interviewers now recognize the cookie-cutter answers:" },
    { type: "ol", items: [
      "**You freeze on unfamiliar problems.** You know 30 solutions; the interviewer asks for a 31st. Bending your Twitter design to fit doesn't work cleanly, you stumble, and it shows.",
      "**Interviewers spot memorized designs.** Hundreds of candidates watched the same videos. When your diagram matches the popular one exactly, the interviewer starts probing, and you can't answer because you learned **what** the design is, not **why**. At senior level the memorized material lasts maybe the first 15–20 minutes; after that the interviewer keeps digging until they reach the edge of your knowledge.",
      "**It fails completely at staff level.** L6+ interviews are mostly deep dives. Follow-up questions quickly reveal whether you have real understanding or experience, and memorized facts collapse under that pressure.",
    ] },

    { type: "h2", text: "A better approach: fundamentals first" },
    { type: "p", text: "Learn how things actually work, and build real technical depth. If you are preparing for mid-level or senior roles with limited time, a hybrid works best:" },
    { type: "ul", items: [
      "Master the **common patterns** and the [interview template](/learn/system-design-template).",
      "Work through **10–15 common problems** to internalize the template, using the [worked problems](/learn/design-twitter) in this handbook.",
      "For every problem, **don't memorize the answer; question it.** Why does each component exist? What happens if we remove the cache? Why Cassandra rather than PostgreSQL? Why Redis rather than Memcached?",
    ] },
    { type: "p", text: "That questioning turns memorization into understanding. Faced with a new problem, you recognize the patterns inside it and adapt instead of freezing. For staff-level roles, surface knowledge is not enough: you need the depth behind each building block, because the interviewer will keep asking until they find its limit." },

    { type: "h2", text: "What to learn, in order" },
    { type: "p", text: "Each stage below builds on the one before. Foundations give you the parts and a template to assemble them; scaling pushes a design past one machine; consistency keeps it correct when data is copied and updated concurrently; the interview method turns a vague prompt into a design under time pressure." },
    { type: "diagram", kind: "flow", caption: "Four capabilities to build in order. Each one depends on the one before it.", nodes: [
      { id: "f", label: "Foundations", sub: "build a design", col: 0, row: 0, tone: "store" },
      { id: "s", label: "Scaling", sub: "handle load", col: 1, row: 0, tone: "cache" },
      { id: "c", label: "Consistency", sub: "stay correct", col: 2, row: 0, tone: "ok" },
      { id: "m", label: "Interview method", sub: "put it together", col: 3, row: 0, tone: "queue" },
    ], edges: [{ from: "f", to: "s" }, { from: "s", to: "c" }, { from: "c", to: "m" }] },

    { type: "h3", text: "1. The core challenges" },
    { type: "p", text: "Almost every web-scale, data-heavy system fights the same four problems: too many concurrent users, too much data to store and move, the need for low latency, and keeping state consistent. Start with [core design challenges](/learn/core-design-challenges), which explains each one and the conceptual fixes." },
    { type: "h3", text: "2. The core building blocks (the Lego pieces)" },
    { type: "p", text: "At a minimum, know these four moves well; they solve most scaling problems:" },
    { type: "ul", items: [
      "Scale **stateless services** with [load balancing](/learn/load-balancing).",
      "Scale **database reads** with [replication](/learn/replication) and [caching](/learn/caching).",
      "Scale **database writes** with [partitioning (sharding)](/learn/sharding).",
      "Scale **data flow** with [message queues](/learn/message-queues).",
    ] },
    { type: "p", text: "With those, the [system design template](/learn/system-design-template) solves a large share of interview problems: a write path that goes through a queue to a database, and a read path served from a cache." },
    { type: "h3", text: "3. The additional building blocks" },
    { type: "ul", items: [
      "**Processing big data** with [batch](/learn/mapreduce) and [stream processing](/learn/stream-processing). Essential for data-heavy problems such as an analytics dashboard.",
      "**Consistency across services** with distributed transactions, the [saga pattern](/learn/saga-pattern) or [event sourcing](/learn/event-sourcing-cqrs). Essential for problems with strict correctness needs, such as payments or banking.",
      "**Full-text search** with an [inverted index](/learn/search-and-inverted-index).",
      "**Long-term analytical storage** in a [data warehouse](/learn/data-warehouse-vs-data-lake).",
    ] },
    { type: "h3", text: "4. Problem-specific knowledge" },
    { type: "p", text: "Some problems need specialist knowledge: [geohashing and quadtrees](/learn/geospatial-indexing) for location services like Yelp or Uber, operational transforms or [CRDTs](/learn/crdts) for collaborative editors like Google Docs, a [trie](/learn/typeahead-autocomplete) for autocomplete. Learn these case by case. Interviews are meant to test general design skill rather than niche facts, but knowing them tells you where to start when one of these problems comes up." },
    { type: "h3", text: "5. Practice on real problems" },
    { type: "p", text: "Finally, apply the blocks to complete problems, end to end, under time pressure. Reading a solution after you have tried the problem yourself teaches far more than reading it first." },

    { type: "h2", text: "A study path through this handbook" },
    { type: "p", text: "Pick the entry point that matches where you are:" },
    { type: "ul", items: [
      "**Interviewing tomorrow?** Read the [system design template](/learn/system-design-template); it is the pattern that solves most problems.",
      "**Want the core ideas quickly?** Read [core design challenges](/learn/core-design-challenges) and [scalability](/learn/scalability).",
      "**New to system design?** Start with the components: [load balancing](/learn/load-balancing), [caching](/learn/caching), [SQL vs NoSQL](/learn/sql-vs-nosql), [object storage](/learn/object-storage), [CDNs](/learn/cdn), [message queues](/learn/message-queues) and [API gateways](/learn/api-gateway).",
      "**Know the components but not the interview?** Follow the [problem decomposition framework](/learn/problem-decomposition-framework) and the worked [Twitter design](/learn/design-twitter).",
    ] },
    { type: "p", text: "For deeper study, the handbook is organized into tracks:" },
    { type: "table", head: ["Track", "What it covers", "Start with"], rows: [
      ["Services and communication", "How services talk: synchronous calls, queues, Kafka, circuit breakers, service discovery, and why async communication contains failures", "[Sync vs async](/learn/sync-vs-async-communication), [circuit breaker](/learn/circuit-breaker)"],
      ["Scaling services", "Load balancing, autoscaling, caching patterns, CDNs, cache stampedes", "[Stateless vs stateful](/learn/stateless-vs-stateful), [cache strategies](/learn/cache-strategies)"],
      ["Data storage", "B-trees, LSM trees, SQL vs NoSQL, document vs key-value stores, OLTP vs OLAP", "[Indexing](/learn/database-indexing), [OLTP vs OLAP](/learn/oltp-vs-olap)"],
      ["Scaling data", "Replication, partitioning, consistent hashing, change data capture, rebalancing", "[Scaling databases](/learn/scaling-databases)"],
      ["Batch and stream processing", "MapReduce, stream processing, windows, Lambda and Kappa architectures", "[Batch vs stream](/learn/batch-vs-stream-processing)"],
      ["Patterns", "Rate limiting, unique IDs, sagas, fan-out, pre-computation", "[Rate limiting](/learn/rate-limiting), [fan-out](/learn/fan-out)"],
      ["Transactions", "Isolation levels, pessimistic vs optimistic locking, flash-sale inventory patterns, preventing double-booking", "[Isolation levels](/learn/transactions-isolation-levels), [locking](/learn/optimistic-vs-pessimistic-locking)"],
      ["Distributed systems theory", "CAP and PACELC theorems, consistency models, consensus (Raft, Paxos), failure handling: the theory behind the practice", "[CAP theorem](/learn/cap-theorem), [consensus](/learn/consensus)"],
      ["Geospatial search", "Geohash, quadtrees, H3 hexagonal indexing, the S2 library: how Uber finds nearby drivers", "[Geospatial indexing](/learn/geospatial-indexing)"],
      ["Search engines", "Inverted indexes, TF-IDF, BM25, Elasticsearch architecture: how search actually works", "[Search and inverted indexes](/learn/search-and-inverted-index)"],
      ["Media systems", "Video transcoding, file chunking, adaptive bitrate streaming: how Netflix delivers video", "[Video streaming](/learn/video-streaming-adaptive-bitrate), [resumable uploads](/learn/resumable-file-uploads)"],
      ["Probabilistic data structures", "Bloom filters, count-min sketch, HyperLogLog: memory-efficient approximations at massive scale", "[Probabilistic data structures](/learn/probabilistic-data-structures)"],
    ] },

    { type: "h2", text: "The comparison at a glance" },
    { type: "table", head: ["Method", "Best for", "Feedback", "Cost", "Availability"], rows: [
      ["Books and articles", "Concepts and vocabulary", "None", "Low", "Any time"],
      ["Videos and walkthroughs", "Seeing a full design explained", "None", "Free to low", "Any time"],
      ["Peer mock interviews", "Realistic pressure", "Varies with your partner", "Free", "Needs scheduling"],
      ["Paid mock interviews", "Expert, calibrated feedback", "High quality", "High per session", "Needs scheduling"],
      ["AI practice", "Frequent full rounds with instant feedback", "Rubric-based and consistent", "Free to low", "Any time"],
    ] },

    { type: "h2", text: "Books, articles and videos" },
    { type: "p", text: "Reading and watching are the fastest way to learn the building blocks: caching strategies, replication, partitioning, queues and consistency models. They are essential early on." },
    { type: "p", text: "Their limit is that they are passive. Watching someone design a news feed teaches you to recognize a good design, not to produce one under time pressure. Many candidates over-invest here and discover the gap only in the real interview." },

    { type: "h2", text: "Mock interviews with people" },
    { type: "p", text: "A mock interview with another engineer is the closest thing to the real experience. You get the pressure, the follow-up questions and the need to think out loud." },
    { type: "p", text: "Peer mocks are free, but feedback quality depends heavily on your partner. Paid mocks with experienced interviewers give calibrated, expert feedback, but cost adds up quickly and sessions need scheduling. Most people can afford only a few, so they are best saved for the final weeks." },

    { type: "h2", text: "AI practice" },
    { type: "p", text: "AI practice fills the gap between passive learning and scarce mock interviews: complete design rounds whenever you have 45 minutes, with immediate feedback. A good AI interviewer asks follow-up questions about your choices, and a rubric-based review shows which dimension is weakest so you know what to fix before the next round." },
    { type: "p", text: "Its limits are worth stating plainly. An AI reviewer is not a senior engineer from your target company, and it can miss nuance. It is most valuable for **volume and consistency**: doing many full rounds and repeating them, which is the part of preparation people usually skip." },
    { type: "callout", text: "[DesignRounds](/) is an AI practice platform: you design on an architecture canvas, an AI interviewer asks why, and a review scores six dimensions. Practice rounds and an AI review for each are free." },

    { type: "h2", text: "A combined plan that works" },
    { type: "ol", items: [
      "**Weeks 1–2:** learn the building blocks from the handbook, books and videos, and start doing one or two full practice rounds a week.",
      "**Weeks 2–4:** shift most of your time to complete rounds with feedback. After each round, read a worked solution and question every difference. Repeat your weakest rounds.",
      "**Final week:** do one or two mock interviews with a person to rehearse the pressure and the conversation.",
    ] },
    { type: "p", text: "For specific books, guides, AI practice platforms and mock interview services, compared side by side, see [the best system design interview resources](/learn/best-system-design-interview-resources)." },
    { type: "p", text: "Ready to start? Pick a question from the [practice library](/library) or begin with a [URL shortener](/system-design/url-shortener), a classic first round." },
  ],
  related: ["best-system-design-interview-resources", "system-design-interview", "system-design-template", "core-design-challenges", "system-design-interview-questions", "back-of-the-envelope-estimation"],
};
