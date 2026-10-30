export default {
  blocks: [
    { type: "p", text: "**LLM guardrails** are the checks around a model that keep an application's behaviour inside acceptable bounds: blocking harmful or off-topic requests, preventing personal data from leaking, making sure outputs are grounded and well-formed, and handing over to a human or a safe default when something looks wrong. The model's own safety training is one layer; production systems add their own, because only you know your policies, your data and your users." },

    { type: "h2", text: "Where guardrails sit" },
    { type: "diagram", kind: "flow", caption: "Guardrails on both sides of the model. Input checks run before the expensive call; output checks run before anything reaches the user or triggers an action. Each check can block, rewrite or escalate.", nodes: [
      { id: "user", label: "User input", col: 0, row: 1, shape: "pill" },
      { id: "in", label: "Input guards", sub: "abuse · PII · topic · injection", col: 1.45, row: 1, tone: "danger", w: 180 },
      { id: "llm", label: "LLM + context", col: 2.95, row: 1, tone: "accent" },
      { id: "out", label: "Output guards", sub: "safety · PII · schema · grounding", col: 4.45, row: 1, tone: "danger", w: 190 },
      { id: "ok", label: "Response / action", col: 5.95, row: 1, shape: "pill", tone: "ok" },
      { id: "fb", label: "Fallback", sub: "refusal · human · default", col: 3.7, row: 2.3, shape: "queue", tone: "queue", w: 170 },
    ], edges: [
      { from: "user", to: "in" }, { from: "in", to: "llm" }, { from: "llm", to: "out" }, { from: "out", to: "ok" }, { from: "in", to: "fb", dashed: true, label: "block" }, { from: "out", to: "fb", dashed: true, label: "block" },
    ] },

    { type: "h2", text: "Input guardrails" },
    { type: "table", head: ["Check", "How", "Action"], rows: [
      ["Harmful content", "Moderation classifier (a provider's moderation endpoint or an open safety model)", "Refuse with a safe message; log"],
      ["Off-topic / out of scope", "Lightweight intent classifier or embedding similarity to allowed topics", "Redirect politely"],
      ["Personal data", "PII detectors (patterns plus NER) on user input", "Redact before sending to the model or logs"],
      ["Prompt injection attempts", "Heuristics and classifiers on user input and retrieved content", "Flag, strip, or lower trust; never the only defence (see [prompt injection](/learn/prompt-injection))"],
      ["Abuse and cost attacks", "Rate limits, input length caps, per-user budgets", "Throttle or reject"],
    ] },

    { type: "h2", text: "Output guardrails" },
    { type: "table", head: ["Check", "How", "Action"], rows: [
      ["Harmful or policy-violating output", "Moderation classifier on the response", "Block and replace with a refusal or regenerate"],
      ["Data leakage", "PII and secret detectors; checks for system prompt content", "Redact or block"],
      ["Format", "Schema validation", "Repair or retry (see [structured outputs](/learn/llm-structured-outputs))"],
      ["Groundedness", "Check claims against retrieved sources (judge model or NLI)", "Regenerate, add caveat, or say \"I don't know\""],
      ["Business rules", "Code checks: prices quoted match the catalogue, no promises outside policy", "Block or correct"],
      ["Action safety", "Permission and limit checks before tool execution", "Require approval or deny"],
    ] },

    { type: "h2", text: "Latency and cost of guardrails" },
    { type: "p", text: "Every check adds latency, and running a large model as a guard on every request can double cost. Practical patterns:" },
    { type: "ul", items: [
      "**Cheap first:** regex and small classifiers (milliseconds) before any LLM-based check.",
      "**Run in parallel:** input moderation can run alongside retrieval; it only needs to finish before the model call.",
      "**Stream with care:** when streaming responses, check chunks as they're produced and cut the stream if a check fails, or buffer the first sentences for high-risk products.",
      "**Risk-based depth:** a public consumer chatbot needs more checks than an internal tool for engineers.",
    ] },
    { type: "diagram", kind: "timeline", caption: "Guardrails timed against a streaming response (illustrative). Input checks overlap retrieval; output checks run on streamed chunks, so the user still sees text in well under a second.", ticks: ["0 ms", "200", "400", "600", "800", "1000+"], spans: [
      { from: 0, to: 0.6, label: "moderation", lane: 0, tone: "danger" },
      { from: 0, to: 1, label: "retrieval", lane: 1, tone: "store" },
      { from: 1, to: 3, label: "time to first token", lane: 1, tone: "accent" },
      { from: 3, to: 5, label: "streaming + chunk checks", lane: 0, tone: "ok" },
    ] },

    { type: "h2", text: "Designing refusals and fallbacks" },
    { type: "ul", items: [
      "Refusals should be brief, explain what the assistant can help with, and avoid lecturing.",
      "Over-blocking is a real cost: measure false refusals on legitimate requests, not only missed harms.",
      "Escalate to a human for high-stakes domains (account security, medical, legal) rather than guessing.",
      "Fail safe: if the guardrail service itself is down, decide in advance whether to block (high-risk products) or allow with logging (low-risk internal tools).",
    ] },

    { type: "h2", text: "Measuring guardrails" },
    { type: "ul", items: [
      "Block rate by category, and the share later judged a false positive.",
      "Missed harms found by sampled review and user reports.",
      "Added latency per check (p50, p95).",
      "A red-team test set (jailbreaks, PII extraction, off-topic baits) in the [evaluation suite](/learn/llm-evaluation), run on every release.",
    ] },
  ],
  uses: [
    { name: "Consumer chatbots", text: "Input and output moderation, PII redaction and refusals tuned to minimise both harms and over-blocking." },
    { name: "Enterprise assistants", text: "Data-leak prevention, permission checks and grounding requirements matter more than toxicity." },
    { name: "Agents with actions", text: "Policy checks and approval gates before tools run; see [AI agents](/learn/ai-agent-architecture)." },
  ],
  interview: [
    "Place checks before and after the model and say what each one blocks.",
    "Order checks cheap to expensive and run some in parallel to protect latency.",
    "Handle streaming, fallbacks and the guardrail service's own failure.",
    "Measure false refusals as well as missed harms.",
  ],
  related: ["prompt-injection", "llm-evaluation", "design-harmful-content-detection", "llm-structured-outputs", "ai-application-architecture"],
  practice: ["rag-search", "model-monitoring"],
  reading: [
    { title: "Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations", publisher: "Inan et al., Meta, 2023", url: "https://arxiv.org/abs/2312.06674" },
    { title: "AI Risk Management Framework", publisher: "NIST", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
  ],
};
