// Turning a vague prompt into requirements: verbs become use cases, nouns become entities
// with an owner, adjectives become constraints that justify components.
export default {
  blocks: [
    { type: "p", text: "System design prompts usually arrive as one vague line: \"Design Twitter\" or \"Design Uber\". The first job is to turn that into concrete technical requirements. Instead of guessing what the interviewer wants, use the **words in the problem statement as anchors**. Three kinds of words carry three kinds of information:" },
    { type: "diagram", kind: "flow", caption: "The decomposition framework: each part of speech in the prompt yields one part of the design.", nodes: [
      { id: "p", label: "Problem statement", sub: "\"Users post tweets…\"", col: 0, row: 1, tone: "accent" },
      { id: "v", label: "Verbs", sub: "post, view, follow", col: 1.4, row: 0 },
      { id: "n", label: "Nouns", sub: "user, tweet, follow", col: 1.4, row: 1 },
      { id: "a", label: "Adjectives", sub: "instant, reliable", col: 1.4, row: 2 },
      { id: "uc", label: "Use cases and APIs", col: 2.8, row: 0, tone: "ok" },
      { id: "en", label: "Entities and ownership", col: 2.8, row: 1, tone: "store" },
      { id: "co", label: "Constraints and components", col: 2.8, row: 2, tone: "cache" },
    ], edges: [{ from: "p", to: "v" }, { from: "p", to: "n" }, { from: "p", to: "a" }, { from: "v", to: "uc" }, { from: "n", to: "en" }, { from: "a", to: "co" }] },

    { type: "h2", text: "Step 0: verbs become use cases" },
    { type: "p", text: "Verbs reveal **operations**. \"Users can post tweets\" contains *post*; \"users view their feed\" contains *view*. Pull out every verb and each one becomes a use case, a functional requirement and usually an API endpoint. Most verbs map to CRUD or a few extras: create, read, update, delete, search, notify, process." },
    { type: "p", text: "Don't stop at listing them. For each one, define what **correct** means:" },
    { type: "ul", items: [
      "Does \"post a tweet\" deduplicate identical posts?",
      "Must followers see a new tweet immediately, or is eventually acceptable?",
      "Must posts be kept forever? Can deleted ones be recovered?",
    ] },
    { type: "p", text: "These questions turn a fuzzy verb into a precise contract, and the answers feed directly into the consistency and storage decisions later." },

    { type: "h2", text: "Step 1: nouns become entities and ownership" },
    { type: "p", text: "Nouns reveal **data models**. \"Users post tweets\" has two nouns, *users* and *tweets*. \"Users follow other users\" reveals a relationship entity, *follow*. List every entity and how they relate; they usually become your tables or collections." },
    { type: "p", text: "Then, for each entity, name its **source of truth**. Who owns user profiles? Where do tweets live? Which service controls the follow relationship? Ownership decides **write authority**: only the user service updates profiles, only the tweet service creates tweets. Clear ownership prevents two services from writing the same data in conflicting ways and draws the consistency boundaries of the system. See [database per service](/learn/database-per-service)." },

    { type: "h2", text: "Step 2: adjectives become constraints and add-ons" },
    { type: "p", text: "Adjectives reveal **non-functional requirements**, and those force architectural choices. \"Instant notifications\" contains *instant*, which needs real-time push or precomputation. \"Highly available feed\" contains *highly available*, which needs replication and stateless services." },
    { type: "table", head: ["Adjective", "Components it justifies"], rows: [
      ["Instant / real-time", "Push notifications, [WebSockets](/learn/real-time-communication), [caching](/learn/caching), [precomputation](/learn/precomputation-pattern)"],
      ["Reliable", "[Retries](/learn/retries-and-timeouts), [idempotency](/learn/idempotency), [dead-letter queues](/learn/message-queues), [write-ahead logs](/learn/write-ahead-log)"],
      ["Highly available", "[Replication](/learn/replication), [stateless services](/learn/stateless-vs-stateful), [health checks](/learn/health-checks-failover)"],
      ["Auditable / secure", "[Encryption](/learn/encryption), [access control](/learn/authorization-rbac-abac-oauth), audit logs, compliance"],
      ["Scalable", "[Partitioning](/learn/sharding), read replicas, [message queues](/learn/message-queues), horizontal scaling"],
      ["Durable", "Replicated storage, backups, [write-ahead logs](/learn/write-ahead-log)"],
      ["Consistent / correct", "[Transactions](/learn/transactions-isolation-levels), [locking](/learn/optimistic-vs-pessimistic-locking), [sagas](/learn/saga-pattern)"],
      ["Low latency", "Caches, CDNs, precomputation, data placed near users"],
    ] },
    { type: "p", text: "Each adjective adds components. The goal isn't to cram in every technology; it's to **justify each addition by tying it to a specific constraint**. If no adjective asks for it, leave it out." },

    { type: "h2", text: "Worked example: Twitter" },
    { type: "table", head: ["Step", "Extracted", "Result"], rows: [
      ["Verbs", "post, view, follow, like, comment", "Five use cases and one endpoint each: `POST /tweet`, `GET /feed`, `POST /follow`…"],
      ["Nouns", "user, tweet, follow, like, comment", "Entities User, Tweet, Follow, Engagement (likes and comments merged), each owned by one service"],
      ["Adjectives", "low latency, highly available, scalable, durable", "Feed cache, message queue, load-balanced instances and sharding, replicated databases"],
    ] },
    { type: "p", text: "The complete walkthrough is in [Design Twitter](/learn/design-twitter)." },

    { type: "h2", text: "Worked example: a ride-hailing app" },
    { type: "p", text: "Prompt: \"Riders request rides and are matched with nearby drivers in real time. Drivers share their location continuously. Payments must be reliable.\"" },
    { type: "ul", items: [
      "**Verbs**: request (a ride), match, share (location), pay. Use cases: create a ride request, find and assign a driver, ingest location updates, charge the rider.",
      "**Nouns**: rider, driver, ride, location, payment. Owners: the ride service owns rides and their state machine; the location service owns the latest driver positions; the payment service owns charges.",
      "**Adjectives**: *nearby* → a [geospatial index](/learn/geospatial-indexing); *real time* → WebSockets or push and in-memory location storage; *continuously* → a high-write ingestion path, often through a log like Kafka; *reliable* (payments) → idempotency keys, retries and a [saga](/learn/saga-pattern) across ride and payment.",
    ] },

    { type: "h2", text: "Worked example: a file sync service" },
    { type: "p", text: "Prompt: \"Users upload large files and see them on all their devices. Uploads should resume after a network drop. Sharing must be secure.\"" },
    { type: "ul", items: [
      "**Verbs**: upload, sync, share. Use cases: chunked upload, change notification to other devices, grant access.",
      "**Nouns**: user, file, chunk, device, share. The metadata service owns files and versions; blobs live in [object storage](/learn/object-storage).",
      "**Adjectives**: *large* → chunking and direct-to-storage uploads; *resume* → [resumable uploads](/learn/resumable-file-uploads) with per-chunk checksums; *all devices* → push notifications or long polling for changes; *secure* → presigned URLs, encryption and access checks.",
    ] },
  ],
  uses: [
    { name: "Interviews", text: "The first 5–10 minutes of any design round: it produces the functional requirements, the entity list and the non-functional requirements in a form you can design against." },
    { name: "Design docs", text: "The same extraction works on a real product brief: verbs become the API surface, nouns the data model, adjectives the SLOs." },
    { name: "Reviewing a design", text: "Check every component in someone's diagram against the adjectives; anything that doesn't trace back to a constraint is a candidate to remove." },
  ],
  interview: [
    "Read the prompt back as verbs, nouns and adjectives; it shows structure and gives the interviewer a chance to correct scope early.",
    "Ask what \"correct\" means for each verb before you design.",
    "Name an owner for every entity.",
    "When you add a component later, say which adjective it serves.",
  ],
  related: ["system-design-interview", "design-twitter", "non-functional-requirements", "system-design-template", "api-design"],
  practice: ["news-feed", "ride-hailing", "file-storage"],
};
