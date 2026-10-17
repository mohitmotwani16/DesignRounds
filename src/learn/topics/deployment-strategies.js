export default {
  blocks: [
    { type: "p", text: "Most production incidents start with a change: a deploy, a config update, a database migration. **Deployment strategies** control how new versions reach users so problems are caught early and rolled back fast. The common strategies are **rolling**, **blue-green** and **canary** releases, often combined with **feature flags**." },

    { type: "h2", text: "Rolling deployment" },
    { type: "p", text: "Replace instances a few at a time: take one out of the load balancer, upgrade it, health-check it, put it back, move to the next. Kubernetes Deployments do this by default." },
    { type: "ul", items: [
      "**Pros**: no extra infrastructure; zero downtime with readiness checks and connection draining.",
      "**Cons**: old and new versions serve traffic at the same time for a while; rollback means rolling back again (slow); a bad version reaches everyone by the end.",
    ] },

    { type: "h2", text: "Blue-green deployment" },
    { type: "p", text: "Run two full environments. **Blue** serves production; deploy the new version to **green**, test it, then switch all traffic to green at the load balancer or DNS. Keep blue running for an instant rollback." },
    { type: "diagram", kind: "flow", caption: "Blue-green: traffic flips from the old environment to the new one in one step, and can flip back just as fast.", nodes: [
      { id: "users", label: "Users", col: 0, row: 0.5, shape: "pill" },
      { id: "lb", label: "Load balancer", col: 1, row: 0.5, tone: "accent" },
      { id: "blue", label: "Blue: v1.8", sub: "idle, kept for rollback", col: 2.3, row: 0, tone: "store", w: 170 },
      { id: "green", label: "Green: v1.9", sub: "live", col: 2.3, row: 1, tone: "ok", w: 170 },
    ], edges: [{ from: "users", to: "lb" }, { from: "lb", to: "green", label: "100%" }, { from: "lb", to: "blue", dashed: true, label: "0%" }] },
    { type: "ul", items: [
      "**Pros**: instant switch and instant rollback; the new version can be tested in a production-identical environment first.",
      "**Cons**: double the infrastructure during the release; all users switch at once (no gradual exposure); databases are shared, so schema changes must work for both versions.",
    ] },

    { type: "h2", text: "Canary release" },
    { type: "p", text: "Send a small slice of traffic (1%, then 5%, 25%, 100%) to the new version and compare its metrics with the old version before going further. If error rates or latency get worse, roll back automatically. Only a small fraction of users ever sees a bad version." },
    { type: "diagram", kind: "flow", caption: "Canary: traffic shifts to the new version in steps, gated by automated comparison of error rate and latency.", nodes: [
      { id: "lb", label: "Traffic split", col: 0, row: 0.5, tone: "accent" },
      { id: "stable", label: "Stable v1.8", sub: "95%", col: 1.3, row: 0, tone: "store" },
      { id: "canary", label: "Canary v1.9", sub: "5%", col: 1.3, row: 1, tone: "cache" },
      { id: "judge", label: "Compare metrics", sub: "errors, p99, business KPIs", col: 2.6, row: 0.5, tone: "muted", w: 180 },
      { id: "next", label: "→ 25% → 100%", col: 3.8, row: 0, tone: "ok", shape: "pill", w: 130 },
      { id: "rb", label: "Roll back", col: 3.8, row: 1, tone: "danger", shape: "pill", w: 130 },
    ], edges: [
      { from: "lb", to: "stable" }, { from: "lb", to: "canary" }, { from: "stable", to: "judge", dashed: true }, { from: "canary", to: "judge", dashed: true },
      { from: "judge", to: "next", label: "healthy" }, { from: "judge", to: "rb", tone: "danger", label: "worse" },
    ] },
    { type: "p", text: "Canaries need good metrics broken down by version and enough traffic for differences to be statistically meaningful. Tools like Argo Rollouts, Flagger and Spinnaker automate the steps and analysis; a [service mesh](/learn/service-mesh) makes percentage-based routing easy." },

    { type: "h2", text: "Feature flags" },
    { type: "p", text: "Feature flags separate **deploying** code from **releasing** a feature. Code ships turned off, then the flag enables it for internal users, a percentage of users, or specific customers, and can turn it off instantly without a deploy. Flags also serve as kill switches for [graceful degradation](/learn/load-shedding). Clean up old flags; long-lived flags become technical debt." },

    { type: "h2", text: "Database changes: expand and contract" },
    { type: "p", text: "During any of these strategies, old and new code run against the same database at the same time, and a rollback brings old code back. Schema changes must therefore be **backward compatible**:" },
    { type: "ol", items: [
      "**Expand**: add the new column or table; old code ignores it.",
      "Deploy code that writes to both old and new structures and reads the old one.",
      "**Backfill** existing data into the new structure.",
      "Deploy code that reads the new structure.",
      "**Contract**: once nothing uses the old column, remove it in a later release.",
    ] },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["", "Rolling", "Blue-green", "Canary"], rows: [
      ["Extra infrastructure", "None", "Full second environment", "Small"],
      ["Exposure to a bad release", "Gradually everyone", "Everyone at once", "Small percentage"],
      ["Rollback speed", "Slow (redeploy)", "Instant", "Fast (shift traffic back)"],
      ["Needs", "Health checks", "Traffic switch", "Per-version metrics, traffic splitting"],
    ] },
  ],
  uses: [
    { name: "Google, Netflix and Facebook", text: "Release through progressive canaries with automated analysis, rolling back automatically on regressions." },
    { name: "Kubernetes", text: "Rolling updates by default; Argo Rollouts and Flagger add canary and blue-green with metric analysis." },
    { name: "LaunchDarkly, Unleash and in-house flag systems", text: "Let teams release features to percentages of users and kill them instantly." },
    { name: "Mobile apps", text: "Use staged rollouts in app stores plus remote feature flags, since a shipped binary can't be rolled back. See the [mobile release flags](/system-design/mobile-release-flags) round." },
  ],
  interview: [
    "Mention how changes reach production: canary with automated rollback for risky services.",
    "Separate deploy from release with feature flags, and keep kill switches for risky features.",
    "Make schema changes backward compatible with expand and contract.",
    "Tie rollback triggers to concrete metrics: error rate, latency and business KPIs by version.",
  ],
  related: ["observability", "service-mesh", "load-balancing", "health-checks-failover", "availability", "monolith-vs-microservices"],
  practice: ["deployment-platform", "mobile-release-flags", "config-control-plane"],
};
