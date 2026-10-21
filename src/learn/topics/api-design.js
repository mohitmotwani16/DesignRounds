export default {
  blocks: [
    { type: "p", text: "**API design** is deciding the contract between a service and its clients: the resources and operations it exposes, how requests and responses are shaped, how errors are reported, and how the contract evolves without breaking anyone. A well-designed API is predictable, hard to misuse, efficient over the network and stable for years." },
    { type: "p", text: "It comes up constantly in interviews, especially at junior and mid levels: you will usually be asked to design a **RESTful** API for a scenario. GraphQL and gRPC are growing (see [REST vs gRPC vs GraphQL](/learn/api-styles)), but most interview questions still expect REST. Writing the key endpoints early also clarifies requirements and anchors the rest of the design." },
    { type: "diagram", kind: "flow", caption: "A request's path through a well-designed API: one versioned contract at the edge, an idempotency key so retries are safe, and storage hidden behind the service.", nodes: [
      { id: "client", label: "Client", sub: "web, mobile, partner", col: 0, row: 1 },
      { id: "gw", label: "API gateway", sub: "auth, rate limits", col: 1.3, row: 1, tone: "accent" },
      { id: "svc", label: "Orders API", sub: "POST /v1/orders", col: 2.5, row: 1 },
      { id: "idem", label: "Idempotency keys", sub: "seen requests", col: 2.5, row: 0, shape: "db", tone: "cache" },
      { id: "db", label: "Orders DB", col: 3.6, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "client", to: "gw", label: "JSON over HTTPS" }, { from: "gw", to: "svc", label: "validated" },
      { from: "svc", to: "idem", label: "check key", dashed: true }, { from: "svc", to: "db", label: "write" },
    ] },

    { type: "h2", text: "What makes an API RESTful" },
    { type: "p", text: "REST is a set of conventions for building APIs on top of HTTP. It uses standard HTTP methods and resource-based URLs. Three principles do most of the work:" },
    { type: "ul", items: [
      "**Statelessness**: every request carries everything needed to process it (including credentials), and the server keeps no session between requests. Any server can handle any request, which is what makes REST services easy to [scale horizontally](/learn/stateless-vs-stateful).",
      "**Uniform interface**: resources are reached the same way everywhere, through URIs, with the same methods meaning the same things.",
      "**Resource-based architecture**: everything is a resource (users, posts, comments), and resources are manipulated with standard HTTP methods.",
    ] },
    { type: "p", text: "The classic set of endpoints for one resource:" },
    { type: "table", head: ["Request", "Meaning"], rows: [
      ["`GET /users`", "List users"],
      ["`POST /users`", "Create a user"],
      ["`GET /users/{id}`", "Get one user"],
      ["`PUT /users/{id}`", "Replace (update) that user"],
      ["`PATCH /users/{id}`", "Update some fields of that user"],
      ["`DELETE /users/{id}`", "Delete that user"],
    ] },

    { type: "h2", text: "Resource-oriented design in practice" },
    { type: "p", text: "A fuller example for an online store:" },
    { type: "table", head: ["Operation", "Request", "Success response"], rows: [
      ["List a user's orders", "`GET /v1/users/{userId}/orders?status=shipped&limit=20&cursor=…`", "`200` with items and `nextCursor`"],
      ["Get one order", "`GET /v1/orders/{orderId}`", "`200` with the order"],
      ["Create an order", "`POST /v1/orders` with an `Idempotency-Key` header", "`201` with the order and a `Location` header"],
      ["Update part of an order", "`PATCH /v1/orders/{orderId}`", "`200` with the updated order"],
      ["Cancel an order (an action)", "`POST /v1/orders/{orderId}/cancel`", "`200`, or `202` if asynchronous"],
      ["Delete an address", "`DELETE /v1/addresses/{addressId}`", "`204` with no body"],
    ] },
    { type: "ul", items: [
      "Use plural nouns and stable, opaque IDs in paths; avoid verbs except for actions that don't map cleanly to CRUD (like `cancel`).",
      "Nest resources only one level deep where ownership is clear; otherwise use filters (`/orders?userId=…`).",
      "Keep naming consistent: one casing style, the same field names across endpoints, ISO 8601 timestamps, and money as integers in minor units with a currency code.",
    ] },

    { type: "h2", text: "Five common mistakes, and the fix" },
    { type: "p", text: "REST design is mostly straightforward, but the same mistakes appear again and again." },
    { type: "h3", text: "1. Verbs in URLs" },
    { type: "code", code: "Wrong:  GET  /getAllBooks\n        POST /createNewBook\n\nRight:  GET  /books\n        POST /books" },
    { type: "p", text: "A URL should name a **resource** (a noun), not an action. The **HTTP method** already says what to do with it." },
    { type: "h3", text: "2. The wrong HTTP method" },
    { type: "code", code: "Wrong:  POST /books/123/update\nRight:  PUT  /books/123        (or PATCH for a partial update)" },
    { type: "p", text: "Each method has one job: GET reads, POST creates, PUT replaces, PATCH partially updates, DELETE removes. Using them as intended makes the API guessable, and lets caches, proxies and retry logic behave correctly." },
    { type: "h3", text: "3. One status code for everything" },
    { type: "code", code: "Wrong:  200 OK for every response, with errors described in the body\n\nRight:  200 OK          successful GET, PUT or PATCH\n        201 Created     successful POST that created something\n        204 No Content  successful DELETE\n        404 Not Found   the resource doesn't exist" },
    { type: "p", text: "Status codes are a standard vocabulary for the outcome of a request. Used properly, clients can react without parsing the body: retry on `503`, re-authenticate on `401`, fix the input on `400`." },
    { type: "h3", text: "4. Inconsistent naming" },
    { type: "code", code: "Wrong:  /book/123 and /authors      (singular and plural mixed)\nRight:  /books/123 and /authors     (always plural)" },
    { type: "p", text: "Consistency lets developers predict endpoints they haven't seen, which means fewer mistakes and less time in the docs." },
    { type: "h3", text: "5. No pagination" },
    { type: "code", code: "Wrong:  return every record in one response\nRight:  GET /books?limit=50&cursor=…     (or ?page=2&limit=50)" },
    { type: "p", text: "Returning everything is slow, memory-hungry and gets worse as data grows. Split lists into pages. See [pagination](/learn/pagination) for offset vs cursor strategies." },

    { type: "h2", text: "Worked example: Twitter's timeline API" },
    { type: "p", text: "Let's apply this to a real API: the home timeline of Twitter (X). It shows tweets from people the user follows, plus retweets and mentions. The design has to handle:" },
    { type: "ul", items: [
      "**Data format**: a response that is easy to parse.",
      "**Pagination**: a timeline is effectively endless.",
      "**Real-time updates**: fetching tweets newer than the ones on screen.",
      "**Mentions**: tweets in which the user is mentioned.",
    ] },
    { type: "h3", text: "Get a user's timeline" },
    { type: "code", code: "GET https://api.twitter.com/2/users/:id/timelines/reverse_chronological" },
    { type: "p", text: "The response is a JSON object with two parts: `data`, an array of tweets, and `meta`, information about the page, including the tokens used to fetch more. A trimmed sample:" },
    { type: "code", code: `{
  "data": [
    {
      "id": "1524796546306478083",
      "edit_history_tweet_ids": ["1524796546306478083"],
      "text": "Today marks the launch of a new video series for developers…"
    },
    {
      "id": "1524468552404668416",
      "edit_history_tweet_ids": ["1524468552404668416"],
      "text": "Join us tomorrow as we discuss the future of bots…"
    }
  ],
  "meta": {
    "result_count": 2,
    "newest_id": "1524796546306478083",
    "oldest_id": "1524468552404668416",
    "next_token": "7140dibdnow9c7btw421dyz6jism75z99gyxd8egarsc4",
    "previous_token": "7140dibdnow9c7btw421dyz6jism75z99gyxd8egarsc4"
  }
}` },
    { type: "ul", items: [
      "**`edit_history_tweet_ids`** lists the IDs of every version of a tweet, added when Twitter introduced editing. A good example of an additive, non-breaking change.",
      "**Pagination** uses `next_token` and `previous_token`: opaque cursors the client sends back to get the next or previous page. `newest_id` lets the client ask for anything newer than what it already shows, which handles real-time refresh.",
      "**Versioning**: the `/2/` in `api.twitter.com/2` is the API version, so the API can change in the future without breaking clients built against version 1.",
    ] },
    { type: "h3", text: "Get mentions" },
    { type: "code", code: "GET /2/users/:id/mentions" },
    { type: "p", text: "Returns tweets that mention the given user, the 10 most recent by default, and up to the most recent 800 by paging. The response has the same `data` and `meta` shape, with the same token-based pagination and the same versioning, so a client that can read one endpoint can read the other. That consistency is the point." },

    { type: "h2", text: "Methods, status codes and safety" },
    { type: "table", head: ["Method", "Safe", "Idempotent", "Use"], rows: [
      ["GET", "Yes", "Yes", "Read; never change state"],
      ["PUT", "No", "Yes", "Replace a resource at a known URL"],
      ["PATCH", "No", "Not necessarily", "Partial update"],
      ["DELETE", "No", "Yes", "Remove"],
      ["POST", "No", "No (make it so with idempotency keys)", "Create, or trigger actions"],
    ] },
    { type: "p", text: "**Safe** means the request changes nothing; **idempotent** means repeating it has the same effect as doing it once, so it can be retried safely. Use status codes for their meaning: `400` for invalid input, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (such as a version mismatch), `422` validation failure, `429` rate limited, `5xx` server faults. Clients and proxies rely on these to decide whether to retry. See [HTTP](/learn/http)." },

    { type: "h2", text: "Errors clients can act on" },
    { type: "code", code: `HTTP/1.1 422 Unprocessable Entity
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 2 units of this item are available.",
    "details": [{ "field": "items[0].quantity", "available": 2 }],
    "requestId": "req_8f2c..."
  }
}` },
    { type: "p", text: "Give a stable, machine-readable `code`, a human-readable message, field-level details for validation, and a request ID for support. Never leak stack traces or internal hostnames." },

    { type: "h2", text: "Designing for scale and safety" },
    { type: "ul", items: [
      "**Pagination** on every list, preferably cursor-based. See [pagination](/learn/pagination).",
      "**Idempotency keys** on creates and payments, so clients can retry safely after timeouts. See [idempotency](/learn/idempotency).",
      "**Authentication** with API keys, sessions or JWTs, and **authorization** on every resource. See [authentication](/learn/authentication-authorization) and [authorization](/learn/authorization-rbac-abac-oauth).",
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
    { type: "callout", tone: "tip", text: "In an interview, write three to five key endpoints with their request and response fields right after requirements: one per functional requirement, nouns in the path, the right method, the main fields. It forces decisions about IDs, pagination and what the client actually needs, and interviewers notice." },
  ],
  uses: [
    { name: "Public developer APIs", text: "Versioned, documented endpoints with idempotency keys, rate limits and consistent errors, like the Twitter, Stripe and GitHub APIs." },
    { name: "Mobile backends", text: "Compact, paginated responses and long backward-compatibility windows for old app versions." },
    { name: "Internal microservices", text: "Consistent conventions across teams make services easy to call and debug." },
    { name: "Interview designs", text: "Every design problem includes an API step: see the endpoints in [Design Twitter](/learn/design-twitter) and [Design Pastebin](/learn/design-pastebin)." },
  ],
  interview: [
    "Write one endpoint per functional requirement, with method, path and main fields.",
    "Nouns in paths, plural and consistent; let the HTTP method be the verb.",
    "Use correct status codes and a structured error format.",
    "Add pagination, idempotency keys and rate limits by default, and say how the API is versioned.",
  ],
  related: ["api-styles", "pagination", "authentication-authorization", "idempotency", "rate-limiting", "http", "api-gateway"],
  practice: ["url-shortener", "payment-platform", "api-gateway"],
  reading: [
    { title: "Microsoft REST API Guidelines", publisher: "Microsoft, GitHub", url: "https://github.com/microsoft/api-guidelines" },
    { title: "Google API Design Guide", publisher: "Google Cloud", url: "https://cloud.google.com/apis/design" },
  ],
};
