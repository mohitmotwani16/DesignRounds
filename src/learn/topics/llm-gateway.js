export default {
  blocks: [
    { type: "p", text: "Once several teams call several model providers, every service ends up reimplementing retries, keys, rate limits, logging and cost tracking. An **LLM gateway** (or AI gateway) is a single internal entry point for all model calls. It owns **provider credentials**, **routing** between models, **fallbacks** when a provider fails, **token-based rate limits and budgets** per team or tenant, **caching**, and **observability**. It's the [API gateway](/learn/api-gateway) pattern applied to LLM traffic, and a common interview question in its own right." },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "An LLM gateway. Every application calls one internal API; the gateway authenticates, enforces budgets, checks the cache, picks a model, calls the provider with retries and fallback, and records usage and traces.", nodes: [
      { id: "apps", label: "Apps and agents", col: 0, row: 1, shape: "pill" },
      { id: "auth", label: "Auth + quotas", sub: "team · tenant keys", col: 1.3, row: 1, tone: "danger" },
      { id: "cache", label: "Cache", sub: "exact · semantic", col: 2.6, row: 0, shape: "db", tone: "cache" },
      { id: "route", label: "Router", sub: "policy · classifier", col: 2.6, row: 1, tone: "accent" },
      { id: "p1", label: "Provider A", col: 4, row: 0.2 },
      { id: "p2", label: "Provider B", col: 4, row: 1 },
      { id: "p3", label: "Self-hosted model", col: 4, row: 1.8, tone: "store" },
      { id: "meter", label: "Usage + traces", sub: "tokens · cost · latency", col: 2.6, row: 2.3, shape: "db", tone: "store", w: 170 },
    ], edges: [
      { from: "apps", to: "auth" }, { from: "auth", to: "route" }, { from: "route", to: "cache", both: true }, { from: "route", to: "p1" }, { from: "route", to: "p2", dashed: true, label: "fallback" }, { from: "route", to: "p3" }, { from: "route", to: "meter", dashed: true },
    ] },

    { type: "h2", text: "What the gateway owns" },
    { type: "table", head: ["Responsibility", "Details"], rows: [
      ["Unified API", "One request format across providers; applications name a capability or alias (`chat-default`), not a vendor model id"],
      ["Credentials", "Provider keys live only in the gateway; apps get internal keys that can be revoked per team"],
      ["Routing", "Pick a model per request by rules, cost, latency or a learned router"],
      ["Reliability", "Timeouts, retries with backoff on retryable errors, fallback chains, circuit breakers per provider"],
      ["Rate limits and budgets", "Tokens per minute and spend per day per team, tenant and user"],
      ["Caching", "Exact and semantic response caches, and provider prompt-cache-friendly ordering; see [LLM caching](/learn/llm-caching)"],
      ["Guardrails hooks", "Central input and output checks, PII redaction before logging; see [guardrails](/learn/llm-guardrails)"],
      ["Observability", "Traces, token counts, cost attribution, latency percentiles, error rates per model"],
    ] },

    { type: "h2", text: "Routing strategies" },
    { type: "ul", items: [
      "**Static rules:** the caller's alias maps to a model; per-tenant overrides for compliance (EU tenants to an EU-region endpoint).",
      "**Cost-based cascade:** try a small model first; escalate to a larger one if a confidence check or validator fails.",
      "**Classifier router:** a fast classifier (or embedding similarity to labelled examples) predicts whether a request needs the strong model.",
      "**Latency-aware:** route away from a provider whose p95 is spiking.",
      "**Canary routing:** send a percentage of traffic to a new model or prompt version for evaluation; see [LLMOps](/learn/llmops-observability).",
    ] },

    { type: "h2", text: "Fallbacks and retries" },
    { type: "code", code: `route "support-chat":
  primary : provider_a / medium-model       timeout 20 s (streaming: 3 s to first token)
  retry   : same model, 2 attempts, exponential backoff + jitter
            only on 429, 5xx, timeouts (never on 400 validation errors)
  fallback: provider_b / comparable-model   prompt variant tuned for it
  last    : small self-hosted model with a "limited mode" notice
  breaker : open provider_a for 30 s after 50% errors over 20 s window` },
    { type: "ul", items: [
      "Fallback models behave differently; keep prompt variants per model and evaluate the fallback path like a release.",
      "Streaming complicates retries: once tokens have reached the user you can't silently switch models mid-answer; fall back only before the first token, or restart visibly.",
      "Alert when both primary and fallback fail; that's usually a systemic problem (bad request shape, expired key), not a provider outage. See [retries and timeouts](/learn/retries-and-timeouts) and [circuit breakers](/learn/circuit-breaker).",
    ] },

    { type: "h2", text: "Token-based rate limiting and budgets" },
    { type: "p", text: "Request counts are a poor limit for LLMs: one request can be 100 tokens or 100,000. Limit **tokens per minute** and **spend per period**, at several levels (organisation, team, tenant, end user)." },
    { type: "ul", items: [
      "Estimate input tokens before the call and reserve them from a [token bucket](/learn/rate-limiting); reconcile with actual usage (including output) afterwards.",
      "Keep counters in a fast shared store (for example Redis) with atomic updates; tolerate small overshoot for latency.",
      "Return clear errors with retry-after hints; let critical traffic draw from a reserved pool.",
      "Respect provider-side limits too: the gateway smooths bursts across your fleet so one team can't exhaust the shared provider quota.",
    ] },

    { type: "h2", text: "Scale and latency" },
    { type: "code", code: `Traffic     : 3,000 LLM requests/s at peak across 40 services
Gateway hop : auth + quota + cache lookup ≈ 5-15 ms, small next to 1-10 s model calls
Connections : long-lived streaming responses → many concurrent open connections
              (3,000 req/s × ~8 s average = ~24K concurrent streams); use async I/O
Metering    : write usage events to a queue, aggregate asynchronously for billing
              and dashboards, so metering never blocks the request path` },
    { type: "p", text: "The gateway is now a critical dependency: run it stateless and horizontally scaled across zones, keep its own dependencies (quota store, cache) fast and fail-open where safe, and give it a bypass plan for emergencies." },
  ],
  uses: [
    { name: "Platform teams", text: "One gateway gives every product team model access with central keys, budgets and cost reports." },
    { name: "Multi-tenant SaaS", text: "Per-customer token budgets, data-residency routing and usage-based billing." },
    { name: "Reliability", text: "Automatic failover between providers keeps AI features up during a single provider's outage." },
  ],
  interview: [
    "List what the gateway owns: credentials, routing, fallback, quotas, caching, observability.",
    "Describe a fallback chain with retry rules and per-model prompts.",
    "Rate-limit by tokens and spend, at several levels.",
    "Address streaming connections and keep metering off the hot path.",
  ],
  related: ["api-gateway", "llm-caching", "llm-cost-optimization", "rate-limiting", "llmops-observability", "choosing-an-llm"],
  practice: ["llm-gateway", "model-serving", "rate-limiter"],
  reading: [
    { title: "RouteLLM: Learning to Route LLMs with Preference Data", publisher: "Ong et al., 2024", url: "https://arxiv.org/abs/2406.18665" },
    { title: "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance", publisher: "Chen et al., Stanford, 2023", url: "https://arxiv.org/abs/2305.05176" },
  ],
};
