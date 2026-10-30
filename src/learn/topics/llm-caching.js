export default {
  blocks: [
    { type: "p", text: "LLM calls are slow and priced per token, so caching pays off more than almost anywhere else in a system. There are four distinct kinds: **exact response caching** (same request, same answer), **prompt caching** (the provider or server reuses work on a repeated prompt prefix), **semantic caching** (return a stored answer for a differently worded but equivalent question), and **KV cache reuse** inside a serving engine. Each has different savings and different ways to go wrong." },

    { type: "h2", text: "The four layers" },
    { type: "diagram", kind: "flow", caption: "Caching layers for an LLM request, from cheapest to deepest. Response caches skip the model entirely; prompt and KV caches make the model call itself cheaper and faster.", nodes: [
      { id: "req", label: "Request", col: 0, row: 1, shape: "pill" },
      { id: "exact", label: "Exact cache", sub: "hash of full request", col: 1.3, row: 1, shape: "db", tone: "cache" },
      { id: "sem", label: "Semantic cache", sub: "embedding similarity", col: 2.6, row: 1, shape: "db", tone: "cache" },
      { id: "llm", label: "Model call", col: 3.9, row: 1, tone: "accent" },
      { id: "pc", label: "Prompt / prefix cache", sub: "reuse shared prefix", col: 3.9, row: 2.3, tone: "store", w: 170 },
      { id: "resp", label: "Response", col: 5.2, row: 1, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "req", to: "exact" }, { from: "exact", to: "sem", label: "miss" }, { from: "sem", to: "llm", label: "miss" }, { from: "llm", to: "pc", both: true }, { from: "llm", to: "resp" },
      { from: "exact", to: "resp", dashed: true, label: "hit" },
    ] },

    { type: "h2", text: "1. Exact response caching" },
    { type: "p", text: "Key on a hash of everything that affects the output: model and version, prompt template version, parameters, retrieved context ids, and the input. Safe and simple; useful for repeated, deterministic requests (classifying the same product title, summarising the same document, popular FAQ answers at temperature 0)." },
    { type: "ul", items: [
      "Include versions in the key so a prompt or model change never serves stale answers.",
      "Never share entries across users when the response depends on user data or permissions.",
      "Set TTLs by how fast the underlying data changes; see [cache invalidation](/learn/cache-invalidation).",
    ] },

    { type: "h2", text: "2. Prompt caching (prefix caching)" },
    { type: "p", text: "Many requests share a long identical **prefix**: the system prompt, tool definitions, few-shot examples, a large document being questioned repeatedly. Providers and self-hosted engines can store the computed state for that prefix and reuse it, charging less for cached input tokens and cutting time to first token. It never returns a wrong answer, because the model still generates fresh output." },
    { type: "diagram", kind: "segments", width: 780, caption: "Ordering a prompt for prefix caching. The stable parts form an identical prefix across requests and can be cached; only the per-request tail is processed fresh.", lanes: [
      { label: "request 1", parts: [{ label: "system + tools + examples (cached)", size: 5, tone: "ok" }, { label: "docs A", size: 2, tone: "store" }, { label: "question 1", size: 1, tone: "accent" }] },
      { label: "request 2", parts: [{ label: "system + tools + examples (cached)", size: 5, tone: "ok" }, { label: "docs B", size: 2, tone: "store" }, { label: "question 2", size: 1, tone: "accent" }] },
    ] },
    { type: "ul", items: [
      "Put stable content first and variable content last; a single changed character early in the prompt breaks the shared prefix.",
      "Don't put timestamps or request ids at the top of the system prompt.",
      "Caches expire after minutes of inactivity; benefits are largest for steady traffic on the same prefix.",
    ] },

    { type: "h2", text: "3. Semantic caching" },
    { type: "p", text: "Embed each incoming question, search a vector index of previously answered questions, and if the nearest one is above a similarity threshold, return its stored answer. It catches paraphrases (\"how do I reset my password\" vs \"forgot password, what now\"), which exact caching can't." },
    { type: "callout", tone: "warning", text: "Semantic caching can return confidently wrong answers: \"cancel my order\" and \"don't cancel my order\" embed closely; \"price in the US\" and \"price in the UK\" may too. Use high thresholds, scope the cache to safe, non-personal, non-time-sensitive intents, and evaluate false hits explicitly." },
    { type: "table", head: ["Good fit", "Poor fit"], rows: [
      ["Public FAQ answers that don't depend on the user", "Anything personalised or permission-dependent"],
      ["Stable product documentation", "Prices, stock, news and other fast-changing facts"],
      ["High-volume repetitive questions", "Long, unique, multi-turn conversations"],
    ] },

    { type: "h2", text: "4. KV cache reuse in serving engines" },
    { type: "p", text: "Inside an inference server, each request's attention keys and values (the **KV cache**) live in GPU memory during generation. Engines with prefix caching keep KV blocks for common prefixes and share them across requests, the self-hosted equivalent of provider prompt caching. Memory is the constraint: cached prefixes compete with active requests for GPU memory. See [LLM serving](/learn/llm-inference-serving)." },

    { type: "h2", text: "Estimating the savings" },
    { type: "code", code: `Support bot: 10M requests/day, prompt = 3,000-token stable prefix + 1,500 variable
Prompt caching (say 90% prefix hit rate, cached tokens billed at ~10% of normal):
  prefix tokens/day   = 10M × 3,000 = 30B
  billed equivalent   = 30B × (0.1 × 0.9 + 1.0 × 0.1) = 5.7B  → ~80% off the prefix
Semantic cache on FAQ-type intents (say 25% of traffic, 60% hit rate within it):
  model calls avoided = 10M × 0.25 × 0.6 = 1.5M/day (15%), each answered in ~30 ms
(Illustrative rates; check your provider's actual pricing and cache behaviour.)` },

    { type: "h2", text: "Operating caches" },
    { type: "ul", items: [
      "Track hit rates, latency saved, cost saved and (for semantic caches) sampled false-hit rate.",
      "Invalidate on prompt, model or source-document changes; versioned keys make this automatic.",
      "Keep cache contents subject to the same privacy rules as logs: PII redaction, retention limits, per-tenant isolation.",
    ] },
  ],
  uses: [
    { name: "Chat assistants", text: "Long system prompts and tool definitions served from prompt cache on every turn." },
    { name: "Document Q&A", text: "A large document cached as a prefix while the user asks many questions about it." },
    { name: "Help centres", text: "Semantic caching of high-volume, non-personal FAQ answers." },
  ],
  interview: [
    "Separate response caches (skip the model) from prompt and KV caches (cheaper model calls).",
    "Order prompts stable-first to maximise prefix cache hits.",
    "Scope semantic caching to safe intents and measure false hits.",
    "Version cache keys and respect per-user data boundaries.",
  ],
  related: ["llm-cost-optimization", "llm-gateway", "llm-inference-serving", "caching", "cache-invalidation", "vector-databases"],
  practice: ["model-serving", "distributed-cache"],
  reading: [
    { title: "Prompt caching", publisher: "Anthropic documentation", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" },
    { title: "Efficient Memory Management for Large Language Model Serving with PagedAttention", publisher: "Kwon et al., SOSP 2023", url: "https://arxiv.org/abs/2309.06180" },
  ],
};
