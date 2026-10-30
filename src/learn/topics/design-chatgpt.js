// Case study: a ChatGPT-style LLM chat assistant at consumer scale.
export default {
  blocks: [
    { type: "p", text: "**The question**: design ChatGPT, a consumer chat assistant where millions of users hold multi-turn conversations with a large language model, see answers stream in token by token, return to old conversations, and use features like file uploads and memory. The interesting parts are not the chat UI: they're **context management**, **streaming at scale**, **GPU capacity and cost**, **rate limits by plan**, and **safety**. This walkthrough follows the [AI engineer interview framework](/learn/ai-engineer-system-design-interview)." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer (agreed with the interviewer)"], rows: [
      ["Core features?", "Multi-turn chat with streaming, conversation history, regenerate, stop; file upload as a stretch"],
      ["Scale?", "50M daily active users, ~10 messages each per day"],
      ["Latency?", "First token in under 1 s at p95; then steady streaming"],
      ["Plans?", "Free tier with limits and a smaller model by default; paid tier with higher limits and the best model"],
      ["Model hosting?", "We serve our own models on our GPU fleet"],
      ["Safety?", "Input and output moderation; abuse prevention"],
    ] },

    { type: "h2", text: "2. Estimates" },
    { type: "code", code: `Messages      : 50M × 10 = 500M/day ≈ 5,800/s avg, ~15K/s peak
Tokens/message: input ≈ 2,500 (system + history + message), output ≈ 400
Daily tokens  : 500M × 2,500 = 1.25T input; 500M × 400 = 200B output
Decode load   : 200B ÷ 86,400 ≈ 2.3M output tokens/s avg, ~6M/s peak
GPU fleet     : if one GPU server sustains ~5K output tokens/s with batching,
                peak needs ~1,200 servers for decode, plus prefill capacity and headroom
Storage       : 500M messages × ~2 KB = 1 TB/day of conversation text
Concurrency   : 15K msgs/s × ~10 s streaming = ~150K open streams at peak
(illustrative throughput; real numbers depend on model size and hardware)` },
    { type: "p", text: "Conclusions: GPU inference dominates cost, output tokens drive capacity, and the system must hold a very large number of long-lived streaming connections. See [how LLMs work](/learn/how-llms-work)." },

    { type: "h2", text: "3. High-level architecture" },
    { type: "diagram", kind: "flow", caption: "ChatGPT-style architecture: the chat service assembles context from the conversation store, passes moderation and rate limits, and streams tokens from the inference fleet back to the client over SSE or WebSockets.", nodes: [
      { id: "client", label: "Web / mobile", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "auth · plan limits", col: 1.25, row: 1 },
      { id: "chat", label: "Chat service", sub: "context assembly", col: 2.5, row: 1, tone: "accent" },
      { id: "conv", label: "Conversation store", sub: "messages · titles", col: 2.5, row: 2.3, shape: "db", tone: "store", w: 170 },
      { id: "mod", label: "Moderation", sub: "in + out", col: 2.5, row: 0, tone: "danger" },
      { id: "router", label: "Inference router", sub: "model · queue", col: 3.85, row: 1 },
      { id: "gpu", label: "GPU inference fleet", sub: "continuous batching", col: 5.2, row: 1, tone: "accent", w: 170 },
      { id: "q", label: "Async jobs", sub: "titles · memory · billing", col: 3.85, row: 2.3, shape: "queue", tone: "queue", w: 170 },
    ], edges: [
      { from: "client", to: "gw", both: true }, { from: "gw", to: "chat", both: true }, { from: "chat", to: "mod" }, { from: "chat", to: "conv", both: true },
      { from: "chat", to: "router" }, { from: "router", to: "gpu" }, { from: "gpu", to: "chat", dashed: true, label: "token stream" }, { from: "chat", to: "q", dashed: true },
    ] },

    { type: "h2", text: "4. Conversation storage" },
    { type: "ul", items: [
      "Data model: `conversations(id, user_id, title, model, created_at, updated_at)` and `messages(conversation_id, seq, role, content, parent_id, tokens, created_at)`. `parent_id` supports regenerate and edits as branches.",
      "Access patterns: list a user's recent conversations; load one conversation's messages in order; append messages.",
      "A wide-column or document store partitioned by `user_id` (conversations) and `conversation_id` (messages) fits; see [data modeling](/learn/data-modeling-for-system-design).",
      "Writes: the user message is stored before generation; the assistant message is written when streaming completes (with partial saves for long answers, so a dropped connection doesn't lose them).",
    ] },

    { type: "h2", text: "5. Context management" },
    { type: "p", text: "Each request resends what the model needs: system prompt, relevant memory, conversation history and the new message. Long conversations exceed the context window and cost more per turn, so:" },
    { type: "ul", items: [
      "Keep recent turns verbatim, summarise older ones, and drop or summarise large pasted content after it's been answered.",
      "Put the stable system prompt first to benefit from prefix caching; see [LLM caching](/learn/llm-caching).",
      "Long-term memory (\"remember I'm vegetarian\") is retrieved per turn from a per-user store; see [agent memory](/learn/agent-memory).",
      "Count tokens before calling the model and enforce plan-specific limits.",
    ] },

    { type: "h2", text: "6. Streaming responses" },
    { type: "diagram", kind: "sequence", caption: "A streamed message. The server stores the user turn, opens a stream to the inference fleet, relays tokens to the client as they arrive, and saves the final answer when generation ends or the user stops it.", actors: ["Client", "Chat service", "Inference", "Store"], steps: [
      { from: 0, to: 1, label: "POST message (SSE)" },
      { from: 1, to: 3, label: "save user message" },
      { from: 1, to: 2, label: "generate(context, stream=true)" },
      { from: 2, to: 1, label: "token, token, token…" },
      { from: 1, to: 0, label: "data: token chunks", tone: "accent" },
      { from: 0, to: 1, label: "stop (optional)", dashed: true },
      { from: 1, to: 3, label: "save assistant message + usage" },
    ] },
    { type: "ul", items: [
      "Server-Sent Events are a natural fit (one-way, HTTP, reconnectable); WebSockets also work. See [real-time communication](/learn/real-time-communication).",
      "Stop must cancel generation on the GPU, freeing capacity, not just stop sending.",
      "If the client disconnects, finish or cancel generation and save what exists; the client can fetch it on reconnect.",
    ] },

    { type: "h2", text: "7. Inference fleet and scheduling" },
    { type: "ul", items: [
      "Serving engines with **continuous batching** and a paged **KV cache** maximise GPU throughput; see [LLM serving](/learn/llm-inference-serving).",
      "A router picks the model by plan and request, then a replica with free KV cache memory; queues per model with priority for paid users.",
      "Under overload: queue briefly, then degrade (smaller model for free users, shorter max output) rather than fail; see [load shedding](/learn/load-shedding).",
      "Autoscale on queue depth and KV cache utilisation, but GPU capacity is slow to add, so keep headroom and plan for daily peaks.",
    ] },

    { type: "h2", text: "8. Rate limits and plans" },
    { type: "p", text: "Limit by **tokens and messages per time window per user and plan**, enforced at the gateway with a shared counter store. Free users get a smaller default model and lower caps; paid users higher caps and priority. Abuse detection (scripts, shared accounts) feeds into stricter limits. See [rate limiting](/learn/rate-limiting) and [LLM gateway](/learn/llm-gateway)." },

    { type: "h2", text: "9. Safety" },
    { type: "ul", items: [
      "Input moderation before generation; output moderation on streamed chunks, with the ability to cut a stream.",
      "Policy-tuned refusals; special handling for self-harm topics (resources, not refusal).",
      "File uploads scanned and parsed in isolated workers; uploaded content treated as untrusted (see [prompt injection](/learn/prompt-injection)).",
      "See [LLM guardrails](/learn/llm-guardrails).",
    ] },

    { type: "h2", text: "10. Evaluation and operations" },
    { type: "ul", items: [
      "Offline eval suites for each model and system prompt version; red-team sets for safety.",
      "Online: thumbs up/down, regenerate rate, conversation length, retention by cohort; A/B tests for model and prompt changes.",
      "Dashboards: time to first token, tokens per second per stream, GPU utilisation, queue wait, cost per message.",
      "See [LLM evaluation](/learn/llm-evaluation) and [LLMOps](/learn/llmops-observability).",
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How do you generate conversation titles?* Asynchronously, with a small model, after the first exchange.",
      "*How would you add web search?* As a tool the model can call, with retrieved pages treated as untrusted; see [AI answer engine](/learn/design-ai-answer-engine).",
      "*How do you handle a GPU region outage?* Route to other regions with capacity, degrade free tier first, and keep conversation storage multi-region.",
    ] },
  ],
  uses: [
    { name: "Consumer assistants", text: "Streaming chat with history, memory and plan-based limits at very large scale." },
    { name: "Enterprise chat", text: "The same core with SSO, data retention controls and connectors to company data." },
    { name: "Embedded assistants", text: "Chat inside a product, sharing the gateway, inference and safety layers." },
  ],
  interview: [
    "Estimate in tokens: output tokens per second drives the GPU fleet size.",
    "Model conversations and messages for append and ordered reads, with branches for regenerate.",
    "Explain context management: recent turns, summaries, memory, prefix caching.",
    "Design streaming with cancellation, and degrade gracefully under GPU overload.",
  ],
  related: ["llm-inference-serving", "agent-memory", "llm-guardrails", "real-time-communication", "llm-gateway", "design-rag-chatbot"],
  practice: ["chatgpt-assistant", "llm-inference-platform", "chat-system", "model-serving", "rate-limiter"],
  reading: [
    { title: "Efficient Memory Management for Large Language Model Serving with PagedAttention", publisher: "Kwon et al., SOSP 2023", url: "https://arxiv.org/abs/2309.06180" },
    { title: "Orca: A Distributed Serving System for Transformer-Based Generative Models", publisher: "Yu et al., OSDI 2022", url: "https://www.usenix.org/conference/osdi22/presentation/yu" },
  ],
};
