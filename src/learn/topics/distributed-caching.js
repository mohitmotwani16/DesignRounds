// Distributed caching: why shard, modulo vs consistent hashing, Redis Cluster hash slots and hash
// tags, client-side vs proxy routing, and the hot key problem.
export default {
  blocks: [
    { type: "p", text: "A single Redis node with 64 GB of RAM serves small and medium workloads well. When the working set or the request rate outgrows one machine, you need **several cache nodes**, and the central question becomes: **which node holds which key?** A distributed cache splits the key space across nodes so that, to the application, it still behaves like one big cache." },

    { type: "h2", text: "Why shard the cache" },
    { type: "ul", items: [
      "**Memory limit.** One machine has finite RAM. A 200 GB working set can't fit on one node; spread over 4 nodes it's 50 GB each.",
      "**Throughput limit.** One Redis node handles roughly 100,000–200,000 operations a second, depending on value size, command type and hardware. If the workload needs more, you must shard even if memory would fit.",
    ] },
    { type: "p", text: "Sharding gives each node a subset of the keys. For each key, the client works out which node owns it, sends the request there and gets the answer." },

    { type: "h2", text: "Hash-based routing (modulo)" },
    { type: "p", text: "The simplest scheme: hash the key and take the remainder by the number of nodes." },
    { type: "code", code: "node = hash(key) % num_nodes" },
    { type: "diagram", kind: "flow", caption: "Modulo routing: hash(key) % 4 picks one of four nodes. Even, simple, and fragile when the node count changes.", nodes: [
      { id: "k", label: "Key", sub: "product:99", col: 0, row: 1.5, shape: "pill" },
      { id: "h", label: "hash(key) % 4", col: 1.3, row: 1.5, tone: "accent" },
      { id: "n0", label: "Node 0", col: 2.6, row: 0, tone: "cache" },
      { id: "n1", label: "Node 1", col: 2.6, row: 1, tone: "cache" },
      { id: "n2", label: "Node 2", col: 2.6, row: 2, tone: "cache" },
      { id: "n3", label: "Node 3", col: 2.6, row: 3, tone: "cache" },
    ], edges: [{ from: "k", to: "h" }, { from: "h", to: "n0" }, { from: "h", to: "n1" }, { from: "h", to: "n2", tone: "accent", label: "= 2" }, { from: "h", to: "n3" }] },
    { type: "p", text: "Keys spread evenly, but adding or removing a node changes `num_nodes`, which changes the result for **nearly every key**. Going from 4 to 5 nodes remaps about **80%** of keys (a key stays put only if `h % 4 == h % 5`). Every remapped key is now a miss on its new node, so the database takes a burst of traffic until the cache re-warms." },

    { type: "h2", text: "Consistent hashing" },
    { type: "p", text: "Consistent hashing fixes the remapping problem. Both nodes and keys are placed on a circular hash space (a **ring**), and each key belongs to the **first node clockwise** from its position. Adding a node between two others only takes keys from its clockwise neighbor; every other assignment stays put. Adding or removing a node moves only about **1/N** of the keys; the other (N−1)/N stay where they are." },
    { type: "diagram", kind: "ring", caption: "Consistent hashing ring: each key belongs to the next node clockwise. Adding a node only takes over the keys in one arc.", nodes: [
      { label: "Cache A", angle: 30 }, { label: "Cache B", angle: 150 }, { label: "Cache C", angle: 260 },
    ], keys: [{ label: "user:7", angle: 90 }, { label: "cart:3", angle: 210 }, { label: "feed:9", angle: 330 }] },
    { type: "p", text: "In practice each physical node is placed at many points on the ring (**virtual nodes**) so load stays even and a departing node's keys spread over all the others. The full algorithm is in [consistent hashing](/learn/consistent-hashing); the same technique is used for sharding databases." },

    { type: "h2", text: "Redis Cluster: hash slots" },
    { type: "p", text: "Redis Cluster uses a fixed set of **16,384 hash slots** instead of a continuous ring. Each key maps to a slot with `CRC16(key) % 16384`, and each node owns a range of slots. To scale from 3 to 4 nodes, you (or your managed service) move some slots from the existing nodes to the new one. Only keys in moved slots migrate; clients may see brief redirections during the move, and all other slots are unaffected." },
    { type: "table", head: ["Nodes", "Slots per node", "Keys remapped on add"], rows: [
      ["3 → 4", "5,461 → 4,096", "~25%"],
      ["4 → 5", "4,096 → 3,277", "~20%"],
      ["6 → 7", "2,731 → 2,341", "~14%"],
    ] },
    { type: "diagram", kind: "segments", caption: "Adding a fourth node: each existing node hands about a quarter of its slots to node D; keys in unmoved slots never move.", lanes: [
      { label: "3 nodes", parts: [{ label: "Node A", sub: "slots 0–5460", size: 5461, tone: "store" }, { label: "Node B", sub: "5461–10922", size: 5462, tone: "ok" }, { label: "Node C", sub: "10923–16383", size: 5461, tone: "cache" }] },
      { label: "4 nodes", parts: [{ label: "A", sub: "4,096 slots", size: 4096, tone: "store" }, { label: "B", sub: "4,096 slots", size: 4096, tone: "ok" }, { label: "C", sub: "4,096 slots", size: 4096, tone: "cache" }, { label: "D (new)", sub: "4,096 slots", size: 4096, tone: "queue" }] },
    ], total: 16384 },
    { type: "p", text: "Redis Cluster has tooling to assign and rebalance slots, and managed services often automate it. Client libraries learn the slot map from any node and send each request straight to the right node, with no proxy." },
    { type: "p", text: "**Hash tags** put related keys on the same node: only the part inside braces is hashed, so `{user:123}:profile` and `{user:123}:settings` land in the same slot. That's required for multi-key operations such as `MGET` or transactions, which only work on co-located keys. See [cache key design](/learn/cache-key-design)." },

    { type: "h2", text: "Client-side vs proxy-based routing" },
    { type: "diagram", kind: "flow", caption: "Client-side routing: a cluster-aware client talks to the right node directly. Proxy routing: a simple client talks to a proxy, which forwards to the right shard.", zones: [{ label: "Client-side routing", from: [0, 0], to: [2.4, 0], tone: "accent" }, { label: "Proxy-based routing", from: [0, 1.5], to: [2.4, 1.5] }], nodes: [
      { id: "a1", label: "App", sub: "smart client + slot map", col: 0, row: 0 },
      { id: "s1", label: "Shard owning the key", col: 2.4, row: 0, tone: "cache" },
      { id: "a2", label: "App", sub: "plain client", col: 0, row: 1.5 },
      { id: "p", label: "Proxy", sub: "Twemproxy / Envoy", col: 1.2, row: 1.5, tone: "accent" },
      { id: "s2", label: "Shard owning the key", col: 2.4, row: 1.5, tone: "cache" },
    ], edges: [{ from: "a1", to: "s1", label: "direct" }, { from: "a2", to: "p" }, { from: "p", to: "s2", label: "+1 hop" }] },
    { type: "ul", items: [
      "**Client-side routing**: the client library holds the shard map (in Redis Cluster, the slot-to-node mapping) and sends each command straight to the right node. No extra hop, but every application needs a cluster-aware client.",
      "**Proxy-based routing**: a proxy such as Twemproxy or Envoy sits between the application and the cache nodes. The application uses a simple client and talks only to the proxy, which routes each request. One extra network hop, but simpler clients and a central place for access control.",
    ] },
    { type: "p", text: "Redis Cluster deployments usually use client-side routing, because direct connections save latency. Choose a proxy when applications can't use a cluster-aware client or you want centralized control." },

    { type: "h2", text: "The hot key problem" },
    { type: "p", text: "Sharding spreads keys evenly **by hash, not by popularity**. If one key gets 50% of all reads (a viral product page, a breaking news story), its shard handles half the total load while the others idle. That shard becomes the bottleneck no matter how many nodes you add. See [hot partitions](/learn/hot-partitions)." },
    { type: "diagram", kind: "flow", caption: "A hot key: one viral product takes half of all reads, so its shard saturates while the others sit idle.", nodes: [
      { id: "t", label: "All reads", col: 0, row: 1, shape: "pill" },
      { id: "s1", label: "Shard 1", sub: "product:viral · 50% load", col: 1.5, row: 0, tone: "danger" },
      { id: "s2", label: "Shard 2", sub: "~17% load", col: 1.5, row: 1, tone: "ok" },
      { id: "s3", label: "Shard 3", sub: "~17% load", col: 1.5, row: 2, tone: "ok" },
    ], edges: [{ from: "t", to: "s1", tone: "danger", label: "50%" }, { from: "t", to: "s2" }, { from: "t", to: "s3" }] },
    { type: "ul", items: [
      "**Read replicas per shard**: give each shard one or more replicas and spread the hot key's reads over the primary and its replicas. Helps, at the cost of complexity and memory.",
      "**Key splitting**: store the hot value under several suffixed keys (`product:viral:1` … `product:viral:10`) and have clients read a random one. Ten copies can spread load over up to 10 shards (depending on slot placement). The write path must update all copies: write amplification.",
      "**Local caching**: keep the hot key in each application server's memory (an in-process LRU with a short TTL). This can cut Redis traffic for that key dramatically, depending on the local hit rate and TTL, but adds a second layer to keep consistent.",
    ] },
    { type: "code", code: `import random

HOT_COPIES = 10

def write_hot(key, value, ttl=60):
    for i in range(1, HOT_COPIES + 1):                     # write amplification: 10 writes
        redis.set(f"{key}:{i}", value, ex=ttl)

def read_hot(key):
    return redis.get(f"{key}:{random.randint(1, HOT_COPIES)}")   # spreads reads across shards` },
    { type: "p", text: "Next: keeping the distributed cache serving when nodes fail, in [cache high availability](/learn/cache-high-availability)." },
  ],
  uses: [
    { name: "Redis Cluster and managed Redis", text: "Hash-slot sharding with client-side routing; ElastiCache and Memorystore automate resharding." },
    { name: "Memcached fleets", text: "Clients use consistent hashing (ketama) so adding a server moves only a fraction of keys." },
    { name: "Twitter's Twemproxy", text: "A proxy that shards requests across many Redis or Memcached servers for clients that aren't cluster-aware." },
    { name: "Flash sales and breaking news", text: "Hot keys are split into copies or cached in-process to avoid one overloaded shard." },
  ],
  interview: [
    "Shard when the working set or ops/sec exceed one node; say which limit you hit.",
    "Prefer consistent hashing or hash slots over modulo, and say how many keys move when a node is added.",
    "Mention hash tags when multi-key operations must work.",
    "Bring up the hot key problem and a mitigation: replicas, key splitting or local caching.",
  ],
  related: ["consistent-hashing", "cache-high-availability", "hot-partitions", "redis", "cache-key-design", "sharding"],
  practice: ["distributed-cache", "news-feed", "ticket-booking"],
};
