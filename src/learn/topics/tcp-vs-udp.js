export default {
  blocks: [
    { type: "p", text: "**TCP** and **UDP** are the two transport protocols almost everything on the internet runs on. TCP gives applications a reliable, ordered byte stream and does a lot of work to provide it. UDP sends independent datagrams with no guarantees, and does almost nothing. Choosing between them comes down to whether **late data is still useful**." },

    { type: "h2", text: "At a glance" },
    { type: "table", head: ["", "TCP", "UDP"], rows: [
      ["Connection", "Yes: handshake before data", "No: just send"],
      ["Delivery", "Guaranteed; lost segments are retransmitted", "Best effort; lost datagrams are gone"],
      ["Ordering", "In order", "Any order"],
      ["Flow and congestion control", "Built in: slows down for the receiver and the network", "None: the application must be careful"],
      ["Header size", "20–60 bytes", "8 bytes"],
      ["Unit", "Byte stream (no message boundaries)", "Individual datagrams (boundaries kept)"],
      ["Typical uses", "HTTP/1.1 and HTTP/2, databases, SSH, email", "DNS, video calls, games, VoIP, QUIC (HTTP/3)"],
    ] },

    { type: "h2", text: "How TCP provides reliability" },
    { type: "p", text: "TCP starts every connection with a **three-way handshake**, so both sides agree on initial sequence numbers. Every byte is then numbered, the receiver acknowledges what it has received, and the sender retransmits anything not acknowledged in time." },
    { type: "diagram", kind: "sequence", caption: "The three-way handshake costs one round trip before any data flows; TLS on top adds more, which is why connection reuse matters.", actors: ["Client", "Server"], steps: [
      { from: 0, to: 1, label: "SYN (seq = x)" },
      { from: 1, to: 0, label: "SYN-ACK (seq = y, ack = x+1)" },
      { from: 0, to: 1, label: "ACK (ack = y+1)" },
      { note: "connection established: 1 round trip spent", over: [0, 1] },
      { from: 0, to: 1, label: "data: GET /index.html", tone: "accent" },
      { from: 1, to: 0, label: "ACK + response data", tone: "accent" },
      { from: 0, to: 1, label: "FIN", dashed: true },
      { from: 1, to: 0, label: "ACK, FIN", dashed: true },
    ] },
    { type: "ul", items: [
      "**Retransmission** recovers lost segments, using timeouts and fast retransmit after duplicate ACKs.",
      "**Flow control** (the receive window) stops a fast sender from overrunning a slow receiver.",
      "**Congestion control** (slow start, then algorithms like CUBIC or BBR) probes how much the network can carry and backs off when packets are lost. This is why a new connection starts slowly.",
    ] },

    { type: "h2", text: "The costs of TCP" },
    { type: "ul", items: [
      "**Connection setup latency.** One round trip for the handshake, plus one or two more for TLS. Across continents, a round trip is 100–200 ms, so reusing connections (keep-alive, connection pools) is a major optimisation.",
      "**Head-of-line blocking.** Because TCP delivers bytes strictly in order, one lost packet stalls everything behind it until it is retransmitted, even data that arrived fine. For a video call, freezing to wait for an old frame is worse than skipping it.",
      "**State per connection.** Each open connection costs kernel memory and file descriptors. Servers holding millions of idle connections (chat, push notifications) have to be tuned for it. See [WebSockets, SSE and long polling](/learn/real-time-communication).",
    ] },

    { type: "h2", text: "When UDP is the better choice" },
    { type: "p", text: "UDP is right when **fresh data beats complete data** or when you want to build your own reliability:" },
    { type: "ul", items: [
      "**Real-time media.** In a video call, a 200 ms-old audio packet is useless. Losing it is a tiny glitch; waiting for it is a freeze. WebRTC runs media over UDP.",
      "**Games.** The newest player position replaces older ones, so retransmitting stale positions wastes bandwidth.",
      "**Small request-response lookups.** A DNS query fits in one datagram; a handshake would triple its latency. See [how DNS works](/learn/dns).",
      "**Custom transports.** QUIC, the transport under HTTP/3, runs on UDP and implements its own reliability, encryption and congestion control per stream, so loss on one stream doesn't block the others. See [HTTP versions](/learn/http).",
    ] },
    { type: "callout", tone: "warning", text: "Using UDP doesn't remove the need for congestion control. An application that blasts UDP without backing off can congest the network for everyone, which is why real UDP protocols (QUIC, WebRTC) implement their own." },

    { type: "h2", text: "How to decide" },
    { type: "table", head: ["Question", "If yes"], rows: [
      ["Must every byte arrive, in order (files, API calls, payments)?", "TCP (or QUIC)"],
      ["Is data stale within a fraction of a second (voice, video, game state)?", "UDP with application-level handling"],
      ["Is it one tiny request and response?", "UDP can avoid the handshake (DNS)"],
      ["Do you need many independent streams over a lossy network (mobile)?", "QUIC over UDP"],
    ] },
  ],
  uses: [
    { name: "Web APIs and databases", text: "HTTP/1.1, HTTP/2, PostgreSQL and MySQL protocols, gRPC: correctness matters more than shaving milliseconds, so they run on TCP with long-lived pooled connections." },
    { name: "Zoom, Google Meet and WebRTC", text: "Audio and video go over UDP (RTP/SRTP); the app conceals small losses rather than waiting for retransmissions." },
    { name: "DNS", text: "Queries normally use UDP on port 53, falling back to TCP when a response is too large." },
    { name: "HTTP/3 (QUIC)", text: "Google, Cloudflare and most CDNs serve HTTP/3 over QUIC on UDP, avoiding TCP head-of-line blocking and enabling faster handshakes." },
  ],
  interview: [
    "Default to TCP-based protocols (HTTP, gRPC) for APIs and say why: ordered, reliable delivery.",
    "For live video, voice or multiplayer games, say UDP and explain that late data is worthless, then mention handling loss in the application.",
    "Mention connection reuse when latency matters: handshakes and TLS cost round trips.",
    "If asked about HTTP/3, explain that QUIC moves reliability into user space on top of UDP to avoid head-of-line blocking.",
  ],
  related: ["http", "real-time-communication", "dns", "latency-vs-throughput", "load-balancing"],
  practice: ["chat-system", "notification-service"],
};
