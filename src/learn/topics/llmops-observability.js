export default {
  blocks: [
    { type: "p", text: "**LLMOps** is the operational discipline for LLM applications: **tracing** every model and tool call, **versioning** prompts, models and retrieval configs together, gating releases on **evals**, rolling out behind **canaries**, collecting **feedback**, and handling **incidents** when quality, safety or cost goes wrong. It extends [MLOps](/learn/mlops-model-registry) and ordinary [observability](/learn/observability) with the fact that an LLM app's behaviour lives in prompts and configuration as much as in code." },

    { type: "h2", text: "What to version" },
    { type: "p", text: "A response is produced by a combination of artifacts; changing any one can change behaviour. Treat the combination as a release:" },
    { type: "table", head: ["Artifact", "Example", "Why it matters"], rows: [
      ["Prompt templates", "support_answer v14", "Wording changes shift behaviour on unseen cases"],
      ["Model and parameters", "provider/model version, temperature 0.2", "Model upgrades change outputs even with the same prompt"],
      ["Retrieval config", "Embedding model, chunking v3, top-k 8, reranker v2", "Changes what context the model sees"],
      ["Tool definitions", "issue_refund schema v5", "Descriptions steer tool use"],
      ["Guardrail policies", "Moderation thresholds, PII rules", "Change what's blocked"],
      ["Eval suite", "golden_v6", "Defines what \"passing\" meant for this release"],
    ] },
    { type: "p", text: "Store these in version control or a config registry, deploy them through the same review and CI process as code, and stamp every trace with the versions used." },

    { type: "h2", text: "Tracing" },
    { type: "diagram", kind: "timeline", caption: "A trace of one agent request, as spans on a timeline. Each span records inputs, outputs, tokens, cost and versions, so slow or wrong steps can be found directly.", ticks: ["0 s", "1", "2", "3", "4", "5"], spans: [
      { from: 0, to: 5, label: "request (trace root)", lane: 0, tone: "muted" },
      { from: 0, to: 0.3, label: "guard", lane: 1, tone: "danger" },
      { from: 0.3, to: 0.8, label: "retrieve", lane: 1, tone: "store" },
      { from: 0.8, to: 2.2, label: "LLM: plan + tool call", lane: 1, tone: "accent" },
      { from: 2.2, to: 2.9, label: "tool: get_order", lane: 1, tone: "cache" },
      { from: 2.9, to: 4.65, label: "LLM: answer (stream)", lane: 1, tone: "accent" },
      { from: 4.65, to: 5, label: "guard", lane: 1, tone: "danger" },
    ] },
    { type: "ul", items: [
      "One trace per user request, with child spans for each guard, retrieval, model call and tool call.",
      "Record per span: inputs and outputs (redacted), model, versions, token counts, cached tokens, cost, latency, errors.",
      "Propagate trace ids across services and agents; OpenTelemetry has semantic conventions for generative AI spans.",
      "Respect privacy: redact PII before storage, restrict access, set retention limits.",
    ] },

    { type: "h2", text: "Metrics and dashboards" },
    { type: "table", head: ["Category", "Metrics"], rows: [
      ["Latency", "Time to first token, total latency p50/p95/p99, per-span latency"],
      ["Reliability", "Error and timeout rates per provider and model, fallback rate, schema repair rate"],
      ["Cost", "Tokens and cost per request and per resolved task, cache hit rates, top expensive tasks"],
      ["Quality (online)", "Thumbs-down rate, regeneration rate, escalation to human, sampled judge scores for groundedness"],
      ["Safety", "Guardrail block rates by category, injection detections, policy violations found in review"],
      ["Agents", "Steps per task, budget-exhausted rate, tool error rates, repeated-action loops"],
    ] },

    { type: "h2", text: "Releasing changes safely" },
    { type: "diagram", kind: "flow", caption: "A release pipeline for prompt, model or retrieval changes: offline evals gate the change, a canary compares it on live traffic, and automatic rollback triggers on guardrail metrics.", nodes: [
      { id: "pr", label: "Change", sub: "prompt · model · config", col: 0, row: 1 },
      { id: "ci", label: "CI evals", sub: "golden + red-team", col: 1.4, row: 1, tone: "ok" },
      { id: "shadow", label: "Shadow", sub: "optional", col: 2.8, row: 1, tone: "muted" },
      { id: "canary", label: "Canary 5%", sub: "compare metrics", col: 4.2, row: 1, tone: "accent" },
      { id: "full", label: "100%", col: 5.5, row: 1, shape: "pill", tone: "ok" },
      { id: "rb", label: "Auto rollback", sub: "on threshold breach", col: 4.2, row: 2.3, tone: "danger" },
    ], edges: [
      { from: "pr", to: "ci" }, { from: "ci", to: "shadow" }, { from: "shadow", to: "canary" }, { from: "canary", to: "full" }, { from: "canary", to: "rb", dashed: true },
    ] },
    { type: "ul", items: [
      "Use [feature flags](/learn/feature-flags) or gateway routing to switch prompt and model versions without redeploying.",
      "Define abort thresholds in advance: error rate, cost per task, thumbs-down rate, block rate.",
      "Pin model versions; when a provider deprecates one, run the full suite on the replacement before switching.",
    ] },

    { type: "h2", text: "Feedback loops" },
    { type: "ul", items: [
      "Collect explicit feedback (thumbs, comments) and implicit signals (copy, retry, rephrase, escalate).",
      "Sample traces daily for human or judge review, oversampling negative feedback and unusual patterns.",
      "Turn confirmed failures into eval cases, and recurring failure types into prompt, retrieval or tool fixes.",
      "See [LLM evaluation](/learn/llm-evaluation).",
    ] },

    { type: "h2", text: "Incident response" },
    { type: "ol", items: [
      "**Detect:** alerts on quality, safety, cost or latency metrics, or user reports.",
      "**Mitigate:** roll back to the last good version set, switch provider, tighten a guardrail, or disable the feature with a flag.",
      "**Preserve evidence:** keep the traces and version stamps of affected requests.",
      "**Reproduce** with the exact versions and inputs; LLM behaviour varies, so run the case many times.",
      "**Fix and prevent:** add the cases to the eval suite, add a check or control, and release behind a canary.",
      "**Review:** a blameless post-incident review, as for any outage; see [incident management](/learn/incident-management).",
    ] },
  ],
  uses: [
    { name: "Customer-facing assistants", text: "Tracing and canaries catch regressions from prompt edits before most users see them." },
    { name: "Agent platforms", text: "Step-level traces make loops, tool errors and cost spikes debuggable." },
    { name: "Regulated industries", text: "Versioned configurations and retained traces provide an audit trail of what the system did and why." },
  ],
  interview: [
    "Version prompts, models, retrieval and tools together and stamp traces with them.",
    "Trace each request with spans for guards, retrieval, model and tool calls.",
    "Gate releases on evals, canary with abort thresholds, and roll back by config.",
    "Describe an incident runbook for a bad prompt or model change.",
  ],
  related: ["llm-evaluation", "mlops-model-registry", "observability", "llm-gateway", "feature-flags", "incident-management"],
  practice: ["model-monitoring", "deployment-platform"],
  reading: [
    { title: "Semantic conventions for generative AI systems", publisher: "OpenTelemetry", url: "https://opentelemetry.io/docs/specs/semconv/gen-ai/" },
    { title: "AI Engineering: Building Applications with Foundation Models", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/" },
  ],
};
