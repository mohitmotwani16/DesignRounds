export default {
  blocks: [
    { type: "p", text: "**Frontend state management** is how an application stores and updates the data its UI renders. The most useful distinction is between **local UI state** (is this dropdown open?), **global client state** (the current theme, the signed-in user, a multi-step form's progress) and **server state** (posts, orders, profiles that live on the server and are cached on the client). Each has different problems, and most bugs come from treating server state like local state." },

    { type: "h2", text: "Three kinds of state" },
    { type: "table", head: ["Kind", "Examples", "Owner", "Main problems", "Typical tools"], rows: [
      ["Local UI state", "Input value, hover, open modal", "One component", "Keeping it close to where it's used", "Component state"],
      ["Global client state", "Theme, auth session, feature flags, wizard progress", "The app", "Avoiding unnecessary re-renders, prop drilling", "Context, a small store"],
      ["Server state", "Feed posts, user profiles, cart, search results", "The server", "Caching, staleness, refetching, deduplication, pagination, optimistic updates, invalidation", "Data-fetching cache libraries (query or GraphQL clients)"],
      ["URL state", "Current page, filters, search query, selected tab", "The URL", "Shareable, bookmarkable, restored on back/forward", "The router"],
    ] },
    { type: "callout", tone: "tip", text: "Put state in the URL whenever a user would expect a link to reproduce it, such as search filters and the selected item. It's the most underused state store." },

    { type: "h2", text: "Server state is a cache" },
    { type: "p", text: "Data fetched from an API is a **copy** of the server's truth that can go stale. Treat it like any [cache](/learn/caching): it needs keys, freshness rules, invalidation and deduplication. Data-fetching libraries provide:" },
    { type: "ul", items: [
      "**Request deduplication:** ten components asking for the same user trigger one request.",
      "**Stale-while-revalidate:** show cached data immediately, refetch in the background, and update when fresh data arrives.",
      "**Invalidation:** after a mutation, mark related queries stale so they refetch (adding a comment invalidates that post's comment list).",
      "**Pagination and infinite queries:** cache pages by cursor. See [pagination](/learn/pagination).",
      "**Cancellation:** abort in-flight requests that are no longer needed, such as superseded search queries.",
    ] },

    { type: "h2", text: "Normalisation" },
    { type: "p", text: "If the same post appears in the feed, a search result and a detail page, storing three copies means a like updates one and the others show stale counts. A **normalised** cache stores each entity once by ID, and lists store IDs:" },
    { type: "code", code: `
entities: {
  posts: { "p1": { id: "p1", text: "...", likes: 12, author: "u7" } },
  users: { "u7": { id: "u7", name: "Asha" } },
}
feeds: { home: { ids: ["p1", "p4", "p9"], nextCursor: "c_123" } }
` },
    { type: "p", text: "Updating `posts.p1.likes` updates every view that renders post p1. GraphQL clients normalise automatically by type and ID; REST-based caches often keep per-query results and rely on invalidation instead, which is simpler but can show briefly inconsistent data." },

    { type: "h2", text: "Optimistic updates" },
    { type: "p", text: "For actions that usually succeed (likes, sending a message, reordering), update the UI immediately, send the request, and **roll back** if it fails, with a visible error. Combine with an [idempotency key](/learn/idempotency) so a retry after a timeout doesn't double-apply, and with a pending state for actions that are slower or riskier, such as payments." },
    { type: "diagram", kind: "sequence", caption: "An optimistic like: the UI updates instantly, the request runs in the background, and a failure rolls the change back.", actors: ["User", "UI cache", "API"], steps: [
      { from: 0, to: 1, label: "tap like" },
      { note: "likes 12 → 13 immediately", over: [1] },
      { from: 1, to: 2, label: "POST /like (idempotency key)" },
      { from: 2, to: 1, label: "200 OK (or error → rollback to 12)", dashed: true },
    ] },

    { type: "h2", text: "Global stores: when and how" },
    { type: "ul", items: [
      "Reach for a global store only for state that's genuinely app-wide and client-owned; most \"global state\" in older apps was server data that a fetching cache handles better.",
      "Subscribe components to the specific slices they need, so unrelated updates don't re-render the whole tree, which hurts [INP](/learn/core-web-vitals).",
      "Keep state transitions explicit (actions or events), which makes bugs reproducible and enables undo and time-travel debugging.",
      "Persist only what should survive reloads, such as drafts or preferences, and version it so old saved shapes don't break new code.",
    ] },
  ],
  uses: [
    { name: "Social feeds", text: "A normalised entity cache keeps like counts consistent across the feed, profile and detail views." },
    { name: "E-commerce", text: "Cart state is server-owned with optimistic updates; filters live in the URL for shareable searches." },
    { name: "Dashboards", text: "Stale-while-revalidate queries keep charts responsive while background refetches keep them fresh." },
  ],
  interview: [
    "Separate local, global client, server and URL state.",
    "Treat server state as a cache with keys, staleness and invalidation.",
    "Normalise entities by ID to keep views consistent.",
    "Use optimistic updates with rollback and idempotency keys.",
  ],
  related: ["frontend-system-design-interview", "caching", "pagination", "offline-first-sync", "core-web-vitals"],
  practice: ["image-feed-client", "offline-first-sync", "collaborative-whiteboard"],
  reading: [
    { title: "Normalizing State Shape", publisher: "Redux documentation", url: "https://redux.js.org/usage/structuring-reducers/normalizing-state-shape" },
    { title: "TanStack Query: Important defaults", publisher: "TanStack Query documentation", url: "https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults" },
  ],
};
