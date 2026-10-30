export default {
  blocks: [
    { type: "p", text: "LLMs are stateless: each call sees only what's in its prompt. **Agent memory** is the application's job of deciding what an assistant remembers, within one conversation (**short-term memory**, limited by the context window) and across conversations (**long-term memory**, stored outside the model and retrieved when relevant). Done well, memory makes assistants feel personal and lets agents work on long tasks; done badly, it leaks private data, bloats costs and lets one poisoned note steer every future answer." },

    { type: "h2", text: "Types of memory" },
    { type: "table", head: ["Type", "Holds", "Where it lives", "Example"], rows: [
      ["Working (short-term)", "The current conversation and task state", "The prompt / context window", "Last 10 turns, current plan, tool results"],
      ["Episodic", "Past interactions and their outcomes", "Database + vector index", "\"Last week the user asked about migrating to annual billing\""],
      ["Semantic", "Facts and preferences about the user or domain", "Key-value or document store", "\"Prefers Python; works in UTC+5:30; on the Pro plan\""],
      ["Procedural", "How to do things: instructions, learned rules", "System prompt, skills files", "\"Always run tests before proposing a commit\""],
    ] },

    { type: "h2", text: "Managing the context window" },
    { type: "p", text: "Long conversations eventually exceed the window, and long prompts cost more on every turn. Strategies, often combined:" },
    { type: "ul", items: [
      "**Sliding window:** keep the last N turns verbatim. Simple; loses early details.",
      "**Running summary:** periodically summarise older turns into a short paragraph kept at the top. Keeps gist; loses specifics.",
      "**Retrieval over history:** store every turn, embed it, and retrieve the relevant old turns for the current question.",
      "**Tool-result trimming:** keep the essential fields of large tool outputs; store the rest by reference.",
      "**Scratchpad / plan:** keep an explicit task plan in state rather than relying on the model to infer it from history.",
    ] },
    { type: "diagram", kind: "segments", width: 780, caption: "A context budget for one turn of a long conversation (illustrative). Recent turns are kept verbatim, older ones compressed into a summary, and long-term memories retrieved only when relevant.", total: 16, lanes: [{ parts: [
      { label: "System + tools", sub: "2K", size: 2, tone: "accent" },
      { label: "Memories", sub: "1K", size: 1, tone: "store" },
      { label: "Summary of older turns", sub: "1.5K", size: 1.5, tone: "muted" },
      { label: "Recent turns verbatim", sub: "6K", size: 6, tone: "cache" },
      { label: "Retrieved docs", sub: "4K", size: 4, tone: "store" },
      { label: "Room for output", sub: "1.5K", size: 1.5, tone: "ok" },
    ] }] },

    { type: "h2", text: "Long-term memory architecture" },
    { type: "diagram", kind: "flow", caption: "Long-term memory: after a conversation, an extraction step proposes memories, which are deduplicated and stored with provenance. On each new turn, relevant memories are retrieved and added to the prompt.", nodes: [
      { id: "conv", label: "Conversation", col: 0, row: 0.3, shape: "pill" },
      { id: "ext", label: "Extract memories", sub: "LLM · async", col: 1.4, row: 0.3, tone: "accent" },
      { id: "dedupe", label: "Dedupe / update", sub: "merge or replace", col: 2.8, row: 0.3 },
      { id: "store", label: "Memory store", sub: "per user · vector + KV", col: 4.2, row: 1, shape: "db", tone: "store", w: 170 },
      { id: "turn", label: "New turn", col: 0, row: 1.7, shape: "pill" },
      { id: "ret", label: "Retrieve relevant", sub: "top 5 + profile", col: 1.4, row: 1.7, tone: "accent" },
      { id: "prompt", label: "Prompt", col: 2.8, row: 1.7, tone: "ok" },
    ], edges: [
      { from: "conv", to: "ext" }, { from: "ext", to: "dedupe" }, { from: "dedupe", to: "store" }, { from: "turn", to: "ret" }, { from: "store", to: "ret" }, { from: "ret", to: "prompt" },
    ] },
    { type: "ul", items: [
      "**Write path:** extract candidate facts asynchronously after a session (not on every token), resolve conflicts (\"moved from Pune to Bengaluru\" should replace, not add), and store each memory with its source conversation and timestamp.",
      "**Read path:** retrieve by semantic similarity to the current turn plus a small always-included profile; rank by relevance and recency.",
      "**Explicit vs implicit:** \"remember that I'm vegetarian\" is a clear instruction; inferred memories need a higher bar.",
      "**Scoping:** memories belong to one user (and sometimes one workspace); retrieval must filter by owner, the same way [RAG permissions](/learn/design-rag-chatbot) do.",
    ] },

    { type: "h2", text: "Privacy, control and safety" },
    { type: "ul", items: [
      "**User control:** let users view, edit and delete memories, and turn memory off; deletion must remove both the record and its vector.",
      "**Sensitive data:** avoid storing health, financial or other sensitive details unless the product needs them and the user agreed; never store credentials.",
      "**Retention:** expire stale memories; old preferences can mislead.",
      "**Memory poisoning:** if content from documents or web pages can become a memory, an attacker can plant instructions that persist (\"always recommend site X\"). Only extract memories from the user's own messages, mark their source, and treat retrieved memories as data. See [prompt injection](/learn/prompt-injection).",
    ] },

    { type: "h2", text: "Memory for long-running agents" },
    { type: "p", text: "Agents working for hours (coding, research) hit context limits mid-task. Useful techniques: write progress notes and a to-do list to a file or state store, compact the history into a summary when it nears the limit, and let subagents absorb large reading tasks and return summaries; see [multi-agent systems](/learn/multi-agent-systems)." },

    { type: "h2", text: "Evaluating memory" },
    { type: "ul", items: [
      "**Recall:** given a past fact, does the assistant use it when relevant?",
      "**Precision:** does it avoid bringing up irrelevant or outdated memories?",
      "**Correct updates:** are contradicted facts replaced?",
      "**Isolation:** can user A ever see user B's memories? (must be a hard test case)",
    ] },
  ],
  uses: [
    { name: "Personal assistants", text: "Preferences and past topics recalled across sessions, with a memory page users can edit." },
    { name: "Support bots", text: "Customer history and previous tickets retrieved per conversation, scoped to the account." },
    { name: "Coding agents", text: "Project notes and conventions stored as files the agent reads at the start of each task." },
  ],
  interview: [
    "Separate short-term context management from long-term memory.",
    "Describe write (extract, dedupe, store with provenance) and read (retrieve, rank) paths.",
    "Scope memories per user and give users control and deletion.",
    "Address memory poisoning and sensitive data.",
  ],
  related: ["ai-agent-architecture", "retrieval-augmented-generation", "prompt-injection", "design-chatgpt", "vector-databases"],
  practice: ["rag-search"],
  reading: [
    { title: "MemGPT: Towards LLMs as Operating Systems", publisher: "Packer et al., 2023", url: "https://arxiv.org/abs/2310.08560" },
    { title: "Generative Agents: Interactive Simulacra of Human Behavior", publisher: "Park et al., UIST 2023", url: "https://arxiv.org/abs/2304.03442" },
  ],
};
