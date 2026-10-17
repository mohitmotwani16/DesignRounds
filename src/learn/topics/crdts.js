export default {
  blocks: [
    { type: "p", text: "A **CRDT** (conflict-free replicated data type) is a data structure that can be updated independently on many replicas, without coordination, and always merges to the same result. Counters, sets, maps, registers and even text sequences can be built as CRDTs. They're how collaborative editors, offline-first apps and some geo-replicated databases let everyone keep working through network partitions and still converge, without a central server deciding order." },

    { type: "h2", text: "The problem they solve" },
    { type: "p", text: "Two users edit the same document offline, or two data centres accept writes during a partition. When they reconnect, the replicas hold different states. Last-write-wins discards someone's work; asking the user to resolve every conflict is painful. A CRDT defines updates and a merge so that, whatever order replicas receive each other's updates, they reach the same state. This property is called **strong eventual consistency**." },

    { type: "h2", text: "Why merges converge" },
    { type: "p", text: "A state-based CRDT's merge function must be:" },
    { type: "ul", items: [
      "**Commutative:** merge(A, B) = merge(B, A), so order doesn't matter.",
      "**Associative:** merge(merge(A, B), C) = merge(A, merge(B, C)), so grouping doesn't matter.",
      "**Idempotent:** merge(A, A) = A, so receiving the same update twice is harmless.",
    ] },
    { type: "p", text: "With those properties, replicas can gossip states in any order, with duplicates and delays, and still converge. Operation-based CRDTs instead send operations that are designed to commute, and rely on a delivery layer that delivers each operation exactly once to every replica." },

    { type: "h2", text: "Common CRDTs" },
    { type: "table", head: ["CRDT", "How it works", "Use"], rows: [
      ["G-Counter (grow-only)", "Each replica keeps its own count; the value is the sum; merge takes the per-replica maximum", "Views, likes"],
      ["PN-Counter", "Two G-Counters: increments and decrements", "Inventory deltas, votes"],
      ["LWW-Register", "A value with a timestamp; merge keeps the latest", "Simple fields where losing a concurrent write is acceptable"],
      ["MV-Register", "Keeps all concurrent values for the application to resolve", "Fields where conflicts must be visible"],
      ["OR-Set (observed-remove)", "Adds are tagged uniquely; a remove deletes only the tags it has seen, so a concurrent add survives", "Shopping carts, tags, membership"],
      ["Sequence CRDTs (e.g. RGA, Logoot-style)", "Each character gets a unique, ordered position ID, so concurrent inserts interleave deterministically", "Collaborative text editing"],
    ] },
    { type: "code", code: `
// G-Counter: one slot per replica
state A = { A: 3, B: 1 }     // A saw its own 3 increments and 1 from B
state B = { A: 2, B: 4 }
merge   = { A: max(3,2), B: max(1,4) } = { A: 3, B: 4 }   // value = 7
` },

    { type: "h2", text: "CRDTs vs operational transformation" },
    { type: "table", head: ["", "Operational transformation (OT)", "CRDTs"], rows: [
      ["How concurrency is handled", "A server transforms concurrent operations against each other", "Operations or states commute by construction"],
      ["Server", "Usually needs a central server to order operations", "Peer-to-peer or server-assisted; a server is optional"],
      ["Offline editing", "Harder; long offline periods are painful", "Natural: merge whenever reconnected"],
      ["Metadata overhead", "Low", "Can be high (IDs per character, tombstones), though modern libraries compress it well"],
      ["Examples", "Classic Google Docs-style editors", "Libraries such as Automerge and Yjs; offline-first apps"],
    ] },

    { type: "h2", text: "Costs and limits" },
    { type: "ul", items: [
      "**Metadata growth:** tombstones for deleted elements and per-replica state can grow, requiring garbage collection when all replicas have seen a deletion.",
      "**Not every invariant fits:** \"balance must never go below zero\" or \"username must be unique\" needs coordination; a CRDT can't prevent two replicas from both spending the last ₹100.",
      "**Merges can be surprising:** an OR-Set keeps an item one user removed while another re-added it, which may or may not match user intent.",
      "**Design up front:** choosing the right CRDT per field is part of the data model.",
    ] },
    { type: "callout", tone: "tip", text: "A pragmatic pattern is a hybrid: CRDTs for collaborative content and counters, and a coordinated path (a single leader or a transaction) for operations with hard invariants such as payments." },
  ],
  uses: [
    { name: "Collaborative editors and whiteboards", text: "Sequence and map CRDTs let many users edit at once, including offline, and converge." },
    { name: "Offline-first mobile apps", text: "Local changes merge with server state without losing edits." },
    { name: "Geo-replicated databases", text: "Counters and sets accept writes in every region and merge across regions." },
  ],
  interview: [
    "Define strong eventual consistency and the commutative, associative, idempotent merge.",
    "Give a G-Counter or OR-Set example and walk through a merge.",
    "Compare CRDTs with operational transformation for collaborative editing.",
    "Say which invariants need coordination instead of CRDTs.",
  ],
  related: ["consistency-models", "offline-first-sync", "geo-replication", "clocks-and-ordering", "real-time-communication"],
  practice: ["collaborative-editor", "collaborative-whiteboard", "offline-first-sync"],
  reading: [
    { title: "CRDT.tech: resources on CRDTs", publisher: "crdt.tech", url: "https://crdt.tech/" },
    { title: "Local-first software", publisher: "Ink & Switch", url: "https://www.inkandswitch.com/local-first/" },
  ],
};
