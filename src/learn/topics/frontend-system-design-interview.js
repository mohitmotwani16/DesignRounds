export default {
  blocks: [
    { type: "p", text: "A **frontend system design interview** asks you to design the client side of a product: a news feed, an autocomplete, a chat app, a photo gallery, a collaborative editor. Instead of databases and load balancers, you're judged on component architecture, data and state, the API contract you need, rendering and network performance, offline and error behaviour, and accessibility. A simple, repeatable structure keeps a 45-minute round on track." },

    { type: "h2", text: "A framework for the round" },
    { type: "table", head: ["Step", "Time", "What to cover"], rows: [
      ["1. Requirements", "5 min", "Core features, users and devices, scale of data on screen, offline needs, accessibility and internationalisation"],
      ["2. Architecture", "10 min", "Main components and how data flows between them, client-side layers (view, state, data layer, network)"],
      ["3. Data model", "5 min", "The client-side shape of entities and state: what's server data, what's UI state, how it's normalised"],
      ["4. API interface", "5 min", "Endpoints or messages you need, pagination, real-time channel, payloads"],
      ["5. Optimisations and deep dives", "15 min", "Performance, network efficiency, rendering, offline, error states, security, accessibility"],
      ["6. Wrap-up", "5 min", "Trade-offs, what you'd measure, what you'd do next"],
    ] },

    { type: "h2", text: "Worked example: a news feed" },
    { type: "h3", text: "Requirements" },
    { type: "p", text: "Users scroll an infinite feed of posts with text, images and video; they can like and comment; new posts appear without a full reload; it must work on slow mobile networks and be usable with a screen reader. Out of scope: composing posts, ads." },
    { type: "h3", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "Feed client layers: UI components render from a normalised client cache; a data layer handles fetching, pagination, real-time updates and optimistic mutations.", nodes: [
      { id: "ui", label: "Feed UI", sub: "virtualised list · post cards", col: 0, row: 1, tone: "accent" },
      { id: "store", label: "Client cache", sub: "posts by id · feed cursors", col: 1.4, row: 1, shape: "db", tone: "cache" },
      { id: "data", label: "Data layer", sub: "fetch · paginate · optimistic", col: 2.8, row: 1 },
      { id: "api", label: "Feed API", sub: "cursor pagination", col: 4.2, row: 0.3, shape: "pill" },
      { id: "rt", label: "Real-time channel", sub: "new post hints", col: 4.2, row: 1.7, shape: "pill" },
    ], edges: [
      { from: "ui", to: "store", both: true }, { from: "store", to: "data", both: true }, { from: "data", to: "api" }, { from: "rt", to: "data", dashed: true },
    ] },
    { type: "h3", text: "Data model and API" },
    { type: "ul", items: [
      "Normalise posts and users by ID in a client cache, and store the feed as an ordered list of post IDs plus a cursor, so a like updates one place and every view of that post re-renders. See [state management](/learn/frontend-state-management).",
      "`GET /feed?cursor=…&limit=20` returns posts, embedded authors and the next cursor. See [pagination](/learn/pagination).",
      "A server-sent events or WebSocket channel announces new posts; the client shows a \"new posts\" pill rather than shifting content under the user's finger. See [real-time communication](/learn/real-time-communication).",
      "`POST /posts/{id}/like` with an idempotency key, applied optimistically.",
    ] },
    { type: "h3", text: "Optimisations to discuss" },
    { type: "ul", items: [
      "[Virtualize](/learn/list-virtualization) the list so only visible posts are in the DOM; prefetch the next page before the user reaches the end.",
      "[Responsive, lazy-loaded images](/learn/image-optimization) with fixed aspect ratios to avoid layout shift; play videos only when visible.",
      "Server-render or statically render the shell for a fast first paint, then hydrate. See [rendering strategies](/learn/rendering-strategies).",
      "Optimistic likes with rollback on failure; a retry queue when offline.",
      "Skeleton states, error states with retry, and an empty state.",
      "Accessibility: semantic article elements, keyboard navigation, focus management when new content loads, alt text.",
    ] },

    { type: "h2", text: "What interviewers look for" },
    { type: "ul", items: [
      "**Clear separation** of server state, client state and UI.",
      "**Network awareness:** pagination, caching, deduplicated requests, cancellation of stale requests, behaviour on slow or flaky networks.",
      "**Performance with measurement:** naming [Core Web Vitals](/learn/core-web-vitals) and how each choice affects them.",
      "**Robustness:** loading, error, empty and offline states, not just the happy path.",
      "**Accessibility and internationalisation** as requirements, not afterthoughts.",
      "**Trade-offs stated out loud,** for example SSR's faster first paint vs its server cost.",
    ] },
    { type: "callout", tone: "tip", text: "Interviewers often probe one area deeply. Have a ready deep dive for infinite scroll, image loading, offline sync and real-time updates, since they come up again and again." },
  ],
  uses: [
    { name: "Feeds and timelines", text: "Virtualised lists, cursor pagination and optimistic interactions." },
    { name: "Autocomplete widgets", text: "Debounced input, request cancellation, cached results and keyboard-accessible suggestions." },
    { name: "Chat and collaboration", text: "Real-time channels, message ordering, offline outbox and presence." },
  ],
  interview: [
    "Follow requirements, architecture, data model, API, then deep dives.",
    "Normalise server data in a client cache and keep UI state separate.",
    "Design the API you need, including pagination and real-time updates.",
    "Cover loading, error, offline and accessibility states.",
  ],
  related: ["rendering-strategies", "frontend-state-management", "list-virtualization", "core-web-vitals", "real-time-communication"],
  practice: ["image-feed-client", "offline-first-sync", "collaborative-whiteboard"],
  reading: [
    { title: "web.dev: Learn Performance", publisher: "Google Chrome team", url: "https://web.dev/learn/performance" },
    { title: "WAI-ARIA Authoring Practices Guide", publisher: "W3C Web Accessibility Initiative", url: "https://www.w3.org/WAI/ARIA/apg/" },
  ],
};
