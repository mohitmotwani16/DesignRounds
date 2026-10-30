// Case study: an AI coding assistant (inline completion, chat and agent mode).
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI code assistant like GitHub Copilot: as a developer types in their editor, it suggests the next lines of code; it also offers a chat about the codebase and, increasingly, an agent mode that edits files and runs tests. The hardest constraint is **latency**: inline suggestions are useless if they arrive after the developer has typed on. The other key challenges are **picking the right context from the repository**, **privacy of customers' code**, and **measuring usefulness**." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Features?", "Inline completion (main focus), chat about code, agent mode for multi-file changes"],
      ["Users?", "2M daily active developers; completions requested as they type"],
      ["Latency?", "Inline: suggestion visible within ~300 ms of a pause; chat: first token under 2 s"],
      ["Privacy?", "Enterprise customers require that code isn't retained or used for training; some need region pinning"],
      ["Languages?", "All popular languages; quality matters most for the top ten"],
    ] },

    { type: "h2", text: "2. Estimates" },
    { type: "code", code: `Completion requests: 2M devs × ~5 active hours × ~120 requests/hour ≈ 1.2B/day
                    ≈ 14K/s avg, ~40K/s peak (work hours across time zones)
Per request       : ~1,500-4,000 prompt tokens of context, ~20-60 output tokens
Implication       : prompt-heavy, output-light → prefill dominates; a small, fast
                    model is mandatory for inline; caching and cancellation are crucial
Cancellation      : many requests are obsolete before they finish (the user kept
                    typing) → cancel in-flight requests to save GPU time` },

    { type: "h2", text: "3. Inline completion architecture" },
    { type: "diagram", kind: "flow", caption: "Inline completion: the editor plugin debounces keystrokes and builds context locally, the service assembles a fill-in-the-middle prompt and calls a small, fast model, and post-processing filters the suggestion before it's shown as ghost text.", nodes: [
      { id: "ed", label: "Editor plugin", sub: "debounce · local context", col: 0, row: 1, w: 160 },
      { id: "gw", label: "Completion API", sub: "auth · nearest region", col: 1.45, row: 1 },
      { id: "ctx", label: "Context assembly", sub: "prefix · suffix · snippets", col: 2.8, row: 1, tone: "accent", w: 170 },
      { id: "idx", label: "Repo index", sub: "symbols · embeddings", col: 2.8, row: 2.3, shape: "db", tone: "store" },
      { id: "llm", label: "Small code model", sub: "FIM · low latency", col: 4.2, row: 1, tone: "accent" },
      { id: "post", label: "Post-process", sub: "syntax · filters · dedupe", col: 5.55, row: 1, tone: "ok", w: 170 },
    ], edges: [
      { from: "ed", to: "gw" }, { from: "gw", to: "ctx" }, { from: "idx", to: "ctx", dashed: true }, { from: "ctx", to: "llm" }, { from: "llm", to: "post" }, { from: "post", to: "ed", dashed: true, label: "ghost text" },
    ] },

    { type: "h2", text: "4. Context: the core quality lever" },
    { type: "p", text: "The model only knows what's in its prompt. Within a few thousand tokens, include what most helps predict the next lines:" },
    { type: "ul", items: [
      "**Prefix and suffix:** code before and after the cursor. Models trained for **fill-in-the-middle (FIM)** use both, so a completion fits between existing lines.",
      "**Open tabs and recently edited files:** strong signals of what the developer is working on.",
      "**Relevant snippets from the repository:** definitions of symbols used near the cursor (from a language server or symbol index), and similar code found by embedding search.",
      "**File path, language and imports.**",
      "Context is ranked and trimmed to a token budget; the plugin does much of the gathering locally to avoid shipping whole repositories.",
    ] },
    { type: "p", text: "For chat and agent mode, a richer repository index (chunked by function and class, embedded, plus a symbol graph) supports retrieval over the whole codebase; see [chunking strategies](/learn/rag-chunking-strategies)." },

    { type: "h2", text: "5. Latency engineering" },
    { type: "diagram", kind: "bars", caption: "An illustrative latency budget for one inline completion. The model call dominates, so a small model, short outputs, nearby regions and prefix caching all matter.", unit: "ms", values: [
      { label: "Debounce", value: 75, display: "~75 ms", tone: "muted" },
      { label: "Context build", value: 20, display: "~20 ms", tone: "store" },
      { label: "Network", value: 40, display: "~40 ms", tone: "cache" },
      { label: "Model (prefill + ~30 tokens)", value: 140, display: "~140 ms", tone: "accent" },
      { label: "Post-process + render", value: 15, display: "~15 ms", tone: "ok" },
    ] },
    { type: "ul", items: [
      "**Debounce** keystrokes (send after a short pause) and **cancel** stale requests server-side.",
      "A small model specialised for code, possibly distilled from a larger one; see [model compression](/learn/model-compression).",
      "Stop generation early: at a line or block boundary, or when confidence drops.",
      "Serve from regions near developers; keep the prompt's stable parts first for prefix caching; see [LLM caching](/learn/llm-caching).",
      "Client-side cache: if the user types exactly what was suggested, keep showing the rest without a new request.",
    ] },

    { type: "h2", text: "6. Post-processing and safety" },
    { type: "ul", items: [
      "Trim to syntactically sensible boundaries; drop suggestions that duplicate the following lines.",
      "Filter secrets and obviously unsafe patterns; optionally flag suggestions that closely match public code (licence concerns).",
      "Don't suggest in files marked sensitive or excluded by policy.",
    ] },

    { type: "h2", text: "7. Chat and agent mode" },
    { type: "ul", items: [
      "Chat uses a stronger model with retrieved repository context and the current selection; answers stream.",
      "Agent mode runs a [tool loop](/learn/ai-agent-architecture): search code, read files, edit, run tests and linters in a sandbox, iterate. Tests act as the success check.",
      "Changes are presented as diffs for review; the agent never pushes or merges on its own.",
      "Repository content (including comments and READMEs) can carry injected instructions: sandbox without secrets or network by default. See [prompt injection](/learn/prompt-injection).",
    ] },

    { type: "h2", text: "8. Privacy" },
    { type: "ul", items: [
      "Enterprise mode: prompts processed in memory, not retained, not used for training; contractually and technically enforced.",
      "Region pinning for data residency; per-organisation policy for which repositories and files may be sent.",
      "Telemetry (acceptance events) stored without code content.",
    ] },

    { type: "h2", text: "9. Measuring usefulness" },
    { type: "table", head: ["Metric", "Notes"], rows: [
      ["Acceptance rate", "Share of shown suggestions accepted; easy to game with tiny suggestions"],
      ["Characters retained", "Share of accepted code still present after some minutes; captures real value"],
      ["Share of code written with suggestions", "Overall adoption"],
      ["Latency p50/p95 and show rate", "Slow suggestions aren't shown at all"],
      ["Task completion time (controlled studies)", "The outcome that matters; measured in experiments"],
    ] },
    { type: "p", text: "Offline, evaluate on held-out repositories with tests: does the completion make the tests pass? Online, A/B test model and context changes on acceptance and retention. See [LLM evaluation](/learn/llm-evaluation)." },
  ],
  uses: [
    { name: "IDE assistants", text: "Inline completion with fill-in-the-middle models and repository context." },
    { name: "Code review bots", text: "Retrieval over the diff and related code with a stronger model, posting comments for humans to accept." },
    { name: "Coding agents", text: "Sandboxed tool loops that edit, test and propose pull requests." },
  ],
  interview: [
    "Lead with the latency budget and how debounce, cancellation and a small model meet it.",
    "Explain fill-in-the-middle and which repository context to include.",
    "Separate inline completion from chat and agent mode, each with its own model and limits.",
    "Measure retained characters and task time, not just acceptance; address code privacy.",
  ],
  related: ["llm-inference-serving", "model-compression", "llm-caching", "ai-agent-architecture", "rag-chunking-strategies", "typeahead-autocomplete"],
  practice: ["code-assistant", "llm-inference-platform", "autocomplete", "model-serving"],
  reading: [
    { title: "Efficient Training of Language Models to Fill in the Middle", publisher: "Bavarian et al., OpenAI, 2022", url: "https://arxiv.org/abs/2207.14255" },
    { title: "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot", publisher: "Peng et al., 2023", url: "https://arxiv.org/abs/2302.06590" },
  ],
};
