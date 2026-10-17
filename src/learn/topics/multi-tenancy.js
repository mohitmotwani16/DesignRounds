export default {
  blocks: [
    { type: "p", text: "**Multi-tenancy** means one system serves many customers (tenants) whose data and workloads must stay isolated from each other. A SaaS product, an internal platform or an API serves all its tenants from shared infrastructure to keep costs low, while guaranteeing that no tenant can see another's data and no single tenant can degrade service for the rest. The core design choice is how much to share: everything, nothing, or something in between." },

    { type: "h2", text: "Isolation models" },
    { type: "table", head: ["Model", "What's shared", "Isolation", "Cost per tenant", "Fits"], rows: [
      ["Silo", "Nothing: separate stack (or database, or account) per tenant", "Strongest", "Highest", "Large or regulated customers, strict data residency"],
      ["Pool", "Everything: shared services and tables, rows tagged with a tenant ID", "Logical only", "Lowest", "Many small tenants, self-serve SaaS"],
      ["Bridge (hybrid)", "Shared services, separate schemas or databases per tenant, or silos for a few large tenants", "Medium", "Medium", "Most growing SaaS products"],
    ] },
    { type: "p", text: "Many products use **tiers**: small tenants in a shared pool, enterprise tenants in dedicated cells or databases. Design the code so a tenant can move between tiers without application changes." },

    { type: "h2", text: "Data isolation in a shared pool" },
    { type: "ul", items: [
      "**Tenant ID everywhere:** every row, cache key, queue message, object storage path and log line carries the tenant ID.",
      "**Enforce, don't trust:** derive the tenant from the authenticated identity, never from a request parameter, and apply it in a data-access layer every query goes through.",
      "**Database-level guards:** row-level security policies in databases that support them, so a forgotten `WHERE tenant_id = ?` returns nothing instead of everyone's data.",
      "**Tenant-scoped encryption keys** for sensitive data, so a tenant's data can be crypto-shredded on deletion.",
      "**Test for leaks:** automated tests that try to access another tenant's resources through every API.",
    ] },

    { type: "h2", text: "Noisy neighbours" },
    { type: "p", text: "In a shared pool, one tenant's spike (a huge import, a runaway integration) can slow everyone. Protect the others with:" },
    { type: "ul", items: [
      "**Per-tenant rate limits and quotas** on API calls, concurrent jobs, storage and expensive operations. See [rate limiting](/learn/rate-limiting).",
      "**Fair queuing:** per-tenant queues or weighted scheduling so one tenant's backlog doesn't block others' jobs.",
      "**Bulkheads:** separate worker pools or connection pools for heavy tenants or operation types. See [circuit breakers and bulkheads](/learn/circuit-breaker).",
      "**Shuffle sharding:** assign each tenant to a small random subset of workers, so a bad tenant affects only the few others that share its exact subset.",
      "**Partitioning:** spread tenants across database shards, and move large tenants to their own shard when they become [hot](/learn/hot-partitions).",
    ] },

    { type: "h2", text: "Cells" },
    { type: "p", text: "A **cell-based architecture** runs many identical, independent copies of the full stack (cells), each serving a subset of tenants. A thin routing layer maps tenants to cells. A bad deploy or overload affects one cell, not every customer; capacity grows by adding cells; and big tenants can get a dedicated cell. The cost is more infrastructure to manage and a routing layer that must itself be highly available." },
    { type: "diagram", kind: "flow", caption: "A cell router sends each tenant to one of several identical cells, limiting the blast radius of any failure to that cell's tenants.", nodes: [
      { id: "client", label: "Tenants", col: 0, row: 1, shape: "pill" },
      { id: "router", label: "Cell router", sub: "tenant → cell", col: 1.3, row: 1, tone: "accent" },
      { id: "map", label: "Tenant directory", col: 1.3, row: 2.2, shape: "db", tone: "cache" },
      { id: "c1", label: "Cell A", sub: "services + data", col: 2.7, row: 0 },
      { id: "c2", label: "Cell B", sub: "services + data", col: 2.7, row: 1 },
      { id: "c3", label: "Cell C (enterprise)", sub: "dedicated", col: 2.7, row: 2 },
    ], edges: [
      { from: "client", to: "router" }, { from: "router", to: "map", dashed: true },
      { from: "router", to: "c1" }, { from: "router", to: "c2" }, { from: "router", to: "c3" },
    ] },

    { type: "h2", text: "Operational concerns" },
    { type: "ul", items: [
      "**Per-tenant observability:** metrics, logs and costs broken down by tenant, so you can see who is affected and who is causing load.",
      "**Tenant lifecycle:** onboarding, plan changes, data export and deletion must be automated and complete.",
      "**Migrations at scale:** schema changes across thousands of tenant schemas need tooling and gradual rollout.",
      "**Data residency:** some tenants require data in a specific country, which pushes towards regional cells.",
    ] },
  ],
  uses: [
    { name: "B2B SaaS", text: "Small customers share pooled tables with row-level security; enterprise customers get dedicated databases." },
    { name: "Cloud platforms", text: "Cell-based architectures and shuffle sharding limit how many customers a single failure affects." },
    { name: "Internal platforms", text: "Per-team quotas and namespaces stop one team's batch jobs from starving another's services." },
  ],
  interview: [
    "Choose silo, pool or bridge per tier, and explain the cost-isolation trade-off.",
    "Enforce tenant isolation in a data-access layer and the database, not in callers.",
    "Protect against noisy neighbours with quotas, fair queues and bulkheads.",
    "Use cells to limit blast radius as the system grows.",
  ],
  related: ["rate-limiting", "sharding", "circuit-breaker", "authentication-authorization", "hot-partitions"],
  practice: ["api-gateway", "service-platform", "secrets-platform"],
  reading: [
    { title: "SaaS Tenant Isolation Strategies", publisher: "AWS Whitepaper", url: "https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html" },
    { title: "Workload isolation using shuffle-sharding", publisher: "Amazon Builders' Library", url: "https://builder.aws.com/content/3F06NpJ8YeoIGP8VHTw4n81pFn8/workload-isolation-using-shuffle-sharding" },
  ],
};
