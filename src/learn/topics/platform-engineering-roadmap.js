export default {
  blocks: [
    { type: "p", text: "This **platform engineering and SRE roadmap** is for engineers interviewing for platform, infrastructure, DevOps and site reliability roles. It starts with how reliability is defined and budgeted, then covers containers and Kubernetes, infrastructure as code and delivery pipelines, service networking, observability, resilience patterns, and the people-and-process side of running production: incidents, capacity, multi-tenancy, secrets and internal developer platforms." },
    { type: "callout", tone: "tip", text: "Platform design rounds are judged on safety as much as scale. For every component you add, say how it fails, how you'd detect that, and how you'd roll back." },

    { type: "roadmap", id: "platform" },

    { type: "h2", text: "What platform and SRE interviews test" },
    { type: "table", head: ["Area", "Typical prompt", "Guides"], rows: [
      ["Reliability targets", "Set SLOs for a new API and decide what happens when the error budget runs out.", "[Availability and SLOs](/learn/availability), [incident management](/learn/incident-management)"],
      ["Delivery", "Design a deployment platform that lets 200 teams ship safely.", "[CI/CD](/learn/ci-cd-pipelines), [deployment strategies](/learn/deployment-strategies), [feature flags](/learn/feature-flags)"],
      ["Infrastructure", "Manage cloud resources for many teams without drift or outages.", "[Infrastructure as code](/learn/infrastructure-as-code), [Kubernetes](/learn/kubernetes-architecture)"],
      ["Observability", "Design a metrics and alerting platform for a large fleet.", "[Observability](/learn/observability), [time-series databases](/learn/time-series-databases)"],
      ["Resilience", "Survive the loss of a region with a stated RPO and RTO.", "[Disaster recovery](/learn/disaster-recovery), [chaos engineering](/learn/chaos-engineering)"],
      ["Shared platforms", "Build an internal developer platform or a secrets service.", "[Developer platforms](/learn/internal-developer-platform), [secrets](/learn/secrets-management)"],
    ] },

    { type: "h2", text: "A five-week plan" },
    { type: "ol", items: [
      "**Week 1:** steps 1 and 2. Define SLIs and SLOs for a checkout API, then explain how a Kubernetes deployment rolls out a new version.",
      "**Week 2:** step 3. Design a pipeline from commit to production with a canary stage and automatic rollback; try the [deployment platform round](/system-design/deployment-platform).",
      "**Week 3:** steps 4 and 5. Design [service discovery for a growing fleet](/system-design/service-discovery) and the metrics behind its dashboards.",
      "**Week 4:** step 6. Design a [multi-region failover strategy](/system-design/multi-region) and plan a game day to test it.",
      "**Week 5:** step 7. Design a [secrets platform](/system-design/secrets-platform) and an [internal developer platform](/system-design/service-platform).",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "What is the difference between platform engineering, DevOps and SRE?" },
    { type: "p", text: "DevOps is a culture of developers and operators sharing ownership of production. SRE is Google's discipline for running production with engineering methods, built around SLOs and error budgets. Platform engineering builds the internal products (pipelines, templates, self-service infrastructure) that let product teams practise both without each reinventing them." },
    { type: "h3", text: "How much Kubernetes do I need to know?" },
    { type: "p", text: "Know the control plane and the reconciliation loop, the core objects (pods, deployments, services, config and secrets), how scheduling and autoscaling work, and the common failure modes. The [Kubernetes architecture guide](/learn/kubernetes-architecture) covers that level." },
    { type: "h3", text: "Do SRE interviews include system design?" },
    { type: "p", text: "Usually, alongside troubleshooting and coding rounds. The design round often focuses on monitoring, deployment safety or failure handling rather than product features." },
  ],
  related: ["availability", "kubernetes-architecture", "observability", "incident-management", "deployment-strategies"],
  practice: ["deployment-platform", "multi-region", "service-discovery", "secrets-platform"],
  reading: [
    { title: "Site Reliability Engineering (free online book)", publisher: "Google", url: "https://sre.google/sre-book/table-of-contents/" },
    { title: "Kubernetes documentation: Concepts", publisher: "The Kubernetes Authors", url: "https://kubernetes.io/docs/concepts/" },
    { title: "CNCF Platforms White Paper", publisher: "Cloud Native Computing Foundation", url: "https://tag-app-delivery.cncf.io/whitepapers/platforms/" },
  ],
};
