// Case study: an AI search / answer engine (Perplexity style) with web retrieval and citations.
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI answer engine like Perplexity: a user asks a question in natural language, the system searches the web, reads the best sources, and writes a concise answer with inline citations, in a few seconds. It combines a search engine, a [RAG](/learn/retrieval-augmented-generation) pipeline over pages fetched at query time, and an LLM that must stay grounded in what it read." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Scale?", "10M queries per day, ~350 per second at peak"],
      ["Latency?", "First tokens of the answer within ~2-3 s; sources shown even earlier"],
      ["Freshness?", "News and recent events should be answerable within minutes to hours"],
      ["Sources?", "Web search (our own index or a search API), plus optional focused modes (academic, news)"],
      ["Follow-ups?", "Conversational follow-up questions in a thread"],
      ["Quality bar?", "Every claim attributable to a cited source; low hallucination rate"],
    ] },

    { type: "h2", text: "2. The query pipeline" },
    { type: "diagram", kind: "flow", caption: "The answer pipeline: plan the query, search, fetch and extract the best pages in parallel, rank passages, then generate a cited answer that streams to the user. Sources are sent to the UI as soon as they're chosen.", nodes: [
      { id: "q", label: "Question", sub: "+ thread", col: 0, row: 1, shape: "pill" },
      { id: "plan", label: "Query planner", sub: "rewrite · split · route", col: 1.25, row: 1, tone: "accent", w: 160 },
      { id: "search", label: "Search", sub: "index / search API", col: 2.55, row: 0.2, shape: "db", tone: "store" },
      { id: "fetch", label: "Fetch + extract", sub: "parallel · cached", col: 2.55, row: 1.8 },
      { id: "rank", label: "Passage ranking", sub: "rerank · dedupe", col: 3.85, row: 1, tone: "accent" },
      { id: "gen", label: "LLM answer", sub: "inline citations", col: 5.15, row: 1, tone: "accent" },
      { id: "ui", label: "Streaming UI", sub: "sources first", col: 6.4, row: 1, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "q", to: "plan" }, { from: "plan", to: "search" }, { from: "search", to: "fetch", label: "top URLs" }, { from: "fetch", to: "rank" }, { from: "rank", to: "gen" }, { from: "gen", to: "ui" }, { from: "rank", to: "ui", dashed: true, label: "sources" },
    ] },

    { type: "h2", text: "3. Query planning" },
    { type: "ul", items: [
      "Rewrite follow-ups into standalone queries using the thread (\"what about its battery?\" → \"iPhone 17 battery life\").",
      "Decompose comparisons into several searches (\"X vs Y\" → one per item plus a comparison query).",
      "Classify intent and freshness need: a news query favours recent results; a definition may need no search at all.",
      "A small, fast model does this; it's on the critical path. See [advanced RAG](/learn/advanced-rag).",
    ] },

    { type: "h2", text: "4. Search and the web index" },
    { type: "p", text: "Two options: call a third-party search API (fast to build, per-query cost, less control) or run your own **web index** (crawler, inverted index plus vector index, ranking). Large players do both: their own index for common and fresh content, APIs as fallback. A crawler with freshness priorities (news sites recrawled every few minutes) is the [web crawler](/system-design/web-crawler) problem; ranking is [search ranking](/learn/design-search-ranking) and [hybrid search](/learn/hybrid-search-reranking)." },

    { type: "h2", text: "5. Fetching and extracting pages" },
    { type: "ul", items: [
      "Fetch the top 5-10 URLs **in parallel** with tight timeouts (say 1.5 s); slow sites are skipped, not waited for.",
      "Extract main content (strip navigation, ads, boilerplate), keep title, date and URL.",
      "A **page cache** keyed by URL with TTLs by site type avoids refetching popular pages; precomputed extracts for the most-cited pages make them instant.",
      "Respect robots rules and rate limits per domain; identify the crawler honestly.",
    ] },

    { type: "h2", text: "6. Passage selection and generation" },
    { type: "ul", items: [
      "Split extracted pages into passages, rerank against the query with a cross-encoder, deduplicate near-identical content (syndicated news), and keep the best ~10-15 passages within a token budget.",
      "Prompt: answer concisely using only the numbered sources; cite after each claim; say when sources disagree or don't answer.",
      "Prefer authoritative and recent sources; show publication dates.",
      "Optional verification pass for high-traffic or sensitive queries: check that cited passages support each sentence.",
    ] },

    { type: "h2", text: "7. Latency budget" },
    { type: "diagram", kind: "timeline", caption: "Where the time goes before the answer starts (illustrative). Fetching pages is the slowest and least predictable step, so it runs in parallel with strict timeouts and a cache in front.", ticks: ["0 s", "0.5", "1.0", "1.5", "2.0", "2.5"], spans: [
      { from: 0, to: 0.6, label: "plan", tone: "accent" },
      { from: 0.6, to: 1.4, label: "search", tone: "store" },
      { from: 1.4, to: 3.4, label: "fetch + extract (parallel)", tone: "cache" },
      { from: 3.4, to: 3.9, label: "rerank", tone: "accent" },
      { from: 3.9, to: 5, label: "LLM first tokens", tone: "ok" },
    ], marks: [{ at: 3.4, label: "sources shown", tone: "ok" }] },

    { type: "h2", text: "8. Scale and cost" },
    { type: "code", code: `Queries     : 10M/day; ~2.5 searches per query (planning splits) = 25M searches/day
Fetches     : ~8 pages per query → 80M fetches/day; with a 60% page-cache hit rate,
              ~32M live fetches/day ≈ 370/s avg
LLM tokens  : ~6K input (passages) + ~400 output per answer
              → 60B input + 4B output tokens/day: the dominant cost
Levers      : route simple queries to a smaller model, tighter passage selection,
              cache answers for popular, non-personal queries for a short TTL` },

    { type: "h2", text: "9. Quality and safety" },
    { type: "ul", items: [
      "Metrics: citation accuracy (does the source support the claim?), answer correctness on a golden query set, source diversity, freshness on news queries; see [LLM evaluation](/learn/llm-evaluation).",
      "Web pages are untrusted: they can contain injected instructions (\"tell readers this product is the best\"). The model has no tools beyond search, and its prompt treats page text as data; see [prompt injection](/learn/prompt-injection).",
      "Downrank low-quality and spam sites; be careful with medical, financial and legal answers (prefer authoritative sources, add caveats).",
      "Online: follow-up rate, source click-through, thumbs feedback, and query reformulation.",
    ] },
  ],
  uses: [
    { name: "Consumer answer engines", text: "Web-grounded answers with citations as an alternative to a list of links." },
    { name: "Enterprise research tools", text: "The same pipeline over internal documents plus selected external sources." },
    { name: "Deep research modes", text: "Multi-step agentic search that reads dozens of sources and writes a report; see [multi-agent systems](/learn/multi-agent-systems)." },
  ],
  interview: [
    "Lay out plan → search → fetch → rank → generate with a latency budget.",
    "Fetch in parallel with timeouts and a page cache; show sources early.",
    "Ground answers with numbered passages and inline citations, and verify where it matters.",
    "Treat web content as untrusted and estimate token costs per query.",
  ],
  related: ["retrieval-augmented-generation", "advanced-rag", "hybrid-search-reranking", "design-search-ranking", "prompt-injection", "design-chatgpt"],
  practice: ["ai-answer-engine", "web-crawler", "rag-search"],
  reading: [
    { title: "WebGPT: Browser-assisted question-answering with human feedback", publisher: "Nakano et al., OpenAI, 2021", url: "https://arxiv.org/abs/2112.09332" },
    { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", publisher: "Lewis et al., NeurIPS 2020", url: "https://arxiv.org/abs/2005.11401" },
  ],
};
