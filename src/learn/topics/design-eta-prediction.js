// Case study: ETA prediction for food delivery and ride-hailing.
export default {
  blocks: [
    { type: "p", text: "**The question**: design the system that predicts delivery time for a food delivery app (or arrival time for a ride-hailing app). The estimate is shown before ordering, updated during the order, and used internally for dispatch and pricing. Customers punish late deliveries more than early ones, the inputs change by the minute, and the prediction is requested millions of times a day." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Which ETA?", "Order-to-door time shown at checkout, then updated after the courier is assigned and picks up"],
      ["Scale?", "10M orders per day; ETAs also computed for every restaurant shown in search (~50K requests per second)"],
      ["Latency?", "Under 50 ms per request; search pages need ETAs for 30-50 restaurants at once"],
      ["Accuracy goal?", "Most orders within ±5 minutes; avoid systematic lateness"],
      ["Consumers?", "Customers (displayed range), dispatch (courier timing), pricing"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "**Regression** on minutes. Decompose the journey so each part can use the right signals and be debugged on its own:" },
    { type: "diagram", kind: "segments", width: 780, caption: "A delivery ETA decomposed into stages. Each stage gets its own model or estimate, and errors can be traced to the stage that caused them.", lanes: [{ parts: [
      { label: "Restaurant confirms", sub: "~2 min", size: 2, tone: "muted" },
      { label: "Food preparation", sub: "~14 min", size: 14, tone: "accent" },
      { label: "Courier to restaurant", sub: "~8 min", size: 8, tone: "store" },
      { label: "Wait at pickup", sub: "~3 min", size: 3, tone: "danger" },
      { label: "Drive to customer", sub: "~11 min", size: 11, tone: "ok" },
    ] }] },
    { type: "p", text: "Because lateness hurts more than earliness, predict **quantiles** (P50 and P80/P90) with a quantile loss, or a distribution, rather than only a mean. Show the customer a range or a slightly conservative point." },

    { type: "h2", text: "3. Data" },
    { type: "ul", items: [
      "Completed orders with timestamps for every stage: placed, confirmed, food ready (where known), courier arrived, picked up, delivered.",
      "Labels are clean and plentiful: actual durations, available within an hour.",
      "Food-ready time is often missing or noisy (restaurants tap late); infer it from courier wait times.",
      "Time-based splits; rolling backtests across weeks to capture weekly and holiday patterns. See [training data](/learn/ml-training-data).",
    ] },

    { type: "h2", text: "4. Features" },
    { type: "table", head: ["Group", "Examples", "Freshness"], rows: [
      ["Restaurant", "Historical prep time by item and hour, current open orders (kitchen load), prep-time trend in last 30 min", "Batch + seconds"],
      ["Order", "Number and types of items, order value", "Request"],
      ["Courier supply", "Available couriers within 2 km, recent assignment delays", "Seconds"],
      ["Route", "Road distance and routing-engine travel time, current traffic, weather", "Minutes"],
      ["Time", "Hour, day of week, holiday, meal peak", "Request"],
      ["Location", "Drop-off building type (apartment towers add minutes), parking difficulty", "Batch"],
    ] },
    { type: "p", text: "Real-time kitchen load and courier supply come from [stream processing](/learn/stream-processing) into an online store; historical aggregates come from daily batch jobs. See [feature engineering](/learn/feature-engineering)." },

    { type: "h2", text: "5. Model" },
    { type: "ol", items: [
      "**Baseline:** routing-engine travel time + restaurant's average prep time for that hour.",
      "**Gradient-boosted trees** per stage with quantile loss: strong, fast and explainable.",
      "**Deep model** that learns from sequences (route segments, recent orders at the restaurant) and predicts the residual on top of the routing engine's estimate, a common approach in industry.",
      "**Post-processing:** add a buffer when uncertainty is high; clip to sensible bounds.",
    ] },

    { type: "h2", text: "6. Architecture" },
    { type: "diagram", kind: "flow", caption: "ETA serving: the request fetches route estimates and fresh supply and kitchen features in parallel, the model predicts per-stage quantiles, and the result is cached briefly per restaurant and area for search pages.", nodes: [
      { id: "app", label: "App / search", col: 0, row: 1, shape: "pill" },
      { id: "eta", label: "ETA service", col: 1.3, row: 1, tone: "accent" },
      { id: "route", label: "Routing engine", sub: "distance · traffic", col: 2.6, row: 0 },
      { id: "fs", label: "Online features", sub: "kitchen · couriers", col: 2.6, row: 1, shape: "db", tone: "cache" },
      { id: "cache", label: "ETA cache", sub: "restaurant × area · 60 s", col: 2.6, row: 2, shape: "db", tone: "cache", w: 170 },
      { id: "model", label: "Stage models", sub: "P50 · P90", col: 3.9, row: 1, tone: "accent" },
      { id: "stream", label: "Order + GPS events", col: 3.9, row: 2.2, shape: "queue", tone: "queue", w: 160 },
    ], edges: [
      { from: "app", to: "eta" }, { from: "eta", to: "route" }, { from: "eta", to: "fs" }, { from: "eta", to: "cache", both: true }, { from: "route", to: "model" }, { from: "fs", to: "model" }, { from: "stream", to: "fs", label: "update" },
    ] },
    { type: "code", code: `Search ETAs : 50K req/s × 40 restaurants = 2M estimates/s → too many model calls;
              cache per (restaurant, delivery area hexagon) for 60 s:
              ~200K open restaurants × ~20 nearby hexagons = 4M keys, mostly hot
Checkout    : 10M orders/day ≈ 115/s avg; exact per-order prediction, no cache
In-flight   : re-predict on each stage event and every ~2 min from courier GPS` },

    { type: "h2", text: "7. Evaluation" },
    { type: "ul", items: [
      "**Offline:** MAE overall and per stage; percentage within ±5 minutes; **lateness rate** (actual > shown); quantile calibration (does the P90 cover 90% of orders?).",
      "**Slices:** peak vs off-peak, rain, new restaurants, large orders, cities.",
      "**Online:** customer complaints and refunds for lateness, conversion at checkout (pessimistic ETAs lose orders), dispatch efficiency.",
      "See [ML evaluation](/learn/ml-evaluation-metrics).",
    ] },
    { type: "callout", tone: "tip", text: "ETA is a good place to show a business trade-off: an ETA that's too optimistic increases orders now but causes late deliveries and churn; one that's too pessimistic loses orders. The displayed quantile is a product decision tested online." },

    { type: "h2", text: "8. Monitoring" },
    { type: "ul", items: [
      "Live error dashboards per city and stage; alert when lateness rises above a threshold for an area.",
      "Feature freshness of courier supply and kitchen load streams.",
      "Drift during events (storms, sports finals, holidays); fall back to a conservative buffer when inputs look abnormal.",
    ] },
  ],
  uses: [
    { name: "Food and grocery delivery", text: "Prep-time and courier-time models drive the checkout ETA and dispatch timing." },
    { name: "Ride-hailing", text: "Pickup ETA from driver supply and arrival ETA from routing plus a learned residual." },
    { name: "Logistics", text: "Parcel delivery windows predicted per stop from route plans and historical stop durations." },
  ],
  interview: [
    "Decompose the ETA into stages, each with its own signals.",
    "Predict quantiles and explain the asymmetric cost of lateness.",
    "Use real-time kitchen and supply features from streams, and cache for search pages.",
    "Evaluate MAE, lateness rate and quantile coverage by slice.",
  ],
  related: ["feature-engineering", "stream-processing", "ml-model-selection", "ml-evaluation-metrics", "geospatial-indexing", "design-food-delivery-analytics"],
  practice: ["eta-prediction", "ride-hailing", "food-delivery-analytics", "online-fraud-model"],
  reading: [
    { title: "DeepETA: How Uber Predicts Arrival Times Using Deep Learning", publisher: "Uber Engineering", url: "https://www.uber.com/blog/deepeta-how-uber-predicts-arrival-times/" },
    { title: "XGBoost: A Scalable Tree Boosting System", publisher: "Chen and Guestrin, KDD 2016", url: "https://arxiv.org/abs/1603.02754" },
  ],
};
