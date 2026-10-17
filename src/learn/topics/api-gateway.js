export default {
  blocks: [
    { type: "p", text: "A **reverse proxy** is a server that sits in front of your backends and forwards client requests to them. An **API gateway** is a reverse proxy specialised for APIs: it adds authentication, rate limiting, request routing to many services, and sometimes response aggregation. Both give a system **one front door** where cross-cutting concerns are handled once." },

    { type: "h2", text: "Forward proxy vs reverse proxy" },
    { type: "ul", items: [
      "A **forward proxy** acts for **clients**: a company proxy that all employee traffic goes through. The server doesn't know which client is behind it.",
      "A **reverse proxy** acts for **servers**: clients talk to it as if it were the server, and it chooses a backend. The client doesn't know which server answered.",
    ] },

    { type: "h2", text: "What a reverse proxy does" },
    { type: "ul", items: [
      "**TLS termination**: handles HTTPS and certificates in one place. See [encryption](/learn/encryption).",
      "**[Load balancing](/learn/load-balancing)** across backend instances.",
      "**Caching** of responses and static files, and **compression**.",
      "**Security**: hides backend topology, filters malicious requests (often with a WAF), and absorbs slow clients so backends aren't tied up.",
      "**Buffering**: accepts a slow upload or download and talks to the backend at full speed.",
    ] },
    { type: "p", text: "Nginx, HAProxy, Envoy, Caddy and Traefik are common reverse proxies." },

    { type: "h2", text: "What an API gateway adds" },
    { type: "diagram", kind: "flow", caption: "The gateway authenticates, rate limits and routes each request, so individual services don't reimplement these concerns.", nodes: [
      { id: "web", label: "Web", col: 0, row: 0, shape: "pill" },
      { id: "mob", label: "Mobile", col: 0, row: 1, shape: "pill" },
      { id: "p", label: "Partner", col: 0, row: 2, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "auth · limits · routing", col: 1.2, row: 1, tone: "accent", w: 170 },
      { id: "auth", label: "Auth service", sub: "verify token", col: 1.2, row: 2.2, tone: "muted" },
      { id: "s1", label: "/users → Users", col: 2.6, row: 0, w: 150 },
      { id: "s2", label: "/orders → Orders", col: 2.6, row: 1, w: 150 },
      { id: "s3", label: "/search → Search", col: 2.6, row: 2, w: 150 },
    ], edges: [
      { from: "web", to: "gw" }, { from: "mob", to: "gw" }, { from: "p", to: "gw" },
      { from: "gw", to: "auth", dashed: true }, { from: "gw", to: "s1" }, { from: "gw", to: "s2" }, { from: "gw", to: "s3" },
    ] },
    { type: "table", head: ["Concern", "What the gateway does"], rows: [
      ["Authentication", "Validates API keys, sessions or JWTs once, and passes the verified identity to services in a header. See [authentication vs authorization](/learn/authentication-authorization)"],
      ["Rate limiting and quotas", "Per key, per user or per IP limits; returns 429 before overload reaches services. See [rate limiting](/learn/rate-limiting)"],
      ["Routing", "By path, host, header or version: `/v2/orders` to the new service, 5% canary traffic"],
      ["Transformation", "Protocol translation (REST to gRPC), request and response rewriting"],
      ["Aggregation", "Combine several backend calls into one response for a client"],
      ["Observability", "Request logs, metrics and a trace ID injected at the edge. See [observability](/learn/observability)"],
    ] },

    { type: "h2", text: "Backend for frontend (BFF)" },
    { type: "p", text: "Different clients want different shapes of data: a phone screen needs less than a desktop page. A **BFF** is a gateway-like layer per client type (web BFF, mobile BFF) owned by that client's team, which aggregates and tailors backend calls. It keeps a single general-purpose gateway from accumulating every client's special cases." },

    { type: "h2", text: "Pitfalls" },
    { type: "ul", items: [
      "**Too much logic in the gateway.** Business rules in the gateway create a distributed monolith that every team has to change. Keep it to cross-cutting concerns.",
      "**Single point of failure.** Run the gateway as a redundant, horizontally scaled tier across zones.",
      "**Extra hop.** Every request pays a little latency; keep the gateway's own work cheap (cache token verification keys, avoid a remote call per request where possible).",
      "**Gateway vs service mesh.** A gateway handles north-south traffic (clients into the system); a [service mesh](/learn/service-mesh) handles east-west traffic (service to service).",
    ] },
  ],
  uses: [
    { name: "Amazon API Gateway, Kong, Apigee", text: "Managed and self-hosted API gateways providing keys, quotas, auth and routing for public APIs." },
    { name: "Netflix Zuul", text: "Netflix's edge gateway routes billions of requests to backend services and handles auth, insights and resilience at the edge." },
    { name: "Envoy at the edge", text: "Used as a reverse proxy and gateway by many companies, configured dynamically for routing, retries and TLS." },
    { name: "Nginx in front of apps", text: "The classic reverse proxy: TLS termination, static files, compression and load balancing in front of app servers." },
  ],
  interview: [
    "Put a gateway or reverse proxy at the edge and list its jobs: TLS, auth, rate limiting, routing.",
    "Say services trust the identity the gateway passes, so auth isn't repeated in every service.",
    "Keep business logic out of the gateway and make it horizontally scalable.",
    "Mention a BFF if web and mobile clients need very different responses.",
  ],
  related: ["load-balancing", "rate-limiting", "authentication-authorization", "service-mesh", "api-styles", "cdn"],
  practice: ["api-gateway", "rate-limiter", "service-platform"],
};
