export default {
  blocks: [
    { type: "p", text: "A **circuit breaker** wraps calls to a dependency and stops calling it when it's clearly failing, returning an error or fallback immediately instead. Like an electrical breaker, it prevents one fault from spreading: a slow or broken dependency can otherwise tie up every thread and connection in its callers, turning one failure into a system-wide outage." },

    { type: "h2", text: "The problem: cascading failure" },
    { type: "p", text: "Suppose a recommendations service starts taking 30 seconds to respond. The product page calls it on every request. Each waiting call holds a thread; within seconds every thread in the product service is stuck waiting, and product pages fail even though only recommendations are broken. Retries make it worse by sending even more traffic to the struggling service." },

    { type: "h2", text: "Three states" },
    { type: "diagram", kind: "flow", caption: "Closed: calls flow and failures are counted. Open: calls fail fast for a cool-down. Half-open: a few trial calls decide whether to close again.", nodes: [
      { id: "closed", label: "CLOSED", sub: "calls pass through", col: 0, row: 0, tone: "ok", w: 150 },
      { id: "open", label: "OPEN", sub: "fail fast / fallback", col: 2, row: 0, tone: "danger", w: 150 },
      { id: "half", label: "HALF-OPEN", sub: "allow a few trials", col: 1, row: 1.3, tone: "cache", w: 150 },
    ], edges: [
      { from: "closed", to: "open", label: "error rate > 50%", tone: "danger", bend: -30 },
      { from: "open", to: "half", label: "after 30 s" },
      { from: "half", to: "closed", label: "trials succeed" },
      { from: "half", to: "open", label: "trial fails", tone: "danger", dashed: true, bend: 30 },
    ] },
    { type: "ol", items: [
      "**Closed**: requests go through. The breaker tracks failures (errors and timeouts) over a rolling window, for example the last 100 calls or 10 seconds.",
      "**Open**: once the failure rate crosses a threshold (and there's a minimum number of calls, to avoid tripping on 2 failures out of 3), every call fails immediately for a cool-down period. The dependency gets breathing room to recover.",
      "**Half-open**: after the cool-down, a limited number of trial calls go through. If they succeed, the breaker closes; if they fail, it opens again.",
    ] },

    { type: "h2", text: "Fallbacks" },
    { type: "p", text: "Failing fast is only useful if the caller has something better to do than show an error:" },
    { type: "ul", items: [
      "Serve **cached or default** data (last known recommendations, popular items).",
      "**Hide the feature** (no recommendations carousel) while the rest of the page works. See [graceful degradation](/learn/load-shedding).",
      "**Queue the work** to retry later (send the email when the provider recovers).",
      "Return a clear, fast error for things that truly can't proceed (payment authorisation).",
    ] },

    { type: "h2", text: "Bulkheads" },
    { type: "p", text: "A ship's bulkheads keep one flooded compartment from sinking the ship. In software, a **bulkhead** gives each dependency its own limited pool of threads, connections or concurrent calls. If recommendations hang, they can exhaust only their own 20-connection pool; the 200 threads serving the rest of the page are untouched." },
    { type: "table", head: ["Pattern", "Protects against"], rows: [
      ["[Timeouts](/learn/retries-and-timeouts)", "Waiting forever on one call"],
      ["Bulkhead", "One dependency consuming all shared resources"],
      ["Circuit breaker", "Repeatedly calling a dependency that's failing"],
      ["[Rate limiting](/learn/rate-limiting) / [load shedding](/learn/load-shedding)", "More incoming load than you can handle"],
    ] },
    { type: "callout", text: "These patterns work together: every remote call should have a **timeout**, run in a **bounded pool**, behind a **circuit breaker**, with **limited retries** and a **fallback**." },

    { type: "h2", text: "Tuning tips" },
    { type: "ul", items: [
      "Count **timeouts** as failures; slow is the most common way dependencies fail.",
      "Use a **minimum request volume** before evaluating the error rate.",
      "Keep breaker state **per dependency (and per host or endpoint)**, so one bad replica doesn't open the breaker for all.",
      "Export breaker state as a metric and alert when breakers open. See [observability](/learn/observability).",
    ] },
  ],
  uses: [
    { name: "Netflix Hystrix (and successors)", text: "Popularised circuit breakers, bulkheads and fallbacks for every remote call; Resilience4j is its common modern replacement in Java." },
    { name: "Envoy and service meshes", text: "Outlier detection ejects failing hosts and connection limits act as bulkheads, without code changes. See [service mesh](/learn/service-mesh)." },
    { name: "E-commerce product pages", text: "Recommendations, reviews and ads sit behind breakers with fallbacks so the core page always renders." },
    { name: "Payment integrations", text: "Breakers around payment providers let checkout switch to a backup provider or show a clear error quickly." },
  ],
  interview: [
    "Wrap calls to non-critical dependencies in circuit breakers with fallbacks so they can't take down the core flow.",
    "Explain closed, open and half-open states and what trips the breaker.",
    "Add bulkheads (separate pools) and timeouts alongside breakers.",
    "Say what the user sees when the breaker is open.",
  ],
  related: ["retries-and-timeouts", "load-shedding", "rate-limiting", "health-checks-failover", "service-mesh", "availability"],
  practice: ["payment-platform", "api-gateway", "news-feed"],
};
