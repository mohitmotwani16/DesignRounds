export default {
  blocks: [
    { type: "p", text: "The **cold start problem** is what happens when a recommender has no history to learn from: a **new user** who has never clicked anything, a **new item** nobody has seen, or a **new system** with no logs at all. Collaborative signals (\"people like you watched this\") don't exist yet, so the model falls back to guesses and new items never get the exposure they need to collect data. Every recommendation design question expects a cold start plan." },

    { type: "h2", text: "Three kinds of cold start" },
    { type: "table", head: ["Kind", "What's missing", "Main levers"], rows: [
      ["New user", "Interaction history", "Context, onboarding choices, popular-in-segment, fast session learning"],
      ["New item", "Engagement statistics and an id embedding", "Content features, metadata embeddings, exploration boosts"],
      ["New system or market", "All logs", "Heuristics and editorial curation first; log everything; transfer from similar markets"],
    ] },

    { type: "h2", text: "New users" },
    { type: "diagram", kind: "flow", caption: "A new user's journey from cold to warm. The system leans on context and popularity at first, then shifts weight to personal signals as the session and history fill in.", nodes: [
      { id: "ctx", label: "Context only", sub: "country · device · time", col: 0, row: 1, tone: "muted", w: 160 },
      { id: "onb", label: "Onboarding", sub: "pick 3 topics", col: 1.4, row: 0 },
      { id: "pop", label: "Popular in segment", col: 1.4, row: 2, tone: "store" },
      { id: "sess", label: "Session signals", sub: "first clicks", col: 2.8, row: 1, tone: "accent" },
      { id: "warm", label: "Personal model", sub: "full history", col: 4.2, row: 1, tone: "ok" },
    ], edges: [
      { from: "ctx", to: "onb" }, { from: "ctx", to: "pop" }, { from: "onb", to: "sess" }, { from: "pop", to: "sess" }, { from: "sess", to: "warm", label: "days" },
    ] },
    { type: "ul", items: [
      "**Context features:** location, language, device, referral source and time all carry signal on the first request.",
      "**Popularity within a segment:** \"trending among new users in your country\" beats global popularity.",
      "**Onboarding questions:** ask for a few interests or let the user pick creators; keep it short, every step loses users.",
      "**Session-based models:** recommend from the clicks in the current session (sequence models or item-to-item similarity), so personalisation starts within minutes.",
      "**Imported signals:** with consent, contacts or a linked account can seed a profile.",
    ] },

    { type: "h2", text: "New items" },
    { type: "p", text: "A new video or product has no clicks, so an id-based model gives it a near-random score, and it may never be shown. Fixes combine **content understanding** with **deliberate exposure**:" },
    { type: "ul", items: [
      "**Content-based embeddings:** embed the title, description, image, audio or creator, so the item lands near similar items in the embedding space from the moment it's uploaded. Two-tower item towers that use content features (not just the id) handle this naturally; see [embeddings](/learn/embeddings).",
      "**Creator and category priors:** start the item's predicted CTR at its creator's or category's average instead of zero.",
      "**Exploration budget:** guarantee new items a slice of impressions (for example 5% of slots) and let a [bandit](/learn/multi-armed-bandits) decide which earn more.",
      "**Freshness boost:** a time-decaying bonus in re-ranking for items under a certain age.",
      "**Fast feedback:** stream early engagement into item features within minutes, so a good new item is recognised quickly.",
    ] },
    { type: "diagram", kind: "timeline", caption: "A new item's first day. Content features give it a starting score, the exploration budget earns it early impressions, and streamed engagement lets the main ranker take over within hours.", ticks: ["upload", "+15 min", "+1 h", "+4 h", "+24 h"], spans: [
      { from: 0, to: 1, label: "content prior", lane: 0, tone: "store" },
      { from: 1, to: 3, label: "exploration slots", lane: 1, tone: "accent" },
      { from: 2, to: 4, label: "ranked on real engagement", lane: 0, tone: "ok" },
    ], marks: [{ at: 2, label: "enough data", tone: "ok" }] },

    { type: "h2", text: "A brand-new system" },
    { type: "ol", items: [
      "Launch with heuristics: popular, new, editor's picks, simple content similarity.",
      "Log impressions, positions and outcomes from day one; that log is your future training set.",
      "Train a first simple model after a few weeks; keep the heuristic as a fallback.",
      "Transfer from related data if available: another market, another surface, or pretrained content encoders.",
    ] },

    { type: "h2", text: "Measuring cold start" },
    { type: "ul", items: [
      "Report offline and online metrics separately for **new users** (first 7 days) and **new items** (first 24 to 72 hours).",
      "Track **new-item reach**: the share of new items that receive at least N impressions in their first day.",
      "Track **new-user retention**: day-1 and day-7 return rates by recommendation variant.",
    ] },
  ],
  uses: [
    { name: "Short-video apps", text: "Every upload gets a small, targeted exposure batch; strong early engagement earns larger batches." },
    { name: "E-commerce", text: "New products inherit priors from brand and category and are matched by image and text embeddings." },
    { name: "Music streaming", text: "Audio embeddings place new tracks near similar songs before anyone has played them." },
  ],
  interview: [
    "Treat new users and new items separately, with a plan for each.",
    "Use content features in the item tower so new items have an embedding on arrival.",
    "Reserve an exploration budget and explain how it's allocated.",
    "Measure cold start with slice metrics for new users and new items.",
  ],
  related: ["recommendation-system-design", "multi-armed-bandits", "embeddings", "ml-feedback-loops", "design-video-recommendation-system"],
  practice: ["video-recommendations", "recommendation-engine"],
  reading: [
    { title: "Deep Neural Networks for YouTube Recommendations", publisher: "Covington et al., RecSys 2016", url: "https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/" },
    { title: "Recommendation systems course", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/recommendation" },
  ],
};
