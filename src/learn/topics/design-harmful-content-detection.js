// Case study: harmful content detection and moderation for a social platform.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a system that detects harmful content (hate speech, violence, nudity, spam, scams, self-harm) on a social platform where users upload text, images and video. It must catch most violations before many people see them, avoid removing legitimate posts, route hard cases to human reviewers, and keep up with adversaries who change tactics. It's a common integrity question at social media companies." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Content types?", "Text posts and comments, images, short videos; multiple languages"],
      ["Scale?", "1B new posts per day, ~12K per second average"],
      ["Actions?", "Remove, reduce distribution, add a warning screen, or send to review; per policy"],
      ["Timing?", "Score at upload (before distribution) where possible; re-score when reports or virality arrive"],
      ["Reviewers?", "A few thousand trained reviewers, with capacity of a few million decisions a day"],
      ["Appeals?", "Users can appeal removals; appeal outcomes must be tracked"],
    ] },

    { type: "h2", text: "2. Frame it as an ML problem" },
    { type: "p", text: "**Multilabel classification**: one post can violate several policies. Output a probability per harm category. Each category gets its own thresholds, because the cost of errors differs: a missed child-safety violation is far worse than a missed spam post, while over-removing political speech has its own serious cost." },
    { type: "table", head: ["Harm", "Priority", "Typical operating point"], rows: [
      ["Child safety, terrorism", "Highest", "Very high recall; aggressive auto-action plus hash matching; human review of borderline"],
      ["Violence, self-harm", "High", "High recall; warning screens and resources for some content"],
      ["Hate speech, harassment", "High, context-dependent", "Balanced; heavy use of human review for borderline"],
      ["Spam, scams", "High volume", "High precision for auto-removal; reduce distribution when unsure"],
    ] },

    { type: "h2", text: "3. Architecture" },
    { type: "diagram", kind: "flow", caption: "The moderation pipeline: hash matching catches known content instantly, multimodal classifiers score new content, a policy engine maps scores to actions, and uncertain or high-reach items go to human review. Reviewer and appeal decisions become labels.", nodes: [
      { id: "up", label: "Upload", col: 0, row: 1, shape: "pill" },
      { id: "hash", label: "Hash match", sub: "known bad media", col: 1.25, row: 0.2, tone: "danger" },
      { id: "enc", label: "Encoders", sub: "text · image · video", col: 1.25, row: 1.8, tone: "accent" },
      { id: "fuse", label: "Fusion classifier", sub: "per-harm scores", col: 2.6, row: 1.8, tone: "accent" },
      { id: "pol", label: "Policy engine", sub: "thresholds · actions", col: 3.9, row: 1, tone: "ok" },
      { id: "act", label: "Remove / reduce / allow", col: 5.3, row: 0.2, shape: "pill", w: 170 },
      { id: "rev", label: "Review queues", sub: "by harm · language", col: 5.3, row: 1.8, shape: "queue", tone: "queue" },
      { id: "lab", label: "Labels + appeals", col: 3.9, row: 2.9, shape: "db", tone: "store" },
    ], edges: [
      { from: "up", to: "hash" }, { from: "up", to: "enc" }, { from: "enc", to: "fuse" }, { from: "hash", to: "pol" }, { from: "fuse", to: "pol" },
      { from: "pol", to: "act" }, { from: "pol", to: "rev", label: "uncertain" }, { from: "rev", to: "lab" }, { from: "lab", to: "fuse", dashed: true, label: "retrain" },
    ] },

    { type: "h2", text: "4. Models" },
    { type: "ul", items: [
      "**Hash matching:** perceptual hashes of known violating images and videos match re-uploads even after resizing or cropping. Cheap, precise, first line.",
      "**Unimodal encoders:** a multilingual text encoder, an image encoder, and a video model on sampled frames plus audio transcripts.",
      "**Fusion:** a classifier over concatenated embeddings (and metadata) so a harmless image with a hateful caption is caught.",
      "**Multi-task heads:** one per harm category sharing the encoders; adding a new policy means adding a head and labels, not a new system.",
      "**Account and behaviour signals:** new account, posting rate, prior violations, network of known bad actors; often more robust than content alone against spam.",
      "**Foundation models:** LLMs or vision-language models with a policy prompt can label new harm types quickly and serve as teachers for smaller, cheaper production classifiers; see [model compression](/learn/model-compression).",
    ] },

    { type: "h2", text: "5. Labels" },
    { type: "p", text: "Human labels are central here. Policy teams write guidelines; trained reviewers label; disagreements are adjudicated. Sampling for labelling uses active learning around the thresholds and over-samples rare harms and languages. See [data labeling](/learn/data-labeling)." },
    { type: "callout", tone: "warning", text: "Policies change. When the definition of a harm changes, old labels can become wrong. Version labels with the policy version and retrain from relabelled data." },

    { type: "h2", text: "6. Serving and scale" },
    { type: "code", code: `Uploads        : 1B/day ≈ 12K/s avg, ~30K/s peak
Text           : cheap; every post and comment scored synchronously at upload
Images         : ~400M/day; image encoder on GPU, batched, ~50 ms
Video          : ~50M/day; sample frames + transcribe audio asynchronously;
                 distribution held back or limited until scored
Re-scoring     : when a post gets reports or goes viral (e.g. 10K views/hour),
                 re-score with a heavier model and prioritise review
Review queue   : ~1-2% of uploads flagged → 10-20M/day; only the top ~2M by
                 (severity × p × predicted reach) reach humans; the rest are actioned
                 by thresholds or reduced in distribution` },
    { type: "ul", items: [
      "**Prioritise review by expected harm:** severity × probability × predicted views. A borderline post from an account with millions of followers goes first.",
      "**Reduce distribution** while uncertain, instead of choosing only between removal and full reach.",
      "Reviewer wellbeing: blur graphic media by default, cap exposure per reviewer, rotate queues.",
    ] },

    { type: "h2", text: "7. Evaluation" },
    { type: "table", head: ["Metric", "What it tells you"], rows: [
      ["Precision and recall per harm at the operating threshold", "Quality of automated decisions"],
      ["Prevalence (views of violating content per 10K views), from random sample review", "The user's actual exposure, the north-star metric"],
      ["Proactive rate (share found before any user report)", "How much the system catches on its own"],
      ["Appeal overturn rate", "Over-enforcement signal"],
      ["Slice metrics by language and region", "Whether smaller languages are under-protected"],
    ] },

    { type: "h2", text: "8. Adversaries and monitoring" },
    { type: "ul", items: [
      "Bad actors misspell words, add noise to images and use coded language. Augment training data with these perturbations and refresh labels from recent reports.",
      "Monitor per-harm score distributions, report rates and prevalence weekly; a jump in reports with flat model flags means a new pattern.",
      "Rapid response: analysts can add hashes, keywords or rules in minutes while models are retrained.",
    ] },
  ],
  uses: [
    { name: "Social networks", text: "Multimodal classifiers, hash matching and large review operations measured by prevalence." },
    { name: "Marketplaces", text: "Detecting prohibited items and scam listings with text, image and seller signals." },
    { name: "Generative AI products", text: "The same per-harm classifiers act as [guardrails](/learn/llm-guardrails) on prompts and model outputs." },
  ],
  interview: [
    "Frame it as multilabel with per-harm thresholds set by the cost of errors.",
    "Layer hash matching, multimodal models, account signals and human review.",
    "Prioritise the review queue by severity × probability × reach.",
    "Measure prevalence from random samples, plus appeal overturns and slice metrics.",
  ],
  related: ["data-labeling", "llm-guardrails", "embeddings", "ml-evaluation-metrics", "design-news-feed-ranking"],
  practice: ["content-moderation", "model-monitoring", "news-feed"],
  reading: [
    { title: "A Holistic Approach to Undesired Content Detection in the Real World", publisher: "Markov et al., OpenAI, 2022", url: "https://arxiv.org/abs/2208.03274" },
    { title: "Learning Transferable Visual Models From Natural Language Supervision (CLIP)", publisher: "Radford et al., OpenAI, 2021", url: "https://arxiv.org/abs/2103.00020" },
  ],
};
