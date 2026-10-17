export default {
  blocks: [
    { type: "p", text: "**Chaos engineering** is the practice of deliberately injecting failures into a system, carefully and in a controlled way, to find weaknesses before they cause real outages. Instead of hoping that failover, retries and timeouts work, you run experiments that prove they do: kill an instance, add network latency, fail a dependency, and check whether users notice. It turns resilience from an assumption into evidence." },
    {"type":"diagram","kind":"flow","caption":"A chaos experiment: state what normal looks like, inject one fault with a small blast radius, and either widen the experiment or fix the weakness it found.","nodes":[{"id":"steady","label":"Steady state","sub":"SLO metrics","col":0,"row":0},{"id":"hyp","label":"Hypothesis","sub":"it should hold","col":1,"row":0},{"id":"inject","label":"Inject a fault","sub":"small blast radius","col":2,"row":0,"tone":"danger"},{"id":"observe","label":"Observe","sub":"dashboards, alerts","col":3,"row":0},{"id":"widen","label":"Widen the radius","sub":"more traffic, more hosts","col":3,"row":1,"tone":"ok"},{"id":"fix","label":"Fix the weakness","sub":"then re-run","col":2,"row":1,"tone":"accent"}],"edges":[{"from":"steady","to":"hyp"},{"from":"hyp","to":"inject"},{"from":"inject","to":"observe"},{"from":"observe","to":"widen","label":"holds"},{"from":"observe","to":"fix","label":"breaks","tone":"danger"},{"from":"fix","to":"hyp","label":"re-run","dashed":true}]},

    { type: "h2", text: "The experiment loop" },
    { type: "ol", items: [
      "**Define steady state** in user-facing terms: \"checkout success rate stays above 99.5% and p99 latency below 800 ms\".",
      "**Form a hypothesis:** \"if one of three payment-service instances is terminated, steady state holds because the load balancer routes around it within 10 seconds\".",
      "**Inject a realistic fault** with a limited blast radius.",
      "**Observe** steady-state metrics and the system's behaviour.",
      "**Stop automatically** if steady state breaks beyond a threshold.",
      "**Learn and fix:** if the hypothesis failed, you found a weakness cheaply. Fix it and run the experiment again, then automate it.",
    ] },

    { type: "h2", text: "Faults worth injecting" },
    { type: "table", head: ["Category", "Examples", "What it tests"], rows: [
      ["Instance and process", "Kill a pod or VM, crash a process, fill a disk", "Redundancy, restart policies, [health checks](/learn/health-checks-failover)"],
      ["Network", "Add latency, drop packets, partition a zone, break DNS", "[Timeouts and retries](/learn/retries-and-timeouts), [circuit breakers](/learn/circuit-breaker)"],
      ["Dependencies", "Make a downstream service return errors or respond slowly", "Fallbacks, graceful degradation, [load shedding](/learn/load-shedding)"],
      ["Resources", "Exhaust CPU, memory or connection pools", "Limits, bulkheads, [autoscaling](/learn/autoscaling)"],
      ["Infrastructure", "Fail over a database, lose an availability zone or region", "[Disaster recovery](/learn/disaster-recovery) plans, RTO and RPO"],
      ["Time and state", "Clock skew, expired certificates, corrupted cache entries", "Assumptions about [clocks](/learn/clocks-and-ordering), certificate rotation"],
    ] },

    { type: "h2", text: "Controlling the blast radius" },
    { type: "ul", items: [
      "Start in staging, then in production with a tiny scope: one instance, one percent of traffic, one internal user group.",
      "Run during working hours with the owning team present and incident tooling ready.",
      "Define **abort conditions** that stop the experiment automatically when steady-state metrics degrade.",
      "Announce experiments and keep a log, so they're not confused with real incidents.",
      "Widen the scope only after the system passes at the smaller one.",
    ] },
    { type: "callout", tone: "warning", text: "Chaos engineering in production without good observability is just causing outages. You need clear steady-state metrics and the ability to stop instantly before you start." },

    { type: "h2", text: "Game days" },
    { type: "p", text: "A **game day** is a planned exercise where a team simulates a major failure, such as losing a database primary or a whole region, and practises the response: detection, communication, runbooks and recovery. Game days test people and processes as much as software, and often reveal stale runbooks, missing permissions, and alerts that never fire. They're the best way to know whether a [disaster recovery](/learn/disaster-recovery) plan would actually work." },

    { type: "h2", text: "Growing the practice" },
    { type: "ul", items: [
      "Begin with experiments against known risks from past [incidents](/learn/incident-management), since postmortems are a ready list of hypotheses.",
      "Automate passing experiments to run continuously, so regressions in resilience are caught like failing tests.",
      "Track findings and fixes; the value is in the weaknesses found and removed, not the number of experiments run.",
    ] },
  ],
  uses: [
    { name: "Streaming and e-commerce platforms", text: "Instances and dependencies are routinely terminated or slowed in production to verify that customers aren't affected." },
    { name: "Disaster recovery validation", text: "Regular region-evacuation game days prove that failover meets the stated RTO." },
    { name: "Platform teams", text: "Automated experiments in staging check that every new service has working timeouts and health checks." },
  ],
  interview: [
    "Define steady state in user-facing metrics before injecting anything.",
    "Write a hypothesis and an automatic abort condition.",
    "Start small and widen the blast radius gradually.",
    "Use game days to test people, runbooks and DR plans.",
  ],
  related: ["incident-management", "disaster-recovery", "circuit-breaker", "retries-and-timeouts", "health-checks-failover"],
  practice: ["multi-region", "deployment-platform"],
  reading: [
    { title: "Principles of Chaos Engineering", publisher: "principlesofchaos.org", url: "https://principlesofchaos.org/" },
    { title: "AWS Fault Injection Service documentation", publisher: "Amazon Web Services", url: "https://docs.aws.amazon.com/fis/latest/userguide/what-is.html" },
  ],
};
