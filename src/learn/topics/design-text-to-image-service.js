// Case study: a text-to-image generation service (Midjourney / DALL-E style).
export default {
  blocks: [
    { type: "p", text: "**The question**: design a text-to-image service like Midjourney: users type a prompt and receive several generated images in seconds to a minute; they can upscale, vary or edit them, and browse a gallery. Unlike text LLMs, each request is a **heavy, fixed-cost GPU job** rather than a stream of tokens, so the design centres on **job queues and scheduling**, **GPU efficiency**, **safety on both prompts and images**, and **storage and delivery** of the results." },
    { type: "callout", text: "Try it yourself first. Estimate how many GPUs 20M jobs a day needs, then compare. The [text-to-image practice round](/system-design/text-to-image) is the same problem with an AI interviewer. For the even heavier version of this problem, see [design an AI video generator](/learn/design-ai-video-generation)." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Features?", "Generate a grid of 4 images from a prompt; upscale, vary, edit; personal gallery and public feed"],
      ["Scale?", "20M generation jobs per day"],
      ["Latency?", "Fast tier: results in ~10-20 s; relaxed tier can wait minutes"],
      ["Plans?", "Paid tiers with GPU-time quotas; priority for faster tiers"],
      ["Safety?", "Block disallowed prompts and images (sexual content involving minors, real-person abuse, etc.)"],
    ] },
    { type: "diagram", kind: "tree", caption: "The main differences between image generation and a chat LLM. Jobs are predictable and asynchronous, and the output is a large file that's checked and stored, not a stream of text.", root: { label: "Text-to-image", tone: "accent", children: [
      { label: "Job shape", tone: "store", children: [{ label: "Fixed GPU time" }, { label: "Asynchronous" }] },
      { label: "Priority", tone: "queue", children: [{ label: "Fast tier" }, { label: "Relaxed tier" }] },
      { label: "Output", tone: "danger", children: [{ label: "Image safety" }, { label: "Large files" }] },
    ] } },

    { type: "h2", text: "2. Estimates" },
    { type: "code", code: `Jobs        : 20M/day ≈ 230/s avg, ~600/s peak
GPU time    : say ~4 GPU-seconds per 4-image grid on a modern GPU with an
              optimised diffusion model (illustrative)
Load        : 600 jobs/s × 4 s = 2,400 GPUs busy at peak;
              plan ~3,000 with headroom → GPU cost is the business
Cost        : 3,000 GPUs × ~$2/hour × 24 ≈ $144K/day ≈ $0.007 per job
Storage     : 80M images/day × ~1.5 MB (PNG) ≈ 120 TB/day
              before thumbnails and WebP
Delivery    : served via CDN; gallery thumbnails are most of the reads` },
    { type: "diagram", kind: "bars", caption: "How GPU fleet size responds to the two biggest levers. Halving GPU-seconds per job, through fewer steps or a distilled model, saves more than any scheduling trick. Numbers are illustrative at 600 jobs per second.", unit: " GPUs", values: [
      { label: "~8 s per job (full steps)", value: 4800, tone: "danger" },
      { label: "~4 s per job (baseline)", value: 2400, tone: "accent" },
      { label: "~2 s per job (distilled)", value: 1200, tone: "ok" },
    ] },

    { type: "h2", text: "3. How generation works" },
    { type: "p", text: "Diffusion models start from random noise and denoise it over a number of steps, guided by an embedding of the text prompt. **Latent diffusion** runs those steps in a compressed latent space and decodes to pixels at the end, which makes it far cheaper than working on full-resolution pixels. Cost scales with **resolution** and **number of steps**; distilled models that need fewer steps cut GPU time substantially." },
    { type: "diagram", kind: "flow", caption: "The inference pipeline for one image. The text encoder and VAE decoder run once, and the denoiser runs for every step. That loop is where almost all the GPU time goes.", nodes: [
      { id: "p", label: "Prompt", col: 0, row: 0, shape: "pill" },
      { id: "t", label: "Text encoder", sub: "runs once", col: 1, row: 0, tone: "store" },
      { id: "n", label: "Random noise", sub: "from the seed", col: 1, row: 1, tone: "muted" },
      { id: "u", label: "Denoiser", sub: "20-50 steps", col: 2.2, row: 0.5, tone: "accent" },
      { id: "v", label: "VAE decoder", sub: "latent to pixels", col: 3.4, row: 0.5, tone: "store" },
      { id: "i", label: "Image", col: 4.4, row: 0.5, shape: "pill", tone: "ok" },
    ], edges: [{ from: "p", to: "t" }, { from: "t", to: "u" }, { from: "n", to: "u" }, { from: "u", to: "v" }, { from: "v", to: "i" }] },
    { type: "diagram", kind: "segments", caption: "Where the time goes in one base-model run. The SwiftDiffusion paper reports the denoising network takes over 93% of base inference latency, so speed work should focus on steps and the denoiser first.", lanes: [
      { parts: [{ label: "Denoising loop", sub: "over 93%", size: 93, tone: "accent" }, { label: "Others", size: 7, tone: "muted" }] },
    ] },
    { type: "p", text: "**Classifier-free guidance** is why images follow prompts closely, and why they cost more. At each step, the denoiser typically runs twice, once with the prompt and once without, and the result is pushed in the direction the prompt adds. So guidance can roughly double the denoiser's work. **The seed** makes results reproducible: the same seed, prompt, model and settings give the same image, which is how variations work." },
    { type: "diagram", kind: "bars", caption: "Reducing the number of denoiser passes for one image. Distilled models such as SDXL Turbo were trained to work in one to four steps without guidance, which is why they're so much cheaper, sometimes with some loss in quality or flexibility.", unit: " passes", values: [
      { label: "50 steps with guidance", value: 100, tone: "danger" },
      { label: "25 steps with guidance", value: 50, tone: "queue" },
      { label: "8 steps with guidance", value: 16, tone: "cache" },
      { label: "4 steps, distilled", value: 4, tone: "ok" },
    ] },

    { type: "h2", text: "4. Architecture" },
    { type: "diagram", kind: "flow", caption: "An asynchronous job pipeline: the API checks the prompt and quota, enqueues a job by priority, GPU workers generate and safety-check images, results go to object storage behind a CDN, and the client is notified.", nodes: [
      { id: "client", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "api", label: "API", sub: "auth · quota", col: 1, row: 1 },
      { id: "psafe", label: "Prompt safety", col: 1, row: 0, tone: "danger" },
      { id: "q", label: "Job queues", sub: "fast · relaxed", col: 2, row: 1, shape: "queue", tone: "queue" },
      { id: "sched", label: "Scheduler", sub: "priority · warm model", col: 3, row: 1, tone: "accent" },
      { id: "gpu", label: "GPU workers", sub: "diffusion model", col: 4, row: 1, tone: "accent" },
      { id: "isafe", label: "Image safety", col: 4, row: 2, tone: "danger" },
      { id: "s3", label: "Storage + CDN", col: 3, row: 2, shape: "db", tone: "store" },
      { id: "notify", label: "Notify", sub: "WebSocket / poll", col: 1, row: 2 },
    ], edges: [
      { from: "client", to: "api" }, { from: "api", to: "psafe" }, { from: "api", to: "q" }, { from: "q", to: "sched" }, { from: "sched", to: "gpu" },
      { from: "gpu", to: "isafe" }, { from: "isafe", to: "s3" }, { from: "s3", to: "notify", dashed: true }, { from: "notify", to: "client", dashed: true },
    ] },
    { type: "p", text: "**A worked example.** Meera asks for \"a watercolour fox in a snowy forest\" with her paid plan:" },
    { type: "diagram", kind: "sequence", caption: "One generation from request to result. The API answers immediately with a job id, so nothing holds an HTTP connection open during GPU work. The seed is stored, so this result can be reproduced or varied later.", actors: ["Client", "API", "Scheduler", "GPU worker"], steps: [
      { from: 0, to: 1, label: "POST /jobs (idempotent)" },
      { from: 1, to: 1, label: "prompt safety · reserve quota" },
      { from: 1, to: 0, label: "202 job_id", dashed: true },
      { from: 1, to: 2, label: "enqueue (fast tier)" },
      { from: 2, to: 3, label: "assign to a warm worker" },
      { from: 3, to: 0, label: "progress previews (optional)", dashed: true },
      { note: "image safety, then upload", over: [2, 3] },
      { from: 3, to: 0, label: "done: 4 image URLs", tone: "accent" },
    ] },

    { type: "h2", text: "5. Queues and scheduling" },
    { type: "ul", items: [
      "Generation is **asynchronous**: the API returns a job id immediately; progress and results arrive over a WebSocket or polling. See [message queues](/learn/message-queues).",
      "Separate queues per tier; the scheduler gives fast-tier jobs priority and lets relaxed jobs use spare capacity, a form of [load shedding](/learn/load-shedding).",
      "**Quotas** in GPU-seconds per user per period, deducted when a job starts and refunded on failure.",
      "Idempotent job ids so client retries don't create duplicate jobs; see [idempotency](/learn/idempotency).",
    ] },
    { type: "diagram", kind: "flow", caption: "Tiers share one GPU fleet. The fast queue always goes first, the relaxed queue fills the gaps, and a burst of fast jobs simply makes relaxed jobs wait longer. Reserved capacity keeps the relaxed tier from starving entirely.", nodes: [
      { id: "f", label: "Fast queue", sub: "paid · ~15 s target", col: 0, row: 0, shape: "queue", tone: "accent" },
      { id: "r", label: "Relaxed queue", sub: "any spare capacity", col: 0, row: 1, shape: "queue", tone: "muted" },
      { id: "b", label: "Batch queue", sub: "API · overnight", col: 0, row: 2, shape: "queue", tone: "muted" },
      { id: "s", label: "Scheduler", sub: "weighted priority", col: 1.5, row: 1, tone: "accent" },
      { id: "g", label: "GPU pool", sub: "same model family", col: 2.8, row: 1, tone: "store" },
    ], edges: [{ from: "f", to: "s", label: "first" }, { from: "r", to: "s", label: "next" }, { from: "b", to: "s", label: "last" }, { from: "s", to: "g" }] },
    { type: "p", text: "**Should you batch?** Batching compatible jobs (same model, resolution and step count) on one GPU can raise throughput, but the gain is smaller than with LLMs. Diffusion is compute-bound, every step needs the full denoiser for every image, and different sizes or add-ons can't share a batch. Measure before assuming a benefit, and don't let waiting for a batch eat the latency target." },
    { type: "diagram", kind: "timeline", caption: "The trade-off in forming a batch for four jobs arriving close together. Waiting to fill a batch delays the first job, so cap the wait at a small fraction of the latency target and run what you have.", ticks: ["0 s", "1 s", "2 s", "3 s", "4 s", "5 s"], spans: [
      { from: 0, to: 0.5, label: "fill", tone: "cache", lane: 0 },
      { from: 0.5, to: 4.5, label: "one batch of 4", tone: "accent", lane: 0 },
      { from: 0, to: 4, label: "job 1 runs alone", tone: "store", lane: 1 },
    ], marks: [{ at: 0.5, label: "max wait", tone: "danger" }] },

    { type: "h2", text: "6. GPU fleet" },
    { type: "ul", items: [
      "Workers keep models loaded in GPU memory; loading a multi-gigabyte model takes far longer than a generation, so route jobs to workers that already hold the right model warm.",
      "Autoscale on queue depth and wait time; GPU capacity takes minutes to add, so forecast daily peaks and keep a buffer.",
      "Use cheaper interruptible GPUs for the relaxed queue, with retries on preemption.",
      "Speed-ups: fewer sampling steps with distilled models, lower-precision inference, compiled kernels; see [model compression](/learn/model-compression).",
    ] },
    { type: "diagram", kind: "flow", caption: "Routing by what a worker already has in memory. A warm match runs at once, a same-model worker can load a small add-on, and a cold start is the last resort because it takes the longest.", nodes: [
      { id: "j", label: "Job", sub: "model X + style LoRA", col: 0, row: 1, shape: "pill" },
      { id: "s", label: "Scheduler", sub: "knows worker cache", col: 1.3, row: 1, tone: "accent" },
      { id: "a", label: "Model + LoRA loaded", sub: "start now", col: 2.8, row: 0, tone: "ok" },
      { id: "b", label: "Model loaded", sub: "patch LoRA · ~2 s", col: 2.8, row: 1, tone: "cache" },
      { id: "c", label: "Nothing loaded", sub: "cold start · slow", col: 2.8, row: 2, tone: "danger" },
    ], edges: [{ from: "j", to: "s" }, { from: "s", to: "a", label: "best" }, { from: "s", to: "b", label: "ok" }, { from: "s", to: "c", label: "last" }] },
    { type: "p", text: "**Add-ons change the picture.** A **LoRA** is a small file of weight changes that adds a style or character, and a **ControlNet** guides a generation by pose or edges. A study of two production services in the SwiftDiffusion paper found that over 95% of requests used at least one LoRA, and that loading add-ons took 37% of total serving latency. Patching a 384 MiB LoRA took about 2 seconds, and the traces contained thousands of them, so they can't all stay in memory." },
    { type: "diagram", kind: "segments", caption: "Time for one request with add-ons, from the SwiftDiffusion measurements. Keeping everything loaded is impossible with thousands of add-ons, so the paper loads a LoRA asynchronously and patches it in around the eleventh step, where it has barely any effect on quality.", lanes: [
      { label: "Typical", parts: [{ label: "Add-on loading", sub: "37%", size: 37, tone: "danger" }, { label: "Inference", sub: "63%", size: 63, tone: "accent" }] },
    ] },

    { type: "h2", text: "7. Upscale, vary and edit" },
    { type: "p", text: "These features reuse the same pipeline with different inputs. The important design point is to store the **generation recipe** with each image, because a variation depends on the original's seed, prompt and model version." },
    { type: "diagram", kind: "tree", caption: "Follow-up actions on an image. Each creates a new job linked to its parent, so a gallery can show the image's history and the user is charged only for the extra GPU work.", root: { label: "Original image", sub: "seed 481 · model v6", tone: "accent", children: [
      { label: "Upscale", sub: "super-resolution", tone: "store" },
      { label: "Vary", sub: "same prompt, near seed", tone: "cache" },
      { label: "Edit", sub: "mask + inpaint", tone: "queue" },
      { label: "Re-prompt", sub: "image-to-image", tone: "ok" },
    ] } },
    { type: "code", code: `images(image_id, user_id, job_id, parent_image_id, url, width, height,
       visibility, safety_status, created_at)
jobs(job_id, user_id, tier, status, prompt, negative_prompt, seed, steps,
     guidance, model_version, loras_json, gpu_seconds,
     created_at, finished_at)` },

    { type: "h2", text: "8. Safety" },
    { type: "table", head: ["Stage", "Checks"], rows: [
      ["Prompt", "Classifier and blocklists for disallowed content, real people in sexual or abusive contexts, and known jailbreak phrasing; rewrite or refuse"],
      ["Generation", "Safety-tuned model and negative guidance where supported"],
      ["Output image", "Image classifiers for nudity, violence, minors; hash matching against known abuse material; block before storage"],
      ["Provenance", "Embed metadata or watermarks marking images as AI-generated"],
      ["Account", "Rate limits, repeat-offender detection, human review of reported images"],
    ] },
    { type: "diagram", kind: "flow", caption: "Layers of safety, cheapest first. A blocked prompt costs almost nothing, while a blocked image has already used GPU time. Nothing reaches storage or the user until it has passed the output checks.", nodes: [
      { id: "a", label: "Prompt checks", sub: "before any GPU", col: 0, row: 0, tone: "danger" },
      { id: "b", label: "Safety-tuned model", col: 1.1, row: 0, tone: "accent" },
      { id: "c", label: "Image classifiers", sub: "nudity · minors", col: 2.2, row: 0, tone: "danger" },
      { id: "d", label: "Hash match", sub: "known abuse", col: 3.3, row: 0, tone: "danger" },
      { id: "e", label: "Provenance", sub: "C2PA · watermark", col: 4.4, row: 0, tone: "store" },
      { id: "x", label: "Block + report", sub: "and keep evidence", col: 2.75, row: 1, tone: "queue" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "c", to: "x", dashed: true }, { from: "d", to: "x", dashed: true }] },
    { type: "callout", tone: "warning", text: "Child safety has legal duties that vary by country, including reporting. In an interview, say you would involve legal and trust-and-safety teams, match against industry hash lists, and never store blocked material except as the law requires. These are the same per-harm classifier and review-queue ideas as in [harmful content detection](/learn/design-harmful-content-detection) and [LLM guardrails](/learn/llm-guardrails)." },
    { type: "p", text: "**Provenance** answers \"was this generated?\" Content Credentials (the C2PA standard) attach signed metadata to a file. Metadata can be stripped by a screenshot, so many systems also add an invisible watermark in the pixels. Neither is perfect, so state what each one does protect against." },

    { type: "h2", text: "9. Storage and gallery" },
    { type: "ul", items: [
      "Store originals in [object storage](/learn/object-storage) and generate WebP thumbnails; serve through a [CDN](/learn/cdn).",
      "Metadata (prompt, parameters, seed, model version, user, visibility) in a database; the seed and parameters make variations reproducible.",
      "Lifecycle policies move old, rarely viewed originals to cheaper storage tiers.",
      "The public feed is a ranking problem (recency, engagement, quality) built on the metadata; see [recommendation systems](/learn/recommendation-system-design).",
    ] },
    { type: "diagram", kind: "flow", caption: "Storing and serving results. Workers upload originals directly, thumbnails are produced in the background, and the CDN serves most reads, so the metadata database stays small and simple.", nodes: [
      { id: "g", label: "GPU worker", col: 0, row: 0.5, tone: "accent" },
      { id: "o", label: "Object storage", sub: "originals", col: 1.2, row: 0, shape: "db", tone: "store" },
      { id: "m", label: "Metadata DB", sub: "prompt · seed", col: 1.2, row: 1, shape: "db", tone: "store" },
      { id: "t", label: "Thumbnails", sub: "WebP · async", col: 2.4, row: 0, tone: "cache" },
      { id: "c", label: "CDN", col: 3.6, row: 0, tone: "ok" },
      { id: "u", label: "Viewers", col: 3.6, row: 1, shape: "pill" },
      { id: "f", label: "Feed service", col: 2.4, row: 1 },
    ], edges: [{ from: "g", to: "o" }, { from: "g", to: "m" }, { from: "o", to: "t" }, { from: "t", to: "c" }, { from: "c", to: "u" }, { from: "m", to: "f" }, { from: "f", to: "u" }] },
    { type: "diagram", kind: "bars", caption: "Storage per day for 80M images, at illustrative sizes. Lossless originals dominate, so keeping thumbnails and compressed versions for serving and moving originals to colder storage quickly saves most of the bill.", unit: " TB", values: [
      { label: "PNG originals (~1.5 MB)", value: 120, tone: "danger" },
      { label: "WebP full size (~300 KB)", value: 24, tone: "cache" },
      { label: "Thumbnails (~30 KB)", value: 2.4, tone: "ok" },
    ] },

    { type: "h2", text: "10. Metrics" },
    { type: "ul", items: [
      "Queue wait and generation time per tier (p50, p95), GPU utilisation, cost per image.",
      "Safety block rates and false positives (appeals), reports per thousand images.",
      "Quality: upscale and download rates as implicit signals; periodic human preference studies when changing models.",
    ] },
    { type: "diagram", kind: "timeline", caption: "A job's life through the metrics that matter. Wait time is what the scheduler controls, GPU time is what the model controls, and they need separate alerts, or a queueing issue can look like a slow model.", ticks: ["0 s", "5 s", "10 s", "15 s", "20 s"], spans: [
      { from: 0, to: 2, label: "queue wait", tone: "queue" },
      { from: 2, to: 3.3, label: "GPU generate", tone: "accent" },
      { from: 3.3, to: 4, label: "checks + save", tone: "store" },
    ], marks: [{ at: 2, label: "start", tone: "ok" }, { at: 4, label: "notified", tone: "ok" }] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How would you add a new model version?* Load it on a small pool, run human preference tests and safety tests, then shift traffic gradually. Keep the old one available because users want to reproduce earlier images.",
      "*A GPU worker dies mid-job. What happens?* The job's lease expires and it's retried once on another worker. The quota is charged only for a job that succeeds.",
      "*How do you stop users from generating real people?* Combine prompt rules with face matching against protected people, and handle reports quickly. Accept that this is imperfect and needs human review.",
      "*Queue waits are growing. What do you do?* Work through the choices below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Responding to a growing queue. Scale up if the trend is sustained, change the workload if it's short-lived, and be honest with users about wait times in the meantime.", root: { label: "Queue wait growing", tone: "danger", children: [
      { label: "Add GPUs", sub: "minutes to start", tone: "store" },
      { label: "Fewer steps", sub: "lower cost per job", tone: "cache" },
      { label: "Pause relaxed", sub: "protect fast tier", tone: "queue" },
      { label: "Show wait time", sub: "be honest", tone: "ok" },
    ] } },
  ],
  uses: [
    { name: "Creative tools", text: "Prompt-to-image with variations and edits, quotas by plan and priority queues." },
    { name: "Marketing and e-commerce", text: "Product imagery generated in batch on relaxed queues with brand-style adapters." },
    { name: "Video generation", text: "The same queue and GPU-worker design with much heavier jobs and longer waits; see [AI video generation](/learn/design-ai-video-generation)." },
  ],
  interview: [
    "Make generation asynchronous with job queues, priorities and quotas in GPU-seconds.",
    "Estimate GPU fleet size from jobs per second and GPU-seconds per job.",
    "Explain why steps and classifier-free guidance drive cost, and how distilled models reduce it.",
    "Keep models warm, route jobs by what's loaded, and plan for LoRA add-on loading.",
    "Check safety on prompts and on images before storage, and add provenance.",
  ],
  related: ["design-ai-video-generation", "message-queues", "model-compression", "llm-guardrails", "design-harmful-content-detection", "object-storage"],
  practice: ["text-to-image", "task-scheduler", "model-serving", "file-storage"],
  reading: [
    { title: "High-Resolution Image Synthesis with Latent Diffusion Models", publisher: "Rombach et al., CVPR 2022", url: "https://arxiv.org/abs/2112.10752" },
    { title: "Classifier-Free Diffusion Guidance", publisher: "Ho and Salimans, 2022", url: "https://arxiv.org/abs/2207.12598" },
    { title: "SwiftDiffusion: Efficient Diffusion Model Serving with Add-on Modules", publisher: "Li et al., 2024", url: "https://arxiv.org/abs/2407.02031" },
    { title: "Introducing SDXL Turbo: A Real-Time Text-to-Image Generation Model", publisher: "Stability AI, 2023", url: "https://stability.ai/news/stability-ai-sdxl-turbo" },
    { title: "C2PA Technical Specification", publisher: "Coalition for Content Provenance and Authenticity", url: "https://c2pa.org/specifications/" },
  ],
};
