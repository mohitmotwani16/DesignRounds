export default {
  blocks: [
    { type: "p", text: "An **AI engineer system design interview** asks you to design a product built on large language models: a chat assistant, a RAG chatbot over company documents, a customer support agent, a coding assistant, a document processing pipeline. Interviewers look for the same judgment as any design round, plus things specific to LLMs: how you'll **measure quality**, where the model's **context** comes from, how **agents and tools** are kept safe, and how **cost and latency** stay under control. This guide gives an eight-step framework, an estimation method in tokens, and the follow-ups to expect." },
    { type: "callout", tone: "tip", text: "Start simple and escalate: a single prompt, then retrieval, then tools, then an agent, then fine-tuning. Interviewers reward the candidate who reaches for an agent only when a fixed workflow can't do the job." },

    { type: "h2", text: "How these rounds differ" },
    { type: "table", head: ["Topic", "Backend round", "ML round", "AI engineering round"], rows: [
      ["Core risk", "Data loss, downtime", "Model silently wrong", "Confidently wrong answers, unsafe actions, runaway cost"],
      ["Quality proof", "Correctness by design", "Offline + A/B metrics", "Golden datasets, graders, human review, online feedback"],
      ["Capacity unit", "Requests per second", "Predictions per second", "Tokens per second and GPU memory"],
      ["Special components", "Caches, queues, DBs", "Features, training, serving", "Retrieval, prompts, tools, guardrails, gateway, evals"],
    ] },

    { type: "h2", text: "The eight-step framework" },
    { type: "diagram", kind: "flow", caption: "Eight steps for an LLM system design answer. Evaluation is defined early, in step 2, because it decides what \"good\" means for every later choice.", nodes: [
      { id: "s1", label: "1. Clarify", sub: "task · stakes · scale", col: 0, row: 0, tone: "accent" },
      { id: "s2", label: "2. Evals first", sub: "golden set", col: 1.2, row: 0, tone: "ok" },
      { id: "s3", label: "3. Approach", sub: "prompt → agent", col: 2.4, row: 0, tone: "accent" },
      { id: "s4", label: "4. Context", sub: "RAG · memory", col: 3.6, row: 0, shape: "db", tone: "store" },
      { id: "s5", label: "5. Tools", sub: "contracts · limits", col: 3.6, row: 1.4 },
      { id: "s6", label: "6. Safety", sub: "guardrails", col: 2.4, row: 1.4, tone: "danger" },
      { id: "s7", label: "7. Serve + cost", sub: "tokens · GPUs", col: 1.2, row: 1.4 },
      { id: "s8", label: "8. Operate", sub: "traces · rollback", col: 0, row: 1.4, tone: "ok" },
    ], edges: [
      { from: "s1", to: "s2" }, { from: "s2", to: "s3" }, { from: "s3", to: "s4" }, { from: "s4", to: "s5" }, { from: "s5", to: "s6" }, { from: "s6", to: "s7" }, { from: "s7", to: "s8" }, { from: "s8", to: "s2", dashed: true, label: "new eval cases" },
    ] },

    { type: "h3", text: "1. Clarify the task and the stakes" },
    { type: "p", text: "Who uses it and for what? What does a **wrong answer cost** (a bad movie suggestion vs a wrong refund vs wrong medical advice)? What data can the model see, and who is allowed to see what? Latency expectations (streaming chat vs a 10-second report)? Volume in requests and in **tokens**?" },
    { type: "h3", text: "2. Define success and evaluation first" },
    { type: "p", text: "Name the quality dimensions (correctness, groundedness, helpfulness, format, safety), how each is graded (code checks, an LLM judge calibrated against humans, human review), and the release gate. See [LLM evaluation](/learn/llm-evaluation)." },
    { type: "h3", text: "3. Choose the simplest approach that can work" },
    { type: "table", head: ["Approach", "Use when", "Guide"], rows: [
      ["Single prompt", "The model already knows enough; task is self-contained", "[Prompt engineering](/learn/prompt-engineering)"],
      ["Prompt + structured output", "Results feed code: extraction, classification, routing", "[Structured outputs](/learn/llm-structured-outputs)"],
      ["RAG", "Answers depend on private or fresh data", "[RAG](/learn/retrieval-augmented-generation)"],
      ["Workflow with tools", "Known steps that call systems (look up order, then summarise)", "[Tool calling](/learn/llm-tool-calling-mcp)"],
      ["Agent", "Steps can't be known in advance; open-ended tasks", "[AI agents](/learn/ai-agent-architecture)"],
      ["Fine-tuning", "Style, format or narrow skill the above can't reach, or to cut cost with a smaller model", "[Fine-tuning vs RAG](/learn/llm-fine-tuning)"],
    ] },
    { type: "h3", text: "4. Design the context" },
    { type: "p", text: "What goes into each prompt: system instructions, retrieved chunks, conversation history or memory, tool results. How retrieval works (chunking, hybrid search, reranking), how history is trimmed or summarised, and how **permissions** filter what's retrieved. See [chunking](/learn/rag-chunking-strategies), [hybrid search](/learn/hybrid-search-reranking) and [agent memory](/learn/agent-memory)." },
    { type: "h3", text: "5. Orchestration and tools" },
    { type: "p", text: "Typed tool schemas, validation of arguments, idempotency for side effects, budgets on steps and tokens, stop conditions, and **human approval** for risky actions. Say whether one agent or several, and why. See [multi-agent systems](/learn/multi-agent-systems)." },
    { type: "h3", text: "6. Safety and security" },
    { type: "p", text: "Input and output guardrails, treating retrieved and tool content as untrusted, least-privilege credentials, and authorisation checks in code, not in prompts. See [guardrails](/learn/llm-guardrails) and [prompt injection](/learn/prompt-injection)." },
    { type: "h3", text: "7. Serving, latency and cost" },
    { type: "p", text: "Hosted API or self-hosted model, streaming, model routing (small model for easy requests), caching, a gateway with fallbacks and budgets, and capacity in tokens. See [LLM serving](/learn/llm-inference-serving), [LLM gateway](/learn/llm-gateway), [caching](/learn/llm-caching) and [cost optimization](/learn/llm-cost-optimization)." },
    { type: "h3", text: "8. Operate" },
    { type: "p", text: "Trace every model and tool call, version prompts and configs, run evals in CI, release behind canaries, collect user feedback, and have a rollback and incident plan. See [LLMOps](/learn/llmops-observability)." },

    { type: "h2", text: "Estimating in tokens" },
    { type: "p", text: "LLM capacity and cost scale with tokens, not requests. Do this arithmetic out loud:" },
    { type: "code", code: `Assistant for 2M daily users, 6 messages each = 12M requests/day ≈ 140 req/s avg, ~400 peak
Per request: input ≈ 1,500 system+history + 1,500 retrieved = 3,000 tokens
             output ≈ 300 tokens
Daily tokens: 12M × 3,000 = 36B input, 12M × 300 = 3.6B output
Cost (illustrative prices: $1 per 1M input, $5 per 1M output for a mid model):
             36,000 × $1 + 3,600 × $5 = $36K + $18K = $54K/day
Levers: prompt caching on the 1,500-token system prefix, routing 60% of
        traffic to a model ~5× cheaper, trimming retrieved context to 800 tokens
Latency: time to first token ~0.3-1 s; 300 output tokens at ~50 tokens/s ≈ 6 s
         → stream the response; the user sees text in under a second` },
    { type: "p", text: "Replace the prices with whatever the interviewer gives you; the method is what's assessed. See [how LLMs work](/learn/how-llms-work) for what drives these numbers." },

    { type: "h2", text: "A 45-minute time plan" },
    { type: "diagram", kind: "segments", width: 780, total: 45, caption: "A suggested split for a 45-minute AI engineering round. Clarifying and evals together take a fifth of the time; the deep dive usually lands on context, agents or cost.", lanes: [{ parts: [
      { label: "Clarify", sub: "5", size: 5, tone: "accent" },
      { label: "Evals", sub: "4", size: 4, tone: "ok" },
      { label: "Approach + high level", sub: "8", size: 8, tone: "accent" },
      { label: "Context / tools deep dive", sub: "12", size: 12, tone: "store" },
      { label: "Safety", sub: "5", size: 5, tone: "danger" },
      { label: "Serve + cost", sub: "7", size: 7, tone: "cache" },
      { label: "Ops", sub: "4", size: 4, tone: "muted" },
    ] }] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*The answer is wrong but the document exists. How do you debug it?* Check ingestion and freshness, permission filters, chunk boundaries, query rewriting, retrieval recall, reranking, context assembly, then generation, measuring retrieval separately from generation.",
      "*Quality is good but it's too slow and expensive.* Measure per-stage latency and cost per resolved task; route to smaller models, trim context, cache, parallelise tool calls, stream, cut agent turns.",
      "*A prompt change caused an incident.* Roll back by version, keep traces, reproduce with the exact configuration, add the case to the eval set, release again behind a canary with abort thresholds.",
      "*How do you stop the agent doing something harmful?* Least-privilege tools, argument validation, approval for irreversible actions, budgets and stop conditions, and checking outcomes in the system of record.",
      "*Can you trust an LLM judge?* Only after calibrating it against human labels, controlling for position and length bias, and re-checking when the judge or rubric changes.",
    ] },

    { type: "h2", text: "Common mistakes" },
    { type: "ul", items: [
      "Jumping to a multi-agent architecture for a task a two-step workflow handles.",
      "No evaluation plan, or \"we'll check a few examples manually\".",
      "Relying on the system prompt for authorisation (\"don't show other users' data\").",
      "Ignoring token costs and context limits until the end.",
      "Treating the model as deterministic: no retries, validation or fallbacks for malformed output.",
    ] },
  ],
  uses: [
    { name: "AI engineer and LLM engineer loops", text: "Usually one LLM system design round, plus coding and a project deep dive; RAG and agent designs are the most common prompts." },
    { name: "Applied AI at model providers", text: "More serving depth: batching for inference, sampling APIs, GPU capacity and cost." },
    { name: "Product engineering roles adding AI", text: "A backend design round with an LLM feature in it; evals, guardrails and cost usually decide the outcome." },
  ],
  interview: [
    "Ask what a wrong answer costs before choosing an approach.",
    "Define evaluation in the first ten minutes.",
    "Escalate from prompt to RAG to tools to agent only as needed, and say why.",
    "Estimate tokens, cost and latency, then name the levers that cut them.",
    "Put authorisation in code and treat retrieved and tool content as untrusted.",
  ],
  related: ["ai-engineering-roadmap", "genai-system-design-interview-questions", "ai-application-architecture", "llm-evaluation", "retrieval-augmented-generation", "ml-system-design-interview"],
  practice: ["chatgpt-assistant", "support-ai-agent", "rag-search", "model-serving"],
  reading: [
    { title: "AI Engineering: Building Applications with Foundation Models", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/" },
    { title: "Building effective agents", publisher: "Anthropic", url: "https://www.anthropic.com/research/building-effective-agents" },
  ],
};
