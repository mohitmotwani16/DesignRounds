export default {
  blocks: [
    { type: "p", text: "**Mobile release engineering** is how teams ship app updates safely to millions of devices they don't control. Unlike a web deploy, a mobile release goes through app store review, reaches users gradually, can't be rolled back once installed, and old versions keep running for months. The tools that make it safe are **phased rollouts**, **remote feature flags**, a **minimum supported version** with forced updates, backward-compatible APIs, and fast **crash monitoring**." },

    { type: "h2", text: "Why mobile is different" },
    { type: "table", head: ["", "Web", "Mobile"], rows: [
      ["Deploying a fix", "Minutes; every user gets it on next load", "Days: build, review, rollout, then users must update"],
      ["Rollback", "Redeploy the previous version", "Impossible for installed apps; ship a new version or disable the feature remotely"],
      ["Versions in the wild", "Essentially one", "Many, for months or years"],
      ["Release cadence", "Continuous", "Usually a weekly or fortnightly release train"],
    ] },

    { type: "h2", text: "The release train" },
    { type: "diagram", kind: "flow", caption: "A typical release: cut a branch on schedule, test, submit for review, then roll out in phases while watching crash and business metrics.", nodes: [
      { id: "cut", label: "Branch cut", sub: "weekly train", col: 0, row: 1, shape: "pill" },
      { id: "qa", label: "QA + beta", sub: "internal · TestFlight · testing tracks", col: 1.3, row: 1, tone: "accent" },
      { id: "review", label: "Store review", col: 2.6, row: 1 },
      { id: "phased", label: "Phased rollout", sub: "1% → 10% → 50% → 100%", col: 3.9, row: 1, tone: "ok" },
      { id: "mon", label: "Crash + metrics monitoring", col: 3.9, row: 2.2, tone: "danger" },
    ], edges: [
      { from: "cut", to: "qa" }, { from: "qa", to: "review" }, { from: "review", to: "phased" },
      { from: "phased", to: "mon", dashed: true }, { from: "mon", to: "phased", dashed: true, label: "halt" },
    ] },
    { type: "ul", items: [
      "A **release train** leaves on a fixed schedule; features that aren't ready ship disabled behind flags instead of delaying the train.",
      "**Beta channels** (internal builds, TestFlight, testing tracks on Google Play) catch issues before the public sees them.",
      "**Phased (staged) rollouts** release to a growing percentage of users; pause the rollout if crash rates or key metrics regress.",
      "Keep a **hotfix path** for critical issues, and expedited review requests for emergencies.",
    ] },

    { type: "h2", text: "Remote control after release" },
    { type: "ul", items: [
      "**Feature flags** let you ship code dark and enable it gradually, by version, region or user segment, without a new build. See [feature flags](/learn/feature-flags).",
      "**Kill switches** turn off a feature that's crashing or misbehaving in already-installed versions.",
      "**Remote configuration** tunes limits, copy and behaviour without a release.",
      "**Server-driven UI** for some screens lets layouts change from the backend, at the cost of complexity.",
    ] },
    { type: "callout", tone: "tip", text: "Because you can't roll back a mobile binary, the kill switch is your rollback. Every risky feature should ship behind a remotely controllable flag with a safe off state." },

    { type: "h2", text: "Supporting old versions" },
    { type: "ul", items: [
      "**Backward-compatible APIs:** the backend must keep serving older app versions. Add fields rather than changing or removing them, and version breaking changes. See [API design](/learn/api-design).",
      "**Version-aware backends:** the app sends its version with requests, so servers can adapt responses or reject unsupported versions cleanly.",
      "**Minimum supported version:** a config value the app checks at launch; versions below it show a **forced update** screen. Use it for security fixes and to retire very old API versions, not routinely.",
      "**Soft update prompts** encourage, but don't force, updating to newer versions.",
      "**Local data migrations** must handle upgrading from any old version, including skipped ones.",
    ] },

    { type: "h2", text: "Monitoring releases" },
    { type: "ul", items: [
      "**Crash-free sessions and users** per version, with symbolicated stack traces, are the primary rollout gate.",
      "**ANRs and hangs,** app start time, and frame drops per version.",
      "**Business metrics by version:** a release can be crash-free and still break checkout.",
      "**Adoption curves:** how fast users move to the new version, which tells you how long old versions must be supported.",
    ] },
  ],
  uses: [
    { name: "Consumer apps", text: "Weekly release trains with phased rollouts gated on crash-free rates and feature flags for every major feature." },
    { name: "Fintech apps", text: "Minimum version checks force updates for security fixes, while APIs support the remaining versions." },
    { name: "Marketplaces", text: "Remote config adjusts promotions and copy instantly across all installed versions." },
  ],
  interview: [
    "Explain why mobile can't roll back and what replaces rollback (flags and kill switches).",
    "Describe a release train with beta channels and phased rollouts.",
    "Keep APIs backward compatible and use a minimum supported version for forced updates.",
    "Gate rollouts on crash-free rates and business metrics per version.",
  ],
  related: ["feature-flags", "ci-cd-pipelines", "api-design", "deployment-strategies", "observability"],
  practice: ["mobile-release-flags"],
  reading: [
    { title: "Release a phased version update", publisher: "Apple App Store Connect Help", url: "https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/" },
    { title: "Release app updates with staged rollouts", publisher: "Google Play Console Help", url: "https://support.google.com/googleplay/android-developer/answer/6346149" },
  ],
};
