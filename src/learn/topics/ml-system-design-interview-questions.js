export default {
  blocks: [
    { type: "p", text: "These are the **machine learning system design interview questions** that come up most in ML engineer, applied scientist and data scientist loops at large tech companies and ML-heavy startups. They're grouped into families, because questions in a family share an architecture: once you can design one recommender well, the others are variations. For each question you'll find what it really tests and where to study or practise it. Answer any of them with the [seven-step framework](/learn/ml-system-design-interview)." },
    { type: "callout", tone: "tip", text: "Ranking and recommendations account for a large share of ML design questions at ad-funded and consumer companies. If your time is short, master the recommendation funnel first, then ads, then integrity." },

    { type: "h2", text: "The question families at a glance" },
    { type: "diagram", kind: "tree", caption: "ML system design questions fall into a handful of families. Each family reuses one core architecture, so studying one worked answer per family covers most of what you'll be asked.", root: { label: "ML design questions", tone: "accent", children: [
      { label: "Recommendations", sub: "retrieve → rank", tone: "accent", children: [{ label: "Video, feed, PYMK", tone: "store" }] },
      { label: "Search ranking", sub: "query → LTR", children: [{ label: "Web, product, local", tone: "store" }] },
      { label: "Ads", sub: "pCTR → auction", children: [{ label: "CTR, conversion", tone: "store" }] },
      { label: "Integrity", sub: "classify → review", children: [{ label: "Fraud, harm, spam", tone: "store" }] },
      { label: "Prediction", sub: "regression", children: [{ label: "ETA, demand, price", tone: "store" }] },
      { label: "ML platforms", sub: "infrastructure", children: [{ label: "Features, training, serving", tone: "store" }] },
    ] } },

    { type: "h2", text: "Recommendation and personalisation" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design YouTube's home page recommendations", "Multi-stage funnel, multi-objective ranking, satisfaction vs clicks", "[Worked answer](/learn/design-video-recommendation-system) · [Round](/system-design/video-recommendations)"],
      ["Design a personalized news feed ranking (Facebook, LinkedIn)", "Value model over several actions, integrity, freshness", "[Worked answer](/learn/design-news-feed-ranking) · [Round](/system-design/feed-ranking)"],
      ["Design People You May Know", "Graph candidates, link prediction, batch precompute, privacy", "[Worked answer](/learn/design-people-you-may-know) · [Round](/system-design/people-you-may-know)"],
      ["Design Netflix or Spotify recommendations", "Small catalogue vs huge one, session signals, artwork personalisation", "[Recommendation systems](/learn/recommendation-system-design)"],
      ["Design an event or restaurant recommender", "Location and time context, cold start, availability", "[Cold start](/learn/cold-start-problem)"],
      ["Design similar listings for a rental marketplace", "Item embeddings, two-sided marketplace constraints", "[Embeddings](/learn/embeddings)"],
      ["Design Instagram Explore or TikTok For You", "Unconnected content, exploration, fast feedback", "[Bandits](/learn/multi-armed-bandits)"],
      ["Design push notification ranking", "Uplift vs open probability, volume caps, send time, long-term holdouts", "[Feedback loops](/learn/ml-feedback-loops) · [Round](/system-design/notification-ranking)"],
    ] },

    { type: "h2", text: "Search and retrieval" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design search ranking for an e-commerce site", "Query understanding, hybrid retrieval, LTR, position bias", "[Worked answer](/learn/design-search-ranking) · [Round](/system-design/search-ranking)"],
      ["Design YouTube video search", "Text plus engagement signals, multimodal content understanding", "[Learning to rank](/learn/learning-to-rank)"],
      ["Design a visual search system (image to similar images)", "Contrastive embeddings, ANN at billions of vectors", "[Worked answer](/learn/design-visual-search) · [Round](/system-design/visual-search)"],
      ["Design search autocomplete", "Prefix retrieval, ranking suggestions, latency", "[Typeahead](/learn/typeahead-autocomplete) · [Round](/system-design/autocomplete)"],
      ["Design local business search for a maps app", "Distance and opening hours as features, relevance labels", "[Search ranking](/learn/design-search-ranking)"],
    ] },

    { type: "h2", text: "Ads" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design ad click prediction for a social platform", "Calibration, sparse features, auction, frequent retraining", "[Worked answer](/learn/design-ad-click-prediction) · [Round](/system-design/ad-click-prediction)"],
      ["Design ads ranking with conversion optimisation", "Delayed labels, multi-task click and conversion models", "[Continual learning](/learn/continual-learning)"],
      ["Design an ad targeting / lookalike audience system", "User embeddings, similarity search, privacy", "[Embeddings](/learn/embeddings)"],
      ["Design an ad click aggregator (data side)", "Streaming counts, deduplication, exactly-once", "[Round](/system-design/ad-click-aggregator)"],
    ] },

    { type: "h2", text: "Integrity, trust and safety" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design real-time payment fraud detection", "Imbalanced and delayed labels, velocity features, cost thresholds", "[Worked answer](/learn/design-fraud-detection-system) · [Round](/system-design/online-fraud-model)"],
      ["Design harmful content detection", "Multimodal multilabel models, review queues, prevalence", "[Worked answer](/learn/design-harmful-content-detection) · [Round](/system-design/content-moderation)"],
      ["Design spam or fake account detection", "Behaviour and graph signals, adversaries", "[Feedback loops](/learn/ml-feedback-loops)"],
      ["Design blurring of faces and plates in street imagery", "Object detection at scale, precision vs recall, batch pipelines", "[Model serving](/learn/model-serving)"],
    ] },

    { type: "h2", text: "Prediction and forecasting" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design ETA prediction for food delivery or rides", "Stage decomposition, quantiles, real-time features", "[Worked answer](/learn/design-eta-prediction) · [Round](/system-design/eta-prediction)"],
      ["Design dynamic (surge) pricing", "Demand and supply forecasting, feedback effects, experiments", "[A/B testing](/learn/ab-testing-experimentation) · [Round](/system-design/dynamic-pricing)"],
      ["Design demand forecasting for inventory", "Time-series features, hierarchy, backtesting", "[Training data](/learn/ml-training-data)"],
      ["Design churn prediction and intervention", "Label definition, uplift vs propensity, actioning", "[Problem framing](/learn/ml-problem-framing)"],
    ] },

    { type: "h2", text: "ML infrastructure and platforms" },
    { type: "table", head: ["Question", "What it tests", "Study / practise"], rows: [
      ["Design a feature store", "Point-in-time joins, online/offline parity, streaming features", "[Guide](/learn/feature-store) · [Round](/system-design/feature-store)"],
      ["Design a distributed training platform", "GPU scheduling, checkpointing, reproducibility", "[Guide](/learn/distributed-training) · [Round](/system-design/training-platform)"],
      ["Design a low-latency model serving platform", "Batching, autoscaling, canaries, multi-model hosting", "[Guide](/learn/model-serving) · [Round](/system-design/model-serving)"],
      ["Design an ML model monitoring system", "Drift, delayed labels, alerting", "[Guide](/learn/ml-model-monitoring) · [Round](/system-design/model-monitoring)"],
      ["Design an ML platform for many teams", "Self-service workflow, registry, governance, cost", "[Guide](/learn/ml-platform-architecture)"],
      ["Design an experimentation platform", "Assignment, metrics pipelines, guardrails", "[Guide](/learn/ab-testing-experimentation) · [Round](/system-design/experimentation-analytics)"],
    ] },

    { type: "h2", text: "Generative AI questions" },
    { type: "p", text: "Questions like \"design ChatGPT\", \"design a RAG chatbot\" or \"design a customer support agent\" are increasingly common, especially for AI engineer roles. They need a different framework; see [generative AI system design interview questions](/learn/genai-system-design-interview-questions) and the [AI engineer roadmap](/learn/ai-engineering-roadmap)." },

    { type: "h2", text: "How to practise these" },
    { type: "ol", items: [
      "Read one worked answer per family, then close it and redraw the architecture from memory.",
      "For a second question in the same family, write only what changes: label, features, metric, serving constraint.",
      "Do timed rounds out loud: 45 minutes, framework steps in order, with someone (or an AI interviewer) asking follow-ups.",
      "After each round, list the questions you couldn't answer and read the matching guide on the [ML roadmap](/learn/machine-learning-system-design-roadmap).",
    ] },
  ],
  related: ["ml-system-design-interview", "machine-learning-system-design-roadmap", "genai-system-design-interview-questions", "system-design-interview-questions", "recommendation-system-design"],
  practice: ["ad-click-prediction", "recommendation-engine", "video-recommendations", "feed-ranking", "search-ranking", "content-moderation", "online-fraud-model", "eta-prediction"],
  reading: [
    { title: "Machine Learning System Design Interview", publisher: "Ali Aminian and Alex Xu, ByteByteGo", url: "https://bytebytego.com/courses/machine-learning-system-design-interview" },
    { title: "Designing Machine Learning Systems", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" },
  ],
};
