export default {
  blocks: [
    { type: "p", text: "**Browser caching** stores copies of responses on the user's device so repeat visits load faster and use less data. It's controlled mainly by HTTP headers: **Cache-Control** says how long a response may be reused and by whom, and **validators** such as **ETag** let the browser cheaply check whether its copy is still current. **Service workers** add a programmable cache for offline support and custom strategies. Getting the headers right is one of the highest-impact, lowest-effort performance wins." },

    { type: "h2", text: "Cache-Control directives" },
    { type: "table", head: ["Directive", "Meaning"], rows: [
      ["`max-age=N`", "The response is fresh for N seconds; reuse it without asking the server"],
      ["`s-maxage=N`", "Freshness for shared caches such as CDNs, overriding max-age there"],
      ["`no-cache`", "May be stored, but must be revalidated with the server before each use (not \"don't cache\")"],
      ["`no-store`", "Don't store at all; for sensitive responses"],
      ["`private`", "Only the user's browser may cache it, not shared caches; for personalised responses"],
      ["`public`", "Shared caches may store it"],
      ["`immutable`", "The content will never change at this URL; don't revalidate even on reload"],
      ["`stale-while-revalidate=N`", "Serve a stale copy for up to N seconds while fetching a fresh one in the background"],
    ] },

    { type: "h2", text: "Revalidation with ETags" },
    { type: "p", text: "When a cached response is stale, the browser asks the server whether it changed, sending its validator. If not, the server replies **304 Not Modified** with no body, saving bandwidth." },
    { type: "diagram", kind: "sequence", caption: "Conditional revalidation: the browser sends its ETag; the server returns 304 when nothing changed, so the cached body is reused.", actors: ["Browser", "Server"], steps: [
      { from: 0, to: 1, label: "GET /api/profile" },
      { from: 1, to: 0, label: "200 + ETag: \"v42\", Cache-Control: no-cache", dashed: true },
      { note: "later: copy must be revalidated", over: [0] },
      { from: 0, to: 1, label: "GET + If-None-Match: \"v42\"" },
      { from: 1, to: 0, label: "304 Not Modified (no body)", dashed: true },
    ] },

    { type: "h2", text: "A caching policy that works" },
    { type: "table", head: ["Resource", "Policy", "Why"], rows: [
      ["JS, CSS, fonts and images with a content hash in the filename (`app.3f9a1c.js`)", "`public, max-age=31536000, immutable`", "A changed file gets a new name, so old ones can be cached forever"],
      ["HTML pages", "`no-cache` (with an ETag) or a short max-age at the CDN", "HTML references the current hashed assets, so it must stay fresh"],
      ["Public API responses", "Short `max-age` or `s-maxage` with `stale-while-revalidate`", "Fast and mostly fresh; tune per endpoint"],
      ["Personalised API responses", "`private, no-cache` or `no-store`", "Never let a shared cache serve one user's data to another"],
      ["Sensitive data (banking, health)", "`no-store`", "Don't leave copies on shared devices"],
    ] },
    { type: "callout", tone: "warning", text: "Never give HTML a long max-age. If you do, users keep loading old HTML pointing at old assets, and a fix can't reach them until their cache expires." },

    { type: "h2", text: "Service worker caching" },
    { type: "p", text: "A **service worker** is a script that sits between the page and the network, intercepting requests. With the Cache Storage API it can implement strategies HTTP headers can't express, and it enables offline use and installable web apps." },
    { type: "table", head: ["Strategy", "How it works", "Use for"], rows: [
      ["Cache first", "Serve from cache; go to network only on a miss", "Versioned static assets, fonts"],
      ["Network first", "Try the network; fall back to cache when offline or slow", "HTML, frequently changing API data"],
      ["Stale-while-revalidate", "Serve from cache, update the cache from the network in the background", "Avatars, non-critical API data"],
      ["Network only / cache only", "Bypass or rely solely on the cache", "Payments (network only); precached app shell (cache only)"],
    ] },
    { type: "ul", items: [
      "**Precache** the app shell at install time for instant, offline-capable loads.",
      "**Version caches** and delete old ones when the service worker activates, or users can be stuck on stale code.",
      "**Plan updates:** a new service worker waits until all tabs using the old one close, unless you prompt users to refresh.",
      "Pair with an outbox for writes made offline. See [offline-first sync](/learn/offline-first-sync).",
    ] },

    { type: "h2", text: "Other browser storage" },
    { type: "p", text: "Beyond HTTP and service worker caches, apps store data in **IndexedDB** (large, structured, asynchronous; the right place for offline data), **localStorage** (small, synchronous strings; fine for preferences, not for large data or secrets) and cookies (sent with every request; keep them small). Browsers can evict storage under pressure unless persistent storage is granted, so treat client storage as a cache that may disappear." },
  ],
  uses: [
    { name: "Single-page apps", text: "Hashed bundles cached for a year, HTML revalidated on each load, so deploys take effect immediately." },
    { name: "Progressive web apps", text: "A service worker precaches the shell and serves content offline, syncing changes when online." },
    { name: "Content sites", text: "CDN `s-maxage` with `stale-while-revalidate` keeps pages fast and nearly fresh." },
  ],
  interview: [
    "Cache hashed assets as immutable for a year; keep HTML fresh.",
    "Explain no-cache vs no-store and ETag revalidation with 304.",
    "Mark personalised responses private so CDNs never share them.",
    "Choose service worker strategies per resource and version the caches.",
  ],
  related: ["cdn", "http", "caching", "offline-first-sync", "core-web-vitals"],
  practice: ["image-feed-client", "offline-first-sync"],
  reading: [
    { title: "HTTP caching", publisher: "MDN Web Docs (Mozilla)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
    { title: "Service worker caching and HTTP caching", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/articles/service-worker-caching-and-http-caching" },
  ],
};
