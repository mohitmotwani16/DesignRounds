export default {
  blocks: [
    { type: "p", text: "**Autoscaling** adjusts capacity automatically to match demand: adding instances when load rises and removing them when it falls. Done well, it keeps latency steady through daily peaks and sudden spikes while avoiding paying for idle machines at night. Done poorly, it reacts too late, oscillates, or scales the wrong tier." },
    { type: "p", text: "[Load balancers](/learn/load-balancing) spread traffic over instances, but what if traffic is bursty or uneven over time? A social network spikes during a big sports match; a store spikes on Black Friday. You could run enough instances for the maximum possible traffic all the time, but that wastes money most of the day. Autoscaling instead changes the number of compute resources (usually VMs or containers) automatically, based on current or predicted demand, working hand in hand with the load balancer so the application stays responsive and cost-efficient." },

    { type: "h2", text: "How autoscaling works" },
    { type: "p", text: "It starts with **continuous monitoring** of the application's metrics: CPU utilization, memory, network traffic, request count, and any custom metrics you define. Rules or policies decide when to act: when demand rises the system **scales out** (adds resources), and when it falls it **scales in** (removes them)." },
    { type: "diagram", kind: "flow", caption: "Horizontal autoscaling: monitoring triggers scale-out when load rises and scale-in when it falls; the load balancer always routes to the current set.", nodes: [
      { id: "mon", label: "Monitoring", sub: "CPU, memory, requests", col: 0, row: 1, tone: "accent" },
      { id: "lb", label: "Load balancer", col: 1.3, row: 1 },
      { id: "a", label: "Instance", col: 2.6, row: 0 },
      { id: "b", label: "Instance", col: 2.6, row: 1 },
      { id: "c", label: "New instance", sub: "scale out", col: 2.6, row: 2, tone: "ok" },
    ], edges: [{ from: "mon", to: "lb", dashed: true, label: "add / remove" }, { from: "lb", to: "a" }, { from: "lb", to: "b" }, { from: "lb", to: "c" }] },

    { type: "h2", text: "Horizontal vs vertical" },
    { type: "ul", items: [
      "**Horizontal autoscaling** adds or removes instances (pods, VMs, containers). It requires stateless services behind a load balancer and is the default for web tiers. See [scalability](/learn/scalability).",
      "**Vertical autoscaling** changes CPU and memory of existing instances. Useful for workloads that can't scale out easily (some databases, single-process jobs), but usually means a restart.",
      "**Cluster autoscaling** adds or removes the underlying nodes when pods can't be scheduled or nodes sit empty.",
    ] },

    { type: "h2", text: "How a scaling loop works" },
    { type: "diagram", kind: "flow", caption: "The autoscaler compares a metric with its target and adjusts the replica count; new capacity only helps after instances boot and pass readiness checks.", nodes: [
      { id: "m", label: "Metric", sub: "CPU 85% (target 60%)", col: 0, row: 0, tone: "danger", w: 170 },
      { id: "as", label: "Autoscaler", sub: "desired = 10 × 85/60 ≈ 15", col: 1.3, row: 0, tone: "accent", w: 190 },
      { id: "new", label: "+5 instances", sub: "boot · warm up · ready", col: 2.7, row: 0, tone: "ok", w: 170 },
      { id: "lb", label: "Load balancer", col: 2.7, row: 1 },
    ], edges: [
      { from: "m", to: "as" }, { from: "as", to: "new" }, { from: "new", to: "lb", label: "readiness passes" }, { from: "lb", to: "m", dashed: true, label: "load spreads", bend: 30 },
    ] },
    { type: "p", text: "Most autoscalers use **target tracking**: keep a metric near a target value, with desired capacity ≈ current capacity × (current metric ÷ target)." },

    { type: "h2", text: "Auto Scaling Groups" },
    { type: "p", text: "An **Auto Scaling Group (ASG)** is a logical group of identical instances that the platform keeps at the right size, even replacing instances that become unhealthy. You configure five things:" },
    { type: "ol", items: [
      "**Desired capacity**: how many instances should be running now.",
      "**Minimum and maximum**: the bounds the group may scale between.",
      "**Health checks**: the group monitors each instance and automatically replaces failed ones.",
      "**Scaling policies**: the conditions for scaling, for example \"add an instance when CPU > 70%\".",
      "**Launch template**: the configuration of new instances: machine type, image, network and startup script.",
    ] },
    { type: "diagram", kind: "segments", caption: "An Auto Scaling Group: it never drops below the minimum or grows past the maximum, and moves the desired count between them as load changes.", lanes: [
      { label: "Instances", parts: [
        { label: "min = 2", sub: "always running", size: 2, tone: "ok" },
        { label: "desired = 5", sub: "running now", size: 3, tone: "store" },
        { label: "room to scale", sub: "up to max = 10", size: 5, tone: "muted" },
      ] },
    ] },

    { type: "h2", text: "Reactive vs predictive scaling" },
    { type: "ul", items: [
      "**Reactive scaling** responds to current demand using real-time metrics. Best for unpredictable workloads.",
      "**Predictive scaling** uses historical data (often machine learning) to forecast demand and scale **before** it arrives. Best for predictable patterns such as daily or weekly cycles.",
    ] },
    { type: "callout", text: "A classic interview question: how do you handle peak traffic on Black Friday? Use **predictive (or scheduled) scaling** to scale out before the sale starts, using last year's traffic to size it, and scale back in after the sale ends. Reactive scaling alone would lag behind the opening rush." },

    { type: "h2", text: "Benefits" },
    { type: "ul", items: [
      "**Cost**: you pay only for the capacity you need, with automatic reduction when demand is low.",
      "**Availability**: performance holds through spikes, and unhealthy instances are replaced automatically.",
      "**Consistent user experience**: latency stays low even at peak.",
      "**Less operational work**: no one has to add and remove servers by hand.",
    ] },

    { type: "h2", text: "Working with the load balancer" },
    { type: "p", text: "Autoscaling and load balancers work as a pair. When a new instance launches, the autoscaler **registers** it with the load balancer, which starts sending it traffic once it passes health checks. When an instance is removed, the system first **drains** it, letting existing connections finish before deregistering and terminating it, so no requests are dropped." },

    { type: "h2", text: "Choosing the right metric" },
    { type: "table", head: ["Metric", "Good for", "Caveat"], rows: [
      ["CPU utilisation", "CPU-bound web services", "Misleading for I/O-bound services that wait on databases"],
      ["Requests per second per instance", "Web and API tiers with known per-instance capacity", "Needs load testing to know the right target"],
      ["Concurrency / in-flight requests", "Latency-sensitive services", "Requires the metric from the load balancer or service"],
      ["Queue depth or age / consumer lag", "Workers consuming from queues or Kafka", "Scale on backlog per worker, not total size"],
      ["Latency", "Last resort signal", "Lags and can be caused by downstream problems more servers won't fix"],
    ] },
    { type: "callout", tone: "warning", text: "Scaling the wrong tier makes things worse. If latency is high because the database is saturated, adding app servers adds more database connections and load. Know where the bottleneck is before automating." },

    { type: "h2", text: "The lag problem" },
    { type: "p", text: "Capacity arrives late: the metric has to cross the threshold (often averaged over minutes), the autoscaler acts, instances boot (seconds for containers, minutes for VMs), applications warm caches and JIT compilers, and readiness checks pass. A spike that doubles traffic in 30 seconds will hurt before new capacity helps. Mitigations:" },
    { type: "ul", items: [
      "**Headroom**: target 50–60% utilisation, not 90%, so existing capacity absorbs the first minutes of a spike.",
      "**Scale out fast, scale in slowly**: aggressive scale-up policies, conservative scale-down with cooldowns to avoid oscillation (flapping).",
      "**Scheduled scaling** for known peaks (business hours, a sale at 8 pm, a live event).",
      "**Predictive scaling** from historical patterns, scaling ahead of the daily curve.",
      "**Warm pools** of pre-initialised instances, and fast startup (small images, lazy initialisation).",
      "**Load shedding** to protect the system during the gap. See [load shedding](/learn/load-shedding).",
    ] },

    { type: "h2", text: "Limits and safety" },
    { type: "ul", items: [
      "Set **minimum** instances (for availability and to avoid cold starts) and **maximum** instances (to cap cost and protect downstream dependencies from a scale-out stampede).",
      "Check **account quotas** and dependency limits (database connections, third-party rate limits) for the maximum scale.",
      "Make scale-in safe: drain connections and finish in-flight work before terminating. See [health checks](/learn/health-checks-failover).",
    ] },

    { type: "h2", text: "Best practices" },
    { type: "ul", items: [
      "Scale on metrics that truly reflect the application's health and load, not on whatever is easiest to measure.",
      "Avoid scaling too often: add **cooldown periods** between scaling actions so the group doesn't oscillate up and down.",
      "**Test your policies** by simulating different load patterns and checking the scaling behaves as expected.",
      "**Watch costs**: set billing alerts and review scaling patterns regularly to keep utilization efficient.",
    ] },

    { type: "h2", text: "More than servers" },
    { type: "p", text: "VMs and containers are the most common things to autoscale, but modern clouds autoscale much more of the stack:" },
    { type: "ul", items: [
      "**Databases**: adding or removing [read replicas](/learn/replication) to spread query load, growing storage as data grows, resizing connection pools, and adjusting compute (for example serverless database tiers).",
      "**Network**: load balancers scale their own capacity with traffic; bandwidth and connection limits flex with demand; API gateways can adjust rate limits to usage and service capacity.",
      "**Serverless and event processing**: function concurrency scales automatically with incoming requests; stream and queue processors scale on queue depth; worker pools grow and shrink with the workload. See [serverless](/learn/serverless).",
    ] },

    { type: "h2", text: "Cloud implementations" },
    { type: "table", head: ["Cloud", "Service"], rows: [
      ["AWS", "EC2 Auto Scaling Groups (target tracking, step, scheduled and predictive policies, warm pools)"],
      ["Azure", "Virtual Machine Scale Sets"],
      ["Google Cloud", "Managed Instance Groups"],
      ["Kubernetes", "Horizontal Pod Autoscaler, Vertical Pod Autoscaler, Cluster Autoscaler / Karpenter, KEDA"],
    ] },
    { type: "p", text: "The core functionality is similar everywhere; the platforms differ in their integrations and extra features." },
  ],
  uses: [
    { name: "Kubernetes HPA, VPA and cluster autoscaler / Karpenter", text: "Scale pods on CPU, memory or custom metrics, right-size requests, and add nodes on demand." },
    { name: "KEDA", text: "Scales Kubernetes workloads on event sources such as Kafka lag, queue length or Prometheus queries, including down to zero." },
    { name: "AWS Auto Scaling groups", text: "Target tracking, step, scheduled and predictive scaling policies with warm pools for EC2." },
    { name: "Streaming and e-commerce", text: "Scale ahead of known events (match kick-offs, sales) with scheduled and predictive scaling plus load shedding as a safety net." },
  ],
  interview: [
    "Make tiers stateless and autoscale them on a metric that reflects their bottleneck (RPS, concurrency, queue lag).",
    "Discuss scale-up lag and how headroom, scheduled scaling and warm pools cover it.",
    "Set min and max instances, and check that downstream systems can handle the max.",
    "Scale workers on backlog per worker, and scale in slowly with draining.",
  ],
  related: ["scalability", "load-shedding", "serverless", "load-balancing", "observability", "back-of-the-envelope-estimation"],
  practice: ["video-streaming", "ticket-booking", "training-platform", "model-serving"],
};
