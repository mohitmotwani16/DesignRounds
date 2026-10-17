export default {
  blocks: [
    { type: "p", text: "An **offline-first** app treats the device's local database as the primary source the UI reads and writes, and **synchronises** with the server in the background whenever a connection is available. Users can keep working on a plane, in a basement or on a flaky network, and their changes are never lost. The design centres on four pieces: a local store, an outbox of pending changes, incremental sync from the server, and a rule for resolving conflicts." },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "The UI only talks to the local database. A sync engine pushes queued local changes and pulls server changes since the last cursor.", nodes: [
      { id: "ui", label: "UI", col: 0, row: 1, tone: "accent" },
      { id: "db", label: "Local database", sub: "SQLite · IndexedDB", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "outbox", label: "Outbox", sub: "pending mutations", col: 1.3, row: 2.2, shape: "queue", tone: "queue" },
      { id: "sync", label: "Sync engine", sub: "push · pull · retry", col: 2.7, row: 1.6 },
      { id: "api", label: "Sync API", sub: "changes since cursor", col: 4, row: 1.6, shape: "pill" },
    ], edges: [
      { from: "ui", to: "db", both: true }, { from: "db", to: "outbox", dashed: true }, { from: "outbox", to: "sync" },
      { from: "sync", to: "api", both: true }, { from: "sync", to: "db", dashed: true, label: "apply" },
    ] },

    { type: "h2", text: "Writing locally: the outbox" },
    { type: "ol", items: [
      "A user action writes to the local database immediately, so the UI updates instantly, and appends a mutation to an **outbox** in the same local transaction.",
      "Each mutation has a client-generated unique ID (an [idempotency key](/learn/idempotency)) and, for new records, a client-generated record ID such as a UUID, so the record can be referenced before the server knows about it.",
      "The sync engine sends outbox entries in order when online, retrying with backoff. The server deduplicates by mutation ID, so retries after a lost response are safe.",
      "Once acknowledged, the entry is removed. If the server rejects it (validation, permissions), the app must show the user and roll back or fix the local change.",
    ] },

    { type: "h2", text: "Reading changes: delta sync" },
    { type: "ul", items: [
      "The server keeps a monotonically increasing **change sequence** (or per-table updated-at versions) and exposes \"give me changes since cursor X\".",
      "The client stores the last cursor it applied and pulls only newer changes, in pages. A fresh install does an initial full sync, which may need to be limited to recent or relevant data.",
      "**Deletes** must be represented as tombstones in the change feed, otherwise clients never learn that a record disappeared.",
      "**Push notifications** or a real-time channel can tell the client to pull sooner, but the pull protocol stays the source of truth. See [push notifications](/learn/push-notifications).",
    ] },

    { type: "h2", text: "Conflict resolution" },
    { type: "p", text: "Two devices edit the same record while one is offline. When both sync, which wins?" },
    { type: "table", head: ["Strategy", "How", "Good for"], rows: [
      ["Last-write-wins (per record)", "The latest timestamp or server arrival wins", "Simple settings and records rarely edited concurrently"],
      ["Field-level merge", "Merge per field, so editing the title on one device and the due date on another keeps both", "Forms, task managers"],
      ["Server authority with rejection", "The server rejects stale versions; the client refetches and asks the user", "Inventory, bookings, money"],
      ["CRDTs", "Data types that merge automatically and deterministically", "Collaborative text, lists, counters. See [CRDTs](/learn/crdts)"],
      ["Manual resolution", "Keep both versions and let the user choose", "Documents where intent matters"],
    ] },
    { type: "callout", tone: "warning", text: "Some operations can't be offline-first: paying, booking the last seat, or anything with a global invariant. Queue them as requests with a clear \"pending\" state, and confirm with the server before showing success." },

    { type: "h2", text: "Practical concerns" },
    { type: "ul", items: [
      "**Background sync:** platforms limit background work to save battery; sync opportunistically when the app is opened, on connectivity changes, and through OS background tasks.",
      "**Schema migrations** for the local database must run safely on old app versions' data, and the sync protocol must tolerate clients on old versions. See [mobile release engineering](/learn/mobile-release-engineering).",
      "**Storage limits and eviction:** decide what to keep locally and how to page in older data.",
      "**Security:** encrypt sensitive local data and wipe it on sign-out.",
      "**UX:** show sync status, pending changes and conflicts clearly, so users trust the app.",
    ] },
  ],
  uses: [
    { name: "Notes and task apps", text: "Local-first storage with an outbox and field-level merges keeps editing instant across devices." },
    { name: "Field service and logistics", text: "Workers record deliveries and inspections offline; data syncs when coverage returns." },
    { name: "Messaging", text: "Messages are written locally with client IDs and sent from an outbox, showing pending and delivered states." },
  ],
  interview: [
    "Make the local database the UI's source of truth.",
    "Use an outbox with client-generated IDs and idempotent server handling.",
    "Pull deltas by cursor, including tombstones for deletes.",
    "Choose a conflict strategy per data type and keep invariant-critical actions online.",
  ],
  related: ["crdts", "idempotency", "browser-caching", "push-notifications", "frontend-state-management"],
  practice: ["offline-first-sync", "collaborative-whiteboard"],
  reading: [
    { title: "Local-first software", publisher: "Ink & Switch", url: "https://www.inkandswitch.com/local-first/" },
    { title: "Build an offline-first app", publisher: "Android Developers", url: "https://developer.android.com/topic/architecture/data-layer/offline-first" },
  ],
};
