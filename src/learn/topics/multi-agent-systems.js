export default {
  blocks: [
    { type: "p", text: "A **multi-agent system** splits work across several LLM agents, each with its own instructions, tools and context, coordinated by code or by another agent. It can help when a task is broad enough to parallelise, or when separate roles need separate context and permissions. It also multiplies cost, latency and failure modes. This guide covers the main coordination patterns, how state and failures are handled, and how to decide whether you need more than one agent at all." },

    { type: "h2", text: "Why split into several agents" },
    { type: "ul", items: [
      "**Parallelism:** research ten sources at once instead of one after another.",
      "**Context isolation:** each subagent reads its own large material and returns a short summary, keeping the coordinator's context small.",
      "**Specialisation:** different prompts, tools and even models per role (a cheap model for extraction, a strong one for planning).",
      "**Permission boundaries:** a billing agent holds refund tools; the general agent doesn't.",
    ] },
    { type: "callout", tone: "warning", text: "Every extra agent adds model calls, tokens and new ways to fail (miscommunication, duplicated work, loops). A single agent with good tools is often enough; reach for multiple agents when one context or one sequential loop clearly can't do the job." },

    { type: "h2", text: "Coordination patterns" },
    { type: "h3", text: "Orchestrator and workers" },
    { type: "diagram", kind: "flow", caption: "Orchestrator-workers: a lead agent plans, spawns subagents with focused tasks, and combines their condensed results. Subagents run in parallel and never see each other's full context.", nodes: [
      { id: "task", label: "Task", col: 0, row: 1, shape: "pill" },
      { id: "lead", label: "Orchestrator", sub: "plan · delegate · merge", col: 1.4, row: 1, tone: "accent", w: 160 },
      { id: "w1", label: "Worker 1", sub: "source A", col: 3, row: 0 },
      { id: "w2", label: "Worker 2", sub: "source B", col: 3, row: 1 },
      { id: "w3", label: "Worker 3", sub: "source C", col: 3, row: 2 },
      { id: "out", label: "Combined answer", col: 4.6, row: 1, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "task", to: "lead" }, { from: "lead", to: "w1" }, { from: "lead", to: "w2" }, { from: "lead", to: "w3" },
      { from: "w1", to: "lead", dashed: true, label: "summary" }, { from: "w2", to: "lead", dashed: true }, { from: "w3", to: "lead", dashed: true }, { from: "lead", to: "out" },
    ] },
    { type: "p", text: "Good for research, large code changes and analysis across many documents. The orchestrator's task descriptions must be precise (objective, scope, output format, budget), or workers duplicate effort or wander." },
    { type: "h3", text: "Handoffs (router and specialists)" },
    { type: "diagram", kind: "flow", caption: "Handoffs: a triage agent classifies the conversation and transfers it, with a summary, to a specialist that owns the relevant tools. Only one agent is active at a time.", nodes: [
      { id: "user", label: "Customer", col: 0, row: 1, shape: "pill" },
      { id: "tri", label: "Triage agent", col: 1.4, row: 1, tone: "accent" },
      { id: "bill", label: "Billing agent", sub: "refund tools", col: 2.9, row: 0 },
      { id: "tech", label: "Tech support agent", sub: "diagnostics", col: 2.9, row: 1, w: 160 },
      { id: "acct", label: "Account agent", sub: "profile tools", col: 2.9, row: 2 },
      { id: "human", label: "Human agent", col: 4.4, row: 1, tone: "muted" },
    ], edges: [
      { from: "user", to: "tri" }, { from: "tri", to: "bill" }, { from: "tri", to: "tech" }, { from: "tri", to: "acct" },
      { from: "bill", to: "human", dashed: true, label: "escalate" }, { from: "tech", to: "human", dashed: true },
    ] },
    { type: "h3", text: "Other patterns" },
    { type: "table", head: ["Pattern", "How", "Use"], rows: [
      ["Pipeline", "Fixed sequence of specialised agents (extract → analyse → write)", "Predictable multi-stage processing"],
      ["Generator and critic", "One agent drafts, another reviews against criteria, loop a bounded number of times", "Quality-sensitive writing and code"],
      ["Debate / voting", "Several agents answer independently; aggregate or let them argue", "Hard judgments; expensive"],
      ["Shared blackboard", "Agents read and write a common state store", "Loosely coupled long-running work; hard to debug"],
    ] },

    { type: "h2", text: "State and communication" },
    { type: "ul", items: [
      "**Pass summaries, not transcripts:** workers return compact, structured results; the coordinator doesn't need their full reasoning.",
      "**Shared artifacts in storage:** large outputs (files, tables) go to a store and are passed by reference.",
      "**Typed messages:** define the handoff payload (task, constraints, results, confidence) like an API contract.",
      "**Durable orchestration:** for long jobs, persist the plan and each subtask's status so a crash resumes; a workflow engine or [task queue](/learn/message-queues) suits this.",
    ] },

    { type: "h2", text: "Failure modes and controls" },
    { type: "table", head: ["Failure", "Control"], rows: [
      ["Workers duplicate or overlap work", "Precise task boundaries; orchestrator tracks assignments"],
      ["Endless delegation or ping-pong handoffs", "Max depth and max handoffs; repeated-handoff detection"],
      ["Cost explosion", "Budgets per task, per worker, and in total; cap parallelism"],
      ["One worker fails or hangs", "Timeouts, retries for idempotent work, partial results allowed"],
      ["Error propagation (a wrong worker result poisons the answer)", "Ask for sources and confidence; verify key claims"],
      ["Privilege escalation via another agent", "Each agent gets only its own tools; content from other agents is untrusted input"],
    ] },

    { type: "h2", text: "Cost and latency" },
    { type: "code", code: `Single agent research task : ~8 steps × 6K tokens context ≈ 50K tokens, ~60 s sequential
Orchestrator + 4 workers   : planner 10K + 4 × 40K (each reads its own sources)
                             + merge 15K ≈ 185K tokens, ~25 s with workers in parallel
→ ~3-4× the tokens for ~2.5× faster and broader coverage. Worth it for
  high-value research, not for a password reset.` },

    { type: "h2", text: "Evaluating multi-agent systems" },
    { type: "p", text: "Evaluate the end result first, then the coordination: did the orchestrator decompose sensibly, did workers stay in scope, how many tokens per successful task? Trace every agent's calls under one parent trace id so a failure can be followed across agents. See [LLM evaluation](/learn/llm-evaluation) and [LLMOps](/learn/llmops-observability)." },
  ],
  uses: [
    { name: "Deep research features", text: "An orchestrator spawns parallel searchers that each read many pages and return condensed findings." },
    { name: "Customer service", text: "Triage plus specialist agents with separate tool permissions, and handoff to humans." },
    { name: "Software engineering agents", text: "A planner splits a change across files or services, with test-running workers verifying each part." },
  ],
  interview: [
    "Justify multiple agents (parallelism, context isolation, permissions) or argue for one.",
    "Pick a pattern: orchestrator-workers, handoffs or a pipeline.",
    "Define compact, typed handoff payloads and durable state.",
    "Cap depth, handoffs and budgets, and trace across agents.",
  ],
  related: ["ai-agent-architecture", "llm-tool-calling-mcp", "agent-memory", "llm-cost-optimization", "design-customer-support-ai-agent"],
  practice: ["rag-search"],
  reading: [
    { title: "Building effective agents", publisher: "Anthropic", url: "https://www.anthropic.com/research/building-effective-agents" },
    { title: "How we built our multi-agent research system", publisher: "Anthropic Engineering", url: "https://www.anthropic.com/engineering/multi-agent-research-system" },
  ],
};
