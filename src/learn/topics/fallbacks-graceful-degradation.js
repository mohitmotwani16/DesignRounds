// Fallbacks: cached responses, safe defaults, graceful degradation and stubs, in the order to
// try them, and how they combine with circuit breakers.
export default {
  blocks: [
    { type: "p", text: "A **fallback** is the alternative response a system gives when the primary operation fails. [Circuit breakers](/learn/circuit-breaker) stop calls to a failing service, but blocking a call on its own still leaves the user looking at an error page. Fallbacks let the system **degrade gracefully** instead of breaking: the user gets slightly less, not nothing." },

    { type: "h2", text: "Why fallbacks matter" },
    { type: "p", text: "A product page shows item details, reviews, recommendations and stock status. The reviews service goes down. Without fallbacks, the whole page errors: the customer can't see the product or buy it, even though everything needed to buy it works. One failed dependency has broken the entire feature." },
    { type: "p", text: "With fallbacks, the page loads without reviews and shows \"Reviews temporarily unavailable\". The customer reads the details, checks stock and completes the purchase. Revenue keeps flowing; the experience is slightly worse but not broken." },
    { type: "p", text: "Fallbacks turn catastrophic failures into minor inconveniences. Designing them forces a useful exercise: separating the **critical path** (product, price, checkout) from the **nice-to-have** features (reviews, recommendations, badges), so that non-critical failures never take down critical functionality." },
    { type: "diagram", kind: "flow", caption: "When the primary service fails, try fallbacks in order: cached data first, then a safe default, then degraded mode, and a placeholder as the last resort.", nodes: [
      { id: "p", label: "Primary service", sub: "failing", col: 1.5, row: 0, tone: "danger" },
      { id: "q", label: "Service failed?", col: 1.5, row: 1, tone: "cache", shape: "pill" },
      { id: "c", label: "1. Cached data", sub: "weather from 15 min ago", col: 0, row: 2.2, tone: "ok" },
      { id: "d", label: "2. Default value", sub: "popular items", col: 1, row: 2.2, tone: "cache" },
      { id: "g", label: "3. Degraded mode", sub: "hide suggestions", col: 2, row: 2.2, tone: "store" },
      { id: "s", label: "4. Placeholder", sub: "generic image", col: 3, row: 2.2, tone: "danger" },
    ], edges: [
      { from: "p", to: "q" }, { from: "q", to: "c", label: "first" }, { from: "q", to: "d", label: "second" },
      { from: "q", to: "g", label: "third" }, { from: "q", to: "s", label: "last", dashed: true, tone: "danger" },
    ] },

    { type: "h2", text: "1. Cached responses" },
    { type: "p", text: "The simplest fallback is data from an earlier successful call. Cache good responses with a timestamp; when the primary fails, return the cached copy along with how old it is." },
    { type: "p", text: "A weather service normally fetches live data from an external API. When that API goes down, it returns the forecast from 15 minutes ago, labeled \"Updated 15 min ago\". Users still get useful information, because weather changes slowly enough for 15-minute-old data to be valuable." },
    { type: "ul", items: [
      "**Match staleness to the domain.** Stock prices change every second, so a 15-minute-old price is misleading: return an error instead. User profiles rarely change, so a day-old cached profile is a fine fallback.",
      "**Choose cache lifetimes deliberately.** A 5-minute cache for product prices balances freshness with fallback coverage; a 24-hour cache for user avatars both cuts load on the profile service and covers long outages.",
      "**Serve stale on error.** Many caches and CDNs can keep serving an expired entry when the origin fails (`stale-if-error`). See [cache invalidation](/learn/cache-invalidation).",
    ] },
    { type: "code", code: `def get_weather(city):
    try:
        data = weather_api.fetch(city, timeout=2)
        cache.set(f"weather:{city}", {"data": data, "at": now()}, ttl=24 * 3600)
        return {"data": data, "stale": False}
    except (Timeout, ServiceError):
        cached = cache.get(f"weather:{city}")
        if cached and now() - cached["at"] < timedelta(hours=1):     # still useful for weather
            return {"data": cached["data"], "stale": True, "as_of": cached["at"]}
        raise` },

    { type: "h2", text: "2. Default responses" },
    { type: "p", text: "When there's no cached data, or it's too old, return a **safe default**. The rule: a default must never mislead users or harm the business." },
    { type: "ul", items: [
      "**Recommendations down → popular items.** Instead of personalized suggestions, show the most popular products. They won't match the user's taste as well, but they're relevant, and something is better than an empty box.",
      "**Discount calculator down → full price.** For enterprise pricing, charge the full list price rather than guessing a discount. Full price is safe; applying a wrong discount loses money or breaks contracts. The conservative default protects the business.",
    ] },
    { type: "p", text: "**Make defaults explicit.** Don't return `0` or an empty string unless that genuinely means something. If the discount calculator falls back to `0`, checkout might read it as \"free\". Return a flag or error code along with the default so callers know they are getting fallback data." },

    { type: "h2", text: "3. Graceful degradation" },
    { type: "p", text: "Turn off non-essential features when their backing services fail, so the core keeps working." },
    { type: "ul", items: [
      "**Social feed.** The feed shows friends' posts, trending topics and suggested accounts. If the suggestions service fails, hide that section; friends' posts and trends still appear.",
      "**Video player.** If the service that picks the best quality level fails, play in standard definition instead of failing playback. Watching the video matters more than optimizing it.",
    ] },
    { type: "p", text: "**Tell users.** A banner such as \"Some features are temporarily unavailable\" explains why things look different, so they can try later or contact support instead of being confused. See also [load shedding](/learn/load-shedding), which degrades features on purpose when the system is overloaded." },

    { type: "h2", text: "4. Stubbed responses" },
    { type: "p", text: "Return **placeholder** data that keeps the UI's structure without real content, for cases where a gap would confuse users but real data isn't available." },
    { type: "ul", items: [
      "**Product images.** If the image service fails, show a generic product placeholder. The layout stays intact, and customers can still read the title and price and decide to buy. Missing photos are an annoyance, not a blocker.",
      "**Dashboards.** If the analytics service fails, keep the chart's frame and show \"Data temporarily unavailable\" inside it. The layout stays consistent, other charts still render, and users can check back later.",
    ] },
    { type: "p", text: "Stubs must be **obviously stubs**. A placeholder image should look generic, never like real product photography; users must not mistake fake data for real data." },

    { type: "h2", text: "Choosing a fallback" },
    { type: "table", head: ["Fallback", "Use when", "Example", "Watch out for"], rows: [
      ["Cached data", "A recent copy is still meaningful", "Weather \"updated 15 min ago\"", "Data that goes stale fast (prices, balances)"],
      ["Default value", "No usable cache; a safe generic answer exists", "Popular items instead of personalized ones", "Defaults that mislead (0 meaning free)"],
      ["Degraded mode", "The feature is optional", "Feed without the suggestions section", "Hiding something users rely on without explanation"],
      ["Placeholder", "Layout must stay intact", "Generic product image", "Stubs that look like real data"],
      ["Fail with a clear error", "Correctness matters more than availability", "Payment authorization, account balance", "Slow failures: fail fast instead"],
      ["Queue for later", "The work can happen after the response", "Send the email when the provider recovers", "Unbounded backlogs"],
    ] },

    { type: "h2", text: "Combining fallbacks with circuit breakers" },
    { type: "p", text: "The two work together. While the circuit is open, the system returns the fallback **immediately**, without even attempting the failing call, so no resources are wasted." },
    { type: "p", text: "A user-profile service calls the achievements service for badges. Achievements fails repeatedly, and the circuit breaker opens. For the next 30 seconds, profile requests skip the achievements call entirely and return the profile without badges. Then the circuit goes half-open and lets a few test requests through. If achievements has recovered, badges reappear; if not, the circuit reopens and the fallback continues." },
    { type: "diagram", kind: "sequence", caption: "Circuit open: the profile service skips the achievements call and returns the profile without badges; half-open trials decide when badges come back.", actors: ["User", "Profile service", "Circuit breaker", "Achievements"], steps: [
      { from: 0, to: 1, label: "GET /profile" },
      { from: 1, to: 2, label: "get badges?" },
      { note: "circuit OPEN: no call is made", over: [2, 3] },
      { from: 2, to: 1, label: "fallback: no badges", dashed: true },
      { from: 1, to: 0, label: "profile without badges", dashed: true },
      { note: "after 30 s: half-open trial", over: [2, 3] },
      { from: 2, to: 3, label: "trial request" },
      { from: 3, to: 2, label: "OK → circuit closes", dashed: true },
    ] },

    { type: "h2", text: "Fallbacks in interviews" },
    { type: "p", text: "For the system you're designing, say which services are **critical** and which can **degrade**, and describe what the user sees during each kind of failure. That shows you understand the difference between a catastrophic failure and acceptable degradation, which interviewers look for in senior candidates." },
  ],
  uses: [
    { name: "Netflix", text: "When personalization is unavailable, rows fall back to popular or cached titles so the home screen always renders." },
    { name: "E-commerce", text: "Reviews, recommendations and ads degrade independently; product, price and checkout are protected as the critical path." },
    { name: "CDNs and HTTP caches", text: "`stale-if-error` and `stale-while-revalidate` serve cached pages when the origin is down." },
    { name: "Mobile apps", text: "Show the last synced data with an \"offline\" banner when the network or backend is unavailable. See [offline-first sync](/learn/offline-first-sync)." },
  ],
  interview: [
    "Separate critical from non-critical dependencies and give each non-critical one a fallback.",
    "Prefer cached data, then safe defaults, then degraded mode, then placeholders, and say what the user sees.",
    "Choose conservative defaults (full price, \"stock unknown\") over ones that could mislead or lose money.",
    "Pair fallbacks with circuit breakers so an open circuit answers instantly.",
  ],
  related: ["circuit-breaker", "retries-and-timeouts", "load-shedding", "caching", "availability"],
  practice: ["news-feed", "video-streaming", "payment-platform"],
};
