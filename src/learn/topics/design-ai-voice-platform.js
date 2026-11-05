// Case study: an AI voice platform (ElevenLabs style): text-to-speech, cloning and safety at scale.
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI voice platform like ElevenLabs. Developers send text and get natural speech back, streamed fast enough for a live conversation or generated carefully for a ten-hour audiobook. Users can clone a voice from a short sample, and the system must stop people from cloning someone else's voice. It's a good interview problem because one product holds real-time streaming, heavy batch jobs, per-voice model data, usage billing and serious abuse risk." },
    { type: "callout", tone: "warning", text: "What's public and what's our design. ElevenLabs publishes its API behaviour, model list, latency figures, regions, plan limits and safety policies, and its job postings describe Kubernetes GPU clusters for inference and training across cloud and on-prem. It hasn't published its internal serving design or model architecture. This page separates those: named figures come from the public documents (checked November 2026; they change often), and the architecture is a reasoned design for the same product, not a description of ElevenLabs' private systems." },

    { type: "h2", text: "1. What the product does" },
    { type: "p", text: "Start by naming the workloads, since they have opposite needs. A voice agent can't wait for half a second, while an audiobook can wait for an hour but must never have an audible seam." },
    { type: "diagram", kind: "tree", caption: "The product surface. Each branch shares speech models, voices and billing, but has its own latency and reliability needs, so each gets its own path through the system.", root: { label: "Voice platform", tone: "accent", children: [
      { label: "Real-time", sub: "~100 ms model time", tone: "danger", children: [{ label: "Agents" }, { label: "Live apps" }] },
      { label: "Long form", sub: "minutes to hours", tone: "store", children: [{ label: "Audiobooks" }, { label: "Dubbing" }] },
      { label: "Voices", sub: "per-user data", tone: "queue", children: [{ label: "Instant clone" }, { label: "Pro clone" }] },
    ] } },
    { type: "table", head: ["Use", "Priority", "Fails if..."], rows: [
      ["Voice agent (live LLM tokens)", "Time to first byte", "The caller hears a pause"],
      ["App narration (a paragraph)", "Speed and quality", "The app feels slow"],
      ["Audiobook (an entire book)", "Quality and consistency", "The voice drifts between chapters"],
      ["Bulk (alerts, phone menus)", "Cost per character", "It costs too much"],
    ] },

    { type: "h2", text: "2. Clarify requirements" },
    { type: "table", head: ["Question", "Answer (agreed with the interviewer)"], rows: [
      ["Core features?", "Text to speech over HTTP and WebSocket; voice library; instant and professional cloning; long-form projects"],
      ["Scale?", "5 billion characters per day from 1M developers and creators"],
      ["Latency?", "Real-time models: first audio byte under ~200 ms in-region; high-quality models may be slower"],
      ["Languages?", "30+ languages, with the same voice across them"],
      ["Limits?", "Plan-based concurrency and character quotas"],
      ["Safety?", "No unauthorised cloning, block prohibited content, trace generated audio to an account"],
    ] },
    { type: "diagram", kind: "bars", caption: "Published median model latencies for ElevenLabs' faster text-to-speech models, excluding network and application time. Real-time models trade a little audio quality for this speed, and the most expressive models don't list a latency at all.", unit: " ms", values: [
      { label: "eleven_v4_turbo", value: 100, display: "~100 ms", tone: "ok" },
      { label: "eleven_flash_v2_5", value: 100, display: "~100 ms", tone: "ok" },
      { label: "eleven_flash_v2", value: 135, display: "~135 ms", tone: "cache" },
      { label: "eleven_v3_conversational", value: 165, display: "~165 ms", tone: "queue" },
    ] },

    { type: "h2", text: "3. Estimates" },
    { type: "p", text: "The natural unit here is the **character**, as that's how the work is requested and billed. A useful rule of thumb comes from the documented limits: 10,000 characters is about 10 minutes of speech, so 1,000 characters is about one minute. The key measurement for a GPU is the **real-time factor** (RTF): how many seconds of audio it produces per second of compute, including batching." },
    { type: "code", code: `Volume       : 5B characters/day ÷ 1,000 chars per minute
               = 5M minutes of audio/day
Audio rate   : 5M ÷ 1,440 ≈ 3,470 minutes of audio per real minute
Model mix    : 70% fast model at ~50× RTF  → 2,430 ÷ 50 ≈ 49 GPUs
               30% quality model at ~10× RTF → 1,040 ÷ 10 ≈ 104 GPUs
Peak         : (49 + 104) × 3 peak factor ≈ 460 GPUs
Fleet        : 460 × 1.3 headroom ≈ 600 GPUs
Starts       : 30 s average clip → 10M clips/day ≈ 115/s, ~350/s peak
Storage      : 128 kbps MP3 ≈ 1 MB per minute
               → ~5 TB/day if all output is retained
Cost check   : 600 GPUs × ~$2/hour × 24 ≈ $29K/day
               ≈ $0.006 per 1,000 characters of compute
(illustrative numbers; ElevenLabs doesn't publish its fleet or RTF)` },
    { type: "diagram", kind: "bars", caption: "GPUs needed at average load, by model. The quality tier is only 30% of the audio yet uses twice the GPUs of the fast tier, which is why it costs more per character and why it gets a separate pool.", unit: " GPUs", values: [
      { label: "Fast model (70% of audio)", value: 49, tone: "ok" },
      { label: "Quality model (30% of audio)", value: 104, tone: "danger" },
    ] },

    { type: "h2", text: "4. How text becomes speech" },
    { type: "p", text: "Modern neural text-to-speech systems follow a broad pattern, even though vendors don't publish details. Text is normalised and encoded. An acoustic model predicts speech features, conditioned on a voice. A vocoder (or a decoder inside an end-to-end model) turns those into a waveform. Published research such as Tacotron 2, FastSpeech 2, VITS and HiFi-GAN is the best way to learn these parts." },
    { type: "diagram", kind: "flow", caption: "A typical neural TTS pipeline. The voice arrives as an embedding or as adapted weights, which is how one model can speak in millions of voices. The model also needs nearby text, because emphasis depends on the rest of the sentence.", nodes: [
      { id: "t", label: "Text", sub: "with nearby context", col: 0, row: 0, shape: "pill" },
      { id: "n", label: "Normaliser", sub: "numbers · dates · lang", col: 1, row: 0 },
      { id: "e", label: "Text encoder", sub: "tokens or phonemes", col: 2, row: 0, tone: "store" },
      { id: "a", label: "Acoustic model", sub: "timing · pitch · tone", col: 3, row: 0, tone: "accent" },
      { id: "v", label: "Voice data", sub: "embedding or weights", col: 3, row: 1, shape: "db", tone: "queue" },
      { id: "d", label: "Vocoder", sub: "features to waveform", col: 4, row: 0, tone: "accent" },
      { id: "o", label: "Audio frames", col: 4, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "t", to: "n" }, { from: "n", to: "e" }, { from: "e", to: "a" }, { from: "v", to: "a" }, { from: "a", to: "d" }, { from: "d", to: "o" }] },
    { type: "p", text: "**Streaming changes the model design.** A model that needs the whole sentence before speaking sounds better, but it can't start early. A low-latency model must commit to audio with limited lookahead. That's the core trade-off between the two model families, and it's why a platform offers both instead of one best model." },
    { type: "table", head: ["Model (public docs)", "Median latency, languages", "Intended for"], rows: [
      ["v4 Turbo", "~100 ms, 90+ languages", "Real-time agents and assistants"],
      ["Flash v2.5", "~100 ms, 32 languages", "Agents and large-scale processing (40,000 characters per request)"],
      ["v3 Conversational", "~165 ms, 70+ languages", "Real-time expressive speech"],
      ["Multilingual v2", "Not listed, 29 languages", "Stable long-form content (10,000 characters)"],
      ["v4", "Not listed, 90+ languages", "Voiceovers, dialogue, audiobooks (10,000 characters)"],
    ] },
    { type: "diagram", kind: "tree", caption: "How a request should pick a model. Latency needs decide first, and then language coverage and expressiveness narrow it down. Bulk jobs go to whatever's cheapest at acceptable quality.", root: { label: "Which model?", tone: "accent", children: [
      { label: "Live conversation?", tone: "danger", edge: "yes", children: [{ label: "Turbo / Flash", tone: "ok" }] },
      { label: "Long content?", tone: "store", edge: "no", children: [{ label: "v4 / Multilingual", tone: "cache" }] },
      { label: "Huge volume?", tone: "queue", edge: "no", children: [{ label: "Flash, batched", tone: "ok" }] },
    ] } },

    { type: "h2", text: "5. Architecture" },
    { type: "diagram", kind: "flow", caption: "The overall design. Edge regions terminate connections and apply limits. A router sends each request to a model pool in the same region, loading voice data from a fast store. Audio streams back, and usage events flow asynchronously to billing.", nodes: [
      { id: "c", label: "Client", sub: "HTTP · WebSocket", col: 0, row: 1, shape: "pill" },
      { id: "e", label: "Edge API", sub: "auth · nearest region", col: 1, row: 1 },
      { id: "l", label: "Limiter", sub: "concurrency · quota", col: 1, row: 0, tone: "danger" },
      { id: "m", label: "Moderation", sub: "text · voice rules", col: 1, row: 2, tone: "danger" },
      { id: "r", label: "Router", sub: "model · voice · tier", col: 2, row: 1, tone: "accent" },
      { id: "f", label: "Real-time pool", sub: "small batches", col: 3, row: 0.4, tone: "ok" },
      { id: "q", label: "Quality pool", col: 3, row: 1.6, tone: "store" },
      { id: "v", label: "Voice store", sub: "embeddings · weights", col: 2, row: 2.2, shape: "db", tone: "queue" },
      { id: "u", label: "Usage events", sub: "billing · audit", col: 4, row: 1, shape: "queue", tone: "cache" },
    ], edges: [
      { from: "c", to: "e", both: true }, { from: "e", to: "l" }, { from: "e", to: "m" }, { from: "e", to: "r", both: true }, { from: "r", to: "f", both: true }, { from: "r", to: "q", both: true }, { from: "v", to: "r" }, { from: "f", to: "u", dashed: true }, { from: "q", to: "u", dashed: true },
    ] },
    { type: "p", text: "**A worked example.** A startup's assistant says *\"Your order ships Friday.\"* using a cloned brand voice on a Flash model:" },
    { type: "diagram", kind: "sequence", caption: "One request through the system. The limiter counts the generation slot only while audio is being produced, and usage is recorded after each chunk rather than in advance.", actors: ["App", "Edge API", "Router", "GPU replica"], steps: [
      { from: 0, to: 1, label: "stream: text, voice_id" },
      { from: 1, to: 1, label: "auth · slot · moderation" },
      { from: 1, to: 2, label: "route (flash, EU)" },
      { from: 2, to: 3, label: "text + voice embedding" },
      { from: 3, to: 1, label: "audio chunk 1 (~100 ms)", dashed: true },
      { from: 1, to: 0, label: "chunk + char timings", tone: "accent" },
      { from: 3, to: 1, label: "more chunks", dashed: true },
      { from: 1, to: 2, label: "release slot · usage event" },
    ] },

    { type: "h2", text: "6. Preparing the text" },
    { type: "p", text: "Text models read literally, so \"$3.5M\" or \"Dr. St. James St.\" can come out wrong. A normaliser turns written forms into words that can be spoken. It depends on language, context and a customer's own rules, which come from a pronunciation dictionary." },
    { type: "table", head: ["Input", "Spoken as", "Rule"], rows: [
      ["$3.5M", "three point five million dollars", "Currency and scale"],
      ["Dr. St. James St.", "Doctor Saint James Street", "Abbreviations depend on position"],
      ["10/11/2026", "October eleventh or the tenth of November", "Depends on locale"],
      ["GIF", "Customer's own choice", "Pronunciation dictionary"],
      ["ERR_4012", "error four zero one two", "Codes read digit by digit"],
    ] },
    { type: "diagram", kind: "flow", caption: "Text preparation before generation. Language detection and rules run on CPUs and take a few milliseconds. Keeping character positions lets the response map audio timing back to the customer's original text, for captions and lip sync.", nodes: [
      { id: "t", label: "Raw text", col: 0, row: 0, shape: "pill" },
      { id: "l", label: "Language", sub: "detect or given", col: 1, row: 0 },
      { id: "n", label: "Normalise", sub: "numbers · units", col: 2, row: 0, tone: "store" },
      { id: "d", label: "Dictionary", sub: "customer rules", col: 3, row: 0, tone: "cache" },
      { id: "o", label: "Model input", col: 4, row: 0, shape: "pill", tone: "ok" },
      { id: "m", label: "Position map", sub: "normal to original", col: 2.5, row: 1, shape: "db", tone: "muted" },
    ], edges: [{ from: "t", to: "l" }, { from: "l", to: "n" }, { from: "n", to: "d" }, { from: "d", to: "o" }, { from: "n", to: "m", dashed: true }] },

    { type: "h2", text: "7. Streaming over WebSockets" },
    { type: "p", text: "When text is available up front, streaming over HTTP is simple. When an LLM is writing the text, you don't have it yet, so the connection must be two-way. ElevenLabs' public WebSocket API shows a clean protocol for this: send an initial message, send text as it arrives, flush at the end, and receive base64 audio along with character timing." },
    { type: "diagram", kind: "sequence", caption: "The WebSocket protocol, based on ElevenLabs' public API. Text is buffered until a threshold or a flush, so the server can generate audio with some context. Alignment data maps characters to time in each returned chunk.", actors: ["LLM client", "TTS WebSocket", "Model"], steps: [
      { from: 0, to: 1, label: "init: settings + space" },
      { from: 0, to: 1, label: "\"Your order \"" },
      { from: 0, to: 1, label: "\"ships Friday. \"" },
      { from: 1, to: 2, label: "generate at threshold" },
      { from: 2, to: 1, label: "audio frames", dashed: true },
      { from: 1, to: 0, label: "audio + alignment", tone: "accent" },
      { from: 0, to: 1, label: "flush: true" },
      { from: 1, to: 0, label: "isFinal: true", dashed: true },
    ] },
    { type: "p", text: "**Buffering is a real trade-off.** Speech sounds better with more context, but waiting for text adds delay. The default `chunk_length_schedule` of `[120, 160, 250, 290]` starts generating after at least 120 characters, then 160 more, and so on. If your LLM only sends 50 characters and stops, generation waits unless you flush, or use `auto_mode`." },
    { type: "diagram", kind: "segments", caption: "The default chunk schedule, in characters. Lower values reduce latency and can reduce quality, so a live agent usually flushes at sentence ends, while a long narration benefits from larger chunks.", lanes: [
      { label: "Default", parts: [{ label: "120", size: 120, tone: "accent" }, { label: "160", size: 160, tone: "store" }, { label: "250", size: 250, tone: "cache" }, { label: "290", size: 290, tone: "queue" }] },
      { label: "Live agent", parts: [{ label: "Sentence", size: 80, tone: "ok" }, { label: "Sentence", size: 90, tone: "ok" }, { label: "Sentence", size: 70, tone: "ok" }, { label: "Sentence", size: 95, tone: "ok" }] },
    ] },
    { type: "diagram", kind: "timeline", caption: "An illustrative timeline for an LLM feeding speech. The first useful phrase sets the time to first audio, and everything after that only needs to stay ahead of playback.", ticks: ["0 ms", "200", "400", "600", "800", "1,000"], spans: [
      { from: 0, to: 2.5, label: "LLM writes first phrase", tone: "accent", lane: 0 },
      { from: 2.5, to: 3.2, label: "TTFB", tone: "ok", lane: 0 },
      { from: 3.2, to: 5, label: "playback starts", tone: "cache", lane: 1 },
      { from: 3.2, to: 4.4, label: "more generated", tone: "store", lane: 2 },
    ], marks: [{ at: 3.2, label: "first audio", tone: "ok" }] },
    { type: "callout", tone: "tip", text: "Audio must be produced faster than it plays. If generation falls behind playback, the listener hears a gap (a buffer underrun). So the key real-time health metric isn't just first-byte time, it's whether each session keeps an audio buffer ahead of the playhead." },

    { type: "h2", text: "8. GPU serving and scheduling" },
    { type: "p", text: "Serving TTS is different from serving an LLM. A request produces a burst of work that lasts seconds, and audio must be stitched in order. Real-time pools run small batches with a tiny batching window. Quality pools run larger batches, or longer jobs. Use one pool per model version, so a rollout doesn't mix models within a session." },
    { type: "diagram", kind: "flow", caption: "Scheduling within a region. Each model has its own pool and a short queue. A micro-batcher groups requests that arrive within a few milliseconds, and autoscaling watches queue depth, since GPU utilisation alone won't show a latency problem.", nodes: [
      { id: "r", label: "Router", col: 0, row: 1, tone: "accent" },
      { id: "q1", label: "Flash queue", sub: "wait < 20 ms", col: 1.2, row: 0, shape: "queue", tone: "ok" },
      { id: "q2", label: "Quality queue", sub: "wait < 1 s", col: 1.2, row: 2, shape: "queue", tone: "store" },
      { id: "b1", label: "Micro-batcher", sub: "small · ~5 ms", col: 2.4, row: 0, tone: "cache" },
      { id: "b2", label: "Batcher", sub: "larger · by length", col: 2.4, row: 2, tone: "cache" },
      { id: "g1", label: "GPU pool A", sub: "model version 7", col: 3.6, row: 0, tone: "accent" },
      { id: "g2", label: "GPU pool B", sub: "model version 3", col: 3.6, row: 2, tone: "accent" },
      { id: "a", label: "Autoscaler", sub: "queue depth", col: 3.6, row: 1, tone: "muted" },
    ], edges: [{ from: "r", to: "q1" }, { from: "r", to: "q2" }, { from: "q1", to: "b1" }, { from: "q2", to: "b2" }, { from: "b1", to: "g1" }, { from: "b2", to: "g2" }, { from: "a", to: "g1", dashed: true }, { from: "a", to: "g2", dashed: true }] },
    { type: "p", text: "**Concurrency limits protect the fleet.** Rate limits per minute suit HTTP, but a generation holds a GPU slot. So plans limit simultaneous generations by model. The public limits show this clearly: heavier models get fewer slots at every plan." },
    { type: "diagram", kind: "bars", caption: "Published concurrency limits per plan for Flash models. Multilingual v2 gets half of these at every level, reflecting its higher compute cost. Enterprise is \"elevated\" by arrangement.", unit: " slots", values: [
      { label: "Free", value: 4, tone: "muted" },
      { label: "Starter", value: 6, tone: "store" },
      { label: "Creator", value: 10, tone: "cache" },
      { label: "Pro", value: 20, tone: "queue" },
      { label: "Scale / Business", value: 30, tone: "accent" },
    ] },
    { type: "p", text: "**Voice data must be fast to load.** An instant clone is probably just a small embedding, which can be fetched in milliseconds and cached in memory. A professional clone involves heavier per-voice data, and ElevenLabs' docs note that PVC voices can be slower than default or instant voices on Flash. A sensible design keeps recent voices warm on replicas, and routes a voice to a replica that has it." },
    { type: "diagram", kind: "flow", caption: "Loading a voice for a request. A small embedding comes from a nearby cache, and larger per-voice weights are routed to a replica that already holds them, avoiding a load on the request path where possible.", nodes: [
      { id: "r", label: "Request", sub: "voice_id", col: 0, row: 0.5, shape: "pill" },
      { id: "t", label: "Voice type?", col: 1.2, row: 0.5, tone: "accent" },
      { id: "e", label: "Embedding cache", sub: "default · instant", col: 2.4, row: 0, shape: "db", tone: "cache" },
      { id: "p", label: "Sticky replica", sub: "professional clone", col: 2.4, row: 1, tone: "queue" },
      { id: "g", label: "Generate", col: 3.6, row: 0.5, tone: "ok" },
    ], edges: [{ from: "r", to: "t" }, { from: "t", to: "e" }, { from: "t", to: "p" }, { from: "e", to: "g" }, { from: "p", to: "g" }] },
    { type: "p", text: "**Regions.** ElevenLabs lists serving from the USA, the Netherlands and Singapore, with expected time to first byte of 100-150 ms in North America, Europe and Southeast Asia, and 150-200 ms in South and Northeast Asia, on Flash over WebSockets. Enterprise customers can get EU and India data-residency environments. Data residency has its own design cost: voices and logs must stay in the region, too." },
    { type: "diagram", kind: "flow", caption: "Global routing. Anycast or DNS sends a client to the nearest healthy region, while a residency customer is pinned to their region and never fails over outside it, even during an outage.", nodes: [
      { id: "a", label: "Delhi user", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "Berlin user", col: 0, row: 1, shape: "pill" },
      { id: "c", label: "EU-pinned user", col: 0, row: 2, shape: "pill", tone: "danger" },
      { id: "g", label: "Global routing", sub: "latency + health", col: 1.5, row: 1, tone: "accent" },
      { id: "s", label: "Singapore", col: 3, row: 0, tone: "store" },
      { id: "n", label: "Netherlands", col: 3, row: 1, tone: "store" },
      { id: "e", label: "EU residency", col: 3, row: 2, tone: "danger" },
    ], edges: [{ from: "a", to: "g" }, { from: "b", to: "g" }, { from: "g", to: "s" }, { from: "g", to: "n" }, { from: "c", to: "e", tone: "danger" }] },

    { type: "h2", text: "9. Long-form generation" },
    { type: "p", text: "An audiobook is too long for a single request. A 10-hour book is about 600,000 characters, while the long-form models accept 10,000 at a time. Splitting it is easy. Making the seams inaudible is the design problem." },
    { type: "diagram", kind: "flow", caption: "A long-form job. The book is split at natural boundaries, each paragraph becomes a retryable task, and the results are joined and levelled. An editor can regenerate one paragraph without paying for the whole book.", nodes: [
      { id: "b", label: "Manuscript", col: 0, row: 0, shape: "pill" },
      { id: "s", label: "Split", sub: "chapter · paragraph", col: 1, row: 0 },
      { id: "t", label: "Paragraph tasks", sub: "with neighbours", col: 2, row: 0, shape: "queue", tone: "queue" },
      { id: "g", label: "Quality pool", sub: "low priority", col: 3, row: 0, tone: "accent" },
      { id: "c", label: "Audio per task", sub: "hash-addressed", col: 3, row: 1, shape: "db", tone: "store" },
      { id: "j", label: "Join + level", sub: "crossfade · loudness", col: 2, row: 1, tone: "cache" },
      { id: "o", label: "Audiobook", col: 1, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "b", to: "s" }, { from: "s", to: "t" }, { from: "t", to: "g" }, { from: "g", to: "c" }, { from: "c", to: "j" }, { from: "j", to: "o" }] },
    { type: "ul", items: [
      "**Conditioning on neighbours:** pass the previous and next text with each paragraph. A model that knows what came before keeps the same tone, instead of restarting its intonation at every paragraph.",
      "**Determinism and caching:** hash text, voice, model version, settings and seed to get an audio key. An unchanged paragraph reuses stored audio when a user edits one line.",
      "**Loudness:** normalise each chapter to an audio target (for example, a target loudness used by audiobook platforms) so listeners don't reach for the volume control.",
      "**Priority:** background jobs run on spare capacity, with a per-account limit so that one publisher's catalogue doesn't delay everyone else.",
      "**Pin the model version** for the whole project. A model upgrade halfway through a book can change the voice, so editors should opt in.",
    ] },
    { type: "diagram", kind: "segments", caption: "Conditioning on neighbours. To generate paragraph 42, the model reads the end of 41 and the start of 43, but only 42 produces audio. That's what makes the seams much harder to hear.", lanes: [
      { label: "Context", parts: [{ label: "end of para 41", size: 3, tone: "muted" }, { label: "para 42", size: 4, tone: "accent" }, { label: "start of para 43", size: 3, tone: "muted" }] },
      { label: "Audio", parts: [{ label: "none", size: 3, tone: "muted" }, { label: "generated", size: 4, tone: "ok" }, { label: "none", size: 3, tone: "muted" }] },
    ] },

    { type: "h2", text: "10. Voice cloning" },
    { type: "p", text: "The public docs describe two methods, which ElevenLabs says work differently at a fundamental level. **Instant Voice Cloning (IVC)** works from about one to three minutes of audio and is ready almost at once. **Professional Voice Cloning (PVC)** trains on much more audio; third-party guides cite at least 30 minutes, with a few hours recommended, and it needs a verification step and several hours to process." },
    { type: "table", head: ["", "Instant clone", "Professional clone"], rows: [
      ["Audio needed", "About 1-3 minutes", "Much more: often 30+ minutes"],
      ["Time to use", "Seconds to minutes", "Hours (a training job)"],
      ["Likely method", "Speaker embedding fed to a general model", "Per-voice training or fine-tuning"],
      ["Accuracy", "Good impression of the voice", "Closer match, including nuance"],
      ["Safety gate", "Rights attestation, moderation", "Voice-based verification"],
      ["Serving cost", "Small; cached embedding", "Larger per-voice data; may be slower"],
    ] },
    { type: "p", text: "A well-known approach to instant cloning comes from research on **speaker verification**: train a network to tell speakers apart, and it learns an embedding that captures how someone sounds. Feed that to a TTS model, and it can speak in a voice it never trained on (the SV2TTS paper showed this in 2018)." },
    { type: "diagram", kind: "flow", caption: "The instant path. Uploaded audio is cleaned and checked, the speaker encoder produces an embedding, and it's saved as a voice. All of this takes seconds, so the voice can be used straight away.", nodes: [
      { id: "u", label: "Upload", sub: "1-3 minutes", col: 0, row: 0, shape: "pill" },
      { id: "c", label: "Clean", sub: "denoise · VAD", col: 1, row: 0 },
      { id: "s", label: "Safety checks", sub: "no-go · rights", col: 2, row: 0, tone: "danger" },
      { id: "e", label: "Speaker encoder", col: 3, row: 0, tone: "accent" },
      { id: "v", label: "Voice store", sub: "owner · embedding", col: 3, row: 1, shape: "db", tone: "queue" },
      { id: "t", label: "Ready for TTS", col: 2, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "u", to: "c" }, { from: "c", to: "s" }, { from: "s", to: "e" }, { from: "e", to: "v" }, { from: "v", to: "t" }] },
    { type: "diagram", kind: "sequence", caption: "The professional path. It's a long asynchronous job, gated by verification. Training is expensive, so it doesn't start until the person has proved it's their voice, and a quality check runs before release.", actors: ["User", "Voice API", "Verification", "Training"], steps: [
      { from: 0, to: 1, label: "upload 30+ minutes" },
      { from: 1, to: 0, label: "read this prompt aloud", dashed: true },
      { from: 0, to: 2, label: "live recording of the prompt" },
      { from: 2, to: 1, label: "same speaker: pass" },
      { from: 1, to: 3, label: "queue training job" },
      { note: "train, then run a quality check", over: [2, 3] },
      { from: 3, to: 0, label: "voice ready (hours)", tone: "accent" },
    ] },
    { type: "code", code: `voices(voice_id, owner_id, kind[instant|professional|library], name,
       language, embedding_ref, weights_ref, status, verification_id,
       created_at)
voice_samples(sample_id, voice_id, storage_path, duration_s,
              quality_score, consent_ref)
voice_shares(voice_id, shared_with, rate_per_1k_chars, revoked_at)` },

    { type: "h2", text: "11. Safety" },
    { type: "p", text: "Cloning creates a specific harm: impersonating real people for fraud, harassment or political deception. Safety is a core design area, and it runs at three stages: before a voice is created, while speech is generated, and after audio is released. ElevenLabs' published controls include technological verification for its professional tool, blocking the cloning of celebrity and other high-risk voices, automated and human moderation, a public AI audio classifier, and support for the C2PA provenance standard." },
    { type: "diagram", kind: "flow", caption: "Controls across the lifecycle. Earlier controls prevent harm cheaply, and later controls exist so that any audio that does get out can be detected and traced back to an account.", nodes: [
      { id: "a", label: "Rights check", col: 0, row: 0, tone: "store" },
      { id: "b", label: "No-go match", sub: "public figures", col: 1, row: 0, tone: "danger" },
      { id: "c", label: "Text moderation", col: 2, row: 0, tone: "danger" },
      { id: "d", label: "Account limits", sub: "tier · history", col: 3, row: 0, tone: "cache" },
      { id: "e", label: "Traceable output", sub: "account log", col: 1, row: 1.5, tone: "accent" },
      { id: "f", label: "Provenance", sub: "C2PA · classifier", col: 2, row: 1.5, tone: "store" },
      { id: "g", label: "Enforcement", sub: "ban · report", col: 3, row: 1.5, tone: "danger" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "f" }, { from: "e", to: "f", both: true }, { from: "f", to: "g" }] },
    { type: "table", head: ["Abuse case", "Example", "Control"], rows: [
      ["Fraud", "Cloned relative's voice asks for money", "Consent checks, voice verification, no-go lists"],
      ["Election deception", "Fake candidate speech", "Blocked public figures, policy classifiers, review"],
      ["Harassment", "Clone of a private person", "Identity checks, reporting, bans"],
      ["Evading filters", "Spelling tricks in text", "Normalise before moderation; review repeat attempts"],
    ] },
    { type: "diagram", kind: "flow", caption: "How a no-go voice check works. A candidate voice is compared with embeddings of protected speakers. A high similarity blocks it, and a borderline score goes to human review, because similar-sounding people do exist.", nodes: [
      { id: "s", label: "New voice sample", col: 0, row: 1, shape: "pill" },
      { id: "e", label: "Speaker encoder", col: 1.2, row: 1, tone: "accent" },
      { id: "d", label: "No-go index", sub: "protected voices", col: 1.2, row: 2, shape: "db", tone: "danger" },
      { id: "c", label: "Similarity", col: 2.4, row: 1 },
      { id: "o", label: "Allow", sub: "low score", col: 3.6, row: 0, tone: "ok" },
      { id: "r", label: "Human review", sub: "borderline", col: 3.6, row: 1, tone: "cache" },
      { id: "b", label: "Block + log", sub: "high score", col: 3.6, row: 2, tone: "danger" },
    ], edges: [{ from: "s", to: "e" }, { from: "e", to: "c" }, { from: "d", to: "c" }, { from: "c", to: "o" }, { from: "c", to: "r" }, { from: "c", to: "b" }] },
    { type: "callout", tone: "warning", text: "Be honest about limits. Voice similarity can be fooled by altered audio, watermarks may not survive re-recording, and a classifier has false positives. Say that layered controls raise the cost of abuse without removing it, and that a human team and a fast takedown process stay necessary." },

    { type: "h2", text: "12. Voice agents on the platform" },
    { type: "p", text: "A voice agent is a major customer of these real-time APIs, and voice platforms increasingly offer it as a product. ElevenLabs' docs list real-time speech recognition (`scribe_v2_realtime`, about 150 ms) and `eleven_realtime_v1` models for agents, alongside its Agents Platform. Turn detection, barge-in and tool calls are covered in depth on the [voice AI agent page](/learn/design-ai-voice-agent)." },
    { type: "diagram", kind: "flow", caption: "A hosted voice agent built on the platform's own parts. Speech recognition and speech synthesis stay on nearby GPUs, the LLM may be the customer's choice, and barge-in cancels generation so unspoken audio isn't billed.", nodes: [
      { id: "c", label: "Caller", col: 0, row: 0.5, shape: "pill" },
      { id: "s", label: "Session worker", sub: "WebRTC · turns", col: 1.1, row: 0.5, tone: "accent" },
      { id: "a", label: "Realtime STT", sub: "~150 ms", col: 2.3, row: 0, tone: "store" },
      { id: "l", label: "LLM", sub: "customer's choice", col: 3.4, row: 0, tone: "cache" },
      { id: "t", label: "Flash TTS", sub: "~100 ms", col: 2.3, row: 1, tone: "ok" },
    ], edges: [{ from: "c", to: "s", both: true }, { from: "s", to: "a" }, { from: "a", to: "l" }, { from: "l", to: "t" }, { from: "t", to: "s" }] },

    { type: "h2", text: "13. Usage, billing and caching" },
    { type: "p", text: "Character billing looks simple, but it has edge cases. If a stream fails halfway, charge only for audio produced. If a user cancels a barge-in, charge for what was generated. Retries with the same request id mustn't charge twice. Treat metering as an event stream with idempotent keys, not a counter updated on the request path. See [idempotency](/learn/idempotency)." },
    { type: "diagram", kind: "flow", caption: "Metering as a pipeline. Workers emit usage events, a stream deduplicates and aggregates them, and invoices are built from durable records. A fast separate counter enforces quotas in near real time, and can be slightly out of date.", nodes: [
      { id: "w", label: "Generation", col: 0, row: 0.5, tone: "accent" },
      { id: "k", label: "Event log", sub: "request id · chars", col: 1.2, row: 0.5, shape: "queue", tone: "queue" },
      { id: "c", label: "Quota counter", sub: "near real time", col: 2.4, row: 0, shape: "db", tone: "cache" },
      { id: "a", label: "Aggregator", sub: "dedupe · by account", col: 2.4, row: 1, tone: "store" },
      { id: "l", label: "Edge limiter", col: 3.6, row: 0, tone: "danger" },
      { id: "i", label: "Invoices", col: 3.6, row: 1, shape: "db", tone: "ok" },
    ], edges: [{ from: "w", to: "k" }, { from: "k", to: "c" }, { from: "k", to: "a" }, { from: "c", to: "l" }, { from: "a", to: "i" }] },
    { type: "p", text: "**Caching audio** pays off for repeated phrases such as \"Please hold\" and app prompts. The key must include everything that changes the sound: normalised text, voice, model version, settings, language and format. Cache only for customers who allow retention, and remember that a voice's owner may later revoke it, so the cache must honour that." },
    { type: "diagram", kind: "bars", caption: "An illustrative example of cache value for an app with a repeated phrase set. A small set of prompts can be a large share of characters, and a hit costs almost nothing compared with a GPU generation.", unit: "%", values: [
      { label: "IVR prompts", value: 70, display: "~70% cacheable", tone: "ok" },
      { label: "App narration", value: 25, display: "~25%", tone: "cache" },
      { label: "Voice agent replies", value: 5, display: "~5%", tone: "danger" },
    ] },

    { type: "h2", text: "14. Quality and operations" },
    { type: "p", text: "Audio quality is hard to score with a formula. Combine automated checks with human listening, and test on the things that break most: numbers, names, unusual languages and long passages." },
    { type: "diagram", kind: "flow", caption: "Shipping a new speech model. Automatic tests catch mispronunciation and clipping, human listening tests compare it with the current model, and latency is checked under real load. Existing projects stay pinned to the old version.", nodes: [
      { id: "a", label: "Offline checks", sub: "ASR round trip · clips", col: 0, row: 0, tone: "store" },
      { id: "b", label: "Listening test", sub: "blind A/B", col: 1, row: 0, tone: "queue" },
      { id: "c", label: "Load test", sub: "TTFB · RTF", col: 2, row: 0, tone: "cache" },
      { id: "d", label: "Opt-in release", sub: "new model id", col: 3, row: 0, tone: "accent" },
      { id: "e", label: "Default later", col: 4, row: 0, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }] },
    { type: "table", head: ["Metric", "Why it matters"], rows: [
      ["Time to first byte, p50/p95, by region", "The main real-time promise"],
      ["Real-time factor per pool", "Capacity and cost per character"],
      ["Buffer underruns per session", "Gaps a listener really hears"],
      ["ASR round-trip accuracy", "Text-to-speech-to-text as a mispronunciation check"],
      ["Clone quality rating and rejects", "Whether cloning matches expectations"],
      ["Moderation blocks and appeal outcomes", "Safety accuracy, including false positives"],
    ] },
    { type: "p", text: "A clever check: run generated speech back through speech recognition and compare it with the original text. A mismatch on \"$3.5M\" flags a normalisation bug, with no human needed. It won't catch poor emotion or tone, which still needs listeners." },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How would you support emotional delivery tags, like [whispers]?* Extend the text encoder to treat tags as control tokens, then evaluate them with listening tests. Moderate tags as well, and strip them from captions.",
      "*A voice owner removes their consent. What happens?* Mark the voice as revoked so that new generations fail, purge caches, delete embeddings and weights, and respect any existing contracts on delivered audio.",
      "*How do you share voices in a marketplace?* Keep the owner's rights and payouts in a separate table, meter usage per voice, and let the owner revoke it. Never expose the sample audio or embedding to the buyer.",
      "*Dubbing into another language?* Transcribe, translate with timing constraints, generate speech in the same voice, and align it to the video. It's a pipeline over this platform.",
      "*Real-time customers report a slow first byte. Where do you look?* Trace it as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Debugging a slow first byte. Most causes aren't in the model. Compare regions and voices first, then look at text buffering on the client, which is the most common self-inflicted delay.", root: { label: "Slow first byte", tone: "danger", children: [
      { label: "Client", tone: "store", children: [{ label: "Chunk schedule" }, { label: "No flush" }] },
      { label: "Route", tone: "cache", children: [{ label: "Far region" }, { label: "New TLS" }] },
      { label: "Server", tone: "accent", children: [{ label: "Queue wait" }, { label: "Cold voice" }] },
    ] } },
  ],
  uses: [
    { name: "Voice agents and assistants", text: "Low-latency speech for conversational products; see [voice AI agent](/learn/design-ai-voice-agent)." },
    { name: "Audiobooks and narration", text: "Long-form generation with consistent voices and per-paragraph editing." },
    { name: "Dubbing and localisation", text: "The same voice across languages, aligned with video timing." },
    { name: "Accessibility", text: "Screen readers and personal voices for people who are losing their speech, with consent controls." },
  ],
  interview: [
    "Separate real-time, long-form and voice-creation paths, and size them in characters and real-time factor.",
    "Explain the latency and context trade-off, and how text buffering affects the first byte.",
    "Serve with per-model pools, micro-batching, plan concurrency limits and warm voice data.",
    "Compare instant and professional cloning, and gate cloning with consent and verification.",
    "Make usage metering idempotent, and layer safety before, during and after generation.",
  ],
  related: ["design-ai-voice-agent", "llm-inference-serving", "real-time-communication", "rate-limiting", "llm-guardrails", "message-queues"],
  practice: ["voice-ai-agent", "model-serving", "rate-limiter", "file-storage"],
  reading: [
    { title: "ElevenLabs models overview", publisher: "ElevenLabs Docs", url: "https://elevenlabs.io/docs/models" },
    { title: "Latency optimization", publisher: "ElevenLabs Docs", url: "https://elevenlabs.io/docs/best-practices/latency-optimization" },
    { title: "Text-to-speech WebSocket API", publisher: "ElevenLabs Docs", url: "https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input" },
    { title: "Voice cloning concepts", publisher: "ElevenLabs Docs", url: "https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning" },
    { title: "Safety", publisher: "ElevenLabs", url: "https://elevenlabs.io/safety" },
    { title: "Natural TTS Synthesis by Conditioning WaveNet on Mel Spectrogram Predictions (Tacotron 2)", publisher: "Shen et al., ICASSP 2018", url: "https://arxiv.org/abs/1712.05884" },
    { title: "FastSpeech 2: Fast and High-Quality End-to-End Text to Speech", publisher: "Ren et al., 2020", url: "https://arxiv.org/abs/2006.04558" },
    { title: "Conditional Variational Autoencoder with Adversarial Learning for End-to-End Text-to-Speech (VITS)", publisher: "Kim et al., ICML 2021", url: "https://arxiv.org/abs/2106.06103" },
    { title: "HiFi-GAN: Generative Adversarial Networks for Efficient and High Fidelity Speech Synthesis", publisher: "Kong et al., NeurIPS 2020", url: "https://arxiv.org/abs/2010.05646" },
    { title: "Transfer Learning from Speaker Verification to Multispeaker Text-To-Speech Synthesis (SV2TTS)", publisher: "Jia et al., NeurIPS 2018", url: "https://arxiv.org/abs/1806.04558" },
  ],
};
