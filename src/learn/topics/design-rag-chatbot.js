// Case study: an enterprise RAG chatbot over company documents.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a chatbot that answers employees' questions from company documents: wikis, policies, tickets, shared drives and chat archives. Answers must be accurate, cite their sources, respect who can see which document, and stay current as documents change. This is the most frequently asked AI engineering design question, and it tests [RAG](/learn/retrieval-augmented-generation) end to end: ingestion, retrieval, permissions, generation, evaluation and operations." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Users?", "20,000 employees; ~100K questions per day, peaking at ~10 per second"],
      ["Sources?", "Wiki, Google Drive / SharePoint-style drives, ticketing system, HR policies; ~5M documents"],
      ["Permissions?", "Users may only see answers from documents they can access in the source system"],
      ["Freshness?", "Changes searchable within 15 minutes; permission revocations even faster"],
      ["Quality bar?", "Grounded answers with citations; say \"I don't know\" rather than guess"],
      ["Latency?", "First token under 2 s"],
    ] },

    { type: "h2", text: "2. Define evaluation first" },
    { type: "ul", items: [
      "A golden set of ~300 real questions with the documents that answer them and key facts, across departments, including questions with no answer in the corpus and questions about restricted documents.",
      "Metrics: retrieval recall@10, faithfulness (claims supported by cited chunks), correctness against key facts, refusal accuracy on unanswerable questions, and **zero** leaks on permission tests.",
      "See [LLM evaluation](/learn/llm-evaluation).",
    ] },

    { type: "h2", text: "3. Architecture" },
    { type: "diagram", kind: "flow", caption: "Two pipelines. Ingestion (bottom) syncs documents and permissions from connectors into keyword and vector indexes. Query (top) rewrites the question, retrieves with the user's permissions as a filter, reranks, and generates a cited answer.", zones: [{ label: "ingestion", from: [0, 2.1], to: [4, 2.1], tone: "muted" }], nodes: [
      { id: "user", label: "Employee", col: 0, row: 0.5, shape: "pill" },
      { id: "rw", label: "Query rewrite", sub: "history → standalone", col: 1.3, row: 0.5 },
      { id: "ret", label: "Hybrid retrieval", sub: "ACL filter", col: 2.6, row: 0.5, tone: "accent" },
      { id: "rr", label: "Rerank", sub: "top 8", col: 3.9, row: 0.5 },
      { id: "gen", label: "LLM answer", sub: "citations", col: 5.2, row: 0.5, tone: "accent" },
      { id: "idx", label: "Keyword + vector index", sub: "chunks + ACLs", col: 2.6, row: 1.3, shape: "db", tone: "cache", w: 180 },
      { id: "conn", label: "Connectors", sub: "webhooks + polling", col: 0, row: 2.1 },
      { id: "parse", label: "Parse + chunk", col: 1.3, row: 2.1 },
      { id: "embed", label: "Embed", col: 2.6, row: 2.1, tone: "store" },
      { id: "acl", label: "Permission sync", col: 4, row: 2.1, tone: "danger" },
    ], edges: [
      { from: "user", to: "rw" }, { from: "rw", to: "ret" }, { from: "ret", to: "idx", both: true }, { from: "ret", to: "rr" }, { from: "rr", to: "gen" },
      { from: "conn", to: "parse" }, { from: "parse", to: "embed" }, { from: "embed", to: "idx" }, { from: "conn", to: "acl", dashed: true }, { from: "acl", to: "idx" },
    ] },

    { type: "h2", text: "4. Ingestion" },
    { type: "ul", items: [
      "**Connectors** per source pull content and permissions, using webhooks for change notifications plus periodic reconciliation crawls (webhooks get missed).",
      "**Parsing and chunking:** layout-aware parsing, structural chunks with title and section path prepended; see [chunking strategies](/learn/rag-chunking-strategies) and [document ingestion pipeline](/learn/design-document-ingestion-pipeline).",
      "**Incremental updates:** re-chunk only changed documents; upsert new chunks and delete old ones by document version.",
      "**Queue-based workers** so spikes (a whole drive shared at once) are absorbed; see [message queues](/learn/message-queues).",
    ] },
    { type: "code", code: `Corpus      : 5M docs × ~8 chunks = 40M chunks
Vectors     : 40M × 1,024 dims × 4 B ≈ 164 GB (float32) → ~41 GB as int8
Initial load: 40M chunks ÷ ~2,000 chunks/s embedding throughput ≈ 5.5 hours
Daily churn : ~1% of docs change → 400K chunks/day re-embedded, trivial
Keyword idx : BM25 over the same chunks in a search engine` },

    { type: "h2", text: "5. Retrieval that respects permissions" },
    { type: "p", text: "The non-negotiable requirement. Each chunk stores the document's **ACL** (users and groups allowed). At query time, resolve the user's groups and apply them as a **filter inside both searches**, so restricted content never reaches the model or the prompt." },
    { type: "ul", items: [
      "Never retrieve first and filter afterwards in the prompt (\"only use documents the user may see\"): the model would see the restricted text.",
      "Group membership is cached with a short TTL; revocations from the identity provider invalidate it immediately.",
      "Permission changes in a source re-tag affected chunks quickly (they're metadata updates, no re-embedding).",
      "Very large ACLs (documents shared with thousands of groups) are expensive to filter; index by group, or partition the index by top-level group.",
    ] },

    { type: "h2", text: "6. Retrieval and generation" },
    { type: "ul", items: [
      "Rewrite follow-up questions into standalone queries using chat history.",
      "[Hybrid search](/learn/hybrid-search-reranking): BM25 for names, error codes and acronyms; vectors for paraphrases; fused with RRF; cross-encoder rerank to the best 6-8 chunks.",
      "Prompt: answer only from the provided sources, cite each claim with a source id, and say when the sources don't answer the question.",
      "Render citations as links to the source document (title, section, last updated).",
      "Optional grounding check on the answer before display for high-stakes areas (HR, legal).",
    ] },

    { type: "h2", text: "7. Serving, latency and cost" },
    { type: "code", code: `Peak         : 10 questions/s
Latency plan : rewrite 300 ms (small model) | retrieval 80 ms | rerank 80 ms
               | first token ~700 ms → first text in ~1.2 s, then streaming
Tokens/query : ~600 system + 2,500 retrieved + 400 history + 300 output
Cost/day     : 100K × (3.5K in + 300 out) at illustrative mid-model prices
               ≈ 350M input + 30M output tokens/day → a few hundred dollars/day
Levers       : prefix caching for the system prompt, smaller model for rewriting,
               fewer but better chunks after reranking` },

    { type: "h2", text: "8. Security" },
    { type: "ul", items: [
      "Documents are untrusted: a page can contain injected instructions. The chatbot has no write tools, and output links are restricted to internal domains. See [prompt injection](/learn/prompt-injection).",
      "Logs and traces contain sensitive content: redact, restrict access, and apply retention.",
      "Audit who asked what and which documents were used, for compliance.",
    ] },

    { type: "h2", text: "9. Operations" },
    { type: "ul", items: [
      "Monitor ingestion lag per connector, failed parses, index freshness and permission-sync lag.",
      "Quality: thumbs-down rate, \"I don't know\" rate, sampled faithfulness scores; review negative feedback weekly and add cases to the golden set.",
      "Re-embedding on embedding model changes builds a new index in the background and switches atomically.",
      "See [LLMOps](/learn/llmops-observability).",
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*The answer is wrong but the document exists. Debug it.* Walk the stages: ingested? parsed? permission filter? chunk boundary? retrieval recall? reranked away? ignored by the model? See [advanced RAG](/learn/advanced-rag).",
      "*How do you answer \"summarise all incidents this quarter\"?* That's corpus-wide: use a structured query over ticket metadata or precomputed summaries, not top-k retrieval.",
      "*How do you stop answers from stale documents?* Prefer recent versions in ranking, show last-updated dates, and flag documents past a review date.",
    ] },
  ],
  uses: [
    { name: "Internal knowledge assistants", text: "Employees ask questions across wikis, drives and tickets with permission-aware answers." },
    { name: "Customer help centres", text: "Public-facing variant with simpler permissions but stricter tone and escalation rules." },
    { name: "Sales and support enablement", text: "Answers from product docs and past tickets, with citations agents can verify." },
  ],
  interview: [
    "Define a golden set with unanswerable and permission test cases first.",
    "Design ingestion with connectors, incremental updates and permission sync.",
    "Filter by ACL inside retrieval, never in the prompt.",
    "Use hybrid search, reranking and cited answers, and debug failures stage by stage.",
  ],
  related: ["retrieval-augmented-generation", "rag-chunking-strategies", "hybrid-search-reranking", "advanced-rag", "prompt-injection", "design-document-ingestion-pipeline"],
  practice: ["rag-search", "document-ingestion"],
  reading: [
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", publisher: "Lewis et al., NeurIPS 2020", url: "https://arxiv.org/abs/2005.11401" },
    { title: "RAGAS: Automated Evaluation of Retrieval Augmented Generation", publisher: "Es et al., 2023", url: "https://arxiv.org/abs/2309.15217" },
  ],
};
