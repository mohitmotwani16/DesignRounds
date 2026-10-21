export default {
  blocks: [
    { type: "p", text: "**REST**, **gRPC** and **GraphQL** are the three common ways to design APIs. REST models resources over plain HTTP, gRPC calls remote procedures with strongly typed binary messages, and GraphQL lets clients ask for exactly the data they need in one query. Each fits a different kind of boundary." },

    { type: "p", text: "When two services talk [synchronously](/learn/sync-vs-async-communication), REST and gRPC dominate; GraphQL is mostly used at the edge, between clients and backends." },

    { type: "h2", text: "REST" },
    { type: "p", text: "REST (Representational State Transfer) is the default for most web APIs. It exposes **resources** at URLs and operates on them with HTTP methods: GET, POST, PUT, PATCH and DELETE. Data usually travels as JSON, though XML and other formats work too. A client asks for a user:" },
    { type: "code", code: `GET /users/123 HTTP/1.1
Host: example.com

HTTP/1.1 200 OK
Content-Type: application/json

{ "id": 123, "name": "John Doe" }` },
    { type: "ul", items: [
      "**Works everywhere.** It's built on HTTP, which every platform speaks: browsers, mobile apps, IoT devices. Every language has libraries, and you can test with curl or Postman with no setup.",
      "**Human-readable.** You can read a JSON response and understand it, browser developer tools show REST calls clearly, and tools like Swagger/OpenAPI generate interactive documentation automatically.",
      "**Stateless.** Each request carries everything needed to handle it; the server doesn't remember previous requests, so any instance can answer.",
      "**Cacheable.** HTTP caching works naturally: CDNs and browsers can cache GET responses.",
      "**Weaknesses**: **over-fetching** (a response has fields you don't need) and **under-fetching** (several round trips to assemble one screen), and no enforced schema unless you add OpenAPI.",
    ] },
    { type: "p", text: "REST is the best fit for **public-facing APIs and third-party integrations**: outside developers can use it without learning a new protocol. See [API design](/learn/api-design) for conventions." },
    { type: "code", code: `GET /users/42/orders?status=shipped&limit=20
200 OK
{ "data": [ { "id": "o_981", "total": 1499, "status": "shipped" } ],
  "next_cursor": "eyJpZCI6Im9fOTgxIn0" }` },

    { type: "h2", text: "gRPC" },
    { type: "p", text: "gRPC (gRPC Remote Procedure Call) puts **performance ahead of simplicity**. It runs over [HTTP/2](/learn/http) and serializes data with **Protocol Buffers** (Protobuf), a compact binary format. You define the service and its messages in a `.proto` file, and code is generated for clients and servers in many languages:" },
    { type: "code", code: `service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
}

message UserRequest {
  int32 id = 1;
}

message UserResponse {
  int32 id = 1;
  string name = 2;
}` },
    { type: "p", text: "Calling it looks like calling a local function:" },
    { type: "code", code: `response = stub.GetUser(UserRequest(id=123))
print(response.name)   # "John Doe"` },
    { type: "ul", items: [
      "**Smaller and faster.** Binary Protobuf is far more compact than JSON: a JSON object with nested arrays of about 1 KB might be around 200 bytes as Protobuf. That matters when services exchange lots of data or make thousands of calls a second.",
      "**Streaming in both directions.** HTTP/2 multiplexes many calls over one connection, and gRPC supports server streaming, client streaming and bidirectional streaming: a server can push updates without the client polling, and a client can stream data without waiting for each chunk to be acknowledged. Good for real-time features.",
      "**Strong typing.** Change a field's type in the `.proto` file and any code still using the old type fails **at compile time**. JSON APIs only discover type errors at runtime, when a real request fails.",
      "**Built-in deadlines** propagate timeouts across call chains.",
      "**Weaknesses**: a steeper learning curve and more tooling; not natively usable from browsers (needs gRPC-Web or a proxy); binary payloads are harder to debug with curl; HTTP caching doesn't apply.",
    ] },
    { type: "p", text: "gRPC is the best fit for **internal service-to-service calls** where performance matters and one organization controls both ends. The learning curve and tooling make it a poor choice for public APIs." },
    { type: "code", code: `service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrders (WatchRequest) returns (stream OrderEvent);   // server streaming
}
message GetOrderRequest { string order_id = 1; }` },

    { type: "h2", text: "Choosing between REST and gRPC" },
    { type: "table", head: ["", "REST / HTTP", "gRPC"], rows: [
      ["Transport", "HTTP/1.1 (often one request at a time per connection)", "HTTP/2: multiplexing and streaming"],
      ["Data format", "JSON, human-readable, ~1 KB typical payload", "Protobuf, binary, ~200 bytes (about 5× smaller)"],
      ["Best for", "Public APIs, third-party integrations, browser clients, easy debugging", "Internal microservices, high-throughput systems, real-time streaming, low latency"],
      ["Tooling", "curl, Postman, Swagger/OpenAPI, browser DevTools", "Generated clients, grpcurl, reflection"],
      ["Trade-offs", "Larger payloads, no enforced contract", "Steeper learning curve, weaker browser support, harder to debug"],
    ] },
    { type: "p", text: "Use **REST** for external APIs: third-party developers expect it, have the tools for it, read JSON easily, and the documentation is straightforward. Use **gRPC** inside the system where performance is critical: lots of data, thousands of calls per second, or native streaming. Many systems use **both**: REST faces external clients, gRPC connects internal services, and the [API gateway](/learn/api-gateway) translates between them." },

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
  related: ["sync-vs-async-communication", "api-design", "http", "pagination", "idempotency", "api-gateway", "real-time-communication"],
  practice: ["api-gateway", "payment-platform", "url-shortener"],
};
