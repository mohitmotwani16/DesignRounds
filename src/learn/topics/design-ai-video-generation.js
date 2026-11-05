// Case study: an AI video generator (Seedance style): model architecture, GPU serving, safety and delivery.
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI video generator like ByteDance's Seedance. A user types a prompt, optionally adds reference images, video or audio, and receives a realistic clip of up to about 15 seconds with camera moves, several shots and sound. Video is the most demanding generative workload in production today: a single clip can hold a GPU for many seconds or minutes, so **model design**, **inference optimisation**, **long-job scheduling** and **safety** all decide whether the product can exist at all." },
    { type: "callout", tone: "warning", text: "What's public and what's our design. ByteDance has published detailed technical reports on Seedance's models, data and inference speed-ups, and those facts are cited throughout. It hasn't published its production serving system. The fleet, queues and delivery sections here are a reasoned design for the same kind of product, and their numbers are illustrative." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer (agreed with the interviewer)"], rows: [
      ["Inputs?", "Text, reference images; video and audio references as a later phase"],
      ["Outputs?", "5-15 s clips, up to 1080p at 24 fps, multi-shot, with optional audio"],
      ["Scale?", "1M generations per day; peak ~30 per second"],
      ["Latency?", "Fast tier: about 1-2 minutes; relaxed tier: minutes to hours; drafts: seconds"],
      ["Plans?", "Credits per second of video, more for higher resolution"],
      ["Safety?", "Block abuse, real-person deepfakes and copyright misuse; label all output as AI-made"],
    ] },
    { type: "diagram", kind: "tree", caption: "The system has two halves. A research side produces the model and its speed-ups, and a product side runs it as a reliable, safe service. An interview usually focuses on the second, but knowing the first explains why the second is built the way it is.", root: { label: "AI video product", tone: "accent", children: [
      { label: "Model", tone: "store", children: [{ label: "Data + captions" }, { label: "Diffusion transformer" }, { label: "Distillation" }] },
      { label: "Service", tone: "ok", children: [{ label: "Job scheduling" }, { label: "Delivery" }, { label: "Safety" }] },
    ] } },

    { type: "h2", text: "2. Why video is so expensive" },
    { type: "p", text: "A frame is an image, and a clip has hundreds of them, and they must also agree with each other over time. A flicker that nobody would notice in a still image becomes obvious in motion. Here's the size of the task for a 5-second clip:" },
    { type: "code", code: `Pixels       : 1920 × 1080 × 120 frames ≈ 249M (vs ~1M for one image)
Compression  : Seedance 1.0's VAE shrinks time by 4 and each side by 16,
               storing 48 channels: overall 1/64 of the raw data size
Latent tokens: at 1080p: 31 latent frames × 120 × 68 ≈ 253K tokens
               at 480p : 31 latent frames × 53 × 30 ≈ 49K tokens
Attention    : naive full attention over 49K tokens compares
               49K × 49K ≈ 2.4B pairs, at every layer and every step` },
    { type: "diagram", kind: "bars", caption: "Pixels to process on a log scale. A short 1080p clip has hundreds of times more data than a standard image, and generation cost grows even faster because every frame must stay consistent with the others.", log: true, unit: "M pixels", values: [
      { label: "1 image, 1024 × 1024", value: 1, display: "1M", tone: "ok" },
      { label: "5 s at 480p", value: 49, display: "49M", tone: "cache" },
      { label: "5 s at 1080p", value: 249, display: "249M", tone: "queue" },
      { label: "15 s at 1080p", value: 746, display: "746M", tone: "danger" },
    ] },

    { type: "h2", text: "3. How a video model works" },
    { type: "p", text: "Most leading video models are **latent diffusion transformers**, an extension of [image diffusion](/learn/design-text-to-image-service). A compression network (VAE) turns video into a small latent. A transformer learns to turn noise into a latent, guided by text. Then the VAE decoder turns the result back into pixels. Sora's public report described this as turning video into **spacetime patches** that act as transformer tokens. Wan and Meta's Movie Gen publish similar designs." },
    { type: "diagram", kind: "flow", caption: "The generation pipeline. Text and references are encoded once. The diffusion transformer runs for every step on the latent, which is where nearly all compute goes, and the VAE decoder is the final, heavy step.", nodes: [
      { id: "p", label: "Prompt + refs", col: 0, row: 0, shape: "pill" },
      { id: "e", label: "Text encoder", sub: "runs once", col: 1, row: 0, tone: "store" },
      { id: "n", label: "Noise latent", sub: "T × H × W × C", col: 1, row: 1, tone: "muted" },
      { id: "t", label: "Diffusion transformer", sub: "many steps", col: 2.2, row: 0.5, tone: "accent" },
      { id: "r", label: "Refiner", sub: "480p to 1080p", col: 3.4, row: 0.5, tone: "cache" },
      { id: "v", label: "VAE decoder", sub: "latent to pixels", col: 4.4, row: 0.5, tone: "store" },
    ], edges: [{ from: "p", to: "e" }, { from: "e", to: "t" }, { from: "n", to: "t" }, { from: "t", to: "r" }, { from: "r", to: "v" }] },
    { type: "p", text: "**Decoupling space and time makes it practical.** Comparing every token with every other token is impossible at this size. Seedance 1.0 uses separate layers: spatial layers attend within one frame (and also see the text), and temporal layers attend across frames, using windows. That captures motion at a small fraction of the cost." },
    { type: "diagram", kind: "bars", caption: "Pairs compared per attention pass on a 49K-token latent (31 frames, 1,590 tokens each), on a log scale. Splitting attention into spatial and simple per-position temporal passes cuts the work by about 30×. These are rough counts for intuition, and real windowed temporal layers sit between these.", log: true, unit: "M pairs", values: [
      { label: "Full space-time attention", value: 2430, display: "~2,430M", tone: "danger" },
      { label: "Spatial layers (per frame)", value: 78, display: "~78M", tone: "cache" },
      { label: "Temporal layers (per position)", value: 1.5, display: "~1.5M", tone: "ok" },
    ] },
    { type: "diagram", kind: "tree", caption: "Two kinds of layers in a decoupled block, as Seedance 1.0 describes them. Spatial layers handle what's in a frame and what the prompt asks for. Temporal layers handle how things move, and text doesn't take part.", root: { label: "Transformer block", tone: "accent", children: [
      { label: "Spatial layer", sub: "within one frame", tone: "store", children: [{ label: "Visual tokens" }, { label: "Text tokens" }] },
      { label: "Temporal layer", sub: "across frames", tone: "queue", children: [{ label: "Visual tokens only" }] },
    ] } },
    { type: "p", text: "**Flow matching.** Seedance 1.0 trains with flow matching and velocity prediction: the model learns the direction from noise to data at each point, which tends to allow straighter paths and fewer steps than older diffusion formulations. For an interview, knowing that step count times per-step cost equals your GPU bill is more important than the math." },

    { type: "h2", text: "4. Inside Seedance" },
    { type: "p", text: "The Seedance 1.0 report is one of the most detailed public accounts of a top video model, so it makes a good case study." },
    { type: "table", head: ["Part", "What the report describes", "Why it matters"], rows: [
      ["VAE", "Temporally causal; compresses time 4×, each side 16×; 48 channels", "An image is treated as a one-frame video, and the same model handles both"],
      ["Transformer", "Decoupled spatial and temporal layers; temporal attention uses windows", "Keeps compute manageable"],
      ["Text", "Fine-tuned LLM encoder; joint attention in spatial layers", "Follows detailed prompts"],
      ["Unified tasks", "Noisy input with clean or zero frames concatenated, plus a mask", "One model does text-to-video and image-to-video"],
      ["Multi-shot", "3D positional encoding, with each shot's caption placed in sequence", "Tells a story with consistent subjects"],
      ["Refiner", "Base model at 480p; a diffusion refiner upscales to 720p or 1080p", "Most creative work happens at low cost"],
      ["Feedback", "Reward models for basic quality, motion and aesthetics", "Tunes for what people prefer"],
    ] },
    { type: "diagram", kind: "flow", caption: "The cascade. Composition and motion are decided at a low 480p, where steps are cheap. A refiner then adds detail, using the low-resolution video as a guide. This costs far less than running the whole process at 1080p.", nodes: [
      { id: "a", label: "Prompt", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "Base model", sub: "480p · motion", col: 1, row: 0, tone: "accent" },
      { id: "c", label: "Upsample", sub: "simple resize", col: 2, row: 0, tone: "muted" },
      { id: "d", label: "Refiner", sub: "adds detail", col: 3, row: 0, tone: "cache" },
      { id: "e", label: "VAE decode", col: 4, row: 0, tone: "store" },
      { id: "f", label: "Draft preview", sub: "stop here if unwanted", col: 1, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "b", to: "f", dashed: true }] },
    { type: "p", text: "**Multi-shot generation.** Older models produce one continuous shot, so a story needs several unrelated clips, each with a new character. Seedance 1.0 supports multiple shots natively. Each shot has its own caption, ordered by time, and the positional encoding tells the model which visual tokens belong with which caption." },
    { type: "diagram", kind: "segments", caption: "How a multi-shot prompt maps onto time. Each shot's visual tokens align with its own caption, and they all attend to each other, which keeps the same woman and coat across a cut.", lanes: [
      { label: "Captions", parts: [{ label: "Wide: woman in a red coat", size: 4, tone: "store" }, { label: "Close-up: her face", size: 3, tone: "cache" }, { label: "Wide: train leaves", size: 3, tone: "queue" }] },
      { label: "Frames", parts: [{ label: "Shot 1 · 0-2 s", size: 4, tone: "accent" }, { label: "Shot 2 · 2-3.5 s", size: 3, tone: "accent" }, { label: "Shot 3 · 3.5-5 s", size: 3, tone: "accent" }] },
    ] },
    { type: "p", text: "**One model for many tasks.** Noisy latents are combined channel by channel with conditioning frames and a binary mask. For text-to-video, the conditioning frames are zeros. For image-to-video, the first frame is real. Seedance 1.0 mixes these in training, and raised image-to-video to 40% in continued training." },
    { type: "diagram", kind: "flow", caption: "Unified task input. The same network receives a three-part input, and the mask tells it which frames are given and which it should invent. Only the conditioning and mask differ between tasks.", nodes: [
      { id: "n", label: "Noisy latent", sub: "all frames", col: 0, row: 0, tone: "muted" },
      { id: "c", label: "Conditioning", sub: "real or zero frames", col: 0, row: 1, tone: "store" },
      { id: "m", label: "Binary mask", sub: "given or invent", col: 0, row: 2, tone: "cache" },
      { id: "j", label: "Concatenate", sub: "by channel", col: 1.5, row: 1 },
      { id: "t", label: "Same transformer", col: 2.9, row: 1, tone: "accent" },
    ], edges: [{ from: "n", to: "j" }, { from: "c", to: "j" }, { from: "m", to: "j" }, { from: "j", to: "t" }] },

    { type: "h2", text: "5. Data and training" },
    { type: "p", text: "A video model is largely shaped by its data pipeline. The Seedance 1.0 report describes shot-aware segmentation with a 12-second maximum clip length, removal of overlays like logos and subtitles, quality and safety filtering, semantic deduplication, rebalancing and dense bilingual captions." },
    { type: "diagram", kind: "flow", caption: "The training data pipeline from the Seedance 1.0 report. Each step removes something that would harm the model. The caption model is key, because prompt following can only be learned from detailed, accurate captions.", nodes: [
      { id: "a", label: "Raw video", sub: "multiple sources", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "Shot splitting", sub: "12 s maximum", col: 1, row: 0, tone: "store" },
      { id: "c", label: "Remove overlays", sub: "logos · subtitles", col: 2, row: 0, tone: "cache" },
      { id: "d", label: "Quality + safety", col: 3, row: 0, tone: "danger" },
      { id: "e", label: "Deduplicate", sub: "semantic", col: 3, row: 1, tone: "queue" },
      { id: "f", label: "Rebalance", sub: "topics · styles", col: 2, row: 1, tone: "muted" },
      { id: "g", label: "Dense captions", sub: "two languages", col: 1, row: 1, tone: "accent" },
      { id: "h", label: "Training shards", col: 0, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" }, { from: "f", to: "g" }, { from: "g", to: "h" }] },
    { type: "diagram", kind: "timeline", caption: "Progressive training in the Seedance 1.0 report. It starts cheaply with low resolution, low frame rate and images mixed in. Harder tasks are added as the model improves, and a final step tunes the model on human preferences.", ticks: ["start", "", "", "", "finish"], spans: [
      { from: 0, to: 1.5, label: "256px · 12 fps", tone: "store" },
      { from: 1.5, to: 2.5, label: "640px", tone: "cache" },
      { from: 2.5, to: 3.3, label: "24 fps", tone: "queue" },
      { from: 3.3, to: 4, label: "tuning", tone: "accent" },
    ] },
    { type: "p", text: "**Rights in data** have become a major issue for this whole field, and this is covered in the safety section below. In your design, record where each training clip came from, and keep the ability to remove sources, since a future legal or licensing change may require it." },

    { type: "h2", text: "6. Inference optimisation" },
    { type: "p", text: "Seedance 1.0 reports a 5-second 1080p clip in 41.4 seconds on an NVIDIA L20, which it credits to over 10× end-to-end speedup from multi-stage distillation and system work, with no drop in model performance. The biggest gains come from reducing steps. Every other optimisation multiplies on top of that." },
    { type: "diagram", kind: "bars", caption: "Reported speedups from the Seedance 1.0 report, as multipliers. Fewer steps through distillation and a thinner VAE decoder deliver most of the benefit. Compiler work adds a useful amount, and costs nothing per clip.", unit: "×", values: [
      { label: "Overall (end to end)", value: 10, display: "over 10×", tone: "ok" },
      { label: "Distillation (one method)", value: 4, display: "4×", tone: "accent" },
      { label: "Thin VAE decoder", value: 2, display: "2×", tone: "cache" },
      { label: "Kernel fusion", value: 1.15, display: "1.15×", tone: "store" },
    ] },
    { type: "ul", items: [
      "**Distillation:** train a student model that takes larger, fewer steps; several methods can be stacked to keep quality.",
      "**Thin VAE decoder:** a smaller decoder trained to match the original, which is a 2× speedup with no visible quality loss in their tests.",
      "**Kernel fusion and mixed precision:** run the same math more efficiently on the GPU, with fine-grained low precision where it's safe.",
      "**Multi-GPU parallelism:** split attention across GPUs while cutting communication, plus sending less data with FP8.",
      "**Async offloading:** move models from GPU memory when idle, so large cascades fit, at under a 2% cost.",
    ] },
    { type: "p", text: "**The VAE decoder is a bottleneck you may not expect.** Turning a full latent into 120 frames at 1080p needs a lot of memory at once. Seedance splits this across GPUs by space and time, decoding overlapping tiles and blending them so no seams are visible." },
    { type: "diagram", kind: "flow", caption: "Distributed VAE decoding. The latent is cut into overlapping pieces in space and time, each GPU decodes one piece, and the overlaps are blended, so tile edges don't show as visible seams or flicker.", nodes: [
      { id: "l", label: "Final latent", col: 0, row: 1, tone: "accent" },
      { id: "s", label: "Split", sub: "overlapping tiles", col: 1.2, row: 1 },
      { id: "a", label: "GPU 1", sub: "tile A", col: 2.4, row: 0, tone: "store" },
      { id: "b", label: "GPU 2", sub: "tile B", col: 2.4, row: 1, tone: "store" },
      { id: "c", label: "GPU 3", sub: "tile C", col: 2.4, row: 2, tone: "store" },
      { id: "m", label: "Blend overlaps", col: 3.6, row: 1, tone: "cache" },
      { id: "o", label: "Frames", col: 4.6, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "l", to: "s" }, { from: "s", to: "a" }, { from: "s", to: "b" }, { from: "s", to: "c" }, { from: "a", to: "m" }, { from: "b", to: "m" }, { from: "c", to: "m" }, { from: "m", to: "o" }] },

    { type: "h2", text: "7. Estimates" },
    { type: "code", code: `Jobs        : 1M/day ≈ 12/s average, ~30/s peak
GPU time    : 41.4 GPU-seconds for 5 s at 1080p (Seedance 1.0's figure)
              assume 10 s clips on average → ~83 GPU-seconds per job
Fleet       : 30 jobs/s × 83 s ≈ 2,500 GPUs busy at peak
              × 1.3 headroom ≈ 3,250 GPUs
Cost        : 3,250 × ~$2/hour × 24 ≈ $156K/day ≈ $0.16 per job
Storage     : 10 s at ~10 Mbps = ~12.5 MB; plus smaller versions
              ≈ 20 MB per job → ~20 TB/day
Reads       : most views are of a small popular share, served from a CDN
(illustrative; assumes one GPU per clip and the 1080p time for all jobs)` },
    { type: "diagram", kind: "bars", caption: "Compute per job compared with the text-to-image estimate on this site, on a log scale. Video is around twenty times heavier than an image grid. That's why plans charge per second of output, and why drafts and relaxed tiers exist.", log: true, unit: " GPU-s", values: [
      { label: "Image grid (4 images)", value: 4, display: "~4 GPU-s", tone: "ok" },
      { label: "Video, 5 s at 1080p", value: 41.4, display: "~41 GPU-s", tone: "cache" },
      { label: "Video, 10 s at 1080p", value: 83, display: "~83 GPU-s", tone: "queue" },
      { label: "Video, 15 s at 1080p", value: 124, display: "~124 GPU-s", tone: "danger" },
    ] },

    { type: "callout", tone: "warning", text: "Compute cost can decide whether the product survives. In March 2026, OpenAI announced that it was shutting down the Sora app and API, about six months after the Sora 2 launch. OpenAI didn't give a detailed reason, but several reports linked the decision to the high cost of serving video. Do this estimate early, and check that your pricing covers it." },

    { type: "h2", text: "8. Architecture" },
    { type: "diagram", kind: "flow", caption: "An asynchronous job system. The API validates and estimates cost, a scheduler assigns GPUs by priority, and stages run in order. Every stage checkpoints to object storage, and a finished clip passes safety before it reaches a CDN.", nodes: [
      { id: "c", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "a", label: "API", sub: "credits · idempotency", col: 1, row: 1 },
      { id: "s", label: "Safety in", sub: "prompt · references", col: 1, row: 0, tone: "danger" },
      { id: "q", label: "Priority queues", sub: "fast · relaxed", col: 2, row: 1, shape: "queue", tone: "queue" },
      { id: "z", label: "Scheduler", sub: "GPU-seconds · gangs", col: 3, row: 1, tone: "accent" },
      { id: "g", label: "GPU stages", sub: "base · refine · decode", col: 4, row: 1, tone: "accent" },
      { id: "o", label: "Checkpoints", sub: "latents", col: 4, row: 0, shape: "db", tone: "store" },
      { id: "x", label: "Safety out", sub: "frames · audio", col: 4, row: 2, tone: "danger" },
      { id: "t", label: "Encode + label", sub: "HLS · C2PA", col: 3, row: 2, tone: "cache" },
      { id: "n", label: "CDN + notify", col: 1, row: 2, tone: "ok" },
    ], edges: [
      { from: "c", to: "a" }, { from: "a", to: "s" }, { from: "a", to: "q" }, { from: "q", to: "z" }, { from: "z", to: "g" }, { from: "g", to: "o", both: true }, { from: "g", to: "x" }, { from: "x", to: "t" }, { from: "t", to: "n" }, { from: "n", to: "c", dashed: true },
    ] },
    { type: "p", text: "**A worked example.** Dev wants: *\"A red fox runs through snow at dawn, slow motion, camera tracks alongside.\"* At 10 seconds, 1080p, on the fast tier:" },
    { type: "diagram", kind: "sequence", caption: "A job's journey. The client gets a job id at once and a draft soon after. Credits are reserved at the start and settled at the end, so failed jobs are never charged.", actors: ["Client", "API", "Scheduler", "GPU worker"], steps: [
      { from: 0, to: 1, label: "POST /videos (idempotent)" },
      { from: 1, to: 1, label: "safety · reserve credits" },
      { from: 1, to: 0, label: "202 job_id, estimate ~90 s", dashed: true },
      { from: 1, to: 2, label: "enqueue fast tier" },
      { from: 2, to: 3, label: "assign GPUs" },
      { from: 3, to: 0, label: "draft preview at 480p", dashed: true },
      { note: "refine, then decode", over: [2, 3] },
      { from: 3, to: 1, label: "done; run safety + encode" },
      { from: 1, to: 0, label: "ready: playback URL", tone: "accent" },
    ] },
    { type: "code", code: `video_jobs(job_id, user_id, tier, status, stage, prompt, seed, duration_s,
           resolution, model_version, gpu_seconds_est, gpu_seconds_used,
           checkpoint_path, created_at, finished_at)
video_refs(job_id, kind[image|video|audio], storage_path, safety_status)
videos(video_id, job_id, master_path, hls_path, poster_path,
       provenance_id, visibility)` },

    { type: "h2", text: "9. Scheduling long GPU jobs" },
    { type: "p", text: "A video job holds expensive hardware for a long time, so scheduling decides your costs and your wait times. Treating all jobs as equal doesn't work, because a 15-second 1080p clip costs far more than a 5-second 480p draft." },
    { type: "ul", items: [
      "**Estimate cost in GPU-seconds** from duration, resolution, step count and model. Use that for quotas, pricing and queue ordering.",
      "**Allocate gangs:** multi-GPU stages need all their GPUs at once. Without care, large jobs wait forever while small ones keep filling the gaps, so reserve capacity for them.",
      "**Run stages separately:** a base stage needs different memory than a decode stage, so run them on the pools that best fit.",
      "**Checkpoint between stages:** save the latent after each stage. A GPU failure then costs one stage, not the whole job.",
      "**Use cheap interruptible GPUs for relaxed tiers:** a preempted job restarts from its last checkpoint.",
    ] },
    { type: "diagram", kind: "timeline", caption: "One illustrative 90-second job, split by stage. A checkpoint after each stage means a preempted worker loses little, and a draft after the base stage lets users cancel before paying for the costly steps.", ticks: ["0 s", "20 s", "40 s", "60 s", "80 s", "100 s"], spans: [
      { from: 0, to: 0.5, label: "wait", tone: "muted" },
      { from: 0.5, to: 1.7, label: "base 480p", tone: "accent" },
      { from: 1.7, to: 3.2, label: "refine to 1080p", tone: "cache" },
      { from: 3.2, to: 3.8, label: "decode", tone: "store" },
      { from: 3.8, to: 4.5, label: "safety + HLS", tone: "queue" },
    ], marks: [{ at: 1.7, label: "draft", tone: "ok" }, { at: 3.2, label: "checkpoint", tone: "store" }, { at: 4.5, label: "ready", tone: "ok" }] },
    { type: "diagram", kind: "flow", caption: "Tiers on a shared fleet. Fast jobs use reliable on-demand GPUs. Relaxed jobs fill the spare time and cheap interruptible capacity, resuming from checkpoints if they're preempted. Drafts get a small low-resolution pool so they stay fast.", nodes: [
      { id: "d", label: "Drafts", sub: "seconds · low-res", col: 0, row: 0, shape: "queue", tone: "ok" },
      { id: "f", label: "Fast tier", sub: "paid · ~90 s", col: 0, row: 1, shape: "queue", tone: "accent" },
      { id: "r", label: "Relaxed tier", sub: "credits saved", col: 0, row: 2, shape: "queue", tone: "muted" },
      { id: "s", label: "Scheduler", col: 1.4, row: 1, tone: "accent" },
      { id: "a", label: "Draft pool", col: 2.7, row: 0, tone: "ok" },
      { id: "b", label: "On-demand GPUs", col: 2.7, row: 1, tone: "store" },
      { id: "c", label: "Spot GPUs", sub: "may be preempted", col: 2.7, row: 2, tone: "queue" },
    ], edges: [{ from: "d", to: "s" }, { from: "f", to: "s" }, { from: "r", to: "s" }, { from: "s", to: "a" }, { from: "s", to: "b" }, { from: "s", to: "c" }] },
    { type: "callout", tone: "tip", text: "Drafts are both a product feature and a major cost control. If most people reject a video in the first second of viewing, then spending 10 seconds on a cheap draft avoids spending 80 seconds on an unwanted full render. Track the draft-to-final conversion rate, and adjust your prices with it." },

    { type: "h2", text: "10. Reference inputs and audio" },
    { type: "p", text: "Seedance 2.0, whose technical report came out in April 2026, moves to native audio-video generation from a single unified model. It accepts text, image, audio and video inputs, generates clips of 4-15 seconds at native 480p and 720p, and its open platform takes up to **3 video clips, 9 images and 3 audio clips** as references. A Fast version targets low-latency use." },
    { type: "diagram", kind: "bars", caption: "Reference limits on Seedance 2.0's open platform. Each item is an upload that must be stored, checked and encoded before the job can run, which adds a preparation stage that text-only products don't need.", unit: " files", values: [
      { label: "Images", value: 9, tone: "store" },
      { label: "Video clips", value: 3, tone: "accent" },
      { label: "Audio clips", value: 3, tone: "ok" },
    ] },
    { type: "diagram", kind: "flow", caption: "Preparing references. Files go straight to storage, are checked for safety and rights, and are then normalised and encoded so that the GPU stage only sees compact, ready-made features, and repeat use of a file saves work.", nodes: [
      { id: "u", label: "Upload", sub: "signed URL", col: 0, row: 0, shape: "pill" },
      { id: "c", label: "Scan", sub: "type · size · malware", col: 1, row: 0 },
      { id: "s", label: "Reference safety", sub: "faces · IP · minors", col: 2, row: 0, tone: "danger" },
      { id: "n", label: "Normalise", sub: "fps · size · rate", col: 3, row: 0, tone: "store" },
      { id: "e", label: "Encode features", col: 3, row: 1, tone: "accent" },
      { id: "k", label: "Feature cache", sub: "by content hash", col: 2, row: 1, shape: "db", tone: "cache" },
      { id: "j", label: "Ready for job", col: 1, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "u", to: "c" }, { from: "c", to: "s" }, { from: "s", to: "n" }, { from: "n", to: "e" }, { from: "e", to: "k" }, { from: "k", to: "j" }] },
    { type: "p", text: "**Native audio changes the design.** If a separate step adds sound afterwards, lip movement and footsteps rarely line up. Generating both together helps synchronisation, but it raises the stakes on safety, since a generated person can now say anything. Your output safety check must then cover speech and voice, not just pictures." },

    { type: "h2", text: "11. Encoding and delivery" },
    { type: "p", text: "A finished clip is ordinary video from here on, and standard streaming practice applies. Keep the high-quality master, encode a ladder of versions, and let a CDN serve them. See [CDN](/learn/cdn) and [object storage](/learn/object-storage)." },
    { type: "diagram", kind: "flow", caption: "After generation. Frames are encoded into a master, then a set of smaller versions for streaming. Provenance labels are added before the file ever leaves the system, and a poster image makes the gallery fast.", nodes: [
      { id: "f", label: "Frames + audio", col: 0, row: 0, tone: "accent" },
      { id: "m", label: "Master encode", sub: "H.264 · high bitrate", col: 1, row: 0 },
      { id: "p", label: "Provenance", sub: "C2PA · watermark", col: 2, row: 0, tone: "danger" },
      { id: "h", label: "HLS ladder", sub: "1080 · 720 · 480", col: 3, row: 0, tone: "store" },
      { id: "c", label: "CDN", col: 3, row: 1, tone: "ok" },
      { id: "t", label: "Poster + preview", col: 2, row: 1, tone: "cache" },
    ], edges: [{ from: "f", to: "m" }, { from: "m", to: "p" }, { from: "p", to: "h" }, { from: "h", to: "c" }, { from: "p", to: "t" }, { from: "t", to: "c" }] },
    { type: "diagram", kind: "segments", caption: "Rough storage for one 10-second clip. The master takes the most space. Move masters that are rarely watched to cold storage after a while, because most generated clips are seen only a few times.", lanes: [
      { parts: [{ label: "Master", sub: "12.5 MB", size: 12.5, tone: "danger" }, { label: "1080p", sub: "4 MB", size: 4, tone: "store" }, { label: "720p", sub: "2.5 MB", size: 2.5, tone: "cache" }, { label: "480p", size: 1, tone: "ok" }] },
    ] },

    { type: "h2", text: "12. Safety, likeness and copyright" },
    { type: "p", text: "Realistic video makes abuse much more convincing, so this section matters as much as the GPU fleet. Seedance 2.0 shows what's at stake. After its launch in February 2026, Disney sent ByteDance a cease-and-desist letter claiming use of its characters, the Motion Picture Association publicly objected, and SAG-AFTRA objected to the use of performers' voices and likenesses. ByteDance said it would strengthen its safeguards, and reports said it suspended uploads of images of real people." },
    { type: "diagram", kind: "flow", caption: "Layered safety for video. Prompt and reference checks run first, before any GPU spending. Then output checks look at sampled frames and audio, and provenance marks every result. Reports and audits catch what automation misses.", nodes: [
      { id: "a", label: "Prompt checks", sub: "abuse · public figures", col: 0, row: 0, tone: "danger" },
      { id: "b", label: "Reference checks", sub: "faces · IP · minors", col: 1.1, row: 0, tone: "danger" },
      { id: "c", label: "Generation", col: 2.2, row: 0, tone: "accent" },
      { id: "d", label: "Frame + audio scan", col: 3.3, row: 0, tone: "danger" },
      { id: "e", label: "Provenance", sub: "C2PA · watermark", col: 3.3, row: 1, tone: "store" },
      { id: "f", label: "Share + report", col: 2.2, row: 1, tone: "ok" },
      { id: "g", label: "Human review", col: 1.1, row: 1, tone: "cache" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" }, { from: "f", to: "g" }] },
    { type: "table", head: ["Risk", "Example", "Controls"], rows: [
      ["Real-person deepfakes", "A politician appears to confess", "Block public figures; consent flow for likeness; face match on references"],
      ["Sexual content", "Especially involving minors", "Strict filters on all stages; hash matching; legal reporting duties"],
      ["Copyright", "A famous film character", "Character and logo classifiers; licensing deals; takedown process"],
      ["Voice cloning", "A fake statement in someone's voice", "Audio checks; voice consent, as in the [voice platform](/learn/design-ai-voice-platform)"],
      ["Misinformation", "Fake news footage", "Provenance labels, visible marks, faster review for sensitive events"],
    ] },
    { type: "diagram", kind: "sequence", caption: "A consent-based likeness flow, similar to what OpenAI described for Sora's cameo feature. The person proves their identity with a live recording and a challenge, then controls who can use their likeness, and can revoke it.", actors: ["Person", "Likeness service", "Generator", "Other user"], steps: [
      { from: 0, to: 1, label: "live video + challenge" },
      { from: 1, to: 0, label: "verified; set permissions", dashed: true },
      { from: 3, to: 2, label: "video with this person" },
      { from: 2, to: 1, label: "allowed?" },
      { from: 1, to: 2, label: "yes, within permissions", dashed: true },
      { from: 2, to: 0, label: "notify: used in video", tone: "accent" },
      { from: 0, to: 1, label: "revoke access later", dashed: true },
    ] },
    { type: "p", text: "**Provenance works in layers.** OpenAI's Sora 2 system card described C2PA metadata on all assets, a visible moving watermark on downloads, and internal detection tools to trace content. Each has limits: metadata can be stripped, watermarks can be cropped, and detection isn't perfect. Together, they raise the bar. (OpenAI announced in March 2026 that it was shutting down the Sora app, but this layered approach remains a useful reference.)" },
    { type: "callout", tone: "warning", text: "Scanning a video is itself a cost problem. Sampling frames can miss a brief harmful moment, and scanning every frame is expensive. A common compromise is to sample densely around scene changes, and to raise the sampling rate for riskier accounts and prompts. See [harmful content detection](/learn/design-harmful-content-detection)." },

    { type: "h2", text: "13. Evaluating quality" },
    { type: "p", text: "There's no single score for good video. A clip must follow the prompt, have believable motion, and look appealing. Seedance's reward models target those same dimensions, and it uses expert and public preference tests. External leaderboards such as Artificial Analysis also compare models, though these are snapshots." },
    { type: "diagram", kind: "tree", caption: "Measuring a video model. No single number covers it, so look across these groups and watch for trade-offs, for example when motion improves at the cost of prompt accuracy.", root: { label: "Video quality", tone: "accent", children: [
      { label: "Follows the prompt", sub: "objects · actions", tone: "store" },
      { label: "Motion", sub: "physics · flicker", tone: "queue" },
      { label: "Aesthetics", sub: "keyframes · light", tone: "cache" },
      { label: "Consistency", sub: "subject across shots", tone: "ok" },
    ] } },
    { type: "table", head: ["Metric", "How", "Used for"], rows: [
      ["Prompt adherence", "A vision model or humans check a fixed prompt set", "Release gate"],
      ["Temporal stability", "Flicker and frame-difference measures", "Catch refiner or VAE bugs"],
      ["Human preference", "Blind A/B on sample prompts", "Model choice"],
      ["Regeneration rate", "How often users retry the same prompt", "Online quality signal"],
      ["Download and share rate", "Whether users keep the result", "Online quality signal"],
      ["Cost per kept video", "GPU cost ÷ videos kept", "The real business metric"],
    ] },
    { type: "diagram", kind: "flow", caption: "A release gate for a new model. Fixed prompts catch regressions, a safety suite runs before anything else can ship, and a small live test measures whether people keep more of what's generated.", nodes: [
      { id: "a", label: "Fixed prompts", sub: "~2,000 clips", col: 0, row: 0, tone: "store" },
      { id: "b", label: "Reward + judges", col: 1, row: 0, tone: "cache" },
      { id: "c", label: "Safety suite", sub: "red-team prompts", col: 2, row: 0, tone: "danger" },
      { id: "d", label: "Live test", sub: "kept-video rate", col: 3, row: 0, tone: "queue" },
      { id: "e", label: "Rollout", col: 4, row: 0, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }] },

    { type: "h2", text: "14. Compared with other video models" },
    { type: "p", text: "Published models share most of their design, with different choices in size and scope. Knowing a few of them helps you discuss trade-offs, including when an open model could replace an API." },
    { type: "table", head: ["Model", "Published details", "Worth noting"], rows: [
      ["Seedance 1.0", "1080p; 5 s in 41.4 s on an L20; decoupled layers; cascade", "Detailed report on inference speed-ups"],
      ["Seedance 2.0", "Audio and video; 4-15 s; 480p, 720p; many reference inputs", "Unified multimodal generation"],
      ["Wan", "Open models: 1.3B and 14B parameters; 1.3B fits in 8.19 GB VRAM", "Can be self-hosted on smaller GPUs"],
      ["Movie Gen", "30B-parameter model; 16 s at 16 fps; 1080p; synced audio", "Clear research reference from Meta"],
      ["Sora", "Spacetime patches; latent diffusion transformer", "Few implementation details published"],
    ] },
    { type: "diagram", kind: "bars", caption: "Published parameter counts on a log scale. Larger models usually need more memory and compute per step, while the small Wan model shows how far efficient design can go for consumer GPUs. Parameter counts alone don't decide quality.", log: true, unit: "B params", values: [
      { label: "Wan (small)", value: 1.3, display: "1.3B", tone: "ok" },
      { label: "Wan (large)", value: 14, display: "14B", tone: "cache" },
      { label: "Movie Gen", value: 30, display: "30B", tone: "danger" },
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How would you add longer videos, up to 5 minutes?* Generate shot by shot with a plan, using the last frames or a character reference to stay consistent, then join them. Quality drift and cost are the main issues.",
      "*Would you build your own model or use an API?* Start with an API or open model to test demand. Build only when you have scale, a data advantage and research talent, as training costs are huge.",
      "*A GPU dies during the refine stage. What happens?* The worker's lease expires, and the job resumes from the base checkpoint on a new worker, with no extra credits charged.",
      "*How do you handle a viral surge?* Slow down the relaxed tier first, lower the default resolution for free users, require drafts, and show honest wait times.",
      "*Generated clips show flicker. Where do you start?* Compare the outputs of each stage, as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Debugging a quality issue by stage. Saved latents let you decode each stage separately, so you can see exactly where a defect first appears.", root: { label: "Bad video", tone: "danger", children: [
      { label: "In the draft?", tone: "accent", children: [{ label: "Base model" }, { label: "Too few steps" }] },
      { label: "After refine?", tone: "cache", children: [{ label: "Refiner" }] },
      { label: "After decode?", tone: "store", children: [{ label: "Tile seams" }, { label: "Thin VAE" }] },
      { label: "After encode?", tone: "muted", children: [{ label: "Bitrate" }] },
    ] } },
  ],
  uses: [
    { name: "Creative tools", text: "Prompt-to-video with drafts and credits for creators and short-form video." },
    { name: "Marketing and e-commerce", text: "Product shots and ad variations generated in bulk on relaxed tiers." },
    { name: "Film pre-production", text: "Previews of scenes and camera moves before expensive shoots." },
    { name: "Games and education", text: "Short explainer scenes and concept animation." },
  ],
  interview: [
    "Show why video is expensive: tokens, attention and steps multiply into GPU-seconds.",
    "Explain latent diffusion transformers, decoupled space and time, and the 480p-to-1080p cascade.",
    "Design asynchronous jobs that checkpoint between stages, with drafts, tiers and gang scheduling.",
    "Estimate the fleet from jobs per second and GPU-seconds per job.",
    "Layer safety and provenance, and address likeness and copyright directly.",
  ],
  related: ["design-text-to-image-service", "design-ai-voice-platform", "model-compression", "message-queues", "design-harmful-content-detection", "cdn"],
  practice: ["text-to-image", "task-scheduler", "model-serving", "video-streaming"],
  reading: [
    { title: "Seedance 1.0: Exploring the Boundaries of Video Generation Models", publisher: "Gao et al., ByteDance Seed, 2025", url: "https://arxiv.org/abs/2506.09113" },
    { title: "Seedance 2.0: Advancing Video Generation for World Complexity", publisher: "Team Seedance, ByteDance, 2026", url: "https://arxiv.org/abs/2604.14148" },
    { title: "Wan: Open and Advanced Large-Scale Video Generative Models", publisher: "Wan Team, 2025", url: "https://arxiv.org/abs/2503.20314" },
    { title: "Movie Gen: A Cast of Media Foundation Models", publisher: "Polyak et al., Meta, 2024", url: "https://arxiv.org/abs/2410.13720" },
    { title: "Video generation models as world simulators", publisher: "OpenAI, 2024", url: "https://openai.com/index/video-generation-models-as-world-simulators/" },
    { title: "Sora: A Review on Background, Technology, Limitations, and Opportunities", publisher: "Liu et al., 2024", url: "https://arxiv.org/abs/2402.17177" },
    { title: "Sora 2 System Card", publisher: "OpenAI, 2025", url: "https://cdn.openai.com/pdf/50d5973c-c4ff-4c2d-986f-c72b5d0ff069/sora_2_system_card.pdf" },
    { title: "OpenAI discontinuing Sora AI video app", publisher: "MacRumors, 2026", url: "https://www.macrumors.com/2026/03/24/openai-discontinuing-sora-ai-video-app/" },
    { title: "Disney hits ByteDance with cease-and-desist over Seedance", publisher: "TheWrap, 2026", url: "https://www.thewrap.com/industry-news/public-policy-legal/disney-bytedance-seedance-cease-and-desist/" },
    { title: "C2PA Technical Specification", publisher: "Coalition for Content Provenance and Authenticity", url: "https://c2pa.org/specifications/" },
  ],
};
