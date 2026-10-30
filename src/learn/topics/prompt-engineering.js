export default {
  blocks: [
    { type: "p", text: "In a production LLM application, the **prompt is code**: it decides behaviour, it breaks when changed carelessly, and it needs versioning, review and tests. **Prompt engineering for production** is less about clever phrasing and more about structure: a clear system prompt, explicit instructions and output format, the right examples, well-delimited context, and a process for changing all of it safely." },

    { type: "h2", text: "Anatomy of a production prompt" },
    { type: "diagram", kind: "segments", width: 780, caption: "The parts of a typical prompt, in the order they're assembled. Stable parts go first, so providers' prompt caching can reuse them; per-request context and the user's message go last.", lanes: [{ parts: [
      { label: "Role + rules", sub: "system prompt", size: 1.2, tone: "accent" },
      { label: "Output format", sub: "schema · style", size: 1, tone: "accent" },
      { label: "Examples", sub: "few-shot", size: 1.1, tone: "store" },
      { label: "Retrieved context", sub: "delimited", size: 1.6, tone: "cache" },
      { label: "History", sub: "trimmed", size: 1.1, tone: "muted" },
      { label: "User message", size: 1, tone: "ok" },
    ] }] },
    { type: "ul", items: [
      "**Role and rules:** who the assistant is, what it should and shouldn't do, how to handle uncertainty (\"if the documents don't contain the answer, say so\").",
      "**Output format:** exact structure (JSON schema, headings, length), and what to do when a field is unknown. See [structured outputs](/learn/llm-structured-outputs).",
      "**Examples:** a few input-output pairs showing tricky cases, kept short and varied.",
      "**Context:** retrieved documents and tool results, clearly delimited (for example in tagged sections) and labelled as data, not instructions.",
      "**History:** recent turns, summarised or trimmed to fit; see [agent memory](/learn/agent-memory).",
    ] },

    { type: "h2", text: "Techniques that reliably help" },
    { type: "table", head: ["Technique", "What it is", "When to use"], rows: [
      ["Be specific", "State audience, length, tone, constraints and edge cases explicitly", "Always; vague prompts give variable output"],
      ["Few-shot examples", "Show 2-5 worked examples of input and ideal output", "Formatting, classification boundaries, style"],
      ["Step-by-step reasoning", "Ask the model to reason before answering, or use a reasoning mode", "Multi-step problems, maths, analysis"],
      ["Delimiters and tags", "Wrap documents and user input in labelled sections", "Any prompt mixing instructions with data"],
      ["Decomposition (prompt chaining)", "Split a task into several calls, each simpler", "Long or multi-stage tasks; easier to test each step"],
      ["Self-check", "A second call verifies or critiques the first output", "High-stakes outputs, at extra cost"],
      ["Prefill / response start", "Begin the assistant's answer (e.g. with an opening brace)", "Forcing a format where supported"],
    ] },
    { type: "callout", tone: "warning", text: "A prompt is not a security boundary. \"Never reveal other customers' data\" in a system prompt doesn't stop a determined user or an injected document. Enforce permissions in code; see [prompt injection](/learn/prompt-injection)." },

    { type: "h2", text: "Templates and versioning" },
    { type: "p", text: "Keep prompts out of string literals scattered across services. Store them as named, versioned templates with typed variables, and record which version produced every response." },
    { type: "code", code: `prompt: support_answer
version: 14
model: primary-medium-2026-08        # pinned model version
params: { temperature: 0.2, max_tokens: 600 }
variables: [customer_tier, retrieved_docs, history, question]
template: |
  You are the support assistant for Acme. Answer only from <docs>.
  If the docs don't contain the answer, say you'll connect a human.
  Reply in under 150 words. Customer tier: {{customer_tier}}.
  <docs>{{retrieved_docs}}</docs>
  <history>{{history}}</history>
  Question: {{question}}
eval_suite: support_answer_golden_v6   # must pass before release` },

    { type: "h2", text: "A safe change process" },
    { type: "diagram", kind: "flow", caption: "Changing a prompt like changing code: edit, run the eval suite, review the diff in behaviour, canary, then promote. Failures in production become new eval cases.", nodes: [
      { id: "edit", label: "Edit prompt", sub: "new version", col: 0, row: 1 },
      { id: "eval", label: "Eval suite", sub: "golden + edge cases", col: 1.4, row: 1, tone: "ok" },
      { id: "rev", label: "Review", sub: "metric + output diffs", col: 2.8, row: 1 },
      { id: "can", label: "Canary", sub: "5% traffic", col: 4.2, row: 1, tone: "accent" },
      { id: "prod", label: "Promote", col: 5.5, row: 1, shape: "pill", tone: "ok" },
      { id: "fail", label: "Production failures", col: 2.8, row: 2.3, shape: "queue", tone: "danger", w: 160 },
    ], edges: [
      { from: "edit", to: "eval" }, { from: "eval", to: "rev" }, { from: "rev", to: "can" }, { from: "can", to: "prod" }, { from: "prod", to: "fail", dashed: true }, { from: "fail", to: "eval", dashed: true, label: "new cases" },
    ] },
    { type: "ul", items: [
      "Small wording changes can shift behaviour on cases you didn't look at; only the eval suite catches that. See [LLM evaluation](/learn/llm-evaluation).",
      "Prompts are tuned to a model. Re-run evals when switching or upgrading models.",
      "Keep a rollback path: the previous version is one config change away. See [LLMOps](/learn/llmops-observability).",
    ] },

    { type: "h2", text: "Cost and latency of prompts" },
    { type: "ul", items: [
      "Every token in the system prompt and examples is paid on every request. Trim what doesn't change results.",
      "Put stable content first so **prompt caching** can reuse it across requests; see [LLM caching](/learn/llm-caching).",
      "Long few-shot sections can sometimes be replaced by fine-tuning when volume is high; see [fine-tuning vs RAG](/learn/llm-fine-tuning).",
    ] },
  ],
  uses: [
    { name: "Support assistants", text: "Versioned templates with grounding rules, tone guidance and escalation instructions." },
    { name: "Extraction pipelines", text: "Short, strict prompts with schemas and examples of edge cases, at temperature near zero." },
    { name: "Agents", text: "System prompts describing tools, planning style and stop conditions; see [AI agents](/learn/ai-agent-architecture)." },
  ],
  interview: [
    "Describe the prompt's sections and the order you assemble them in, and why.",
    "Treat prompts as versioned artifacts tied to a model version and an eval suite.",
    "Say that permissions are enforced in code, not in the prompt.",
    "Mention prompt caching and trimming as cost levers.",
  ],
  related: ["llm-structured-outputs", "llm-evaluation", "llmops-observability", "how-llms-work", "prompt-injection"],
  practice: ["rag-search"],
  reading: [
    { title: "Prompt engineering overview", publisher: "Anthropic documentation", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview" },
    { title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", publisher: "Wei et al., NeurIPS 2022", url: "https://arxiv.org/abs/2201.11903" },
  ],
};
