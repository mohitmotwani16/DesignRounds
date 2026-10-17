export default {
  blocks: [
    { type: "p", text: "**API design** is deciding the contract between a service and its clients: the resources and operations it exposes, how requests and responses are shaped, how errors are reported, and how the contract evolves without breaking anyone. A well-designed API is predictable, hard to misuse, efficient over the network and stable for years. In system design interviews, writing the key API endpoints early clarifies requirements and anchors the rest of the design." },
    {"type":"diagram","kind":"flow","caption":"A request's path through a well-designed API: one versioned contract at the edge, an idempotency key so retries are safe, and storage hidden behind the service.","nodes":[{"id":"client","label":"Client","sub":"web, mobile, partner","col":0,"row":1},{"id":"gw","label":"API gateway","sub":"auth, rate limits","col":1,"row":1,"tone":"accent"},{"id":"svc","label":"Orders API","sub":"POST /v1/orders","col":2,"row":1},{"id":"idem","label":"Idempotency keys","sub":"seen requests","col":2,"row":0,"shape":"db","tone":"cache"},{"id":"db","label":"Orders DB","col":3,"row":1,"shape":"db","tone":"store"}],"edges":[{"from":"client","to":"gw","label":"JSON over HTTPS"},{"from":"gw","to":"svc","label":"validated"},{"from":"svc","to":"idem","label":"check key","dashed":true},{"from":"svc","to":"db","label":"write"}]},

    { type: "h2", text: "Resource-oriented design" },
    { type: "p", text: "REST-style APIs model the domain as **resources** (nouns) and use HTTP methods for operations (verbs):" },
    { type: "table", head: ["Operation", "Request", "Success response"], rows: [
      ["List a user's orders", "`GET /v1/users/{userId}/orders?status=shipped&limit=20&cursor=…`", "`200` with items and `nextCursor`"],
      ["Get one order", "`GET /v1/orders/{orderId}`", "`200` with the order"],
      ["Create an order", "`POST /v1/orders` with an `Idempotency-Key` header", "`201` with the order and a `Location` header"],
      ["Update part of an order", "`PATCH /v1/orders/{orderId}`", "`200` with the updated order"],
      ["Cancel an order (an action)", "`POST /v1/orders/{orderId}/cancel`", "`200` or `202` if asynchronous"],
      ["Delete an address", "`DELETE /v1/addresses/{addressId}`", "`204` with no body"],
    ] },
    { type: "ul", items: [
      "Use plural nouns and stable, opaque IDs in paths; avoid verbs except for actions that don't map cleanly to CRUD.",
      "Nest resources only one level deep where ownership is clear; otherwise use filters (`/orders?userId=…`).",
      "Keep naming consistent: one casing style, the same field names across endpoints, ISO 8601 timestamps, and amounts as integers in minor units with a currency code.",
    ] },

    { type: "h2", text: "Methods, status codes and safety" },
    { type: "table", head: ["Method", "Safe", "Idempotent", "Use"], rows: [
      ["GET", "Yes", "Yes", "Read; never change state"],
      ["PUT", "No", "Yes", "Replace a resource at a known URL"],
      ["PATCH", "No", "Not necessarily", "Partial update"],
      ["DELETE", "No", "Yes", "Remove"],
      ["POST", "No", "No (make it so with idempotency keys)", "Create, or trigger actions"],
    ] },
    { type: "p", text: "Use status codes for their meaning: `400` for invalid input, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (such as a version mismatch), `422` validation failure, `429` rate limited, `5xx` server faults. Clients and proxies rely on these to decide whether to retry. See [HTTP](/learn/http)." },

    { type: "h2", text: "Errors clients can act on" },
    { type: "code", code: `
HTTP/1.1 422 Unprocessable Entity
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 2 units of this item are available.",
    "details": [{ "field": "items[0].quantity", "available": 2 }],
    "requestId": "req_8f2c..."
  }
}
` },
    { type: "p", text: "Give a stable, machine-readable `code`, a human-readable message, field-level details for validation, and a request ID for support. Never leak stack traces or internal hostnames." },

    { type: "h2", text: "Designing for scale and safety" },
    { type: "ul", items: [
      "**Pagination** on every list, preferably cursor-based. See [pagination](/learn/pagination).",
      "**Idempotency keys** on creates and payments, so clients can retry safely after timeouts. See [idempotency](/learn/idempotency).",
      "**Rate limits** per client, with `429` and `Retry-After`. See [rate limiting](/learn/rate-limiting).",
      "**Optimistic concurrency** with versions or ETags (`If-Match`), returning `409` or `412` on conflicting updates. See [optimistic locking](/learn/optimistic-vs-pessimistic-locking).",
      "**Asynchronous operations:** return `202 Accepted` with a status URL for long-running work, or notify via [webhooks](/learn/webhooks).",
      "**Field selection and compression** to keep payloads small on mobile networks.",
    ] },

    { type: "h2", text: "Versioning and compatibility" },
    { type: "ul", items: [
      "**Additive changes are safe:** new optional fields, new endpoints, new enum values if clients are told to ignore unknown ones.",
      "**Breaking changes need a new version:** removing or renaming fields, changing types or meanings, or making optional inputs required.",
      "**Version explicitly,** in the path (`/v1/`) or a header, and run old and new versions side by side with a published deprecation timeline.",
      "**Be tolerant in what you accept** from older clients, and never reuse a field name for a different meaning.",
      "Mobile clients linger for months, so compatibility windows must be long. See [mobile release engineering](/learn/mobile-release-engineering).",
    ] },
    { type: "callout", tone: "tip", text: "In an interview, write three to five key endpoints with their request and response fields right after requirements. It forces decisions about IDs, pagination and what the client actually needs, and interviewers notice." },
  ],
  uses: [
    { name: "Public developer APIs", text: "Versioned, documented endpoints with idempotency keys, rate limits and consistent errors." },
    { name: "Mobile backends", text: "Compact, paginated responses and long backward-compatibility windows for old app versions." },
    { name: "Internal microservices", text: "Consistent conventions across teams make services easy to call and debug." },
  ],
  interview: [
    "Write the key endpoints with methods, paths and main fields early.",
    "Use correct status codes and a structured error format.",
    "Add pagination, idempotency keys and rate limits by default.",
    "Explain how the API evolves without breaking clients.",
  ],
  related: ["api-styles", "pagination", "idempotency", "rate-limiting", "http"],
  practice: ["url-shortener", "payment-platform", "api-gateway"],
  reading: [
    { title: "Microsoft REST API Guidelines", publisher: "Microsoft, GitHub", url: "https://github.com/microsoft/api-guidelines" },
    { title: "Google API Design Guide", publisher: "Google Cloud", url: "https://cloud.google.com/apis/design" },
  ],
};
