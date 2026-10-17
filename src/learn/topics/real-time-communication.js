export default {
  blocks: [
    { type: "p", text: "Plain HTTP is request-response: the client asks, the server answers. Chat, live scores, notifications, collaborative editing and dashboards need the **server to push** data as soon as something happens. The three main techniques are **long polling**, **server-sent events (SSE)** and **WebSockets**." },

    { type: "h2", text: "Short polling (the baseline)" },
    { type: "p", text: "The client asks \"anything new?\" every few seconds. Simple, but wasteful: most responses are empty, and an update waits for the next poll, so latency is up to the full interval. Fine for data that changes rarely; poor for chat." },

    { type: "h2", text: "Long polling" },
    { type: "p", text: "The client sends a request and the server **holds it open** until there is new data (or a timeout of, say, 30 seconds), then responds. The client immediately sends the next request." },
    { type: "diagram", kind: "sequence", caption: "Long polling: the server parks each request until something happens, so updates arrive almost immediately without constant empty responses.", actors: ["Client", "Server"], steps: [
      { from: 0, to: 1, label: "GET /updates?after=41" },
      { note: "server holds the request…", over: [1] },
      { from: 1, to: 0, label: "200 [message 42]", tone: "accent" },
      { from: 0, to: 1, label: "GET /updates?after=42" },
      { note: "nothing for 30 s", over: [1] },
      { from: 1, to: 0, label: "204 (timeout, reconnect)", dashed: true },
    ] },
    { type: "ul", items: [
      "**Pros**: works everywhere plain HTTP works, including old proxies; easy to add to a REST API.",
      "**Cons**: a new request per message adds headers and overhead; held requests tie up server resources; ordering and missed messages need a cursor (`after=42`).",
    ] },

    { type: "h2", text: "Server-sent events (SSE)" },
    { type: "p", text: "SSE is a standard for streaming text events from server to client over one long-lived HTTP response (`Content-Type: text/event-stream`). Browsers support it natively through `EventSource`, which **reconnects automatically** and resumes with the `Last-Event-ID` header." },
    { type: "code", code: `
id: 43
event: score
data: {"match": "IND-AUS", "runs": 287, "wickets": 6}

id: 44
event: score
data: {"match": "IND-AUS", "runs": 291, "wickets": 6}
` },
    { type: "ul", items: [
      "**Pros**: plain HTTP (works with HTTP/2 multiplexing, proxies and load balancers), automatic reconnection and resumption, very simple.",
      "**Cons**: **one direction only** (client-to-server still uses normal requests) and text only.",
    ] },

    { type: "h2", text: "WebSockets" },
    { type: "p", text: "A WebSocket starts as an HTTP request with `Upgrade: websocket`, then becomes a persistent, **full-duplex** connection carrying small framed messages both ways with very low overhead." },
    { type: "ul", items: [
      "**Pros**: true bidirectional, low-latency messaging, text or binary, minimal per-message overhead. The natural fit for chat, multiplayer games and collaborative editing.",
      "**Cons**: you handle reconnection, heartbeats and resumption yourself; some proxies and corporate networks interfere; long-lived stateful connections complicate load balancing and deploys.",
    ] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Long polling", "SSE", "WebSockets"], rows: [
      ["Direction", "Server → client (per request)", "Server → client", "Both ways"],
      ["Connection", "Repeated HTTP requests", "One long HTTP response", "One upgraded TCP connection"],
      ["Latency", "Low, plus a reconnect per message", "Low", "Lowest"],
      ["Reconnection", "Built into the loop", "Automatic (EventSource)", "Your code"],
      ["Overhead per message", "High (full HTTP request)", "Low", "Very low"],
      ["Best for", "Simple, infrequent updates; legacy environments", "Feeds, notifications, live scores, AI token streaming", "Chat, games, collaboration, trading"],
    ] },

    { type: "h2", text: "Scaling persistent connections" },
    { type: "p", text: "Holding millions of connections changes the architecture. Connections are cheap individually (tens of KB of memory each with a tuned server) but they are **stateful**: a message for user B must reach the specific server holding B's connection." },
    { type: "diagram", kind: "flow", caption: "Gateways hold connections and register who is connected where; a pub/sub layer routes each message to the gateway holding the recipient.", nodes: [
      { id: "a", label: "User A", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "User B", col: 0, row: 2, shape: "pill" },
      { id: "g1", label: "WS gateway 1", col: 1, row: 0, tone: "accent" },
      { id: "g2", label: "WS gateway 2", col: 1, row: 2, tone: "accent" },
      { id: "chat", label: "Chat service", col: 2, row: 1 },
      { id: "reg", label: "Presence registry", sub: "user → gateway", col: 3, row: 0, shape: "db", tone: "cache" },
      { id: "bus", label: "Pub/sub", sub: "per-gateway channel", col: 3, row: 2, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "a", to: "g1", both: true }, { from: "b", to: "g2", both: true },
      { from: "g1", to: "chat", label: "send to B" }, { from: "chat", to: "reg", label: "where is B?" },
      { from: "chat", to: "bus", label: "to gateway 2" }, { from: "bus", to: "g2" },
    ] },
    { type: "ul", items: [
      "**Separate connection gateways** from business logic so you can deploy logic without dropping connections.",
      "Track **presence**: which gateway holds each user, with a TTL refreshed by heartbeats.",
      "Use [pub/sub](/learn/pub-sub) (Redis, Kafka, NATS) to deliver to the right gateway.",
      "Load balance with **least connections**, and on deploys **drain** gracefully: tell clients to reconnect elsewhere, with jittered backoff to avoid a reconnection storm.",
      "Persist messages first, push second, so a client that missed pushes can catch up with a cursor when it reconnects.",
    ] },
  ],
  uses: [
    { name: "WhatsApp, Slack and Discord", text: "Keep a persistent WebSocket (or similar) per client, with gateway fleets holding millions of connections and pub/sub fan-out behind them." },
    { name: "ChatGPT and LLM APIs", text: "Stream generated tokens to the browser with server-sent events, since the stream is one-way and HTTP-friendly." },
    { name: "Stock tickers and sports scores", text: "Push price and score updates over SSE or WebSockets to many read-only subscribers." },
    { name: "Figma and Google Docs", text: "Use persistent bidirectional connections to exchange edits and cursor positions in real time." },
  ],
  interview: [
    "Pick the simplest technique that fits: SSE for one-way feeds, WebSockets for two-way chat or games, long polling only for constraints like old proxies.",
    "Explain how a message finds the recipient's connection: presence registry plus pub/sub between gateways.",
    "Persist before pushing, and let reconnecting clients catch up from a cursor or last event ID.",
    "Address connection limits per server, heartbeats, and graceful draining on deploys.",
  ],
  related: ["pub-sub", "tcp-vs-udp", "http", "load-balancing", "message-queues", "webhooks"],
  practice: ["chat-system", "notification-service", "collaborative-editor", "collaborative-whiteboard"],
};
