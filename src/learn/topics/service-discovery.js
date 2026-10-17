export default {
  blocks: [
    { type: "p", text: "In a dynamic environment, service instances come and go constantly: autoscaling adds them, deploys replace them, failures remove them, and their IP addresses change every time. **Service discovery** is how a client finds the current, healthy instances of the service it wants to call, without hard-coded addresses." },

    { type: "h2", text: "The service registry" },
    { type: "p", text: "At the heart of discovery is a **registry**: a database of service names mapped to instance addresses and health. Instances get into it in one of two ways:" },
    { type: "ul", items: [
      "**Self-registration**: each instance registers on startup, sends heartbeats, and deregisters on shutdown (Eureka, Consul agents).",
      "**Third-party registration**: the platform registers instances for them. Kubernetes tracks pods and updates Endpoints automatically; cloud load balancers track target groups.",
    ] },
    { type: "p", text: "The registry must itself be highly available and is often built on a consensus store (Consul and etcd use Raft; see [consensus](/learn/consensus)). Entries are tied to **health checks** or leases so dead instances disappear. See [health checks](/learn/health-checks-failover)." },

    { type: "h2", text: "Client-side vs server-side discovery" },
    { type: "diagram", kind: "flow", caption: "Client-side: the caller queries the registry and picks an instance itself. Server-side: the caller hits a stable load balancer address, which knows the instances.", nodes: [
      { id: "c1", label: "Orders service", sub: "client-side LB", col: 0, row: 0, w: 150 },
      { id: "reg", label: "Registry", sub: "payments → [3 IPs]", col: 1.2, row: 0, shape: "db", tone: "accent", w: 160 },
      { id: "p1", label: "Payments #1", col: 2.5, row: 0 },
      { id: "c2", label: "Orders service", col: 0, row: 1.5, w: 150 },
      { id: "lb", label: "payments.internal", sub: "load balancer", col: 1.2, row: 1.5, tone: "accent", w: 160 },
      { id: "p2", label: "Payments #2", col: 2.5, row: 1.5 },
    ], edges: [
      { from: "c1", to: "reg", label: "lookup" }, { from: "c1", to: "p1", label: "call", bend: -45 },
      { from: "c2", to: "lb", label: "call" }, { from: "lb", to: "p2" },
    ], zones: [{ label: "Client-side discovery", from: [0, 0], to: [2.5, 0], tone: "accent" }, { label: "Server-side discovery", from: [0, 1.5], to: [2.5, 1.5] }] },
    { type: "table", head: ["", "Client-side", "Server-side"], rows: [
      ["Who picks the instance", "The calling service (a library)", "A load balancer or proxy"],
      ["Extra hop", "No", "Yes"],
      ["Smart balancing (least requests, zone-aware)", "Easy in the client", "In the load balancer"],
      ["Language support", "Library needed per language", "Language-agnostic"],
      ["Examples", "Netflix Eureka + Ribbon, gRPC xDS clients", "AWS internal ALB, Kubernetes Service, Consul + proxy"],
    ] },
    { type: "p", text: "A [service mesh](/learn/service-mesh) combines the two: a local sidecar proxy does client-side load balancing on behalf of an application that simply calls `payments:8080`." },

    { type: "h2", text: "DNS-based discovery" },
    { type: "p", text: "The simplest universal approach: each service gets a DNS name that resolves to its instances (or to a virtual IP in front of them). Kubernetes does this with CoreDNS: `payments.prod.svc.cluster.local`. It works with every language and tool, but DNS caching and TTLs mean clients can hold stale addresses for a while, and plain DNS doesn't carry health or load information. See [DNS](/learn/dns)." },

    { type: "h2", text: "Practical concerns" },
    { type: "ul", items: [
      "**Stale entries**: a crashed instance stays registered until its heartbeat or TTL expires; clients still need timeouts and retries against another instance.",
      "**Registry outages**: clients should cache the last known instance list and keep working if the registry is briefly unavailable.",
      "**Zone awareness**: prefer instances in the same availability zone to cut latency and cross-zone data costs, falling back to other zones.",
      "**Graceful shutdown**: deregister (or fail readiness) before stopping, so no new requests arrive.",
    ] },
  ],
  uses: [
    { name: "Kubernetes", text: "Services and EndpointSlices track ready pods; kube-proxy and CoreDNS give every service a stable name and virtual IP." },
    { name: "HashiCorp Consul", text: "A registry with health checks, DNS and HTTP interfaces, and multi-data-centre support, often paired with Envoy." },
    { name: "Netflix Eureka", text: "A self-registration registry used with client-side load balancing in Netflix's service architecture." },
    { name: "AWS Cloud Map and ECS", text: "Register tasks automatically and expose them via DNS or API lookups." },
  ],
  interview: [
    "Mention how services find each other: Kubernetes DNS, a registry like Consul, or internal load balancers.",
    "Explain client-side vs server-side discovery and when a service mesh fits.",
    "Tie registry entries to health checks and handle stale entries with timeouts and retries.",
    "Note caching the instance list so discovery outages don't stop traffic.",
  ],
  related: ["load-balancing", "service-mesh", "dns", "health-checks-failover", "monolith-vs-microservices", "gossip-protocol"],
  practice: ["service-discovery", "service-platform", "config-control-plane"],
};
