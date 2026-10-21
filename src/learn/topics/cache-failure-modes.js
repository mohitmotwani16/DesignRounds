// Cache failure modes that bypass the cache and flood the database: penetration (Bloom filters,
// null caching), avalanche (TTL jitter) and stampede (request coalescing, SWR, early refresh), with labs.
export default {
  blocks: [
    { type: "p", text: "A well-configured cache typically absorbs **90–99%** of read traffic, and the database is sized for the remainder. Certain failure patterns route traffic **around** the cache, and a database sized for 5% of the load cannot take 100% of it. Three patterns cause this: **penetration** (requests for keys that don't exist), **avalanche** (many keys expiring together) and **stampede** (one hot key expiring under heavy load). Each has well-known defenses." },

    { type: "h2", text: "Cache penetration" },
    { type: "p", text: "**Penetration** happens when requests ask for keys that exist **neither in the cache nor in the database**. Every request misses, every miss queries the database, the database returns nothing, and there's nothing to cache, so the next identical request repeats the cycle. An attacker or a buggy client can exploit this by requesting random IDs that don't exist (`user:99999999`, `product:-1`): the cache provides no protection at all because those keys are never populated." },
    { type: "diagram", kind: "flow", caption: "Penetration: requests for non-existent keys miss the cache every time and all reach the database, which returns nothing to cache.", nodes: [
      { id: "a", label: "Attacker / buggy client", sub: "user:99999999, product:-1", col: 0, row: 0, tone: "danger" },
      { id: "c", label: "Cache", sub: "miss, miss, miss…", col: 1.5, row: 0, tone: "cache" },
      { id: "db", label: "Database", sub: "returns empty every time", col: 3, row: 0, shape: "db", tone: "danger" },
    ], edges: [{ from: "a", to: "c" }, { from: "c", to: "db", label: "100% of requests", tone: "danger" }] },
    { type: "h3", text: "Defense 1: cache empty results" },
    { type: "p", text: "When the database finds nothing, cache a **sentinel** value (`NULL` or an empty object) with a short TTL, 30–60 seconds. Repeat requests for the same missing key then hit the cache and return the sentinel without touching the database. The limitation: if every request uses a **different** random key, the cache fills with millions of sentinels that are never requested again, wasting memory." },
    { type: "h3", text: "Defense 2: a Bloom filter" },
    { type: "p", text: "A **Bloom filter** is a compact probabilistic structure that answers \"**might exist**\" or \"**definitely does not exist**\". Check it **before** the cache: if it says the key doesn't exist, reject the request without touching the cache or the database. The filter must be updated on the **write path** whenever a new key is created, otherwise legitimate new keys get rejected. See [probabilistic data structures](/learn/probabilistic-data-structures)." },
    { type: "p", text: "It's cheap: a Bloom filter holding **100 million keys** takes about **120 MB** at a 1% false-positive rate. That 1% of non-existent keys slip through as false positives and still reach the database, but the vast majority are blocked." },
    { type: "diagram", kind: "flow", caption: "Bloom filter in front of the cache: keys that definitely don't exist are rejected before they cost anything; possible keys continue to the cache and database.", nodes: [
      { id: "r", label: "Request", sub: "product:-1", col: 0, row: 1, shape: "pill" },
      { id: "bf", label: "Bloom filter", sub: "all valid IDs", col: 1.3, row: 1, tone: "accent" },
      { id: "x", label: "Reject (404)", sub: "definitely not exists", col: 2.6, row: 0, tone: "danger", shape: "pill" },
      { id: "c", label: "Cache", col: 2.6, row: 2, tone: "cache" },
      { id: "db", label: "Database", col: 3.8, row: 2, shape: "db", tone: "store" },
    ], edges: [{ from: "r", to: "bf" }, { from: "bf", to: "x", label: "no", tone: "danger" }, { from: "bf", to: "c", label: "maybe" }, { from: "c", to: "db", label: "miss", dashed: true }] },

    { type: "h2", text: "Cache avalanche" },
    { type: "p", text: "**Avalanche** happens when **many entries expire at the same moment**, sending a wave of misses to the database. It's caused by caching a big batch of data at the same time with the same TTL. A product catalog loaded at midnight with a 1-hour TTL creates an avalanche at 1:00 AM: every product page becomes a miss and the database receives the whole catalog's read traffic at once." },
    { type: "diagram", kind: "timeline", caption: "Avalanche: the whole catalog cached at midnight with a 1-hour TTL expires at 1:00 AM, and the database takes every read at once.", ticks: ["00:00", "00:20", "00:40", "01:00", "01:20"], spans: [
      { from: 0, to: 3, label: "all products cached (TTL = 1 hour)", tone: "ok" },
      { from: 3, to: 3.6, label: "miss storm", tone: "danger" },
    ], events: [{ at: 0, tone: "store", label: "bulk load" }], marks: [{ at: 3, label: "everything expires", tone: "danger" }] },
    { type: "ul", items: [
      "**Defense 1: TTL jitter.** Add a random offset to each TTL: instead of exactly 3,600 seconds, use 3,240–3,960 seconds (3,600 ± 10%). Expirations spread over 12 minutes instead of one instant. See [cache invalidation](/learn/cache-invalidation).",
      "**Defense 2: staggered warm-up.** After a restart or cold deploy, don't load everything at once; let entries fill lazily as they're requested, so the database sees elevated but spread-out load instead of a synchronized spike. See [cache warming](/learn/cache-warming).",
      "**Defense 3: multi-level caching.** Put a small, fast in-process cache in front of the distributed cache. Even if the distributed cache avalanches, the local cache absorbs some of the repeated hits and the database sees a smaller spike.",
    ] },

    { type: "h2", text: "Cache stampede (thundering herd)" },
    { type: "p", text: "**Stampede** happens when **one popular key** expires and many concurrent requests miss on it at the same instant, so all of them query the database for the same row. A product page is cached with a 60-second TTL. It expires, and within the next millisecond 5,000 users request it: 5,000 misses, 5,000 identical queries instead of one." },
    { type: "diagram", kind: "flow", caption: "Stampede without protection: one hot key expires and every concurrent reader queries the database for the same row.", nodes: [
      { id: "u", label: "5,000 concurrent readers", col: 0, row: 0, tone: "cache" },
      { id: "c", label: "Cache", sub: "product:42 just expired", col: 1.5, row: 0, tone: "danger" },
      { id: "db", label: "Database", sub: "5,000 identical queries", col: 3, row: 0, shape: "db", tone: "danger" },
    ], edges: [{ from: "u", to: "c" }, { from: "c", to: "db", label: "all miss", tone: "danger" }] },
    { type: "h3", text: "Defense 1: locking (request coalescing)" },
    { type: "p", text: "The first request to discover the miss takes a **lock** on the key. Later requests see the lock and **wait** (or return a stale value) instead of querying the database. The first request fills the cache and releases the lock; everyone else then reads the fresh entry. 5,000 database queries become **one**. The cost is complexity: the lock needs a timeout so a failed first request can't block everyone forever, and waiting requests need a fallback if the lock expires." },
    { type: "diagram", kind: "flow", caption: "Request coalescing: thousands of concurrent misses for one key produce a single database query; the rest wait for its result.", nodes: [
      { id: "r1", label: "Request 1", sub: "gets the lock", col: 0, row: 0, tone: "ok" },
      { id: "r2", label: "Requests 2…5,000", sub: "wait for the result", col: 0, row: 1.2, tone: "cache" },
      { id: "l", label: "Lock / single flight", sub: "SET key:lock NX EX 5", col: 1.5, row: 0.6, tone: "accent" },
      { id: "db", label: "Database", sub: "1 query", col: 3, row: 0, shape: "db", tone: "store" },
      { id: "c", label: "Cache", sub: "refilled", col: 3, row: 1.2, tone: "ok" },
    ], edges: [{ from: "r1", to: "l" }, { from: "r2", to: "l", dashed: true }, { from: "l", to: "db", label: "one query" }, { from: "db", to: "c" }, { from: "c", to: "r2", label: "read result", dashed: true, bend: 30 }] },
    { type: "h3", text: "Defense 2: stale-while-revalidate" },
    { type: "p", text: "Return the expired (stale) value to everyone while **one** background task refreshes the cache. Users never wait; they just get slightly old data for a moment. It still needs coordination (a lock or single-flight) so that only one task refreshes; otherwise many workers revalidate at once." },
    { type: "h3", text: "Defense 3: preemptive (early) refresh" },
    { type: "p", text: "Refresh hot keys **before** they expire. A background job watches popular keys and refreshes them at about 80% of their TTL (at 48 seconds for a 60-second TTL), so under normal operation the key is always fresh when requests arrive and no miss occurs. If the job fails or lags, the key can still expire, so combine it with stale-while-revalidate as a fallback. A variant, **probabilistic early expiration**, has each reader occasionally refresh a little early, with the probability rising as expiry approaches, so exactly-at-expiry stampedes become rare without a separate job." },

    { type: "h2", text: "Choosing defenses" },
    { type: "table", head: ["Failure mode", "Root cause", "Primary defense", "Fallback"], rows: [
      ["Penetration", "Requests for keys that don't exist", "Bloom filter", "Cache nulls with a short TTL"],
      ["Avalanche", "Many keys expire together", "TTL jitter", "Staggered warm-up, multi-level cache"],
      ["Stampede", "One hot key expires under load", "Request coalescing (lock)", "Stale-while-revalidate, early refresh"],
    ] },
    { type: "p", text: "Production systems deploy **all three** at once. TTL jitter is nearly free (one random number). A Bloom filter takes some setup but blocks a whole class of attacks. Request coalescing for hot keys prevents the most damaging failure: a single expired key taking down the database." },

    { type: "h2", text: "Hands-on: failure-mode drills" },
    { type: "h3", text: "Exercise 1: stampede, without and with coalescing" },
    { type: "p", text: "A hot key expires while 100 threads read it at once. First with no protection, then with a lock so only one thread queries the database:" },
    { type: "code", code: `import threading, time

db_queries = 0
db_lock = threading.Lock()

def db_fetch(key):
    global db_queries
    with db_lock:
        db_queries += 1
    time.sleep(0.05)                                   # 50 ms database latency
    return {"id": key, "name": "Viral Product", "views": 1_000_000}

def run(reader, label):
    global db_queries, cache
    cache, db_queries = {}, 0
    threads = [threading.Thread(target=reader, args=("product:viral",)) for _ in range(100)]
    start = time.perf_counter()
    for t in threads: t.start()
    for t in threads: t.join()
    print(f"{label}: {db_queries} DB queries, {(time.perf_counter() - start) * 1000:.0f} ms")

def reader_no_lock(key):
    if key not in cache:
        cache[key] = db_fetch(key)                     # every thread races to the DB

fill_lock = threading.Lock()
def reader_coalesced(key):
    if key in cache:
        return cache[key]
    with fill_lock:                                    # only one thread fills the key
        if key not in cache:                           # re-check after waiting
            cache[key] = db_fetch(key)
    return cache[key]

run(reader_no_lock, "No protection")      # ~100 DB queries
run(reader_coalesced, "With coalescing")  # 1 DB query` },
    { type: "p", text: "Without the lock, all 100 threads hit the database. With coalescing, one thread queries and the other 99 wait, then read the freshly filled cache. Across many servers, use a distributed lock (`SET key:lock <token> NX EX 5` in Redis) instead of a process lock." },
    { type: "h3", text: "Exercise 2: penetration and a Bloom filter" },
    { type: "p", text: "1,000 real users exist; an attacker requests 500 random IDs that don't. Compare database load with and without a Bloom filter:" },
    { type: "code", code: `import hashlib, random

VALID = {f"user:{i}" for i in range(1, 1001)}          # 1,000 real users

class BloomFilter:
    def __init__(self, size=10_000, hash_count=3):
        self.size, self.hash_count, self.bits = size, hash_count, [False] * size
    def _positions(self, item):
        return [int(hashlib.md5(f"{item}:{i}".encode()).hexdigest(), 16) % self.size
                for i in range(self.hash_count)]
    def add(self, item):
        for p in self._positions(item): self.bits[p] = True
    def might_contain(self, item):
        return all(self.bits[p] for p in self._positions(item))

bloom = BloomFilter()
for user in VALID:                                      # populate on the write path
    bloom.add(user)

attack = [f"user:{random.randint(10**6, 10**7)}" for _ in range(500)]
without = len(attack)                                   # every request reaches the DB
with_bloom = sum(1 for key in attack if bloom.might_contain(key))   # only false positives
print(f"DB queries without filter: {without}, with filter: {with_bloom}")` },
    { type: "p", text: "The filter blocks almost every fake key without any database work; a handful may pass as false positives (\"might exist\"), so database load drops from 500 queries to near zero." },
    { type: "h3", text: "Exercise 3: avalanche and TTL jitter" },
    { type: "p", text: "1,000 entries cached at the same moment, with the same TTL versus with jitter. Count how many expire in the busiest second:" },
    { type: "code", code: `import random
from collections import Counter

entries, base_ttl = 1000, 60

same_ttl = Counter(base_ttl for _ in range(entries))
jittered = Counter(base_ttl + random.randint(-6, 6) for _ in range(entries))   # ±10%

print("No jitter, peak expirations in one second:", max(same_ttl.values()))   # 1000
print("With jitter, peak expirations in one second:", max(jittered.values())) # ~80–100` },
    { type: "p", text: "Without jitter all 1,000 expire in the same instant, a burst of 1,000 database queries. With jitter they spread over a 12-second window and the peak drops to roughly 80–100 per second, an order of magnitude the database handles comfortably." },
    { type: "p", text: "In an interview, being able to name each failure mode, explain why it happens and describe its fix shows depth well beyond \"add Redis\". See also [caching in interviews](/learn/caching-in-interviews)." },
  ],
  uses: [
    { name: "Login and user-lookup APIs", text: "Bloom filters of valid IDs and short-lived negative caching block enumeration attacks with random IDs." },
    { name: "Flash sales and breaking news", text: "Request coalescing and early refresh keep a single viral key from stampeding the database." },
    { name: "Catalog and price caches", text: "Jittered TTLs prevent the nightly bulk load from expiring all at once." },
    { name: "Libraries", text: "Go's singleflight, Caffeine's async loading and Facebook's memcache leases implement coalescing; CDNs implement stale-while-revalidate." },
  ],
  interview: [
    "Name the three failure modes and their defenses: Bloom filter / null caching, TTL jitter, request coalescing.",
    "For any hot key, say how you avoid a stampede on expiry (lock, stale-while-revalidate or early refresh).",
    "For public lookup APIs, mention penetration attacks with random IDs and the Bloom filter defense.",
    "Combine all three; they're cheap compared with a database outage.",
  ],
  related: ["cache-invalidation", "cache-warming", "probabilistic-data-structures", "cache-high-availability", "distributed-locks", "caching"],
  practice: ["distributed-cache", "news-feed", "ticket-booking", "url-shortener"],
};
