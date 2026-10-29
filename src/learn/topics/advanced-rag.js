export default {
  blocks: [
    { type: "p", text: "Basic RAG (embed the question, fetch the top chunks, generate) handles simple factual questions. It struggles with vague or conversational questions, questions that need facts from several documents, questions about relationships across a whole corpus, and corpora with strict permissions. **Advanced RAG** adds steps before retrieval (query transformation), during it (iterative and agentic retrieval, graphs) and after it (reranking, compression, verification). This guide covers the techniques and when each is worth its latency and cost." },

    { type: "h2", text: "Where basic RAG breaks" },
    { type: "table", head: ["Failure", "Example", "Technique"], rows: [
      ["Vague or conversational query", "\"what about for annual plans?\" (depends on earlier turns)", "Query rewriting with history"],
      ["Vocabulary mismatch", "User says \"money back\", docs say \"refund\"", "Query expansion, HyDE, hybrid search"],
      ["Multi-part question", "\"Compare the refund rules for monthly and annual plans in the EU\"", "Query decomposition"],
      ["Multi-hop reasoning", "\"Who manages the team that owns the billing service?\"", "Iterative / agentic retrieval"],
      ["Corpus-wide questions", "\"What are the main themes in customer complaints this quarter?\"", "Summaries, GraphRAG, map-reduce"],
      ["Right document, wrong chunk", "Answer split across a page break", "Better chunking, parent-child retrieval"],
      ["Too much irrelevant context", "Top-10 chunks, 3 useful", "Reranking, context compression"],
    ] },

    { type: "h2", text: "An advanced RAG pipeline" },
    { type: "diagram", kind: "flow", caption: "Pre-retrieval steps make the query searchable, retrieval may loop, and post-retrieval steps keep only what's useful. Each added step costs latency, so use them where the evaluation shows a gain.", zones: [
      { label: "pre-retrieval", from: [1.2, 0], to: [1.2, 2], tone: "muted" },
      { label: "post-retrieval", from: [3.8, 0], to: [3.8, 2], tone: "muted" },
    ], nodes: [
      { id: "q", label: "User question", sub: "+ history", col: 0, row: 1, shape: "pill" },
      { id: "rw", label: "Rewrite", sub: "standalone query", col: 1.2, row: 0.3, tone: "accent" },
      { id: "dec", label: "Decompose", sub: "sub-questions", col: 1.2, row: 1.7, tone: "accent" },
      { id: "ret", label: "Hybrid retrieval", sub: "per sub-question", col: 2.5, row: 1, shape: "db", tone: "store" },
      { id: "rr", label: "Rerank + compress", col: 3.8, row: 0.3 },
      { id: "chk", label: "Enough evidence?", col: 3.8, row: 1.7, tone: "ok" },
      { id: "gen", label: "Generate", sub: "with citations", col: 5.1, row: 1, tone: "accent" },
    ], edges: [
      { from: "q", to: "rw" }, { from: "q", to: "dec" }, { from: "rw", to: "ret" }, { from: "dec", to: "ret" }, { from: "ret", to: "rr" }, { from: "rr", to: "chk" },
      { from: "chk", to: "ret", dashed: true, label: "no: search again" }, { from: "chk", to: "gen", label: "yes" },
    ] },

    { type: "h2", text: "Before retrieval: transforming the query" },
    { type: "ul", items: [
      "**Conversational rewriting:** turn \"what about annual plans?\" into \"What is the refund policy for annual plans?\" using the chat history. Almost always worth it in chat products.",
      "**Query expansion:** add synonyms or several paraphrases, retrieve for each, and fuse the results.",
      "**HyDE (hypothetical document embeddings):** ask the model to write a plausible answer, then embed that answer to search. It matches the style of documents better than a short question does. Risky when the hypothetical answer is confidently wrong.",
      "**Decomposition:** split a compound question into sub-questions, retrieve for each, answer from the combined evidence.",
      "**Routing:** classify the question to pick an index (policies vs API docs), a filter (product, region) or a non-RAG path (small talk, a SQL tool).",
    ] },

    { type: "h2", text: "During retrieval: iterative and agentic RAG" },
    { type: "p", text: "In **agentic RAG**, retrieval is a tool the model can call repeatedly: it searches, reads, decides what's missing, and searches again, until it has enough or hits a budget. It handles multi-hop questions well, at the cost of several model calls and less predictable latency. Give it a step limit and require citations. See [AI agent architecture](/learn/ai-agent-architecture)." },
    { type: "diagram", kind: "sequence", caption: "Agentic RAG for a multi-hop question: each search is chosen based on what the previous one returned.", actors: ["Agent (LLM)", "Search tool", "Index"], steps: [
      { from: 0, to: 1, label: "search(\"team that owns billing service\")" },
      { from: 1, to: 2, label: "hybrid query" },
      { from: 1, to: 0, label: "\"Payments Platform team owns billing\"" },
      { from: 0, to: 1, label: "search(\"Payments Platform team manager\")" },
      { from: 1, to: 0, label: "\"Managed by A. Rao\"" },
      { note: "enough evidence: answer with 2 citations", over: [0] },
    ] },

    { type: "h2", text: "Corpus-wide questions: summaries and GraphRAG" },
    { type: "p", text: "Top-k retrieval can't answer \"what are the main themes across 50,000 tickets?\" because no chunk contains the answer. Options:" },
    { type: "ul", items: [
      "**Hierarchical summaries:** precompute summaries per document, per cluster and per collection; retrieve at the right level.",
      "**GraphRAG:** use an LLM at ingestion to extract entities and relationships into a knowledge graph, cluster it into communities, summarise each community, and answer global questions from those summaries. Strong for themes and relationships, expensive to build and refresh.",
      "**Map-reduce:** run the question over many chunks in parallel and combine the partial answers, for one-off analyses.",
      "**Structured data tools:** if the answer is really a query (\"how many tickets mention refunds?\"), give the model a SQL or analytics tool instead.",
    ] },

    { type: "h2", text: "After retrieval: reranking, compression, verification" },
    { type: "ul", items: [
      "**Rerank** with a cross-encoder and keep only the best few; see [hybrid search and reranking](/learn/hybrid-search-reranking).",
      "**Compress:** extract only the relevant sentences from each chunk, cutting tokens and noise.",
      "**Order deliberately:** put the strongest evidence first or last, since models attend less reliably to the middle of long contexts.",
      "**Verify grounding:** check that each claim in the answer is supported by a cited chunk (an LLM or NLI check), and regenerate or answer \"I don't know\" when it isn't.",
    ] },

    { type: "h2", text: "Long context vs RAG" },
    { type: "table", head: ["", "Put everything in a long context", "Retrieve selectively (RAG)"], rows: [
      ["Corpus size", "Fits in the window (one contract, one codebase module)", "Any size"],
      ["Cost per query", "High: every token, every time (prompt caching helps)", "Low: only retrieved chunks"],
      ["Latency", "Slower prefill on long inputs", "Retrieval adds tens of ms"],
      ["Permissions and freshness", "Hard to filter per user", "Filter at retrieval time; index updates incrementally"],
      ["Recall", "Model may overlook facts mid-context", "Bounded by retrieval recall"],
    ] },
    { type: "p", text: "They combine well: retrieve generously, then use a long window to include more candidates than older systems could." },

    { type: "h2", text: "Debugging a wrong answer" },
    { type: "ol", items: [
      "Was the right document ingested, current and parsed correctly?",
      "Did the permission filter exclude it?",
      "Was the answer split across chunks?",
      "Did the (rewritten) query retrieve it in the top 50? (retrieval recall)",
      "Did reranking keep it in the final context?",
      "Was it in the prompt but ignored or contradicted? (generation and grounding)",
    ] },
    { type: "p", text: "Log every step's inputs and outputs in a trace so this is a lookup, not guesswork; see [LLMOps](/learn/llmops-observability)." },
  ],
  uses: [
    { name: "Enterprise assistants", text: "Conversational rewriting, permission-filtered hybrid search and grounding checks." },
    { name: "Research and analysis tools", text: "Agentic multi-hop retrieval and map-reduce summaries over large collections." },
    { name: "Customer insight", text: "GraphRAG or hierarchical summaries to answer theme-level questions over feedback." },
  ],
  interview: [
    "Name the failure first, then the technique that fixes it.",
    "Use conversational query rewriting in any chat RAG design.",
    "Propose agentic retrieval for multi-hop questions, with a step budget.",
    "Debug wrong answers stage by stage, separating retrieval from generation.",
  ],
  related: ["retrieval-augmented-generation", "hybrid-search-reranking", "rag-chunking-strategies", "ai-agent-architecture", "llm-evaluation", "design-rag-chatbot"],
  practice: ["rag-search"],
  reading: [
    { title: "Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)", publisher: "Gao et al., 2022", url: "https://arxiv.org/abs/2212.10496" },
    { title: "From Local to Global: A Graph RAG Approach to Query-Focused Summarization", publisher: "Edge et al., Microsoft Research, 2024", url: "https://arxiv.org/abs/2404.16130" },
    { title: "Lost in the Middle: How Language Models Use Long Contexts", publisher: "Liu et al., 2023", url: "https://arxiv.org/abs/2307.03172" },
  ],
};
