export default {
  blocks: [
    { type: "p", text: "**Observability** is the ability to understand what a running system is doing, and why, from the data it emits. It rests on three kinds of telemetry: **metrics** (numbers over time), **logs** (records of events) and **traces** (the path of one request through many services). Good observability is what turns a 3-hour outage into a 10-minute one." },

    { type: "h2", text: "The three pillars" },
    { type: "table", head: ["", "Metrics", "Logs", "Traces"], rows: [
      ["What", "Numeric measurements aggregated over time: request rate, error rate, latency percentiles, CPU", "Timestamped records of discrete events, ideally structured (JSON)", "A tree of timed spans showing one request's journey across services"],
      ["Answers", "Is something wrong? How much? Since when?", "What exactly happened in this case?", "Where in the call chain did time go or the error start?"],
      ["Cost profile", "Cheap per series; watch cardinality", "Expensive at volume; sample or tier", "Usually sampled (e.g. 1–10%, plus all errors)"],
      ["Tools", "Prometheus, Datadog, CloudWatch, Grafana", "ELK / OpenSearch, Loki, Splunk", "Jaeger, Tempo, Zipkin, Honeycomb, Datadog APM"],
    ] },

    { type: "h2", text: "Distributed tracing" },
    { type: "p", text: "In a microservice system, one user request may touch ten services. A **trace ID** generated at the edge is passed along on every call (the W3C `traceparent` header); each service records **spans** with start time, duration and attributes. The resulting trace shows exactly which hop was slow or failed." },
    { type: "diagram", kind: "flow", caption: "One trace ID follows the request through every hop; each span records its duration, so the slow database query stands out immediately.", nodes: [
      { id: "gw", label: "Gateway", sub: "span 412 ms", col: 0, row: 1, tone: "accent" },
      { id: "api", label: "Checkout API", sub: "span 398 ms", col: 1, row: 1 },
      { id: "cart", label: "Cart service", sub: "span 22 ms", col: 2, row: 0 },
      { id: "pay", label: "Payments", sub: "span 361 ms", col: 2, row: 2, tone: "cache" },
      { id: "db", label: "Payments DB", sub: "span 340 ms ⚠", col: 3, row: 2, shape: "db", tone: "danger" },
    ], edges: [
      { from: "gw", to: "api", label: "a91f" }, { from: "api", to: "cart" }, { from: "api", to: "pay" }, { from: "pay", to: "db" },
    ] },
    { type: "p", text: "**OpenTelemetry** has become the standard for producing traces, metrics and logs in a vendor-neutral way, with automatic instrumentation for common frameworks." },

    { type: "h2", text: "What to measure: RED and USE" },
    { type: "ul", items: [
      "**RED** for every request-driven service: **R**ate (requests per second), **E**rrors (failed requests), **D**uration (latency percentiles: p50, p95, p99). See [latency vs throughput](/learn/latency-vs-throughput).",
      "**USE** for every resource (CPU, memory, disks, connection pools, queues): **U**tilisation, **S**aturation (queued work), **E**rrors.",
      "**Business metrics**: orders per minute, sign-ups, payment success rate. These catch problems that technical metrics miss.",
    ] },

    { type: "h2", text: "Logging well" },
    { type: "ul", items: [
      "Use **structured logs** (key-value or JSON) so they can be filtered and aggregated, not free text.",
      "Include the **trace ID** and request ID in every log line, so you can jump from a trace to its logs.",
      "Use levels deliberately; log **decisions and failures**, not every line of execution.",
      "Never log secrets, passwords, tokens or full payment data; redact personal data.",
      "Control cost with sampling for high-volume debug logs and retention tiers (hot for days, archived for months).",
    ] },

    { type: "h2", text: "Cardinality" },
    { type: "p", text: "Every unique combination of metric labels creates a separate time series. Labels like `status_code` or `region` are fine; labels like `user_id` or `request_id` explode into millions of series and can overwhelm a metrics system. High-cardinality detail belongs in logs and traces, not metric labels. See [time-series databases](/learn/time-series-databases)." },

    { type: "h2", text: "Alerting" },
    { type: "ul", items: [
      "**Alert on symptoms users feel** (error rate, latency, failed checkouts), not on every cause (CPU at 80%). Causes go on dashboards.",
      "Tie alerts to **SLOs** and use **burn-rate alerts**: page when the error budget is being consumed fast enough to exhaust it soon. See [availability and SLOs](/learn/availability).",
      "Every page should be **actionable** and link to a runbook; noisy alerts train people to ignore them.",
    ] },
  ],
  uses: [
    { name: "Google SRE practices", text: "The four golden signals (latency, traffic, errors, saturation) and SLO-based alerting are widely adopted industry practice." },
    { name: "Uber (Jaeger) and Twitter (Zipkin)", text: "Built open-source distributed tracing systems to debug requests spanning hundreds of microservices." },
    { name: "Kubernetes platforms", text: "Typically run Prometheus and Grafana for metrics, Loki or OpenSearch for logs, and Tempo or Jaeger for traces, all fed by OpenTelemetry." },
    { name: "Honeycomb and observability tools", text: "Popularised querying high-cardinality event data to answer questions nobody anticipated in advance." },
  ],
  interview: [
    "Mention metrics, logs and traces, with a trace ID propagated from the edge through every service.",
    "List the key metrics for your design (RED per service, queue depth and consumer lag, cache hit ratio).",
    "Alert on user-facing symptoms and SLO burn rates, not raw resource usage.",
    "Keep high-cardinality identifiers out of metric labels.",
  ],
  related: ["availability", "time-series-databases", "latency-vs-throughput", "service-mesh", "deployment-strategies", "health-checks-failover"],
  practice: ["metrics-platform", "model-monitoring", "data-quality", "service-platform"],
};
