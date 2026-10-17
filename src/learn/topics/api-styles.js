export default {
  blocks: [
    { type: "p", text: "**REST**, **gRPC** and **GraphQL** are the three common ways to design APIs. REST models resources over plain HTTP, gRPC calls remote procedures with strongly typed binary messages, and GraphQL lets clients ask for exactly the data they need in one query. Each fits a different kind of boundary." },

    { type: "h2", text: "REST" },
    { type: "p", text: "REST exposes **resources** at URLs and uses HTTP methods on them: `GET /orders/42`, `POST /orders`, `PATCH /orders/42`. Payloads are usually JSON." },
    { type: "ul", items: [
      "**Strengths**: universally understood, works with every tool and language, and **HTTP caching** works naturally (CDNs and browsers can cache GETs).",
      "**Weaknesses**: **over-fetching** (a response has fields you don't need) and **under-fetching** (you need several round trips to assemble a screen), plus no enforced schema unless you add OpenAPI.",
    ] },
    { type: "code", code: `
GET /users/42/orders?status=shipped&limit=20
200 OK
{ "data": [ { "id": "o_981", "total": 1499, "status": "shipped" } ],
  "next_cursor": "eyJpZCI6Im9fOTgxIn0" }
` },

    { type: "h2", text: "gRPC" },
    { type: "p", text: "gRPC defines services and messages in **Protocol Buffers** and generates client and server code in many languages. Messages are compact binary and travel over [HTTP/2](/learn/http)." },
    { type: "code", code: `
service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrders (WatchRequest) returns (stream OrderEvent);   // server streaming
}
message GetOrderRequest { string order_id = 1; }
` },
    { type: "ul", items: [
      "**Strengths**: fast and small (binary, no JSON parsing), a **strict contract** with generated clients, built-in deadlines, and **streaming** in either or both directions.",
      "**Weaknesses**: not natively usable from browsers (needs gRPC-Web or a proxy), binary payloads are harder to debug with curl, and HTTP caching doesn't apply.",
    ] },

    { type: "h2", text: "GraphQL" },
    { type: "p", text: "GraphQL exposes **one endpoint** and a typed schema. The client sends a query describing exactly the shape it wants, and the server resolves each field, possibly from many backends." },
    { type: "code", code: `
query {
  user(id: "42") {
    name
    orders(last: 3) { id total items { name } }
  }
}
` },
    { type: "ul", items: [
      "**Strengths**: no over- or under-fetching, one round trip per screen, a self-documenting schema, and it lets frontend teams move without new backend endpoints.",
      "**Weaknesses**: HTTP caching is hard (everything is a POST to one URL), expensive queries must be limited (query depth and cost analysis), and naive resolvers cause **N+1** backend calls, solved with batching (DataLoader).",
    ] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "REST", "gRPC", "GraphQL"], rows: [
      ["Model", "Resources + HTTP verbs", "Remote procedure calls", "Query a typed graph"],
      ["Payload", "JSON (usually)", "Protobuf (binary)", "JSON"],
      ["Contract", "Optional (OpenAPI)", "Required (.proto)", "Required (schema)"],
      ["Transport", "HTTP/1.1 or 2", "HTTP/2", "HTTP (usually POST)"],
      ["Caching", "Excellent (HTTP caching, CDNs)", "Application-level", "Application-level (persisted queries help)"],
      ["Streaming", "Via SSE or WebSockets", "Built in, bidirectional", "Subscriptions (usually WebSockets)"],
      ["Browser support", "Native", "Needs gRPC-Web", "Native"],
      ["Best fit", "Public APIs, CRUD, cacheable reads", "Internal service-to-service calls", "Client-facing aggregation for varied UIs"],
    ] },

    { type: "h2", text: "A common combination" },
    { type: "diagram", kind: "flow", caption: "A typical split: REST or GraphQL at the edge for clients, gRPC between internal services.", nodes: [
      { id: "web", label: "Web app", col: 0, row: 0, shape: "pill" },
      { id: "mob", label: "Mobile app", col: 0, row: 1, shape: "pill" },
      { id: "partner", label: "Partners", col: 0, row: 2, shape: "pill" },
      { id: "gql", label: "GraphQL / BFF", col: 1, row: 0.5, tone: "accent" },
      { id: "rest", label: "Public REST API", col: 1, row: 2, tone: "accent" },
      { id: "s1", label: "Users service", col: 2.3, row: 0 },
      { id: "s2", label: "Orders service", col: 2.3, row: 1 },
      { id: "s3", label: "Catalog service", col: 2.3, row: 2 },
    ], edges: [
      { from: "web", to: "gql" }, { from: "mob", to: "gql" }, { from: "partner", to: "rest" },
      { from: "gql", to: "s1", label: "gRPC" }, { from: "gql", to: "s2", label: "gRPC" }, { from: "rest", to: "s2", label: "gRPC" }, { from: "rest", to: "s3", label: "gRPC" },
    ] },

    { type: "h2", text: "Design practices that apply to all three" },
    { type: "ul", items: [
      "**Versioning**: add fields freely, never change their meaning; for breaking changes use a new version (`/v2`, a new protobuf package, or a deprecated GraphQL field).",
      "**Pagination** for every list, preferably cursor-based. See [pagination](/learn/pagination).",
      "**Idempotency keys** on create and payment operations so clients can retry safely. See [idempotency](/learn/idempotency).",
      "**Consistent errors** with machine-readable codes, and **deadlines or timeouts** on every call. See [timeouts and retries](/learn/retries-and-timeouts).",
    ] },
  ],
  uses: [
    { name: "Stripe and GitHub REST APIs", text: "Well-known public REST APIs with versioning, idempotency keys, cursor pagination and consistent error objects." },
    { name: "Google and Netflix internally", text: "Service-to-service communication over gRPC (Google's Stubby lineage) for efficiency and typed contracts." },
    { name: "GitHub, Shopify and Facebook GraphQL", text: "Expose GraphQL so clients fetch exactly the data each screen needs; Facebook created GraphQL for its mobile apps." },
    { name: "Backend-for-frontend (BFF)", text: "Many companies put a GraphQL or REST BFF per client type in front of gRPC microservices." },
  ],
  interview: [
    "Sketch the API early with a few concrete endpoints or RPCs; it pins down the design.",
    "Choose per boundary: REST for public or cacheable APIs, gRPC for internal high-volume calls, GraphQL when many clients need different shapes.",
    "Mention pagination, idempotency keys and versioning without being asked.",
    "If you choose GraphQL, address N+1 resolver calls and query cost limits.",
  ],
  related: ["http", "pagination", "idempotency", "api-gateway", "real-time-communication", "webhooks"],
  practice: ["api-gateway", "payment-platform", "url-shortener"],
};
