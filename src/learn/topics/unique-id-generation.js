export default {
  blocks: [
    { type: "p", text: "Every order, message, user and event needs a **unique ID**. On one database, an auto-increment column does the job. Across many servers and shards, generating IDs that are unique, fast, compact, and ideally **sortable by time**, without a central bottleneck, is a design problem of its own." },

    { type: "h2", text: "What you usually want from an ID" },
    { type: "ul", items: [
      "**Uniqueness** across all machines, with no coordination per ID.",
      "**Roughly time-ordered**: new IDs sort after old ones, which keeps B-tree inserts at the end of the index (fast) and makes \"recent items\" queries easy.",
      "**Compact**: 64 bits fits in a BIGINT and is cheaper to index than a 128-bit value or a string.",
      "**Not guessable**, when IDs are exposed publicly (sequential IDs leak business volume and invite enumeration).",
    ] },

    { type: "h2", text: "The options" },
    { type: "table", head: ["Approach", "Size", "Sortable", "Coordination", "Notes"], rows: [
      ["Auto-increment", "64-bit", "Yes", "Single database", "Simplest; breaks with sharding; guessable"],
      ["UUID v4 (random)", "128-bit", "No", "None", "Universally unique; random inserts fragment B-tree indexes"],
      ["UUID v7", "128-bit", "Yes (ms timestamp prefix)", "None", "Modern default for many apps: time-ordered, standard format"],
      ["ULID", "128-bit", "Yes", "None", "Like UUID v7, encoded as 26 readable characters"],
      ["Snowflake", "64-bit", "Yes", "Machine ID assignment", "Compact and fast; needs unique worker IDs and sane clocks"],
      ["Ticket server / ranges", "64-bit", "Roughly", "Central allocator, batched", "Each server reserves a block (e.g. 1,000 IDs) at a time"],
    ] },

    { type: "h2", text: "Snowflake IDs" },
    { type: "p", text: "Twitter's **Snowflake** packs a timestamp, a machine ID and a per-machine sequence into a 64-bit integer, so every server generates IDs locally with no network call:" },
    { type: "diagram", kind: "flow", caption: "A 64-bit Snowflake ID: 41 bits of milliseconds since a custom epoch (~69 years), 10 bits of machine ID (1,024 generators), 12 bits of sequence (4,096 IDs per ms per machine).", nodes: [
      { id: "s", label: "sign", sub: "1 bit", col: 0, row: 0, tone: "muted", w: 80 },
      { id: "t", label: "timestamp", sub: "41 bits · ms since epoch", col: 1, row: 0, tone: "accent", w: 200 },
      { id: "m", label: "machine ID", sub: "10 bits", col: 2.25, row: 0, tone: "store", w: 120 },
      { id: "q", label: "sequence", sub: "12 bits", col: 3.2, row: 0, tone: "ok", w: 110 },
    ], edges: [] },
    { type: "code", code: `
id = ((now_ms - EPOCH) << 22) | (machine_id << 12) | sequence
# sequence increments within the same millisecond and resets each new millisecond;
# if it overflows (4,096 IDs in one ms), wait for the next millisecond.
` },
    { type: "ul", items: [
      "**Throughput**: about 4 million IDs per second per machine.",
      "**Machine IDs** must be unique: assign them from configuration, a coordination service like ZooKeeper or etcd, or derive them from a pod ordinal.",
      "**Clock going backwards** (NTP correction) could produce duplicates: refuse to generate (or wait) until the clock passes the last timestamp used.",
      "IDs are only **roughly** ordered across machines (within clock skew), which is fine for sorting feeds.",
    ] },

    { type: "h2", text: "Short public IDs" },
    { type: "p", text: "For URLs (short links, invite codes), encode the numeric ID in **base 62** (a–z, A–Z, 0–9): 7 characters cover 62^7 ≈ 3.5 trillion values. If IDs shouldn't be guessable, don't expose sequential numbers directly: shuffle them with a reversible permutation, or generate random codes and check for collisions. See the [URL shortener](/system-design/url-shortener) round." },

    { type: "h2", text: "Choosing" },
    { type: "ul", items: [
      "Single database, internal IDs: auto-increment is fine.",
      "Distributed system, want simplicity and standard tooling: **UUID v7**.",
      "Need compact 64-bit IDs at high volume (messages, events, tweets): **Snowflake**-style.",
      "Need short, human-friendly codes: base-62 encoding of a numeric ID or a random code.",
    ] },
  ],
  uses: [
    { name: "Twitter / X", text: "Created Snowflake to generate tweet IDs across many servers; IDs encode creation time, so timelines sort by ID." },
    { name: "Discord", text: "Uses Snowflake IDs for messages, users and channels; the creation time can be read directly from an ID." },
    { name: "Instagram", text: "Generated 64-bit IDs inside PostgreSQL using the timestamp, the logical shard ID and a per-shard sequence." },
    { name: "Modern web apps", text: "Increasingly use UUID v7 or ULID primary keys for time ordering without coordination." },
  ],
  interview: [
    "Don't rely on auto-increment once data is sharded; propose Snowflake, UUID v7 or range allocation.",
    "Explain the Snowflake bit layout and how machine IDs are assigned.",
    "Mention clock skew and backwards clocks as a risk for timestamp-based IDs.",
    "For public URLs, base-62 encode IDs and consider making them non-sequential.",
  ],
  related: ["sharding", "clocks-and-ordering", "database-indexing", "back-of-the-envelope-estimation"],
  practice: ["unique-id-generator", "url-shortener", "chat-system", "paste-service"],
};
