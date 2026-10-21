export default {
  blocks: [
    { type: "p", text: "A **circuit breaker** wraps calls to a dependency and stops calling it when it's clearly failing, returning an error or a fallback immediately instead. [Retries](/learn/retries-and-timeouts) handle transient failures, but retrying a service that is completely down only wastes threads and adds latency. The circuit breaker detects these **persistent** failures and stops making doomed requests, which keeps one broken dependency from tying up every thread in its callers and turning one failure into a system-wide outage." },

    { type: "h2", text: "The physical analogy" },
    { type: "p", text: "The electrical circuit breaker in your home protects it from overload. When an appliance draws too much current, the breaker trips and cuts the power, so the wiring and other devices aren't damaged. Once the problem is fixed, you reset the breaker and power returns." },
    { type: "p", text: "A software circuit breaker works the same way. When a service fails repeatedly, the breaker \"trips\" and stops sending it requests, protecting the callers from wasting resources on calls that will fail. After a cool-down it checks whether the service has recovered, and closes again if it has." },
    { type: "diagram", kind: "flow", caption: "Like a household breaker: while closed, calls flow to the service; once tripped (open), calls are cut off and answered with a fallback until the service recovers.", nodes: [
      { id: "c", label: "Caller", col: 0, row: 0.5 },
      { id: "cb", label: "Circuit breaker", sub: "counts failures", col: 1.3, row: 0.5, tone: "accent" },
      { id: "s", label: "Inventory service", sub: "failing", col: 2.7, row: 0, tone: "danger" },
      { id: "f", label: "Fallback", sub: "cached or default", col: 2.7, row: 1.1, tone: "ok" },
    ], edges: [{ from: "c", to: "cb" }, { from: "cb", to: "s", label: "closed", dashed: true, tone: "danger" }, { from: "cb", to: "f", label: "open" }] },

    { type: "h2", text: "The problem: cascading failure" },
    { type: "p", text: "Suppose a recommendations service starts taking 30 seconds to respond. The product page calls it on every request. Each waiting call holds a thread; within seconds every thread in the product service is stuck waiting, and product pages fail even though only recommendations are broken. Retries make it worse by sending even more traffic to the struggling service." },

    { type: "h2", text: "Three states" },
    { type: "diagram", kind: "flow", caption: "Closed: calls flow and failures are counted. Open: calls fail fast for a cool-down. Half-open: a few trial calls decide whether to close again.", nodes: [
      { id: "closed", label: "CLOSED", sub: "calls pass through", col: 0, row: 0, tone: "ok", w: 150 },
      { id: "open", label: "OPEN", sub: "fail fast / fallback", col: 2, row: 0, tone: "danger", w: 150 },
      { id: "half", label: "HALF-OPEN", sub: "allow a few trials", col: 1, row: 1.3, tone: "cache", w: 150 },
    ], edges: [
      { from: "closed", to: "open", label: "failure rate > threshold", tone: "danger", bend: -30 },
      { from: "open", to: "half", label: "after 30 s" },
      { from: "half", to: "closed", label: "trials succeed" },
      { from: "half", to: "open", label: "trial fails", tone: "danger", dashed: true, bend: 30 },
    ] },
    { type: "ol", items: [
      "**Closed** (normal): every request goes through. The breaker watches each one and tracks failures, errors and timeouts alike, over a rolling window. If 10 of the last 100 requests failed, the failure rate is 10%. As long as the rate stays under the threshold, the circuit stays closed.",
      "**Open** (tripped): the failure rate crosses the threshold. A service that normally fails 5% of requests suddenly fails 60%, so the breaker opens. Now it **rejects every request immediately**, without calling the service, so no threads or network capacity are wasted on calls that will almost certainly fail, and the struggling service gets breathing room to recover.",
      "**Half-open** (testing): after the cool-down period, the breaker lets a small number of test requests through. If they succeed, the service has recovered: the circuit closes and normal traffic resumes. If they fail, the service is still down and the circuit opens again for another cool-down.",
    ] },

    { type: "h2", text: "Configuration" },
    { type: "table", head: ["Parameter", "What it controls", "How to set it"], rows: [
      ["Failure threshold", "When the circuit opens (e.g. 50% means it opens when half the requests fail)", "Above the normal failure rate with headroom: if a service normally fails 5%, a threshold of about 30% works"],
      ["Cool-down (open) period", "How long the circuit stays open before testing recovery (e.g. 30 s)", "Too short and you swamp a service that is still recovering; too long and users get degraded service unnecessarily"],
      ["Window size", "How many recent calls (or how much time) the failure rate is computed over (e.g. the last 100 requests)", "Large enough to smooth out noise, small enough to detect problems quickly"],
      ["Minimum volume", "How many calls are needed before the rate is evaluated", "Avoids tripping on 2 failures out of 3 calls during quiet periods"],
      ["Half-open trials", "How many test calls are allowed through", "A handful; enough to judge, too few to overload"],
    ] },

    { type: "h2", text: "Implementation" },
    { type: "p", text: "Don't write your own: libraries such as Resilience4j (Java, the successor to Netflix Hystrix), Polly (.NET), opossum (Node.js) and pybreaker (Python) implement it. In Python with pybreaker:" },
    { type: "code", code: `import requests
from pybreaker import CircuitBreaker, CircuitBreakerError

# Open after 5 consecutive failures; try again after 30 seconds.
breaker = CircuitBreaker(fail_max=5, reset_timeout=30)

@breaker
def call_inventory_service(product_id):
    response = requests.get(f"http://inventory/stock/{product_id}", timeout=2)
    response.raise_for_status()
    return response.json()

def get_stock(product_id):
    try:
        return call_inventory_service(product_id)
    except CircuitBreakerError:
        # The circuit is open: don't call the service at all, use a fallback.
        return {"stock": None, "source": "fallback", "message": "Stock temporarily unavailable"}
    except requests.RequestException:
        # The call failed and was counted by the breaker.
        return {"stock": None, "source": "fallback", "message": "Stock temporarily unavailable"}` },
    { type: "p", text: "Note the fallback returns \"unknown\" rather than `0`: telling customers an item is out of stock when you simply don't know would lose sales. See [fallbacks](/learn/fallbacks-graceful-degradation) for choosing safe defaults." },

    { type: "h2", text: "Monitoring circuit state" },
    { type: "p", text: "Record every state change as a metric and a log line, count how often each circuit opens, and put it on a dashboard so operators can see which dependencies are in trouble. A circuit that **opens often** means either the dependency is unreliable or your threshold is too aggressive. A circuit that **stays open** for a long time means a service is completely down and needs attention. Alert on both. See [observability](/learn/observability)." },

    { type: "h2", text: "Working with fallbacks" },
    { type: "p", text: "An open circuit fails requests immediately, which is only useful if the caller has something better to do than show an error. Return a **fallback** instead:" },
    { type: "ul", items: [
      "Serve **cached or default** data: if the recommendations circuit opens, show popular items; if the user-profile circuit opens, return cached profile data.",
      "**Hide the feature** (no recommendations carousel) while the rest of the page works.",
      "**Queue the work** to retry later (send the email when the provider recovers).",
      "Return a clear, fast error for things that truly can't proceed (payment authorization).",
    ] },
    { type: "p", text: "Together they make systems resilient: the breaker detects persistent failure quickly and the fallback gives an acceptable alternative, so users experience reduced functionality instead of a complete failure." },

    { type: "h2", text: "Bulkheads" },
    { type: "p", text: "A ship's bulkheads keep one flooded compartment from sinking the ship. In software, a **bulkhead** gives each dependency its own limited pool of threads, connections or concurrent calls. If recommendations hang, they can exhaust only their own 20-connection pool; the 200 threads serving the rest of the page are untouched." },
    { type: "table", head: ["Pattern", "Protects against"], rows: [
      ["[Timeouts](/learn/retries-and-timeouts)", "Waiting forever on one call"],
      ["Retries with backoff", "Transient blips"],
      ["Bulkhead", "One dependency consuming all shared resources"],
      ["Circuit breaker", "Repeatedly calling a dependency that's failing"],
      ["[Fallbacks](/learn/fallbacks-graceful-degradation)", "Users seeing errors when a dependency is down"],
      ["[Rate limiting](/learn/rate-limiting) / [load shedding](/learn/load-shedding)", "More incoming load than you can handle"],
    ] },
    { type: "callout", text: "These patterns work together: every remote call should have a **timeout**, run in a **bounded pool**, behind a **circuit breaker**, with **limited retries** and a **fallback**." },

    { type: "h2", text: "Tuning tips" },
    { type: "ul", items: [
      "Count **timeouts** as failures; slowness is the most common way dependencies fail.",
      "Use a **minimum request volume** before evaluating the error rate.",
      "Keep breaker state **per dependency (and per host or endpoint)**, so one bad replica doesn't open the breaker for all.",
      "Skip retries when the circuit is open: retrying a known-dead service only adds latency.",
    ] },
  ],
  uses: [
    { name: "Netflix Hystrix (and successors)", text: "Popularized circuit breakers, bulkheads and fallbacks for every remote call; Resilience4j is its common modern replacement in Java." },
    { name: "Envoy and service meshes", text: "Outlier detection ejects failing hosts and connection limits act as bulkheads, without code changes. See [service mesh](/learn/service-mesh)." },
    { name: "E-commerce product pages", text: "Recommendations, reviews and ads sit behind breakers with fallbacks so the core page always renders." },
    { name: "Payment integrations", text: "Breakers around payment providers let checkout switch to a backup provider or show a clear error quickly." },
  ],
  interview: [
    "Wrap calls to non-critical dependencies in circuit breakers with fallbacks so they can't take down the core flow.",
    "Explain closed, open and half-open, and give concrete settings (threshold, cool-down, window).",
    "Add bulkheads (separate pools) and timeouts alongside breakers.",
    "Say what the user sees while the breaker is open.",
  ],
  related: ["retries-and-timeouts", "fallbacks-graceful-degradation", "load-shedding", "rate-limiting", "health-checks-failover", "service-mesh", "availability"],
  practice: ["payment-platform", "api-gateway", "news-feed"],
};
