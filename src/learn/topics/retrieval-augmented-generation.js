export default {
  blocks: [
    { type: "p", text: "**Retrieval-augmented generation (RAG)** answers a question by first **retrieving** relevant passages from your own documents and then asking a language model to **generate** an answer grounded in them. It lets a model use private, fresh and citable knowledge without retraining. Most RAG quality problems are retrieval problems, so the design effort goes into how documents are split, indexed, searched and ranked before the model sees anything." },

    { type: "h2", text: "The two pipelines" },
    { type: "diagram", kind: "flow", caption: "Indexing runs offline as documents change; the query path retrieves, re-ranks and assembles a grounded prompt in a few hundred milliseconds before generation.", nodes: [
      { id: "docs", label: "Documents", sub: "wikis · PDFs · tickets", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "chunk", label: "Parse + chunk", col: 1.2, row: 0 },
      { id: "embed", label: "Embed", sub: "embedding model", col: 2.4, row: 0, tone: "accent" },
      { id: "index", label: "Indexes", sub: "vector + keyword", col: 3.6, row: 0.8, shape: "db", tone: "cache" },
      { id: "q", label: "User question", col: 0, row: 1.6, shape: "pill" },
      { id: "ret", label: "Hybrid retrieval", sub: "top 50", col: 1.2, row: 1.6, tone: "accent" },
      { id: "rerank", label: "Re-rank", sub: "top 5-10", col: 2.4, row: 1.6 },
      { id: "llm", label: "LLM", sub: "answer + citations", col: 4.8, row: 1.6, tone: "accent" },
    ], edges: [
      { from: "docs", to: "chunk" }, { from: "chunk", to: "embed" }, { from: "embed", to: "index" },
      { from: "q", to: "ret" }, { from: "index", to: "ret", dashed: true }, { from: "ret", to: "rerank" }, { from: "rerank", to: "llm", label: "prompt" },
    ] },

    { type: "h2", text: "Indexing: chunking and embeddings" },
    { type: "ul", items: [
      "**Parse carefully:** extract text with structure (headings, tables, lists) from PDFs, HTML and slides. Garbage parsing is a common hidden cause of bad answers.",
      "**Chunk by structure, not just length:** split at sections and paragraphs, typically a few hundred tokens, with some overlap. Too small loses context; too large dilutes relevance and wastes prompt space.",
      "**Attach metadata:** source, title, section path, date, owner and **access permissions** for every chunk, so retrieval can filter and the answer can cite.",
      "**Embed** each chunk with an embedding model and store vectors in a [vector index](/learn/vector-databases); also index the text for keyword search.",
      "**Keep the index fresh:** re-index changed documents incrementally, delete removed ones, and record which embedding model version produced each vector (changing models means re-embedding everything).",
    ] },

    { type: "h2", text: "Retrieval and re-ranking" },
    { type: "ul", items: [
      "**Hybrid search:** combine vector similarity (good at paraphrases) with keyword search such as BM25 (good at exact names, codes and IDs), then merge the lists, for example with reciprocal rank fusion. See [full-text search](/learn/search-and-inverted-index).",
      "**Filter by permissions first:** a user must never retrieve a chunk they couldn't open directly. Apply access filters inside the search, not after generation.",
      "**Re-rank:** a cross-encoder model scores each (question, chunk) pair more precisely than embeddings can, cutting dozens of candidates to the best handful.",
      "**Query rewriting:** expand abbreviations, resolve follow-up questions using chat history (\"what about last year?\"), or split complex questions into sub-queries.",
    ] },

    { type: "h2", text: "Generation and grounding" },
    { type: "p", text: "Assemble a prompt with instructions, the retrieved passages (each labelled with its source), and the question. Instruct the model to answer only from the passages, cite them, and say when the answer isn't there. Treat retrieved text as **data, not instructions**, because documents can contain text that tries to redirect the model (indirect prompt injection)." },
    { type: "callout", tone: "tip", text: "\"I couldn't find this in the documentation\" is a good answer. Measure how often the system abstains correctly, not just how often it answers." },

    { type: "h2", text: "Evaluating a RAG system" },
    { type: "table", head: ["Stage", "Metric", "How"], rows: [
      ["Retrieval", "Recall@k, MRR: is the right passage in the top k?", "A labelled set of questions with known source passages"],
      ["Re-ranking", "Precision of the final context", "Same set, after re-ranking"],
      ["Generation", "Faithfulness (claims supported by context), answer relevance, citation accuracy", "Human review plus model-graded checks on a fixed set"],
      ["End to end", "Task success, user feedback, escalation rate", "Online metrics and sampled conversation review"],
    ] },
    { type: "p", text: "Evaluate retrieval separately from generation. If the right passage wasn't retrieved, no prompt or model change will fix the answer." },

    { type: "h2", text: "Cost and latency" },
    { type: "ul", items: [
      "Generation dominates both, so keep the context small: a few well-ranked chunks beat twenty mediocre ones.",
      "Cache embeddings of frequent queries and answers to repeated questions where data allows.",
      "Route easy questions to a smaller model and stream tokens to the user. See [LLM serving](/learn/llm-inference-serving).",
    ] },
  ],
  uses: [
    { name: "Internal knowledge assistants", text: "Answer employee questions from wikis and policies with citations, respecting document permissions." },
    { name: "Customer support", text: "Draft replies grounded in help-centre articles and past resolved tickets." },
    { name: "Developer tools", text: "Answer questions about a codebase or API docs by retrieving relevant files and pages." },
  ],
  interview: [
    "Separate the indexing pipeline from the query path.",
    "Use hybrid retrieval plus a re-ranker, and enforce permissions in the search.",
    "Ground answers with citations and allow the model to abstain.",
    "Evaluate retrieval recall separately from answer faithfulness.",
  ],
  related: ["vector-databases", "ai-application-architecture", "llm-inference-serving", "search-and-inverted-index", "ml-evaluation-metrics"],
  practice: ["rag-search"],
  reading: [
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", publisher: "Lewis et al., arXiv", url: "https://arxiv.org/abs/2005.11401" },
    { title: "OWASP Top 10 for Large Language Model Applications", publisher: "OWASP Foundation", url: "https://owasp.org/projects/top-10-for-large-language-model-applications" },
  ],
};
