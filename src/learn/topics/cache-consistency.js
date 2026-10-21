// Cache–database consistency: the dual-write problem, the read/write race, why delete beats
// update, mitigations (TTL, write-through, delayed double delete, versions), and a staleness spectrum.
export default {
  blocks: [
    { type: "p", text: "A cache plus a database means **two copies of the same data**, and every write has to change both. [Write-around](/learn/cache-strategies) deletes the cache key after writing the database; write-through updates both synchronously. Each looks correct, but when requests run concurrently, subtle race conditions can leave **stale data in the cache, sometimes indefinitely**. This page explains how that happens and how to contain it." },

    { type: "h2", text: "The dual-write problem" },
    { type: "p", text: "In which order should the two copies be updated, and what if something fails in between? Take write-around: (1) update the database, (2) delete the cache key. Two things can go wrong." },
    { type: "h3", text: "1. A crash between the steps" },
    { type: "p", text: "The application updates the database, then crashes before deleting the key. The cache still holds the old value, and every read returns stale data until the entry's TTL expires or another write invalidates it." },
    { type: "h3", text: "2. A read that overlaps the write" },
    { type: "p", text: "This one is subtler and harder to prevent:" },
    { type: "diagram", kind: "sequence", caption: "The read/write race: thread B reads the old value before A's write commits, A deletes the key, then B puts the old value back into the cache.", actors: ["Thread A (write)", "Database", "Cache", "Thread B (read)"], steps: [
      { from: 3, to: 2, label: "1. GET user:42 → miss" },
      { from: 3, to: 1, label: "2. SELECT … (sees old@example.com)" },
      { from: 0, to: 1, label: "3. UPDATE email = new@example.com" },
      { from: 0, to: 2, label: "4. DEL user:42" },
      { from: 3, to: 2, label: "5. SET user:42 = old@example.com", tone: "danger" },
      { note: "cache now stale until the next invalidation or TTL", over: [1, 2] },
    ] },
    { type: "p", text: "Thread A changes a user's email to `new@example.com`. Meanwhile thread B misses the cache and queries the database, but its query started before A's write committed, so it reads `old@example.com`. A deletes the cache key. Then B writes the old value into the cache. The cache now holds stale data, and nothing will fix it until the next invalidation. This race exists whichever write pattern you use; it happens whenever a read miss and a write overlap in time." },

    { type: "h2", text: "Delete vs update: why invalidation wins" },
    { type: "p", text: "On a write, the application can either **update** the cache with the new value (the write-through approach) or **delete** the key and let the next read repopulate it (the write-around approach). Updating sounds better, since the cache is always \"fresh\", but it creates its own race." },
    { type: "diagram", kind: "sequence", caption: "Update-on-write race: both writes reach the database in order (B last), but their cache updates arrive out of order, leaving the cache at 100 while the database says 120.", actors: ["Write A (price=100)", "Database", "Cache", "Write B (price=120)"], steps: [
      { from: 0, to: 1, label: "UPDATE price = 100" },
      { from: 3, to: 1, label: "UPDATE price = 120 (commits last)" },
      { from: 3, to: 2, label: "SET price = 120" },
      { from: 0, to: 2, label: "SET price = 100 (arrives late)", tone: "danger" },
      { note: "DB = 120, cache = 100: wrong until TTL or the next write", over: [1, 2] },
    ] },
    { type: "p", text: "Two writes arrive close together: A sets `price=100`, B sets `price=120`. B commits last, so the database correctly says 120. Both also update the cache, but if A's cache update arrives after B's, the cache ends up at 100. A TTL eventually expires the bad entry; without one, it stays wrong until the next write." },
    { type: "p", text: "Deleting avoids this entirely. If both writes delete the key, the cache is simply empty, and the next read fetches the correct value (120) from the database. Deletion is **idempotent** (deleting an absent key does nothing) and order doesn't matter; updating is order-dependent (\"last write wins\"), and \"last\" is hard to guarantee in a distributed system. That's why many systems prefer delete-on-write." },

    { type: "h2", text: "Mitigation strategies" },
    { type: "p", text: "No pattern closes the consistency gap completely in a distributed system, but several narrow the window or limit the damage:" },
    { type: "ul", items: [
      "**Short TTLs.** Every entry expires after a bounded time (seconds to minutes), so even if a stale value sneaks in, it fixes itself. The cost: more misses and more database load. Always set a TTL, even with active invalidation: it's the safety net. See [invalidation and TTLs](/learn/cache-invalidation).",
      "**Write-through for critical data.** For data where staleness is unacceptable (balances, inventory), the synchronous double write shrinks the window considerably, though a partial failure can still leave the copies diverged. The cost is write latency.",
      "**Delayed double delete.** After writing the database and deleting the key, wait a short interval (say 500 ms) and **delete it again**. The second delete clears any stale value that a concurrent read put back during the write, exactly the race above.",
      "**Version stamps.** Store a version number or timestamp with each entry and increment it on every write. When populating the cache, only store the value if its version is newer than what's already cached, so old values can never overwrite new ones. The difficulty is keeping version ordering consistent across services.",
      "**Invalidate from the database's change stream.** Instead of the application deleting keys, a consumer reads the database's change log ([change data capture](/learn/change-data-capture)) and deletes keys after each commit, with retries. A crash in the application can no longer skip the invalidation.",
    ] },
    { type: "code", code: `import threading

def update_user_email(user_id, email):
    db.execute("UPDATE users SET email = %s WHERE id = %s", (email, user_id))
    key = f"user:v1:profile:{user_id}"
    cache.delete(key)                                   # first delete
    # Second delete after any in-flight read that saw the old row has finished.
    threading.Timer(0.5, cache.delete, args=(key,)).start()

def fill_if_newer(key, value, version):
    """Version-stamped fill: never overwrite a newer cached value with an older one."""
    # Lua script makes the compare-and-set atomic in Redis.
    cache.eval("""
        local cur = redis.call('HGET', KEYS[1], 'v')
        if (not cur) or tonumber(ARGV[2]) > tonumber(cur) then
            redis.call('HSET', KEYS[1], 'v', ARGV[2], 'data', ARGV[1])
            redis.call('EXPIRE', KEYS[1], 600)
        end""", 1, key, value, version)` },

    { type: "h2", text: "The consistency spectrum" },
    { type: "p", text: "Different data tolerates different amounts of staleness, and the right pattern follows from that:" },
    { type: "table", head: ["Data", "Acceptable staleness", "Pattern"], rows: [
      ["Account balance", "None", "Write-through, or don't cache"],
      ["Product price", "Seconds", "Write-around + short TTL"],
      ["User profile", "Minutes", "Write-around + moderate TTL"],
      ["Recommendation scores", "Hours", "Write-behind + long TTL"],
      ["Static content", "Days", "CDN with explicit purge"],
    ] },
    { type: "p", text: "The right answer is rarely \"make everything consistent\". Strong consistency costs write latency and complexity. Decide the staleness tolerance for each type of data and apply the simplest pattern that meets it. Even for data cached loosely, read the **source of truth** for the final decision: show a cached price on the product page, but charge the price read from the database at checkout." },
  ],
  uses: [
    { name: "E-commerce", text: "Prices and stock are cached with short TTLs for browsing, but checkout re-reads them from the database inside a transaction." },
    { name: "Large cache tiers (e.g. Facebook's memcache)", text: "Delete-on-write, invalidation driven by the database's commit log, and lease tokens that stop stale fills after a delete." },
    { name: "User profiles and settings", text: "Write-around with a moderate TTL; the user who made the change may be served from the database or a just-refilled entry." },
    { name: "Recommendation and ranking scores", text: "Recomputed in batches and written behind with long TTLs, since hours of staleness are harmless." },
  ],
  interview: [
    "Say \"delete on write, not update\" and explain the out-of-order update race.",
    "Describe the read/write race and one mitigation: short TTLs, delayed double delete, version stamps or CDC-driven invalidation.",
    "Pick a staleness tolerance per data type rather than one policy for everything.",
    "For money or inventory, read the source of truth at decision time.",
  ],
  related: ["cache-strategies", "cache-invalidation", "caching", "change-data-capture", "consistency-models", "distributed-locks"],
  practice: ["distributed-cache", "ticket-booking", "payment-platform"],
};
