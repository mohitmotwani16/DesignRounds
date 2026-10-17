export default {
  blocks: [
    { type: "p", text: "**Incident management** is how a team detects, responds to, resolves and learns from production problems. Good incident management restores service quickly by **mitigating before diagnosing**, keeps stakeholders informed, and ends with a **blameless postmortem** that turns the failure into lasting improvements. It's as much process and roles as tooling." },

    { type: "h2", text: "The incident lifecycle" },
    { type: "diagram", kind: "flow", caption: "From detection to learning: mitigation comes first, root-cause work follows, and postmortem actions feed back into prevention.", nodes: [
      { id: "detect", label: "Detect", sub: "alert · report", col: 0, row: 1, tone: "danger" },
      { id: "triage", label: "Triage", sub: "severity · page", col: 1.2, row: 1 },
      { id: "mitigate", label: "Mitigate", sub: "rollback · failover", col: 2.4, row: 1, tone: "accent" },
      { id: "resolve", label: "Resolve", sub: "fix root cause", col: 3.6, row: 1 },
      { id: "learn", label: "Postmortem", sub: "actions tracked", col: 4.8, row: 1, tone: "ok" },
    ], edges: [
      { from: "detect", to: "triage" }, { from: "triage", to: "mitigate" }, { from: "mitigate", to: "resolve" }, { from: "resolve", to: "learn" },
      { from: "learn", to: "detect", dashed: true, bend: 60, label: "better alerts and safeguards" },
    ] },

    { type: "h2", text: "Severity levels" },
    { type: "table", head: ["Severity", "Example", "Response"], rows: [
      ["SEV1 / critical", "Checkout down for all users; data loss or security breach", "Page immediately, incident commander, public status updates, all hands as needed"],
      ["SEV2 / major", "A core feature degraded for many users; one region down", "Page on-call, incident channel, regular internal updates"],
      ["SEV3 / minor", "A non-critical feature broken; internal tool slow", "Handle in working hours"],
    ] },
    { type: "p", text: "Define severity by **user and business impact**, not by which component failed, and make it easy to declare an incident. Declaring and downgrading is cheap; noticing a real incident late is expensive." },

    { type: "h2", text: "Roles during an incident" },
    { type: "ul", items: [
      "**Incident commander (IC):** coordinates the response, decides priorities, and keeps people from working at cross purposes. The IC usually doesn't debug.",
      "**Operations / technical lead:** investigates and carries out mitigation.",
      "**Communications lead:** posts regular updates to stakeholders and the status page, on a fixed cadence even when there's nothing new.",
      "**Scribe:** keeps a timeline of observations and actions, which the postmortem will need.",
    ] },
    { type: "p", text: "In small teams one person may hold several roles, but someone must explicitly be in charge." },

    { type: "h2", text: "Mitigate first" },
    { type: "p", text: "The first goal is restoring service, not understanding it. Common mitigations are reversible and fast:" },
    { type: "ul", items: [
      "Roll back the most recent deploy or config change; most incidents follow a change. See [deployment strategies](/learn/deployment-strategies).",
      "Turn off a feature with a [kill switch](/learn/feature-flags).",
      "Fail over to a healthy replica or region. See [disaster recovery](/learn/disaster-recovery).",
      "Shed or rate-limit load to protect core paths. See [load shedding](/learn/load-shedding).",
      "Scale out if the problem is capacity.",
    ] },
    { type: "callout", tone: "tip", text: "\"What changed?\" is the most useful first question. Keep deploys, config changes and flag flips in one searchable timeline next to your dashboards." },

    { type: "h2", text: "On-call that people can sustain" },
    { type: "ul", items: [
      "**Alert on symptoms users feel** (error rate, latency, SLO burn), not on every internal metric. Each page should be urgent, actionable and real. See [observability](/learn/observability).",
      "**Runbooks** for common alerts: what it means, how to check, how to mitigate.",
      "**Reasonable rotations** with handovers, backup on-call and limits on pages per shift; review noisy alerts weekly.",
      "**Error budgets:** when an SLO's budget is spent, reliability work takes priority over features. See [availability](/learn/availability).",
    ] },

    { type: "h2", text: "Blameless postmortems" },
    { type: "p", text: "A postmortem documents what happened, the impact, the timeline, contributing causes and actions. **Blameless** means it focuses on how the system and process allowed the failure, not on who made a mistake. People who fear blame hide information, and the next incident is worse. Ask \"how did our tools let this happen?\" rather than \"who did this?\"" },
    { type: "ol", items: [
      "Summary and customer impact (duration, users affected, data lost if any).",
      "Timeline: detection, key decisions, mitigation and resolution times.",
      "Contributing factors: technical causes plus the gaps that let them through (missing tests, unclear alerts, risky defaults).",
      "What went well and what was lucky.",
      "Action items with owners and due dates, prioritised by how much they reduce the chance or impact of recurrence.",
    ] },
    { type: "p", text: "Track action items to completion and revisit them. A postmortem whose actions are never done is just a story." },
  ],
  uses: [
    { name: "Consumer platforms", text: "SEV levels, an incident commander and a public status page keep users and teams informed during outages." },
    { name: "SRE teams", text: "Error budgets and postmortem actions decide when feature work pauses for reliability fixes." },
    { name: "Security incidents", text: "The same structure applies, with legal and security leads joining and stricter communication rules." },
  ],
  interview: [
    "Define severities by user impact and name the incident roles.",
    "Mitigate first with reversible actions, starting with recent changes.",
    "Alert on symptoms and attach runbooks.",
    "Run blameless postmortems with owned, tracked actions.",
  ],
  related: ["observability", "availability", "deployment-strategies", "chaos-engineering", "disaster-recovery"],
  practice: ["metrics-platform", "multi-region", "deployment-platform"],
  reading: [
    { title: "SRE book: Managing Incidents", publisher: "Google", url: "https://sre.google/sre-book/managing-incidents/" },
    { title: "SRE book: Postmortem Culture: Learning from Failure", publisher: "Google", url: "https://sre.google/sre-book/postmortem-culture/" },
  ],
};
