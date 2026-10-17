export default {
  blocks: [
    { type: "p", text: "**HTTP** is the request-response protocol of the web and of most APIs. Its semantics (methods, status codes, headers) have stayed stable for decades; what changed between HTTP/1.1, HTTP/2 and HTTP/3 is **how requests travel over the network**, and that has a large effect on latency." },

    { type: "h2", text: "The parts every API uses" },
    { type: "table", head: ["Concept", "What to know"], rows: [
      ["Methods", "`GET` (read, safe, cacheable), `POST` (create or act), `PUT` (replace), `PATCH` (partial update), `DELETE`. GET, PUT and DELETE are **idempotent**; POST is not. See [idempotency](/learn/idempotency)"],
      ["Status codes", "2xx success (200, 201, 204), 3xx redirect (301 permanent, 302/307 temporary, 304 not modified), 4xx client error (400, 401, 403, 404, 409 conflict, 429 too many requests), 5xx server error (500, 502, 503, 504)"],
      ["Caching headers", "`Cache-Control` (max-age, no-store, private), `ETag` with `If-None-Match` for conditional requests that return 304"],
      ["Connection reuse", "Keep-alive lets many requests reuse one TCP+TLS connection, avoiding repeated handshakes"],
    ] },

    { type: "h2", text: "HTTP/1.1: one request at a time per connection" },
    { type: "p", text: "HTTP/1.1 sends requests as text and, on each connection, a response must finish before the next can start. A page with 80 resources therefore suffers **head-of-line blocking**: one slow response holds up the queue behind it. Browsers work around this by opening about 6 connections per host, and sites used to shard assets across domains and bundle files to reduce request counts." },

    { type: "h2", text: "HTTP/2: many streams on one connection" },
    { type: "p", text: "HTTP/2 keeps the same semantics but encodes messages as **binary frames** and **multiplexes** many concurrent streams over a single connection, with stream priorities and **HPACK header compression** (headers like cookies are repeated on every request and compress very well). One connection per origin replaces six, and request bundling matters much less." },
    { type: "p", text: "The remaining problem is below HTTP: everything still rides on one [TCP](/learn/tcp-vs-udp) connection, so a single lost packet stalls **all** streams until it is retransmitted. On lossy mobile networks this TCP-level head-of-line blocking can make HTTP/2 slower than several HTTP/1.1 connections." },

    { type: "h2", text: "HTTP/3: HTTP over QUIC" },
    { type: "p", text: "HTTP/3 runs over **QUIC**, a transport built on UDP that implements reliability, congestion control and encryption itself, **per stream**:" },
    { type: "ul", items: [
      "**No transport head-of-line blocking**: a lost packet only delays the stream it belongs to.",
      "**Faster setup**: QUIC combines the transport and TLS 1.3 handshakes into one round trip, and resumed connections can send data immediately (0-RTT).",
      "**Connection migration**: connections are identified by an ID, not the IP and port, so a phone switching from Wi-Fi to mobile data keeps its connection.",
    ] },
    { type: "diagram", kind: "flow", caption: "How each version carries three requests: separate connections, multiplexed streams over TCP, or independent streams over QUIC.", nodes: [
      { id: "h1", label: "HTTP/1.1", sub: "3 TCP connections", col: 0, row: 0, tone: "muted", w: 150 },
      { id: "h1c", label: "req 1 → resp 1 → req 2…", col: 1.4, row: 0, w: 230 },
      { id: "h2", label: "HTTP/2", sub: "1 TCP connection", col: 0, row: 1, tone: "accent", w: 150 },
      { id: "h2c", label: "streams 1·2·3 interleaved", sub: "one loss stalls all", col: 1.4, row: 1, w: 230 },
      { id: "h3", label: "HTTP/3", sub: "1 QUIC connection", col: 0, row: 2, tone: "ok", w: 150 },
      { id: "h3c", label: "streams 1·2·3 independent", sub: "loss stalls one stream", col: 1.4, row: 2, w: 230 },
    ], edges: [{ from: "h1", to: "h1c" }, { from: "h2", to: "h2c" }, { from: "h3", to: "h3c" }] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "HTTP/1.1", "HTTP/2", "HTTP/3"], rows: [
      ["Transport", "TCP", "TCP", "QUIC over UDP"],
      ["Format", "Text", "Binary frames", "Binary frames"],
      ["Concurrency", "One in-flight request per connection", "Multiplexed streams", "Multiplexed independent streams"],
      ["Header compression", "None", "HPACK", "QPACK"],
      ["Head-of-line blocking", "Per connection (HTTP level)", "At the TCP level", "Only within a stream"],
      ["Handshake before data (new connection)", "TCP + TLS: 2–3 round trips", "Same as 1.1", "1 round trip (0 when resumed)"],
    ] },

    { type: "h2", text: "HTTPS and TLS" },
    { type: "p", text: "HTTPS is HTTP inside **TLS**, which encrypts traffic, protects it from tampering, and lets the client verify the server's identity through a certificate. TLS 1.3 needs one round trip to set up. In a typical architecture TLS is **terminated** at the edge (a CDN, [load balancer](/learn/load-balancing) or [API gateway](/learn/api-gateway)), and internal traffic is re-encrypted, often with mutual TLS. See [encryption](/learn/encryption)." },
  ],
  uses: [
    { name: "Browsers and CDNs", text: "All major browsers and CDNs (Cloudflare, Fastly, Akamai, Google) support HTTP/3, and a large share of web traffic already uses it." },
    { name: "gRPC", text: "Built on HTTP/2: it relies on multiplexed streams for concurrent calls and bidirectional streaming. See [REST vs gRPC vs GraphQL](/learn/api-styles)." },
    { name: "Mobile apps", text: "Benefit most from HTTP/3: lossy networks and switching between Wi-Fi and cellular are exactly where QUIC helps." },
    { name: "Internal services", text: "Usually HTTP/1.1 or HTTP/2 with long-lived pooled connections inside a data center, where packet loss is rare." },
  ],
  interview: [
    "Use correct methods and status codes in your API sketch: POST to create (201), 409 for conflicts, 429 when rate limited.",
    "Mention connection reuse and TLS termination at the edge when discussing latency.",
    "If asked about HTTP/2 vs 3, explain head-of-line blocking at the TCP level and how QUIC removes it.",
    "Use caching headers (Cache-Control, ETag) for cacheable GETs and to let a CDN help.",
  ],
  related: ["tcp-vs-udp", "api-styles", "cdn", "encryption", "load-balancing", "dns"],
  practice: ["url-shortener", "image-feed-client", "video-streaming"],
};
