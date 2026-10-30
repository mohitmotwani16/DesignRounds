export default {
  blocks: [
    { type: "p", text: "This **AI engineer roadmap** shows how to become an AI engineer from a system design point of view: how to build reliable products on top of large language models (LLMs) and other foundation models, and how to answer the **LLM, RAG and AI agent system design questions** that AI engineering interviews now ask. It goes from how LLMs work and how to choose one, through prompting and structured output, retrieval-augmented generation, agents and tool calling, evaluation, guardrails and prompt injection, serving, gateways, caching and cost, fine-tuning, and LLMOps, and ends with full worked answers to the most-asked generative AI design questions. Each step links to a free guide." },
    { type: "callout", tone: "tip", text: "The step most candidates skip is evaluation. Saying how you'll measure quality before you design (a golden dataset, graders, a regression gate) is the clearest signal of an experienced AI engineer." },

    { type: "roadmap", id: "ai-engineering" },

    { type: "h2", text: "What an AI engineer does" },
    { type: "p", text: "An **AI engineer** builds applications on foundation models that someone else trained: assistants, search and question answering, agents that take actions, extraction pipelines, coding tools. It differs from an **ML engineer**, who trains task-specific models from labelled data (see the [ML system design roadmap](/learn/machine-learning-system-design-roadmap)). The two overlap in evaluation, serving and monitoring." },
    { type: "table", head: ["", "ML engineer", "AI engineer"], rows: [
      ["Starting point", "Data and labels; train a model", "A pretrained model; adapt it with prompts, context and tools"],
      ["Main levers", "Features, model architecture, training data", "Prompts, retrieval, tool design, model choice, fine-tuning"],
      ["Evaluation", "Offline metrics on labelled test sets", "Golden datasets, LLM-as-a-judge, human review, online feedback"],
      ["Cost driver", "Training compute, feature pipelines", "Tokens per request, GPU inference, agent loops"],
      ["Typical failures", "Drift, skew, feedback loops", "Hallucination, prompt injection, runaway agents, latency"],
    ] },

    { type: "h2", text: "The shape of an LLM application" },
    { type: "diagram", kind: "flow", caption: "The components this roadmap covers, in the order a request meets them. Guardrails wrap the model on both sides; evaluation and LLMOps watch the whole path.", nodes: [
      { id: "user", label: "User", col: 0, row: 1, shape: "pill" },
      { id: "in", label: "Input guardrails", sub: "stage 7", col: 1.2, row: 1, tone: "danger" },
      { id: "orch", label: "Orchestrator / agent", sub: "stages 3, 5", col: 2.4, row: 1, tone: "accent", w: 160 },
      { id: "rag", label: "Retrieval", sub: "stage 4", col: 2.4, row: 0, shape: "db", tone: "store" },
      { id: "tools", label: "Tools", sub: "stage 5", col: 2.4, row: 2 },
      { id: "gw", label: "LLM gateway", sub: "stage 8", col: 3.7, row: 1 },
      { id: "llm", label: "Models", sub: "stages 2, 9", col: 4.9, row: 1, tone: "accent" },
      { id: "out", label: "Output guardrails", sub: "stage 7", col: 4.9, row: 2.2, tone: "danger" },
      { id: "ops", label: "Evals + LLMOps", sub: "stages 6, 10", col: 3.7, row: 2.2, tone: "ok" },
    ], edges: [
      { from: "user", to: "in" }, { from: "in", to: "orch" }, { from: "orch", to: "rag", both: true }, { from: "orch", to: "tools", both: true }, { from: "orch", to: "gw" }, { from: "gw", to: "llm" },
      { from: "llm", to: "out" }, { from: "out", to: "ops", dashed: true }, { from: "ops", to: "orch", dashed: true, label: "traces" },
    ] },

    { type: "h2", text: "The AI engineering design interview framework" },
    { type: "table", head: ["Step", "Questions to answer", "Guide"], rows: [
      ["1. Clarify", "Users, task, quality bar, cost of a wrong answer, latency, volume, data sensitivity", "[AI engineer interview](/learn/ai-engineer-system-design-interview)"],
      ["2. Define evals first", "Golden set, graders, success and guardrail metrics", "[LLM evaluation](/learn/llm-evaluation)"],
      ["3. Pick the approach", "Prompting, RAG, tools or agent, fine-tuning: the least complex that works", "[Fine-tuning vs RAG](/learn/llm-fine-tuning)"],
      ["4. Design the context", "Retrieval, chunking, memory, prompt assembly", "[RAG](/learn/retrieval-augmented-generation), [agent memory](/learn/agent-memory)"],
      ["5. Orchestration and tools", "Workflow vs agent, tool contracts, approvals, stop conditions", "[Agents](/learn/ai-agent-architecture), [tool calling and MCP](/learn/llm-tool-calling-mcp)"],
      ["6. Safety", "Guardrails, prompt injection, permissions", "[Guardrails](/learn/llm-guardrails), [prompt injection](/learn/prompt-injection)"],
      ["7. Serve and scale", "Model routing, streaming, caching, capacity in tokens, cost per task", "[LLM serving](/learn/llm-inference-serving), [gateway](/learn/llm-gateway), [cost](/learn/llm-cost-optimization)"],
      ["8. Operate", "Tracing, versioning, canaries, feedback, incidents", "[LLMOps](/learn/llmops-observability)"],
    ] },

    { type: "h2", text: "Core tools by category" },
    { type: "table", head: ["Category", "Common examples", "Guide"], rows: [
      ["Model APIs", "Claude, GPT, Gemini, Mistral and other hosted models", "[Choosing an LLM](/learn/choosing-an-llm)"],
      ["Open-weight models and serving", "Llama, Qwen, Mistral families; vLLM, TGI, TensorRT-LLM", "[LLM serving](/learn/llm-inference-serving)"],
      ["Vector search", "pgvector, FAISS, dedicated vector databases, search engines with vectors", "[Vector databases](/learn/vector-databases)"],
      ["Orchestration frameworks", "LangChain, LlamaIndex, provider agent SDKs, or plain code", "[AI agent architecture](/learn/ai-agent-architecture)"],
      ["Tool integration", "Function calling, Model Context Protocol (MCP) servers", "[Tool calling and MCP](/learn/llm-tool-calling-mcp)"],
      ["Evaluation and tracing", "Eval harnesses, LLM-as-a-judge, tracing platforms, OpenTelemetry", "[LLM evaluation](/learn/llm-evaluation), [LLMOps](/learn/llmops-observability)"],
    ] },
    { type: "p", text: "Frameworks change monthly. Interviews test whether you understand what each layer does, so you can build it with any tool, or without one." },

    { type: "h2", text: "A six-week plan" },
    { type: "table", head: ["Week", "Stages", "Practise"], rows: [
      ["1", "1-3", "Learn the framework; estimate tokens and cost for a chat feature; write a versioned prompt with a JSON schema output and validation."],
      ["2", "4", "Design a RAG system over company documents: chunking, hybrid search, reranking, citations, permissions. Then the [RAG round](/system-design/rag-search)."],
      ["3", "5", "Design a customer support agent with three tools, approval for refunds, stop conditions and a human handoff."],
      ["4", "6-7", "Build a golden set and grading plan for the support agent; list prompt injection paths and defences for it."],
      ["5", "8-10", "Add a gateway with routing and fallbacks, caching and per-tenant budgets; plan tracing, canary releases and an incident runbook. Try the [model serving round](/system-design/model-serving)."],
      ["6", "11", "Timed mocks from the [GenAI question list](/learn/genai-system-design-interview-questions), starting with [design ChatGPT](/learn/design-chatgpt) and the [RAG chatbot](/learn/design-rag-chatbot)."],
    ] },

    { type: "h2", text: "Skills checklist" },
    { type: "ul", items: [
      "Explain tokens, context windows, sampling and how they drive cost and latency.",
      "Choose between prompting, RAG, an agent and fine-tuning, and defend the choice.",
      "Design a RAG pipeline end to end, including permissions, freshness and evaluation.",
      "Design an agent with typed tools, budgets, stop conditions and human approval.",
      "Build an eval set with code checks and calibrated LLM judges, and gate releases on it.",
      "Defend against direct and indirect prompt injection with least privilege.",
      "Estimate GPU or API cost per task and cut it with routing, caching and context trimming.",
      "Trace, version and roll back prompts, models and retrieval configs.",
    ] },
  ],
  related: ["ai-engineer-system-design-interview", "genai-system-design-interview-questions", "ai-application-architecture", "retrieval-augmented-generation", "ai-agent-architecture", "llm-evaluation"],
  practice: ["chatgpt-assistant", "support-ai-agent", "rag-search", "code-assistant", "voice-ai-agent", "document-ingestion", "llm-gateway", "llm-inference-platform", "llm-eval-platform"],
  reading: [
    { title: "AI Engineering: Building Applications with Foundation Models", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/" },
    { title: "Building effective agents", publisher: "Anthropic", url: "https://www.anthropic.com/research/building-effective-agents" },
    { title: "OWASP Top 10 for LLM Applications", publisher: "OWASP GenAI Security Project", url: "https://genai.owasp.org/llm-top-10/" },
  ],
};
