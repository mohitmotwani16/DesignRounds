export default {
  blocks: [
    { type: "p", text: "A **CI/CD pipeline** automates the path from a code change to running software. **Continuous integration (CI)** builds and tests every change as it's merged, so problems surface within minutes. **Continuous delivery** keeps every passing build ready to release with one approval. **Continuous deployment** goes further and releases every passing build automatically. The design goal is to make releasing small changes so routine and safe that teams do it many times a day." },

    { type: "h2", text: "A typical pipeline" },
    { type: "diagram", kind: "flow", caption: "Build once, promote the same artifact through environments, and gate each promotion on tests and health signals.", nodes: [
      { id: "commit", label: "Commit / PR", col: 0, row: 1, shape: "pill" },
      { id: "ci", label: "CI", sub: "build · unit tests · lint", col: 1.2, row: 1, tone: "accent" },
      { id: "art", label: "Artifact", sub: "versioned image", col: 2.4, row: 1, shape: "db", tone: "store" },
      { id: "stage", label: "Staging", sub: "integration · e2e", col: 3.6, row: 0.2 },
      { id: "canary", label: "Production canary", sub: "small % of traffic", col: 3.6, row: 1.8, tone: "ok" },
      { id: "prod", label: "Production", sub: "full rollout", col: 4.8, row: 1, tone: "cache" },
    ], edges: [
      { from: "commit", to: "ci" }, { from: "ci", to: "art" }, { from: "art", to: "stage", label: "deploy" },
      { from: "stage", to: "canary", label: "promote" }, { from: "canary", to: "prod", label: "metrics ok" },
    ] },

    { type: "h2", text: "Continuous integration" },
    { type: "ul", items: [
      "**Merge small and often:** short-lived branches (or trunk-based development) keep merges small and conflicts rare.",
      "**Fast feedback:** unit tests, linting and type checks run in minutes; slower suites run in parallel or later stages.",
      "**Reproducible builds:** pinned dependencies, hermetic build environments and caching, so the same commit always builds the same artifact.",
      "**A broken main is an emergency:** if the main branch fails, fixing or reverting it comes first, otherwise everyone's changes pile up untested.",
      "**Security scanning:** dependency vulnerability checks, secret scanning and static analysis catch issues before release.",
    ] },

    { type: "h2", text: "Delivery vs deployment" },
    { type: "table", head: ["", "Continuous delivery", "Continuous deployment"], rows: [
      ["Release trigger", "A human approves a passing build", "Every passing build releases automatically"],
      ["Prerequisites", "Reliable automated tests and deployment", "All of that, plus automated canary analysis and rollback"],
      ["Fits", "Regulated domains, mobile apps with store review, risky systems", "Web services with strong monitoring and fast rollback"],
    ] },

    { type: "h2", text: "Principles of safe delivery" },
    { type: "ul", items: [
      "**Build once, deploy many:** promote the same immutable artifact through environments; never rebuild for production.",
      "**Configuration separate from code:** environment-specific settings come from config and [secrets](/learn/secrets-management), not from different builds.",
      "**Progressive rollout:** canary or blue-green releases limit the blast radius. See [deployment strategies](/learn/deployment-strategies).",
      "**Automated verification:** compare the canary's error rate and latency with the baseline and halt or roll back automatically.",
      "**Decouple deploy from release:** ship code dark behind [feature flags](/learn/feature-flags) and turn it on separately.",
      "**Database migrations in compatible steps:** expand (add columns, keep old ones), deploy code that handles both, then contract (remove old ones) in a later release, so rollback stays possible.",
      "**Rollback is a button:** redeploying the previous artifact must be quick and well practised.",
    ] },
    { type: "callout", tone: "tip", text: "Measure delivery with the DORA metrics: deployment frequency, lead time for changes, change failure rate and time to restore service. Fast and safe go together; teams that deploy more often usually have fewer failures, because each change is smaller." },

    { type: "h2", text: "Pipelines at scale" },
    { type: "ul", items: [
      "**Monorepos** need build systems that only rebuild and test what a change affects.",
      "**Shared pipeline templates** let hundreds of services get the same stages and guardrails, which is a core part of an [internal developer platform](/learn/internal-developer-platform).",
      "**Release windows and freezes** are sometimes needed (peak sales days), enforced by the pipeline rather than by memory.",
      "**Supply chain integrity:** sign artifacts and verify signatures at deploy time so only images built by your pipeline can run.",
    ] },
  ],
  uses: [
    { name: "Web services", text: "Every merge to main builds an image, deploys to staging, then canaries to production with automatic rollback." },
    { name: "Mobile apps", text: "CI builds and tests every change; releases go through store review and phased rollouts. See [mobile release engineering](/learn/mobile-release-engineering)." },
    { name: "Infrastructure", text: "Terraform plans run on pull requests and applies run after merge. See [infrastructure as code](/learn/infrastructure-as-code)." },
  ],
  interview: [
    "Build one immutable artifact and promote it through environments.",
    "Gate production with a canary and automated metric checks.",
    "Keep schema migrations backward compatible so rollback works.",
    "Decouple deployment from release with feature flags.",
  ],
  related: ["deployment-strategies", "feature-flags", "infrastructure-as-code", "observability", "internal-developer-platform"],
  practice: ["deployment-platform", "mobile-release-flags"],
  reading: [
    { title: "DORA research: Capabilities", publisher: "DORA (Google Cloud)", url: "https://dora.dev/capabilities/" },
    { title: "Continuous Integration", publisher: "Martin Fowler", url: "https://martinfowler.com/articles/continuousIntegration.html" },
  ],
};
