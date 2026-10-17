export default {
  blocks: [
    { type: "p", text: "A **service mesh** moves the networking concerns of service-to-service communication (encryption, retries, timeouts, load balancing, traffic shifting and telemetry) out of application code and into a dedicated infrastructure layer. Usually that layer is a **sidecar proxy** deployed next to every service instance, configured centrally by a **control plane**." },

    { type: "h2", text: "How it works" },
    { type: "diagram", kind: "flow", caption: "Each service talks only to its local sidecar. Sidecars handle mTLS, retries and routing between each other, configured by the control plane.", nodes: [
      { id: "a", label: "Orders app", col: 0, row: 0 },
      { id: "pa", label: "Sidecar proxy", sub: "Envoy", col: 1, row: 0, tone: "accent" },
      { id: "pb", label: "Sidecar proxy", sub: "Envoy", col: 2.3, row: 0, tone: "accent" },
      { id: "b", label: "Payments app", col: 3.3, row: 0 },
      { id: "cp", label: "Control plane", sub: "Istio / Linkerd", col: 1.65, row: 1.3, tone: "muted", w: 170 },
    ], edges: [
      { from: "a", to: "pa" }, { from: "pa", to: "pb", label: "mTLS", tone: "accent" }, { from: "pb", to: "b" },
      { from: "cp", to: "pa", dashed: true, label: "config, certs" }, { from: "cp", to: "pb", dashed: true },
    ], zones: [{ label: "Pod A", from: [0, 0], to: [1, 0] }, { label: "Pod B", from: [2.3, 0], to: [3.3, 0] }] },
    { type: "ul", items: [
      "**Data plane**: the proxies (usually Envoy, or Linkerd's Rust proxy) that intercept all inbound and outbound traffic of each service.",
      "**Control plane**: distributes routing rules, policies and certificates to the proxies and collects their telemetry.",
      "Some newer meshes avoid per-pod sidecars (Istio ambient mode, Cilium with eBPF) by using per-node proxies, reducing resource overhead.",
    ] },

    { type: "h2", text: "What a mesh gives you" },
    { type: "table", head: ["Capability", "Without a mesh", "With a mesh"], rows: [
      ["Encryption between services", "TLS configured in every service", "Automatic **mutual TLS** with rotated certificates and service identities"],
      ["Retries, timeouts, circuit breaking", "A library per language, configured per service", "Uniform policies set centrally. See [retries](/learn/retries-and-timeouts)"],
      ["Load balancing", "Client libraries or central load balancers", "Per-request balancing with outlier detection in every proxy"],
      ["Traffic shifting", "Deploy-time changes", "Canary 5% → 50% → 100% by config; header-based routing. See [deployment strategies](/learn/deployment-strategies)"],
      ["Access control", "Custom auth between services", "Policy: \"only orders may call payments\""],
      ["Observability", "Instrument every service", "Golden metrics (rate, errors, latency) and trace spans for every hop. See [observability](/learn/observability)"],
    ] },

    { type: "h2", text: "The costs" },
    { type: "ul", items: [
      "**Latency**: each call passes through two extra proxies, typically adding around a millisecond or less per hop, which compounds in deep call chains.",
      "**Resources**: a sidecar per pod costs CPU and memory across the whole fleet.",
      "**Operational complexity**: the control plane is critical infrastructure; misconfiguration can break all traffic; upgrades must be managed carefully.",
      "**Debugging**: failures can now come from the proxy layer as well as the application.",
    ] },
    { type: "callout", text: "A mesh pays off with many services, many languages, and requirements like mTLS everywhere or fine-grained traffic control. With a handful of services in one language, a good RPC library and an API gateway are usually simpler." },

    { type: "h2", text: "Mesh vs API gateway" },
    { type: "p", text: "An [API gateway](/learn/api-gateway) handles **north-south** traffic: clients entering the system, with concerns like API keys, public rate limits and request aggregation. A mesh handles **east-west** traffic between internal services. Many architectures use both, often with Envoy powering each." },
  ],
  uses: [
    { name: "Istio", text: "The most widely deployed mesh on Kubernetes, built on Envoy, offering mTLS, traffic management and policy; now also in sidecar-less ambient mode." },
    { name: "Linkerd", text: "A lightweight mesh focused on simplicity and low overhead, with automatic mTLS and golden metrics." },
    { name: "Lyft (Envoy's origin)", text: "Lyft built Envoy to handle service-to-service networking uniformly across its polyglot microservices." },
    { name: "Google, Airbnb and banks", text: "Use meshes for zero-trust networking (mTLS everywhere) and gradual traffic shifting during migrations." },
  ],
  interview: [
    "Bring up a mesh when you have many services needing mTLS, consistent retries and traffic shifting.",
    "Explain sidecar proxies and the control plane in a sentence each.",
    "Acknowledge latency and operational costs, and when a library or gateway is enough.",
    "Distinguish east-west (mesh) from north-south (gateway) traffic.",
  ],
  related: ["service-discovery", "api-gateway", "circuit-breaker", "deployment-strategies", "observability", "encryption"],
  practice: ["service-platform", "deployment-platform", "secrets-platform"],
};
