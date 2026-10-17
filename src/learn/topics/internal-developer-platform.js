export default {
  blocks: [
    { type: "p", text: "An **internal developer platform (IDP)** is the set of self-service tools, templates and automated workflows a platform team builds so product teams can create, deploy and run services without filing tickets or becoming infrastructure experts. Its centre is the **golden path**: an opinionated, well-supported way to do common things (start a service, add a database, ship a change) that is easier than doing it any other way, and safe by default." },

    { type: "h2", text: "What problem it solves" },
    { type: "p", text: "As an organisation grows, every team ends up assembling CI pipelines, Kubernetes manifests, dashboards, alerts, secrets and access rules slightly differently. Onboarding a new service takes weeks, security reviews find the same issues repeatedly, and upgrades must be done team by team. A platform turns that repeated work into a product that teams consume." },

    { type: "h2", text: "Building blocks" },
    { type: "table", head: ["Capability", "What developers get", "Built on"], rows: [
      ["Service templates (scaffolding)", "A new service repository with build, tests, deployment, dashboards and alerts wired up", "Templates plus [CI/CD](/learn/ci-cd-pipelines)"],
      ["Self-service infrastructure", "Request a database, queue or bucket through a form or a few lines of config, with approved settings", "[Infrastructure as code](/learn/infrastructure-as-code) modules behind an API"],
      ["Deployment platform", "Push to deploy with canaries, rollback and environment promotion", "[Kubernetes](/learn/kubernetes-architecture), [deployment strategies](/learn/deployment-strategies)"],
      ["Service catalog", "Who owns what, where the docs, runbooks and dashboards are, what depends on what", "A catalog populated from repositories and runtime data"],
      ["Observability by default", "Standard metrics, logs, traces and SLO dashboards for every service", "[Observability](/learn/observability) stack"],
      ["Secrets and access", "Credentials and permissions granted through policy, not tickets", "[Secrets management](/learn/secrets-management)"],
    ] },
    { type: "diagram", kind: "flow", caption: "Developers use a portal, CLI or config in their repository; the platform orchestrates standard modules on shared infrastructure and records everything in the catalog.", nodes: [
      { id: "dev", label: "Developers", col: 0, row: 1, shape: "pill" },
      { id: "iface", label: "Portal · CLI · repo config", col: 1.3, row: 1, tone: "accent" },
      { id: "orch", label: "Platform orchestration", sub: "templates · policies", col: 2.6, row: 1 },
      { id: "cat", label: "Service catalog", col: 2.6, row: 2.2, shape: "db", tone: "cache" },
      { id: "infra", label: "Clusters · DBs · queues", sub: "standard modules", col: 3.9, row: 0.4, shape: "db", tone: "store" },
      { id: "obs", label: "CI/CD · observability", col: 3.9, row: 1.6 },
    ], edges: [
      { from: "dev", to: "iface" }, { from: "iface", to: "orch" }, { from: "orch", to: "cat" }, { from: "orch", to: "infra" }, { from: "orch", to: "obs" },
    ] },

    { type: "h2", text: "Design principles" },
    { type: "ul", items: [
      "**Treat it as a product:** developers are customers. Interview them, measure adoption, publish a roadmap and documentation.",
      "**Paved road, not a cage:** the golden path covers the common case well; teams with special needs can step off it, but then own more themselves.",
      "**Guardrails over gates:** encode security and compliance rules in templates and policy checks, so the default is safe and reviews aren't a bottleneck.",
      "**Thin abstractions:** expose the decisions developers care about (size, runtime, dependencies) and hide undifferentiated detail, without making debugging impossible.",
      "**Upgrades at scale:** when the platform improves a template or base image, propagate it to existing services automatically or with minimal effort.",
    ] },
    { type: "callout", tone: "warning", text: "A common failure is building a portal before solving real pain. Start with the slowest, most error-prone workflow (often creating a service or getting infrastructure) and automate that end to end." },

    { type: "h2", text: "Measuring success" },
    { type: "ul", items: [
      "**Time to first deploy** for a new service, and time for a new engineer's first production change.",
      "**Adoption:** share of services on the golden path and on current template versions.",
      "**Delivery metrics** (deployment frequency, lead time, change failure rate) for teams on the platform vs off it.",
      "**Developer satisfaction** surveys and support ticket volume.",
      "**Reliability and security outcomes:** fewer misconfigurations, faster patching of vulnerable base images.",
    ] },
  ],
  uses: [
    { name: "Large engineering organisations", text: "A portal and templates let hundreds of teams create production-ready services in minutes with consistent observability." },
    { name: "Regulated companies", text: "Compliance controls are built into templates and policies, so audits check the platform once instead of every team." },
    { name: "Fast-growing startups", text: "A thin golden path for services and databases keeps new teams productive without a large platform team." },
  ],
  interview: [
    "Define the golden path and the specific workflows it automates.",
    "List the building blocks: templates, self-service infrastructure, deploys, catalog, observability, secrets.",
    "Use guardrails and policy instead of manual gates.",
    "Measure adoption and delivery outcomes, treating developers as customers.",
  ],
  related: ["ci-cd-pipelines", "infrastructure-as-code", "kubernetes-architecture", "observability", "secrets-management"],
  practice: ["service-platform", "deployment-platform"],
  reading: [
    { title: "CNCF Platforms White Paper", publisher: "Cloud Native Computing Foundation", url: "https://tag-app-delivery.cncf.io/whitepapers/platforms/" },
    { title: "What is platform engineering?", publisher: "platformengineering.org", url: "https://platformengineering.org/blog/what-is-platform-engineering" },
  ],
};
