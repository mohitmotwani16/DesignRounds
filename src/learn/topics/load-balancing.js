export default {
  blocks: [
    { type: "p", text: "A **load balancer** sits between clients and a pool of servers and decides which server handles each request or connection. It works as a **reverse proxy**: clients talk to the balancer as if it were the server, and it forwards each request to a backend chosen by an algorithm. The goal is to use every server well, keep response times low and never overload any single one. It is the component that turns \"one server\" into \"a fleet of interchangeable servers\": it spreads load, hides failed instances, and lets you add or remove capacity without clients noticing." },
    { type: "diagram", kind: "flow", caption: "Clients reach one stable address. The load balancer health-checks the pool and only routes to healthy servers.", nodes: [
      { id: "c1", label: "Web clients", col: 0, row: 0, shape: "pill" },
      { id: "c2", label: "Mobile apps", col: 0, row: 1, shape: "pill" },
      { id: "lb", label: "Load balancer", sub: "api.example.com", col: 1.2, row: 0.5, tone: "accent", w: 150 },
      { id: "s1", label: "App server 1", col: 2.5, row: 0 },
      { id: "s2", label: "App server 2", col: 2.5, row: 1 },
      { id: "s3", label: "App server 3", sub: "failing checks", col: 2.5, row: 2, tone: "danger" },
    ], edges: [
      { from: "c1", to: "lb" }, { from: "c2", to: "lb" },
      { from: "lb", to: "s1", label: "50%" }, { from: "lb", to: "s2", label: "50%" },
      { from: "lb", to: "s3", dashed: true, tone: "danger", label: "removed" },
    ] },

    { type: "h2", text: "Why you need one" },
    { type: "p", text: "Once servers are [stateless](/learn/stateless-vs-stateful), scaling out needs two things: a **load balancer** in front of the servers to decide which one handles each request, and a mechanism to **launch more servers when traffic is high**, remove them when it's low, and replace servers that fail. That mechanism is [autoscaling](/learn/autoscaling); the balancer is the other half." },
    { type: "ul", items: [
      "**Horizontal scaling.** Adding servers only helps if traffic actually reaches them. The load balancer makes a pool of stateless servers behave like one big server. See [scalability](/learn/scalability).",
      "**Availability.** With health checks, a crashed or overloaded instance is taken out of rotation in seconds, so users see a slightly slower site instead of errors. See [availability](/learn/availability).",
      "**Zero-downtime deploys.** You drain an instance (stop sending it new requests, let in-flight ones finish), upgrade it, and put it back. Rolling and canary releases depend on this. See [deployment strategies](/learn/deployment-strategies).",
      "**One stable address.** Clients talk to one hostname. Which machines sit behind it can change every minute.",
    ] },
    { type: "p", text: "Load balancers come as **hardware appliances** (F5, Citrix), **virtual appliances**, or **software** (Nginx, HAProxy, Envoy) and managed cloud services (AWS ALB/NLB, Google Cloud Load Balancing)." },

    { type: "h2", text: "Load balancing algorithms" },
    { type: "h3", text: "Round robin" },
    { type: "p", text: "Requests go to each server in turn: 1, 2, 3, 1, 2, 3… Simple and fair when servers are identical and requests cost about the same." },
    { type: "diagram", kind: "flow", caption: "Round robin: requests 1–6 are handed out in strict rotation.", nodes: [
      { id: "lb", label: "Load balancer", col: 0, row: 1, tone: "accent" },
      { id: "a", label: "Server A", sub: "requests 1, 4", col: 1.4, row: 0 },
      { id: "b", label: "Server B", sub: "requests 2, 5", col: 1.4, row: 1 },
      { id: "c", label: "Server C", sub: "requests 3, 6", col: 1.4, row: 2 },
    ], edges: [{ from: "lb", to: "a", label: "1st" }, { from: "lb", to: "b", label: "2nd" }, { from: "lb", to: "c", label: "3rd" }] },
    { type: "h3", text: "Least connections" },
    { type: "p", text: "Each new request goes to the server with the **fewest active connections**. Better than round robin when requests vary in length, or for long-lived connections such as WebSockets, because a server stuck with slow requests stops receiving new ones." },
    { type: "diagram", kind: "flow", caption: "Least connections: the new request goes to server B, which has the fewest open connections.", nodes: [
      { id: "r", label: "New request", col: 0, row: 1, shape: "pill" },
      { id: "lb", label: "Load balancer", col: 1.1, row: 1, tone: "accent" },
      { id: "a", label: "Server A", sub: "12 connections", col: 2.4, row: 0 },
      { id: "b", label: "Server B", sub: "3 connections", col: 2.4, row: 1, tone: "ok" },
      { id: "c", label: "Server C", sub: "9 connections", col: 2.4, row: 2 },
    ], edges: [{ from: "r", to: "lb" }, { from: "lb", to: "b", tone: "accent" }, { from: "lb", to: "a", dashed: true }, { from: "lb", to: "c", dashed: true }] },
    { type: "h3", text: "Least response time" },
    { type: "p", text: "Requests go to the server that is **answering fastest** right now (usually combined with fewest connections). It adapts automatically when one server is slow because of a noisy neighbor, garbage collection or a bad disk." },
    { type: "diagram", kind: "flow", caption: "Least response time: server C has the lowest recent latency, so it gets the request.", nodes: [
      { id: "lb", label: "Load balancer", col: 0, row: 1, tone: "accent" },
      { id: "a", label: "Server A", sub: "avg 180 ms", col: 1.4, row: 0 },
      { id: "b", label: "Server B", sub: "avg 95 ms", col: 1.4, row: 1 },
      { id: "c", label: "Server C", sub: "avg 40 ms", col: 1.4, row: 2, tone: "ok" },
    ], edges: [{ from: "lb", to: "c", tone: "accent" }, { from: "lb", to: "a", dashed: true }, { from: "lb", to: "b", dashed: true }] },
    { type: "h3", text: "IP hash" },
    { type: "p", text: "The balancer hashes the **client's IP address** to pick a server, so the same client always lands on the same server. Useful for simple affinity, but adding or removing a server reshuffles most clients (consistent hashing reduces that), and many users behind one corporate NAT all hit the same server." },
    { type: "diagram", kind: "flow", caption: "IP hash: hash(client IP) mod 3 always maps this client to server B.", nodes: [
      { id: "cl", label: "Client 203.0.113.7", col: 0, row: 1, shape: "pill" },
      { id: "h", label: "hash(IP) mod 3 = 1", col: 1.4, row: 1, tone: "accent" },
      { id: "a", label: "Server A", col: 2.8, row: 0 },
      { id: "b", label: "Server B", col: 2.8, row: 1, tone: "ok" },
      { id: "c", label: "Server C", col: 2.8, row: 2 },
    ], edges: [{ from: "cl", to: "h" }, { from: "h", to: "b", label: "every time" }] },
    { type: "h3", text: "More variants" },
    { type: "ul", items: [
      "**Weighted round robin**: like round robin, but each server gets traffic in proportion to its capacity. A 16-core server can take twice the share of an 8-core one, or a canary can get 5%.",
      "**URL hash**: like IP hash, but on the request URL. Each server ends up handling a fixed set of URLs, which is great when servers cache content locally: each URL is cached on exactly one server, so the cache hit rate is maximized.",
      "**Power of two choices**: pick two servers at random and send to the less loaded one.",
      "**Consistent hashing**: map keys onto a ring so adding a server moves only a small share of keys. See [consistent hashing](/learn/consistent-hashing).",
    ] },
    { type: "table", head: ["Algorithm", "How it picks a server", "Good for"], rows: [
      ["Round robin", "Each server in turn", "Similar servers and similar, short requests"],
      ["Weighted round robin", "In turn, in proportion to a weight", "Mixed instance sizes; sending 5% to a canary"],
      ["Least connections", "The server with the fewest open connections", "Long or uneven requests, WebSockets"],
      ["Least response time", "Fewest connections and lowest recent latency", "Servers whose speed varies"],
      ["Power of two choices", "Pick two at random, send to the less loaded", "Large pools; avoids herding onto one \"best\" server"],
      ["IP hash / URL hash", "Hash of client IP or URL, mod pool size", "Simple affinity; per-server caches"],
      ["Consistent hashing", "Position of the key on a hash ring", "Caches and stateful shards; minimal remapping"],
    ] },
    { type: "callout", text: "**Power of two choices** is worth knowing. Always sending to the least-loaded server sounds best, but many balancers acting on slightly stale data all pick the same server at once and overload it. Picking the better of two random servers gets almost all of the benefit with none of the herding." },

    { type: "h2", text: "Layer 4 vs layer 7 load balancing" },
    { type: "p", text: "Load balancers differ mainly in **how much of the request they look at**, named after the layers of the OSI networking model. Layer 4 (transport) balancing works on TCP/UDP connections and packets; layer 7 (application) balancing works on whole HTTP requests. Application developers mostly deal with layer 7, because that's where web apps live; layer 4 is more often the concern of network engineers and SREs." },
    { type: "table", head: ["", "Layer 4 (transport)", "Layer 7 (application)"], rows: [
      ["Sees", "IP addresses and ports of TCP/UDP connections", "Full HTTP requests: path, headers, cookies, method"],
      ["Routes by", "Connection (all requests on a connection go to one server)", "Each request: `/api/*` to one pool, `/images/*` to another"],
      ["TLS", "Usually passes encrypted bytes through", "Terminates TLS so it can read the request"],
      ["Speed", "Very fast, millions of connections, little CPU per packet", "More work per request, but still very fast"],
      ["Extras", "Few", "Header rewrites, retries, compression, auth, rate limits"],
      ["Examples", "AWS NLB, Google TCP/UDP LB, IPVS, Maglev", "AWS ALB, Nginx, Envoy, HAProxy (HTTP mode), Cloudflare"],
    ] },
    { type: "p", text: "Most web systems use a **layer 7** load balancer at the edge because routing by path and host is so useful. Layer 4 balancers appear where raw throughput matters or the protocol isn't HTTP: database proxies, game servers, and the tier in front of a fleet of L7 proxies at very large scale." },

    { type: "h2", text: "Health checks" },
    { type: "p", text: "The balancer periodically calls each server, for example `GET /healthz` every 5 seconds, and removes a server after a few consecutive failures (often 2 or 3), then adds it back after a few successes. Two kinds matter:" },
    { type: "ul", items: [
      "**Active checks**: the balancer probes each server on a timer. Simple, but a server can pass the probe while failing real traffic.",
      "**Passive checks (outlier detection)**: the balancer watches real responses and ejects a server that returns too many 5xx errors or times out.",
    ] },
    { type: "p", text: "Keep the health endpoint honest but shallow: it should fail if the process can't serve, not because a shared database is slow, otherwise one database blip removes every server at once. More in [health checks and failover](/learn/health-checks-failover)." },

    { type: "h2", text: "Hands-on: load balancing with Nginx" },
    { type: "p", text: "**Nginx** is an open-source web server, reverse proxy and load balancer, popular because it handles huge numbers of concurrent connections with little memory and CPU. Here is a small demo that spreads traffic across three web servers. You need Python with Flask, and Nginx installed." },
    { type: "diagram", kind: "flow", caption: "The demo: Nginx listens on port 8080 and spreads requests across three Flask servers on ports 8001–8003.", nodes: [
      { id: "c", label: "Browser / curl", col: 0, row: 1, shape: "pill" },
      { id: "n", label: "Nginx", sub: "localhost:8080", col: 1.3, row: 1, tone: "accent" },
      { id: "a", label: "Flask server", sub: ":8001", col: 2.6, row: 0 },
      { id: "b", label: "Flask server", sub: ":8002", col: 2.6, row: 1 },
      { id: "d", label: "Flask server", sub: ":8003", col: 2.6, row: 2 },
    ], edges: [{ from: "c", to: "n" }, { from: "n", to: "a" }, { from: "n", to: "b" }, { from: "n", to: "d" }] },
    { type: "p", text: "**1. A tiny web server** that replies with its own port number:" },
    { type: "code", code: `# demo.py
import sys
from flask import Flask

app = Flask("demo")

@app.route("/")
def hello():
    return f"Hello, {app.config['PORT']}!\\n"

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    app.config["PORT"] = port
    app.run(host="127.0.0.1", port=port)` },
    { type: "p", text: "Start three copies, each in its own terminal:" },
    { type: "code", code: "python demo.py 8001\npython demo.py 8002\npython demo.py 8003" },
    { type: "p", text: "**2. Configure Nginx as the load balancer.** Create `/etc/nginx/conf.d/demo.conf`. The `upstream` block lists the pool; `proxy_pass` sends every request to it." },
    { type: "code", code: `upstream demo {
    server localhost:8001;
    server localhost:8002;
    server localhost:8003;
}

server {
    listen 8080;
    location / {
        proxy_pass http://demo;
    }
}` },
    { type: "p", text: "Reload Nginx with `sudo systemctl restart nginx`, then open `http://localhost:8080/` in a browser or call it a few times from a terminal (this works the same on Debian, Ubuntu or macOS):" },
    { type: "code", code: "$ for i in 1 2 3 4; do curl -s localhost:8080/; done\nHello, 8001!\nHello, 8002!\nHello, 8003!\nHello, 8001!" },
    { type: "p", text: "Nginx uses **round robin** by default, so the replies rotate through the three servers. To try other algorithms, add `least_conn;` or `ip_hash;` as the first line inside the `upstream` block, or give a server a weight with `server localhost:8001 weight=3;`." },
    { type: "p", text: "**3. Watch it survive failures.** Stop the servers on 8002 and 8003 and keep calling port 8080. The site is still up and every reply is `Hello, 8001!`. Two of three servers are down and users notice nothing. That is load balancing's contribution to **high availability**, and it's also how you scale: put more servers behind the balancer." },
    { type: "diagram", kind: "flow", caption: "With two servers crashed, Nginx keeps routing to the one still running, so the site stays up.", nodes: [
      { id: "c", label: "Browser / curl", col: 0, row: 1, shape: "pill" },
      { id: "n", label: "Nginx", sub: "localhost:8080", col: 1.3, row: 1, tone: "accent" },
      { id: "a", label: "Flask server", sub: ":8001 · up", col: 2.6, row: 0, tone: "ok" },
      { id: "b", label: "Flask server", sub: ":8002 · down", col: 2.6, row: 1, tone: "danger" },
      { id: "d", label: "Flask server", sub: ":8003 · down", col: 2.6, row: 2, tone: "danger" },
    ], edges: [{ from: "c", to: "n" }, { from: "n", to: "a", tone: "accent" }, { from: "n", to: "b", dashed: true, tone: "danger" }, { from: "n", to: "d", dashed: true, tone: "danger" }] },
    { type: "p", text: "Open-source Nginx detects failures passively: when a request to a server fails, it retries on the next one and marks the failed server unavailable for a while (`max_fails` and `fail_timeout` control this). Managed balancers and Nginx Plus add active health checks." },

    { type: "h2", text: "Sticky sessions and why to avoid them" },
    { type: "p", text: "**Session affinity** pins a user to one server, usually with a cookie, so in-memory session data stays usable. It works, but it fights everything a load balancer is for: load becomes uneven, and a server failure logs out everyone pinned to it. The better design is **stateless servers** with session state in a shared store like Redis or in a signed token, so any server can handle any request. See [stateless vs stateful](/learn/stateless-vs-stateful)." },

    { type: "h2", text: "Avoiding a single point of failure" },
    { type: "p", text: "A single load balancer would itself be a single point of failure. Real deployments run balancers in pairs or fleets: managed cloud balancers are already redundant across zones, and self-hosted ones use a floating virtual IP (keepalived/VRRP) or anycast so several machines answer on one address. At the very top, **DNS** spreads users across regions, each with its own balancers. See [how DNS works](/learn/dns)." },
    { type: "diagram", kind: "flow", caption: "Load balancing happens at several tiers: DNS across regions, L4 or L7 balancers within a region, and client-side balancing between internal services.", nodes: [
      { id: "dns", label: "GeoDNS", sub: "nearest region", col: 0, row: 0.5, tone: "accent" },
      { id: "lb1", label: "Edge LB", sub: "region A", col: 1.1, row: 0, tone: "accent" },
      { id: "lb2", label: "Edge LB", sub: "region B", col: 1.1, row: 1, tone: "accent" },
      { id: "api", label: "API service", col: 2.2, row: 0 },
      { id: "api2", label: "API service", col: 2.2, row: 1 },
      { id: "svc", label: "Orders service", sub: "client-side LB", col: 3.3, row: 0 },
      { id: "svc2", label: "Orders service", sub: "client-side LB", col: 3.3, row: 1 },
    ], edges: [
      { from: "dns", to: "lb1" }, { from: "dns", to: "lb2" }, { from: "lb1", to: "api" }, { from: "lb2", to: "api2" },
      { from: "api", to: "svc", label: "gRPC" }, { from: "api2", to: "svc2", label: "gRPC" },
    ], zones: [{ label: "Region A", from: [1.1, 0], to: [3.3, 0] }, { label: "Region B", from: [1.1, 1], to: [3.3, 1] }] },
  ],
  uses: [
    { name: "AWS ALB and NLB", text: "ALB is a layer 7 balancer that routes by host and path to target groups; NLB is a layer 4 balancer for millions of TCP/UDP connections with static IPs." },
    { name: "Google Maglev", text: "Google's software layer 4 balancer uses consistent hashing so that each connection keeps going to the same backend even as balancers come and go." },
    { name: "Envoy and service meshes", text: "Each service gets a local proxy that balances its outgoing calls with least-request or ring-hash policies and outlier detection. See [service mesh](/learn/service-mesh)." },
    { name: "Kubernetes Services", text: "A Service spreads traffic across healthy pods using kube-proxy (iptables or IPVS rules), and an Ingress or Gateway adds layer 7 routing on top." },
    { name: "CDN and cache tiers", text: "URL-hash or consistent-hash balancing sends each URL to the same cache node, maximizing hit rates." },
  ],
  interview: [
    "Put a load balancer in front of any stateless tier as soon as you have more than one instance, and say it health-checks instances.",
    "Name the layer and the algorithm: \"an L7 balancer that terminates TLS, routes `/api` and `/static` separately, least connections for the WebSocket tier\".",
    "Make app servers stateless rather than relying on sticky sessions, and say where session state lives instead.",
    "If asked about the balancer failing, mention redundant balancers and DNS or anycast in front of them.",
  ],
  related: ["scalability", "autoscaling", "api-gateway", "consistent-hashing", "health-checks-failover", "stateless-vs-stateful", "dns"],
  practice: ["url-shortener", "chat-system", "service-discovery", "multi-region"],
};
