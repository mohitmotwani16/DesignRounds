export default {
  blocks: [
    { type: "p", text: "Any API that returns a list must **paginate**: return results a page at a time instead of all at once. Think of scrolling an Instagram feed. The app doesn't load thousands of photos up front; it loads 20–30, then fetches more as you scroll. The three common approaches are **offset pagination** (`?offset=40&limit=20`), **cursor pagination** (`?cursor=<token>`) and its time-based cousin, **keyset pagination** (`?before=<timestamp>`). Offset is simple but gets slow and inconsistent on large, changing data; cursors stay fast and stable, which is why large APIs use them." },

    { type: "h2", text: "Why pagination matters" },
    { type: "p", text: "Returning millions of records in one response is never an option for a feed or a large collection. Paging solves four problems at once:" },
    { type: "ul", items: [
      "**The server** isn't overwhelmed building huge result sets.",
      "**The client** (a phone or a browser tab) doesn't run out of memory or freeze handling too much data.",
      "**The network** carries only what the user will actually look at.",
      "**The user** gets a quick first screen and smooth scrolling.",
    ] },

    { type: "h2", text: "Offset pagination: the simple approach" },
    { type: "p", text: "Offset pagination works like page numbers in a book: \"give me 10 posts, starting after the first 20\"." },
    { type: "code", code: `GET /api/feed?limit=10&offset=20

SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;` },
    { type: "ul", items: [
      "**Pros**: trivial to implement; supports jumping to any page (\"page 7 of 20\") and showing total counts.",
      "**Cons: deep pages get slower and slower.** The database must still read and throw away every skipped row. A user on page 1,000 of a feed (10 per page) makes the database walk past 10,000 rows to return the next 10, and `OFFSET 1000000` reads a million rows. This is why Instagram doesn't page its feed this way.",
      "**Cons: results shift when data changes.** If a post is inserted while you're on page 2, the last item of page 2 slides onto page 3 and you see it twice; deletions make items get skipped.",
    ] },

    { type: "h2", text: "Cursor pagination: the scalable solution" },
    { type: "p", text: "This is what powers infinite-scroll feeds in modern APIs. Instead of counting rows to skip, the client keeps a **cursor**: a pointer to the last item it has seen." },
    { type: "code", code: "GET /api/feed?limit=10&cursor=eyJpZCI6MTAwfQ==" },
    { type: "p", text: "**How the chain works.** The first request has no cursor. Each response includes a `next_cursor` representing the position of its last item, and the client sends that cursor on the next request. Every response hands over the cursor for the following one." },
    { type: "diagram", kind: "sequence", caption: "Each page's response carries the cursor for the next request; the client never computes positions itself.", actors: ["Client", "Feed API", "Database"], steps: [
      { from: 0, to: 1, label: "GET /feed?limit=10" },
      { from: 1, to: 2, label: "newest 10 posts" },
      { from: 1, to: 0, label: "posts + next_cursor = A", dashed: true },
      { from: 0, to: 1, label: "GET /feed?limit=10&cursor=A" },
      { from: 1, to: 2, label: "10 posts older than A" },
      { from: 1, to: 0, label: "posts + next_cursor = B", dashed: true },
    ] },
    { type: "p", text: "The cursor is usually an encoded copy of the **sort key of the last item**. For a feed, that's the timestamp and ID of the last post:" },
    { type: "code", code: `def get_feed(limit=10, cursor=None):
    if cursor:
        last = decode_cursor(cursor)        # {"timestamp": "2024-03-15T10:02:00Z", "id": 123}
        query = """
            SELECT * FROM posts
            WHERE (created_at, id) < (:timestamp, :id)
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
        """
    else:
        query = "SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT :limit"

    posts = execute_query(query, last, limit)
    next_cursor = encode_cursor({"timestamp": posts[-1].created_at, "id": posts[-1].id}) if posts else None
    return {"posts": posts, "pagination": {"next_cursor": next_cursor}}` },
    { type: "p", text: "The query filters on **indexed** columns, so the database jumps straight to the right spot instead of counting through skipped rows." },
    { type: "diagram", kind: "flow", caption: "Offset reads and throws away every skipped row; a cursor seeks directly to the last item seen using the index.", nodes: [
      { id: "off", label: "OFFSET 100,000", col: 0, row: 0, tone: "danger", w: 150 },
      { id: "scan", label: "Read 100,020 rows", sub: "discard 100,000", col: 1.4, row: 0, tone: "danger", w: 170 },
      { id: "cur", label: "after = cursor", col: 0, row: 1, tone: "ok", w: 150 },
      { id: "seek", label: "Index seek", sub: "read 20 rows", col: 1.4, row: 1, tone: "ok", w: 170 },
      { id: "res", label: "Page of 20", col: 2.7, row: 0.5, shape: "pill" },
    ], edges: [{ from: "off", to: "scan" }, { from: "scan", to: "res" }, { from: "cur", to: "seek" }, { from: "seek", to: "res" }] },
    { type: "ul", items: [
      "**Constant cost** per page regardless of depth, given an index on the sort columns (for a per-user list, `(user_id, created_at, id)`). See [indexing](/learn/database-indexing).",
      "**Stable under writes**: new items don't shift later pages, so no duplicates or skips.",
      "**Unique, deterministic ordering is required**: add a tiebreaker (the ID) to the sort, otherwise rows with equal timestamps can be skipped or repeated.",
      "**Trade-off**: no jumping to page N, and total counts are expensive. Fine for feeds, timelines, logs and infinite scroll.",
    ] },

    { type: "h2", text: "Keyset pagination for time series" },
    { type: "p", text: "For time-ordered data such as chat messages or activity logs, you can page directly on the timestamp, which is readable and easy to cache:" },
    { type: "code", code: `GET /api/messages?limit=50&before=2024-03-15T00:00:00Z

CREATE INDEX idx_messages_timestamp ON messages (created_at DESC);` },
    { type: "p", text: "With the index, each page is a quick seek. Cursor pagination is really keyset pagination with the key hidden inside an opaque token; the token form is safer for public APIs because you can change what's inside it later." },

    { type: "h2", text: "Designing the cursor and response" },
    { type: "ul", items: [
      "Make cursors **opaque**: base64-encode the sort values (and maybe a version), so clients can't depend on the format and you can change it later.",
      "Return the next cursor along with a `has_more` flag; clients stop when it's null or false.",
      "Sign or validate cursors if tampering could expose data, and make them expire if the underlying sort can change.",
      "Support `limit` with a maximum (e.g. 100) to protect the server.",
    ] },
    { type: "code", code: `{
  "data": [ { "id": "o_981", "created_at": "2026-10-16T09:12:00Z", "total": 1499 } ],
  "pagination": {
    "next_cursor": "eyJjIjoiMjAyNi0xMC0xNlQwOToxMjowMFoiLCJpZCI6Im9fOTgxIn0",
    "has_more": true
  }
}` },

    { type: "h2", text: "What to discuss in an interview" },
    { type: "ol", items: [
      "**Consistency**: what happens when items are added while someone is paging? Cursors give a consistent view; offsets produce duplicates and gaps.",
      "**Performance**: how does the cost grow with depth? `SELECT … LIMIT 10 OFFSET 1000000` scans a million rows; `SELECT … WHERE id < :last_seen_id LIMIT 10` uses the index and costs the same on every page.",
      "**Response format**: return metadata the client needs (`next_cursor`, `has_more`) so it never has to guess.",
    ] },

    { type: "h2", text: "Which to use" },
    { type: "table", head: ["Situation", "Use"], rows: [
      ["Admin dashboard or small table with page numbers", "Offset"],
      ["Social feeds, timelines, infinite scroll (the next Twitter)", "Cursor"],
      ["Chat history, activity logs, other time series", "Keyset on timestamp (plus ID as tiebreaker)"],
      ["Public APIs over large or growing collections", "Cursor"],
      ["Sync or export of all records", "Cursor over a stable key (ID, or updated_at + ID)"],
      ["Search results ranked by relevance", "Engine-specific (`search_after` in Elasticsearch, or a capped offset)"],
    ] },
    { type: "p", text: "Explain the choice, not just the name: \"I'm using cursor pagination for this feed because users scroll through thousands of posts and every page must be equally fast no matter how deep they go.\"" },
  ],
  uses: [
    { name: "Stripe API", text: "List endpoints use `starting_after` and `ending_before` object IDs with `has_more`, a cursor approach." },
    { name: "Twitter / X and Facebook Graph API", text: "Timelines use cursor tokens (`next_token`, `max_id`, `next` cursors) so new posts don't disturb paging. See [API design](/learn/api-design)." },
    { name: "Slack and GitHub GraphQL", text: "Use opaque cursors (`next_cursor`, Relay-style `endCursor`) for conversations and repository lists." },
    { name: "Elasticsearch", text: "Recommends `search_after` with a sort tiebreaker over deep `from/size` paging." },
  ],
  interview: [
    "Paginate every list endpoint, and default to cursor pagination for feeds and large collections.",
    "Explain why OFFSET gets slow and how inserts cause duplicates or skips.",
    "Include a unique tiebreaker in the sort and an index that matches it.",
    "Return an opaque next_cursor and has_more, with a maximum page size.",
  ],
  related: ["api-design", "api-styles", "database-indexing", "fan-out", "http"],
  practice: ["news-feed", "chat-system", "image-feed-client"],
};
