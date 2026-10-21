<!--
Interviewer guides: Software engineering track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
Format: "# guide: <prompt-id>" followed by the six required "## " sections.
-->

# guide: url-shortener
## Scope and scale
Assume ~100M new links/month and a read:write ratio around 100:1 (tens of thousands of redirects/s at peak). Redirect latency is the critical path; creation can be slower. Links may be permanent or expire; custom aliases are optional.
## Core components
Create API and redirect path (can be separate services so they scale independently), short-code generator, durable key-value or relational store keyed by short code, cache in front of reads (hot codes), optional CDN/edge for redirects, analytics captured asynchronously.
## Key decisions and trade-offs
- Code generation: counter + base62 (needs a distributed ID source or ranges per instance), random codes with collision check, or hashing with collision handling. Length vs keyspace (7 base62 chars ≈ 3.5T).
- 301 vs 302: 301 is cacheable by browsers (less load, loses analytics); 302 keeps every hit visible.
- Storage: simple KV access pattern suits NoSQL or sharded SQL; the key is the short code.
- Expiry via TTL/lazy deletion plus a background cleanup.
## Common mistakes
No strategy for unique codes across multiple instances; synchronous analytics writes on the redirect path; no cache for a read-heavy workload; ignoring abuse (malicious URLs, enumeration of sequential codes).
## Deep-dive questions
How do two API instances avoid issuing the same code? What happens on a cache miss storm for a viral link? How would you shard the store? How do you expire links? How do you prevent enumeration or spam?
## What strong looks like
Separate read/write paths, an explicit collision-free generation scheme, cache with sensible TTL, async analytics, a sharding story, expiry handled, and a note on abuse/security. Rationale for each choice is stated.

# guide: chat-system
## Scope and scale
One-to-one messaging (group chat optional). Assume tens of millions of daily users, millions of concurrent connections, messages delivered in well under a second when both are online.
## Core components
Clients with persistent connections (WebSocket) to a stateless-ish gateway/connection tier, a session/presence registry mapping user → gateway node, chat service that assigns message IDs and persists, durable message store partitioned by conversation, a queue or pub/sub between services, push notification service for offline users, a sync/inbox mechanism for reconnects.
## Key decisions and trade-offs
- Delivery path: persist first, then deliver (durability) vs deliver first (latency).
- Ordering: per-conversation sequence numbers or server timestamps; global ordering isn't needed.
- Receipts: sent (server ack), delivered (recipient device ack), read; each is a small state transition.
- Storage: wide-column store (e.g. Cassandra-style) keyed by conversation and time suits append-heavy reads of recent history.
- Offline: store-and-forward plus push notification; client pulls missed messages using a last-seen cursor.
## Common mistakes
Polling instead of persistent connections; no way to find which server holds the recipient's connection; no idempotency (client retries create duplicates); ignoring multi-device; ordering by client clocks.
## Deep-dive questions
How does a message reach a user connected to a different gateway node? How are duplicates avoided when the client retries? How does a device catch up after being offline for a week? What happens when a gateway node dies?
## What strong looks like
Clear connection tier with a routing registry, persistence before ack, per-conversation ordering, client message IDs for dedupe, explicit receipt states, offline catch-up and push, and partitioning of the message store.

# guide: news-feed
## Scope and scale
Hundreds of millions of users, average follows in the hundreds, some accounts with tens of millions of followers. Feed reads vastly outnumber posts. Feed load should feel instant (<200 ms).
## Core components
Post service and store, social graph store, fan-out workers driven by a queue, precomputed feed cache per user (list of post IDs), feed service that hydrates IDs into posts, ranking service, media on object storage + CDN.
## Key decisions and trade-offs
- Fan-out on write (push to followers' feeds: fast reads, expensive for celebrities) vs fan-out on read (pull at read time: cheap writes, slow reads). Strong answers use a hybrid: push for normal accounts, pull for high-follower accounts and merge at read time.
- Store IDs in the feed cache, hydrate content separately so edits/deletes stay consistent.
- Ranking: chronological vs ranked; ranking as a separate stage over a candidate set.
- Cache limits per user (e.g. last ~500 items) and fallback for inactive users.
## Common mistakes
Pure fan-out on write with no celebrity handling; querying the graph and posts at read time for every request; no pagination/cursors; storing full post bodies in every feed.
## Deep-dive questions
What happens when an account with 50M followers posts? How do you handle deleted posts? How do you keep feeds for inactive users from wasting memory? Where does ranking happen and with what latency budget?
## What strong looks like
Hybrid fan-out justified with numbers, async workers via a queue, ID-based feed cache with hydration, cursor pagination, ranking boundary defined, hot-account and viral-post handling.

# guide: file-storage
## Scope and scale
Users upload files from MBs to many GBs, sync across devices, and share. Hundreds of millions of files; storage is the dominant cost; uploads must resume after interruption.
## Core components
Clients with a sync agent, metadata service (files, folders, versions, permissions) on a strongly consistent database, block/chunk storage on object storage, upload service issuing pre-signed URLs, notification/sync service (long poll or push) so devices learn about changes, CDN or direct download from object storage.
## Key decisions and trade-offs
- Chunking (e.g. 4–8 MB) enables resumable uploads, parallelism, and deduplication by content hash; only changed chunks re-upload.
- Separate metadata (transactional) from blobs (cheap, durable object storage).
- Sync model: server is source of truth with versioned metadata; conflicts create a "conflicted copy" or use last-writer-wins with history.
- Direct-to-object-storage uploads via signed URLs keep app servers out of the data path.
## Common mistakes
Uploading whole files through application servers; storing files in the database; no resumability; no conflict strategy for edits on two devices; ignoring access control on download URLs.
## Deep-dive questions
How does a 10 GB upload resume after a network drop? How do other devices learn about a change? What happens if two devices edit the same file offline? How would deduplication work and what are its privacy implications?
## What strong looks like
Chunked, resumable, direct-to-storage uploads; metadata/blob separation; change notification for sync; explicit conflict handling; versioning; signed, permission-checked downloads.

# guide: rate-limiter
## Scope and scale
Limit requests per user or API key across a fleet of API servers, with per-customer quotas. Adds only a millisecond or two per request at high QPS.
## Core components
Limiter logic in the gateway/middleware, a fast shared counter store (e.g. Redis cluster) or local counters with periodic sync, a quota/rules configuration service, response headers (remaining, reset) and 429 responses.
## Key decisions and trade-offs
- Algorithms: token bucket (allows bursts, common), leaky bucket (smooth), fixed window (simple, boundary spikes), sliding window log (accurate, memory-heavy), sliding window counter (good compromise).
- Centralised counters (accurate, extra hop) vs local + approximate (fast, slightly over-admits). Atomicity via Lua scripts or atomic increments.
- Fail-open (availability) vs fail-closed (protection) when the counter store is down; often fail-open with local fallback limits.
- Where to enforce: edge/gateway vs per-service.
## Common mistakes
Non-atomic read-then-write counters causing races; a single Redis node as a SPOF; per-server limits that multiply with fleet size; no plan for the limiter store failing; no per-customer configuration.
## Deep-dive questions
Which algorithm and why? How do you keep counts correct across 50 API servers? What happens if Redis is unavailable? How are quota changes rolled out? How do you handle hot keys from one huge customer?
## What strong looks like
Algorithm chosen with burst behaviour explained, atomic distributed counters with sharding/replication, explicit fail-open/closed decision, configurable per-tenant rules, low-latency placement, client-facing headers.

# guide: video-streaming
## Scope and scale
Creators upload large videos; millions of viewers stream concurrently on varied networks and devices. Egress bandwidth is the main cost; start-up time and rebuffering are key quality metrics.
## Core components
Upload service with resumable uploads to object storage, transcoding pipeline (queue + workers producing multiple renditions and segment files), manifest generation (HLS/DASH), metadata service, CDN for segments, playback service issuing signed URLs, view/analytics pipeline.
## Key decisions and trade-offs
- Transcode into a bitrate ladder; split into segments; adaptive bitrate on the client chooses quality per segment.
- Parallel transcoding by chunks to reduce time; tradeoff between storage cost and number of renditions.
- CDN caching with popularity-based prefetch; long-tail content may be served from origin.
- DRM/signed URLs for protected content.
## Common mistakes
Serving video from application servers; a single rendition; synchronous transcoding in the upload request; no CDN; ignoring the cost of storing many renditions.
## Deep-dive questions
How does the player adapt when bandwidth drops? How is a 2-hour 4K upload transcoded quickly? How do you serve a newly viral video before CDNs are warm? How are view counts collected at scale?
## What strong looks like
Async, parallel transcoding to a ladder of renditions; segmented ABR streaming; CDN-centred delivery with origin shielding; metadata/blob separation; analytics decoupled from playback.

# guide: ride-hailing
## Scope and scale
Millions of riders and drivers; drivers send location every few seconds (hundreds of thousands of updates/s). Matching should complete within seconds; trip state must be reliable.
## Core components
Driver location service ingesting updates into an in-memory geospatial index (geohash/H3/quadtree), matching/dispatch service, trip service with a state machine and durable store, pricing/ETA service, notification/real-time channel to apps, payments integration.
## Key decisions and trade-offs
- Geospatial index: geohash cells or H3 with neighbour search; partition by region/city.
- Location updates are ephemeral: keep in memory, persist sampled history asynchronously.
- Matching: nearest available vs optimise for ETA/fairness; lock/offer a driver to avoid double-dispatch.
- Trip state machine (requested → matched → arriving → in progress → completed/cancelled) with idempotent transitions.
## Common mistakes
Writing every location update to a relational DB; scanning all drivers to find nearby ones; no guard against assigning one driver to two riders; no plan for app disconnects mid-trip.
## Deep-dive questions
How do you find the 10 nearest available drivers in milliseconds? What prevents two riders getting the same driver? How is the system partitioned across cities? What happens if the driver's phone goes offline mid-trip?
## What strong looks like
In-memory geo index partitioned by region, cheap ingestion of location updates, atomic driver reservation during matching, explicit trip state machine persisted durably, real-time updates to both parties.

# guide: ticket-booking
## Scope and scale
Big on-sales create massive spikes (millions of users for tens of thousands of seats within minutes). Correctness (no double-selling) matters more than throughput.
## Core components
Event/catalog service (cacheable), seat inventory service on a strongly consistent store, reservation holds with expiry, checkout/payment service, virtual waiting room/queue to admit users at a controlled rate, notification service.
## Key decisions and trade-offs
- Prevent double-sell: row-level locking or conditional updates (seat status + version), or per-seat atomic ops; serialise per event/section.
- Temporary holds with TTL (e.g. 10 minutes) released by expiry jobs or lazy checks.
- Waiting room to protect the inventory system; fairness (FIFO tokens) vs throughput.
- Read-heavy seat maps served from cache with eventual consistency; final check at reservation time.
## Common mistakes
Check-then-write races; relying on cache for availability decisions; holds that never expire; letting the spike hit the database directly; payment failures leaving seats locked.
## Deep-dive questions
Two users click the same seat at the same millisecond: what happens? How do expired holds get released? How do you survive 2M users arriving at 10:00? What if payment succeeds but the confirmation write fails?
## What strong looks like
Atomic seat reservation, expiring holds, waiting room/admission control, cached reads with authoritative writes, idempotent payment + booking confirmation, and recovery for partial failures.

# guide: notification-service
## Scope and scale
Many internal services send notifications via push, email, SMS. Millions per hour with bursts; some are critical (security codes), many are marketing. Providers have rate limits and outages.
## Core components
Ingestion API (validates, idempotency key), user preference and quiet-hours service, template/rendering service, priority queues per channel, channel workers integrating providers, retry with backoff and dead-letter queue, delivery status tracking, rate limiting per provider and per user.
## Key decisions and trade-offs
- Separate queues by priority and channel so marketing bursts don't delay critical messages.
- At-least-once delivery with dedupe on idempotency keys; exactly-once is impractical with external providers.
- Provider failover (secondary SMS/email provider) and circuit breakers.
- Respect preferences and quiet hours at send time, not only at submit time.
## Common mistakes
A single queue for everything; synchronous provider calls in the API request; no dedupe causing duplicate texts; dropping messages on provider errors; ignoring opt-outs (legal risk).
## Deep-dive questions
How do you guarantee a 2FA code isn't delayed by a marketing campaign? What happens when the SMS provider is down for 20 minutes? How are duplicates prevented on retries? How do you track delivery?
## What strong looks like
Async, prioritised, per-channel pipeline; idempotency and dedupe; retries, DLQ, and provider failover; preference enforcement; delivery tracking and quotas.

# guide: web-crawler
## Scope and scale
Crawl billions of pages, discovering links and refetching changed pages, while being polite to each host (robots.txt, rate limits).
## Core components
URL frontier (prioritised queues, partitioned by host), DNS resolver cache, fetcher workers, robots.txt cache, content parser/link extractor, URL dedupe (seen-set, e.g. Bloom filter + store), content dedupe (hash/simhash), document store, recrawl scheduler.
## Key decisions and trade-offs
- Frontier design: front queues for priority, back queues per host to enforce politeness (one connection per host, delay between requests).
- Partition by host hash so one worker owns a host's politeness state.
- URL normalisation before dedupe; Bloom filters trade memory for false positives.
- Recrawl frequency based on change rate and importance.
## Common mistakes
A single global queue (hammers hosts); no robots.txt; no URL normalisation causing endless duplicates; crawler traps (infinite calendars); no checkpointing of the frontier.
## Deep-dive questions
How do you guarantee you never hit one host with 100 concurrent requests? How do you detect near-duplicate pages? How do you avoid crawler traps? How is the frontier persisted and recovered?
## What strong looks like
Host-partitioned frontier with politeness, robots handling, URL and content dedupe, trap protection, recrawl policy, and distributed workers with checkpointed state.

# guide: autocomplete
## Scope and scale
Suggestions on every keystroke for a large search product: p99 under ~100 ms end to end, very high QPS, top 5–10 suggestions per prefix.
## Core components
Suggestion service with an in-memory prefix index (trie with precomputed top-k per node, or sorted prefix tables), sharding by prefix, caches (CDN/edge and client-side for short prefixes), offline/stream aggregation of query logs, periodic index builder and hot-swap deployment.
## Key decisions and trade-offs
- Precompute top-k per prefix (fast reads, larger index) vs compute at query time.
- Freshness: batch rebuild (hourly/daily) plus a small real-time trending layer merged at query time.
- Shard by prefix range; skew from popular prefixes handled by replication and caching.
- Client debouncing and caching cut load.
## Common mistakes
Querying a database with LIKE 'prefix%'; rebuilding the index in place causing downtime; no filtering of offensive/PII queries; ignoring client-side debouncing.
## Deep-dive questions
How do you get top-10 for a prefix in under 10 ms? How does a breaking trend appear within minutes? How do you deploy a new index without downtime? How do you shard and handle hot prefixes?
## What strong looks like
In-memory precomputed top-k index, sharding and replication, multi-layer caching, offline aggregation plus a fresh trending path, blue/green index swaps, and content filtering.

# guide: collaborative-editor
## Scope and scale
Documents edited by several people at once (typically < 50 concurrent editors per doc), millions of documents; edits appear in ~100–200 ms; offline edits merge on reconnect.
## Core components
Real-time collaboration service (WebSocket) with documents assigned to a session server, operation log / CRDT state store, snapshot service (periodic compaction), presence service, permission service, version history store.
## Key decisions and trade-offs
- OT (needs central ordering server, mature for text) vs CRDT (decentralised, merges offline edits, metadata overhead).
- Route all editors of a doc to one server (simplifies ordering) with failover.
- Persist an op log plus periodic snapshots for fast load and history.
- Permissions checked on connect and on each op.
## Common mistakes
Last-writer-wins on whole documents; sending full documents on each keystroke; no snapshotting so load time grows forever; ignoring reconnect/offline merge.
## Deep-dive questions
Two users type at the same position simultaneously: how do edits converge? What happens when the session server dies? How do you load a document with a million operations quickly? How is version history implemented?
## What strong looks like
Explicit OT or CRDT choice with reasoning, per-document session routing, op log + snapshots, presence, reconnect/offline handling, and history with restore.

# guide: paste-service
## Scope and scale
Text snippets (up to ~1 MB), shared via stable links, optional expiry and private access. Read-heavy (~10:1 or more).
## Core components
Create API, ID generator, metadata store (ID, owner, expiry, visibility), content in object storage (or DB for small pastes), read path with cache/CDN for public pastes, expiry cleanup job, abuse/rate limiting.
## Key decisions and trade-offs
- ID generation: random base62 IDs long enough to resist guessing (privacy for unlisted pastes) vs sequential (enumerable).
- Metadata in DB, content in object storage; inline small pastes for simplicity.
- Expiry: TTL index or lazy check on read plus batch deletion.
- Private pastes require auth checks and must not be CDN-cached publicly.
## Common mistakes
Sequential IDs that expose all pastes; caching private pastes on a public CDN; no size limits or abuse protection; no cleanup of expired content.
## Deep-dive questions
How do you make unlisted links hard to guess? How do expired pastes get deleted from storage and caches? How do you prevent spam and malware hosting?
## What strong looks like
Unguessable IDs, metadata/content split, cached public reads, auth on private reads, expiry with cleanup, rate limiting and abuse controls.

# guide: payment-platform
## Scope and scale
Merchants create and query payments; the platform calls external processors. Correctness and auditability dominate: no double charges, every state change traceable.
## Core components
Payments API with idempotency keys, payment state machine service, ledger (double-entry, append-only) on a strongly consistent database, processor adapters, async event/outbox for notifications and webhooks, reconciliation jobs against processor settlement reports, risk checks.
## Key decisions and trade-offs
- Idempotency keys stored with request fingerprint and response to make client retries safe.
- Explicit state machine (created → authorised → captured → settled/refunded/failed) with guarded transitions.
- Unknown outcomes on processor timeout: mark pending and resolve via status query/reconciliation, never blind-retry a charge.
- Transactional outbox to publish events reliably.
- Double-entry ledger as source of truth for balances.
## Common mistakes
Retrying a timed-out charge without checking status; mutable balance columns without a ledger; no idempotency; publishing events outside the transaction; no reconciliation.
## Deep-dive questions
The processor times out after 30 seconds: was the customer charged? How do you make the merchant's retry safe? How do you detect a mismatch with the processor's records? How do you audit who changed what?
## What strong looks like
Idempotency end to end, explicit state machine, handling of unknown outcomes, ledger, outbox events, reconciliation, and audit trail.

# guide: task-scheduler
## Scope and scale
Clients submit delayed and recurring (cron) tasks; millions scheduled per day; tasks must not be lost and should run close to their scheduled time.
## Core components
Submission API, durable task store indexed by next run time (partitioned/bucketed by time), scheduler/poller nodes owning partitions, dispatch queue, worker pool, lease/heartbeat tracking, retry policy and DLQ, recurring-task expansion.
## Key decisions and trade-offs
- Time-bucketed partitions so each scheduler scans only due tasks; partition ownership via leases/coordination.
- At-least-once execution with leases: a worker claims a task with a timeout; if it crashes, the lease expires and another worker runs it, so tasks must be idempotent.
- Recurring tasks: compute next run on completion or pre-expand.
## Common mistakes
A single scheduler node; scanning the whole table each tick; no leases so crashed tasks vanish; assuming exactly-once; clock-skew issues between schedulers.
## Deep-dive questions
What happens if a worker crashes halfway through? How do two scheduler nodes avoid dispatching the same task? How do you handle a backlog after an outage? How are retries and backoff configured?
## What strong looks like
Durable time-indexed store, partitioned schedulers with ownership, leases and heartbeats, at-least-once with idempotency guidance, retries and DLQ, monitoring of lag.

# guide: distributed-cache
## Scope and scale
A shared cache service (Memcached/Redis-like) with millions of ops/s, sub-millisecond to low-millisecond latency, terabytes of data across many nodes.
## Core components
Client library or proxy routing via consistent hashing, cache nodes with in-memory storage and eviction (LRU/LFU), replication per shard, cluster membership/config service, TTL handling, metrics.
## Key decisions and trade-offs
- Consistent hashing with virtual nodes to minimise remapping when nodes join/leave.
- Replication (primary/replica) for availability vs memory cost; async replication may lose recent writes on failover (acceptable for a cache).
- Hot keys: replicate hot keys, client-side local caching, or key splitting.
- Eviction policy and memory management.
## Common mistakes
Modulo hashing (mass remapping on resize); no plan for node failure; treating the cache as durable storage; ignoring thundering herd on popular key expiry.
## Deep-dive questions
What happens to traffic when one node dies? How do you add capacity without a stampede to the database? How do you handle a single key receiving 1M reads/s? How do you avoid many keys expiring at once?
## What strong looks like
Consistent hashing, replication and failover, eviction and TTL strategy, hot-key mitigation, stampede protection (request coalescing, jittered TTLs), membership management.

# guide: api-gateway
## Scope and scale
Multi-tenant gateway in front of many services: auth, routing, per-tenant policies and rate limits, at high QPS with low added latency. Config changes must roll out safely.
## Core components
Data plane (stateless gateway nodes doing TLS termination, authN/Z, routing, rate limiting, transforms), control plane (tenant config, routes, policies, versioned), config distribution (push/watch) with local caches, rate-limit store, observability per tenant.
## Key decisions and trade-offs
- Separate control plane from data plane: data plane keeps serving with last-known-good config if the control plane is down.
- Config rollout: validation, versioning, staged/canary rollout, fast rollback.
- Tenant isolation: per-tenant rate limits, quotas, noisy-neighbour protection, possibly dedicated pools for large tenants.
- Auth: token validation locally (JWT/JWKS caching) vs remote introspection.
## Common mistakes
Data plane querying a database per request for config; global config pushes without validation; no tenant isolation; the gateway becoming a SPOF without horizontal scaling.
## Deep-dive questions
What happens to traffic if the control plane is down? How do you roll out a bad route change safely? How do you stop one tenant from starving others? Where do you validate tokens?
## What strong looks like
Clear control/data plane split, cached config with last-known-good fallback, validated staged rollouts, per-tenant isolation and limits, local auth validation, horizontal scaling and observability.

# guide: comment-system
## Scope and scale
Comments under posts or videos (Instagram/YouTube style). Viral posts get bursts of thousands of comments per second; reads outnumber writes by orders of magnitude. A few seconds of delay before a new comment is visible to others is acceptable.
## Core components
Write API that validates and enqueues the comment and returns immediately; a durable queue (Kafka) partitioned by post_id; consumers that persist to a comment store (document or wide-column, keyed by post_id + time) and then update a cache; read API serving pages of comments from the cache (e.g. a sorted set per post) with fallback to the store on a miss; optional moderation and counters as additional consumers.
## Key decisions and trade-offs
- Queue as a buffer: absorbs bursts the database cannot write at once, at the cost of eventual consistency.
- Separate read and write paths so heavy reads never touch the write store directly.
- Cache shape: bounded recent comments per post with TTL vs caching everything; cursor pagination over a time-ordered key.
- Idempotent consumers (client comment IDs, upserts) because the queue delivers at least once.
- Partition by post_id to keep per-post order; hot posts may need extra caching.
## Common mistakes
Writing synchronously to the database on every request; reading comments straight from the primary store; returning all comments with no pagination; ignoring duplicate deliveries from the queue; not mentioning that a user's own comment should appear immediately (read-your-writes in the client).
## Deep-dive questions
What happens when a celebrity post gets 50,000 comments in a minute? How does the cache get rebuilt after a restart or a miss? How do you avoid duplicate comments when a consumer retries? How would you add moderation or comment counts?
## What strong looks like
Queue-buffered writes with acknowledgement after enqueue, idempotent consumers, a time-ordered store keyed by post, a bounded cache with pagination and miss handling, an explicit eventual-consistency statement with read-your-writes for the author, and partitioning by post_id.

# guide: webhook-service
## Scope and scale
Receive webhook events from external providers (Stripe, Shopify, GitHub): about 1M events/day (~12/s, ~60/s at 5x peak), end-to-end processing under 200 ms, 30-day retention at ~5 KB/event (~150 GB). At-least-once processing for every accepted event.
## Core components
Public request handler behind a load balancer that verifies the signature and enqueues the raw event; durable, replicated message queue; consumer workers that process the event (business logic), persist the event and result, then acknowledge; database with replication; dead-letter queue; monitoring of queue depth and consumer lag.
## Key decisions and trade-offs
- Return 200 only after a durable enqueue; failures before that make the provider retry.
- Ack the queue message only after processing and persistence, so a crashed consumer's message is redelivered.
- HMAC signature over timestamp + raw body with a replay window; optional IP allowlisting and rate limiting.
- Idempotency by provider event ID (processed-events table in the same transaction) instead of relying on exactly-once delivery.
- Out-of-order events: never assume order; fetch current state from the provider API and use timestamps to skip stale events.
## Common mistakes
Processing synchronously inside the HTTP request; acknowledging before the event is durable; acking the queue before persisting; no signature verification; assuming events arrive once and in order; no plan for retries, backoff or poison messages.
## Deep-dive questions
What happens if the handler crashes after receiving but before enqueuing? How do you stop forged requests? What if the same event arrives twice? What if invoice.paid arrives before invoice.created? How does the system behave when the database is down?
## What strong looks like
Clear handler/queue/consumer split with correct ack points, failure analysis per component, HMAC verification with replay protection, idempotent and order-independent consumers, DLQ and retries with backoff, and monitoring on lag and errors.

# guide: dating-app
## Scope and scale
Tinder-style app: ~50M DAU, ~100 swipes each per day = 5B swipes/day (~58K writes/s, ~174K at peak); ~20 feed fetches per user per day (~11.6K reads/s), so the system is write-heavy. Swipe rows ~32 bytes (~160 GB/day). Chat after a match is out of scope.
## Core components
Profile store with a geo index (geohash/H3 cell -> user IDs); candidate service that builds a precomputed per-user candidate queue (geo cell + neighbours, then preferences, then seen filter, then ranking); swipe service writing to a swipe store sharded by swiper_id; match detection by a point read of the reverse swipe; matches table keyed by a deterministic match_id with insert-if-absent; per-user Bloom filter of swiped IDs in Redis; push notifications.
## Key decisions and trade-offs
- Shard swipes by swiper_id: writes spread evenly and a user's exclusions stay local; reverse lookups then hit the swipee's shard.
- Deterministic match_id = hash(min(a,b), max(a,b)) plus insert-if-absent makes simultaneous likes produce exactly one match.
- Bloom filter seen set (~9.6 bits/entry at 1% FP): no false negatives, so swiped profiles never return; a false positive only hides an unseen profile.
- Precompute candidate queues offline; order filters cheap to expensive; degrade to distance-sorted results if ranking is down.
- Hot profiles: cache a Bloom filter of each user's outgoing likes to absorb reverse-lookup reads.
## Common mistakes
Treating it as a read-heavy nearby-search problem and ignoring swipe volume; scanning tables for mutual likes; creating duplicate matches under races; storing full seen lists per user in memory; running live geo queries on every feed request.
## Deep-dive questions
What if two users like each other in the same millisecond? How do you guarantee a swiped profile never reappears? What happens to the shard of a very popular profile? How would you scale 10x or go multi-region?
## What strong looks like
Write-path-first sizing, swiper-sharded swipes, reverse-key match detection with idempotent match creation, Bloom-filter seen set with the right error direction, geo-indexed precomputed feeds, and graceful degradation.
