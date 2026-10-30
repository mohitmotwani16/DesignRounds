export default {
  blocks: [
    { type: "p", text: "An **AI agent** is an LLM that decides its own next steps: it calls tools, reads the results, and keeps going until the task is done. That autonomy is what makes agents useful for open-ended tasks, and what makes them expensive, slow and risky when designed loosely. This guide covers **workflows vs agents**, the **agent loop**, tools and state, planning, **stop conditions and budgets**, human approval, and the common patterns, which is what agent design interview questions probe." },

    { type: "h2", text: "Workflows vs agents" },
    { type: "p", text: "A useful distinction: in a **workflow**, your code decides the sequence of LLM and tool calls; in an **agent**, the model decides. Workflows are predictable, testable and cheap; agents handle tasks whose steps can't be known in advance. Start with the simplest thing that works." },
    { type: "table", head: ["Pattern", "How it works", "Use for"], rows: [
      ["Prompt chaining", "Fixed sequence of calls, each using the last one's output, with checks between", "Draft → check → translate; extract → validate → summarise"],
      ["Routing", "Classify the input, send it to a specialised prompt, tool or model", "Support intents; easy vs hard requests to different models"],
      ["Parallelisation", "Run independent calls at once (sections, or several votes) and combine", "Multi-aspect review, guardrails in parallel, ensembles"],
      ["Orchestrator-workers", "A model splits a task into subtasks at run time and delegates them", "Changes spanning many files, research across sources"],
      ["Evaluator-optimizer", "One call generates, another critiques, loop until good enough", "Writing, translation, code with tests as the evaluator"],
      ["Autonomous agent", "Model loops: think, call tools, observe, until done or out of budget", "Open-ended tasks with unknown steps"],
    ] },

    { type: "h2", text: "The agent loop" },
    { type: "diagram", kind: "flow", caption: "The core agent loop. The model chooses an action, the runtime executes it after validation and permission checks, the result goes back into context, and the loop stops on completion, budget exhaustion or a need for human approval.", nodes: [
      { id: "task", label: "Task", col: 0, row: 1, shape: "pill" },
      { id: "llm", label: "LLM", sub: "reason · choose action", col: 1.4, row: 1, tone: "accent" },
      { id: "gate", label: "Runtime checks", sub: "schema · authz · budget", col: 2.9, row: 1, tone: "danger", w: 170 },
      { id: "tool", label: "Tool", sub: "search · API · code", col: 4.4, row: 1 },
      { id: "state", label: "State / context", sub: "results · plan · memory", col: 2.9, row: 2.3, shape: "db", tone: "store", w: 170 },
      { id: "human", label: "Human approval", col: 4.4, row: 0, tone: "muted" },
      { id: "done", label: "Final answer", col: 1.4, row: 0, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "task", to: "llm" }, { from: "llm", to: "gate", label: "tool call" }, { from: "gate", to: "tool" }, { from: "gate", to: "human", dashed: true, label: "risky" },
      { from: "tool", to: "state" }, { from: "state", to: "llm", label: "observe" }, { from: "llm", to: "done", label: "stop" },
    ] },
    { type: "code", code: `def run_agent(task, tools, max_steps=12, max_tokens=60_000):
    messages = [system_prompt(tools), user(task)]
    for step in range(max_steps):
        reply = llm(messages)                      # may contain tool calls
        if not reply.tool_calls:
            return reply.text                      # model decided it's done
        for call in reply.tool_calls:
            check_schema(call); check_permission(user_ctx, call)   # in code, not the prompt
            if is_irreversible(call):
                result = request_human_approval(call)
            else:
                result = tools[call.name](**call.args)              # idempotent where possible
            messages.append(tool_result(call.id, truncate(result)))
        if token_count(messages) > max_tokens:
            messages = summarise_old_steps(messages)
    return escalate("step budget exhausted", messages)` },

    { type: "h2", text: "Tools" },
    { type: "ul", items: [
      "**Clear, narrow tools** with typed schemas and good descriptions beat a few do-everything tools. The description is part of the prompt; write it like documentation.",
      "**Validate every argument** and enforce **authorisation in the tool runtime** using the end user's identity, never the agent's broad credentials.",
      "**Idempotency keys** on side-effecting tools, so a retried step doesn't refund twice; see [idempotency](/learn/idempotency).",
      "**Return compact, structured results**; huge tool outputs flood the context window.",
      "Details in [tool calling and MCP](/learn/llm-tool-calling-mcp).",
    ] },

    { type: "h2", text: "State, planning and memory" },
    { type: "ul", items: [
      "**Short-term state:** the message history of this run, trimmed or summarised as it grows.",
      "**Explicit plan:** asking the model to write and update a plan (a to-do list in state) improves long tasks and makes traces readable.",
      "**Long-term memory:** facts and preferences across sessions, retrieved when relevant; see [agent memory](/learn/agent-memory).",
      "**Durable execution:** long-running agents (minutes to hours) should checkpoint state after each step so a crash resumes instead of restarting, the same idea as a [saga](/learn/saga-pattern) or a workflow engine.",
    ] },

    { type: "h2", text: "Stop conditions and budgets" },
    { type: "table", head: ["Control", "Why"], rows: [
      ["Max steps / tool calls", "Prevents infinite loops when the model keeps retrying"],
      ["Token and cost budget per task", "Caps spend; one confused run shouldn't cost dollars"],
      ["Wall-clock timeout", "Users and upstream callers can't wait forever"],
      ["Repeated-action detection", "Same tool with the same arguments three times means it's stuck"],
      ["Success check", "Verify the outcome in the system of record (was the ticket actually updated?), not the model's claim"],
      ["Escalation path", "Hand off to a human with the trace when a limit is hit"],
    ] },

    { type: "h2", text: "Human in the loop" },
    { type: "p", text: "Require approval for actions that are irreversible, costly or sensitive: payments and refunds above a limit, deleting data, sending external emails, changing permissions. Show the human the proposed action and its justification, and record the decision. Start agents read-only or in suggest mode and widen their authority as evals and incident history earn it." },

    { type: "h2", text: "Evaluating agents" },
    { type: "ul", items: [
      "Evaluate **outcomes** (task completed correctly, verified in the system) and **trajectories** (sensible tools, no unsafe calls, reasonable steps and cost).",
      "Run each test case several times; agents are non-deterministic, so report success rates, not single passes.",
      "Use sandboxed copies of tools and data for evaluation.",
      "See [LLM evaluation](/learn/llm-evaluation).",
    ] },

    { type: "h2", text: "When not to build an agent" },
    { type: "ul", items: [
      "The steps are known: write a workflow.",
      "Latency must be low and predictable: agents add model round trips.",
      "Errors are costly and hard to detect: keep a human or a deterministic system in charge.",
      "One retrieval plus one generation answers it: that's RAG, not an agent.",
    ] },
  ],
  uses: [
    { name: "Customer support", text: "Agents that look up orders, apply policy and take bounded actions, escalating to humans; see the [support agent design](/learn/design-customer-support-ai-agent)." },
    { name: "Coding assistants", text: "Agents that read code, edit files and run tests in a sandbox, with tests as the success check." },
    { name: "Research and operations", text: "Agents that search, compile and summarise across sources, or triage alerts with read-only tools." },
  ],
  interview: [
    "Argue whether the task needs an agent or a workflow.",
    "Draw the loop with runtime checks between the model and the tools.",
    "Set step, token and time budgets, repeated-action detection and an escalation path.",
    "Require human approval for irreversible actions and verify outcomes in the system of record.",
  ],
  related: ["llm-tool-calling-mcp", "multi-agent-systems", "agent-memory", "prompt-injection", "llm-evaluation", "design-customer-support-ai-agent"],
  practice: ["support-ai-agent", "voice-ai-agent", "rag-search"],
  reading: [
    { title: "Building effective agents", publisher: "Anthropic", url: "https://www.anthropic.com/research/building-effective-agents" },
    { title: "ReAct: Synergizing Reasoning and Acting in Language Models", publisher: "Yao et al., ICLR 2023", url: "https://arxiv.org/abs/2210.03629" },
  ],
};
