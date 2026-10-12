<!--
Interviewer guides: Frontend & mobile track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
-->

# guide: offline-first-sync
## Scope and scale
A notes app on mobile and web: full create/edit offline, sync across a user's devices when online, predictable resolution of concurrent edits.
## Core components
Local database on device (SQLite/IndexedDB) as the source for UI, local change log/outbox of operations, sync engine (push local changes, pull remote changes since a cursor), backend sync API with per-user change feed and server versions, conflict resolution layer, background sync scheduling.
## Key decisions and trade-offs
- Operation log vs state snapshots for sync.
- Cursor/version-based incremental sync rather than full refresh.
- Conflicts: last-writer-wins per field (simple, may lose edits), version vectors with "conflicted copy", or CRDTs for text (merges, more complexity).
- Idempotent sync operations with client-generated IDs so retries don't duplicate notes.
## Common mistakes
UI reading from network instead of local DB; full re-download on every sync; timestamps from device clocks as the only ordering; duplicate notes from retried creates; deletes that resurrect (no tombstones).
## Deep-dive questions
A note is edited on the phone and laptop while both are offline: what does the user see? How does a device that was offline for a month catch up efficiently? How are deletes propagated?
## What strong looks like
Local-first storage, outbox with idempotent ops, cursor-based incremental sync, explicit conflict policy with tombstones, and background/retry behaviour.

# guide: image-feed-client
## Scope and scale
A mobile/web client showing a feed of thousands of image-heavy items; smooth 60 fps scrolling; quick image loading; usable on flaky networks.
## Core components
Paginated feed API (cursor-based), list virtualisation/recycling, image CDN with on-the-fly resizing and modern formats, responsive image selection by device size/density, memory and disk image caches, prefetching of upcoming items, placeholders (blur hashes), offline cache of recent feed, retry/backoff.
## Key decisions and trade-offs
- Virtualised lists keep memory bounded.
- Request the right size from the CDN (not full-resolution images scaled down).
- Prefetch window: smoother UX vs bandwidth/battery.
- Cache eviction policies for memory vs disk.
## Common mistakes
Rendering all items; downloading original images; decoding on the main thread; no placeholders causing layout shift; no offline/stale content strategy.
## Deep-dive questions
How do you keep scrolling smooth with 5,000 items? How does the client choose image size? What does the user see on a train with intermittent connectivity? How do you avoid memory pressure crashes?
## What strong looks like
Virtualisation, cursor pagination, CDN resizing with correct sizes and formats, layered caches, prefetching, placeholders, and graceful offline behaviour.

# guide: mobile-release-flags
## Scope and scale
Mobile apps can't be instantly updated; features must roll out to subsets of users and be disabled remotely; old app versions keep working with newer backends.
## Core components
Feature flag/remote config service with targeting rules (percentage, segment, app version, platform), client SDK with local caching and safe defaults, staged rollout tooling, kill switches, analytics on flag exposure, versioned backend APIs with compatibility policy, minimum-supported-version enforcement.
## Key decisions and trade-offs
- Flags evaluated on device (fast, offline) vs server (secure, consistent).
- Safe defaults when config can't be fetched (feature off).
- API versioning and additive changes; deprecation timelines; forced upgrade only as last resort.
- Flag hygiene: remove stale flags.
## Common mistakes
No default when the flag service is unreachable; breaking API changes for old app versions; flags that never get cleaned up; no exposure tracking for experiments.
## Deep-dive questions
A feature crashes on Android 12 only: how do you turn it off for just those users? How long must old API versions be supported? What happens on first launch with no network?
## What strong looks like
Targeted, staged rollouts with kill switches, cached configs with safe defaults, backward-compatible API versioning, minimum version policy, and exposure analytics.

# guide: collaborative-whiteboard
## Scope and scale
A browser whiteboard where participants see each other's strokes and cursors in near real time, the board converges for everyone, and large boards stay responsive.
## Core components
Client document model (CRDT or OT-based shapes), real-time transport (WebSocket) to a room server, presence channel (cursors, selections) separate from durable document updates, persistence (op log + snapshots), rendering pipeline (canvas/WebGL, spatial index, viewport culling, layering), reconnection and offline buffering.
## Key decisions and trade-offs
- CRDT (easy merging, offline-friendly) vs OT with server ordering.
- Presence is ephemeral and throttled; document ops are durable.
- Rendering: canvas/WebGL with viewport culling and incremental redraws vs DOM/SVG (simpler, slow at scale).
- Batching updates per animation frame.
## Common mistakes
Sending full board state per change; persisting cursor movements; re-rendering everything each frame; no reconnect reconciliation.
## Deep-dive questions
Two users move the same shape simultaneously: what is the final state? How do you render 50,000 shapes smoothly? What happens when a user reconnects after a minute offline?
## What strong looks like
Clear CRDT/OT choice, separated presence and durable ops, efficient rendering pipeline with culling and batching, persistence with snapshots, and robust reconnection.

# guide: micro-frontend-platform
## Scope and scale
Several teams own sections of one web app and deploy independently, while navigation, auth, and design system stay consistent and failures stay contained.
## Core components
Shell/host application (routing, auth, layout), composition mechanism (runtime via module federation/import maps, build-time, or server-side composition), manifest/registry of deployed micro-frontends and versions, shared dependency strategy, design system package, contracts for cross-app communication (events), error boundaries and fallbacks, performance budgets.
## Key decisions and trade-offs
- Runtime composition (independent deploys) vs build-time (simpler, coupled releases).
- Shared dependencies: singleton frameworks to avoid duplication vs isolation; version skew handling.
- Isolation: error boundaries, iframes for strong isolation (heavier).
- Consistency via design system and shell-owned navigation/auth.
## Common mistakes
Coupled releases that defeat the purpose; each team bundling its own framework copy (huge bundles); no fallback when a section fails to load; shared global state across teams.
## Deep-dive questions
Team A deploys a broken bundle: what does the user see? How do you prevent five copies of React? How do sections communicate without tight coupling? How do you roll back one section?
## What strong looks like
Shell-owned cross-cutting concerns, a manifest-driven runtime composition, managed shared dependencies, error boundaries and fallbacks, clear contracts, and performance budgets.
