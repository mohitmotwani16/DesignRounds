export default {
  blocks: [
    { type: "p", text: "A **caching strategy** decides who puts data into the cache and what happens when data changes. On the **read** side, the question is who fills the cache on a miss: the application (**cache-aside**) or the cache itself (**read-through**). On the **write** side, the question is how the cache and database stay in step: **write-through**, **write-behind (write-back)** or **write-around**. The choice determines how stale the cache can get, what a failure costs, and how much load reaches the database." },

    { type: "h2", text: "Read pattern 1: cache-aside (lazy loading)" },
    { type: "p", text: "In cache-aside the **application** handles every cache interaction explicitly. On each read:" },
    { type: "ol", items: [
      "The application checks the cache for the key.",
      "**Hit**: return the cached value.",
      "**Miss**: the application queries the database,",
      "writes the result into the cache,",
      "and returns it to the caller.",
    ] },
    { type: "diagram", kind: "sequence", caption: "Cache-aside: the application owns the whole flow; the cache is a passive store that knows nothing about the database.", actors: ["App", "Cache", "Database"], steps: [
      { from: 0, to: 1, label: "1. GET user:42" },
      { from: 1, to: 0, label: "2. hit → value (done)", dashed: true },
      { note: "on a miss instead:", over: [0, 2] },
      { from: 0, to: 2, label: "3. SELECT … WHERE id = 42" },
      { from: 2, to: 0, label: "row", dashed: true },
      { from: 0, to: 1, label: "4. SET user:42 (TTL 10 min)", tone: "accent" },
      { note: "5. return to caller; next read hits", over: [0, 1] },
    ] },
    { type: "p", text: "The cache is a **passive** data store that knows nothing about the database. This is the most common pattern in production." },
    { type: "ul", items: [
      "**Strengths**: the application controls exactly what is cached; only data that is actually requested enters the cache (no memory wasted on unused entries); any key-value store works; if the cache goes down, the application simply falls back to the database.",
      "**Weakness**: cache logic spreads through the codebase: every data access needs the same check → miss → query → store steps. Wrap it in a helper to avoid duplication.",
    ] },
    { type: "code", code: `def get_user(user_id):
    key = f"user:v1:profile:{user_id}"
    user = cache.get(key)
    if user is None:                                      # miss
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        cache.set(key, user, ttl=600)
    return user

def update_user(user_id, fields):
    db.update("users", user_id, fields)
    cache.delete(f"user:v1:profile:{user_id}")            # delete, don't set: see below` },

    { type: "h2", text: "Read pattern 2: read-through" },
    { type: "p", text: "In read-through, the **cache itself** handles misses. The application only ever calls `cache.get(key)`; on a miss the cache runs a configured **loader** function that queries the database, stores the result and returns it." },
    { type: "ol", items: [
      "The application calls `cache.get(key)`.",
      "The cache checks its store. **Hit**: return immediately.",
      "**Miss**: the cache calls the loader, which queries the database.",
      "The cache stores the result and returns it.",
    ] },
    { type: "diagram", kind: "sequence", caption: "Read-through: the application only calls get(key); on a miss the cache's loader fetches from the database.", actors: ["App", "Cache (with loader)", "Database"], steps: [
      { from: 0, to: 1, label: "get(user:42)" },
      { from: 1, to: 1, label: "miss → run loader" },
      { from: 1, to: 2, label: "loader queries DB" },
      { from: 2, to: 1, label: "row", dashed: true },
      { from: 1, to: 0, label: "store + return value", dashed: true },
    ] },
    { type: "ul", items: [
      "**Strengths**: cleaner application code with no miss handling at each call site; consistent miss handling everywhere; many implementations **coalesce concurrent misses** for the same key, so 100 simultaneous requests for a missing entry cause one database query instead of 100 (protection against the [thundering herd](/learn/cache-failure-modes)).",
      "**Weaknesses**: needs a cache library with loader support (Guava LoadingCache or Caffeine in Java, or your own wrapper); the cache layer is more complex and now depends on the database; when the loader fails, the cache must handle the error rather than just reporting a miss.",
    ] },
    { type: "h3", text: "Cache-aside or read-through?" },
    { type: "table", head: ["", "Cache-aside", "Read-through"], rows: [
      ["Cache layer", "Simple, passive store", "Complex, needs a loader"],
      ["Application code", "More verbose: miss handling everywhere", "Cleaner: just `get(key)`"],
      ["If the cache fails", "App falls back to the DB naturally", "Must handle loader errors"],
      ["Concurrent-miss protection", "Manual: you build it", "Often built in (request coalescing)"],
      ["Technology", "Any key-value store", "A cache library with loader support"],
    ] },
    { type: "p", text: "Most distributed systems use **cache-aside**: it works with any backend (Redis, Memcached, an in-process map), keeps the cache generic and unaware of the database, and leaves the application in full control of loading. **Read-through** shines when there are many data access points and duplicating miss handling would be error-prone; it's common in monolithic Java applications with Guava or Caffeine, where the cache is in-process and the loader is just a method call. In interviews, **default to cache-aside** unless asked about read-through." },

    { type: "h2", text: "Hands-on: the read drill" },
    { type: "p", text: "Implement cache-aside from scratch and watch reads move from slow (miss) to fast (hit). The \"database\" is a dictionary with 50 ms of artificial latency per read." },
    { type: "code", code: `import time

DATABASE = {
    1: {"name": "Alice",   "email": "alice@example.com",   "role": "admin"},
    2: {"name": "Bob",     "email": "bob@example.com",     "role": "user"},
    3: {"name": "Charlie", "email": "charlie@example.com", "role": "user"},
}

def db_query(user_id):
    time.sleep(0.05)                       # every database read costs 50 ms
    return DATABASE.get(user_id)

cache = {}                                 # the cache: a plain dictionary

def get_user(user_id):
    key = f"user:v1:profile:{user_id}"
    if key in cache:                       # 1. check the cache
        return cache[key], "HIT"
    data = db_query(user_id)               # 2. miss: query the database
    if data is None:
        return None, "MISS (not found)"
    cache[key] = data                      # 3. store for next time
    return data, "MISS (stored)"

for round_name in ("Round 1 (cold cache)", "Round 2 (warm cache)"):
    print(f"=== {round_name} ===")
    for user_id in (1, 2, 3, 1, 2, 3):
        start = time.perf_counter()
        _, status = get_user(user_id)
        print(f"  get_user({user_id}): {status:<14} {(time.perf_counter() - start) * 1000:5.1f} ms")` },
    { type: "code", code: `=== Round 1 (cold cache) ===
  get_user(1): MISS (stored)   50.3 ms
  get_user(2): MISS (stored)   50.2 ms
  get_user(3): MISS (stored)   50.1 ms
  get_user(1): HIT              0.0 ms
  get_user(2): HIT              0.0 ms
  get_user(3): HIT              0.0 ms
=== Round 2 (warm cache) ===
  get_user(1): HIT              0.0 ms
  ...` },
    { type: "p", text: "The first read of each user costs a database round trip (~50 ms); every later read is a memory lookup. Calls 4–6 of round one are already hits because users 1–3 were cached by calls 1–3." },
    { type: "h3", text: "Extend it: invalidation" },
    { type: "p", text: "What happens when data changes? Add an `invalidate_user()` that deletes the key, so the next read fetches fresh data:" },
    { type: "code", code: `def invalidate_user(user_id):
    key = f"user:v1:profile:{user_id}"
    if cache.pop(key, None) is not None:
        print(f"  invalidated {key}")
    else:
        print(f"  {key} not in cache (no-op)")

print(get_user(1)[1])                       # MISS: cold cache
print(get_user(1)[1])                       # HIT
DATABASE[1]["email"] = "alice@new.example"  # user updates their email (DB write)
invalidate_user(1)                          # delete the cached copy
user, status = get_user(1)                  # MISS: refetches the fresh row
print(status, user["email"])                # MISS (stored) alice@new.example` },
    { type: "p", text: "That's the full cache-aside lifecycle: read (miss) → cache → read (hit) → invalidate → read (miss, fresh data). The write patterns below handle keeping the cache in step without remembering to invalidate at every write." },

    { type: "h2", text: "Write pattern 1: write-through" },
    { type: "p", text: "Every write goes to **both** the cache and the database as one synchronous operation. The application sends the write to the cache layer; the cache stores the value and immediately forwards it to the database; only when the database confirms does the cache report success." },
    { type: "diagram", kind: "sequence", caption: "Write-through: the write is acknowledged only after both the cache and the database have it.", actors: ["App", "Cache", "Database"], steps: [
      { from: 0, to: 1, label: "write user:42" },
      { from: 1, to: 2, label: "forward write (sync)" },
      { from: 2, to: 1, label: "OK", dashed: true },
      { from: 1, to: 0, label: "ack: both updated", dashed: true },
    ] },
    { type: "ul", items: [
      "**Fresh reads**: cache and database agree after every successful write, so later reads usually find fresh data (eviction, TTLs or node failures can still cause misses).",
      "**Write latency**: every write pays two hops, adding a millisecond or more. Fine for read-heavy workloads with occasional writes; it compounds for write-heavy ones.",
      "**Cache pollution**: every written value is cached, read or not. An analytics pipeline writing thousands of events a second fills memory with write-once entries while frequently read ones get evicted.",
    ] },
    { type: "p", text: "Example: **Amazon DynamoDB Accelerator (DAX)** implements write-through (and read-through) transparently. The application talks to DAX through a DynamoDB-compatible API; writes update the cache and are forwarded to DynamoDB, and reads hit DAX first." },

    { type: "h2", text: "Write pattern 2: write-behind (write-back)" },
    { type: "p", text: "The cache **acknowledges the write immediately** and writes to the database later. A background process batches cached writes and persists them on a schedule or when a threshold is reached." },
    { type: "diagram", kind: "sequence", caption: "Write-behind: the app gets an instant ack; a background flusher writes batches to the database later.", actors: ["App", "Cache", "Flusher", "Database"], steps: [
      { from: 0, to: 1, label: "write views=1" },
      { from: 1, to: 0, label: "ack (fast)", dashed: true },
      { from: 0, to: 1, label: "write views=2 … views=5" },
      { note: "only the cache has the data: crash here = loss", over: [1, 3] },
      { from: 2, to: 1, label: "collect pending writes" },
      { from: 2, to: 3, label: "batch write views=5 (coalesced)" },
    ] },
    { type: "ul", items: [
      "**Very low write latency**: the application waits only for the cache, which is much faster than a database round trip. Under bursts, the cache absorbs the spike and smooths it into steady database writes.",
      "**Write coalescing**: when only the final value matters, 10 updates to one key in a second become **one** database write. Big savings for counters, session data and presence indicators.",
      "**Risk of data loss**: between the cache acknowledging and the flush completing, the data exists only in memory. If the cache node crashes in that window, unflushed writes are gone. Replication or a durable write-ahead log reduces the risk at the cost of latency.",
    ] },
    { type: "p", text: "Use write-behind when speed matters more than durability: session stores, view counters, real-time analytics, recommendation scores. Never for financial transactions, orders, or anything where loss is unacceptable." },

    { type: "h2", text: "Write pattern 3: write-around" },
    { type: "p", text: "Writes go **straight to the database**, bypassing the cache; the application **deletes** the cache entry for the affected key. The next read misses, fetches fresh data from the database and repopulates the cache. This is the write-side partner of cache-aside: invalidate on write, populate on read, and nothing is ever written into the cache directly." },
    { type: "diagram", kind: "sequence", caption: "Write-around: write to the database, delete the cache key; the next read misses and loads fresh data.", actors: ["App", "Cache", "Database"], steps: [
      { from: 0, to: 2, label: "UPDATE users SET … WHERE id = 42" },
      { from: 0, to: 1, label: "DEL user:42" },
      { note: "next read", over: [0, 1] },
      { from: 0, to: 1, label: "GET user:42 → miss" },
      { from: 0, to: 2, label: "SELECT fresh row" },
      { from: 0, to: 1, label: "SET user:42" },
    ] },
    { type: "ul", items: [
      "**No cache pollution**: only data that is read enters the cache. A batch import of 100,000 records doesn't touch cache memory; only the records users later request get cached.",
      "**One miss after each write**: the user who just updated their profile gets one slower read (miss plus database fetch) on their next page load. For most applications that single miss is negligible next to the memory saved.",
    ] },

    { type: "h2", text: "Choosing a write pattern" },
    { type: "table", head: ["", "Write-through", "Write-behind", "Write-around"], rows: [
      ["Consistency", "Strong (synchronous)", "Eventual (async flush)", "Strong (invalidate + refetch)"],
      ["Write latency", "Higher (cache + DB)", "Lowest (cache only)", "Normal (DB only)"],
      ["Data-loss risk", "None", "Yes (crash before flush)", "None"],
      ["Cache pollution", "Yes (every write cached)", "Yes (every write cached)", "No (only reads fill it)"],
      ["Best for", "Read-heavy, consistency-critical data", "Write-heavy, loss-tolerant data", "Mixed workloads, large or bulk writes"],
    ] },
    { type: "p", text: "Many production systems use **write-around** (cache-aside for writes): it keeps the cache lean, risks no data, and pairs naturally with cache-aside reads. **Write-through** earns its cost when recently written data is read often and must be consistent. **Write-behind** is for high-throughput cases where you've explicitly accepted the durability risk. Even the \"strong\" patterns can go stale under concurrency; see [cache consistency](/learn/cache-consistency) for the race conditions and fixes." },
    { type: "table", head: ["Strategy", "Read miss", "Write path", "Staleness", "Risk"], rows: [
      ["Cache-aside", "App loads and fills", "DB, then delete key", "Up to TTL, small race window", "Low: cache is optional"],
      ["Read-through", "Cache loads via loader", "Usually with write-through or delete", "Same as cache-aside", "Low"],
      ["Write-through", "Load on miss", "Cache and DB synchronously", "Fresh for written keys", "Slower writes, pollution"],
      ["Write-around", "Load on miss", "DB only, delete key", "Until next miss", "One slow read after each write"],
      ["Write-behind", "Load on miss", "Cache now, DB later", "DB lags the cache", "Lost writes if the cache fails"],
    ] },

    { type: "h2", text: "Hands-on: the write drill" },
    { type: "p", text: "Three small exercises show write-behind's speed, its coalescing and its danger." },
    { type: "h3", text: "Exercise 1: a write-behind buffer" },
    { type: "p", text: "Writes go to the cache and a pending-writes buffer; `flush()` persists the buffer to a slow \"database\" (20 ms per write):" },
    { type: "code", code: `import time

database = {"user:1": {"name": "Alice", "views": 0}}
cache = {}
write_buffer = []                       # pending writes not yet in the database

def write(key, value):
    cache[key] = value                  # instant
    write_buffer.append((key, value))   # queued for the database
    print(f"  write({key}): cached + queued (buffer size {len(write_buffer)})")

def flush():
    print(f"  flush(): writing {len(write_buffer)} entries...")
    for key, value in write_buffer:
        time.sleep(0.02)                # 20 ms per database write
        database[key] = value
    write_buffer.clear()

def read(key):
    if key in cache:
        return cache[key], "HIT"        # write-behind: the cache always has the latest
    if key in database:
        cache[key] = database[key]
        return cache[key], "MISS (loaded from DB)"
    return None, "MISS (not found)"

for i in range(1, 6):                   # a user views a page 5 times
    write("user:1", {"name": "Alice", "views": i})
print("cache:", cache["user:1"], " db:", database["user:1"])   # cache ahead of the DB
start = time.perf_counter(); flush()
print(f"flush took {(time.perf_counter() - start) * 1000:.0f} ms; db:", database["user:1"])` },
    { type: "p", text: "All five writes finish instantly; one flush takes about 100 ms (5 × 20 ms). Between the writes and the flush the database is stale, but reads from the cache always return the latest value." },
    { type: "h3", text: "Exercise 2: write coalescing" },
    { type: "p", text: "Change the buffer from a list to a **dictionary** keyed by cache key: each new write to a key overwrites its pending value, so a flush needs one database write per key no matter how many updates happened." },
    { type: "code", code: `write_buffer = {}                       # key -> latest value (coalesces automatically)

def write(key, value):
    cache[key] = value
    write_buffer[key] = value

for i in range(1, 101):                 # a counter incremented 100 times
    write("pageviews:homepage", {"count": i})
print("buffer size:", len(write_buffer))        # 1: coalesced
flush()                                         # 1 database write (20 ms) instead of 100 (2 s)` },
    { type: "h3", text: "Exercise 3: crash before flush" },
    { type: "p", text: "Simulate the failure write-behind risks: the process dies after writes are acknowledged but before they are flushed." },
    { type: "code", code: `database = {"user:1": {"name": "Alice", "score": 0}}
cache, write_buffer = {}, {}

def crash():
    cache.clear(); write_buffer.clear()          # memory is gone
    print("  CRASH: cache and write buffer lost")

for points in (10, 25, 50, 100):
    score = cache.get("user:1", database["user:1"])["score"] + points
    write("user:1", {"name": "Alice", "score": score})
print("cache score:", cache["user:1"]["score"], " db score:", database["user:1"]["score"])  # 185 vs 0
crash()
print("after crash, db score:", database["user:1"]["score"])                               # 0: 4 updates lost` },
    { type: "p", text: "Every update since the last flush is permanently lost. Flushing more often shrinks the window but never closes it: that is the fundamental trade of write-behind, speed for durability. For data where loss is unacceptable, use write-through or write-around with immediate database writes; keep write-behind for session data, analytics counters and scores where approximate values are fine." },
    { type: "callout", tone: "tip", text: "Default to **cache-aside reads + write-around (delete on write) + a TTL on every entry**. Reach for write-through when fresh reads of just-written data matter, and write-behind only for counters and similar data where batching matters and small losses are tolerable." },
  ],
  uses: [
    { name: "Most web applications", text: "Cache-aside with Redis or Memcached in front of PostgreSQL or MySQL, deleting keys on update and setting TTLs." },
    { name: "View and like counters", text: "Write-behind style: increment counters in Redis and flush aggregated values to the database periodically." },
    { name: "Amazon DynamoDB Accelerator (DAX)", text: "A read-through and write-through cache in front of DynamoDB, transparent to the application." },
    { name: "Java services with Caffeine", text: "Read-through LoadingCaches with built-in request coalescing for in-process hot data." },
  ],
  interview: [
    "Name the strategy (usually cache-aside + write-around) and walk through the read path and the write path.",
    "On writes, say you delete the cache key rather than update it, and why.",
    "If you choose write-behind for speed, state the data-loss window and why it's acceptable for that data.",
    "Give every cache entry a TTL as a safety net against missed invalidations.",
  ],
  related: ["caching", "cache-consistency", "cache-invalidation", "cache-key-design", "cache-failure-modes", "consistency-models"],
  practice: ["distributed-cache", "url-shortener", "news-feed"],
};
