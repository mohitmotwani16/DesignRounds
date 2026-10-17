export default {
  blocks: [
    { type: "p", text: "**Autoscaling** adjusts capacity automatically to match demand: adding instances when load rises and removing them when it falls. Done well, it keeps latency steady through daily peaks and sudden spikes while avoiding paying for idle machines at night. Done poorly, it reacts too late, oscillates, or scales the wrong tier." },

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
