export default {
  blocks: [
    { type: "p", text: "A **content delivery network (CDN)** is a globally distributed network of caching servers (**edge locations** or points of presence) that serve content from close to users. Instead of every request crossing an ocean to your origin, most are answered from a server a few milliseconds away. CDNs cut latency, absorb traffic spikes and attacks, and dramatically reduce load and bandwidth at the origin." },

    { type: "h2", text: "How a request flows" },
    { type: "diagram", kind: "flow", caption: "Users hit the nearest edge. A cache hit returns immediately; a miss goes to the origin (often via a regional shield), and the edge stores the response for its TTL.", nodes: [
      { id: "u1", label: "User in Delhi", col: 0, row: 0, shape: "pill" },
      { id: "u2", label: "User in London", col: 0, row: 2, shape: "pill" },
      { id: "e1", label: "Edge: Mumbai", sub: "HIT", col: 1, row: 0, tone: "ok" },
      { id: "e2", label: "Edge: London", sub: "MISS", col: 1, row: 2, tone: "cache" },
      { id: "shield", label: "Origin shield", sub: "regional cache", col: 2, row: 1.5, tone: "cache" },
      { id: "origin", label: "Origin", sub: "app or object store", col: 3, row: 1.5, shape: "db", tone: "store" },
    ], edges: [
      { from: "u1", to: "e1", label: "~10 ms" }, { from: "u2", to: "e2" },
      { from: "e2", to: "shield" }, { from: "shield", to: "origin", label: "miss" },
    ] },
    { type: "p", text: "Users are directed to the nearest edge by [DNS](/learn/dns) or **anycast** (many edges share one IP and the network routes to the closest). An **origin shield**, a designated mid-tier cache, collapses misses from many edges into one request to the origin." },

    { type: "h2", text: "What a CDN caches" },
    { type: "ul", items: [
      "**Static assets**: JavaScript, CSS, fonts, images. Use **versioned file names** (`app.3f9a1c.js`) with long TTLs (a year) and `immutable`, so updates never need purging.",
      "**Media**: images (often resized and converted to WebP/AVIF at the edge) and video segments for streaming.",
      "**Downloads**: installers, game patches, software updates.",
      "**API responses and HTML** that are the same for many users, with short TTLs or `stale-while-revalidate`.",
      "Not personalised responses, unless the cache key includes what makes them differ (and then the hit rate drops).",
    ] },

    { type: "h2", text: "Controlling the cache" },
    { type: "table", head: ["Mechanism", "Purpose"], rows: [
      ["`Cache-Control: public, max-age=…`", "How long edges (and browsers) may serve the response without asking the origin"],
      ["`s-maxage`", "A separate TTL for shared caches like the CDN"],
      ["`stale-while-revalidate`", "Serve a slightly stale copy instantly while fetching a fresh one in the background"],
      ["Cache key", "What makes two requests \"the same\": URL, plus selected headers, cookies or query parameters. A sloppy key (including tracking parameters) destroys the hit rate"],
      ["Purge / invalidation", "Remove objects by URL, prefix or tag after a change. Prefer versioned URLs; use purges for mistakes and HTML"],
      ["Signed URLs / cookies", "Serve private content (paid videos) from the edge while restricting who can fetch it"],
    ] },

    { type: "h2", text: "Pull vs push" },
    { type: "ul", items: [
      "**Pull CDN** (most common): edges fetch from your origin on the first miss and cache it. Zero upfront work; the first user in each region pays the miss.",
      "**Push CDN**: you upload content to the CDN's storage ahead of time. Good for large files you know will be popular, like a game release.",
    ] },

    { type: "h2", text: "Video streaming" },
    { type: "p", text: "Streaming services encode each video into several qualities and cut them into segments of 2–6 seconds (HLS or DASH). Players request segments over HTTP, switching quality with bandwidth (adaptive bitrate). Because segments are just cacheable files, CDNs can serve enormous audiences: the origin barely sees the traffic of a popular stream." },

    { type: "h2", text: "Beyond caching" },
    { type: "ul", items: [
      "**DDoS protection and a WAF**: the CDN's huge capacity absorbs volumetric attacks before they reach you.",
      "**TLS termination near users** saves round trips on the handshake. See [HTTP versions](/learn/http).",
      "**Edge compute** (Cloudflare Workers, Lambda@Edge, Fastly Compute) runs small functions at the edge for redirects, A/B tests, authentication or personalisation.",
    ] },
  ],
  uses: [
    { name: "Netflix Open Connect", text: "Netflix places its own caching appliances inside ISPs' networks so most video bytes never cross the wider internet." },
    { name: "Cloudflare, Akamai, Fastly, CloudFront", text: "Commercial CDNs serving a large share of all web traffic, with edge compute, WAF and DDoS protection." },
    { name: "Software and game updates", text: "Operating system updates and game patches are distributed through CDNs to handle millions of simultaneous downloads." },
    { name: "Image-heavy apps", text: "Social and e-commerce apps serve resized, cached images from the edge; the origin stores originals in object storage." },
  ],
  interview: [
    "Put a CDN in front of static assets, images and video, and say what it saves: latency for users and egress and load at the origin.",
    "Use versioned asset URLs with long TTLs instead of relying on purges.",
    "For video, describe segmenting plus adaptive bitrate served from the CDN.",
    "Be explicit about what isn't cached (personalised data) and how private content is protected (signed URLs).",
  ],
  related: ["caching", "dns", "object-storage", "http", "cache-invalidation", "load-balancing"],
  practice: ["video-streaming", "image-feed-client", "file-storage", "url-shortener"],
};
