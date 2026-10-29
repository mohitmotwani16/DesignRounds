export default {
  blocks: [
    { type: "p", text: "An **A/B test** (online controlled experiment) randomly splits users between the current experience (control) and a change (treatment) and compares outcomes, so the difference can be attributed to the change rather than to seasonality or luck. An **experimentation platform** makes that safe and routine at scale: consistent assignment, exposure logging, metric computation, statistics and guardrails, for hundreds of concurrent experiments." },

    { type: "h2", text: "The pieces of an experiment" },
    { type: "ul", items: [
      "**Hypothesis and primary metric:** \"The new ranker increases purchases per user.\" Decide this before launch.",
      "**Randomisation unit:** usually the user (logged-in ID or a device ID); sometimes the session, the request, or a cluster such as a city.",
      "**Allocation:** for example 50/50, or 5% treatment while ramping.",
      "**Guardrail metrics:** latency, errors, revenue and complaints that must not get worse.",
      "**Duration and sample size:** fixed in advance from the minimum effect worth detecting.",
    ] },

    { type: "h2", text: "Assignment that stays consistent" },
    { type: "p", text: "Assign by hashing the unit ID with an experiment-specific salt: `bucket = hash(experiment_id + user_id) mod 1000`. The same user always lands in the same bucket, without storing assignments, and different experiments get independent splits because their salts differ." },
    { type: "diagram", kind: "flow", caption: "Assignment is a deterministic hash in the request path; exposure events are logged and joined with outcome events to compute metrics per variant.", nodes: [
      { id: "req", label: "Request", sub: "user_id", col: 0, row: 1, shape: "pill" },
      { id: "assign", label: "Assignment SDK", sub: "hash(salt, user) → variant", col: 1.3, row: 1, tone: "accent" },
      { id: "cfg", label: "Experiment config", sub: "allocation · targeting", col: 1.3, row: 0, shape: "db", tone: "cache" },
      { id: "app", label: "Feature code", sub: "control / treatment", col: 2.6, row: 1 },
      { id: "logs", label: "Exposure + outcome events", col: 3.9, row: 1, shape: "queue", tone: "queue" },
      { id: "stats", label: "Metrics + statistics", sub: "per variant", col: 5.1, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "req", to: "assign" }, { from: "cfg", to: "assign", dashed: true }, { from: "assign", to: "app" },
      { from: "app", to: "logs", label: "log exposure" }, { from: "logs", to: "stats" },
    ] },
    { type: "p", text: "Log an **exposure** event only when the user actually encounters the changed experience, and analyse those users. Analysing everyone assigned, including people who never reached the feature, dilutes the effect." },

    { type: "h2", text: "Statistics that matter in practice" },
    { type: "ul", items: [
      "**Sample size and power:** smaller effects need many more users. Detecting a 1% lift needs roughly four times as many users as detecting a 2% lift. Compute the sample size before launch.",
      "**Don't peek and stop early:** checking p-values daily and stopping at the first significant result inflates false positives. Use a fixed horizon, or sequential testing methods designed for continuous monitoring.",
      "**Multiple comparisons:** testing twenty metrics means one will look significant by chance. Pre-register the primary metric.",
      "**Variance reduction:** methods such as CUPED use each user's pre-experiment behaviour to reduce noise, so experiments finish sooner.",
      "**Sample ratio mismatch (SRM):** if a 50/50 split shows 50.8/49.2 with millions of users, assignment or logging is broken. Check it automatically and distrust results that fail.",
    ] },

    { type: "h2", text: "When user-level A/B tests break" },
    { type: "table", head: ["Situation", "Problem", "Common approach"], rows: [
      ["Marketplaces (riders and drivers)", "Treatment users compete with control users for the same supply", "Randomise by region or time (switchback tests)"],
      ["Social networks", "Treated users affect their friends' experience (network effects)", "Cluster randomisation by social graph communities"],
      ["Long-term effects", "Novelty boosts fade; learning effects take weeks", "Long-running holdout groups"],
      ["Logged-out users", "IDs change across devices", "Randomise by device and accept some leakage"],
    ] },

    { type: "h2", text: "Running many experiments at once" },
    { type: "ul", items: [
      "**Layers:** experiments on unrelated surfaces run in independent layers, each with its own hash salt, so a user can be in many at once.",
      "**Mutual exclusion:** experiments that touch the same feature share a layer and get disjoint traffic.",
      "**Config, not deploys:** allocation lives in dynamic config (see [feature flags](/learn/feature-flags)), so ramping or killing an experiment doesn't need a release.",
      "**Automated guardrails:** the platform can stop an experiment that breaches a guardrail threshold.",
    ] },
  ],
  uses: [
    { name: "Ranking changes", text: "A new feed model is tested on 10% of users for two weeks on satisfied watch time, with latency and report rates as guardrails." },
    { name: "Pricing and promotions", text: "City-level switchback experiments measure marketplace effects that user-level tests would bias." },
    { name: "UI changes", text: "Checkout flow variants are tested with conversion as the primary metric and error rates as guardrails." },
  ],
  interview: [
    "State the randomisation unit, primary metric and guardrails before anything else.",
    "Use deterministic hashing for assignment and log exposures.",
    "Mention sample size, peeking and sample ratio mismatch checks.",
    "Recognise network and marketplace effects and suggest cluster or switchback designs.",
  ],
  related: ["ml-evaluation-metrics", "feature-flags", "recommendation-system-design", "ml-model-monitoring", "observability", "multi-armed-bandits", "ml-feedback-loops"],
  practice: ["experimentation-analytics", "recommendation-engine", "mobile-release-flags"],
  reading: [
    { title: "Trustworthy Online Controlled Experiments", publisher: "Kohavi, Tang and Xu, Cambridge University Press", url: "https://experimentguide.com/" },
    { title: "Under the Hood of Uber's Experimentation Platform", publisher: "Uber Engineering Blog", url: "https://www.uber.com/in/en/blog/xp/" },
  ],
};
