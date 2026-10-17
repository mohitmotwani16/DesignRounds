export default {
  blocks: [
    { type: "p", text: "Any API that returns a list must **paginate**: return results a page at a time instead of all at once. The two main approaches are **offset pagination** (`?page=3` or `?offset=40&limit=20`) and **cursor pagination** (`?after=<cursor>`). Offset is simple but gets slow and inconsistent on large, changing datasets; cursor pagination stays fast and stable, which is why large APIs use it." },

    { type: "h2", text: "Offset pagination" },
    { type: "code", code: `
GET /orders?limit=20&offset=40

SELECT * FROM orders WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;
` },
    { type: "ul", items: [
      "**Pros**: trivial to implement; supports jumping to any page (\"page 7 of 20\") and showing total counts.",
      "**Cons**: the database must still read and discard all skipped rows, so `OFFSET 1000000` reads a million rows: deep pages get **slower and slower**.",
      "**Cons**: results **shift** when data changes between requests. If a new order is inserted while you're on page 2, the last item of page 2 reappears at the top of page 3 (duplicates); deletions cause items to be **skipped**.",
    ] },

    { type: "h2", text: "Cursor (keyset) pagination" },
    { type: "p", text: "Instead of \"skip 40 rows\", the client says \"give me the next 20 **after the last item I saw**\". The query uses the sort key of that item, so an index can seek straight to it." },
    { type: "code", code: `
GET /orders?limit=20&after=eyJjIjoiMjAyNi0xMC0xNlQwOToxMjowMFoiLCJpZCI6Im9fOTgxIn0

SELECT * FROM orders
WHERE user_id = 42
  AND (created_at, id) < ('2026-10-16T09:12:00Z', 'o_981')   -- the last item seen
ORDER BY created_at DESC, id DESC
LIMIT 20;
` },
    { type: "diagram", kind: "flow", caption: "Offset reads and throws away every skipped row; a cursor seeks directly to the last item seen using the index.", nodes: [
      { id: "off", label: "OFFSET 100,000", col: 0, row: 0, tone: "danger", w: 150 },
      { id: "scan", label: "Read 100,020 rows", sub: "discard 100,000", col: 1.4, row: 0, tone: "danger", w: 170 },
      { id: "cur", label: "after = cursor", col: 0, row: 1, tone: "ok", w: 150 },
      { id: "seek", label: "Index seek", sub: "read 20 rows", col: 1.4, row: 1, tone: "ok", w: 170 },
      { id: "res", label: "Page of 20", col: 2.7, row: 0.5, shape: "pill" },
    ], edges: [{ from: "off", to: "scan" }, { from: "scan", to: "res" }, { from: "cur", to: "seek" }, { from: "seek", to: "res" }] },
    { type: "ul", items: [
      "**Constant cost** per page regardless of depth, given an index on the sort columns (here `(user_id, created_at, id)`). See [indexing](/learn/database-indexing).",
      "**Stable under writes**: new items don't shift later pages, so no duplicates or skips.",
      "**Unique, deterministic ordering is required**: add a tiebreaker (the ID) to the sort, otherwise rows with equal timestamps can be skipped or repeated.",
      "**Trade-off**: no jumping to page N, and total counts are expensive; fine for feeds, timelines, logs and infinite scroll.",
    ] },

    { type: "h2", text: "Designing the cursor" },
    { type: "ul", items: [
      "Make cursors **opaque**: base64-encode the sort values (and maybe a version), so clients can't depend on the format and you can change it later.",
      "Return the next cursor in the response along with a `has_more` flag; clients stop when it's null.",
      "Sign or validate cursors if tampering could expose data, and make them expire if the underlying sort can change.",
      "Support `limit` with a maximum (e.g. 100) to protect the server.",
    ] },
    { type: "code", code: `
{
  "data": [ { "id": "o_981", "created_at": "2026-10-16T09:12:00Z", "total": 1499 } ],
  "next_cursor": "eyJjIjoiMjAyNi0xMC0xNlQwOToxMjowMFoiLCJpZCI6Im9fOTgxIn0",
  "has_more": true
}
` },

    { type: "h2", text: "Which to use" },
    { type: "table", head: ["Situation", "Use"], rows: [
      ["Small, mostly static lists; admin tables needing page numbers", "Offset"],
      ["Feeds, timelines, activity logs, infinite scroll", "Cursor"],
      ["Public APIs over large or growing collections", "Cursor"],
      ["Sync / export of all records", "Cursor over a stable key (ID or updated_at + ID)"],
      ["Search results ranked by relevance", "Engine-specific (search_after in Elasticsearch, or capped offset)"],
    ] },
  ],
  uses: [
    { name: "Stripe API", text: "List endpoints use `starting_after` and `ending_before` object IDs with `has_more`, a cursor approach." },
    { name: "Twitter / X and Facebook Graph API", text: "Timelines use cursor tokens (`max_id`, `next` cursors) so new posts don't disturb paging." },
    { name: "Slack and GitHub GraphQL", text: "Use opaque cursors (`next_cursor`, Relay-style `endCursor`) for conversations and repository lists." },
    { name: "Elasticsearch", text: "Recommends `search_after` with a sort tiebreaker over deep `from/size` paging." },
  ],
  interview: [
    "Paginate every list endpoint, and default to cursor pagination for feeds and large collections.",
    "Explain why OFFSET gets slow and how inserts cause duplicates or skips.",
    "Include a unique tiebreaker in the sort and an index that matches it.",
    "Return an opaque next_cursor and has_more, with a maximum page size.",
  ],
  related: ["api-styles", "database-indexing", "fan-out", "http"],
  practice: ["news-feed", "chat-system", "image-feed-client"],
};
