export default {
  blocks: [
    { type: "p", text: "**LLM inference** turns a prompt into generated text one token at a time, and serving it efficiently is a different problem from serving ordinary models. Each request has a **prefill** phase that processes the whole prompt in parallel and a **decode** phase that generates tokens sequentially, each depending on the last. Throughput comes from **batching many requests together**, latency from keeping the **KV cache** in fast GPU memory, and cost from how well those two are balanced." },

    { type: "h2", text: "Prefill and decode" },
    { type: "table", head: ["", "Prefill", "Decode"], rows: [
      ["What happens", "Process all prompt tokens at once and build the KV cache", "Generate one token per step, reading the whole KV cache"],
      ["Bottleneck", "Compute (matrix multiplications)", "Memory bandwidth (reading weights and cache every step)"],
      ["User-visible metric", "Time to first token (TTFT)", "Time per output token, tokens per second"],
      ["Grows with", "Prompt length", "Output length and number of concurrent sequences"],
    ] },
    { type: "p", text: "Long prompts (big RAG contexts, long chat histories) mostly hurt time to first token. Long answers mostly hurt total latency. Users perceive streaming output as fast once the first tokens appear, so streaming tokens over [SSE or WebSockets](/learn/real-time-communication) is standard." },

    { type: "h2", text: "The KV cache" },
    { type: "p", text: "During generation, each layer's attention needs keys and values for every previous token. Recomputing them each step would be wasteful, so they're cached on the GPU. The cache grows with sequence length × number of concurrent requests and can exceed the model's own weights in memory. How the cache is managed decides how many requests fit on a GPU at once." },
    { type: "ul", items: [
      "**Paged attention:** allocate the cache in fixed-size blocks, like virtual memory pages, instead of one contiguous region per request. This avoids fragmentation and fits more concurrent sequences.",
      "**Prefix caching:** requests that share a prompt prefix (a long system prompt, the same document) reuse its cached keys and values instead of recomputing them.",
      "**Limits:** cap maximum context and output length per request, since one huge request can crowd out many small ones.",
    ] },

    { type: "h2", text: "Batching" },
    { type: "p", text: "Decode steps are memory-bound, so a GPU can generate the next token for many sequences in roughly the time it takes for one. **Static batching** waits for a full batch and then runs it until the longest sequence finishes, leaving finished slots idle. **Continuous (in-flight) batching** adds new requests and removes finished ones at every step, keeping the GPU busy and cutting queueing delay." },
    { type: "diagram", kind: "flow", caption: "A serving stack: a gateway handles auth, limits and routing; inference servers run continuous batching over a paged KV cache on GPUs.", nodes: [
      { id: "app", label: "Application", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "LLM gateway", sub: "auth · quotas · routing", col: 1.3, row: 1, tone: "accent" },
      { id: "cache", label: "Response / prefix cache", col: 1.3, row: 2.2, shape: "db", tone: "cache" },
      { id: "small", label: "Small model pool", sub: "cheap · fast", col: 2.7, row: 0.4 },
      { id: "large", label: "Large model pool", sub: "continuous batching", col: 2.7, row: 1.6 },
      { id: "gpu", label: "GPUs", sub: "weights + paged KV cache", col: 4, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "app", to: "gw" }, { from: "gw", to: "cache", dashed: true }, { from: "gw", to: "small" }, { from: "gw", to: "large" },
      { from: "small", to: "gpu" }, { from: "large", to: "gpu" },
    ] },

    { type: "h2", text: "Making it cheaper and faster" },
    { type: "table", head: ["Technique", "Effect", "Trade-off"], rows: [
      ["Quantisation (8-bit, 4-bit weights)", "Less memory, more concurrent requests, faster decode", "Some quality loss; validate on your tasks"],
      ["Speculative decoding", "A small draft model proposes tokens the big model verifies in one step", "Extra complexity; speed-up depends on how often drafts are accepted"],
      ["Model routing", "Send easy requests to a small model, hard ones to a large one", "Needs a reliable router and evaluation per route"],
      ["Prompt trimming", "Shorter prompts cut prefill time and cost", "Must not drop context the answer needs"],
      ["Tensor parallelism across GPUs", "Fits larger models and lowers per-token latency", "Needs fast interconnects; more GPUs per replica"],
      ["Caching", "Reuse prefixes or whole responses for repeated inputs", "Responses must be safe to share; invalidation"],
    ] },

    { type: "h2", text: "Operating an LLM service" },
    { type: "ul", items: [
      "**Capacity is measured in tokens,** not requests: plan for input and output tokens per second at peak, and rate-limit per tenant in tokens. See [rate limiting](/learn/rate-limiting).",
      "**Autoscale slowly-loading replicas carefully:** loading tens of gigabytes of weights takes time, so keep warm headroom.",
      "**Timeouts and fallbacks:** cap generation length, time out stuck requests, and fall back to a smaller model or a cached answer under overload. See [load shedding](/learn/load-shedding).",
      "**Observe the right signals:** TTFT, tokens per second, queue time, KV cache utilisation, GPU utilisation, error and refusal rates, and cost per request.",
      "**Safety and evaluation:** input and output filters, and regression evaluation whenever the model, prompt or quantisation changes. See [AI application architecture](/learn/ai-application-architecture).",
    ] },
  ],
  uses: [
    { name: "Chat assistants", text: "Streamed responses with continuous batching and prefix caching of the long system prompt." },
    { name: "RAG search", text: "Long retrieved contexts make prefill dominant, so context size and prefix caching drive latency." },
    { name: "Batch summarisation", text: "Offline jobs run at large batch sizes on cheaper capacity, optimising throughput over latency." },
  ],
  interview: [
    "Separate prefill and decode, and map them to time to first token and tokens per second.",
    "Explain the KV cache and why it limits concurrency.",
    "Use continuous batching and streaming, and plan capacity in tokens.",
    "Cut cost with routing, quantisation and caching, validated by evaluation.",
  ],
  related: ["ai-application-architecture", "retrieval-augmented-generation", "model-serving", "rate-limiting", "autoscaling"],
  practice: ["rag-search", "model-serving"],
  reading: [
    { title: "Efficient Memory Management for LLM Serving with PagedAttention", publisher: "Kwon et al., arXiv", url: "https://arxiv.org/abs/2309.06180" },
    { title: "vLLM documentation", publisher: "vLLM project", url: "https://docs.vllm.ai/en/latest/" },
  ],
};
