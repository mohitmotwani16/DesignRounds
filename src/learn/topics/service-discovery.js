export default {
  blocks: [
    { type: "p", text: "**Service discovery** is how a service finds the current, healthy instances of another service it wants to call, without hard-coded addresses. In a dynamic microservices environment instances start and stop constantly: autoscaling adds them, deploys replace them, failures remove them, and their IP addresses change every time. A list typed into a config file can't keep up." },

    { type: "h2", text: "Why it matters" },
    { type: "p", text: "In a monolith, component A calls component B with a function call: they share a process. In microservices they run on different machines, so service A needs B's **IP address and port** to send an HTTP or gRPC request." },
    { type: "p", text: "Hard-coding addresses breaks as soon as services move or scale. Service B runs on `10.0.1.5` today; tomorrow autoscaling launches a new instance on `10.0.1.12`, and service A has no idea it exists. Updating configuration by hand doesn't scale." },
    { type: "p", text: "Discovery fixes this with a **registry**. Every service registers its location when it starts; services ask the registry where their dependencies are; and as instances come and go, the registry updates automatically. A always finds B with no manual work." },

    { type: "h2", text: "How it works" },
    { type: "p", text: "A **service registry** is a database of service locations. When an instance of service B starts, it registers its service name, IP address, port and health-check endpoint. When service A needs B, it asks \"where is service B?\" and the registry returns the available instances, for example `10.0.1.5:8080` and `10.0.1.12:8080`. A picks one and sends the request." },
    { type: "p", text: "The registry keeps the list honest with **health checks**: every 10 seconds it pings each instance's health endpoint, and an instance that fails three checks in a row is removed, so A only ever gets healthy instances. When a new instance starts at `10.0.1.20:8080` it registers immediately, and A's next lookup returns all three, spreading load across them automatically." },
    { type: "diagram", kind: "sequence", caption: "Registration, lookup and health checking: instances register on start, callers look them up, and the registry removes instances that fail health checks.", actors: ["Service B instances", "Service registry", "Service A"], steps: [
      { from: 0, to: 1, label: "register: B @ 10.0.1.5:8080, /health" },
      { from: 0, to: 1, label: "register: B @ 10.0.1.12:8080" },
      { from: 1, to: 0, label: "GET /health every 10 s", dashed: true },
      { from: 2, to: 1, label: "where is service B?" },
      { from: 1, to: 2, label: "[10.0.1.5:8080, 10.0.1.12:8080]", dashed: true },
      { from: 2, to: 0, label: "call one instance" },
      { note: "3 failed checks → instance removed from the list", over: [0, 1] },
    ] },
    { type: "p", text: "Instances get into the registry in one of two ways:" },
    { type: "ul", items: [
      "**Self-registration**: each instance registers on startup, sends heartbeats, and deregisters on shutdown (Eureka, Consul agents).",
      "**Third-party registration**: the platform registers instances for them. Kubernetes tracks pods and updates endpoints automatically; cloud load balancers track target groups.",
    ] },
    { type: "p", text: "The registry must itself be highly available and is often built on a consensus store (Consul and etcd use Raft; see [consensus](/learn/consensus))." },

    { type: "h2", text: "Client-side discovery" },
    { type: "p", text: "The **client** queries the registry, gets the list of service B instances and picks one itself, so the client does the load balancing too. Netflix Eureka works this way: each service keeps a **local cache** of the registry, refreshed every 30 seconds. When A needs B it checks its local cache and chooses an instance, which is fast because no network call to the registry is needed per request." },
    { type: "p", text: "Clients get full control: they can send more traffic to faster instances or pin certain users to certain servers for cache locality. The cost is complexity: every client, in every language, needs discovery and load-balancing logic." },
    { type: "h2", text: "Server-side discovery" },
    { type: "p", text: "The client calls a **load balancer** at a fixed address, say `loadbalancer.example.com`. The load balancer looks up the instances in the registry and forwards the request to a suitable one. Kubernetes uses this pattern: a Service object acts as the load balancer, clients call the service by name, Kubernetes DNS resolves the name to the service's virtual IP, and traffic is forwarded to healthy pods." },
    { type: "p", text: "Clients stay simple: they always call one stable address. But the load balancer is an extra hop and can become a bottleneck or single point of failure unless it is itself redundant." },
    { type: "diagram", kind: "flow", caption: "Client-side: the caller queries the registry and picks an instance itself. Server-side: the caller hits a stable load balancer address, which knows the instances.", nodes: [
      { id: "c1", label: "Orders service", sub: "client-side LB", col: 0, row: 0, w: 150 },
      { id: "reg", label: "Registry", sub: "payments → [3 IPs]", col: 1.3, row: 0, shape: "db", tone: "accent", w: 160 },
      { id: "p1", label: "Payments #1", col: 2.6, row: 0 },
      { id: "c2", label: "Orders service", col: 0, row: 1.5, w: 150 },
      { id: "lb", label: "payments.internal", sub: "load balancer", col: 1.3, row: 1.5, tone: "accent", w: 160 },
      { id: "p2", label: "Payments #2", col: 2.6, row: 1.5 },
    ], edges: [
      { from: "c1", to: "reg", label: "lookup" }, { from: "c1", to: "p1", label: "call", bend: -45 },
      { from: "c2", to: "lb", label: "call" }, { from: "lb", to: "p2" },
    ], zones: [{ label: "Client-side discovery", from: [0, 0], to: [2.6, 0], tone: "accent" }, { label: "Server-side discovery", from: [0, 1.5], to: [2.6, 1.5] }] },
    { type: "table", head: ["", "Client-side", "Server-side"], rows: [
      ["Who picks the instance", "The calling service (a library)", "A load balancer or proxy"],
      ["Extra hop", "No", "Yes"],
      ["Smart balancing (least requests, zone-aware, cache affinity)", "Easy in the client", "In the load balancer"],
      ["Language support", "Library needed per language", "Language-agnostic"],
      ["Risk", "Complex clients", "The load balancer can bottleneck or fail"],
      ["Examples", "Netflix Eureka + Ribbon, gRPC xDS clients", "AWS internal ALB, Kubernetes Service, Consul + proxy"],
    ] },
    { type: "p", text: "A [service mesh](/learn/service-mesh) combines the two: a local sidecar proxy does client-side load balancing on behalf of an application that simply calls `payments:8080`." },

    { type: "h2", text: "Platform-provided discovery" },
    { type: "p", text: "Orchestration platforms such as Kubernetes and Cloud Foundry build discovery in. Deploy a service named `inventory` and Kubernetes creates a DNS entry; other services call `inventory.default.svc.cluster.local` and Kubernetes routes the request to a healthy pod. There's no separate registry to run and discovery is automatic, but it ties you to the platform: move off Kubernetes and you need a different mechanism." },
    { type: "p", text: "Plain **DNS-based discovery** works with every language and tool, but DNS caching and TTLs mean clients can hold stale addresses for a while, and DNS doesn't carry health or load information. See [DNS](/learn/dns)." },

    { type: "h2", text: "Registry implementations" },
    { type: "table", head: ["Registry", "How it works"], rows: [
      ["Consul", "A standalone registry with health checking and a key-value store for configuration. Services register through an HTTP API, Consul runs TCP or HTTP health checks, and clients query it over DNS or HTTP."],
      ["ZooKeeper", "Keeps a tree of nodes. Each instance creates an **ephemeral node** when it starts; if the instance crashes, its session ends and ZooKeeper deletes the node automatically. Clients **watch** for changes and update their routing tables."],
      ["etcd", "A consistent key-value store (used by Kubernetes) where instances write entries with leases that expire if not renewed."],
      ["Netflix Eureka", "A self-registration registry used with client-side load balancing and local caching."],
      ["Managed cloud", "AWS Cloud Map (works with EC2 and ECS) and Google Cloud Service Directory (works with GKE and Compute Engine) handle registration and health checks for platform services automatically."],
    ] },

    { type: "h2", text: "Health checks" },
    { type: "p", text: "Health checks make sure the registry only returns working instances. There are three kinds, and good systems use all of them:" },
    { type: "ul", items: [
      "**Basic (liveness) checks** ping an HTTP endpoint: `200 OK` means healthy; a timeout or error means unhealthy.",
      "**Deep checks** also verify the instance's own dependencies. The inventory service checks its database connection and returns `503 Service Unavailable` if it can't reach it, so the registry marks it unhealthy even though the process is still running. (Be careful: if a shared dependency fails, deep checks can mark every instance unhealthy at once. See [health checks and failover](/learn/health-checks-failover).)",
      "**Passive checks** watch real traffic. A load balancer tracks success rates and marks an instance unhealthy if, say, 10% of its requests fail. This catches problems that periodic probes miss.",
    ] },

    { type: "h2", text: "Practical concerns" },
    { type: "ul", items: [
      "**Stale entries**: a crashed instance stays registered until its heartbeat or TTL expires, so clients still need timeouts and retries against another instance.",
      "**Registry outages**: clients should cache the last known instance list and keep working if the registry is briefly unavailable.",
      "**Zone awareness**: prefer instances in the same availability zone to cut latency and cross-zone data costs, falling back to other zones.",
      "**Graceful shutdown**: deregister (or fail readiness) before stopping, so no new requests arrive.",
    ] },
    { type: "p", text: "Service discovery is essential infrastructure for microservices. Together with health checks and load balancing, it sends traffic only to healthy instances and adapts automatically as services scale and deploy." },
  ],
  uses: [
    { name: "Kubernetes", text: "Services and EndpointSlices track ready pods; kube-proxy and CoreDNS give every service a stable name and virtual IP." },
    { name: "HashiCorp Consul", text: "A registry with health checks, DNS and HTTP interfaces, and multi-data-center support, often paired with Envoy." },
    { name: "Netflix Eureka", text: "A self-registration registry used with client-side load balancing in Netflix's service architecture." },
    { name: "AWS Cloud Map and ECS", text: "Register tasks automatically and expose them via DNS or API lookups." },
  ],
  interview: [
    "Mention how services find each other: Kubernetes DNS, a registry like Consul, or internal load balancers.",
    "Explain client-side vs server-side discovery and when a service mesh fits.",
    "Tie registry entries to health checks (basic, deep, passive) and handle stale entries with timeouts and retries.",
    "Note caching the instance list so discovery outages don't stop traffic.",
  ],
  related: ["load-balancing", "health-checks-failover", "service-mesh", "dns", "monolith-vs-microservices", "consensus"],
  practice: ["service-discovery", "service-platform", "config-control-plane"],
};
