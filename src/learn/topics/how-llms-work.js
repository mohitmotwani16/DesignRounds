export default {
  blocks: [
    { type: "p", text: "You don't need to train a large language model to design systems around one, but you do need a working model of **how an LLM turns input into output**, because it explains latency, cost, context limits and many failure modes. This guide covers **tokens**, the **transformer** at the level a system designer needs, **context windows**, **sampling** (temperature and top-p), how generation happens one token at a time, and how all of that becomes **per-token pricing**." },

    { type: "h2", text: "Tokens" },
    { type: "p", text: "LLMs read and write **tokens**: chunks of text produced by a tokenizer, often a whole common word, part of a rarer word, or punctuation. In English a token averages roughly three-quarters of a word, so 1,000 tokens is about 750 words. Code, numbers and non-English text often use more tokens per word." },
    { type: "diagram", kind: "segments", width: 780, caption: "A sentence split into tokens (illustrative; every tokenizer splits differently). Common words are one token; rarer words and numbers split into several. Limits, latency and price are all counted in tokens.", lanes: [{ parts: [
      { label: "Design", size: 1.1, tone: "accent" },
      { label: " a", size: 0.6, tone: "store" },
      { label: " scal", size: 0.8, tone: "accent" },
      { label: "able", size: 0.8, tone: "accent" },
      { label: " RAG", size: 0.8, tone: "store" },
      { label: " system", size: 1.1, tone: "accent" },
      { label: " for", size: 0.7, tone: "store" },
      { label: " 10", size: 0.6, tone: "cache" },
      { label: "M", size: 0.5, tone: "cache" },
      { label: " docs", size: 0.8, tone: "accent" },
    ] }] },
    { type: "ul", items: [
      "**Limits** (context window, max output) are in tokens.",
      "**Price** is per token, usually per million, with output tokens costing several times more than input tokens.",
      "**Latency** grows with output tokens, because they're generated one at a time.",
    ] },

    { type: "h2", text: "What happens inside, briefly" },
    { type: "p", text: "Each token becomes an [embedding](/learn/embeddings) vector. A stack of **transformer** layers updates every token's vector using **attention**, which lets each position look at all earlier positions to decide what's relevant. The final layer produces a score for every token in the vocabulary; those scores become a probability distribution over **the next token**. That's all an LLM does: predict the next token, repeatedly." },
    { type: "diagram", kind: "flow", caption: "Autoregressive generation. The model predicts one token, appends it to the input, and runs again. The prompt is processed once in parallel (prefill); every output token needs another step (decode).", nodes: [
      { id: "p", label: "Prompt tokens", col: 0, row: 1, shape: "queue", tone: "queue" },
      { id: "m", label: "Transformer", sub: "attention layers", col: 1.5, row: 1, tone: "accent" },
      { id: "d", label: "Next-token probabilities", col: 3, row: 1, w: 170 },
      { id: "s", label: "Sample", sub: "temperature · top-p", col: 4.4, row: 1, tone: "ok" },
      { id: "t", label: "New token", col: 4.4, row: 2.2, shape: "pill" },
    ], edges: [
      { from: "p", to: "m" }, { from: "m", to: "d" }, { from: "d", to: "s" }, { from: "s", to: "t" }, { from: "t", to: "m", dashed: true, label: "append, repeat" },
    ] },
    { type: "p", text: "Two phases matter for serving: **prefill** reads the whole prompt in one parallel pass (fast per token, sets the time to first token), and **decode** generates output tokens one by one (sets the streaming speed). Serving systems keep each token's attention keys and values in a **KV cache** so they aren't recomputed every step. See [LLM serving](/learn/llm-inference-serving)." },

    { type: "h2", text: "Context windows" },
    { type: "p", text: "The **context window** is the maximum number of tokens (prompt plus output) the model can attend to in one call. Everything the model knows about this request has to fit: system instructions, conversation history, retrieved documents, tool results. The model remembers nothing between calls; your application resends what it needs each time." },
    { type: "ul", items: [
      "Long contexts cost more (you pay for every input token) and are slower to prefill.",
      "Models use information in very long contexts unevenly; facts buried in the middle are recalled less reliably than those at the start or end.",
      "So even with large windows, **selecting** the right context ([RAG](/learn/retrieval-augmented-generation), [memory](/learn/agent-memory)) usually beats stuffing everything in.",
    ] },

    { type: "h2", text: "Sampling: temperature and top-p" },
    { type: "table", head: ["Setting", "What it does", "Use"], rows: [
      ["Temperature 0 (or near)", "Almost always picks the most likely token", "Extraction, classification, code, anything that needs consistency"],
      ["Temperature 0.7-1.0", "More varied, creative output", "Brainstorming, writing, multiple candidate answers"],
      ["Top-p (nucleus)", "Samples only from the smallest set of tokens whose probability sums to p", "Cuts off very unlikely tokens while keeping variety"],
      ["Max tokens", "Hard cap on output length", "Cost and latency control; truncation must be handled"],
      ["Stop sequences", "End generation when a string appears", "Delimited formats, agent loops"],
    ] },
    { type: "callout", tone: "warning", text: "Even at temperature 0, outputs aren't guaranteed identical across calls or model versions. Design for variation: validate outputs, retry, and pin model versions in production." },

    { type: "h2", text: "From base model to assistant" },
    { type: "ol", items: [
      "**Pretraining** on a huge text corpus teaches next-token prediction and broad knowledge.",
      "**Instruction tuning** (supervised fine-tuning on examples of instructions and good answers) makes it follow requests.",
      "**Preference tuning** (from human or AI feedback) makes answers more helpful and safer.",
    ] },
    { type: "p", text: "The knowledge has a **cutoff date** and isn't your private data, which is why products add retrieval and tools. Adapting models yourself is covered in [fine-tuning vs RAG](/learn/llm-fine-tuning)." },

    { type: "h2", text: "Why LLMs fail the way they do" },
    { type: "ul", items: [
      "**Hallucination:** the model produces fluent, plausible text whether or not it knows the answer. Grounding with retrieval and citations, and asking it to say when it doesn't know, reduce it.",
      "**Instruction conflicts:** text in the prompt from untrusted sources can be read as instructions. See [prompt injection](/learn/prompt-injection).",
      "**Format drift:** free-text output doesn't reliably match a schema. See [structured outputs](/learn/llm-structured-outputs).",
      "**Arithmetic and exact recall:** better handled by tools (a calculator, a database query) than by the model.",
    ] },

    { type: "h2", text: "Turning tokens into cost and latency" },
    { type: "code", code: `Request: 2,000 input tokens, 400 output tokens
Cost   = 2,000 × input_price + 400 × output_price
         e.g. at $3 / $15 per 1M → $0.006 + $0.006 = $0.012 per request
Latency ≈ time_to_first_token + output_tokens ÷ decode_speed
         e.g. 0.5 s + 400 ÷ 60 tok/s ≈ 7.2 s total, first text at 0.5 s (stream it)` },
  ],
  uses: [
    { name: "Capacity planning", text: "Token counts per request turn user numbers into GPU or API budgets; see [cost optimization](/learn/llm-cost-optimization)." },
    { name: "Prompt design", text: "Knowing the window and attention behaviour shapes how context is selected and ordered." },
    { name: "Reliability", text: "Non-determinism and hallucination drive validation, retries, grounding and evals." },
  ],
  interview: [
    "Estimate tokens per request and convert them to cost and latency.",
    "Explain prefill vs decode and why output length dominates latency.",
    "Choose temperature by task: near zero for extraction, higher for creative work.",
    "Say why selecting context beats filling the window.",
  ],
  related: ["llm-inference-serving", "choosing-an-llm", "prompt-engineering", "retrieval-augmented-generation", "llm-cost-optimization"],
  practice: ["rag-search", "model-serving"],
  reading: [
    { title: "Attention Is All You Need", publisher: "Vaswani et al., NeurIPS 2017", url: "https://arxiv.org/abs/1706.03762" },
    { title: "Lost in the Middle: How Language Models Use Long Contexts", publisher: "Liu et al., 2023", url: "https://arxiv.org/abs/2307.03172" },
  ],
};
