// Case study: a large-scale document processing and indexing pipeline for LLM / RAG use.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a pipeline that ingests and indexes large volumes of heterogeneous documents (PDFs, scans, Word files, slides, spreadsheets, HTML, emails) so they can be used by LLM applications such as RAG chatbots and extraction workflows. It must handle tens of millions of documents, keep up with updates and deletes, parse messy formats well, and do it at a reasonable cost. Most RAG quality problems start here, which is why interviewers ask it as a question on its own." },
    { type: "callout", text: "Try it yourself first. Work out how long the backfill takes, and what happens when a document is deleted. Then compare. The [document ingestion practice round](/system-design/document-ingestion) is the same problem with an AI interviewer." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Volume?", "Backfill of 50M documents; then ~500K new or changed documents per day"],
      ["Formats?", "PDF (born-digital and scanned), DOCX, PPTX, XLSX, HTML, email with attachments"],
      ["Outputs?", "Clean text with structure, chunks with metadata and ACLs, embeddings, keyword index; extracted tables"],
      ["Freshness?", "Changes indexed within 15 minutes; deletes within 5 minutes"],
      ["Multi-tenant?", "Yes: many customers, strict isolation"],
    ] },
    { type: "p", text: "This system has two very different workloads. A **backfill** is a giant one-time batch that can run for hours. **Live updates** are a steady trickle with a 15-minute promise. If the two share a single queue, one large import will break the freshness promise for every other customer." },
    { type: "diagram", kind: "tree", caption: "The two workloads and what each one needs. They use the same stages but run in separate queues with separate priorities.", root: { label: "Document pipeline", tone: "accent", children: [
      { label: "Backfill", sub: "50M docs · hours", tone: "store", children: [{ label: "Maximum throughput" }, { label: "Low priority" }] },
      { label: "Live updates", sub: "500K/day · 15 min", tone: "ok", children: [{ label: "Fresh" }, { label: "High priority" }] },
      { label: "Deletes", sub: "5 min", tone: "danger", children: [{ label: "Fast path" }] },
    ] } },

    { type: "h2", text: "2. Architecture" },
    { type: "diagram", kind: "flow", caption: "A staged, queue-connected pipeline. Each stage scales independently, writes its output to storage, and passes a reference to the next stage, so failures retry only the stage that failed.", nodes: [
      { id: "src", label: "Sources", sub: "connectors · uploads", col: 0, row: 1 },
      { id: "raw", label: "Raw store", sub: "object storage", col: 0, row: 2, shape: "db", tone: "store" },
      { id: "q1", label: "Queue", col: 0.9, row: 1, shape: "queue", tone: "queue" },
      { id: "detect", label: "Detect + route", sub: "type · language", col: 1.8, row: 1 },
      { id: "parse", label: "Parsers", sub: "PDF · OCR · office", col: 2.8, row: 0, tone: "accent" },
      { id: "enrich", label: "Enrich", sub: "tables · captions · PII", col: 2.8, row: 2 },
      { id: "chunk", label: "Chunk + metadata", col: 3.8, row: 1, tone: "accent" },
      { id: "embed", label: "Embed (GPU)", col: 4.8, row: 0.4, tone: "store" },
      { id: "idx", label: "Indexes", sub: "vector · keyword", col: 4.8, row: 1.6, shape: "db", tone: "cache" },
    ], edges: [
      { from: "src", to: "raw" }, { from: "src", to: "q1" }, { from: "q1", to: "detect" }, { from: "detect", to: "parse" }, { from: "parse", to: "enrich" }, { from: "enrich", to: "chunk" },
      { from: "chunk", to: "embed" }, { from: "embed", to: "idx" }, { from: "chunk", to: "idx", dashed: true },
    ] },
    { type: "p", text: "**Pass references, not bytes.** Queue messages hold ids and storage paths. Each stage reads its input from object storage and writes its output there, which keeps messages small and makes a later rerun from any stage possible without going back to the source." },
    { type: "code", code: `{ "tenant": "acme", "doc_id": "doc_42", "version": 8,
  "stage": "parse", "input": "s3://acme/raw/doc_42/v8.pdf",
  "output": "s3://acme/parsed/doc_42/v8.json", "attempt": 1 }` },
    { type: "diagram", kind: "flow", caption: "Why each stage saves its output. When you later improve the chunker, you rerun from saved parses, without paying for parsing or OCR again. Changing the embedding model reuses saved chunks in the same way.", nodes: [
      { id: "a", label: "Raw file", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "b", label: "Parsed JSON", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "c", label: "Chunks", col: 2, row: 0, shape: "db", tone: "store" },
      { id: "d", label: "Vectors", col: 3, row: 0, shape: "db", tone: "cache" },
      { id: "x", label: "New parser", sub: "rerun from raw", col: 0.5, row: 1, tone: "danger" },
      { id: "y", label: "New chunker", sub: "rerun from parsed", col: 1.5, row: 1, tone: "queue" },
      { id: "z", label: "New embedder", sub: "rerun from chunks", col: 2.5, row: 1, tone: "accent" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "x", to: "a", dashed: true }, { from: "y", to: "b", dashed: true }, { from: "z", to: "c", dashed: true }] },

    { type: "h2", text: "3. Parsing heterogeneous documents" },
    { type: "table", head: ["Input", "Approach", "Pitfalls"], rows: [
      ["Born-digital PDF", "Layout-aware text extraction (reading order, columns, headings)", "Headers/footers repeated per page; two-column interleaving"],
      ["Scanned PDF / images", "OCR, or a vision-language model for complex layouts", "Slow and costly; handwriting; low-quality scans"],
      ["Tables", "Table structure detection; output as rows with headers or markdown", "Merged cells; tables spanning pages"],
      ["Office files", "Native parsers for DOCX/PPTX/XLSX", "Speaker notes, hidden sheets, embedded objects"],
      ["Email", "Body plus attachments as child documents; thread structure", "Quoted replies duplicate content"],
      ["Figures and charts", "Vision model captions describing the content", "Cost; hallucinated details"],
    ] },
    { type: "p", text: "A PDF stores glyphs at positions, not paragraphs. Plain text extraction can read straight across a two-column page, mixing unrelated sentences together. That garbled text still embeds and still retrieves, so nothing fails loudly and answers just get worse." },
    { type: "diagram", kind: "segments", caption: "A two-column page read two ways. Naive extraction reads across the columns, joining unrelated halves into nonsense. Layout analysis finds the columns and reads each in the proper order.", lanes: [
      { label: "Naive", parts: [{ label: "L1", size: 1, tone: "danger" }, { label: "R1", size: 1, tone: "cache" }, { label: "L2", size: 1, tone: "danger" }, { label: "R2", size: 1, tone: "cache" }, { label: "L3", size: 1, tone: "danger" }, { label: "R3", size: 1, tone: "cache" }] },
      { label: "Layout-aware", parts: [{ label: "L1", size: 1, tone: "ok" }, { label: "L2", size: 1, tone: "ok" }, { label: "L3", size: 1, tone: "ok" }, { label: "R1", size: 1, tone: "store" }, { label: "R2", size: 1, tone: "store" }, { label: "R3", size: 1, tone: "store" }] },
    ] },
    { type: "ul", items: [
      "**Route by type and difficulty:** cheap fast parsers first; escalate only hard pages (scans, complex tables) to OCR or vision models.",
      "Keep page numbers and bounding boxes so answers can cite the exact page.",
      "Store parsed output as structured intermediate files, so re-chunking doesn't require re-parsing.",
    ] },
    { type: "diagram", kind: "tree", caption: "Routing each page to the cheapest parser that can handle it. This decision happens per page, since one PDF often mixes typed text, a scan and a complex table.", root: { label: "PDF page", tone: "accent", children: [
      { label: "Has a text layer", sub: "simple layout", tone: "ok", children: [{ label: "Fast extractor", sub: "~20 pages/s/core", tone: "ok" }] },
      { label: "Complex layout", sub: "columns · tables", tone: "cache", children: [{ label: "Layout + table model", sub: "~2 pages/s on GPU", tone: "cache" }] },
      { label: "No text layer", sub: "scan · photo", tone: "danger", children: [{ label: "OCR or vision model", sub: "slowest", tone: "danger" }] },
    ] } },
    { type: "p", text: "**Published numbers show why routing matters.** IBM's Docling report measured one layout-and-table pipeline at about 481 ms per page on an Nvidia L4 GPU, 1.26 s on an M3 Max and 3.1 s on an x86 CPU, with OCR as the most expensive step. Page times vary a lot, too: on the L4, the 5th percentile was 57 ms and the 95th was 2,081 ms. That spread is the difference between a near-empty page and a full-page table." },
    { type: "diagram", kind: "bars", caption: "Average seconds per page for a full layout-and-table pipeline in the Docling report, by hardware. A plain text extractor can be far faster than any of these, so don't send every page through the models.", unit: " s", values: [
      { label: "x86 CPU", value: 3.1, tone: "danger" },
      { label: "Apple M3 Max", value: 1.26, tone: "cache" },
      { label: "Nvidia L4 GPU", value: 0.481, tone: "ok" },
    ] },

    { type: "h2", text: "4. Chunking, metadata and embedding" },
    { type: "ul", items: [
      "Structural chunking by headings with the section path prepended; parent-child chunks for long sections. See [RAG chunking strategies](/learn/rag-chunking-strategies).",
      "Metadata per chunk: tenant, document id and version, source, ACL, page, section, language, timestamps, embedding model version.",
      "PII detection tags or redacts sensitive fields per tenant policy.",
      "Embedding on a GPU pool with large batches; content hashes skip unchanged chunks.",
    ] },
    { type: "diagram", kind: "tree", caption: "Parent-child chunks. Search runs on small child chunks that match precisely, and the model reads the larger parent section, so it has enough surrounding context to answer correctly.", root: { label: "Section: Refund policy", sub: "parent · sent to the LLM", tone: "accent", children: [
      { label: "Child: time limits", sub: "embedded", tone: "store" },
      { label: "Child: damaged items", sub: "embedded", tone: "ok", path: true },
      { label: "Child: exceptions", sub: "embedded", tone: "store" },
    ] } },
    { type: "p", text: "**Content hashes avoid most embedding work.** Hash each chunk's normalised text. If that hash already has a vector for this embedding model, reuse it. A small edit to a long document then changes only one or two chunks, and shared boilerplate across many documents is embedded only once." },
    { type: "diagram", kind: "flow", caption: "Embedding with a content-hash cache. A cache hit skips the GPU completely. Misses are grouped into large batches to keep GPU throughput high, with a small wait limit so live updates don't sit around.", nodes: [
      { id: "c", label: "Chunks", col: 0, row: 0.5, shape: "pill" },
      { id: "h", label: "Hash lookup", sub: "text + model version", col: 1.1, row: 0.5, tone: "cache" },
      { id: "b", label: "Batcher", sub: "up to ~256 · 200 ms", col: 2.3, row: 0, tone: "queue" },
      { id: "g", label: "GPU embed", col: 3.4, row: 0, tone: "store" },
      { id: "r", label: "Reuse vector", col: 2.3, row: 1, tone: "ok" },
      { id: "i", label: "Index writer", col: 3.4, row: 1, shape: "db", tone: "cache" },
    ], edges: [{ from: "c", to: "h" }, { from: "h", to: "b", label: "miss" }, { from: "h", to: "r", label: "hit" }, { from: "b", to: "g" }, { from: "g", to: "i" }, { from: "r", to: "i" }] },
    { type: "callout", tone: "tip", text: "Optional enrichment: contextual retrieval adds a short model-written description to each chunk before indexing. Anthropic reported a 49% drop in failed retrievals from it, or 67% with reranking, at about $1.02 per million document tokens with prompt caching. Decide per tenant, because at 50M documents this adds a real cost." },

    { type: "h2", text: "5. Throughput and cost" },
    { type: "code", code: `Backfill    : 50M docs × ~10 pages = 500M pages
Page mix    : 70% fast path | 20% layout + table model | 10% OCR
Fast path   : 350M pages ÷ ~20 pages/s per core = 17.5M core-seconds
              e.g. 1,000 cores → ~4.9 hours
Layout      : 100M pages × ~0.5 s per page = 50M GPU-seconds
              e.g. 2,000 GPUs → ~6.9 hours
OCR         : 50M pages × ~2 s per page = 100M GPU-seconds
              e.g. 2,000 GPUs → ~13.9 hours
Chunks      : ~4 chunks/page → 2B chunks
Embedding   : 2B chunks at ~3,000 chunks/s per GPU → ~185 GPU-hours
              e.g. 40 GPUs → ~4.6 hours
Vectors     : 2B × 768 dims × 1 B (int8) ≈ 1.5 TB
              → sharded index per tenant group
Daily delta : 500K docs → ~1% of backfill work, runs continuously
(illustrative throughputs; check against your own documents)` },
    { type: "diagram", kind: "bars", caption: "GPU-hours for the backfill, from the estimates above. OCR and layout analysis dwarf embedding, the opposite of what many people expect. So a better router saves far more than a faster embedding model.", unit: " GPU-hours", values: [
      { label: "OCR (10% of pages)", value: 27800, tone: "danger" },
      { label: "Layout + tables (20%)", value: 13900, tone: "cache" },
      { label: "Embedding (all chunks)", value: 185, tone: "ok" },
    ] },
    { type: "p", text: "Backfills run at lower priority than live updates, in separate queues, so a new customer's 10-million-document import doesn't delay everyone's fresh edits." },
    { type: "diagram", kind: "flow", caption: "Live traffic and backfills share workers, with live work always first. Backfills soak up whatever is left, and a per-tenant limit stops one large import from filling the whole backfill lane.", nodes: [
      { id: "l", label: "Live updates", sub: "15-minute promise", col: 0, row: 0, shape: "queue", tone: "ok" },
      { id: "b", label: "Backfills", sub: "per-tenant quota", col: 0, row: 1, shape: "queue", tone: "muted" },
      { id: "s", label: "Priority pull", sub: "live first", col: 1.5, row: 0.5, tone: "accent" },
      { id: "w", label: "Parse workers", sub: "autoscaled", col: 2.8, row: 0.5, tone: "store" },
    ], edges: [{ from: "l", to: "s" }, { from: "b", to: "s", dashed: true }, { from: "s", to: "w" }] },

    { type: "h2", text: "6. Updates, deletes and consistency" },
    { type: "diagram", kind: "sequence", caption: "Handling a document update: the new version is processed fully, its chunks are written, and only then are the old version's chunks removed, so search never shows a half-indexed document.", actors: ["Connector", "Pipeline", "Index", "Doc registry"], steps: [
      { from: 0, to: 1, label: "doc 42 changed (v7 to v8)" },
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
    { type: "code", code: `documents(tenant_id, doc_id, source, source_version, current_version,
          status, checksum, hidden, acl_hash, last_seen_at)
stage_runs(doc_id, version, stage, status, attempts, output_path, error,
           parser_version, updated_at)` },
    { type: "diagram", kind: "flow", caption: "Deletes use a two-step process. A hidden flag takes effect in seconds, so restricted content stops appearing right away. A slower background job then removes it from every index and store, and records proof for compliance.", nodes: [
      { id: "a", label: "Delete event", col: 0, row: 0, shape: "pill", tone: "danger" },
      { id: "b", label: "Registry: hidden", sub: "seconds", col: 1.2, row: 0, tone: "danger" },
      { id: "c", label: "Query filter", sub: "hides at once", col: 2.4, row: 0, tone: "ok" },
      { id: "d", label: "Purge job", sub: "vectors · chunks", col: 1.2, row: 1, tone: "queue" },
      { id: "e", label: "Audit record", sub: "deleted at", col: 2.4, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "b", to: "d", dashed: true }, { from: "d", to: "e" }] },
    { type: "diagram", kind: "flow", caption: "Reconciliation catches what events miss. Webhooks get dropped, and bugs happen. A nightly job compares three lists, and any mismatch becomes a repair job, so the system heals without anyone noticing.", nodes: [
      { id: "s", label: "Source listing", col: 0, row: 0, tone: "store" },
      { id: "r", label: "Doc registry", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "i", label: "Index contents", col: 0, row: 2, shape: "db", tone: "cache" },
      { id: "c", label: "Compare", sub: "ids + versions", col: 1.5, row: 1, tone: "accent" },
      { id: "x", label: "Repair jobs", sub: "ingest · delete", col: 3, row: 1, shape: "queue", tone: "queue" },
    ], edges: [{ from: "s", to: "c" }, { from: "r", to: "c" }, { from: "i", to: "c" }, { from: "c", to: "x" }] },

    { type: "h2", text: "7. Reliability" },
    { type: "ul", items: [
      "Each stage is idempotent (keyed by document id and version), so retries are safe; see [idempotency](/learn/idempotency).",
      "Poison documents (parser crashes, huge files) go to a [dead-letter queue](/learn/pipeline-error-handling) after a few attempts, with alerts.",
      "Per-tenant quotas and fair scheduling prevent one tenant from starving others; see [multi-tenancy](/learn/multi-tenancy).",
      "Sandboxed parsers: documents are untrusted input (malformed files, macros, zip bombs).",
    ] },
    { type: "diagram", kind: "flow", caption: "A failing document. It retries with backoff, then falls back to a simpler parser so that at least its plain text is searchable. If that fails too, it goes to a dead-letter queue, and the rest of the pipeline never slows down.", nodes: [
      { id: "m", label: "Message", col: 0, row: 0, shape: "queue", tone: "queue" },
      { id: "p", label: "Sandboxed parser", sub: "CPU + memory limits", col: 1.2, row: 0, tone: "accent" },
      { id: "o", label: "Next stage", col: 2.5, row: 0, tone: "ok" },
      { id: "r", label: "Retry ×3", sub: "with backoff", col: 1.2, row: 1, tone: "cache" },
      { id: "f", label: "Fallback parser", sub: "text only", col: 2.5, row: 1, tone: "store" },
      { id: "d", label: "Dead-letter queue", sub: "alert + review", col: 2.5, row: 2, shape: "queue", tone: "danger" },
    ], edges: [{ from: "m", to: "p" }, { from: "p", to: "o" }, { from: "p", to: "r", dashed: true }, { from: "r", to: "f" }, { from: "f", to: "o", dashed: true }, { from: "f", to: "d", dashed: true }] },
    { type: "callout", tone: "warning", text: "Documents are also a security boundary. A PDF can carry exploits for a parser library, or text that targets a downstream LLM. Run parsers in isolated sandboxes with no network, strict limits and short lifetimes, and keep each tenant's data in its own storage paths and index partitions." },

    { type: "h2", text: "8. Quality monitoring" },
    { type: "ul", items: [
      "Parse quality signals: empty or garbled text ratio, OCR confidence, table detection rate per source and format.",
      "Freshness: lag from source change to searchable, per connector; delete propagation time.",
      "Downstream retrieval recall on a golden question set after any parser or chunker change; see [LLM evaluation](/learn/llm-evaluation).",
    ] },
    { type: "diagram", kind: "flow", caption: "Quality checks on a parser change. Silent quality loss is the main risk, so a new version runs on a sample, and the team compares both cheap signals and real retrieval results before any full reprocess.", nodes: [
      { id: "a", label: "New parser version", col: 0, row: 0, tone: "accent" },
      { id: "b", label: "Sample documents", sub: "by format", col: 1.2, row: 0, tone: "store" },
      { id: "c", label: "Signals", sub: "garbled · empty · tables", col: 2.4, row: 0, tone: "cache" },
      { id: "d", label: "Golden questions", sub: "recall compared", col: 3.6, row: 0, tone: "queue" },
      { id: "e", label: "Roll out", sub: "by tenant", col: 3.6, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }] },
    { type: "table", head: ["Alert", "Likely cause"], rows: [
      ["Empty-text ratio jumps for one source", "New export format, or connector bug"],
      ["Garbled-text ratio rises", "Bad character encoding or font mapping in new PDFs"],
      ["Source-to-search lag grows", "Queue backlog, or a stuck connector"],
      ["Chunk count per doc changes sharply", "Chunker bug or a parser change"],
      ["Vector count differs from chunk count", "Failed index writes"],
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*A tenant wants their data deleted within 24 hours. Can you promise it?* Yes for live indexes through the purge job. Remember derived data too: caches, parsed files and backups with their own expiry.",
      "*How do you handle a 2,000-page PDF?* Split it into page batches that run in parallel, and join the results. The document becomes searchable when all its batches finish, or in progressive steps if allowed.",
      "*Should you use one vision model for everything?* It's simple and handles hard layouts well, but cost and hallucination risk make it a poor default at this scale. Use it for pages that need it.",
      "*How do you reprocess after a parser upgrade?* Run from stored raw files, with a low priority and a per-tenant rollout, while the old index keeps serving.",
      "*Answers from one document got worse. Where do you look?* Check each stage's saved output in turn, as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Finding why answers about a document got worse. Each stage has a saved output to inspect, which is another reason to keep them.", root: { label: "Bad answers from doc", tone: "danger", children: [
      { label: "Parsed text bad?", tone: "queue", children: [{ label: "Router" }, { label: "OCR" }] },
      { label: "Chunks bad?", tone: "cache", children: [{ label: "Boundaries" }, { label: "Lost headings" }] },
      { label: "Not in index?", tone: "store", children: [{ label: "Stale version" }, { label: "Write failed" }] },
    ] } },
  ],
  uses: [
    { name: "Enterprise search and RAG", text: "Feeds permission-aware indexes for internal assistants; see [RAG chatbot](/learn/design-rag-chatbot)." },
    { name: "Document AI products", text: "Contracts, invoices and claims parsed into structured fields with page-level citations." },
    { name: "Compliance and e-discovery", text: "Large archives made searchable with strict deletion and audit guarantees." },
  ],
  interview: [
    "Split into queue-connected stages that scale and retry independently, and save each stage's output.",
    "Route pages to cheap parsers first and escalate hard ones to OCR or vision models.",
    "Size backfill parsing and embedding, and isolate backfills from live updates.",
    "Handle versions, deletes and revocations with a registry, fast hide and reconciliation.",
    "Sandbox parsers and monitor parse quality, since bad parsing fails silently.",
  ],
  related: ["rag-chunking-strategies", "design-rag-chatbot", "retrieval-augmented-generation", "pipeline-error-handling", "message-queues", "embeddings"],
  practice: ["document-ingestion", "rag-search", "etl-framework", "file-storage"],
  reading: [
    { title: "Docling Technical Report", publisher: "IBM Research, 2024", url: "https://arxiv.org/abs/2408.09869" },
    { title: "Docling: An Efficient Open-Source Toolkit for AI-driven Document Conversion", publisher: "Livathinos et al., 2025", url: "https://arxiv.org/abs/2501.17887" },
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", publisher: "Lewis et al., NeurIPS 2020", url: "https://arxiv.org/abs/2005.11401" },
    { title: "Introducing Contextual Retrieval", publisher: "Anthropic, 2024", url: "https://www.anthropic.com/news/contextual-retrieval" },
  ],
};
