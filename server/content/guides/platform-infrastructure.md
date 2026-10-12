<!--
Interviewer guides: Platform & infrastructure track.
Private reference notes for the AI interviewer/reviewer. Never shipped to the browser.
-->

# guide: service-platform
## Scope and scale
An internal developer platform for hundreds of teams: create services from templates with deployment, observability, and ownership built in, while allowing safe customisation.
## Core components
Developer portal/CLI, service catalog (ownership, metadata), template/scaffolding engine (golden paths), self-service APIs that provision repos, CI/CD pipelines, infrastructure (via IaC), observability defaults, secrets and access; policy engine for guardrails; documentation.
## Key decisions and trade-offs
- Golden paths vs flexibility: opinionated defaults with documented escape hatches.
- Templates that keep evolving: how existing services get updates (versioned templates, automated PRs) vs one-time scaffolding.
- Guardrails as policy-as-code rather than manual review.
- Platform as a product: adoption metrics, feedback loops.
## Common mistakes
One-time scaffolding that drifts immediately; no ownership metadata; blocking teams with no escape hatch; a platform that is a ticket queue instead of self-service.
## Deep-dive questions
How do 300 existing services get a security fix in the template? How does a team customise its deploy pipeline without breaking conventions? How do you measure platform success?
## What strong looks like
Self-service golden paths, service catalog with ownership, IaC-backed provisioning, policy guardrails, update mechanism for templates, and explicit escape hatches.

# guide: multi-region
## Scope and scale
A user-facing service runs in multiple regions; a regional outage must be detected and traffic moved, with explicit RTO/RPO and safe failback.
## Core components
Global traffic management (DNS/anycast/global load balancer) with health checks, active-active or active-passive regions, data replication (sync within region, async cross-region or consensus-based), failover orchestration and runbooks, fencing to prevent dual primaries, regular failover testing.
## Key decisions and trade-offs
- Active-active (capacity, complexity, conflict handling) vs active-passive (simpler, idle cost, slower failover).
- RPO set by replication mode: async lag means possible data loss; sync cross-region costs latency.
- Automated vs human-approved failover (false positives vs speed).
- Failback: resync data, fence the old primary, replay or reconcile writes made during split.
## Common mistakes
No stated RTO/RPO; assuming zero data loss with async replication; no fencing so both regions accept writes; never testing failover; dependencies (auth, config) that are single-region.
## Deep-dive questions
What is your RPO and why? How do you know a region is truly down vs a network partition? How do you prevent split-brain during failback? Which shared dependencies are still single-region?
## What strong looks like
Explicit RTO/RPO tied to replication choices, health-based traffic steering, fencing/epochs, tested runbooks and game days, failback procedure, and multi-region dependencies.

# guide: service-discovery
## Scope and scale
Thousands of service instances register and are discovered; instances churn constantly; discovery must stay useful during partial control-plane failures.
## Core components
Registry (consensus-backed store), registration via agents/sidecars or the orchestrator, health checking (active and passive), client-side caching/resolution or a load-balancer/sidecar data plane, watch/push of changes, DNS interface for legacy clients.
## Key decisions and trade-offs
- Client-side discovery (smart clients, fewer hops) vs server-side/proxy (simpler clients).
- Health checks: heartbeat TTLs vs active probes; outlier detection on the data path.
- Caching with TTL: clients keep serving last-known endpoints if the registry is unavailable (availability over freshness).
- Consistency of the registry: strong for writes, cached reads.
## Common mistakes
Every request querying the registry; no caching so a registry outage takes down all traffic; slow removal of dead instances; DNS TTLs that cache dead endpoints for minutes.
## Deep-dive questions
The registry cluster loses quorum: what happens to traffic? How fast is a crashed instance removed? How do you avoid thundering herds when thousands of clients watch for changes?
## What strong looks like
Consensus-backed registry, health checks plus passive outlier detection, cached client views with last-known-good fallback, efficient change propagation.

# guide: secrets-platform
## Scope and scale
Services and people access credentials (DB passwords, API keys, certificates). Least privilege, rotation without outages, and full auditability are required.
## Core components
Secrets store with encryption (envelope encryption, KMS/HSM-backed master keys), identity-based authentication (workload identity, mTLS, cloud IAM), policy engine, dynamic/short-lived credentials, rotation workflows, client agents/sidecars with caching, audit log, break-glass procedures.
## Key decisions and trade-offs
- Static secrets with rotation vs dynamic short-lived credentials issued on demand.
- Rotation without outage: dual credentials (old and new valid during overlap), staged rollout.
- Availability: secrets cached by clients so the store isn't a hard runtime dependency, with bounded TTLs.
- Revocation speed vs cache duration.
## Common mistakes
Secrets in environment files or code; shared credentials across services; rotation that breaks running services; no audit; the secrets service as a single point of failure.
## Deep-dive questions
How does a service prove its identity before getting a secret? How do you rotate a database password used by 200 instances with zero downtime? A key leaks: how fast can you revoke it everywhere?
## What strong looks like
Workload identity and least-privilege policies, encrypted storage with KMS, dynamic or rotated credentials with overlap, client caching with bounded TTLs, and complete audit and revocation.

# guide: deployment-platform
## Scope and scale
Teams deploy immutable releases to environments many times per day; rollouts are progressive and can pause or roll back automatically.
## Core components
Build pipeline producing signed, immutable artifacts (with provenance), artifact registry, deployment controller, environment/promotion model, progressive rollout (canary, waves), metrics-based analysis, automated rollback, deployment history and audit, approvals for sensitive environments.
## Key decisions and trade-offs
- Canary analysis: which signals (error rate, latency, business metrics), baseline comparison, statistical confidence.
- Rollback safety: backward-compatible database migrations (expand/contract) so old versions still work.
- Speed vs safety: wave sizes and bake times.
- Provenance and signing to prevent untrusted artifacts.
## Common mistakes
Rebuilding artifacts per environment; rollbacks blocked by irreversible schema changes; canaries without automated analysis; no record of who deployed what.
## Deep-dive questions
What signals trigger an automatic rollback? A deployment included a schema migration: can you roll back? How do you know which commit is running in production right now?
## What strong looks like
Immutable signed artifacts, promotion between environments, metric-driven progressive delivery with auto-rollback, migration discipline, and complete history/audit.

# guide: metrics-platform
## Scope and scale
Metrics from thousands of services across environments, millions of active time series, bursty ingestion; queries for dashboards and alerting; costs controlled.
## Core components
Instrumentation libraries/agents, collectors with aggregation and relabelling, ingestion pipeline (buffered), time-series database sharded by series, downsampling and retention tiers (hot/warm/cold), query layer with caching, alerting engine with routing tied to service ownership and runbooks.
## Key decisions and trade-offs
- Cardinality control: label limits, dropping/aggregating high-cardinality labels (user IDs) at collectors, per-team quotas.
- Push vs pull collection.
- Retention: full resolution short-term, downsampled long-term.
- Alerting on SLOs/symptoms rather than every cause.
## Common mistakes
Unbounded labels exploding storage; no retention tiers; alerts without owners or runbooks; the monitoring system sharing failure domains with what it monitors.
## Deep-dive questions
A team adds a user_id label: what happens and how do you prevent it? How do you keep a year of data affordable? How do alerts reach the right team?
## What strong looks like
Cardinality limits and quotas, scalable sharded ingestion and storage, retention tiers, efficient queries, SLO-based alerting routed by ownership with runbooks.

# guide: config-control-plane
## Scope and scale
Operators publish versioned configuration to thousands of service instances; bad config is a leading cause of outages, so validation and rollback are essential; services must keep working if the control plane is down.
## Core components
Config authoring with schemas and validation, versioned config store, approval/review workflow, staged rollout engine (targets, percentages), distribution (push via streams or pull with polling/watch), client SDK with local cache and last-known-good fallback, health feedback and auto-rollback, audit history.
## Key decisions and trade-offs
- Push (fast propagation) vs pull (simpler, scales, slower).
- Staged rollouts with health gates vs instant global changes.
- Clients persist last-known-good config locally to start and run during outages.
- Validation: schema, semantic checks, and dry-runs.
## Common mistakes
Global instant rollout of unvalidated config; services failing to start when the control plane is down; no versioning or rollback; no audit.
## Deep-dive questions
A config change causes errors on 5% of instances: how is it caught and rolled back? A service restarts while the control plane is down: what config does it use? How do you target a change to one region?
## What strong looks like
Schema validation, versioning and approvals, staged targeted rollouts with health-based rollback, resilient clients with last-known-good, and full audit.
