export default {
  blocks: [
    { type: "p", text: "A social feed or timeline shows the latest posts from everyone a user follows. There are two basic ways to build it: **fan-out on write** (push each new post into every follower's feed when it's created) and **fan-out on read** (assemble the feed from followees' posts when the user opens it). Real systems use a **hybrid**, because each approach breaks down in a different situation." },

    { type: "h2", text: "Fan-out on write (push)" },
    { type: "p", text: "When someone posts, a background job inserts the post ID into a precomputed feed list for each follower (often a Redis list or a wide-column row per user). Reading a feed is then a single fast lookup." },
    { type: "diagram", kind: "flow", caption: "Push: a post is copied into every follower's feed at write time, so reads are one cheap lookup.", nodes: [
      { id: "author", label: "Author posts", col: 0, row: 1, shape: "pill" },
      { id: "posts", label: "Posts store", col: 1, row: 0, shape: "db", tone: "store" },
      { id: "fan", label: "Fan-out workers", col: 1, row: 1.5, tone: "accent" },
      { id: "f1", label: "Feed: follower 1", col: 2.4, row: 0.5, shape: "db", tone: "cache", w: 160 },
      { id: "f2", label: "Feed: follower 2", col: 2.4, row: 1.5, shape: "db", tone: "cache", w: 160 },
      { id: "f3", label: "Feed: follower N", col: 2.4, row: 2.5, shape: "db", tone: "cache", w: 160 },
    ], edges: [
      { from: "author", to: "posts" }, { from: "author", to: "fan", label: "queue" },
      { from: "fan", to: "f1" }, { from: "fan", to: "f2" }, { from: "fan", to: "f3" },
    ] },
    { type: "ul", items: [
      "**Pros**: very fast, predictable reads; most work happens off the request path.",
      "**Cons**: **write amplification**: a post by someone with 10 million followers means 10 million writes, taking minutes; wasted work for inactive followers; deleting or editing a post must touch many feeds.",
    ] },

    { type: "h2", text: "Fan-out on read (pull)" },
    { type: "p", text: "Store each user's posts once. When a user opens their feed, fetch recent posts from each person they follow and merge them (a k-way merge by time or rank)." },
    { type: "ul", items: [
      "**Pros**: cheap writes, no wasted work, edits and deletes are trivial, always fresh.",
      "**Cons**: **slow, expensive reads** for users following many accounts: hundreds of lookups per feed open, repeated on every refresh, hard to keep within latency targets.",
    ] },

    { type: "h2", text: "The hybrid: handling celebrities" },
    { type: "p", text: "Most accounts have few followers, so pushing is cheap for them. The problem is the small number of accounts with huge followings. The standard hybrid:" },
    { type: "ol", items: [
      "**Push** posts from normal accounts into followers' precomputed feeds.",
      "**Don't push** posts from accounts above a follower threshold (celebrities, brands).",
      "**At read time**, merge the user's precomputed feed with recent posts from the few celebrities they follow, which are cheap to fetch and heavily cached.",
    ] },
    { type: "table", head: ["", "Push", "Pull", "Hybrid"], rows: [
      ["Read latency", "Lowest", "High", "Low"],
      ["Write cost", "Followers × posts", "1 per post", "Bounded (no celebrity fan-out)"],
      ["Celebrity posts", "Very slow fan-out", "Fine", "Fine (pulled)"],
      ["Freshness", "Seconds behind (async)", "Real time", "Mostly seconds behind"],
    ] },

    { type: "h2", text: "Other practical details" },
    { type: "ul", items: [
      "**Store IDs, not full posts**, in feed lists, and hydrate post content from a cache; edits then show up everywhere.",
      "**Cap feed length** (keep the latest ~800 items per user); older content comes from a slower path.",
      "**Skip inactive users** during fan-out and rebuild their feed lazily when they return.",
      "**Ranking**: modern feeds aren't purely chronological; candidates from the precomputed feed are scored by a ranking model at read time.",
      "**Pagination** with cursors so new posts don't shift pages. See [pagination](/learn/pagination).",
    ] },
    { type: "p", text: "The same push-vs-pull trade-off appears elsewhere: notification delivery to group members, chat groups (fan out messages to each member's inbox vs read from a shared channel), and leaderboard updates." },
  ],
  uses: [
    { name: "Twitter / X", text: "Historically pushed tweets into Redis-backed home timelines for most users, and merged in tweets from high-follower accounts at read time." },
    { name: "Instagram and Facebook", text: "Generate candidate posts from followed accounts, then rank them with ML models at read time." },
    { name: "LinkedIn", text: "Uses a mix of push and pull with ranking to build feeds across connections and followed pages." },
    { name: "Group chat apps", text: "Small groups fan out to member inboxes; huge channels are read from a shared channel log instead." },
  ],
  interview: [
    "Present push and pull, their costs, and then the hybrid with a follower threshold for celebrities.",
    "Do the fan-out asynchronously through a queue and store post IDs in feed lists.",
    "Quantify write amplification with an estimate (followers × posts per day).",
    "Mention capping feed length, skipping inactive users, and ranking at read time.",
  ],
  related: ["caching", "message-queues", "normalization-denormalization", "pagination", "sharding", "real-time-communication"],
  practice: ["news-feed", "notification-service", "chat-system"],
};
