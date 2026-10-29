export default {
  blocks: [
    { type: "p", text: "Choosing a model is one of the first design decisions in an AI product, and the one most often made on vibes. A good choice weighs **quality on your task** (not leaderboard rank), **cost per task**, **latency**, **context length**, **data privacy and residency**, **operational burden** and **lock-in**. The usual answer in production isn't one model but a **portfolio**: a strong model for hard requests, a cheap fast one for easy ones, and a fallback." },

    { type: "h2", text: "Hosted API or open-weight model" },
    { type: "table", head: ["", "Hosted API (closed model)", "Open-weight model, self-hosted"], rows: [
      ["Quality", "Usually the frontier for general reasoning", "Strong and improving; can be fine-tuned freely"],
      ["Time to start", "Minutes", "Days to weeks (GPUs, serving stack, scaling)"],
      ["Cost model", "Per token; no idle cost", "Per GPU-hour; cheap at high, steady utilisation"],
      ["Latency control", "Provider's; varies with their load", "Yours; can co-locate and tune"],
      ["Data control", "Data leaves your network (check retention and region terms)", "Stays in your environment"],
      ["Customisation", "Prompting, some fine-tuning options", "Full fine-tuning, quantization, custom decoding"],
      ["Ops burden", "Low", "High: capacity, upgrades, on-call"],
    ] },
    { type: "p", text: "Many teams start on APIs, then self-host a smaller open model for high-volume, narrow tasks once traffic is steady and the task is well understood. Cloud platforms that host open models sit in between." },

    { type: "h2", text: "Size, speed and cost" },
    { type: "diagram", kind: "bars", caption: "An illustrative model portfolio: relative cost per million tokens for small, medium and large tiers of the same family. Real prices vary by provider; the spread between tiers is commonly an order of magnitude or more.", values: [
      { label: "Small / fast", value: 1, display: "1×", tone: "ok" },
      { label: "Medium", value: 5, display: "≈5×", tone: "store" },
      { label: "Large / frontier", value: 20, display: "≈20×", tone: "danger" },
    ] },
    { type: "ul", items: [
      "Larger models are better at multi-step reasoning, nuanced instructions and rare knowledge; smaller ones are faster and far cheaper.",
      "Most production traffic is easy (classification, extraction, short answers). Routing it to a small model is the biggest cost lever; see [LLM gateway](/learn/llm-gateway).",
      "Reasoning modes that spend extra \"thinking\" tokens raise quality on hard problems at the cost of latency and tokens; enable them per request type.",
    ] },

    { type: "h2", text: "Benchmarks vs your own evals" },
    { type: "p", text: "Public benchmarks measure general ability and are increasingly saturated or leaked into training data. They're a filter, not a decision. Decide with a **task-specific eval set**:" },
    { type: "diagram", kind: "flow", caption: "A model selection process. Shortlist from public information, then decide on your own eval set, with cost and latency measured on real prompts.", nodes: [
      { id: "req", label: "Requirements", sub: "quality · cost · latency · privacy", col: 0, row: 1, tone: "accent", w: 170 },
      { id: "short", label: "Shortlist", sub: "3-5 models", col: 1.5, row: 1 },
      { id: "eval", label: "Your eval set", sub: "200-1,000 cases", col: 2.8, row: 0.3, shape: "db", tone: "store" },
      { id: "run", label: "Run + grade", sub: "quality per slice", col: 2.8, row: 1.7, tone: "accent" },
      { id: "cmp", label: "Compare", sub: "quality vs $ vs p95", col: 4.2, row: 1, tone: "ok" },
      { id: "dec", label: "Portfolio", sub: "primary · cheap · fallback", col: 5.5, row: 1, shape: "pill", w: 170 },
    ], edges: [
      { from: "req", to: "short" }, { from: "short", to: "run" }, { from: "eval", to: "run" }, { from: "run", to: "cmp" }, { from: "cmp", to: "dec" },
    ] },
    { type: "p", text: "Build the eval set from real (or realistic) inputs, including hard and adversarial cases, and grade it as described in [LLM evaluation](/learn/llm-evaluation)." },

    { type: "h2", text: "Other selection criteria" },
    { type: "ul", items: [
      "**Context window:** enough for your largest realistic prompt, with headroom.",
      "**Tool calling and structured output support:** reliability of function calls and JSON schemas varies a lot between models.",
      "**Multimodality:** images, audio, documents as input; image or audio output.",
      "**Languages:** quality in your users' languages, not only English.",
      "**Rate limits and capacity:** tokens per minute you can actually get at peak.",
      "**Compliance:** data retention, training-on-your-data terms, regions, certifications.",
      "**Model lifecycle:** how long a version stays available; deprecations force re-evaluation.",
    ] },

    { type: "h2", text: "Avoiding lock-in" },
    { type: "ul", items: [
      "Call models through one internal interface or [gateway](/learn/llm-gateway), not provider SDKs sprinkled through the code.",
      "Keep prompts and eval sets versioned per model; prompts tuned for one model often need adjustment for another.",
      "Re-run the eval suite on every model upgrade before switching; treat a model change like a code release.",
    ] },
  ],
  uses: [
    { name: "Customer-facing chat", text: "A strong model for complex questions, a fast one for greetings and simple lookups, behind a router." },
    { name: "Bulk extraction", text: "A small model or a fine-tuned open model, run in batch, where cost per document dominates." },
    { name: "Regulated data", text: "Self-hosted open models or region-pinned hosted endpoints with zero data retention." },
  ],
  interview: [
    "Compare hosted and self-hosted options on cost, latency, privacy and ops.",
    "Propose a portfolio with routing rather than one model for everything.",
    "Decide with a task-specific eval set, not leaderboards.",
    "Explain how you'd swap models later without rewriting the app.",
  ],
  related: ["how-llms-work", "llm-gateway", "llm-evaluation", "llm-cost-optimization", "llm-fine-tuning"],
  practice: ["model-serving", "rag-search"],
  reading: [
    { title: "AI Engineering: Building Applications with Foundation Models", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/" },
    { title: "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance", publisher: "Chen et al., Stanford, 2023", url: "https://arxiv.org/abs/2305.05176" },
  ],
};
