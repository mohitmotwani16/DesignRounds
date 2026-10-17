export default {
  blocks: [
    { type: "p", text: "A **Merkle tree** (hash tree) summarises a large dataset in a tree of hashes: each leaf is the hash of a block of data, and each parent is the hash of its children, up to a single **root hash**. Two copies of the data are identical if and only if their root hashes match, and if they differ, comparing hashes level by level finds exactly which blocks differ while exchanging very little data. That makes Merkle trees the standard tool for **anti-entropy repair** between replicas, and for verifying data in Git, file systems and blockchains." },

    { type: "h2", text: "How the tree is built" },
    { type: "diagram", kind: "flow", caption: "Leaves hash key ranges; each parent hashes its children. A change in one range changes its leaf and every hash on the path to the root.", nodes: [
      { id: "root", label: "Root", sub: "H(H12 + H34)", col: 1.5, row: 0, tone: "accent" },
      { id: "h12", label: "H12", sub: "H(H1 + H2)", col: 0.5, row: 1 },
      { id: "h34", label: "H34", sub: "H(H3 + H4)", col: 2.5, row: 1, tone: "danger" },
      { id: "h1", label: "H1", sub: "keys a-f", col: 0, row: 2, tone: "store" },
      { id: "h2", label: "H2", sub: "keys g-m", col: 1, row: 2, tone: "store" },
      { id: "h3", label: "H3", sub: "keys n-s", col: 2, row: 2, tone: "store" },
      { id: "h4", label: "H4", sub: "keys t-z (changed)", col: 3, row: 2, tone: "danger" },
    ], edges: [
      { from: "root", to: "h12" }, { from: "root", to: "h34" }, { from: "h12", to: "h1" }, { from: "h12", to: "h2" }, { from: "h34", to: "h3" }, { from: "h34", to: "h4" },
    ] },

    { type: "h2", text: "Finding differences between replicas" },
    { type: "ol", items: [
      "Two replicas each build a Merkle tree over the same key ranges.",
      "They exchange root hashes. If they match, the data is identical and they're done, having sent one hash.",
      "If not, they compare the children and descend only into subtrees whose hashes differ.",
      "At the leaves, they sync just the key ranges that differ.",
    ] },
    { type: "p", text: "For a dataset split into a million leaf ranges with one range out of sync, the replicas exchange about 20 levels × 2 hashes instead of comparing every key. The work is proportional to the number of differences times the depth of the tree, not to the size of the data." },

    { type: "h2", text: "Anti-entropy in distributed databases" },
    { type: "p", text: "Replicas in leaderless stores drift apart: a write misses a replica that was down, a hint is lost, or a disk is replaced. Read repair only fixes data that's read. **Anti-entropy** is the background process that compares all data. Dynamo-style systems such as Cassandra build Merkle trees per token range during a repair, exchange them between replicas, and stream only the mismatched ranges. See [Dynamo-style stores](/learn/dynamo-style-key-value-store)." },
    { type: "ul", items: [
      "**Granularity trade-off:** deeper trees find differences more precisely but cost more memory and CPU to build.",
      "**Building cost:** hashing all data is expensive, so repairs are scheduled, throttled, or done incrementally on recently changed ranges.",
      "**Moving data:** trees are tied to key ranges; when ownership changes, affected trees must be rebuilt.",
    ] },

    { type: "h2", text: "Other uses" },
    { type: "table", head: ["System", "What the Merkle structure provides"], rows: [
      ["Git", "Commits, trees and blobs are content-addressed by hash, so a commit hash identifies the whole project state and history"],
      ["Blockchains", "A block header holds the Merkle root of its transactions, so a light client can verify one transaction with a short proof"],
      ["File systems and backups", "Content-addressed chunks and hash trees detect corruption and deduplicate unchanged data"],
      ["Certificate Transparency logs", "Append-only Merkle logs let anyone verify that a certificate was logged and the log wasn't rewritten"],
      ["File sync", "Comparing hash trees of directories finds changed files quickly"],
    ] },
    { type: "callout", tone: "tip", text: "A **Merkle proof** shows that one leaf belongs to a tree with a given root by supplying the sibling hashes along its path. Its size grows with the logarithm of the number of leaves." },
  ],
  uses: [
    { name: "Cassandra and Riak repair", text: "Replicas exchange Merkle trees per range to find and fix divergent data." },
    { name: "Git", text: "Content-addressed hash trees make history tamper-evident and comparisons fast." },
    { name: "Cloud storage sync", text: "Hash trees of chunks find what changed in large files and folders." },
  ],
  interview: [
    "Explain building leaves from data ranges and parents from child hashes.",
    "Walk through descending only into mismatched subtrees.",
    "Use Merkle trees for anti-entropy in a replicated store.",
    "Mention the cost of building trees and tree granularity.",
  ],
  related: ["dynamo-style-key-value-store", "quorums", "replication", "gossip-protocol", "resumable-file-uploads"],
  practice: ["key-value-store", "file-storage"],
  reading: [
    { title: "Apache Cassandra: Repair", publisher: "Apache Cassandra documentation", url: "https://cassandra.apache.org/doc/latest/cassandra/managing/operating/repair.html" },
    { title: "Certificate Transparency: How CT works", publisher: "certificate.transparency.dev", url: "https://certificate.transparency.dev/howctworks/" },
  ],
};
