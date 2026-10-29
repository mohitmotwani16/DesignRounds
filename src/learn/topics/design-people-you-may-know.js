// Case study: People You May Know, graph-based friend and connection recommendations.
export default {
  blocks: [
    { type: "p", text: "**The question**: design \"People You May Know\" (PYMK) for a social or professional network: suggest people a user is likely to know and connect with. It's a recommendation problem on a **graph**, where the strongest signals are mutual connections, shared schools and workplaces, and contacts, and where the candidate space (every member) is too large to score directly." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Goal?", "More meaningful connections, which drive engagement and retention, especially for new users"],
      ["Scale?", "1B users, average 300 connections, graph of ~150B edges"],
      ["Surfaces?", "A PYMK module on the home page and the network tab; also emails"],
      ["Freshness?", "Suggestions can be computed daily, but should react to a new connection within minutes"],
      ["Constraints?", "Privacy: don't reveal sensitive relationships; allow opting out; respect blocks"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "**Link prediction**: for a (viewer, candidate) pair, predict p(connection request sent **and accepted**) within some window. Optimising only sends would reward spammy suggestions; acceptance captures real relationships." },

    { type: "h2", text: "3. Candidate generation" },
    { type: "p", text: "Scoring a billion people per user is impossible, so generate a few thousand candidates from several sources:" },
    { type: "diagram", kind: "flow", caption: "Candidate sources for PYMK. Friends-of-friends gives most good candidates; shared affiliations and contacts add people with few mutual friends; graph embeddings find the rest.", nodes: [
      { id: "u", label: "Viewer", col: 0, row: 1.2, shape: "pill" },
      { id: "fof", label: "Friends of friends", sub: "2-hop walk", col: 1.4, row: 0, tone: "accent" },
      { id: "aff", label: "Shared affiliations", sub: "school · employer", col: 1.4, row: 0.8 },
      { id: "con", label: "Imported contacts", sub: "with consent", col: 1.4, row: 1.6 },
      { id: "emb", label: "Graph embeddings", sub: "ANN neighbours", col: 1.4, row: 2.4, tone: "store" },
      { id: "m", label: "Merge + dedupe", sub: "~3,000", col: 2.9, row: 1.2 },
      { id: "r", label: "Ranker", sub: "p(accept)", col: 4.2, row: 1.2, tone: "accent" },
      { id: "out", label: "Top 20", col: 5.4, row: 1.2, shape: "pill" },
    ], edges: [
      { from: "u", to: "fof" }, { from: "u", to: "aff" }, { from: "u", to: "con" }, { from: "u", to: "emb" },
      { from: "fof", to: "m" }, { from: "aff", to: "m" }, { from: "con", to: "m" }, { from: "emb", to: "m" }, { from: "m", to: "r" }, { from: "r", to: "out" },
    ] },
    { type: "ul", items: [
      "**Friends of friends (FoF):** with 300 connections each, a user has up to ~90,000 two-hop neighbours. Keep those with the most mutual connections (cap per hop to avoid celebrities exploding the walk).",
      "**Shared affiliations:** same school and graduation years, same employer and team, same city.",
      "**Contacts:** people whose phone number or email is in the user's uploaded address book (and vice versa), with consent.",
      "**Graph embeddings:** node embeddings (node2vec-style random walks, or a graph neural network) placed in an [ANN index](/learn/vector-databases) to find people close in the graph who aren't two hops away.",
    ] },

    { type: "h2", text: "4. Features and model" },
    { type: "table", head: ["Group", "Examples"], rows: [
      ["Graph overlap", "Number of mutual connections, Adamic-Adar score (mutuals weighted by how selective they are), common neighbours ratio"],
      ["Affiliation", "Same school and overlapping years, same company and overlapping tenure, same city"],
      ["Interaction", "Profile views in either direction, appearing in the same group or thread, tagged together"],
      ["Candidate", "Account age, connection count, acceptance rate of past requests, activity"],
      ["Viewer", "Network size (new users need suggestions most), recent activity"],
      ["Embedding", "Similarity of viewer and candidate graph embeddings"],
    ] },
    { type: "p", text: "A gradient-boosted tree or deep ranker predicts p(accept). **Mutual connections** are typically the strongest feature, but weighting them (a mutual who has 5,000 connections means less than one who has 50) improves results. See [embeddings](/learn/embeddings) and [choosing a model](/learn/ml-model-selection)." },

    { type: "h2", text: "5. Batch plus real-time serving" },
    { type: "diagram", kind: "flow", caption: "PYMK runs mostly offline: a daily graph job generates and scores candidates into a key-value store. A real-time path reacts to new connections by adding their friends as fresh candidates.", nodes: [
      { id: "graph", label: "Graph snapshot", col: 0, row: 0.3, shape: "db", tone: "store" },
      { id: "batch", label: "Daily batch job", sub: "candidates + scores", col: 1.4, row: 0.3, tone: "accent" },
      { id: "kv", label: "Suggestions store", sub: "user → top 200", col: 2.8, row: 1, shape: "db", tone: "cache" },
      { id: "ev", label: "New connection event", col: 0, row: 1.7, shape: "queue", tone: "queue", w: 160 },
      { id: "rt", label: "Real-time updater", sub: "add new FoF", col: 1.4, row: 1.7 },
      { id: "api", label: "PYMK API", sub: "filter + rerank", col: 4.2, row: 1, tone: "ok" },
    ], edges: [
      { from: "graph", to: "batch" }, { from: "batch", to: "kv" }, { from: "ev", to: "rt" }, { from: "rt", to: "kv" }, { from: "kv", to: "api" },
    ] },
    { type: "code", code: `Daily batch : 1B users × ~3,000 candidates = 3T pairs to score → too many;
              prune FoF by mutual count first (keep ~500), score 500B pairs on a big
              Spark/GPU cluster, store top 200 per user: 1B × 200 × 8 B ≈ 1.6 TB
Online      : read top 200, drop already connected/pending/dismissed/blocked,
              light rerank with fresh signals, return 20 in < 50 ms` },

    { type: "h2", text: "6. Product and privacy rules" },
    { type: "ul", items: [
      "Never suggest people the viewer blocked or who blocked them; respect \"don't suggest me\" settings.",
      "Be careful with sensitive inference: suggesting a therapist's other patients, or revealing that two people share a contact, is a real harm. Exclude sensitive contact categories and some signals entirely.",
      "Remove a suggestion after dismissal and don't bring it back for a long time.",
      "Limit how many times one person is suggested to others per day, so popular users aren't flooded with requests.",
    ] },

    { type: "h2", text: "7. Evaluation" },
    { type: "ul", items: [
      "**Offline:** recall@k of connections formed in the following week (time-based split); AUC of p(accept).",
      "**Online:** accepted connections per user, acceptance rate of sent requests, new-user connections in the first week, plus guardrails: request ignore and report rates.",
      "Watch the **graph effect**: a test arm changes who connects to whom, which affects control users too. Cluster-based randomisation (by community) reduces this leakage. See [A/B testing](/learn/ab-testing-experimentation).",
    ] },
  ],
  uses: [
    { name: "Social networks", text: "Friend suggestions dominated by mutual friends, contacts and shared groups." },
    { name: "Professional networks", text: "Connection suggestions weighted towards shared employers, schools and industry." },
    { name: "Follow suggestions", text: "\"Who to follow\" mixes graph proximity with interest similarity and creator popularity." },
  ],
  interview: [
    "Frame it as link prediction on accepted connections, not sent requests.",
    "Generate candidates from friends of friends, affiliations, contacts and graph embeddings.",
    "Compute heavy scoring in daily batch, with a real-time path for new connections.",
    "Address privacy, blocking and the network effect in experiments.",
  ],
  related: ["recommendation-system-design", "embeddings", "two-stage-processing", "ab-testing-experimentation", "cold-start-problem"],
  practice: ["people-you-may-know", "recommendation-engine", "news-feed"],
  reading: [
    { title: "node2vec: Scalable Feature Learning for Networks", publisher: "Grover and Leskovec, KDD 2016", url: "https://arxiv.org/abs/1607.00653" },
    { title: "Inductive Representation Learning on Large Graphs (GraphSAGE)", publisher: "Hamilton et al., NeurIPS 2017", url: "https://arxiv.org/abs/1706.02216" },
  ],
};
