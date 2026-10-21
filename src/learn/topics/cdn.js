export default {
  blocks: [
    { type: "p", text: "A **content delivery network (CDN)** is a globally distributed network of caching servers (**edge locations** or points of presence, PoPs) that serve content from close to users. Instead of every request crossing an ocean to your origin, most are answered from a server a few milliseconds away. CDNs cut latency, absorb traffic spikes and attacks, and dramatically reduce load and bandwidth at the origin. The key architectural decision is what belongs at the CDN and what belongs in the [application cache](/learn/caching) behind it." },

    { type: "h2", text: "The problem a CDN solves" },
    { type: "p", text: "A news site keeps its videos in a New York data center. A user in Tokyo presses play, and the request travels about 11,000 km to New York and back: some 200 ms of network latency alone, and the video stutters. Then a clip goes viral: millions watch it, the origin takes 10,000 requests a second, bandwidth bills spike, and some requests time out." },
    { type: "p", text: "That latency is **physics, not engineering**: no server tuning removes the speed-of-light delay across the Pacific. A CDN fixes it by keeping cached copies at the network **edge**, near users. Tokyo viewers fetch the video from a Tokyo edge server in a few milliseconds, and the origin handles a fraction of the traffic because the edges absorb most of it." },
    { type: "diagram", kind: "flow", caption: "Without a CDN, a Tokyo user's request crosses the Pacific to the origin (~150 ms); with one, it is answered by a nearby edge server at local-network latency.", nodes: [
      { id: "u1", label: "User in Tokyo", col: 0, row: 0, shape: "pill" },
      { id: "o", label: "Origin", sub: "Virginia", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "u2", label: "User in Tokyo", col: 0, row: 1.3, shape: "pill" },
      { id: "e", label: "Edge server", sub: "Tokyo", col: 1.3, row: 1.3, tone: "ok" },
    ], edges: [{ from: "u1", to: "o", label: "~150 ms round trip", tone: "danger" }, { from: "u2", to: "e", label: "< 10 ms" }] },

    { type: "h2", text: "How a CDN works" },
    { type: "p", text: "You publish static files through the CDN, which replicates them to edge servers in major cities across continents: Los Angeles, London, Tokyo, Sydney and hundreds more. Users are routed to the nearest edge by [DNS](/learn/dns) or **anycast** (many edges share one IP and the network routes to the closest)." },
    { type: "diagram", kind: "flow", caption: "One origin, many edges: each region's users are served by their nearest edge, which only contacts the origin on a miss.", nodes: [
      { id: "us", label: "US users", col: 0, row: 0, shape: "pill" },
      { id: "eu", label: "EU users", col: 0, row: 1, shape: "pill" },
      { id: "as", label: "Asia users", col: 0, row: 2, shape: "pill" },
      { id: "la", label: "LA edge", col: 1.3, row: 0, tone: "ok" },
      { id: "lo", label: "London edge", col: 1.3, row: 1, tone: "ok" },
      { id: "to", label: "Tokyo edge", col: 1.3, row: 2, tone: "ok" },
      { id: "o", label: "Origin", sub: "app or object store", col: 2.7, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "us", to: "la" }, { from: "eu", to: "lo" }, { from: "as", to: "to" },
      { from: "la", to: "o", dashed: true, label: "miss" }, { from: "lo", to: "o", dashed: true }, { from: "to", to: "o", dashed: true },
    ] },
    { type: "p", text: "A London user requests `https://cdn.example.com/logo.png` and DNS sends them to the London edge. On a **cache hit**, the edge already has the file and returns it in about 5 ms. On a **cache miss**, it fetches the file from the origin (about 200 ms), stores it, and serves it; every later London user gets a hit. Requests start cold (every edge cache empty) and the edge hit rate climbs as popular files are cached; that hit rate is what determines how much traffic still reaches your origin." },
    { type: "diagram", kind: "sequence", caption: "CDN hit vs miss: a hit is answered by the edge without contacting the origin; a miss fetches from the origin once, stores the response, and the next request is a hit.", actors: ["User", "CDN edge", "Origin"], steps: [
      { from: 0, to: 1, label: "GET /img.png" },
      { from: 1, to: 0, label: "HIT: cached copy (5–30 ms)", dashed: true },
      { note: "a file this edge hasn't seen yet", over: [0, 2] },
      { from: 0, to: 1, label: "GET /new.png" },
      { from: 1, to: 2, label: "MISS: fetch from origin", tone: "danger" },
      { from: 2, to: 1, label: "response (100–200 ms RTT)", dashed: true },
      { from: 1, to: 0, label: "return + store in edge cache", dashed: true },
    ] },
    { type: "p", text: "Files are cached for their **TTL**: perhaps 24 hours for a logo that rarely changes, 5 minutes for frequently updated content. After it expires, the edge fetches a fresh copy. CDNs cut latency through proximity, cut origin load by serving cached copies, and improve availability by spreading traffic over many servers." },

    { type: "h2", text: "What CDNs handle well" },
    { type: "p", text: "CDNs cache at the **HTTP level**: they store complete responses (headers and body) keyed mainly by URL, plus the host and any headers named in `Vary`. That fits content that is:" },
    { type: "ul", items: [
      "**Public and identical for everyone**: a product image, a JavaScript bundle, a marketing page. Every user gets the same bytes, so each edge keeps one copy for all nearby users.",
      "**Rarely changing**: a CSS file changes on deploy, not between requests, so it can be cached for days or weeks. When it changes, deploy it under a new, content-hashed file name (`app.3f9a1c.js`), so the old copy is never stale: it's simply never requested again. Use long TTLs (a year) and `immutable`.",
      "**Tolerant of staleness**: a blog post cached for 5 minutes means a typo fix takes 5 minutes to reach everyone, which is fine for most static content.",
    ] },
    { type: "p", text: "So CDNs are the right choice for images, video, fonts, compiled assets, downloads (installers, game patches), documentation and pre-rendered pages: anything where the response is the same no matter who asks." },

    { type: "h2", text: "Where CDNs fall short" },
    { type: "ul", items: [
      "**Personalized responses.** A feed, a cart or a notification count differs per user. Caching it at the edge means either serving everyone the same generic response (losing personalization) or storing billions of per-user entries at every edge (impractical).",
      "**High-cardinality keys.** A search API with millions of possible queries gets a poor hit rate at any single edge: the Tokyo edge may see each unique query only once.",
      "**Consistency-sensitive data.** Inventory counts, auction bids and balances must be accurate in real time. Even a 5-second edge TTL can let a customer buy something that has already sold out.",
    ] },
    { type: "p", text: "For these, use the **application cache** instead: it sits behind the CDN, near the application servers, and caches at the **data** level." },

    { type: "h2", text: "Application cache: data-level caching" },
    { type: "p", text: "An application cache (Redis, Memcached) stores individual **data objects**, such as a user record, a product's metadata or a computed feed, not whole HTTP responses. That distinction matters: an HTTP-cached page ties the cache key to one URL, while a cached object can be assembled into **any** response. The same cached user profile serves the profile page, the settings page and the activity feed, and one invalidation updates all three." },
    { type: "diagram", kind: "flow", caption: "Data-level caching: one cached user object feeds several different pages, so a single invalidation refreshes them all.", nodes: [
      { id: "p1", label: "Profile page", col: 0, row: 0 },
      { id: "p2", label: "Settings page", col: 0, row: 1 },
      { id: "p3", label: "Activity feed", col: 0, row: 2 },
      { id: "c", label: "App cache", sub: "user:42 → {name, prefs}", col: 1.6, row: 1, tone: "ok" },
      { id: "db", label: "Database", col: 3, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "p1", to: "c" }, { from: "p2", to: "c" }, { from: "p3", to: "c" }, { from: "c", to: "db", label: "miss", dashed: true }] },
    { type: "p", text: "Application caching covers what CDNs can't: per-user data, complex aggregations and computed results that don't map cleanly to one URL." },

    { type: "h2", text: "Origin shielding" },
    { type: "p", text: "On a miss, an edge fetches from the origin. With 200 edge servers worldwide, a popular page that expires at all of them at once sends **200 requests** to your origin at the same moment, and across thousands of URLs that becomes a constant barrage." },
    { type: "p", text: "**Origin shielding** adds a cache tier between the edges and the origin. Instead of each edge fetching from the origin, edges go through a designated **shield PoP** (or a few). The shield either has the object cached or fetches it from the origin **once**. The origin sees roughly one request per object per shield instead of one per edge, which matters most when caches expire or traffic spikes and many edges discover at once that their copy is stale." },
    { type: "diagram", kind: "flow", caption: "Origin shielding: many edges miss at once, but the shield collapses them into a single request to the origin.", nodes: [
      { id: "e1", label: "Edge 1", col: 0, row: 0, tone: "cache" },
      { id: "e2", label: "Edge 2", col: 0, row: 1, tone: "cache" },
      { id: "e3", label: "Edge 200", col: 0, row: 2, tone: "cache" },
      { id: "s", label: "Shield PoP", sub: "regional cache", col: 1.4, row: 1, tone: "accent" },
      { id: "o", label: "Origin", col: 2.8, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "e1", to: "s", label: "miss" }, { from: "e2", to: "s", label: "miss" }, { from: "e3", to: "s", label: "miss" }, { from: "s", to: "o", label: "1 request" }] },
    { type: "p", text: "Most CDNs offer shielding as a setting. Mention it in interviews about high-traffic systems: it shows you know the [thundering herd problem](/learn/cache-failure-modes) exists at the edge too." },

    { type: "h2", text: "Deciding what goes where" },
    { type: "table", head: ["Data", "CDN", "App cache", "Why"], rows: [
      ["Static assets (JS, CSS, images)", "Yes", "No", "Same for all users, changes rarely"],
      ["Public pages (marketing, docs)", "Yes", "No", "Identical responses, tolerate staleness"],
      ["Personalized API responses", "No", "Yes", "Vary by user; need data-level control"],
      ["Hot database objects", "No", "Yes", "Need fine-grained invalidation"],
      ["Semi-static API (product catalog)", "Yes", "Yes", "CDN for the pages, app cache for partial updates"],
    ] },
    { type: "p", text: "\"Yes\" for the CDN assumes the response is public and identical for everyone; personalized or login-gated responses usually bypass the CDN (or need careful cache-key variation) even when the data looks static. For most systems the split is simple: CDN for static assets and public pages, application cache for everything else. The interesting case is the hybrid **fragment** approach: a product page's static layout shell is CDN-cached for hours, while personalized pieces (price, stock, recommendations) are fetched separately from the application cache and refresh every few seconds, each part expiring on its own schedule." },

    { type: "h2", text: "Controlling the cache" },
    { type: "table", head: ["Mechanism", "Purpose"], rows: [
      ["`Cache-Control: public, max-age=…`", "How long edges (and browsers) may serve the response without asking the origin"],
      ["`s-maxage`", "A separate TTL for shared caches like the CDN"],
      ["`stale-while-revalidate`", "Serve a slightly stale copy instantly while fetching a fresh one in the background"],
      ["Cache key and `Vary`", "What makes two requests \"the same\": URL, plus selected headers, cookies or query parameters. A sloppy key (including tracking parameters) destroys the hit rate"],
      ["Purge / invalidation", "Remove objects by URL, prefix or tag after a change. Prefer versioned URLs; use purges for mistakes and HTML"],
      ["Signed URLs / cookies", "Serve private content (paid videos) from the edge while restricting who can fetch it"],
    ] },

    { type: "h2", text: "Pull vs push" },
    { type: "ul", items: [
      "**Pull CDN** (most common): edges fetch from your origin on the first miss and cache it. Zero upfront work; the first user in each region pays the miss.",
      "**Push CDN**: you upload content to the CDN's storage ahead of time. Good for large files you know will be popular, like a game release.",
    ] },

    { type: "h2", text: "Video streaming" },
    { type: "p", text: "Streaming services encode each video into several qualities and cut them into segments of 2–6 seconds (HLS or DASH). Players request segments over HTTP, switching quality with bandwidth (adaptive bitrate). Because segments are just cacheable files, CDNs can serve enormous audiences: the origin barely sees the traffic of a popular stream. See [video streaming](/learn/video-streaming-adaptive-bitrate)." },

    { type: "h2", text: "Beyond caching" },
    { type: "ul", items: [
      "**DDoS protection and a WAF**: the CDN's huge capacity absorbs volumetric attacks before they reach you.",
      "**TLS termination near users** saves round trips on the handshake. See [HTTP versions](/learn/http).",
      "**Edge compute** (Cloudflare Workers, Lambda@Edge, Fastly Compute) runs small functions at the edge for redirects, A/B tests, authentication or personalization.",
    ] },

    { type: "h2", text: "Common CDNs" },
    { type: "table", head: ["CDN", "Strengths", "Good for"], rows: [
      ["Cloudflare", "Global network with built-in DDoS protection and a web application firewall; easy setup and a free tier", "Small and mid-sized apps that prioritize security and simplicity"],
      ["AWS CloudFront", "Tight integration with S3 and Lambda@Edge; custom cache behaviors and edge compute", "AWS-based apps needing programmatic cache control"],
      ["Akamai", "One of the largest networks with the most edge servers; image optimization and predictive prefetching", "Large enterprises with complex global delivery"],
      ["Fastly", "Instant purges and programmable edge (Compute)", "Sites needing very fast invalidation and edge logic"],
    ] },
  ],
  uses: [
    { name: "Netflix Open Connect", text: "Netflix places its own caching appliances inside ISPs' networks so most video bytes never cross the wider internet." },
    { name: "Viral videos and news", text: "Edges absorb millions of identical requests for the same clip; the origin serves each segment roughly once per shield." },
    { name: "Software and game updates", text: "Operating system updates and game patches are distributed through CDNs to handle millions of simultaneous downloads." },
    { name: "Image-heavy apps", text: "Social and e-commerce apps serve resized, cached images from the edge; the origin stores originals in [object storage](/learn/object-storage)." },
  ],
  interview: [
    "Put a CDN in front of static assets, images and video, and say what it saves: latency for users, egress and load at the origin.",
    "Keep personalized, high-cardinality and consistency-critical data out of the CDN; cache it at the data level in Redis instead.",
    "Use versioned asset URLs with long TTLs instead of relying on purges, and mention origin shielding for very high traffic.",
    "For pages that mix both, describe the fragment approach: a CDN-cached shell plus dynamic data from the app cache.",
  ],
  related: ["caching", "browser-caching", "dns", "object-storage", "http", "cache-invalidation", "video-streaming-adaptive-bitrate"],
  practice: ["video-streaming", "image-feed-client", "file-storage", "url-shortener"],
};
