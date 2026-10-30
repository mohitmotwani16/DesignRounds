export default {
  blocks: [
    { type: "p", text: "Whenever an LLM's output is consumed by code (an extraction pipeline, a router, a tool call, a form filler), it has to arrive in a **structure your program can trust**. **Structured outputs** combine three layers: asking for a format, **constraining** the model to it where the provider supports it, and **validating** the result in your code, with repair, retry and fallback paths when it fails. Interviewers probe this as \"how do you integrate an LLM behind an application contract?\"" },

    { type: "h2", text: "Three levels of reliability" },
    { type: "table", head: ["Level", "How", "Reliability"], rows: [
      ["Prompted format", "Describe the JSON or format in the prompt, with an example", "Usually right, sometimes malformed or with extra text"],
      ["JSON mode", "Provider guarantees syntactically valid JSON", "Valid JSON, but fields may be missing or wrong types"],
      ["Schema-constrained decoding", "Provider (or your serving stack) restricts tokens so output matches a JSON Schema", "Matches the schema; values can still be semantically wrong"],
    ] },
    { type: "p", text: "Even with schema-constrained decoding, the **values** can be wrong: an invoice total that doesn't equal the sum of its lines, a date in the future, a customer id that doesn't exist. Validation in code is always needed." },

    { type: "h2", text: "The validation pipeline" },
    { type: "diagram", kind: "flow", caption: "Treat model output like untrusted input: parse, validate against the schema, run semantic checks, and only then act. Failures get one bounded repair attempt, then a fallback.", nodes: [
      { id: "llm", label: "LLM call", sub: "schema requested", col: 0, row: 1, tone: "accent" },
      { id: "parse", label: "Parse", col: 1.25, row: 1 },
      { id: "schema", label: "Schema check", sub: "types · required", col: 2.5, row: 1 },
      { id: "sem", label: "Semantic checks", sub: "totals · ids · ranges", col: 3.75, row: 1, tone: "ok", w: 160 },
      { id: "act", label: "Act / store", col: 5.1, row: 1, shape: "pill", tone: "ok" },
      { id: "repair", label: "Repair retry", sub: "send errors back · max 1-2", col: 2.5, row: 2.3, tone: "danger", w: 180 },
      { id: "fb", label: "Fallback", sub: "human queue · default", col: 4.2, row: 2.3, shape: "queue", tone: "queue", w: 170 },
    ], edges: [
      { from: "llm", to: "parse" }, { from: "parse", to: "schema" }, { from: "schema", to: "sem" }, { from: "sem", to: "act" },
      { from: "schema", to: "repair", dashed: true, label: "fail" }, { from: "sem", to: "repair", dashed: true }, { from: "repair", to: "llm", dashed: true }, { from: "repair", to: "fb", label: "still failing" },
    ] },

    { type: "h2", text: "Designing the schema" },
    { type: "code", code: `{
  "type": "object",
  "required": ["vendor", "invoice_date", "currency", "lines", "total", "confidence"],
  "properties": {
    "vendor":       { "type": "string" },
    "invoice_date": { "type": "string", "format": "date" },
    "currency":     { "type": "string", "enum": ["USD", "EUR", "INR", "GBP"] },
    "lines": { "type": "array", "items": {
        "type": "object", "required": ["description", "amount"],
        "properties": { "description": { "type": "string" }, "amount": { "type": "number" } } } },
    "total":        { "type": "number" },
    "confidence":   { "type": "string", "enum": ["high", "medium", "low"] },
    "missing_fields": { "type": "array", "items": { "type": "string" } }
  }
}` },
    { type: "ul", items: [
      "**Enums over free text** wherever values are a known set; easier to validate and route on.",
      "**Explicit unknowns:** a `missing_fields` list or nullable fields, so the model isn't pushed to invent values.",
      "**A refusal path:** a field or status for \"can't do this\" (wrong document type, unsafe request).",
      "**Keep it flat and small:** deeply nested, very large schemas are harder for models and slower to constrain.",
      "**Version the schema** alongside the prompt; consumers rely on it like an API contract.",
    ] },

    { type: "h2", text: "Semantic checks before side effects" },
    { type: "ul", items: [
      "Arithmetic: line items sum to the total (within rounding).",
      "References exist: the order id belongs to this customer, the product id is in the catalogue.",
      "Ranges and dates are plausible: no negative quantities, no invoice dated next year.",
      "Permissions: the action is allowed for this user, checked in code; see [prompt injection](/learn/prompt-injection).",
      "Confidence routing: low-confidence or partial results go to human review instead of being auto-applied.",
    ] },

    { type: "h2", text: "Function calling is structured output too" },
    { type: "p", text: "Tool calls are the model emitting a structured request (tool name plus arguments) that your code executes. The same rules apply: validate arguments against the tool's schema, check permissions and business rules, and make side-effecting tools idempotent. See [tool calling and MCP](/learn/llm-tool-calling-mcp)." },

    { type: "h2", text: "Errors and retries" },
    { type: "table", head: ["Failure", "Response"], rows: [
      ["Malformed JSON or schema violation", "One repair attempt with the validation errors included; then fallback"],
      ["Truncated output (hit max tokens)", "Raise the limit or split the task; don't parse partial output"],
      ["Refusal or \"can't extract\"", "Route to a human or return a typed error to the caller"],
      ["Timeout or rate limit", "Retry with backoff on the same or a fallback model; see [LLM gateway](/learn/llm-gateway)"],
      ["Semantically wrong values", "Reject, log the case into the eval set, route to review"],
    ] },
    { type: "p", text: "Bound retries: each one costs tokens and latency, and repeated failures usually mean the input is unusual, not that the next attempt will work. Track the repair and fallback rates as quality metrics; see [LLMOps](/learn/llmops-observability)." },
  ],
  uses: [
    { name: "Document extraction", text: "Invoices, receipts and contracts parsed into typed records with arithmetic and reference checks." },
    { name: "Routing and classification", text: "Enum outputs decide which queue, model or workflow handles a request." },
    { name: "Agents", text: "Every tool call is a structured output validated before execution." },
  ],
  interview: [
    "Layer requested format, constrained decoding and validation in code.",
    "Design the schema with enums, explicit unknowns and a refusal path.",
    "Run semantic checks before any side effect.",
    "Bound repair retries and route persistent failures to a fallback.",
  ],
  related: ["prompt-engineering", "llm-tool-calling-mcp", "llm-evaluation", "design-document-ingestion-pipeline", "llm-guardrails"],
  practice: ["rag-search"],
  reading: [
    { title: "JSON Schema", publisher: "JSON Schema organisation", url: "https://json-schema.org/" },
    { title: "Tool use with Claude", publisher: "Anthropic documentation", url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use" },
  ],
};
