export default {
  blocks: [
    { type: "p", text: "**Core Web Vitals** are Google's user-centred measures of page experience: **Largest Contentful Paint (LCP)** for loading speed, **Interaction to Next Paint (INP)** for responsiveness, and **Cumulative Layout Shift (CLS)** for visual stability. They're measured on real users' devices and affect search ranking, but more importantly they track what makes a site feel fast. Web performance work is mostly about doing less work, later, on the critical path." },
    {"type":"diagram","kind":"flow","caption":"Where each Core Web Vital sits in a page load: LCP when the main content paints, CLS for anything that shifts it, INP when the user first interacts.","nodes":[{"id":"req","label":"Request","sub":"server responds","col":0,"row":0},{"id":"render","label":"First render","sub":"CSS, fonts","col":1,"row":0},{"id":"lcp","label":"Largest paint","sub":"LCP ≤ 2.5 s","col":2,"row":0,"tone":"ok"},{"id":"inp","label":"User interacts","sub":"INP ≤ 200 ms","col":3,"row":0,"tone":"accent"},{"id":"cls","label":"Layout shifts","sub":"CLS ≤ 0.1","col":2,"row":1,"tone":"danger"}],"edges":[{"from":"req","to":"render","label":"HTML"},{"from":"render","to":"lcp","label":"hero image"},{"from":"lcp","to":"inp"},{"from":"render","to":"cls","label":"late images, ads","dashed":true}]},

    { type: "h2", text: "The three metrics" },
    { type: "table", head: ["Metric", "Measures", "Good", "Poor", "Common causes of poor scores"], rows: [
      ["LCP", "Time until the largest image or text block in view is rendered", "≤ 2.5 s", "> 4 s", "Slow server response, render-blocking CSS and JS, large unoptimised hero images, client-side rendering"],
      ["INP", "Delay from a user interaction to the next frame painted, across the visit", "≤ 200 ms", "> 500 ms", "Long JavaScript tasks, heavy hydration, expensive re-renders, large DOM"],
      ["CLS", "How much visible content moves unexpectedly", "≤ 0.1", "> 0.25", "Images and ads without reserved space, late-loading fonts, content injected above existing content"],
    ] },
    { type: "p", text: "Thresholds are assessed at the 75th percentile of page visits, so a fast experience on your laptop says little about a mid-range phone on a congested network." },

    { type: "h2", text: "The critical rendering path" },
    { type: "p", text: "To show a page, the browser must fetch HTML, discover and fetch CSS (which blocks rendering), build the page structure and styles, run any synchronous JavaScript, lay out, and paint. Everything on that path delays the first meaningful paint." },
    { type: "ul", items: [
      "**Reduce server time:** cache HTML at a [CDN](/learn/cdn), prerender static pages, stream server-rendered HTML. See [rendering strategies](/learn/rendering-strategies).",
      "**Unblock rendering:** inline critical CSS, load the rest asynchronously, and use `defer` or `async` for scripts.",
      "**Prioritise the LCP resource:** preload the hero image, give it high fetch priority, and never lazy-load it.",
      "**Use fewer, smaller requests:** compress (Brotli), minify, and use HTTP/2 or HTTP/3 connection reuse. See [HTTP versions](/learn/http).",
    ] },

    { type: "h2", text: "Shipping less JavaScript" },
    { type: "ul", items: [
      "**Code splitting:** split bundles by route and load heavy components (editors, charts) only when needed.",
      "**Lazy loading:** load below-the-fold components and images when they approach the viewport.",
      "**Trim dependencies:** audit bundle size and replace heavy libraries with lighter ones or native APIs.",
      "**Hydrate less:** islands, server components or progressive enhancement avoid hydrating static content.",
      "**Move work off the main thread:** web workers for parsing and computation; break long tasks into smaller chunks so input can be handled in between.",
    ] },

    { type: "h2", text: "Responsiveness (INP)" },
    { type: "p", text: "INP is poor when the main thread is busy when the user taps or types. A JavaScript task longer than 50 ms blocks input. Keep event handlers short, show visual feedback immediately and do heavy work after yielding, debounce expensive handlers such as search-as-you-type, avoid re-rendering large component trees for small state changes, and [virtualize long lists](/learn/list-virtualization) so the DOM stays small." },

    { type: "h2", text: "Visual stability (CLS)" },
    { type: "ul", items: [
      "Always set `width` and `height` (or an aspect ratio) on images, videos and embeds so space is reserved. See [image optimization](/learn/image-optimization).",
      "Reserve space for ads and late-loading widgets.",
      "Insert new content below the viewport or behind a user action, such as a \"new posts\" button.",
      "Load fonts with fallbacks matched in size, and preload key fonts.",
    ] },

    { type: "h2", text: "Measure, budget and monitor" },
    { type: "ul", items: [
      "**Lab data** (Lighthouse, local profiling) is repeatable and good for debugging; **field data** (real user monitoring, the Chrome UX Report) shows what users actually experience. Use both.",
      "**Performance budgets:** set limits on JavaScript size, LCP and INP, and fail the build or alert when a change exceeds them.",
      "**Segment field data** by device class, network and page type to find where users struggle.",
    ] },
    { type: "callout", tone: "tip", text: "In an interview, connect every optimisation to the metric it improves. \"Preloading the hero image improves LCP; reserving its space prevents CLS\" is far stronger than a list of techniques." },
  ],
  uses: [
    { name: "E-commerce", text: "Faster LCP on product pages and stable layouts during checkout correlate with higher conversion." },
    { name: "News and media", text: "Reserved ad slots and lazy-loaded media keep CLS low on content-heavy pages." },
    { name: "Web apps", text: "Code splitting and smaller hydration improve INP on low-end phones." },
  ],
  interview: [
    "Define LCP, INP and CLS with their thresholds.",
    "Walk through the critical rendering path and how to shorten it.",
    "Ship less JavaScript: code splitting, lazy loading, less hydration.",
    "Measure in the field, set performance budgets and tie each fix to a metric.",
  ],
  related: ["rendering-strategies", "image-optimization", "browser-caching", "list-virtualization", "cdn"],
  practice: ["image-feed-client", "micro-frontend-platform"],
  reading: [
    { title: "Web Vitals", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/articles/vitals" },
    { title: "Optimize Interaction to Next Paint", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/articles/optimize-inp" },
  ],
};
