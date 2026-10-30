export default {
  blocks: [
    { type: "p", text: "These are the **generative AI and LLM system design interview questions** that AI engineer, LLM engineer and applied AI candidates are asked most, grouped by theme. They come up at model providers, big tech AI teams and the many startups building on LLMs. For each one you'll see what interviewers probe and where to study it. Answer them with the [AI engineer interview framework](/learn/ai-engineer-system-design-interview)." },
    { type: "callout", tone: "tip", text: "Across company reports, three prompts dominate: a production RAG system, a tool-using agent (often customer support), and LLM inference or batching. Prepare those three deeply before anything else." },

    { type: "h2", text: "The themes at a glance" },
    { type: "diagram", kind: "tree", caption: "Generative AI design questions cluster into six themes. Each theme shares a core architecture and a set of follow-ups.", root: { label: "GenAI design questions", tone: "accent", children: [
      { label: "RAG and search", sub: "retrieve → generate", tone: "accent", children: [{ label: "Doc chatbot, answer engine", tone: "store" }] },
      { label: "Agents", sub: "tools · loops", children: [{ label: "Support, workflow agents", tone: "store" }] },
      { label: "Assistants", sub: "chat at scale", children: [{ label: "ChatGPT, copilots", tone: "store" }] },
      { label: "Serving", sub: "GPUs · tokens", children: [{ label: "Batching, gateways", tone: "store" }] },
      { label: "Generation", sub: "image · voice", children: [{ label: "Text-to-image, voice", tone: "store" }] },
      { label: "Quality + safety", sub: "evals · guards", children: [{ label: "Eval harness, moderation", tone: "store" }] },
    ] } },

    { type: "h2", text: "RAG, search and knowledge" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design a RAG chatbot over company documents", "Permissions, freshness, chunking, hybrid search, citations, evaluation", "[Worked answer](/learn/design-rag-chatbot) · [Round](/system-design/rag-search)"],
      ["Design an AI answer engine like Perplexity", "Query planning, web retrieval, source ranking, grounding, latency", "[Worked answer](/learn/design-ai-answer-engine) · [Round](/system-design/ai-answer-engine)"],
      ["Design a document processing pipeline for LLM use", "Parsing PDFs and scans, chunking at scale, incremental re-indexing, deletes", "[Worked answer](/learn/design-document-ingestion-pipeline) · [Round](/system-design/document-ingestion)"],
      ["Debug a RAG system that answers wrongly when the document exists", "Separating retrieval failures from generation failures", "[Advanced RAG](/learn/advanced-rag)"],
      ["Handle context window limits in a document-heavy system", "Chunk selection, summarisation, long context vs RAG", "[Chunking strategies](/learn/rag-chunking-strategies)"],
    ] },

    { type: "h2", text: "Agents and tool use" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design a customer support AI agent", "Tool contracts, approvals, human handoff, evals, token cost", "[Worked answer](/learn/design-customer-support-ai-agent) · [Round](/system-design/support-ai-agent)"],
      ["Design an enterprise tool-using agent", "Least-privilege credentials, state, long-running tasks, audit", "[AI agent architecture](/learn/ai-agent-architecture)"],
      ["Design an insurance-claims agent using RAG under a token budget", "Per-task budgets, routing risky cases to humans, citations", "[Cost optimization](/learn/llm-cost-optimization)"],
      ["Design a scalable, safe multi-agent system", "Orchestration, trust boundaries, loops, concurrency", "[Multi-agent systems](/learn/multi-agent-systems)"],
      ["Agent or deterministic workflow?", "Judgment: when open-ended planning is actually needed", "[AI agent architecture](/learn/ai-agent-architecture)"],
      ["Connect an agent to many internal tools", "Function calling, MCP servers, auth, tool discovery", "[Tool calling and MCP](/learn/llm-tool-calling-mcp)"],
    ] },

    { type: "h2", text: "Assistants and copilots" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design ChatGPT", "Conversation storage, streaming, context management, GPU capacity, safety", "[Worked answer](/learn/design-chatgpt) · [Round](/system-design/chatgpt-assistant)"],
      ["Design GitHub Copilot", "Completion latency, repository context, privacy, acceptance metrics", "[Worked answer](/learn/design-ai-code-assistant) · [Round](/system-design/code-assistant)"],
      ["Design Gmail Smart Compose", "Tiny latency budgets, small models, personalisation, safety filters", "[Model compression](/learn/model-compression)"],
      ["Design a chatbot with long-term memory", "What to remember, retrieval of memories, privacy, poisoning", "[Agent memory](/learn/agent-memory)"],
      ["Design a file uploader that feeds large multimodal files into model context", "Chunked upload, parsing, context budgeting", "[Resumable uploads](/learn/resumable-file-uploads)"],
    ] },

    { type: "h2", text: "LLM serving and infrastructure" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design an inference batching system for LLM queries", "Dynamic vs continuous batching, throughput vs latency, backpressure", "[LLM serving](/learn/llm-inference-serving) · [Round](/system-design/llm-inference-platform)"],
      ["Design an API for sampling from LLMs efficiently", "Streaming, KV cache reuse, rate limits, routing", "[LLM serving](/learn/llm-inference-serving)"],
      ["Design an LLM gateway for a company", "Provider fallback, budgets, keys, caching, observability", "[LLM gateway](/learn/llm-gateway) · [Round](/system-design/llm-gateway)"],
      ["Design a GPU credit / quota system", "Metering tokens, quotas, billing correctness", "[Rate limiting](/learn/rate-limiting)"],
      ["Design an LLM playground", "Sessions, model selection, streaming, cost display, abuse", "[Design ChatGPT](/learn/design-chatgpt)"],
      ["Design a low-latency model serving platform", "Autoscaling GPUs, canaries, multi-model hosting", "[Round](/system-design/model-serving)"],
    ] },

    { type: "h2", text: "Multimodal generation" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design a text-to-image service like Midjourney", "GPU job queues, priorities, safety on prompts and images, storage", "[Worked answer](/learn/design-text-to-image-service) · [Round](/system-design/text-to-image)"],
      ["Design a real-time voice AI agent", "Streaming ASR and TTS, turn detection, interruptions, latency budget", "[Worked answer](/learn/design-ai-voice-agent) · [Round](/system-design/voice-ai-agent)"],
      ["Design image captioning or video summarisation", "Batch pipelines, multimodal models, evaluation", "[LLM evaluation](/learn/llm-evaluation)"],
    ] },

    { type: "h2", text: "Evaluation, safety and operations" },
    { type: "table", head: ["Question", "What interviewers probe", "Study"], rows: [
      ["Design an evaluation harness for an agent", "Repeatable trials, traces, graders, regression gates", "[LLM evaluation](/learn/llm-evaluation) · [Round](/system-design/llm-eval-platform)"],
      ["Can you trust LLM-as-a-judge?", "Calibration with humans, position and verbosity bias", "[LLM evaluation](/learn/llm-evaluation)"],
      ["Secure a RAG system or tool-using agent", "Indirect prompt injection, data exfiltration, authorisation", "[Prompt injection](/learn/prompt-injection)"],
      ["Design guardrails for a public chatbot", "Input and output classifiers, PII, refusals, fallbacks", "[LLM guardrails](/learn/llm-guardrails)"],
      ["Respond to an incident after a prompt or model change", "Versioning, rollback, reproduction, canaries", "[LLMOps](/learn/llmops-observability)"],
      ["Cut LLM costs by half without hurting quality", "Cost per task, routing, caching, context, batching", "[Cost optimization](/learn/llm-cost-optimization)"],
    ] },

    { type: "h2", text: "How to prepare" },
    { type: "ol", items: [
      "Work through the [AI engineer roadmap](/learn/ai-engineering-roadmap) stages 1 to 8; each maps to a group of follow-ups above.",
      "Study three worked answers closely: [RAG chatbot](/learn/design-rag-chatbot), [support agent](/learn/design-customer-support-ai-agent), [ChatGPT](/learn/design-chatgpt).",
      "For every design, practise saying the eval plan, the token estimate and the top three risks in under two minutes.",
      "Do timed rounds out loud with follow-ups; the [RAG practice round](/system-design/rag-search) is a good first one.",
    ] },
  ],
  related: ["ai-engineer-system-design-interview", "ai-engineering-roadmap", "ml-system-design-interview-questions", "system-design-interview-questions", "design-rag-chatbot"],
  practice: ["chatgpt-assistant", "support-ai-agent", "rag-search", "code-assistant", "llm-gateway", "llm-inference-platform", "llm-eval-platform"],
  reading: [
    { title: "Generative AI System Design Interview", publisher: "ByteByteGo", url: "https://bytebytego.com/courses/genai-system-design-interview" },
    { title: "AI Engineering: Building Applications with Foundation Models", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/" },
  ],
};
