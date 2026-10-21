export default {
  blocks: [
    { type: "p", text: "Every call over a network can fail or hang. Networks drop packets, services crash and databases lock up, and a production system must handle these failures gracefully or one problem cascades into an outage. **Timeouts** bound how long you wait; **retries** recover from transient failures. Done carelessly, both cause outages: no timeout means threads pile up behind a hung dependency, and naive retries multiply traffic exactly when a service is already struggling. Done well, they make systems resilient to the everyday blips of distributed computing." },

    { type: "h2", text: "Why failures cascade" },
    { type: "p", text: "Three everyday scenarios show how one problem spreads:" },
    { type: "ul", items: [
      "**A slow service.** Service B normally takes 1,000 requests per second. A memory leak lengthens its garbage-collection pauses and its response time climbs from 50 ms to 5 seconds. Service A keeps calling B and waiting; its threads block, new requests queue up, its thread pool runs dry and it stops responding. Now A's own callers start timing out, and the failure has moved upstream.",
      "**A network blip.** A switch fails and traffic is rerouted; latency jumps from 10 ms to 500 ms. Requests that normally take 100 ms now take 600 ms. Callers with a 200 ms timeout give up and retry, and the flood of retries congests the network even more.",
      "**A database deadlock.** A transaction holds locks for 30 seconds before aborting. The service waiting on that query blocks, other requests pile up behind it, memory pressure builds, and the service runs out of resources and crashes.",
    ] },

    { type: "h2", text: "Four patterns against cascading failure" },
    { type: "ul", items: [
      "**Timeouts** stop you waiting forever. Set a deadline; if the answer doesn't arrive in time, give up and free the resources. A 2-second timeout means a thread can't block for 30 seconds behind a deadlocked database.",
      "**Retries** handle transient failures. A dropped packet fails a request; wait briefly and try again, and the second attempt succeeds. **Exponential backoff** (wait 1 s, then 2 s, then 4 s) avoids retry storms, and **jitter** stops clients retrying in lockstep.",
      "**[Circuit breakers](/learn/circuit-breaker)** stop calling a failing service. If, say, 50% of calls to service B fail, open the circuit: stop sending requests and fail immediately. After 30 seconds, let one request through; if it works, close the circuit and resume. The failing service gets room to recover instead of being hammered.",
      "**[Fallbacks](/learn/fallbacks-graceful-degradation)** give an alternative when a call fails: cached data, a default value, or reduced functionality. If recommendations are down, show popular items instead of personalized ones; the user gets a working page, not an error.",
    ] },
    { type: "p", text: "Resilient systems **layer** them. Every request starts with a timeout. If it fails, retry with exponential backoff. If the retries are exhausted, the circuit breaker records the failure, and after enough failures it opens and stops wasting resources on a service that is clearly down. Meanwhile the application serves a fallback, so users see reduced functionality rather than errors." },
    { type: "diagram", kind: "flow", caption: "How the four patterns work together on one call: a timeout bounds each attempt, retries absorb blips, the circuit breaker tracks failures, and an open circuit goes straight to the fallback.", nodes: [
      { id: "r", label: "Request", col: 0, row: 0, tone: "store" },
      { id: "t", label: "Set timeout", sub: "max wait 2 s", col: 1.1, row: 0, tone: "cache" },
      { id: "re", label: "If it fails, retry", sub: "wait 1 s → 2 s → 4 s", col: 2.3, row: 0, tone: "ok" },
      { id: "cb", label: "Circuit breaker", sub: "closed → open → half-open", col: 3.6, row: 0, tone: "store" },
      { id: "ok", label: "Return response", col: 1.1, row: 1.2, tone: "ok", shape: "pill" },
      { id: "fb", label: "Return fallback", sub: "cached or default", col: 3.6, row: 1.2, tone: "danger", shape: "pill" },
    ], edges: [
      { from: "r", to: "t" }, { from: "t", to: "re" }, { from: "re", to: "cb" },
      { from: "t", to: "ok", label: "succeeds", dashed: true }, { from: "cb", to: "fb", label: "circuit open", dashed: true, tone: "danger" },
    ] },

    { type: "h2", text: "Timeouts" },
    { type: "p", text: "Timeouts are the simplest and most fundamental defense. **Every synchronous call should have one.** Without it, a thread can wait forever for a response that will never arrive." },
    { type: "h3", text: "What timeouts prevent" },
    { type: "p", text: "Service A calls service B, which queries a database. The database deadlocks and hangs for 30 seconds. B's thread waits on the query; A's thread waits on B. When 100 requests arrive at A, all 100 threads block and A appears to freeze completely. Then service C, which calls A, freezes too. One stuck query has taken down three services." },
    { type: "diagram", kind: "flow", caption: "Without timeouts, one deadlocked query freezes every service in the call chain.", nodes: [
      { id: "c", label: "Service C", sub: "all threads blocked", col: 0, row: 0, tone: "danger" },
      { id: "a", label: "Service A", sub: "all threads blocked", col: 1.3, row: 0, tone: "danger" },
      { id: "b", label: "Service B", sub: "waiting on query", col: 2.6, row: 0, tone: "danger" },
      { id: "db", label: "Database", sub: "deadlock · 30 s", col: 3.9, row: 0, shape: "db", tone: "danger" },
    ], edges: [{ from: "c", to: "a", label: "waits" }, { from: "a", to: "b", label: "waits" }, { from: "b", to: "db", label: "waits" }] },
    { type: "h3", text: "How timeouts work" },
    { type: "p", text: "A timeout is a maximum wait. A calls B with a 2-second timeout; if B hasn't answered in 2 seconds, A abandons the request, returns an error and its thread is free again. When the database deadlocks, B's threads still block, but A waits at most 2 seconds per request. A stays up and keeps serving everything that doesn't depend on B." },
    { type: "diagram", kind: "timeline", caption: "With a 2-second timeout, service A gives up on the hung call, frees its thread and answers its caller with an error (or a fallback) while the database is still stuck.", ticks: ["0 s", "1 s", "2 s", "3 s", "… 30 s"], spans: [
      { from: 0, to: 2, label: "A waits for B", tone: "cache" },
      { from: 0, to: 4, label: "B waits for the deadlocked database", tone: "danger", lane: 1 },
    ], marks: [{ at: 2, label: "timeout: A returns an error, thread freed", tone: "danger" }] },
    { type: "h3", text: "Choosing timeout values" },
    { type: "ul", items: [
      "**Base it on measured latency.** If B normally answers in 100 ms, a timeout around 500 ms allows for variance without waiting forever.",
      "**Use the p95 or p99.** If 99% of requests finish within 300 ms, a 1-second timeout catches the slow 1% without being trigger-happy. Too short causes false failures; too long defeats the purpose.",
      "**Different operations, different timeouts.** A cache read might time out at 100 ms, a complex database query at 5 seconds, an external third-party API at 10 seconds.",
      "**Set separate connect and request timeouts.** Connecting should take milliseconds; the request budget depends on the operation. Many client libraries default to waiting forever or for minutes.",
      "**Propagate deadlines.** If the user's request has 1 second left, a downstream call shouldn't be given 5 seconds. gRPC passes deadlines along automatically; with HTTP, pass a header carrying the remaining budget.",
    ] },
    { type: "h3", text: "Implementing timeouts" },
    { type: "p", text: "Most HTTP and RPC libraries support timeouts directly. Python with `requests`:" },
    { type: "code", code: `import requests

def get_user(user_id):
    try:
        response = requests.get(f"https://api.example.com/users/{user_id}", timeout=2)  # seconds
        return response.json()
    except requests.exceptions.Timeout:
        return {"error": "Service unavailable"}` },
    { type: "p", text: "Go with gRPC, using a context deadline:" },
    { type: "code", code: `ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()

response, err := client.GetUser(ctx, &pb.UserRequest{Id: 123})
if err != nil {
    // deadline exceeded or another error
    return nil, err
}` },
    { type: "p", text: "Database connections need timeouts too. PostgreSQL from Java (JDBC), with a 2-second connect timeout and a 5-second socket (read) timeout:" },
    { type: "code", code: `Properties props = new Properties();
props.setProperty("connectTimeout", "2");   // seconds
props.setProperty("socketTimeout", "5");
Connection conn = DriverManager.getConnection(url, props);` },
    { type: "h3", text: "Timeouts and retries need each other" },
    { type: "p", text: "A request times out after 2 seconds; the caller retries with backoff: wait 1 second and retry; if that times out, wait 2 seconds and retry; after 3 attempts, give up and return an error or a fallback. Without timeouts, retries make things worse: the first attempt blocks forever, the retry blocks too, and now two threads are stuck instead of one. Timeouts give every attempt a deadline." },

    { type: "h2", text: "Retries" },
    { type: "p", text: "Some failures are **transient**: a dropped packet, a service restarting, a connection pool that is full for a moment. They clear up quickly, so trying the same request again often succeeds." },
    { type: "h3", text: "When retries help" },
    { type: "p", text: "A mobile app calls the API gateway, which forwards the request to the user service. A network switch hiccups and drops a packet, so the request fails. The gateway retries; the network is fine again and the retry succeeds. The user never knows anything went wrong. Without automatic retries they'd see an error and have to tap the button again." },
    { type: "diagram", kind: "sequence", caption: "Service B retries its call to C twice; the third attempt succeeds and A gets a normal response.", actors: ["Service A", "Service B", "Service C"], steps: [
      { from: 0, to: 1, label: "request" },
      { from: 1, to: 2, label: "request ✗ failed", tone: "danger" },
      { from: 1, to: 2, label: "retry 1 ✗ failed", tone: "danger" },
      { from: 1, to: 2, label: "retry 2 ✓" },
      { from: 2, to: 1, label: "response", dashed: true },
      { from: 1, to: 0, label: "response", dashed: true },
    ] },
    { type: "h3", text: "When not to retry" },
    { type: "p", text: "Retries only help with transient failures. Asking again for a resource that doesn't exist returns the same `404`; logging in again with the same wrong password fails the same way. Check the error before retrying:" },
    { type: "table", head: ["Retry?", "Cases"], rows: [
      ["Yes", "Network errors, timeouts, `503 Service Unavailable`, `429 Too Many Requests` (after `Retry-After`), `502`/`504` from a proxy, other 5xx errors"],
      ["No", "4xx client errors such as `400 Bad Request`, `401 Unauthorized`, `403`, `404`, `409`, validation errors: the same request will fail the same way"],
      ["Only if idempotent", "Operations with side effects (POST, payments) unless they carry an idempotency key"],
    ] },
    { type: "p", text: "**Non-idempotent operations need care.** A \"create\" may succeed on the server while the response is lost on the way back; retrying it creates a duplicate. The fix is an **idempotency key**: the client sends a unique ID with each operation, the server records successful operations by that ID, and a retry with the same ID returns the original result instead of doing the work again. See [idempotency](/learn/idempotency)." },
    { type: "h3", text: "Exponential backoff" },
    { type: "p", text: "Retrying immediately piles more load on a service that may already be overloaded, so it falls further behind. **Exponential backoff** spaces retries out: wait 1 second before the first retry, then 2, then 4, then 8, giving the service time to recover." },
    { type: "code", code: `import time
import requests

def call_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=2)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException:
            if attempt == max_retries - 1:
                raise                          # out of attempts
            time.sleep(2 ** attempt)           # 1, 2, 4 seconds` },
    { type: "h3", text: "Adding jitter" },
    { type: "p", text: "Backoff alone has a flaw. If 1,000 requests fail at the same moment, all 1,000 retry exactly 1 second later, then exactly 2 seconds later. These synchronized waves can knock the service over again just as it starts to recover. **Jitter** adds randomness to each wait, for example anywhere between 1 and 2 seconds instead of exactly 2, so clients retry at slightly different times and the load spreads out." },
    { type: "code", code: `import random, time

wait = 2 ** attempt
jittered = wait * (0.5 + random.random() * 0.5)   # between 50% and 100% of the backoff
time.sleep(jittered)

# "Full jitter" variant: anywhere from 0 up to the capped backoff
# time.sleep(random.uniform(0, min(cap, base * 2 ** attempt)))` },
    { type: "diagram", kind: "flow", caption: "Without jitter, failed clients retry in synchronized spikes that knock the service down again; with jitter, retries spread into a gentle load.", nodes: [
      { id: "f", label: "1,000 clients fail", sub: "t = 0", col: 0, row: 0.5, tone: "danger", w: 160 },
      { id: "nj", label: "No jitter", sub: "all retry at 1 s, 2 s, 4 s", col: 1.4, row: 0, tone: "danger", w: 200 },
      { id: "j", label: "With jitter", sub: "retries spread over the window", col: 1.4, row: 1, tone: "ok", w: 200 },
      { id: "s1", label: "Spike → overload again", col: 2.8, row: 0, tone: "danger", shape: "pill", w: 190 },
      { id: "s2", label: "Smooth load → recovery", col: 2.8, row: 1, tone: "ok", shape: "pill", w: 190 },
    ], edges: [{ from: "f", to: "nj" }, { from: "f", to: "j" }, { from: "nj", to: "s1" }, { from: "j", to: "s2" }] },
    { type: "h3", text: "Retry limits" },
    { type: "p", text: "Always cap the number of attempts; three is common. After that, give up and return an error or a fallback. Retrying forever wastes resources and delays proper error handling. Cap the **total time** too: if the original request plus retries has taken 10 seconds, stop even if attempts remain, because the user has probably given up and the result may no longer matter." },

    { type: "h2", text: "Retry storms and how to prevent them" },
    { type: "p", text: "Retries multiply across layers. If each of 4 layers retries 3 times, one user request can become 3^4 = 81 calls to the bottom service during an outage, which keeps it down. Defenses:" },
    { type: "ul", items: [
      "**Retry at one layer** (usually closest to the user or at the edge), not every layer.",
      "**Retry budgets**: allow retries to add at most, say, 10% extra traffic; past that, fail fast. gRPC and Envoy support this.",
      "**Circuit breakers**: retries suit occasional failures, but if service B is completely down, every request still makes three attempts and waits through the backoff before failing, which only adds latency. A [circuit breaker](/learn/circuit-breaker) notices the persistent failure (for example 10 failures in a row) and stops calling B altogether, failing fast or serving a fallback.",
      "**Respect `Retry-After`** and other backpressure signals (429, 503).",
      "**Cap attempts** and total time with the deadline.",
    ] },

    { type: "h2", text: "Hedged requests" },
    { type: "p", text: "For latency-critical reads, instead of waiting for a timeout, send a **second request** to another replica if the first hasn't answered by roughly the p95 latency, and use whichever responds first. This trims tail latency at the cost of a few percent extra load. Use it only for idempotent reads. See [latency vs throughput](/learn/latency-vs-throughput)." },
  ],
  uses: [
    { name: "AWS SDKs", text: "Retry throttling and transient errors with exponential backoff and jitter by default, with a client-side retry quota." },
    { name: "gRPC", text: "Supports deadlines that propagate across services, configurable retry policies, retry throttling and hedging." },
    { name: "Envoy and service meshes", text: "Per-route timeouts, retry policies and retry budgets configured centrally instead of in each service." },
    { name: "Payment clients", text: "Retry network failures with the same idempotency key so a retried charge can't double-bill." },
  ],
  interview: [
    "Put a timeout on every network call, sized from the dependency's p99, with deadline propagation.",
    "Retry only transient errors (network, 5xx, 429) and only idempotent operations or ones with idempotency keys.",
    "Use exponential backoff with jitter, about 3 attempts, a total time cap, and retries at one layer.",
    "Layer the patterns: timeout → retry → circuit breaker → fallback.",
  ],
  related: ["circuit-breaker", "fallbacks-graceful-degradation", "idempotency", "sync-vs-async-communication", "latency-vs-throughput", "load-shedding"],
  practice: ["payment-platform", "notification-service", "web-crawler", "api-gateway"],
};
