// Stateless vs stateful servers: the lost-cart problem, sticky sessions, client-side state and
// shared session stores, and why scalable web tiers are stateless.
export default {
  blocks: [
    { type: "p", text: "A server is **stateful** when it keeps data about a user (a login session, a shopping cart) in its own memory between requests, so that user's next request must come back to the same server. A server is **stateless** when it keeps nothing between requests: every request carries or points to everything needed, so **any server can handle any request**. Stateless servers are what make [horizontal scaling](/learn/scalability) and [load balancing](/learn/load-balancing) work, which is why almost every modern web tier is stateless." },

    { type: "h2", text: "The problem: the disappearing shopping cart" },
    { type: "p", text: "Take an online store that has grown to several web servers behind a load balancer. Shopping carts are usually built on user **sessions**, and a simple session implementation keeps each session in the memory of the server that created it." },
    { type: "p", text: "A user adds a bag of dog food to their cart. Server 1 handles that request, creates a session and sets a cookie for it. The user's next request goes to server 2, which has never heard of that session. The cart is empty. The user is (rightly) frustrated." },
    { type: "diagram", kind: "sequence", caption: "Session state kept in one server's memory: the second request lands on a different server and the cart has vanished.", actors: ["User", "Load balancer", "Server 1", "Server 2"], steps: [
      { from: 0, to: 1, label: "add dog food to cart" },
      { from: 1, to: 2, label: "forward" },
      { note: "server 1 stores the cart in its memory", over: [2] },
      { from: 2, to: 0, label: "Set-Cookie: session=abc", dashed: true },
      { from: 0, to: 1, label: "view cart (session=abc)" },
      { from: 1, to: 3, label: "forward" },
      { from: 3, to: 0, label: "cart is empty ✗", dashed: true, tone: "danger" },
    ] },
    { type: "p", text: "The root cause: session data (the **state**) is stored inside each server, so the servers are **stateful**. There are two ways out: make the load balancer always send a user to the same server, or remove the state from the servers." },

    { type: "h2", text: "Option 1: sticky sessions (stay stateful)" },
    { type: "p", text: "Configure the load balancer for **session affinity** (\"sticky sessions\"): it remembers which server each user started on and sends all of that user's requests there for the rest of the session. The server keeps the session state and keeps working. It works, but it has real costs:" },
    { type: "ul", items: [
      "**Server failure loses sessions.** If the server dies, every session stored on it is gone, and those users lose their carts or get logged out.",
      "**Harder to scale.** The load balancer has to track a mapping from each user to a server, which is itself state it must maintain.",
      "**Uneven load.** Traffic can't be spread freely: some servers end up overloaded with long sessions while others sit idle, and new servers only receive new users.",
    ] },

    { type: "h2", text: "Option 2: make the servers stateless" },
    { type: "p", text: "Move the state out of the web servers. There are two places to put it: on the **client**, or in a **shared store** that every server can reach." },
    { type: "h3", text: "Keep state on the client" },
    { type: "p", text: "Store the cart in the user's browser or app, for example in Local Storage or IndexedDB in a browser, or Core Data on iOS:" },
    { type: "ol", items: [
      "When the user adds an item, the client saves the cart in its own storage.",
      "Every later request sends the cart data along, in the body or a custom header.",
      "The server uses the cart it was sent (to compute the total, apply discounts) and responds. It remembers nothing between requests.",
    ] },
    { type: "diagram", kind: "flow", caption: "Client-side state: the browser keeps the cart and sends it with each request, so any server can answer.", nodes: [
      { id: "c", label: "Browser", sub: "cart in Local Storage", col: 0, row: 1, tone: "cache" },
      { id: "lb", label: "Load balancer", col: 1.3, row: 1, tone: "accent" },
      { id: "s1", label: "Server 1", sub: "stateless", col: 2.6, row: 0 },
      { id: "s2", label: "Server 2", sub: "stateless", col: 2.6, row: 1 },
      { id: "s3", label: "Server 3", sub: "stateless", col: 2.6, row: 2 },
    ], edges: [{ from: "c", to: "lb", label: "request + cart" }, { from: "lb", to: "s1" }, { from: "lb", to: "s2" }, { from: "lb", to: "s3" }] },
    { type: "p", text: "There are several places on the client to keep state:" },
    { type: "table", head: ["Client storage", "Good for", "Pros", "Cons", "Use when"], rows: [
      ["**Cookies**", "Sessions, login, preferences such as language or a small cart", "Supported everywhere; sent automatically with every HTTP request", "Small (about 4 KB); security risks such as CSRF if mishandled", "Small data that the server needs on every request and that must persist across visits"],
      ["**Local Storage / Session Storage**", "Settings (theme, layout); session storage for temporary data like a multi-step form", "Simple API; larger (roughly 5–10 MB)", "Local storage never expires on its own; session storage ends with the tab", "Long-lived client data (local) or one-session data (session)"],
      ["**IndexedDB**", "Large datasets, offline-first apps (a notes app storing notes for offline use)", "Large, structured, asynchronous", "More complex API", "Complex apps that store and query lots of data on the client. See [offline-first sync](/learn/offline-first-sync)"],
      ["**Client-side JavaScript state libraries (Redux for React, Vuex/Pinia for Vue)**", "Global UI state in single-page apps: login status, shared user data across components", "Centralized and easy to debug", "Extra complexity; overkill for simple apps", "SPAs with complex state. See [frontend state management](/learn/frontend-state-management)"],
      ["**JWT (JSON Web Tokens)**", "Carrying the user's identity and claims to APIs after login", "Stateless authentication; self-contained; works across domains", "Where to store it is tricky; exposed to XSS if stored carelessly", "RESTful APIs and SPAs that need security, scale and cross-domain access. See [authentication](/learn/authentication-authorization)"],
    ] },
    { type: "callout", tone: "warning", text: "Never trust state that comes from the client. A cart sent by the browser can be edited, so the server must re-check prices, stock and discounts every time; signed tokens (JWTs) can be trusted only after verifying the signature." },
    { type: "h3", text: "Keep state in a shared store" },
    { type: "p", text: "Put an in-memory store such as **Redis** or **Memcached** behind the web servers, shared by all of them:" },
    { type: "ol", items: [
      "When the user adds an item, the server creates a session and saves the cart in the shared store.",
      "It sends the browser a session identifier, typically in a session cookie.",
      "The browser sends that identifier with every request.",
      "Whichever server receives the request uses the identifier to load the session (the cart) from the shared store, makes the change and saves it back.",
    ] },
    { type: "diagram", kind: "flow", caption: "Shared session store: any server can load any user's session from Redis using the session ID in the cookie.", nodes: [
      { id: "c", label: "Browser", sub: "cookie: session=abc", col: 0, row: 1 },
      { id: "lb", label: "Load balancer", col: 1.2, row: 1, tone: "accent" },
      { id: "s1", label: "Server 1", col: 2.4, row: 0 },
      { id: "s2", label: "Server 2", col: 2.4, row: 1 },
      { id: "s3", label: "Server 3", col: 2.4, row: 2 },
      { id: "r", label: "Redis / Memcached", sub: "session abc → cart", col: 3.7, row: 1, tone: "cache" },
    ], edges: [
      { from: "c", to: "lb" }, { from: "lb", to: "s1" }, { from: "lb", to: "s2" }, { from: "lb", to: "s3" },
      { from: "s1", to: "r" }, { from: "s2", to: "r" }, { from: "s3", to: "r" },
    ] },
    { type: "p", text: "Because every server can reach the store, sessions survive any one server failing, and the load balancer can send each request anywhere. Redis and Memcached keep data in memory, so lookups are much faster than a database. They're the standard choice for session storage, and clouds offer them as managed services (for example AWS ElastiCache for Redis and Memcached). Make the store itself highly available, since it is now a critical dependency; see [cache high availability](/learn/cache-high-availability)." },

    { type: "h2", text: "Which to use" },
    { type: "table", head: ["", "Sticky sessions", "Client-side state", "Shared session store"], rows: [
      ["Where state lives", "One server's memory", "Browser or app", "Redis / Memcached"],
      ["Server failure", "Sessions on it are lost", "No effect", "No effect (if the store is replicated)"],
      ["Load balancing", "Uneven, user pinned", "Free", "Free"],
      ["Limits", "Hard to scale", "Size limits; must not trust client data", "An extra dependency and network hop"],
      ["Good for", "Legacy apps you can't change", "Preferences, small carts, JWT identity", "Logins, carts, anything sensitive or large"],
    ] },
    { type: "p", text: "Most modern production systems run **stateless web servers**: compute is the cheap, easy-to-add resource and can scale almost without limit, and [autoscaling](/learn/autoscaling) can add servers when demand rises and remove them when it falls. State goes to the client, to a shared cache, or to the database; never into one server's memory." },
    { type: "p", text: "The same rule covers other kinds of state: put uploaded files in [object storage](/learn/object-storage) rather than on local disk, and put background work on a [queue](/learn/message-queues) rather than in in-process threads that die with the server." },
  ],
  uses: [
    { name: "E-commerce carts", text: "Logged-out carts often live in a cookie or local storage; logged-in carts in a shared store or database, so they follow the user across devices." },
    { name: "Login sessions", text: "Session IDs in cookies backed by Redis (Reddit moved its sessions from server memory to Redis to scale out), or self-contained JWTs." },
    { name: "Autoscaled web fleets", text: "Kubernetes and cloud autoscaling groups add and remove identical stateless instances freely because no instance holds user data." },
    { name: "Serverless functions", text: "Functions are stateless by design; anything that must persist goes to a database, cache or object store." },
  ],
  interview: [
    "Say your app servers are stateless and name where state lives (Redis sessions, JWT, database, object storage).",
    "If sticky sessions come up, explain why they hurt failover and load balancing.",
    "Re-validate anything stored on the client before trusting it.",
    "Make the shared session store highly available, since every request now depends on it.",
  ],
  related: ["scalability", "load-balancing", "autoscaling", "authentication-authorization", "redis", "caching"],
  practice: ["url-shortener", "chat-system", "ticket-booking"],
};
