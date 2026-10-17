export default {
  blocks: [
    { type: "p", text: "**Consistent hashing** is a way to spread keys across a changing set of servers so that adding or removing a server moves only a small fraction of the keys. It is the reason a distributed cache or database can grow from 10 to 11 nodes without reshuffling almost all of its data." },

    { type: "h2", text: "The problem with hash mod N" },
    { type: "p", text: "The obvious way to pick a server for a key is `server = hash(key) % N`. It spreads keys evenly, but it breaks badly when **N changes**. Go from 4 servers to 5 and a key stays on the same server only if `hash % 4 == hash % 5`, which is true for about 1 key in 5. Roughly **80% of keys move**." },
    { type: "p", text: "For a cache that means most lookups suddenly miss and fall through to the database at the worst possible moment, when you were adding capacity. For a database it means copying most of the data across the network." },
    { type: "table", head: ["Change", "Keys that move with hash mod N", "Keys that move with consistent hashing"], rows: [
      ["4 → 5 servers", "~80%", "~20% (only those the new server takes over)"],
      ["10 → 11 servers", "~91%", "~9%"],
      ["100 → 99 servers (one fails)", "~99%", "~1% (only the failed server's keys)"],
    ] },

    { type: "h2", text: "How the hash ring works" },
    { type: "p", text: "Imagine the output range of a hash function (say 0 to 2^32 − 1) bent into a circle. Both **servers** and **keys** are hashed onto this same ring. Each key belongs to the **first server clockwise** from its position." },
    { type: "diagram", kind: "ring", caption: "Keys (diamonds) belong to the next server clockwise. k1 and k2 go to B, k3 to C, k4 to D, and k5 wraps around to A.", nodes: [
      { label: "Server A", angle: 20 }, { label: "Server B", angle: 110 }, { label: "Server C", angle: 200 }, { label: "Server D", angle: 290 },
    ], keys: [
      { label: "k1", angle: 55 }, { label: "k2", angle: 90 }, { label: "k3", angle: 160 }, { label: "k4", angle: 245 }, { label: "k5", angle: 330 },
    ] },
    { type: "p", text: "Now watch what happens when the membership changes:" },
    { type: "ul", items: [
      "**Adding server E** between C and D: E takes over only the keys between C and E that used to belong to D. Every other key stays exactly where it was.",
      "**Removing server B**: only B's keys (k1 and k2) move, to the next server clockwise, C. Nothing else moves.",
    ] },
    { type: "p", text: "On average, adding or removing one of N servers moves **about 1/N of the keys**, the minimum possible, since the new server has to get its share from somewhere." },

    { type: "h2", text: "Virtual nodes fix uneven load" },
    { type: "p", text: "With only a few points on the ring, the gaps between servers are random, so one server can easily own twice another's share. And when a server fails, its whole range lands on **one** neighbour, doubling that neighbour's load." },
    { type: "p", text: "The fix is **virtual nodes (vnodes)**: hash each physical server onto the ring many times, for example `hash(\"A#1\")`, `hash(\"A#2\")` … `hash(\"A#200\")`. Each server now owns many small arcs spread around the ring:" },
    { type: "ul", items: [
      "Load evens out, because many small random arcs average out. With 100–200 vnodes per server the spread is typically within a few percent.",
      "When a server fails, its arcs are scattered, so its load spreads across **all** remaining servers instead of one unlucky neighbour.",
      "Heterogeneous hardware is easy: give a server with twice the capacity twice as many vnodes.",
    ] },
    { type: "diagram", kind: "ring", caption: "With virtual nodes, each physical server (A, B, C) appears several times around the ring, so ownership is spread out and evens up.", nodes: [
      { label: "A1", angle: 10, tone: "store" }, { label: "B1", angle: 55, tone: "cache" }, { label: "C1", angle: 95, tone: "ok" },
      { label: "A2", angle: 140, tone: "store" }, { label: "C2", angle: 185, tone: "ok" }, { label: "B2", angle: 225, tone: "cache" },
      { label: "A3", angle: 270, tone: "store" }, { label: "B3", angle: 305, tone: "cache" }, { label: "C3", angle: 340, tone: "ok" },
    ] },

    { type: "h2", text: "Looking up a key" },
    { type: "p", text: "In code, the ring is just a **sorted array of vnode positions**. Finding a key's server is a binary search for the first position greater than or equal to the key's hash, wrapping to the start if you run off the end: O(log V) for V virtual nodes." },
    { type: "code", code: `
positions = sorted(hash(f"{server}#{i}") for server in servers for i in range(200))
owner = {hash(f"{server}#{i}"): server for server in servers for i in range(200)}

def server_for(key):
    h = hash(key)
    i = bisect_left(positions, h)
    return owner[positions[i % len(positions)]]    # wrap around the ring
` },

    { type: "h2", text: "Replication on the ring" },
    { type: "p", text: "Databases like Cassandra and DynamoDB also use the ring to place **replicas**: a key is stored on its owner and the next **N − 1 distinct physical servers** clockwise (skipping further vnodes of a server already chosen). Combined with read and write quorums, this gives a simple, decentralised answer to \"which three machines hold this key?\" See [replication](/learn/replication)." },

    { type: "h2", text: "Alternatives" },
    { type: "table", head: ["Approach", "How it works", "Trade-off"], rows: [
      ["Rendezvous (HRW) hashing", "Score every server with `hash(key, server)`, pick the highest", "Same minimal movement, no ring or vnodes, but O(N) per lookup"],
      ["Jump consistent hash", "A tiny arithmetic function maps a key to a bucket number", "Very fast and even, but servers must be numbered and only the last one can be removed"],
      ["Range partitioning with a directory", "A lookup table maps key ranges to servers", "Flexible splits and moves, but needs a metadata service. See [sharding](/learn/sharding)"],
      ["Fixed partitions", "Hash into, say, 4,096 slots and assign slots to servers", "Redis Cluster's 16,384 hash slots: simple rebalancing by moving whole slots"],
    ] },
  ],
  uses: [
    { name: "Amazon DynamoDB and Cassandra", text: "Partition data across nodes on a token ring with virtual nodes, and place replicas on the next distinct nodes clockwise." },
    { name: "Memcached clients (ketama)", text: "Client libraries hash keys onto a ring of cache servers so adding a cache node invalidates only a small slice of the cache." },
    { name: "Load balancers", text: "Envoy's ring-hash and Maglev policies send all requests for a key (a user, a session, a shard) to the same backend, keeping its local cache warm." },
    { name: "Discord, Akamai and CDNs", text: "Route a user, a guild or a URL to a consistent set of servers so in-memory state and caches are reused." },
  ],
  interview: [
    "Reach for consistent hashing whenever servers in a cache or partitioned store are added or removed often, and quantify the win: about 1/N of keys move instead of nearly all.",
    "Always mention virtual nodes; a ring without them is the most common follow-up gap.",
    "Explain how replicas are placed on the next distinct nodes, then connect it to quorum reads and writes.",
    "Know that it balances **keys**, not **load**: a single hot key still lands on one server, so you still need caching or key splitting for celebrities and viral items.",
  ],
  related: ["sharding", "replication", "load-balancing", "caching", "nosql-database-types"],
  practice: ["distributed-cache", "key-value-store", "url-shortener"],
};
