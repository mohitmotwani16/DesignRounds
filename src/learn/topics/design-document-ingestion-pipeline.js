// Case study: a large-scale document processing and indexing pipeline for LLM / RAG use.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a pipeline that ingests and indexes large volumes of heterogeneous documents (PDFs, scans, Word files, slides, spreadsheets, HTML, emails) so they can be used by LLM applications such as RAG chatbots and extraction workflows. It must handle tens of millions of documents, keep up with updates and deletes, parse messy formats well, and do it at a reasonable cost. Most RAG quality problems start here, which is why interviewers ask it as a question on its own." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Volume?", "Backfill of 50M documents; then ~500K new or changed documents per day"],
      ["Formats?", "PDF (born-digital and scanned), DOCX, PPTX, XLSX, HTML, email with attachments"],
      ["Outputs?", "Clean text with structure, chunks with metadata and ACLs, embeddings, keyword index; extracted tables"],
      ["Freshness?", "Changes indexed within 15 minutes; deletes within 5 minutes"],
      ["Multi-tenant?", "Yes: many customers, strict isolation"],
    ] },

    { type: "h2", text: "2. Architecture" },
    { type: "diagram", kind: "flow", caption: "A staged, queue-connected pipeline. Each stage scales independently, writes its output to storage, and passes a reference to the next stage, so failures retry only the stage that failed.", nodes: [
      { id: "src", label: "Sources", sub: "connectors · uploads", col: 0, row: 1 },
      { id: "raw", label: "Raw store", sub: "object storage", col: 1.2, row: 2.2, shape: "db", tone: "store" },
      { id: "q1", label: "Queue", col: 1.2, row: 1, shape: "queue", tone: "queue" },
      { id: "detect", label: "Detect + route", sub: "type · language", col: 2.4, row: 1 },
      { id: "parse", label: "Parsers", sub: "PDF · OCR · office", col: 3.6, row: 0.3, tone: "accent" },
      { id: "enrich", label: "Enrich", sub: "tables · captions · PII", col: 3.6, row: 1.7 },
      { id: "chunk", label: "Chunk + metadata", col: 4.8, row: 1, tone: "accent" },
      { id: "embed", label: "Embed (GPU)", col: 6, row: 0.3, tone: "store" },
      { id: "idx", label: "Indexes", sub: "vector · keyword", col: 6, row: 1.7, shape: "db", tone: "cache" },
    ], edges: [
      { from: "src", to: "raw" }, { from: "src", to: "q1" }, { from: "q1", to: "detect" }, { from: "detect", to: "parse" }, { from: "parse", to: "enrich" }, { from: "enrich", to: "chunk" },
      { from: "chunk", to: "embed" }, { from: "embed", to: "idx" }, { from: "chunk", to: "idx", dashed: true, label: "keyword" },
    ] },

    { type: "h2", text: "3. Parsing heterogeneous documents" },
    { type: "table", head: ["Input", "Approach", "Pitfalls"], rows: [
      ["Born-digital PDF", "Layout-aware text extraction (reading order, columns, headings)", "Headers/footers repeated per page; two-column interleaving"],
      ["Scanned PDF / images", "OCR, or a vision-language model for complex layouts", "Slow and costly; handwriting; low-quality scans"],
      ["Tables", "Table structure detection; output as rows with headers or markdown", "Merged cells; tables spanning pages"],
      ["Office files", "Native parsers for DOCX/PPTX/XLSX", "Speaker notes, hidden sheets, embedded objects"],
      ["Email", "Body plus attachments as child documents; thread structure", "Quoted replies duplicate content"],
      ["Figures and charts", "Vision model captions describing the content", "Cost; hallucinated details"],
    ] },
    { type: "ul", items: [
      "**Route by type and difficulty:** cheap fast parsers first; escalate only hard pages (scans, complex tables) to OCR or vision models.",
      "Keep page numbers and bounding boxes so answers can cite the exact page.",
      "Store parsed output as structured intermediate files, so re-chunking doesn't require re-parsing.",
    ] },

    { type: "h2", text: "4. Chunking, metadata and embedding" },
    { type: "ul", items: [
      "Structural chunking by headings with the section path prepended; parent-child chunks for long sections. See [RAG chunking strategies](/learn/rag-chunking-strategies).",
      "Metadata per chunk: tenant, document id and version, source, ACL, page, section, language, timestamps, embedding model version.",
      "PII detection tags or redacts sensitive fields per tenant policy.",
      "Embedding on a GPU pool with large batches; content hashes skip unchanged chunks.",
    ] },

    { type: "h2", text: "5. Throughput and cost" },
    { type: "code", code: `Backfill    : 50M docs × ~10 pages = 500M pages
Parsing     : fast path ~20 pages/s per CPU core → 25M core-seconds ≈ 290 core-days
              e.g. 1,000 cores → ~7 hours (plus OCR for the ~10% scanned pages,
              routed to a GPU/OCR pool with its own budget)
Chunks      : ~4 chunks/page → 2B chunks
Embedding   : 2B chunks at ~3,000 chunks/s per GPU → ~185 GPU-hours
              e.g. 40 GPUs → ~4.6 hours
Vectors     : 2B × 768 dims × 1 B (int8) ≈ 1.5 TB → sharded index per tenant group
Daily delta : 500K docs → ~1% of backfill work, runs continuously
(illustrative throughputs)` },
    { type: "p", text: "Backfills run at lower priority than live updates, in separate queues, so a new customer's 10-million-document import doesn't delay everyone's fresh edits." },

    { type: "h2", text: "6. Updates, deletes and consistency" },
    { type: "diagram", kind: "sequence", caption: "Handling a document update: the new version is processed fully, its chunks are written, and only then are the old version's chunks removed, so search never shows a half-indexed document.", actors: ["Connector", "Pipeline", "Index", "Doc registry"], steps: [
      { from: 0, to: 1, label: "doc 42 changed (v7 → v8)" },
      { from: 1, to: 1, label: "parse, chunk, embed v8" },
      { from: 1, to: 2, label: "upsert chunks doc42@v8" },
      { from: 1, to: 3, label: "mark current = v8" },
      { from: 1, to: 2, label: "delete chunks doc42@v7" },
      { note: "deletes: tombstone first, purge async", over: [2, 3] },
    ] },
    { type: "ul", items: [
      "A **document registry** tracks every document's current version, status per stage, and checksums; it's the source of truth for reconciliation.",
      "Out-of-order events (an old update processed after a newer one) are rejected by version comparison.",
      "**Deletes and permission revocations** take a fast path: mark the document as hidden in the index immediately (a filter), then purge chunks and vectors asynchronously.",
      "Periodic reconciliation compares the registry with each source and with the indexes to catch missed events.",
    ] },

    { type: "h2", text: "7. Reliability" },
    { type: "ul", items: [
      "Each stage is idempotent (keyed by document id and version), so retries are safe; see [idempotency](/learn/idempotency).",
      "Poison documents (parser crashes, huge files) go to a [dead-letter queue](/learn/pipeline-error-handling) after a few attempts, with alerts.",
      "Per-tenant quotas and fair scheduling prevent one tenant from starving others; see [multi-tenancy](/learn/multi-tenancy).",
      "Sandboxed parsers: documents are untrusted input (malformed files, macros, zip bombs).",
    ] },

    { type: "h2", text: "8. Quality monitoring" },
    { type: "ul", items: [
      "Parse quality signals: empty or garbled text ratio, OCR confidence, table detection rate per source and format.",
      "Freshness: lag from source change to searchable, per connector; delete propagation time.",
      "Downstream retrieval recall on a golden question set after any parser or chunker change; see [LLM evaluation](/learn/llm-evaluation).",
    ] },
  ],
  uses: [
    { name: "Enterprise search and RAG", text: "Feeds permission-aware indexes for internal assistants; see [RAG chatbot](/learn/design-rag-chatbot)." },
    { name: "Document AI products", text: "Contracts, invoices and claims parsed into structured fields with page-level citations." },
    { name: "Compliance and e-discovery", text: "Large archives made searchable with strict deletion and audit guarantees." },
  ],
  interview: [
    "Split into queue-connected stages that scale and retry independently.",
    "Route documents to cheap parsers first and escalate hard pages to OCR or vision models.",
    "Size backfill parsing and embedding, and isolate backfills from live updates.",
    "Handle versions, deletes and revocations with a registry, fast hide and reconciliation.",
  ],
  related: ["rag-chunking-strategies", "design-rag-chatbot", "retrieval-augmented-generation", "pipeline-error-handling", "message-queues", "embeddings"],
  practice: ["document-ingestion", "rag-search", "etl-framework", "file-storage"],
  reading: [
    { title: "Docling Technical Report", publisher: "IBM Research, 2024", url: "https://arxiv.org/abs/2408.09869" },
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", publisher: "Lewis et al., NeurIPS 2020", url: "https://arxiv.org/abs/2005.11401" },
  ],
};
