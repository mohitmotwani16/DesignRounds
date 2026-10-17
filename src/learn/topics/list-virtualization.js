export default {
  blocks: [
    { type: "p", text: "**Infinite scroll** loads more content as the user nears the end of a list, and **list virtualization** (windowing) keeps only the items near the viewport in the page, recycling them as the user scrolls. Together they let a feed, chat history or product grid hold thousands of items while staying smooth. Done badly, infinite scroll causes jank, memory bloat, lost scroll positions and an unreachable footer." },

    { type: "h2", text: "Why rendering everything fails" },
    { type: "p", text: "Each item adds DOM nodes, images and event listeners. A feed of 2,000 posts can mean hundreds of thousands of DOM nodes: layout and style recalculation slow down, memory grows until mobile browsers kill the tab, and every state update re-renders a huge tree, which hurts [INP](/learn/core-web-vitals)." },

    { type: "h2", text: "How virtualization works" },
    { type: "diagram", kind: "flow", caption: "Only items in and near the viewport are rendered; spacers stand in for the rest so the scrollbar and total height stay correct.", nodes: [
      { id: "top", label: "Top spacer", sub: "height of items above", col: 0, row: 0, tone: "muted", w: 220 },
      { id: "over1", label: "Overscan buffer", sub: "a few items above", col: 0, row: 1, w: 220 },
      { id: "view", label: "Visible items", sub: "rendered DOM", col: 0, row: 2, tone: "accent", w: 220 },
      { id: "over2", label: "Overscan buffer", sub: "a few items below", col: 0, row: 3, w: 220 },
      { id: "bottom", label: "Bottom spacer", sub: "height of items below", col: 0, row: 4, tone: "muted", w: 220 },
    ], edges: [
      { from: "top", to: "over1" }, { from: "over1", to: "view" }, { from: "view", to: "over2" }, { from: "over2", to: "bottom" },
    ] },
    { type: "ul", items: [
      "Track the scroll position and compute which item indexes fall within the viewport plus an **overscan** margin.",
      "Render only those items, positioned with spacers or transforms so the total scroll height stays correct.",
      "**Fixed-height items** make position maths trivial; **variable-height items** (posts with images of different sizes) need measuring after render and caching each item's height, with estimates for items not yet measured.",
      "Keep item components cheap and memoised, with stable keys, so scrolling doesn't re-render everything.",
    ] },

    { type: "h2", text: "Loading more" },
    { type: "ul", items: [
      "Use **cursor pagination**, not offsets, so new items inserted at the top don't cause duplicates or skipped items. See [pagination](/learn/pagination).",
      "Trigger the next page with an **IntersectionObserver** on a sentinel element some distance before the end, so content arrives before the user hits the bottom.",
      "Deduplicate items by ID when pages overlap, and keep one request in flight at a time.",
      "Show skeleton placeholders while loading, an error with a retry button on failure, and a clear end-of-list state.",
      "Cap memory for very long sessions by dropping far-away pages from memory and refetching if the user scrolls back.",
    ] },

    { type: "h2", text: "Images in long lists" },
    { type: "ul", items: [
      "Reserve each image's space with known dimensions or an aspect ratio, so loading doesn't shift content (CLS) or break height calculations.",
      "Lazy-load images just outside the viewport and serve sizes matched to the layout. See [image optimization](/learn/image-optimization).",
      "Use low-quality placeholders or dominant-colour backgrounds while images load.",
      "Pause or unload videos that scroll out of view.",
    ] },

    { type: "h2", text: "UX and accessibility pitfalls" },
    { type: "ul", items: [
      "**Scroll restoration:** going to a detail page and back should return to the same item. Cache the loaded pages and scroll offset, and restore both.",
      "**New content at the top:** don't shift the list under the user; show a \"new posts\" button instead.",
      "**Unreachable footer:** if the page has a footer, use a \"load more\" button or put footer links elsewhere.",
      "**Screen readers and search:** virtualized items aren't in the DOM, so find-in-page and assistive technology can't see them. Use proper list semantics, announce loaded items with a live region, and consider pagination for content that must be fully navigable.",
      "**Keyboard focus:** keep focused items rendered and move focus sensibly when items load.",
    ] },
    { type: "callout", tone: "tip", text: "Mobile platforms solved this long ago: Android's RecyclerView and iOS's UICollectionView recycle cells the same way. The ideas carry over directly to mobile interviews." },
  ],
  uses: [
    { name: "Social feeds", text: "Virtualized variable-height posts with cursor-paginated loading and scroll restoration." },
    { name: "Chat apps", text: "Reverse-virtualized message history that loads older messages when scrolling up, anchored to keep position." },
    { name: "Data grids", text: "Row and column virtualization lets admin tools show tens of thousands of rows." },
  ],
  interview: [
    "Explain why rendering every item breaks performance and memory.",
    "Describe windowing with overscan, and handling variable heights.",
    "Load more with cursor pagination and an IntersectionObserver sentinel.",
    "Cover scroll restoration, new-item insertion and accessibility.",
  ],
  related: ["pagination", "image-optimization", "core-web-vitals", "frontend-system-design-interview", "frontend-state-management"],
  practice: ["image-feed-client"],
  reading: [
    { title: "Virtualize large lists with react-window", publisher: "web.dev (Google Chrome team)", url: "https://web.dev/articles/virtualize-long-lists-react-window" },
    { title: "Intersection Observer API", publisher: "MDN Web Docs (Mozilla)", url: "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API" },
  ],
};
