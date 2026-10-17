export default {
  blocks: [
    { type: "p", text: "A **load balancer** sits between clients and a pool of servers and decides which server handles each request or connection. It is the component that turns \"one server\" into \"a fleet of interchangeable servers\": it spreads load, hides failed instances, and lets you add or remove capacity without clients noticing." },
    { type: "diagram", kind: "flow", caption: "Clients reach one stable address. The load balancer health-checks the pool and only routes to healthy servers.", nodes: [
      { id: "c1", label: "Web clients", col: 0, row: 0, shape: "pill" },
      { id: "c2", label: "Mobile apps", col: 0, row: 1, shape: "pill" },
      { id: "lb", label: "Load balancer", sub: "api.example.com", col: 1, row: 0.5, tone: "accent", w: 150 },
      { id: "s1", label: "App server 1", col: 2.3, row: 0 },
      { id: "s2", label: "App server 2", col: 2.3, row: 1 },
      { id: "s3", label: "App server 3", sub: "failing checks", col: 2.3, row: 2, tone: "danger" },
    ], edges: [
      { from: "c1", to: "lb" }, { from: "c2", to: "lb" },
      { from: "lb", to: "s1", label: "33%" }, { from: "lb", to: "s2", label: "33%" },
      { from: "lb", to: "s3", dashed: true, tone: "danger", label: "removed" },
    ] },

    { type: "h2", text: "Why you need one" },
    { type: "ul", items: [
      "**Horizontal scaling.** Adding servers only helps if traffic actually reaches them. The load balancer is what makes a pool of stateless servers behave like one big server. See [scalability](/learn/scalability).",
      "**Availability.** With health checks, a crashed or overloaded instance is taken out of rotation in seconds, so users see a slightly slower site instead of errors. See [availability](/learn/availability).",
      "**Zero-downtime deploys.** You drain an instance (stop sending it new requests, let in-flight ones finish), upgrade it, and put it back. Rolling and canary releases depend on this. See [deployment strategies](/learn/deployment-strategies).",
      "**One stable address.** Clients talk to one hostname. Which machines sit behind it can change every minute.",
    ] },

    { type: "h2", text: "Layer 4 vs layer 7 load balancing" },
    { type: "p", text: "Load balancers differ mainly in **how much of the request they look at**, named after the layers of the OSI model." },
    { type: "table", head: ["", "Layer 4 (transport)", "Layer 7 (application)"], rows: [
      ["Sees", "IP addresses and ports of TCP/UDP connections", "Full HTTP requests: path, headers, cookies, method"],
      ["Routes by", "Connection (all requests on a connection go to one server)", "Each request: `/api/*` to one pool, `/images/*` to another"],
      ["TLS", "Usually passes encrypted bytes through", "Terminates TLS so it can read the request"],
      ["Speed", "Very fast, millions of connections, little CPU per packet", "More work per request, but still very fast"],
      ["Extras", "Few", "Header rewrites, retries, compression, auth, rate limits"],
      ["Examples", "AWS NLB, Google TCP/UDP LB, IPVS, Maglev", "AWS ALB, Nginx, Envoy, HAProxy (HTTP mode), Cloudflare"],
    ] },
    { type: "p", text: "Most web systems use a **layer 7** load balancer at the edge because routing by path and host is so useful. Layer 4 balancers appear where raw throughput matters or the protocol isn't HTTP: database proxies, game servers, and the tier in front of a fleet of L7 proxies at very large scale." },

    { type: "h2", text: "Load balancing algorithms" },
    { type: "table", head: ["Algorithm", "How it picks a server", "Good for"], rows: [
      ["Round robin", "Each server in turn", "Similar servers and similar, short requests"],
      ["Weighted round robin", "In turn, in proportion to a weight", "Mixed instance sizes; sending 5% to a canary"],
      ["Least connections", "The server with the fewest open connections", "Long or uneven requests, WebSockets"],
      ["Least response time", "Fewest connections and lowest recent latency", "Servers whose speed varies"],
      ["Power of two choices", "Pick two at random, send to the less loaded", "Large pools; avoids herding onto one \"best\" server"],
      ["IP or key hash", "Hash of client IP or a key mod pool size", "Simple affinity, but reshuffles when the pool changes"],
      ["Consistent hashing", "Position of the key on a hash ring", "Caches and stateful shards; minimal remapping. See [consistent hashing](/learn/consistent-hashing)"],
    ] },
    { type: "callout", text: "**Power of two choices** is worth knowing. Always sending to the least-loaded server sounds best, but many balancers acting on slightly stale data all pick the same server at once and overload it. Picking the better of two random servers gets almost all of the benefit with none of the herding." },

    { type: "h2", text: "Health checks" },
    { type: "p", text: "The balancer periodically calls each server, for example `GET /healthz` every 5 seconds, and removes a server after a few consecutive failures (often 2 or 3), then adds it back after a few successes. Two kinds matter:" },
    { type: "ul", items: [
      "**Active checks**: the balancer probes each server on a timer. Simple, but a server can pass the probe while failing real traffic.",
      "**Passive checks (outlier detection)**: the balancer watches real responses and ejects a server that returns too many 5xx errors or times out.",
    ] },
    { type: "p", text: "Keep the health endpoint honest but shallow: it should fail if the process can't serve, not because a shared database is slow, otherwise one database blip removes every server at once. More in [health checks and failover](/learn/health-checks-failover)." },

    { type: "h2", text: "Sticky sessions and why to avoid them" },
    { type: "p", text: "**Session affinity** pins a user to one server, usually with a cookie, so in-memory session data stays usable. It works, but it fights everything a load balancer is for: load becomes uneven, and a server failure logs out everyone pinned to it. The better design is **stateless servers** with session state in a shared store like Redis or in a signed token, so any server can handle any request." },

    { type: "h2", text: "Avoiding a single point of failure" },
    { type: "p", text: "A single load balancer would itself be a single point of failure. Real deployments run balancers in pairs or fleets: managed cloud balancers are already redundant across zones, self-hosted ones use a floating virtual IP (keepalived/VRRP) or anycast so several machines answer on one address. At the very top, **DNS** spreads users across regions, each with its own balancers. See [how DNS works](/learn/dns)." },
    { type: "diagram", kind: "flow", caption: "Load balancing happens at several tiers: DNS across regions, L4 or L7 balancers within a region, and client-side balancing between internal services.", nodes: [
      { id: "dns", label: "GeoDNS", sub: "nearest region", col: 0, row: 0.5, tone: "accent" },
      { id: "lb1", label: "Edge LB", sub: "region A", col: 1, row: 0, tone: "accent" },
      { id: "lb2", label: "Edge LB", sub: "region B", col: 1, row: 1, tone: "accent" },
      { id: "api", label: "API service", col: 2, row: 0 },
      { id: "api2", label: "API service", col: 2, row: 1 },
      { id: "svc", label: "Orders service", sub: "client-side LB", col: 3, row: 0 },
      { id: "svc2", label: "Orders service", sub: "client-side LB", col: 3, row: 1 },
    ], edges: [
      { from: "dns", to: "lb1" }, { from: "dns", to: "lb2" }, { from: "lb1", to: "api" }, { from: "lb2", to: "api2" },
      { from: "api", to: "svc", label: "gRPC" }, { from: "api2", to: "svc2", label: "gRPC" },
    ], zones: [{ label: "Region A", from: [1, 0], to: [3, 0] }, { label: "Region B", from: [1, 1], to: [3, 1] }] },
  ],
  uses: [
    { name: "AWS ALB and NLB", text: "ALB is a layer 7 balancer that routes by host and path to target groups; NLB is a layer 4 balancer for millions of TCP/UDP connections with static IPs." },
    { name: "Google Maglev", text: "Google's software layer 4 balancer uses consistent hashing so that each connection keeps going to the same backend even as balancers come and go." },
    { name: "Envoy and service meshes", text: "Each service gets a local proxy that balances its outgoing calls with least-request or ring-hash policies and outlier detection. See [service mesh](/learn/service-mesh)." },
    { name: "Kubernetes Services", text: "A Service spreads traffic across healthy pods using kube-proxy (iptables or IPVS rules), and an Ingress or Gateway adds layer 7 routing on top." },
  ],
  interview: [
    "Put a load balancer in front of any stateless tier as soon as you have more than one instance, and say it health-checks instances.",
    "Name the layer: \"an L7 load balancer that terminates TLS and routes `/api` and `/static` separately\" shows more understanding than \"a load balancer\".",
    "Make app servers stateless rather than relying on sticky sessions, and say where session state lives instead.",
    "If asked about the balancer failing, mention redundant balancers and DNS or anycast in front of them.",
  ],
  related: ["scalability", "api-gateway", "consistent-hashing", "health-checks-failover", "dns"],
  practice: ["url-shortener", "chat-system", "service-discovery", "multi-region"],
};
