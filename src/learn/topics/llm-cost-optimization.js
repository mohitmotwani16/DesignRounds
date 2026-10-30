export default {
  blocks: [
    { type: "p", text: "LLM features can be expensive in a way most software isn't: every request has a visible marginal cost, agents can multiply it unpredictably, and costs scale with usage rather than servers. **LLM cost optimization** starts with measuring the right unit (**cost per successful task**, not per call), then applies the levers in order of impact: **model routing**, **context trimming**, **caching**, **batching**, **output control** and **bounding agent loops**, always checked against the evaluation suite so quality doesn't silently drop." },

    { type: "h2", text: "Measure cost per task" },
    { type: "p", text: "A cheap call that fails and triggers three retries and a human escalation isn't cheap. Attribute every model call (tokens in, tokens out, model, cached tokens) to a task id through tracing, and compute cost per **resolved** task alongside quality." },
    { type: "code", code: `cost per resolved conversation =
    Σ model calls (input_tokens × in_price + output_tokens × out_price − cache discounts)
  + embedding + reranking + tool/API costs
  ÷ conversations resolved without human escalation

Track it per feature, per customer tier and per model version, next to quality metrics.` },

    { type: "h2", text: "Where the tokens go" },
    { type: "diagram", kind: "bars", caption: "An illustrative token breakdown for one turn of a RAG chat assistant. Input context, not the answer, is usually the largest cost, which is why trimming and caching context pay off.", unit: "tokens", values: [
      { label: "System prompt + tools", value: 1800, display: "1,800", tone: "accent" },
      { label: "Conversation history", value: 1500, display: "1,500", tone: "muted" },
      { label: "Retrieved chunks", value: 2400, display: "2,400", tone: "store" },
      { label: "User message", value: 60, display: "60", tone: "cache" },
      { label: "Output", value: 350, display: "350", tone: "ok" },
    ] },

    { type: "h2", text: "The levers, in rough order of impact" },
    { type: "table", head: ["Lever", "How", "Typical effect", "Risk"], rows: [
      ["Model routing", "Send easy requests to a small model; escalate hard or low-confidence ones", "Large: small models can cost an order of magnitude less", "Quality drop on misrouted requests"],
      ["Context trimming", "Fewer, better retrieved chunks (reranking), summarised history, compact tool outputs", "Large on input-heavy apps", "Missing evidence"],
      ["Prompt caching", "Stable prefix first so repeated tokens are billed at a discount", "Large for long system prompts", "None to quality"],
      ["Response caching", "Exact or semantic caches for repeated questions", "Depends on repetition", "Stale or wrong hits"],
      ["Batch processing", "Use asynchronous batch APIs or offline GPU batches for non-interactive work", "Often a large discount", "Hours of latency"],
      ["Output control", "Ask for concise answers, set max tokens, structured output instead of prose", "Moderate (output tokens cost more)", "Truncation"],
      ["Bound agent loops", "Step and token budgets, better tools so fewer steps are needed", "Prevents worst cases", "Unfinished tasks"],
      ["Fine-tune or distil", "Train a small model to do a narrow task the big one did", "Large at high volume", "Lifecycle cost"],
      ["Self-host", "Run open models on your GPUs at high utilisation", "Large at steady, high volume", "Ops burden, idle capacity"],
    ] },

    { type: "h2", text: "Routing with a cascade" },
    { type: "diagram", kind: "flow", caption: "A model cascade: most requests are answered by the small model; a confidence or validation check escalates the rest to the large model. Cost falls sharply while quality on hard requests is kept.", nodes: [
      { id: "req", label: "Request", col: 0, row: 1, shape: "pill" },
      { id: "cls", label: "Router", sub: "rules or classifier", col: 1.3, row: 1, tone: "accent" },
      { id: "small", label: "Small model", sub: "~70% of traffic", col: 2.7, row: 0.3, tone: "ok" },
      { id: "check", label: "Validate / confidence", col: 4.1, row: 0.3, w: 170 },
      { id: "large", label: "Large model", sub: "hard + escalated", col: 2.7, row: 1.7, tone: "danger" },
      { id: "out", label: "Answer", col: 5.4, row: 1, shape: "pill" },
    ], edges: [
      { from: "req", to: "cls" }, { from: "cls", to: "small", label: "easy" }, { from: "cls", to: "large", label: "hard" }, { from: "small", to: "check" }, { from: "check", to: "out", label: "pass" }, { from: "check", to: "large", dashed: true, label: "fail" }, { from: "large", to: "out" },
    ] },
    { type: "code", code: `Before: 10M requests/day, all on the large model at $0.012 each   = $120,000/day
After : router sends 70% to the small model at $0.0012 each       = $8,400
        10% of those fail validation and escalate (0.7M × $0.012)  = $8,400
        30% routed straight to large (3M × $0.012)                 = $36,000
        total ≈ $52,800/day (−56%), with eval scores held within 1 point
(illustrative per-request costs)` },

    { type: "h2", text: "Cost controls in production" },
    { type: "ul", items: [
      "**Budgets** per tenant, team and feature, enforced in the [gateway](/learn/llm-gateway), with alerts at 50/80/100%.",
      "**Per-task caps** on tokens and steps for agents; log the tasks that hit them.",
      "**Abuse protection:** input length limits and per-user rate limits stop someone pasting a book into a free tier.",
      "**Cost dashboards** by feature and model; review the top 1% most expensive tasks weekly, since they're usually bugs (loops, huge tool outputs).",
      "**Pricing alignment:** if a feature's cost per user exceeds its revenue per user, product limits (quotas, tiers) are part of the design.",
    ] },

    { type: "h2", text: "API vs self-hosted economics" },
    { type: "code", code: `Self-hosted GPU at $2/hour serving a small model at ~2,000 output tokens/s aggregate
  → 7.2M tokens/hour → ~$0.28 per 1M output tokens at 100% utilisation
  → at 30% average utilisation: ~$0.93 per 1M (idle time is the hidden cost)
Compare to the API price for an equivalent model, add engineering and on-call cost,
and self-host only when traffic is high and steady enough to keep GPUs busy.
(illustrative numbers)` },
    { type: "p", text: "See [LLM serving](/learn/llm-inference-serving) for what drives GPU throughput, and [model compression](/learn/model-compression) for quantization." },
  ],
  uses: [
    { name: "Consumer assistants", text: "Routing, prompt caching and concise outputs keep cost per active user below revenue per user." },
    { name: "Back-office automation", text: "Batch APIs and distilled small models process millions of documents cheaply overnight." },
    { name: "Agents", text: "Step budgets, better tools and summarised context bound the long tail of expensive runs." },
  ],
  interview: [
    "Measure cost per successful task, attributed through traces.",
    "Show where tokens go and trim the biggest bucket first (usually context).",
    "Propose a routing cascade and quantify its effect.",
    "Add budgets, per-task caps and guardrails against abuse, and check quality with evals.",
  ],
  related: ["llm-gateway", "llm-caching", "llm-inference-serving", "choosing-an-llm", "llm-fine-tuning", "llmops-observability"],
  practice: ["model-serving", "rag-search"],
  reading: [
    { title: "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance", publisher: "Chen et al., Stanford, 2023", url: "https://arxiv.org/abs/2305.05176" },
    { title: "RouteLLM: Learning to Route LLMs with Preference Data", publisher: "Ong et al., 2024", url: "https://arxiv.org/abs/2406.18665" },
  ],
};
