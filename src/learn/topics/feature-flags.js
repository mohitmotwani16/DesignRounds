export default {
  blocks: [
    { type: "p", text: "A **feature flag** (feature toggle) is a runtime switch that decides whether code paths are active, without deploying new code. Flags let teams ship code dark and release it gradually, target features to specific users, run experiments, and turn off a misbehaving feature in seconds. Behind them sits a **dynamic configuration** system that stores rules and pushes changes to every server and app quickly and safely." },

    { type: "h2", text: "Kinds of flags" },
    { type: "table", head: ["Type", "Purpose", "Lifetime", "Example"], rows: [
      ["Release flag", "Hide unfinished or newly shipped code; roll out gradually", "Days to weeks, then delete", "New checkout flow at 5%, 25%, 100%"],
      ["Experiment flag", "Assign users to variants for an A/B test", "Length of the experiment", "Two ranking models compared"],
      ["Ops flag / kill switch", "Turn off an expensive or risky feature under load or during incidents", "Long-lived", "Disable recommendations if the model service is down"],
      ["Permission / entitlement flag", "Enable features for plans, tenants or beta users", "Long-lived", "Advanced analytics for enterprise customers"],
    ] },

    { type: "h2", text: "How flag evaluation works" },
    { type: "p", text: "A flag has **rules**: target these user IDs, this tenant, this region, or a percentage of users. Percentages use a deterministic hash of the user ID and flag name, so a user stays in the same group between requests and as the rollout grows from 5% to 25%. This is the same technique as [A/B test assignment](/learn/ab-testing-experimentation)." },
    { type: "diagram", kind: "flow", caption: "Rules are edited in a control plane, versioned, and streamed to SDKs that evaluate flags locally in memory with no network call per check.", nodes: [
      { id: "ui", label: "Flag console / API", sub: "rules · audit log", col: 0, row: 1, tone: "accent" },
      { id: "store", label: "Config store", sub: "versioned", col: 1.3, row: 1, shape: "db", tone: "store" },
      { id: "stream", label: "Distribution", sub: "streaming · CDN", col: 2.6, row: 1, tone: "cache" },
      { id: "svc", label: "Server SDKs", sub: "evaluate in memory", col: 3.9, row: 0.3 },
      { id: "app", label: "Mobile / web SDKs", sub: "cached locally", col: 3.9, row: 1.7 },
    ], edges: [
      { from: "ui", to: "store" }, { from: "store", to: "stream" }, { from: "stream", to: "svc" }, { from: "stream", to: "app" },
    ] },
    { type: "ul", items: [
      "**Evaluate locally:** SDKs hold the rule set in memory and evaluate in microseconds. A network call per flag check would add latency and make every request depend on the flag service.",
      "**Push updates:** streaming connections or short polling propagate changes within seconds, so a kill switch actually works during an incident.",
      "**Fail safe:** if the SDK can't reach the service at startup, it uses the last known rules from local cache, or coded defaults that keep the system safe.",
      "**Client-side flags** for mobile and web should be evaluated on the server or limited to non-sensitive targeting, since anything shipped to a client can be read.",
    ] },

    { type: "h2", text: "Safe dynamic configuration" },
    { type: "p", text: "A configuration change can break production as fast as a bad deploy, and has caused major outages. Treat flag and config changes with similar care:" },
    { type: "ul", items: [
      "**Validate** values against a schema before they're accepted (types, ranges, required fields).",
      "**Roll out config gradually,** by region or percentage, and watch metrics, just like code. See [deployment strategies](/learn/deployment-strategies).",
      "**Version and audit** every change, with who changed what and why, and one-click revert.",
      "**Require review** for flags that affect money, security or large traffic shares.",
    ] },

    { type: "h2", text: "Flag debt" },
    { type: "p", text: "Every flag doubles the code paths that can run, and old flags make code hard to reason about and test. Give release flags an owner and an expiry date, alert on flags that have been at 100% for weeks, and delete both the flag and the dead branch once a rollout is finished. Keep long-lived ops and permission flags deliberately, and document them." },
    { type: "callout", tone: "tip", text: "Combine flags with [CI/CD](/learn/ci-cd-pipelines): deploy code behind a flag that's off, verify the deploy is healthy, then turn the flag on gradually. Deploys and releases become separate, low-risk events." },
  ],
  uses: [
    { name: "Progressive releases", text: "A new search UI goes to employees, then 1%, 10% and 100% of users, with automatic rollback on error spikes." },
    { name: "Incident response", text: "A kill switch disables personalised recommendations and falls back to popular items when the model is slow." },
    { name: "Mobile apps", text: "Features ship in the binary but stay off until a remote flag enables them, avoiding a store release." },
  ],
  interview: [
    "Distinguish release, experiment, ops and permission flags.",
    "Evaluate flags locally with deterministic hashing; stream rule updates.",
    "Define safe defaults when the flag service is unreachable.",
    "Treat config changes like deploys: validate, roll out gradually, audit.",
  ],
  related: ["ci-cd-pipelines", "deployment-strategies", "ab-testing-experimentation", "mobile-release-engineering", "load-shedding"],
  practice: ["config-control-plane", "mobile-release-flags", "deployment-platform"],
  reading: [
    { title: "Feature Toggles (aka Feature Flags)", publisher: "Pete Hodgson, martinfowler.com", url: "https://martinfowler.com/articles/feature-toggles.html" },
    { title: "OpenFeature specification", publisher: "OpenFeature (CNCF)", url: "https://openfeature.dev/specification/" },
  ],
};
