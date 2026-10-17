export default {
  blocks: [
    { type: "p", text: "A **rendering strategy** decides where and when a web page's HTML is produced. **Client-side rendering (CSR)** sends a mostly empty page and builds it in the browser with JavaScript. **Server-side rendering (SSR)** builds HTML on the server for every request. **Static site generation (SSG)** builds HTML once at deploy time. **Incremental static regeneration (ISR)** rebuilds static pages in the background after they go stale. Each trades first-load speed, freshness, server cost and complexity differently." },

    { type: "h2", text: "The four strategies compared" },
    { type: "table", head: ["", "CSR", "SSR", "SSG", "ISR"], rows: [
      ["HTML produced", "In the browser", "On the server, per request", "At build time", "At build time, then refreshed in the background"],
      ["First contentful paint", "Slow: wait for JS to download and run", "Fast", "Fastest (served from a CDN)", "Fastest"],
      ["Data freshness", "Live", "Live", "As of the last build", "Within the revalidation window"],
      ["Server cost", "Low (static files plus APIs)", "Highest: render every request", "Lowest", "Low"],
      ["SEO", "Weaker: crawlers must run JS", "Strong", "Strong", "Strong"],
      ["Personalised pages", "Easy", "Easy", "No (same HTML for everyone)", "No, unless combined with client fetching"],
      ["Good for", "Dashboards and apps behind login", "Personalised or fast-changing public pages", "Docs, blogs, marketing, handbooks", "Large catalogues that change occasionally"],
    ] },

    { type: "h2", text: "Hydration and its cost" },
    { type: "p", text: "With SSR and SSG, the browser receives complete HTML and paints it quickly. To make it interactive, the framework downloads the JavaScript and **hydrates**: it re-runs the components and attaches event handlers to the existing HTML. Until hydration finishes, buttons may not respond, which shows up in **Interaction to Next Paint (INP)**. Large pages with heavy JavaScript can look ready but feel broken for a few seconds on slow phones. See [Core Web Vitals](/learn/core-web-vitals)." },
    { type: "ul", items: [
      "**Partial or islands hydration:** only hydrate interactive parts (a search box, a carousel), leaving static content as plain HTML.",
      "**Streaming SSR:** send HTML in chunks as data becomes ready, so the top of the page paints before slow sections finish.",
      "**Server components:** render some components only on the server and send their output, shipping less JavaScript to the client.",
      "**Progressive enhancement:** make core content and links work without JavaScript, then enhance.",
    ] },

    { type: "h2", text: "Choosing a strategy" },
    { type: "diagram", kind: "flow", caption: "A quick decision path: public content that changes rarely is static; public content that's personalised or live is server-rendered; private app screens can render on the client.", nodes: [
      { id: "q1", label: "Must search engines index it?", col: 0, row: 1, tone: "accent", w: 200 },
      { id: "csr", label: "CSR", sub: "app behind login", col: 1.6, row: 2.2, tone: "cache" },
      { id: "q2", label: "Same for every visitor?", col: 1.6, row: 0.6, tone: "accent", w: 190 },
      { id: "ssg", label: "SSG / ISR", sub: "CDN-served", col: 3.2, row: 0, tone: "ok" },
      { id: "ssr", label: "SSR (streaming)", sub: "per request", col: 3.2, row: 1.2, tone: "store" },
    ], edges: [
      { from: "q1", to: "q2", label: "yes" }, { from: "q1", to: "csr", label: "no" },
      { from: "q2", to: "ssg", label: "yes" }, { from: "q2", to: "ssr", label: "no" },
    ] },
    { type: "p", text: "Most real sites mix strategies per route: a statically generated marketing site and handbook, server-rendered product pages, and a client-rendered app behind login. A common hybrid is a static or server-rendered shell with personalised parts fetched on the client." },
    { type: "callout", tone: "tip", text: "This handbook is an example: every page is prerendered to static HTML at build time for fast loads and indexing, then the app hydrates for interactive features like search and progress tracking." },

    { type: "h2", text: "Caching each strategy" },
    { type: "ul", items: [
      "**SSG output** is immutable per deploy and cached at the CDN edge. See [CDN](/learn/cdn).",
      "**SSR responses** can be cached briefly at the edge for anonymous users (`s-maxage` with `stale-while-revalidate`), but never shared when personalised.",
      "**ISR** is essentially edge caching with background regeneration on a timer or an explicit revalidation call when content changes.",
      "**CSR apps** cache their JavaScript bundles with content-hashed filenames and long lifetimes. See [browser caching](/learn/browser-caching).",
    ] },
  ],
  uses: [
    { name: "E-commerce", text: "SSG or ISR for category and product pages at scale, with prices and stock fetched on the client or via SSR." },
    { name: "News sites", text: "SSR or short-lived ISR keeps articles fresh and indexable within seconds of publishing." },
    { name: "SaaS dashboards", text: "CSR behind login, since SEO doesn't matter and data is per user." },
  ],
  interview: [
    "Compare CSR, SSR, SSG and ISR on first paint, freshness, cost and SEO.",
    "Explain hydration and its effect on interactivity.",
    "Choose per route rather than for the whole site.",
    "Describe how each strategy is cached at the CDN and in the browser.",
  ],
  related: ["core-web-vitals", "cdn", "browser-caching", "frontend-system-design-interview", "http"],
  practice: ["image-feed-client", "micro-frontend-platform"],
  reading: [
    { title: "Rendering on the Web", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/articles/rendering-on-the-web" },
    { title: "Islands Architecture", publisher: "patterns.dev", url: "https://www.patterns.dev/vanilla/islands-architecture/" },
  ],
};
