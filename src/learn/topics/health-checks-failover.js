export default {
  blocks: [
    { type: "p", text: "**Health checks** let load balancers, orchestrators and failover systems decide which instances should receive traffic. **Failover** moves work from a failed component to a healthy one. Getting them right is subtle: checks that are too shallow miss real failures, and checks that are too deep can take down a whole fleet because of one shared dependency." },

    { type: "h2", text: "Kinds of checks" },
    { type: "table", head: ["Check", "Question it answers", "On failure"], rows: [
      ["**Liveness**", "Is the process alive and not deadlocked?", "Restart it"],
      ["**Readiness**", "Can it serve traffic right now (warmed up, connected, not overloaded)?", "Stop sending traffic, but don't restart"],
      ["**Startup**", "Has a slow-starting process finished initialising?", "Wait before applying liveness checks"],
      ["**Deep / dependency check**", "Can it reach its database, cache, downstream services?", "Usually: report, alert; rarely: take out of rotation"],
    ] },
    { type: "p", text: "Keep **liveness** checks trivial (the process can answer HTTP), or a slow dependency will trigger restarts that make things worse. Use **readiness** to stop traffic to an instance that's warming up, draining for a deploy, or temporarily overloaded." },
    { type: "p", text: "Typical settings and examples:" },
    { type: "ul", items: [
      "**Basic check**: a [service registry](/learn/service-discovery) or load balancer calls `GET /health` every 10 seconds. `200 OK` means healthy; a timeout or error counts as a failure, and three failures in a row remove the instance.",
      "**Deep check**: the inventory service also tests its database connection and returns `503 Service Unavailable` when the database is unreachable, so it is taken out of rotation even though the process is running. Use this with care (see the trap below).",
      "**Passive check**: the load balancer watches real responses and marks an instance unhealthy when, say, 10% of its requests fail, catching problems that periodic probes miss.",
    ] },

    { type: "h2", text: "The shared-dependency trap" },
    { type: "p", text: "If every instance's health check queries the database, a brief database slowdown makes **all** instances fail their checks at once. The load balancer removes them all, and a partial degradation becomes a total outage. Health checks should mostly reflect the instance itself; failures of shared dependencies are better handled with [circuit breakers](/learn/circuit-breaker), fallbacks and alerts." },
    { type: "diagram", kind: "flow", caption: "A deep check on a shared database turns one slow dependency into every instance failing its check simultaneously.", nodes: [
      { id: "lb", label: "Load balancer", col: 0, row: 1, tone: "accent" },
      { id: "a", label: "Instance 1", sub: "check: FAIL", col: 1.3, row: 0, tone: "danger" },
      { id: "b", label: "Instance 2", sub: "check: FAIL", col: 1.3, row: 1, tone: "danger" },
      { id: "c", label: "Instance 3", sub: "check: FAIL", col: 1.3, row: 2, tone: "danger" },
      { id: "db", label: "Database", sub: "slow for 20 s", col: 2.6, row: 1, shape: "db", tone: "cache" },
    ], edges: [
      { from: "lb", to: "a", dashed: true, tone: "danger" }, { from: "lb", to: "b", dashed: true, tone: "danger" }, { from: "lb", to: "c", dashed: true, tone: "danger" },
      { from: "a", to: "db" }, { from: "b", to: "db" }, { from: "c", to: "db" },
    ] },
    { type: "callout", text: "Many load balancers **fail open**: if all targets look unhealthy, they send traffic to all of them anyway, on the theory that a widespread failure is more likely a bad health check than every server dying at once. Know how yours behaves." },

    { type: "h2", text: "Detecting failure reliably" },
    { type: "ul", items: [
      "Require **several consecutive failures** before marking unhealthy (e.g. 3 checks, 5 s apart) and several successes before marking healthy again, to avoid **flapping**.",
      "Combine **active checks** with **passive checks** (outlier detection on real traffic: eject an instance returning many 5xx or timing out).",
      "Check from more than one place where possible; a single prober with a network problem can falsely declare everything down.",
      "In clusters, use gossip-based or consensus-based membership rather than one central checker. See [gossip and failure detection](/learn/gossip-protocol).",
    ] },

    { type: "h2", text: "Failover patterns" },
    { type: "table", head: ["Component", "Failover approach"], rows: [
      ["Stateless app instances", "Load balancer stops routing to failed instances; orchestrator replaces them"],
      ["Database primary", "Promote a replica (Patroni, RDS Multi-AZ, Aurora), with fencing to stop the old primary. See [leader election](/learn/leader-election)"],
      ["Cache node", "Clients rehash to other nodes ([consistent hashing](/learn/consistent-hashing)), or a replica is promoted (Redis Sentinel / Cluster)"],
      ["Availability zone", "Spread instances across zones; load balancers route around a failed zone"],
      ["Region", "DNS or global load balancer shifts traffic to another region. See [disaster recovery](/learn/disaster-recovery)"],
    ] },

    { type: "h2", text: "Graceful shutdown and draining" },
    { type: "p", text: "Planned failovers (deploys, scale-in) should never drop requests: mark the instance **not ready**, wait for the load balancer to stop sending new requests, let in-flight requests finish (with a timeout), close long-lived connections politely so clients reconnect elsewhere, then exit." },
  ],
  uses: [
    { name: "Kubernetes", text: "Liveness, readiness and startup probes per container; readiness gates Service endpoints so only ready pods get traffic." },
    { name: "AWS ELB / ALB", text: "Health checks with healthy/unhealthy thresholds per target group, fail-open when all targets are unhealthy, and connection draining." },
    { name: "Envoy", text: "Active health checking plus outlier detection that ejects hosts based on consecutive errors or latency." },
    { name: "Amazon RDS Multi-AZ", text: "Automatic failover to a synchronous standby in another zone, usually within a minute or two, by flipping a DNS record." },
  ],
  interview: [
    "Distinguish liveness (restart) from readiness (route traffic) checks.",
    "Avoid deep checks on shared dependencies that could fail every instance at once.",
    "Use consecutive-failure thresholds and outlier detection to avoid flapping and false failovers.",
    "Describe failover per component (instances, database primary, zone, region) and graceful draining for deploys.",
  ],
  related: ["load-balancing", "availability", "leader-election", "disaster-recovery", "circuit-breaker", "gossip-protocol"],
  practice: ["service-discovery", "multi-region", "deployment-platform"],
};
