export default {
  blocks: [
    { type: "p", text: "There are three main ways to adapt a foundation model to your product: **prompting** (change the instructions), **retrieval-augmented generation** (change the context), and **fine-tuning** (change the weights). A common interview question is \"would you fine-tune or use RAG?\" The short answer: RAG for **knowledge** that's private or changing, fine-tuning for **behaviour** (format, style, a narrow skill) or to make a **smaller model** do a big model's job cheaply, and prompting first for everything." },

    { type: "h2", text: "Choosing the approach" },
    { type: "diagram", kind: "flow", caption: "A decision path for adapting a model. Most products stop at prompting plus RAG; fine-tuning is for behaviour, consistency or cost at volume, after evaluation shows the simpler options fall short.", nodes: [
      { id: "start", label: "Quality gap", col: 0, row: 1, shape: "pill" },
      { id: "p", label: "Better prompt", sub: "instructions · examples", col: 1.3, row: 1, tone: "ok" },
      { id: "q", label: "Missing knowledge?", col: 2.6, row: 0.3 },
      { id: "rag", label: "RAG", sub: "fresh · private · cited", col: 3.9, row: 0.3, tone: "store" },
      { id: "b", label: "Behaviour or cost?", col: 2.6, row: 1.7 },
      { id: "ft", label: "Fine-tune", sub: "format · style · distil", col: 3.9, row: 1.7, tone: "accent" },
      { id: "both", label: "Both", sub: "tuned model + RAG", col: 5.2, row: 1, tone: "muted" },
    ], edges: [
      { from: "start", to: "p" }, { from: "p", to: "q", label: "still failing" }, { from: "p", to: "b" }, { from: "q", to: "rag", label: "yes" }, { from: "b", to: "ft", label: "yes" },
      { from: "rag", to: "both", dashed: true }, { from: "ft", to: "both", dashed: true },
    ] },
    { type: "table", head: ["Need", "Prompting", "RAG", "Fine-tuning"], rows: [
      ["Answer from private or fresh documents", "No", "Yes", "Poor: facts go stale and can't be cited or permission-filtered"],
      ["Consistent output format or tone", "Often", "No", "Yes"],
      ["Narrow skill (classify our tickets, our SQL dialect)", "Sometimes", "Partly", "Yes"],
      ["Cut cost and latency at high volume", "No", "No", "Yes: distil into a smaller model"],
      ["Shorter prompts (drop long examples)", "No", "No", "Yes"],
      ["Time to first version", "Hours", "Days", "Days to weeks, plus data work"],
    ] },

    { type: "h2", text: "Kinds of fine-tuning" },
    { type: "table", head: ["Method", "Training data", "Use"], rows: [
      ["Supervised fine-tuning (SFT)", "Input and ideal output pairs", "Formats, styles, task skills"],
      ["Preference tuning (DPO and RLHF-style methods)", "Pairs of a preferred and a rejected answer", "Tone, helpfulness, following policy"],
      ["Distillation", "A strong model's outputs on your inputs", "Make a small model match a big one on your task"],
      ["Continued pretraining", "Large amounts of raw domain text", "Specialist vocabulary (legal, medical); rarely needed"],
      ["Reinforcement fine-tuning", "Tasks with a verifiable grader (tests pass, answer correct)", "Reasoning-heavy tasks with checkable outcomes"],
    ] },

    { type: "h2", text: "Parameter-efficient fine-tuning: LoRA and QLoRA" },
    { type: "p", text: "Full fine-tuning updates every weight, which needs a lot of GPU memory and produces a full copy of the model per task. **LoRA** freezes the base model and trains small low-rank adapter matrices added to some layers, often well under 1% of the parameters. **QLoRA** does the same on top of a 4-bit quantized base model, cutting memory further." },
    { type: "diagram", kind: "flow", caption: "LoRA serving: one shared base model in GPU memory, with small per-task or per-customer adapters loaded alongside it and selected per request.", nodes: [
      { id: "req", label: "Requests", sub: "tagged by task", col: 0, row: 1, shape: "pill" },
      { id: "srv", label: "Inference server", col: 1.4, row: 1, tone: "accent" },
      { id: "base", label: "Base model", sub: "shared · frozen", col: 2.9, row: 1, shape: "db", tone: "store" },
      { id: "a1", label: "Adapter: support", sub: "~tens of MB", col: 4.3, row: 0 },
      { id: "a2", label: "Adapter: SQL", col: 4.3, row: 1 },
      { id: "a3", label: "Adapter: tenant X", col: 4.3, row: 2 },
    ], edges: [
      { from: "req", to: "srv" }, { from: "srv", to: "base" }, { from: "base", to: "a1", dashed: true }, { from: "base", to: "a2", dashed: true }, { from: "base", to: "a3", dashed: true },
    ] },
    { type: "ul", items: [
      "Adapters are small, so many can be stored and swapped cheaply; serving stacks can batch requests for different adapters on one base model.",
      "Training fits on far fewer GPUs, which makes per-task or even per-customer models feasible.",
      "Quality is usually close to full fine-tuning for format and task adaptation.",
    ] },

    { type: "h2", text: "The fine-tuning pipeline" },
    { type: "ol", items: [
      "**Define the task and eval set first**, with the base model's score as the baseline; see [LLM evaluation](/learn/llm-evaluation).",
      "**Collect data:** production logs (with consent and PII removed), expert-written examples, or a strong model's outputs reviewed by humans. Hundreds to a few thousand high-quality examples often beat many more noisy ones.",
      "**Clean and split:** deduplicate, remove eval items from training (contamination), balance cases.",
      "**Train** (LoRA first), tracking validation loss and eval scores per checkpoint.",
      "**Evaluate** against the baseline on the task **and** on general behaviour and safety, since tuning can erode abilities the task doesn't exercise.",
      "**Deploy** behind the gateway with canary traffic; version the adapter with its data and base model; see [LLMOps](/learn/llmops-observability).",
    ] },

    { type: "h2", text: "Risks and costs" },
    { type: "ul", items: [
      "**Base model upgrades:** an adapter is tied to its base model; a new base means retraining and re-evaluating.",
      "**Forgetting and safety regressions:** narrow tuning can weaken general skills or refusals; test them.",
      "**Data leakage:** a model can memorise training examples; never train on secrets or data users didn't agree to.",
      "**Ownership:** you now own a model lifecycle (data, training, evaluation, serving) instead of only prompts.",
    ] },

    { type: "h2", text: "A worked cost argument for distillation" },
    { type: "code", code: `Task        : classify 20M support messages/month into 40 intents
Large model : ~600 tokens/message (prompt with examples) → 12B tokens/month
Fine-tuned small model : ~120 tokens (no examples needed) on a self-hosted GPU
Result      : eval accuracy 94% (large) vs 93% (tuned small) on the golden set;
              cost and latency down by an order of magnitude → ship the small model,
              route low-confidence cases to the large model` },
  ],
  uses: [
    { name: "High-volume classification and extraction", text: "Distilled small models replace large-model calls, with the large model as a fallback." },
    { name: "Brand voice and formats", text: "SFT for a consistent writing style or output structure that prompting couldn't hold." },
    { name: "Multi-tenant products", text: "Per-customer LoRA adapters served on one shared base model." },
  ],
  interview: [
    "Use RAG for knowledge and fine-tuning for behaviour or cost, after trying prompts.",
    "Explain LoRA and why adapters make serving many variants cheap.",
    "Start with an eval set and baseline; check for regressions outside the task.",
    "Note the lifecycle cost: data, retraining on base model upgrades, versioning.",
  ],
  related: ["retrieval-augmented-generation", "prompt-engineering", "model-compression", "llm-evaluation", "choosing-an-llm", "data-labeling"],
  practice: ["training-platform", "model-serving"],
  reading: [
    { title: "LoRA: Low-Rank Adaptation of Large Language Models", publisher: "Hu et al., 2021", url: "https://arxiv.org/abs/2106.09685" },
    { title: "QLoRA: Efficient Finetuning of Quantized LLMs", publisher: "Dettmers et al., 2023", url: "https://arxiv.org/abs/2305.14314" },
    { title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model", publisher: "Rafailov et al., 2023", url: "https://arxiv.org/abs/2305.18290" },
  ],
};
