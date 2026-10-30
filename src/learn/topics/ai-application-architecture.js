export default {
  blocks: [
    { type: "p", text: "An **AI application** is a product system wrapped around a model, not just a prompt sent to an API. A reliable design authenticates the user, enforces permissions, assembles bounded context, chooses a model or tool, validates the result, handles timeouts and cost, and measures whether the response actually helped." },

    { type: "h2", text: "A request path around the model" },
    { type: "diagram", kind: "flow", caption: "A policy-aware orchestrator builds bounded context, calls the model or approved tools, validates the result, and records safe operational signals.", nodes: [
      { id: "user", label: "User / client", sub: "question + context", col: 0, row: 1, shape: "pill" },
      { id: "gateway", label: "API gateway", sub: "auth · quota · limits", col: 1.2, row: 1, tone: "accent" },
      { id: "orchestrator", label: "Orchestrator", sub: "policy · prompt · routing", col: 2.5, row: 1, tone: "accent" },
      { id: "retrieve", label: "Retrieval", sub: "search · permissions", col: 3.8, row: 0, shape: "db", tone: "store" },
      { id: "tools", label: "Approved tools", sub: "scoped actions", col: 3.8, row: 2, tone: "queue" },
      { id: "model", label: "Model provider", sub: "bounded inference", col: 5.1, row: 1, tone: "cache" },
      { id: "validate", label: "Validate + respond", sub: "schema · safety", col: 6.4, row: 1, shape: "pill" },
    ], edges: [
      { from: "user", to: "gateway" }, { from: "gateway", to: "orchestrator" },
      { from: "orchestrator", to: "retrieve" }, { from: "orchestrator", to: "tools" },
      { from: "retrieve", to: "model" }, { from: "tools", to: "model" },
      { from: "orchestrator", to: "model" }, { from: "model", to: "validate" },
      { from: "validate", to: "user" },
    ] },
    { type: "p", text: "The **orchestrator** is the application boundary: it decides what context and tools are permitted, limits model work, and turns provider-specific responses into a stable product contract. Keep the synchronous path short. Long-running generation, document ingestion, and bulk evaluation usually belong in a queue with explicit progress and cancellation behavior." },

    { type: "h2", text: "Retrieval-augmented generation" },
    { type: "ol", items: [
      "Ingest source documents, remove or mark sensitive content, and preserve source IDs and access-control metadata.",
      "Split documents into useful chunks, compute embeddings, and store them with searchable text and metadata.",
      "At request time, apply the user's authorization filters before returning candidates; combine lexical and vector search when exact terms matter.",
      "Rerank and trim the retrieved context to the model's token budget, then ask for an answer grounded in the supplied sources.",
      "Return citations or source links and define what the product does when retrieval is empty or low confidence.",
    ] },
    { type: "p", text: "A vector index improves semantic candidate retrieval, but it is not the source of truth for permissions or current documents. Keep an authoritative document store and propagate deletes and access changes to the index. Retrieval quality depends on chunking, metadata, query rewriting, and evaluation—not only the embedding model." },

    { type: "h2", text: "Tools, safety and trust boundaries" },
    { type: "ul", items: [
      "Treat model output and retrieved text as untrusted input. A document can contain prompt injection instructions; never let retrieved content grant new privileges.",
      "Give each tool a narrow schema and least-privilege identity. Validate arguments in application code and request user confirmation before consequential actions.",
      "Enforce user and tenant authorization before retrieval, tool execution, and result delivery; filtering only at the final UI is too late.",
      "Use moderation and policy checks appropriate to the product, but keep deterministic business rules outside the model.",
      "Redact secrets and personal data from logs. Decide whether prompts and outputs are retained, who can inspect them, and how users can request deletion.",
    ] },
    { type: "callout", tone: "warning", text: "A prompt is not an authorization mechanism. The server must enforce every permission and validate every action even when the model appears to follow instructions." },

    { type: "h2", text: "Latency, cost and graceful failure" },
    { type: "table", head: ["Concern", "Design response"], rows: [
      ["Provider latency or outage", "Use an end-to-end deadline, bounded retry with jitter, a user-visible failure state, and a simpler fallback where one is safe."],
      ["Unbounded token use", "Set input and output budgets, cap conversation history, and meter by user, tenant, and model."],
      ["Repeated identical work", "Cache only when the key includes model, prompt version, authorization scope, and relevant context; expire or invalidate sensitive results."],
      ["Slow document indexing", "Accept documents asynchronously, expose processing status, and make retries idempotent."],
      ["Traffic spikes", "Apply quotas and concurrency limits before calling the provider; queue work that need not be interactive."],
      ["Malformed model output", "Request structured output where supported, validate it against a schema, and handle invalid responses explicitly."],
    ] },

    { type: "h2", text: "Evaluate the application, not just the model" },
    { type: "p", text: "Build a representative test set from real product tasks and measure answer usefulness, groundedness, citation correctness, refusal behavior, and tool selection. Run it when prompts, retrieval settings, models, or data change. Use shadow traffic or a small rollout for changes that affect users, and retain a safe rollback. Production telemetry should include latency, token cost, retrieval hit quality, tool errors, and user feedback without recording secrets." },
    { type: "h2", text: "A practical interview sequence" },
    { type: "ol", items: [
      "Clarify the user task, data sensitivity, response latency, quality bar, and what actions the assistant may take.",
      "Draw authentication, orchestration, retrieval, model inference, validation, and response as explicit boundaries.",
      "Explain document ingestion, authorization-aware retrieval, citations, and deletion propagation.",
      "Bound tools, context, retries, tokens, and provider concurrency; describe failure and fallback behavior.",
      "Finish with offline evaluations, staged rollout, quality monitoring, and cost controls.",
    ] },
  ],
  uses: [
    { name: "Knowledge assistant", text: "Retrieves authorized passages from internal documentation, cites the source, and declines to invent an answer when evidence is missing." },
    { name: "Support copilot", text: "Summarizes a customer issue and proposes a response while requiring a human to approve any account change or outbound message." },
    { name: "Developer assistant", text: "Combines repository search with narrowly scoped tools, validating every proposed change before it can affect a codebase." },
  ],
  interview: [
    "Keep authentication, authorization, and deterministic policy enforcement outside the model.",
    "For RAG, include ingestion, metadata, permission filters, citations, deletion, and an empty-result path.",
    "Bound token usage, provider concurrency, retries, and tool permissions.",
    "Describe an evaluation set and a staged rollout instead of relying on a single model benchmark.",
  ],
  related: ["machine-learning-system-architecture", "data-engineering-architecture", "authentication-authorization", "api-gateway", "caching", "observability", "ai-agent-architecture", "llm-guardrails", "llm-gateway", "llm-evaluation", "ai-engineering-roadmap"],
  practice: ["model-serving"],
};
