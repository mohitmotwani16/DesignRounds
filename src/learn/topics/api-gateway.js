export default {
  blocks: [
    { type: "p", text: "An **API gateway** is the single entry point into a microservices system. It sits between clients and backend services, receives every request and routes it to the right service, while handling the concerns every service would otherwise repeat: authentication, rate limiting, monitoring and more. Think of it as a **reverse proxy with extra features built for API management**. A plain **reverse proxy** (Nginx, HAProxy) does the forwarding, TLS and load balancing; the gateway adds the API-specific layer on top." },
    { type: "diagram", kind: "flow", caption: "The API gateway is the single front door: every client calls it, and it authenticates, rate limits and routes each request to the right service.", nodes: [
      { id: "web", label: "Web", col: 0, row: 0, shape: "pill" },
      { id: "mob", label: "Mobile", col: 0, row: 1, shape: "pill" },
      { id: "p", label: "Partner", col: 0, row: 2, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "auth · limits · routing", col: 1.3, row: 1, tone: "accent", w: 170 },
      { id: "auth", label: "Auth service", sub: "verify token", col: 1.3, row: 2.3, tone: "muted" },
      { id: "s1", label: "/users → User service", col: 2.8, row: 0, w: 190 },
      { id: "s2", label: "/orders → Order service", col: 2.8, row: 1, w: 190 },
      { id: "s3", label: "/payments → Payment service", col: 2.8, row: 2, w: 190 },
    ], edges: [
      { from: "web", to: "gw" }, { from: "mob", to: "gw" }, { from: "p", to: "gw" },
      { from: "gw", to: "auth", dashed: true }, { from: "gw", to: "s1" }, { from: "gw", to: "s2" }, { from: "gw", to: "s3" },
    ] },

    { type: "h2", text: "The problem it solves" },
    { type: "p", text: "Picture a mobile app talking directly to 12 microservices: users, orders, payments, inventory, notifications and more. Without a gateway:" },
    { type: "ul", items: [
      "**The client knows too much.** It must know every service's address and handle different protocols and data formats. The app juggles 12 endpoints, 12 authentication schemes and 12 retry strategies, and every backend change risks breaking it.",
      "**Screens are slow.** Loading the home screen means calling users, products, recommendations, cart and notifications. Five sequential HTTP calls from a phone add up to around 500 ms.",
      "**Nothing protects the services.** A malicious client sends 10,000 requests a second to the order service, which has no rate limiting. It crashes, and real customers can't place orders.",
      "**Cross-cutting work is duplicated.** Every service implements its own authentication, authorization, rate limiting, logging and monitoring.",
    ] },
    { type: "p", text: "That is tight coupling between clients and services: the system becomes hard to maintain and hard to change. The gateway fixes it by giving clients **one endpoint**. It routes each request, authenticates uniformly, enforces rate limits and can combine several backend calls into one." },

    { type: "h2", text: "Key features" },
    { type: "h3", text: "1. Request routing" },
    { type: "p", text: "The gateway sends each request to the right backend based on the URL path, HTTP method, headers or query parameters. Routing by version or header also enables gradual rollouts, for example sending `/v2/orders` to a new service or 5% of traffic to a canary." },
    { type: "code", code: "GET  /api/users/123   → User service\nGET  /api/orders/456  → Order service\nPOST /api/payments    → Payment service" },
    { type: "h3", text: "2. Load balancing" },
    { type: "p", text: "Gateways spread requests over the instances of each service. With three order-service instances, requests go round-robin: instance 1, 2, 3, 1… See [load balancing](/learn/load-balancing) for the algorithms." },
    { type: "h3", text: "3. Authentication and authorization" },
    { type: "p", text: "Doing this once, at the edge, means no service has to reimplement it. This is where a gateway earns its place in most designs." },
    { type: "ul", items: [
      "**Authentication**: verify the caller's identity (JWTs, API keys, OAuth tokens) before forwarding, then pass the verified identity to services in a header. See [authentication](/learn/authentication-authorization).",
      "**Authorization**: check the caller may use this API at all (for example, does the token have the right scope?). Fine-grained, per-object checks still belong in the service that owns the data. See [authorization](/learn/authorization-rbac-abac-oauth).",
    ] },
    { type: "h3", text: "4. Rate limiting and throttling" },
    { type: "p", text: "Protect backends from overload and abuse by rejecting excess traffic with `429 Too Many Requests` before it reaches them. See [rate limiting](/learn/rate-limiting)." },
    { type: "code", code: "Per user:            100 requests / minute\nPer IP:              1,000 requests / hour\nPer service (search): 10,000 requests / hour" },
    { type: "h3", text: "5. Protocol translation" },
    { type: "p", text: "Convert between protocols and formats: HTTP to gRPC, REST to GraphQL, JSON to XML, and long-lived WebSocket connections. A common case: backend services talk to each other over fast, typed gRPC, but clients want a plain REST API." },
    { type: "diagram", kind: "sequence", caption: "HTTP-to-gRPC translation: the client speaks REST and JSON; the gateway calls the gRPC backend and converts the reply.", actors: ["Client", "API gateway", "User service (gRPC)"], steps: [
      { from: 0, to: 1, label: "GET /api/users/456" },
      { from: 1, to: 2, label: "UserService.GetUser(id=456)" },
      { from: 2, to: 1, label: "User protobuf message", dashed: true },
      { from: 1, to: 0, label: "200 {\"id\":456,\"name\":\"John Doe\",…}", dashed: true },
    ] },
    { type: "p", text: "Backend teams get efficient gRPC internally, clients get a familiar REST API, and each team can pick the best protocol without affecting anyone else. See [REST vs gRPC vs GraphQL](/learn/api-styles)." },
    { type: "h3", text: "6. Request and response transformation" },
    { type: "p", text: "The gateway can rewrite requests and responses in flight, translating between what clients send and expect and what services need and return: adding headers, reshaping responses, combining data from several services, and stripping sensitive fields." },
    { type: "code", code: `// Client request
GET /api/users/123

// The gateway forwards it with internal headers added
{
  url: "/internal/users/123",
  headers: {
    "Authorization": "Bearer internal-service-token",
    "X-Request-ID": "req-12345",          // for tracing
    "X-User-Role": "customer"             // taken from the client's verified JWT
  }
}

// What the backend returns
{ "id": 123, "name": "John Doe", "email": "john@example.com",
  "internalId": "EMP-567890", "salary": 95000, "ssn": "123-45-6789", "role": "customer" }

// What the gateway returns to the client (sensitive fields removed)
{ "id": 123, "name": "John Doe", "email": "john@example.com", "role": "customer" }` },
    { type: "p", text: "This adds authentication without touching backend code, keeps internal and sensitive data (salaries, SSNs, internal IDs) from leaking, injects metadata for tracing and monitoring, and standardizes response formats across services. In a well-run system services shouldn't return sensitive fields in the first place, but the gateway is a useful second line of defense." },
    { type: "h3", text: "7. Request aggregation" },
    { type: "p", text: "The app sends one request, `GET /home`. The gateway calls the user, product and cart services **in parallel**, merges their responses into one JSON payload and returns it. One round trip from the phone replaces three or five, which matters most on slow mobile networks. This is a [fan-out/fan-in](/learn/fan-out) at the edge." },
    { type: "diagram", kind: "flow", caption: "Aggregation: one client request fans out to several services in parallel and comes back as a single response.", nodes: [
      { id: "app", label: "Mobile app", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "GET /home", col: 1.3, row: 1, tone: "accent" },
      { id: "u", label: "User service", col: 2.6, row: 0 },
      { id: "p", label: "Product service", col: 2.6, row: 1 },
      { id: "c", label: "Cart service", col: 2.6, row: 2 },
    ], edges: [{ from: "app", to: "gw", label: "1 request", both: true }, { from: "gw", to: "u", both: true }, { from: "gw", to: "p", both: true }, { from: "gw", to: "c", both: true }] },
    { type: "h3", text: "8. Caching" },
    { type: "p", text: "Cache responses that change rarely, for example product details for 5 minutes, so repeated requests never reach the backend. See [caching](/learn/caching)." },
    { type: "h3", text: "9. Monitoring and analytics" },
    { type: "p", text: "Since all traffic passes through it, the gateway is the natural place to record request logs, response times, error rates and usage per client, and to inject a trace ID at the edge. That makes monitoring and debugging much simpler. See [observability](/learn/observability)." },

    { type: "h2", text: "Reverse proxy vs API gateway" },
    { type: "ul", items: [
      "A **forward proxy** acts for **clients**: a company proxy that all employee traffic goes through. The server doesn't know which client is behind it.",
      "A **reverse proxy** acts for **servers**: clients talk to it as if it were the server, and it chooses a backend. It handles TLS termination, [load balancing](/learn/load-balancing), caching and compression, buffering of slow clients, and hides the backend topology (often with a web application firewall).",
      "An **API gateway** is a reverse proxy plus API management: authentication, per-client rate limits and quotas, routing to many services, protocol translation, transformation and aggregation.",
    ] },

    { type: "h2", text: "Popular API gateways" },
    { type: "table", head: ["Type", "Product", "Strengths"], rows: [
      ["Managed cloud", "AWS API Gateway", "Fully managed and autoscaling; integrates with Lambda and DynamoDB; built-in auth, throttling and caching. A natural fit for serverless and AWS-centric systems."],
      ["Managed cloud", "Google Cloud Endpoints / Apigee", "Integrated with Google Cloud; Apigee adds full API product management."],
      ["Managed cloud", "Azure API Management", "Enterprise features, developer portal and analytics."],
      ["Open source", "Kong", "Built on Nginx with a plugin system for custom auth, rate limiting and transformations; good for flexible self-hosted setups."],
      ["Open source", "Netflix Zuul", "Netflix's edge gateway, integrated with Spring Cloud."],
      ["Open source", "Traefik", "Cloud-native, discovers services automatically."],
      ["Open source", "Envoy", "High-performance proxy with advanced load balancing; the base of many gateways and service meshes."],
      ["Self-hosted", "Nginx Plus", "Reverse proxy with gateway features; high throughput, low latency, fine control of routing and caching."],
      ["Self-hosted", "HAProxy", "Focused on high availability and raw performance."],
      ["Self-hosted", "Ambassador / Emissary", "Kubernetes-native gateway built on Envoy."],
    ] },

    { type: "h2", text: "Backend for frontend (BFF)" },
    { type: "p", text: "Different clients want differently shaped data: a phone screen needs less than a desktop page. A **BFF** is a gateway-like layer per client type (web BFF, mobile BFF), owned by that client's team, which aggregates and tailors backend calls. It keeps a single general-purpose gateway from accumulating every client's special cases." },

    { type: "h2", text: "Pitfalls" },
    { type: "ul", items: [
      "**Too much logic in the gateway.** Business rules in the gateway create a distributed monolith that every team has to change. Keep it to cross-cutting concerns.",
      "**Single point of failure.** Run the gateway as a redundant, horizontally scaled tier across zones.",
      "**Extra hop.** Every request pays a little latency; keep the gateway's own work cheap (cache token-verification keys, avoid a remote call per request where possible).",
      "**Gateway vs service mesh.** A gateway handles north-south traffic (clients into the system); a [service mesh](/learn/service-mesh) handles east-west traffic (service to service).",
    ] },

    { type: "h2", text: "API gateways in system design interviews" },
    { type: "p", text: "Interviews focus on the business requirements and scale, so the gateway is usually drawn as **one box** at the edge that routes requests to the microservices and handles authentication, authorization, rate limiting and monitoring. You rarely need more than that. If the interviewer asks you to go deeper, use the features above: routing rules, where tokens are verified, rate-limit keys, aggregation and how the gateway itself scales." },
    { type: "diagram", kind: "flow", caption: "How a gateway usually appears in an interview diagram: one box at the edge in front of the services.", nodes: [
      { id: "c", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "auth, rate limits, routing, logs", col: 1.3, row: 1, tone: "accent" },
      { id: "a", label: "Service A", col: 2.8, row: 0 },
      { id: "b", label: "Service B", col: 2.8, row: 1 },
      { id: "d", label: "Service C", col: 2.8, row: 2 },
    ], edges: [{ from: "c", to: "gw" }, { from: "gw", to: "a" }, { from: "gw", to: "b" }, { from: "gw", to: "d" }] },
  ],
  uses: [
    { name: "Amazon API Gateway, Kong, Apigee", text: "Managed and self-hosted gateways providing keys, quotas, auth and routing for public APIs." },
    { name: "Netflix Zuul", text: "Netflix's edge gateway routes billions of requests to backend services and handles auth, insights and resilience at the edge." },
    { name: "Mobile home screens", text: "A gateway or BFF aggregates several services into one response so the app makes a single request." },
    { name: "Nginx in front of apps", text: "The classic reverse proxy: TLS termination, static files, compression and load balancing in front of app servers." },
  ],
  interview: [
    "Draw the gateway as one box at the edge and list its jobs: TLS, authentication, rate limiting, routing, logging.",
    "Say services trust the identity the gateway passes, so authentication isn't repeated in every service.",
    "Keep business logic out of the gateway and make it horizontally scalable across zones.",
    "Mention aggregation or a BFF when mobile and web clients need different responses.",
  ],
  related: ["load-balancing", "rate-limiting", "authentication-authorization", "authorization-rbac-abac-oauth", "service-mesh", "api-styles", "cdn"],
  practice: ["api-gateway", "rate-limiter", "service-platform"],
};
