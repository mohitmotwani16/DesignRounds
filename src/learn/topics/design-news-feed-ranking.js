// Case study: ML ranking for a personalized social news feed.
export default {
  blocks: [
    { type: "p", text: "**The question**: design the ML system that ranks posts in a social network's news feed, like Facebook, Instagram or LinkedIn. Each user has thousands of eligible posts from friends, followed pages and groups; the feed should show the ones they'll find most valuable, keep integrity problems out, and still feel fresh. The backend side of feeds (fan-out, storage) is covered in [fan-out](/learn/fan-out); this page is the ranking." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Goal?", "Meaningful engagement and daily return visits, not just clicks"],
      ["Scale?", "2B daily users; on average 1,500 eligible posts per user per session"],
      ["What's eligible?", "Posts from friends, followed pages and groups, plus some unconnected recommended posts"],
      ["Latency?", "First screen of the feed in under 300 ms end to end"],
      ["Constraints?", "Downrank misinformation and low-quality content; respect blocks and privacy settings"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "Pointwise multi-task prediction: for each (viewer, post), predict the probability of several actions, then combine them into a **value score**. Actions have different worth, and negative actions subtract:" },
    { type: "code", code: `value(viewer, post) = 1.0·p(like) + 4·p(comment) + 6·p(share) + 2·p(dwell > 10 s)
                    + 3·p(friend's post interaction) − 20·p(hide) − 50·p(report)
(illustrative weights; tuned by experiments against long-term retention)` },
    { type: "p", text: "Integrity classifiers (spam, clickbait, misinformation) run separately and act as demotions or filters. See [ML problem framing](/learn/ml-problem-framing)." },

    { type: "h2", text: "3. Data and labels" },
    { type: "ul", items: [
      "Impression logs with dwell time and position, joined to actions (like, comment, share, hide, report) within a session window.",
      "Comments and shares are rarer than likes, so each head has its own positive rate; downsample negatives per task.",
      "Surveys (\"is this post worth your time?\") give a small but valuable satisfaction label used to tune weights and train a satisfaction head.",
      "Time-based splits and position-bias handling; see [feedback loops](/learn/ml-feedback-loops).",
    ] },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "Feed ranking: inventory gathers eligible posts, integrity filters remove violations, a light ranker and a multi-task heavy ranker score them, and a final pass applies diversity and freshness rules.", nodes: [
      { id: "req", label: "Feed request", col: 0, row: 1, shape: "pill" },
      { id: "inv", label: "Inventory", sub: "friends · pages · groups", col: 1.25, row: 0.3, tone: "store", shape: "db" },
      { id: "rec", label: "Recommended", sub: "unconnected posts", col: 1.25, row: 1.7 },
      { id: "int", label: "Integrity filter", sub: "policy · blocks", col: 2.5, row: 1, tone: "danger" },
      { id: "light", label: "Light ranker", sub: "1,500 → 500", col: 3.75, row: 1 },
      { id: "heavy", label: "Multi-task ranker", sub: "500 → 50", col: 5, row: 1, tone: "accent" },
      { id: "final", label: "Final pass", sub: "diversity · freshness", col: 6.25, row: 1, tone: "ok" },
    ], edges: [
      { from: "req", to: "inv" }, { from: "req", to: "rec" }, { from: "inv", to: "int" }, { from: "rec", to: "int" },
      { from: "int", to: "light" }, { from: "light", to: "heavy" }, { from: "heavy", to: "final" },
    ] },

    { type: "h2", text: "5. Features" },
    { type: "table", head: ["Group", "Examples"], rows: [
      ["Viewer", "Activity level, interests, languages, typical session length"],
      ["Author", "Relationship strength with viewer (past interactions, messages, tags), author type (friend, page, group)"],
      ["Post", "Type (photo, video, link, text), age, early engagement velocity, topic, integrity scores, embeddings of text and media"],
      ["Viewer-post", "Viewer's past engagement with this post type and topic, whether friends have engaged"],
      ["Context", "Device, connection, time since last session, position"],
    ] },
    { type: "p", text: "**Relationship strength** (affinity) between viewer and author is often the strongest single signal, and **post age plus early engagement velocity** captures freshness and quality together." },

    { type: "h2", text: "6. Models" },
    { type: "ul", items: [
      "**Light ranker:** a small model (or distilled heavy model) on precomputed features to trim candidates cheaply.",
      "**Heavy ranker:** a multi-task deep network with a head per action and shared embeddings; see [choosing a model](/learn/ml-model-selection).",
      "**Integrity models:** separate classifiers per harm, so policy changes don't require retraining the ranker; see [harmful content detection](/learn/design-harmful-content-detection).",
      "**Calibration:** each head is calibrated, because the value formula adds probabilities from different tasks.",
    ] },

    { type: "h2", text: "7. Serving" },
    { type: "code", code: `Feed loads  : 2B users × 8 sessions/day = 16B/day ≈ 185K RPS avg, ~500K peak
Candidates  : 1,500 posts → light ranker → 500 → heavy ranker → top 50
Heavy model : 500 × 500K = 250M predictions/s at peak → batched GPU inference
Budget      : inventory 40 ms | features 40 ms | light 30 ms | heavy 80 ms | final 20 ms
Pagination  : rank 50, return 10; rank the next page when the user scrolls,
              using fresh features (they may have engaged with earlier posts)` },
    { type: "p", text: "Pre-rank in the background just before a likely session (for example when a notification is opened), and cache the ranked list briefly so back-and-forth navigation doesn't rerank. See [model serving](/learn/model-serving)." },

    { type: "h2", text: "8. Final pass rules" },
    { type: "ul", items: [
      "No more than two consecutive posts from the same author or page.",
      "Mix content types (photo, video, text) in the first screen.",
      "Already-seen posts drop sharply unless there's new activity on them.",
      "Demote borderline content by a factor from integrity scores rather than removing it outright.",
    ] },

    { type: "h2", text: "9. Evaluation" },
    { type: "table", head: ["Level", "Metrics"], rows: [
      ["Offline per head", "AUC, normalised log loss, calibration"],
      ["Offline ranking", "NDCG@10 using value-weighted labels"],
      ["Online primary", "Daily active users, sessions per user, meaningful interactions (comments, shares)"],
      ["Online guardrails", "Hide and report rates, integrity prevalence, survey satisfaction, time spent on low-quality content"],
    ] },
    { type: "p", text: "Short-term engagement can rise while long-term retention falls (outrage bait). Long-running holdouts and survey metrics protect against optimising the wrong thing. See [A/B testing](/learn/ab-testing-experimentation)." },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How do you balance friends' posts against recommended content?* A blending policy with a target share, tested online; recommended posts must clear a higher score bar.",
      "*How do you avoid rewarding outrage?* Weight comments by quality signals, use survey labels, and demote content integrity classifiers flag.",
      "*How fresh is the feed?* Post age as a feature, early engagement velocity from streams, and reranking on each page fetch.",
    ] },
  ],
  uses: [
    { name: "Social networks", text: "Friend and page feeds ranked by multi-task value models with integrity demotions." },
    { name: "Professional networks", text: "Feeds that weight comments and dwell from relevant connections over raw reactions." },
    { name: "Community forums", text: "Hot and best rankings blended with personalisation for logged-in users." },
  ],
  interview: [
    "Write a value formula from several predicted actions, including negative ones.",
    "Separate integrity models from the engagement ranker.",
    "Name affinity and early engagement velocity as key features.",
    "Use long-term and satisfaction guardrails, not only engagement.",
  ],
  related: ["design-video-recommendation-system", "recommendation-system-design", "fan-out", "learning-to-rank", "ml-feedback-loops", "design-harmful-content-detection"],
  practice: ["feed-ranking", "news-feed", "recommendation-engine"],
  reading: [
    { title: "Modeling Task Relationships in Multi-task Learning with Multi-gate Mixture-of-Experts", publisher: "Ma et al., KDD 2018", url: "https://dl.acm.org/doi/10.1145/3219819.3220007" },
    { title: "Deep Learning Recommendation Model for Personalization and Recommendation Systems", publisher: "Naumov et al., Meta, 2019", url: "https://arxiv.org/abs/1906.00091" },
  ],
};
