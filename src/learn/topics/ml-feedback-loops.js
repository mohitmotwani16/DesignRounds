export default {
  blocks: [
    { type: "p", text: "Most production models influence the data they're later trained on. A recommender decides what users see, users can only click what they see, and those clicks become tomorrow's training data. This **feedback loop** creates biases (**position bias**, **selection bias**, **popularity bias**) that make a model look better offline than it is and slowly narrow what it recommends. Senior ML design answers name the loop and say how they break it." },

    { type: "h2", text: "How a degenerate feedback loop forms" },
    { type: "diagram", kind: "flow", caption: "A degenerate feedback loop. The model ranks item A first, A gets more clicks because it's first, the next model learns A is great, and A climbs further, regardless of whether it's actually better.", nodes: [
      { id: "model", label: "Model", sub: "ranks items", col: 0, row: 1, tone: "accent" },
      { id: "show", label: "Exposure", sub: "A at top, B hidden", col: 1.5, row: 0 },
      { id: "click", label: "Clicks", sub: "mostly on A", col: 3, row: 1 },
      { id: "data", label: "Training data", sub: "A looks great", col: 1.5, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "model", to: "show" }, { from: "show", to: "click" }, { from: "click", to: "data" }, { from: "data", to: "model", label: "retrain", tone: "danger" },
    ] },
    { type: "p", text: "Symptoms: recommendations get more homogeneous, a few items take a growing share of impressions, new items never break through, and offline metrics keep improving while online metrics stall." },

    { type: "h2", text: "The biases to name" },
    { type: "table", head: ["Bias", "What happens", "Example"], rows: [
      ["Position bias", "Higher positions get more clicks regardless of relevance", "Search result 1 gets many times the clicks of result 5"],
      ["Selection (exposure) bias", "You only observe labels for items the system chose to show", "No data at all on items the model never ranked highly"],
      ["Popularity bias", "Popular items get more exposure, so more data, so higher scores", "The same blockbuster in every user's feed"],
      ["Presentation bias", "Thumbnails, badges and layout change behaviour", "A \"trending\" badge inflates clicks"],
      ["Survivorship bias", "Only completed journeys are logged", "Fraud labels exist only for transactions that were approved"],
    ] },
    { type: "callout", tone: "warning", text: "Fraud has a nasty version of selection bias: if the model blocks a transaction, you never learn whether it was really fraud. Without some exploration, the model can't learn from its own false positives." },

    { type: "h2", text: "Ways to break the loop" },
    { type: "h3", text: "Exploration" },
    { type: "p", text: "Reserve a small share of traffic or slots to show items the model wouldn't have picked: random items, new items, or choices from a [bandit](/learn/multi-armed-bandits). This creates unbiased data and gives new items a chance. Keep it small and safe (policy-compliant content only)." },
    { type: "h3", text: "Position-bias correction" },
    { type: "ul", items: [
      "**Position as a training feature:** include the displayed position in training, and set it to a fixed value (for example position 1) at serving time, so the model learns relevance separately from placement.",
      "**Inverse propensity weighting:** weight each click by 1 / P(examined at that position), estimated from randomisation experiments.",
      "**Randomised slots:** occasionally swap adjacent results to measure how much position alone changes click rates.",
    ] },
    { type: "h3", text: "Holdouts and counterfactual logs" },
    { type: "ul", items: [
      "**Global holdout:** a small group of users who never see the model (or see a simple baseline), so you can measure its true cumulative effect over months.",
      "**Log propensities:** store the probability each item had of being shown, enabling offline evaluation of new policies.",
      "**Approve-and-review samples:** in fraud, let a tiny random sample of high-score transactions through to a reviewer to measure false positives.",
    ] },
    { type: "h3", text: "Diversity and freshness in re-ranking" },
    { type: "p", text: "Re-ranking rules that cap items per creator or topic and boost fresh items reduce homogeneity directly; see [recommendation systems](/learn/recommendation-system-design)." },

    { type: "h2", text: "Fairness checks" },
    { type: "p", text: "Feedback loops can also amplify unfair outcomes: if a group of creators or users gets less exposure early, it generates less data and keeps getting less. Practical checks:" },
    { type: "ul", items: [
      "Report metrics by slice (region, language, new vs established creators), not only the overall average.",
      "Track exposure share over time for groups you care about.",
      "Audit features for protected attributes and close proxies (postcode can proxy for ethnicity).",
      "Set guardrail metrics for the slices in experiments, so a launch can't silently harm one group.",
    ] },

    { type: "h2", text: "Measuring whether the loop is hurting you" },
    { type: "code", code: `Signals to chart weekly
  catalogue coverage   : % of items with ≥1 impression       (falling = narrowing)
  Gini of impressions  : concentration of exposure           (rising = popularity bias)
  new-item reach       : impressions for items < 7 days old  (falling = cold start worse)
  holdout lift         : model group vs global holdout       (the honest effect)
  exploration CTR gap  : CTR of explored vs ranked items     (how much you're missing)` },
  ],
  uses: [
    { name: "Search", text: "Position-bias correction with click models and randomised swaps is standard for training rankers from click logs." },
    { name: "Recommendations", text: "Exploration slots, diversity rules and long-running holdouts keep feeds from collapsing onto a few items." },
    { name: "Fraud and credit", text: "Approved-sample reviews and reject inference estimate outcomes for decisions the model blocked." },
  ],
  interview: [
    "Point out that the model's outputs shape its future training data.",
    "Name position and selection bias and one fix for each.",
    "Propose a small exploration budget and a long-term holdout.",
    "Add slice metrics and exposure tracking as fairness guardrails.",
  ],
  related: ["multi-armed-bandits", "recommendation-system-design", "ml-model-monitoring", "learning-to-rank", "cold-start-problem"],
  practice: ["feed-ranking", "notification-ranking", "online-fraud-model", "recommendation-engine", "news-feed"],
  reading: [
    { title: "Unbiased Learning-to-Rank with Biased Feedback", publisher: "Joachims et al., WSDM 2017", url: "https://arxiv.org/abs/1608.04468" },
    { title: "Hidden Technical Debt in Machine Learning Systems", publisher: "Sculley et al., NeurIPS 2015", url: "https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html" },
  ],
};
