export default {
  blocks: [
    { type: "p", text: "Every supervised model needs **labels**: the ground truth it learns to predict. **Data labeling** is how a system gets them, either for free from user behaviour (**natural labels**) or by paying people and programs to produce them (**hand labels**, **weak supervision**, **active learning**, and increasingly **LLM-assisted labeling**). In an ML system design interview, \"where do the labels come from, how good are they, and how fast do they arrive?\" is a question you should answer before you're asked." },

    { type: "h2", text: "Natural labels vs hand labels" },
    { type: "table", head: ["", "Natural labels", "Hand labels"], rows: [
      ["Source", "User behaviour: clicks, purchases, skips, chargebacks", "Annotators, domain experts, crowd workers"],
      ["Cost", "Almost free", "Expensive per label; experts much more so"],
      ["Volume", "Huge", "Limited by budget and throughput"],
      ["Speed", "Seconds (click) to months (chargeback)", "Hours to weeks per batch"],
      ["Noise", "Biased by what was shown; implicit and ambiguous", "Annotator disagreement, guideline drift"],
      ["Typical use", "Ranking, ads, recommendations, ETA", "Content moderation, medical, search relevance, NER"],
    ] },
    { type: "p", text: "Natural labels carry the system's own bias: you only observe outcomes for items you showed. That's a [feedback loop](/learn/ml-feedback-loops) you have to correct for. They also have a **feedback delay**, which is why fraud models train on data that's weeks old." },

    { type: "h2", text: "A human labeling pipeline" },
    { type: "diagram", kind: "flow", caption: "A production labeling pipeline. Items are sampled smartly, labelled by more than one person when it matters, checked against gold questions, and only agreed labels enter training.", nodes: [
      { id: "pool", label: "Unlabelled pool", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "sel", label: "Sampler", sub: "random + uncertain", col: 1.25, row: 1, tone: "accent" },
      { id: "pre", label: "Pre-label", sub: "model or LLM", col: 2.5, row: 0 },
      { id: "q", label: "Task queue", col: 2.5, row: 1, shape: "queue", tone: "queue" },
      { id: "ann", label: "Annotators", sub: "2-3 per item", col: 3.75, row: 1 },
      { id: "qa", label: "QA + adjudication", sub: "gold · agreement", col: 5, row: 1, tone: "ok" },
      { id: "set", label: "Label store", sub: "versioned", col: 5, row: 2.2, shape: "db", tone: "store" },
      { id: "train", label: "Training", col: 3.75, row: 2.2 },
    ], edges: [
      { from: "pool", to: "sel" }, { from: "sel", to: "q" }, { from: "pre", to: "q", dashed: true, label: "suggestion" }, { from: "q", to: "ann" },
      { from: "ann", to: "qa" }, { from: "qa", to: "set" }, { from: "set", to: "train" }, { from: "train", to: "sel", dashed: true, label: "uncertainty" },
    ] },
    { type: "ul", items: [
      "**Guidelines:** a written policy with examples and edge cases. Most label noise is guideline ambiguity, not carelessness.",
      "**Redundancy:** two or three labels per item for hard tasks; measure **inter-annotator agreement** (for example Cohen's kappa) and send disagreements to an expert.",
      "**Gold questions:** items with known answers mixed into the queue to score each annotator and catch drift.",
      "**Tooling:** a task queue with leasing (so two people don't take the same item), autosave, keyboard shortcuts and audit logs, the same [queue](/learn/message-queues) patterns as any work system.",
      "**Privacy:** redact personal data before items reach annotators, and restrict access to sensitive queues.",
    ] },

    { type: "h2", text: "Getting more labels for less" },
    { type: "h3", text: "Active learning" },
    { type: "p", text: "Instead of labelling random items, label the ones the current model is **least sure about** (scores near the decision boundary), or where several models disagree. Each label then teaches the model more. Keep a random slice too, so evaluation data stays unbiased." },
    { type: "h3", text: "Weak supervision" },
    { type: "p", text: "Write many cheap, noisy **labeling functions** (keyword rules, heuristics, existing models, knowledge bases), then combine their votes with a label model that learns how much to trust each. You get large, noisy training sets quickly; a small hand-labelled set still measures quality." },
    { type: "h3", text: "LLM-assisted labeling" },
    { type: "p", text: "A large language model can pre-label text, images or conversations with a rubric, and humans review instead of starting from scratch. Calibrate it first: compare LLM labels to expert labels on a few hundred items per class, keep humans on classes where agreement is low, and re-check whenever the prompt or model changes. The same judging ideas appear in [LLM evaluation](/learn/llm-evaluation)." },
    { type: "h3", text: "Semi-supervised and transfer learning" },
    { type: "p", text: "Pretrained models and [embeddings](/learn/embeddings) need far fewer labels to fine-tune. Pseudo-labelling (training on a model's confident predictions) can stretch a small labelled set further, with the risk of reinforcing its mistakes." },

    { type: "h2", text: "Label quality and drift" },
    { type: "ul", items: [
      "**Measure noise:** re-label a sample periodically; track agreement per class and per annotator group.",
      "**Version labels with the policy:** when the definition of \"harmful\" changes, old labels may no longer be correct.",
      "**Slice audits:** check that labels for minority languages or regions are as accurate as the rest.",
      "**Feedback from production:** appeals, reversed decisions and user reports are high-value labels for retraining.",
    ] },

    { type: "h2", text: "Estimating labeling cost" },
    { type: "code", code: `Goal            : 200K labelled posts for a new harm classifier
Labels per item : 3 (agreement needed)        → 600K judgements
Time per item   : 20 s                        → 600K × 20 s ≈ 3,333 hours
Annotators      : 50 people × 6 productive h/day → 300 h/day
Duration        : 3,333 ÷ 300 ≈ 11 working days
Cut it          : active learning picks 60K items that matter most
                  + LLM pre-labels shorten review to ~8 s/item
                → 60K × 3 × 8 s ≈ 400 hours ≈ 1.5 days` },
    { type: "p", text: "Numbers like these let you argue for active learning or pre-labelling with something more convincing than \"it's cheaper\"." },
  ],
  uses: [
    { name: "Content moderation", text: "Policy experts write guidelines, vendors label at scale, appeals feed back as corrections, and active learning targets new abuse patterns." },
    { name: "Search relevance", text: "Raters grade query-document pairs on a relevance scale; click logs supplement them for scale." },
    { name: "Self-driving and vision", text: "Model pre-labels bounding boxes and humans correct them, with hard examples prioritised by uncertainty." },
  ],
  interview: [
    "Say whether labels are natural or need annotation, and how long they take to arrive.",
    "For hand labels, mention guidelines, redundancy, gold questions and agreement.",
    "Propose active learning or pre-labelling to cut cost, with a random slice for unbiased evaluation.",
    "Explain how labels are versioned when the policy changes.",
  ],
  related: ["ml-training-data", "ml-problem-framing", "design-harmful-content-detection", "llm-evaluation", "ml-feedback-loops"],
  practice: ["model-monitoring", "online-fraud-model"],
  reading: [
    { title: "Snorkel: Rapid Training Data Creation with Weak Supervision", publisher: "Ratner et al., VLDB 2018", url: "https://arxiv.org/abs/1711.10160" },
    { title: "Active Learning Literature Survey", publisher: "Burr Settles, University of Wisconsin", url: "https://burrsettles.com/pub/settles.activelearning.pdf" },
  ],
};
