// Case study: a customer support AI agent with tools, approvals and human handoff.
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI agent that handles customer support for an online retailer (or a streaming service, or an insurer). It should answer policy questions, look up orders, take actions like rescheduling a delivery or issuing a refund within limits, and hand off to a human agent when it can't help or shouldn't decide. This is the classic **agent design** question: tools, permissions, guardrails, human handoff, evaluation and token cost." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Channels?", "Chat on web and app; email as a stretch"],
      ["Volume?", "50K conversations per day, ~6 turns each"],
      ["What can it do?", "Answer policy questions; look up orders and shipments; reschedule deliveries; refunds up to $50 automatically, above that with human approval; update address before dispatch"],
      ["Success metric?", "Resolution without human handoff, with customer satisfaction at least as good as human agents"],
      ["Constraints?", "Never act on another customer's account; follow refund policy exactly; full audit trail"],
    ] },

    { type: "h2", text: "2. Evaluation plan" },
    { type: "ul", items: [
      "A simulation suite of ~500 scripted customer scenarios (with a model playing the customer) covering each intent, edge cases (refund window expired, partial delivery), adversarial users (\"I'm the account owner's husband\", injection attempts), and cases that must escalate.",
      "Graders: outcome checks in a sandboxed order system (right refund amount, no unauthorised actions), policy compliance judged against the written policy, tone, and handoff correctness.",
      "Each scenario run several times; ship only with zero unauthorised actions. See [LLM evaluation](/learn/llm-evaluation).",
    ] },

    { type: "h2", text: "3. Workflow or agent?" },
    { type: "p", text: "Most conversations are one of a few intents with known steps (where's my order, refund, reschedule). A **router plus intent-specific workflows** handles those predictably and cheaply; an **agent loop** with tools handles the long tail of messy, multi-issue conversations. Both share the same tools, policies and guardrails. See [AI agent architecture](/learn/ai-agent-architecture)." },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "The support agent: an intent router sends common requests to workflows and the rest to an agent loop. Every tool call passes through a policy layer that checks identity, ownership and limits; risky actions wait for human approval, and the agent can hand off at any point.", nodes: [
      { id: "cust", label: "Customer", col: 0, row: 1, shape: "pill" },
      { id: "guard", label: "Input guard", col: 1.15, row: 1, tone: "danger" },
      { id: "router", label: "Intent router", sub: "small model", col: 2.3, row: 1 },
      { id: "wf", label: "Intent workflows", sub: "order status · reschedule", col: 3.55, row: 0.2, w: 170 },
      { id: "agent", label: "Agent loop", sub: "long tail", col: 3.55, row: 1.8, tone: "accent" },
      { id: "kb", label: "Policy + help RAG", col: 4.85, row: 2.8, shape: "db", tone: "store" },
      { id: "pol", label: "Policy layer", sub: "authz · limits · audit", col: 4.85, row: 1, tone: "danger", w: 160 },
      { id: "tools", label: "Order / refund APIs", col: 6.15, row: 1, tone: "store", w: 160 },
      { id: "human", label: "Human agents", sub: "handoff + approvals", col: 6.15, row: 2.3, tone: "muted", w: 160 },
    ], edges: [
      { from: "cust", to: "guard" }, { from: "guard", to: "router" }, { from: "router", to: "wf" }, { from: "router", to: "agent" },
      { from: "wf", to: "pol" }, { from: "agent", to: "pol" }, { from: "agent", to: "kb", dashed: true }, { from: "pol", to: "tools" }, { from: "pol", to: "human", dashed: true, label: "approval" }, { from: "agent", to: "human", dashed: true, label: "handoff" },
    ] },

    { type: "h2", text: "5. Tools and the policy layer" },
    { type: "table", head: ["Tool", "Type", "Policy checks in code"], rows: [
      ["search_help(query)", "Read", "None beyond rate limits"],
      ["get_orders(customer)", "Read", "Customer id comes from the authenticated session, never from the model"],
      ["get_shipment(order_id)", "Read", "Order belongs to the session's customer"],
      ["reschedule_delivery(order_id, slot)", "Write", "Ownership; slot available; not yet out for delivery; idempotency key"],
      ["issue_refund(order_id, amount, reason)", "Write", "Ownership; within window; amount ≤ eligible amount; ≤ $50 auto, else pending human approval; idempotency key"],
      ["handoff(summary, priority)", "Control", "Always allowed"],
    ] },
    { type: "ul", items: [
      "The model proposes; the **policy layer decides**. Policy rules live in code and config, so legal and support teams can change limits without prompt edits.",
      "Identity is bound to the session: the agent can't be talked into acting on another account because the tools never accept a customer id from the model.",
      "Every write is logged with the conversation, the tool arguments, the policy decision and any approver.",
      "Details in [tool calling and MCP](/learn/llm-tool-calling-mcp).",
    ] },

    { type: "h2", text: "6. Human handoff" },
    { type: "ul", items: [
      "Triggers: the customer asks for a human; frustration detected; the agent fails twice; policy requires a human (fraud suspicion, legal threats); step or token budget hit.",
      "The handoff includes a concise summary, the customer's verified identity, actions already taken and the suggested next step, so the human doesn't restart the conversation.",
      "Approvals for large refunds appear in the human agents' queue with one-click approve or reject; the conversation resumes with the outcome.",
    ] },

    { type: "h2", text: "7. Guardrails" },
    { type: "ul", items: [
      "Input moderation and PII handling; card numbers typed into chat are redacted before logging.",
      "The agent only promises what policy allows: output checks catch commitments (\"I'll refund you twice\") that don't match tool results.",
      "Help articles and customer messages are untrusted text; no tool accepts free-form instructions from them. See [prompt injection](/learn/prompt-injection) and [guardrails](/learn/llm-guardrails).",
    ] },

    { type: "h2", text: "8. Cost and latency" },
    { type: "code", code: `Volume      : 50K conversations × 6 turns = 300K turns/day
Routing     : small model, ~400 tokens/turn → negligible
Workflows   : ~65% of conversations; 1-2 mid-model calls per turn, ~2.5K tokens each
Agent loop  : ~35%; avg 3 model calls per turn × ~4K tokens (tools + history)
Estimate    : ≈ 300K × (0.65 × 1.5 × 2.5K + 0.35 × 3 × 4K) ≈ 2.0B tokens/day
Per conversation: ~40K tokens ≈ a few cents at illustrative mid-model prices,
                  versus several dollars for a human-handled contact
Controls    : per-conversation token cap, step limit of 8 per turn, prefix caching
              for the system prompt and tool definitions` },
    { type: "p", text: "Measure **cost per resolved conversation**, including the cost of conversations that end in handoff anyway. See [LLM cost optimization](/learn/llm-cost-optimization)." },

    { type: "h2", text: "9. Rollout and operations" },
    { type: "ol", items: [
      "Shadow mode: the agent drafts replies that human agents can use or discard; measure acceptance.",
      "Read-only launch: answers and lookups only, all actions handed off.",
      "Enable low-risk actions (reschedule), then small refunds, widening limits as metrics and audits allow.",
      "Monitor resolution rate, satisfaction, handoff reasons, unauthorised-action attempts blocked, refunds issued vs policy, cost per resolution; trace every conversation. See [LLMOps](/learn/llmops-observability).",
    ] },
  ],
  uses: [
    { name: "Retail and delivery", text: "Order status, rescheduling and bounded refunds handled automatically, with humans for exceptions." },
    { name: "Streaming and subscriptions", text: "Billing questions, plan changes and troubleshooting with account-bound tools." },
    { name: "Insurance and banking", text: "Claims intake and status with stricter approvals and audit requirements." },
  ],
  interview: [
    "Combine an intent router and workflows with an agent loop for the long tail.",
    "Bind identity to the session and enforce policy in a code layer between model and tools.",
    "Design human handoff and approval flows with a useful summary.",
    "Evaluate with simulated scenarios in a sandbox, and roll out from shadow to read-only to actions.",
  ],
  related: ["ai-agent-architecture", "llm-tool-calling-mcp", "multi-agent-systems", "llm-guardrails", "llm-evaluation", "design-rag-chatbot"],
  practice: ["support-ai-agent", "rag-search", "notification-service"],
  reading: [
    { title: "Building effective agents", publisher: "Anthropic", url: "https://www.anthropic.com/research/building-effective-agents" },
    { title: "OWASP Top 10 for LLM Applications", publisher: "OWASP GenAI Security Project", url: "https://genai.owasp.org/llm-top-10/" },
  ],
};
