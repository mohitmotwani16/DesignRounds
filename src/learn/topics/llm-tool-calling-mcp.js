export default {
  blocks: [
    { type: "p", text: "**Tool calling** (also called function calling) lets an LLM ask your application to run a function, such as searching an index, looking up an order or creating a ticket, and then use the result. The **Model Context Protocol (MCP)** is an open standard for exposing tools, data and prompts to AI applications through a common client-server protocol, so one integration works across many agents and hosts. This guide covers how tool calls flow, how to design tool schemas, how to execute them safely, and where MCP fits." },

    { type: "h2", text: "How a tool call works" },
    { type: "diagram", kind: "sequence", caption: "A tool call round trip. The model never executes anything itself: it emits a structured request, your code validates and runs it, and the result goes back to the model.", actors: ["User", "App / runtime", "LLM", "Order API"], steps: [
      { from: 0, to: 1, label: "Where is my order 8812?" },
      { from: 1, to: 2, label: "messages + tool schemas" },
      { from: 2, to: 1, label: "tool_call: get_order(order_id=8812)", tone: "accent" },
      { note: "validate args · check user owns order", over: [1] },
      { from: 1, to: 3, label: "GET /orders/8812" },
      { from: 3, to: 1, label: "{status: shipped, eta: Fri}" },
      { from: 1, to: 2, label: "tool_result" },
      { from: 2, to: 1, label: "\"It shipped and arrives Friday.\"" },
      { from: 1, to: 0, label: "answer" },
    ] },

    { type: "h2", text: "Designing tool schemas" },
    { type: "code", code: `{
  "name": "issue_refund",
  "description": "Refund all or part of a paid order. Only for orders delivered in the last 30 days. Amounts above 100 USD require human approval and return status 'pending_approval'.",
  "input_schema": {
    "type": "object",
    "required": ["order_id", "amount", "reason"],
    "properties": {
      "order_id": { "type": "string", "description": "Order id from get_order, e.g. '8812'" },
      "amount":   { "type": "number", "minimum": 0.01, "description": "USD, at most the order total" },
      "reason":   { "type": "string", "enum": ["damaged", "late", "wrong_item", "other"] }
    }
  }
}` },
    { type: "ul", items: [
      "**Descriptions are prompts:** say when to use the tool, when not to, and what the limits are. Most tool misuse is a vague description.",
      "**Narrow tools beat generic ones:** `get_order` and `issue_refund` are safer and easier to evaluate than `call_api(method, url, body)`.",
      "**Typed, constrained arguments:** enums, minimums, formats. Validate them again in code.",
      "**Useful errors:** return structured errors the model can act on (\"order not found\", \"refund window expired\") instead of stack traces.",
      "**Small results:** return the fields the model needs, paginated, not entire database rows.",
      "**Keep the tool count manageable:** dozens of overlapping tools confuse models; group them, or load relevant tools per task.",
    ] },

    { type: "h2", text: "Executing tools safely" },
    { type: "table", head: ["Concern", "Control"], rows: [
      ["Authorisation", "Run every call as the end user, with their permissions, checked in code; the model's request is not proof of permission"],
      ["Side effects", "Idempotency keys on writes; confirm or approve irreversible actions"],
      ["Injection through results", "Treat tool output as untrusted data; it can contain instructions (see [prompt injection](/learn/prompt-injection))"],
      ["Runaway usage", "Rate limits and budgets per tool and per task"],
      ["Code execution", "Sandboxes with no network or secrets by default, CPU and time limits"],
      ["Auditing", "Log every call with arguments, caller, result and approval"],
      ["Failures", "Timeouts and retries for idempotent reads; surface errors to the model rather than hiding them"],
    ] },
    { type: "p", text: "Parallel tool calls (several independent lookups in one turn) cut latency; make sure your runtime executes them concurrently and returns all results together." },

    { type: "h2", text: "The Model Context Protocol (MCP)" },
    { type: "p", text: "Without a standard, every AI application writes its own integration for every system (N apps × M tools). **MCP** defines a common protocol: **MCP servers** expose capabilities from a system (a database, a ticketing tool, a file store), and **MCP clients** inside AI applications (hosts such as chat apps, IDEs or your own agent) connect to them." },
    { type: "diagram", kind: "flow", caption: "MCP architecture. A host application runs MCP clients that connect to MCP servers; each server wraps a system and exposes its tools, resources and prompts in a standard way.", zones: [{ label: "host application", from: [0, 0.4], to: [1.3, 1.6], tone: "accent" }], nodes: [
      { id: "llm", label: "LLM", col: 0, row: 0.4, tone: "accent" },
      { id: "client", label: "MCP clients", col: 1.3, row: 1, tone: "accent" },
      { id: "s1", label: "MCP server", sub: "tickets", col: 2.8, row: 0 },
      { id: "s2", label: "MCP server", sub: "database", col: 2.8, row: 1 },
      { id: "s3", label: "MCP server", sub: "files", col: 2.8, row: 2 },
      { id: "t1", label: "Ticketing system", col: 4.3, row: 0, shape: "db", tone: "store" },
      { id: "t2", label: "Postgres", col: 4.3, row: 1, shape: "db", tone: "store" },
      { id: "t3", label: "Document store", col: 4.3, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "llm", to: "client", both: true }, { from: "client", to: "s1", both: true }, { from: "client", to: "s2", both: true }, { from: "client", to: "s3", both: true },
      { from: "s1", to: "t1" }, { from: "s2", to: "t2" }, { from: "s3", to: "t3" },
    ] },
    { type: "table", head: ["MCP concept", "What it is"], rows: [
      ["Tools", "Functions the model can call, with JSON Schema inputs"],
      ["Resources", "Data the application can read into context (files, records)"],
      ["Prompts", "Reusable prompt templates a server offers"],
      ["Transports", "Local (standard input/output) for tools on the same machine; HTTP-based for remote servers"],
      ["Discovery", "Clients list a server's capabilities at connection time"],
    ] },
    { type: "p", text: "In a system design, MCP is an integration layer: it doesn't remove the need for authorisation, rate limiting, auditing or approvals. Remote MCP servers need authentication, per-user authorisation and the same least-privilege thinking as any API. Only connect servers you trust, since a malicious server's tool descriptions and results can carry injected instructions." },

    { type: "h2", text: "Function calling vs MCP vs plain APIs" },
    { type: "table", head: ["", "Function calling", "MCP", "Plain API calls in code"], rows: [
      ["Who decides to call", "The model", "The model (via the host)", "Your code"],
      ["Integration reuse", "Per application", "Across any MCP-capable host", "Per application"],
      ["Best for", "A few app-specific tools", "Many tools across many apps or teams", "Fixed workflows"],
    ] },
  ],
  uses: [
    { name: "Support and operations agents", text: "Narrow tools over order, billing and ticketing systems, with approvals on writes." },
    { name: "Internal AI platforms", text: "Teams publish MCP servers for their systems, so every assistant in the company can use them consistently." },
    { name: "Coding agents", text: "Tools for reading files, searching code and running tests in a sandbox." },
  ],
  interview: [
    "Show that the model only requests calls; your runtime validates and executes them.",
    "Design narrow, typed tools with descriptions that state limits.",
    "Authorise as the end user, add idempotency and approvals, and audit everything.",
    "Explain MCP as a standard integration layer that still needs auth and least privilege.",
  ],
  related: ["ai-agent-architecture", "llm-structured-outputs", "prompt-injection", "multi-agent-systems", "api-design", "design-customer-support-ai-agent"],
  practice: ["support-ai-agent", "llm-gateway", "rag-search"],
  reading: [
    { title: "Model Context Protocol documentation", publisher: "Model Context Protocol", url: "https://modelcontextprotocol.io/" },
    { title: "Tool use with Claude", publisher: "Anthropic documentation", url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use" },
  ],
};
