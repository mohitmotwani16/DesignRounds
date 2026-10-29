// Case study: a text-to-image generation service (Midjourney / DALL-E style).
export default {
  blocks: [
    { type: "p", text: "**The question**: design a text-to-image service like Midjourney: users type a prompt and receive several generated images in seconds to a minute; they can upscale, vary or edit them, and browse a gallery. Unlike text LLMs, each request is a **heavy, fixed-cost GPU job** rather than a stream of tokens, so the design centres on **job queues and scheduling**, **GPU efficiency**, **safety on both prompts and images**, and **storage and delivery** of the results." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Features?", "Generate a grid of 4 images from a prompt; upscale, vary, edit; personal gallery and public feed"],
      ["Scale?", "20M generation jobs per day"],
      ["Latency?", "Fast tier: results in ~10-20 s; relaxed tier can wait minutes"],
      ["Plans?", "Paid tiers with GPU-time quotas; priority for faster tiers"],
      ["Safety?", "Block disallowed prompts and images (sexual content involving minors, real-person abuse, etc.)"],
    ] },

    { type: "h2", text: "2. Estimates" },
    { type: "code", code: `Jobs        : 20M/day ≈ 230/s avg, ~600/s peak
GPU time    : say ~4 GPU-seconds per 4-image grid on a modern GPU with an
              optimised diffusion model (illustrative)
Load        : 600 jobs/s × 4 s = 2,400 GPUs busy at peak; plan ~3,000 with headroom
              → GPU cost is the business; batching and step reduction matter
Storage     : 80M images/day × ~1.5 MB (PNG) ≈ 120 TB/day before thumbnails/WebP
Delivery    : images served via CDN; gallery thumbnails are most of the reads` },

    { type: "h2", text: "3. How generation works (briefly)" },
    { type: "p", text: "Diffusion models start from random noise and denoise it over a number of steps, guided by an embedding of the text prompt. **Latent diffusion** runs those steps in a compressed latent space and decodes to pixels at the end, which makes it far cheaper than working on full-resolution pixels. Cost scales with **resolution** and **number of steps**; distilled models that need fewer steps cut GPU time substantially." },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "An asynchronous job pipeline: the API checks the prompt and quota, enqueues a job by priority, GPU workers generate and safety-check images, results go to object storage behind a CDN, and the client is notified.", nodes: [
      { id: "client", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "api", label: "API", sub: "auth · quota", col: 1.2, row: 1 },
      { id: "psafe", label: "Prompt safety", col: 1.2, row: 0, tone: "danger" },
      { id: "q", label: "Job queues", sub: "fast · relaxed", col: 2.45, row: 1, shape: "queue", tone: "queue" },
      { id: "sched", label: "Scheduler", sub: "priority · batching", col: 3.7, row: 1, tone: "accent" },
      { id: "gpu", label: "GPU workers", sub: "diffusion model", col: 4.95, row: 1, tone: "accent" },
      { id: "isafe", label: "Image safety", col: 4.95, row: 2.2, tone: "danger" },
      { id: "s3", label: "Object storage + CDN", col: 3.7, row: 2.2, shape: "db", tone: "store", w: 170 },
      { id: "notify", label: "Notify", sub: "WebSocket / poll", col: 1.2, row: 2.2 },
    ], edges: [
      { from: "client", to: "api" }, { from: "api", to: "psafe" }, { from: "api", to: "q" }, { from: "q", to: "sched" }, { from: "sched", to: "gpu" },
      { from: "gpu", to: "isafe" }, { from: "isafe", to: "s3" }, { from: "s3", to: "notify", dashed: true }, { from: "notify", to: "client", dashed: true },
    ] },

    { type: "h2", text: "5. Queues and scheduling" },
    { type: "ul", items: [
      "Generation is **asynchronous**: the API returns a job id immediately; progress and results arrive over a WebSocket or polling. See [message queues](/learn/message-queues).",
      "Separate queues per tier; the scheduler gives fast-tier jobs priority and lets relaxed jobs use spare capacity, a form of [load shedding](/learn/load-shedding).",
      "**Batching** compatible jobs (same model, resolution and step count) on one GPU improves throughput.",
      "**Quotas** in GPU-seconds per user per period, deducted when a job starts and refunded on failure.",
      "Idempotent job ids so client retries don't create duplicate jobs; see [idempotency](/learn/idempotency).",
    ] },

    { type: "h2", text: "6. GPU fleet" },
    { type: "ul", items: [
      "Workers keep models loaded in GPU memory; loading a multi-gigabyte model takes far longer than a generation, so route jobs to workers that already hold the right model (and LoRA styles) warm.",
      "Autoscale on queue depth and wait time; GPU capacity takes minutes to add, so forecast daily peaks and keep a buffer.",
      "Use cheaper interruptible GPUs for the relaxed queue, with retries on preemption.",
      "Speed-ups: fewer sampling steps with distilled models, lower-precision inference, compiled kernels; see [model compression](/learn/model-compression).",
    ] },

    { type: "h2", text: "7. Safety" },
    { type: "table", head: ["Stage", "Checks"], rows: [
      ["Prompt", "Classifier and blocklists for disallowed content, real people in sexual or abusive contexts, and known jailbreak phrasing; rewrite or refuse"],
      ["Generation", "Safety-tuned model and negative guidance where supported"],
      ["Output image", "Image classifiers for nudity, violence, minors; hash matching against known abuse material; block before storage"],
      ["Provenance", "Embed metadata or watermarks marking images as AI-generated"],
      ["Account", "Rate limits, repeat-offender detection, human review of reported images"],
    ] },
    { type: "p", text: "These are the same per-harm classifier and review-queue ideas as in [harmful content detection](/learn/design-harmful-content-detection) and [LLM guardrails](/learn/llm-guardrails)." },

    { type: "h2", text: "8. Storage and gallery" },
    { type: "ul", items: [
      "Store originals in [object storage](/learn/object-storage) and generate WebP thumbnails; serve through a [CDN](/learn/cdn).",
      "Metadata (prompt, parameters, seed, model version, user, visibility) in a database; the seed and parameters make variations reproducible.",
      "Lifecycle policies move old, rarely viewed originals to cheaper storage tiers.",
      "The public feed is a ranking problem (recency, engagement, quality) built on the metadata; see [recommendation systems](/learn/recommendation-system-design).",
    ] },

    { type: "h2", text: "9. Metrics" },
    { type: "ul", items: [
      "Queue wait and generation time per tier (p50, p95), GPU utilisation, cost per image.",
      "Safety block rates and false positives (appeals), reports per thousand images.",
      "Quality: upscale and download rates as implicit signals; periodic human preference studies when changing models.",
    ] },
  ],
  uses: [
    { name: "Creative tools", text: "Prompt-to-image with variations and edits, quotas by plan and priority queues." },
    { name: "Marketing and e-commerce", text: "Product imagery generated in batch on relaxed queues with brand-style adapters." },
    { name: "Video generation", text: "The same queue and GPU-worker design with much heavier jobs and longer waits." },
  ],
  interview: [
    "Make generation asynchronous with job queues, priorities and quotas in GPU-seconds.",
    "Estimate GPU fleet size from jobs per second and GPU-seconds per job.",
    "Keep models warm and route jobs by model; batch compatible jobs.",
    "Check safety on prompts and on images before storage, and add provenance.",
  ],
  related: ["message-queues", "model-compression", "llm-guardrails", "design-harmful-content-detection", "object-storage", "load-shedding"],
  practice: ["text-to-image", "task-scheduler", "model-serving", "file-storage"],
  reading: [
    { title: "High-Resolution Image Synthesis with Latent Diffusion Models", publisher: "Rombach et al., CVPR 2022", url: "https://arxiv.org/abs/2112.10752" },
    { title: "Classifier-Free Diffusion Guidance", publisher: "Ho and Salimans, 2022", url: "https://arxiv.org/abs/2207.12598" },
  ],
};
