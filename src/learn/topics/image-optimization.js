export default {
  blocks: [
    { type: "p", text: "**Image optimization** means delivering each image in the smallest format and size that still looks right on the user's screen, at the moment it's needed, without making the layout jump. Images are usually the largest part of a page's weight and often its largest contentful element, so they drive both load time and [Core Web Vitals](/learn/core-web-vitals). The main levers are modern formats, responsive sizes, lazy loading, reserved space and an image CDN." },

    { type: "h2", text: "Choose the right format" },
    { type: "table", head: ["Format", "Best for", "Notes"], rows: [
      ["AVIF", "Photos and complex images", "Usually the smallest files at a given quality; slower to encode"],
      ["WebP", "Photos and graphics", "Much smaller than JPEG and PNG, with very broad support"],
      ["JPEG", "Photos (fallback)", "Universal; use progressive encoding"],
      ["PNG", "Images needing lossless quality or simple transparency", "Large for photos; often replaceable with WebP"],
      ["SVG", "Icons, logos, illustrations", "Vector, tiny, scales perfectly; sanitise user-supplied SVGs"],
    ] },
    { type: "p", text: "Serve modern formats with fallbacks using the `<picture>` element, or let an image CDN negotiate the format from the browser's `Accept` header." },

    { type: "h2", text: "Serve the right size" },
    { type: "p", text: "A 4000-pixel-wide photo shown in a 360-pixel phone column wastes most of its bytes. Responsive images let the browser choose:" },
    { type: "code", code: `
<img
  src="/img/shoe-800.avif"
  srcset="/img/shoe-400.avif 400w, /img/shoe-800.avif 800w, /img/shoe-1600.avif 1600w"
  sizes="(max-width: 600px) 100vw, 400px"
  width="800" height="600"
  alt="Blue running shoe, side view"
  loading="lazy" decoding="async">
` },
    { type: "ul", items: [
      "`srcset` lists available widths; `sizes` tells the browser how wide the image will be in the layout, so it can pick the smallest adequate file for the screen's pixel density.",
      "`width` and `height` (or CSS `aspect-ratio`) reserve space before the image loads, preventing layout shift.",
      "`alt` text describes the image for screen readers; decorative images get an empty `alt`.",
    ] },

    { type: "h2", text: "Load at the right time" },
    { type: "ul", items: [
      "**Lazy-load** images below the fold with `loading=\"lazy\"` or an IntersectionObserver, so they don't compete with critical resources.",
      "**Never lazy-load the LCP image.** Preload it or give it `fetchpriority=\"high\"` so the browser fetches it early.",
      "**Placeholders:** a dominant colour, a tiny blurred preview, or a skeleton makes loading feel faster.",
      "**Prefetch** images likely to be needed next, such as the next page in a gallery, when the network is idle.",
    ] },

    { type: "h2", text: "Image CDNs and pipelines" },
    { type: "diagram", kind: "flow", caption: "Upload once; an image service generates sizes and formats on demand, caches them at the edge, and serves each device the best variant.", nodes: [
      { id: "up", label: "Upload", sub: "original", col: 0, row: 1, shape: "pill" },
      { id: "store", label: "Object storage", sub: "originals", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "svc", label: "Image service", sub: "resize · format · quality", col: 2.6, row: 1, tone: "accent" },
      { id: "cdn", label: "CDN edge cache", col: 3.9, row: 1, tone: "cache" },
      { id: "dev", label: "Devices", sub: "w=400&format=avif", col: 5.1, row: 1, shape: "pill" },
    ], edges: [
      { from: "up", to: "store" }, { from: "store", to: "svc" }, { from: "svc", to: "cdn" }, { from: "cdn", to: "dev" },
    ] },
    { type: "ul", items: [
      "Store originals in [object storage](/learn/object-storage) and generate variants (sizes, formats, crops) on demand or at upload time.",
      "Cache variants at the [CDN](/learn/cdn) with long lifetimes; the URL includes the transformation parameters, so each variant is its own cache key.",
      "Limit allowed sizes to a small set, so attackers can't force you to generate millions of variants, and so cache hit rates stay high.",
      "Strip metadata such as GPS location from user uploads for privacy, and scan uploads for safety.",
    ] },
    { type: "callout", tone: "tip", text: "On mobile apps the same ideas apply: request images sized for the device, cache them on disk with an LRU limit, decode off the main thread, and cancel loads for cells that scroll away." },
  ],
  uses: [
    { name: "E-commerce", text: "Product images in AVIF or WebP at several widths, with the main product photo preloaded as the LCP element." },
    { name: "Social apps", text: "Uploads are processed into thumbnails and feed sizes, served from an image CDN with blurred placeholders." },
    { name: "News sites", text: "Responsive hero images and lazy-loaded inline images keep article pages fast on slow networks." },
  ],
  interview: [
    "Pick AVIF or WebP with fallbacks, and SVG for icons.",
    "Use srcset and sizes so devices download the right width.",
    "Reserve space to avoid CLS and never lazy-load the LCP image.",
    "Describe an image CDN that generates and caches variants.",
  ],
  related: ["core-web-vitals", "cdn", "object-storage", "list-virtualization", "browser-caching"],
  practice: ["image-feed-client"],
  reading: [
    { title: "Responsive images", publisher: "MDN Web Docs (Mozilla)", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images" },
    { title: "Learn Images", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/learn/images" },
  ],
};
