const vp = { x: 0, y: 0, zoom: 0.85 };
const n = (id, x, y, kind, label) => ({
  id,
  type: "systemNode",
  position: { x, y },
  data: { kind, label },
});
const e = (id, source, target, label) => (label ? { id, source, target, label } : { id, source, target });

export const INCIDENTS = {
  "ad-click-prediction": {
    "deep.calibration": {
      slug: "calibration-drift-after-downsample",
      title: "Advertiser spend diverges from realized CTR after training downsampling",
      symptoms:
        "Finance reports a 3× gap between predicted click volume and billed clicks for several large advertisers. Reliability charts show average pCTR at 0.9% while observed CTR is 0.28% on the same placements.",
      interviewerSetup:
        "Training keeps one-in-ten negatives for cost but serving exports raw logits without inverse sampling correction or a fresh isotonic layer. Auction uses uncorrected probabilities as true CTR.",
      opener:
        "Rankings look fine but finance says our probabilities are wrong and advertisers are overcharged. The scoring and evaluation path is highlighted—what broke and how do you fix it?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-feed", 40, 120, "user", "Feed requests"),
          n("n-serve", 260, 120, "model-serving", "CTR scorer"),
          n("n-cal", 260, 280, "evaluation", "Calibration layer"),
          n("n-train", 480, 280, "training", "Offline trainer"),
          n("n-log", 480, 120, "stream", "Impression log"),
        ],
        edges: [
          e("e1", "n-feed", "n-serve", "Score ads"),
          e("e2", "n-serve", "n-cal", "Raw logits"),
          e("e3", "n-cal", "n-feed", "pCTR to auction"),
          e("e4", "n-log", "n-train", "Sampled negatives"),
          e("e5", "n-train", "n-serve", "Deploy weights"),
        ],
      },
      incident: {
        nodeIds: ["n-serve", "n-cal"],
        edgeIds: ["e2", "e3"],
        headline: "Missing downsampling correction and stale calibration makes served probabilities systematically high",
      },
      referenceFix:
        "Apply the negative downsampling correction to logits before calibration, refit isotonic or Platt on recent holdout by segment, monitor predicted-vs-observed ratio per placement, and block deploys when calibration error exceeds SLO.",
    },
    "deep.features": {
      slug: "embedding-hotshard-oom",
      title: "Scoring latency spikes when hot ad ids saturate one embedding shard",
      symptoms:
        "Ad request p99 jumped from 45 ms to 220 ms during a major campaign launch. One parameter-server shard pegged CPU at 100% while others sat idle; feature store timeouts rose 15×.",
      interviewerSetup:
        "Sparse ad and user ids hash to embedding shards without virtual nodes. A blockbuster campaign concentrated millions of impressions on a handful of ad ids mapped to shard 2.",
      opener:
        "Latency blew up during a big campaign launch—the feature lookup and embedding path is highlighted. What's happening and how would you fix it?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-req", 40, 140, "api-gateway", "Ad request"),
          n("n-fs", 240, 140, "feature-store", "Feature service"),
          n("n-ps1", 460, 60, "database", "Embedding shard A"),
          n("n-ps2", 460, 180, "database", "Embedding shard B"),
          n("n-ctr", 460, 300, "stream", "CTR counters"),
        ],
        edges: [
          e("e1", "n-req", "n-fs", "Bulk feature fetch"),
          e("e2", "n-fs", "n-ps1", "Embedding lookup"),
          e("e3", "n-fs", "n-ps2", "Hot ad ids"),
          e("e4", "n-fs", "n-ctr", "Smoothed CTR stats"),
        ],
      },
      incident: {
        nodeIds: ["n-fs", "n-ps2"],
        edgeIds: ["e3"],
        headline: "Skewed id hashing creates a hot embedding shard under viral ads",
      },
      referenceFix:
        "Re-shard with consistent hashing and many virtual nodes, replicate mega-hot embeddings locally in the scorer, add smoothed CTR priors from the stream, and cache top-N ad vectors with proactive refresh.",
    },
    "deep.freshness": {
      slug: "stale-model-after-trend",
      title: "Model misses sudden CTR shift after viral creative",
      symptoms:
        "Revenue per mille dropped 18% for 36 hours after a meme creative went viral. Offline AUC still looks healthy but live calibration error doubled and under-delivery alerts fired for new creatives.",
      interviewerSetup:
        "Production serves a daily snapshot while training retrains weekly with cold start. Incremental updates were disabled after a bad deploy last quarter.",
      opener:
        "The registry still serves yesterday's weights while traffic behavior changed overnight—what would you change in the training and serving loop?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-log", 60, 120, "stream", "Click stream"),
          n("n-train", 280, 120, "training", "Trainer"),
          n("n-reg", 280, 260, "model-registry", "Model registry"),
          n("n-serve", 500, 120, "model-serving", "Live scorer"),
        ],
        edges: [
          e("e1", "n-log", "n-train", "Hourly examples"),
          e("e2", "n-train", "n-reg", "Publish snapshot"),
          e("e3", "n-reg", "n-serve", "Load weights"),
          e("e4", "n-log", "n-serve", "Logging only"),
        ],
      },
      incident: {
        nodeIds: ["n-reg", "n-serve"],
        edgeIds: ["e3"],
        headline: "Stale daily snapshot cannot track abrupt CTR regime change",
      },
      referenceFix:
        "Enable warm-start incremental training on recent windows, canary new snapshots against live traffic, auto-rollback on calibration drift, and shorten the promotion cadence with shadow scoring.",
    },
    "deep.coldstart": {
      slug: "new-campaign-zero-delivery",
      title: "Brand-new campaigns get almost no impressions",
      symptoms:
        "Launch day reports show new campaigns stuck below 200 impressions despite high budgets. Auction simulators show their ads ranked last because pCTR estimates sit near zero.",
      interviewerSetup:
        "The model uses raw historical CTR features with no hierarchical priors. Fresh ad ids have zero clicks so embeddings and counters collapse scores.",
      opener:
        "New advertisers say the system never spends their budget—the scoring features for cold ads are highlighted. Why, and how do you fix delivery fairness?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ad", 80, 140, "client", "New campaign"),
          n("n-fs", 280, 140, "feature-store", "Feature builder"),
          n("n-emb", 480, 80, "embedding", "Ad embeddings"),
          n("n-serve", 480, 200, "model-serving", "Scorer"),
          n("n-auc", 680, 140, "service", "Auction"),
        ],
        edges: [
          e("e1", "n-ad", "n-fs", "Register creative"),
          e("e2", "n-fs", "n-emb", "Cold id lookup"),
          e("e3", "n-fs", "n-serve", "Sparse features"),
          e("e4", "n-serve", "n-auc", "pCTR bid"),
        ],
      },
      incident: {
        nodeIds: ["n-fs", "n-emb"],
        edgeIds: ["e2", "e3"],
        headline: "Zero-history ads get extreme low scores without smoothing or exploration",
      },
      referenceFix:
        "Add hierarchical priors by advertiser and category, smoothed CTR counters, creative-content embeddings for cold start, and controlled exploration slots with capped regret.",
    },
    "deep.latency": {
      slug: "sequential-feature-budget-blow",
      title: "Sequential feature fetches blow the 80 ms scoring budget",
      symptoms:
        "Feed ad load p99 exceeded 120 ms after enabling richer cross features. Traces show dozens of serial RPCs to the feature store before GPU batch inference even starts.",
      interviewerSetup:
        "The scorer calls user, ad, and cross features one after another per candidate batch instead of a single bulk fetch or two-stage pruning.",
      opener:
        "We have only 80 ms end-to-end but the highlighted path shows serial feature RPCs—how would you restructure scoring to fit the budget?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-feed", 40, 120, "mobile", "Mobile feed"),
          n("n-rank", 220, 120, "app-server", "Ranking service"),
          n("n-fs", 420, 120, "feature-store", "Feature store"),
          n("n-gpu", 620, 120, "gpu", "GPU batch scorer"),
          n("n-cache", 420, 260, "cache", "Hot feature cache"),
        ],
        edges: [
          e("e1", "n-feed", "n-rank", "Ad candidates"),
          e("e2", "n-rank", "n-fs", "Serial RPCs"),
          e("e3", "n-fs", "n-cache", "Per-id lookups"),
          e("e4", "n-rank", "n-gpu", "Batch infer"),
        ],
      },
      incident: {
        nodeIds: ["n-rank", "n-fs"],
        edgeIds: ["e2", "e3"],
        headline: "Serial feature RPCs dominate latency before lightweight pruning or batching",
      },
      referenceFix:
        "Collapse feature reads into one bulk request, add a lightweight first-stage model on cheap features, colocate hot embeddings in-process, and batch GPU inference with strict per-stage timeouts.",
    },
  },
  "code-assistant": {
    "deep.latency": {
      slug: "ttft-spike-after-context-growth",
      title: "Time-to-first-token spikes when repository context grows",
      symptoms:
        "IDE completions jumped from 800 ms to 6 s p95 after enabling whole-repo retrieval. GPU utilization is low while the context assembly service pegs CPU and queues depth hit 4,000.",
      interviewerSetup:
        "The gateway embeds every open file plus top-k chunks from a vector index synchronously before each model call, with no prompt cache or tiered context.",
      opener:
        "Developers complain the assistant froze—the highlighted path builds a huge prompt before inference. What would you change to meet sub-second TTFT?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ide", 40, 120, "desktop", "IDE client"),
          n("n-gw", 220, 120, "api-gateway", "Assistant gateway"),
          n("n-ret", 420, 120, "t-elasticsearch", "Code retrieval"),
          n("n-vec", 420, 260, "embedding", "Embedding index"),
          n("n-llm", 640, 120, "gpu", "Code LLM"),
        ],
        edges: [
          e("e1", "n-ide", "n-gw", "Completion request"),
          e("e2", "n-gw", "n-ret", "Fetch chunks"),
          e("e3", "n-ret", "n-vec", "Vector search"),
          e("e4", "n-gw", "n-llm", "Full prompt"),
        ],
      },
      incident: { nodeIds: ["n-gw", "n-ret"], edgeIds: ["e2", "e3"], headline: "Synchronous wide retrieval blocks the model call" },
      referenceFix:
        "Tier context (local file first, lazy retrieval), cache prompt prefixes, cap tokens with summarization, parallelize retrieval with a tight deadline, and stream tokens while background-enriching.",
    },
    "deep.privacy": {
      slug: "secret-leak-in-telemetry",
      title: "API keys appear in assistant prompt logs",
      symptoms:
        "Security scan found live AWS keys in exported prompt traces. Three enterprise tenants threatened to disable the product after a support engineer downloaded debug bundles.",
      interviewerSetup:
        "Debug mode logs full prompts to object storage with no redaction. The gateway forwards file contents verbatim including .env files opened in the editor.",
      opener:
        "Secrets showed up in stored prompts—the logging path is highlighted. How do you stop leakage without losing debuggability?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ide", 60, 140, "desktop", "IDE"),
          n("n-gw", 260, 140, "api-gateway", "Gateway"),
          n("n-red", 460, 140, "service", "Prompt builder"),
          n("n-log", 460, 280, "storage", "Prompt archive"),
          n("n-llm", 660, 140, "gpu", "Model"),
        ],
        edges: [
          e("e1", "n-ide", "n-gw", "Send context"),
          e("e2", "n-gw", "n-red", "Assemble prompt"),
          e("e3", "n-red", "n-log", "Debug capture"),
          e("e4", "n-red", "n-llm", "Forward"),
        ],
      },
      incident: { nodeIds: ["n-red", "n-log"], edgeIds: ["e3"], headline: "Unredacted prompts persisted to durable storage" },
      referenceFix:
        "Scan and redact secrets before logging, block known credential patterns, default-off full prompt capture with tenant policy, hash file paths, and offer on-device-only debug modes.",
    },
    "deep.agent": {
      slug: "runaway-tool-loop",
      title: "Agent loops burn quota on repeated failed test runs",
      symptoms:
        "A single user session issued 400 shell tool calls in ten minutes, tripping rate limits for the whole org. Billing alerts show 50× normal token usage with no successful patch applied.",
      interviewerSetup:
        "The agent replans after every tool error with no max-step guard and no deduplication of identical commands. Failures append full stderr back into context, exploding tokens.",
      opener:
        "One session hammered tools until the org hit quota—the agent loop is highlighted. How do you cap risk while keeping autonomy?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 40, 120, "user", "Developer"),
          n("n-agent", 240, 120, "service", "Agent orchestrator"),
          n("n-tools", 440, 120, "function", "Tool runner"),
          n("n-sandbox", 440, 260, "container", "Sandbox"),
          n("n-llm", 640, 120, "gpu", "Planner model"),
        ],
        edges: [
          e("e1", "n-user", "n-agent", "Task"),
          e("e2", "n-agent", "n-llm", "Plan"),
          e("e3", "n-agent", "n-tools", "Invoke"),
          e("e4", "n-tools", "n-sandbox", "Run tests"),
        ],
      },
      incident: { nodeIds: ["n-agent", "n-llm"], edgeIds: ["e1", "e2"], headline: "Unbounded replan loop on tool errors" },
      referenceFix:
        "Hard cap steps and tool calls per session, detect repeated commands, summarize errors instead of full stderr, require human approval for destructive tools, and per-tenant budget throttles.",
    },
    "deep.metrics": {
      slug: "accept-rate-drop-unmeasured",
      title: "Accept rate dropped but dashboards still green",
      symptoms:
        "Product analytics show suggestion accept rate fell from 32% to 19% over two weeks, yet internal SLO dashboards report 99.9% availability. Leadership asks why metrics disagree.",
      interviewerSetup:
        "Availability metrics track HTTP 200 from the gateway only. Quality signals (accept, edit distance, dwell) log client-side but batch job stopped after a schema change.",
      opener:
        "Users reject more completions but ops dashboards look fine—the telemetry path is highlighted. What broke in measurement?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ide", 60, 120, "desktop", "IDE"),
          n("n-gw", 260, 120, "api-gateway", "Gateway"),
          n("n-metrics", 460, 120, "metrics", "Quality pipeline"),
          n("n-dash", 660, 120, "dashboard", "SLO dashboard"),
          n("n-warehouse", 460, 260, "warehouse", "Event warehouse"),
        ],
        edges: [
          e("e1", "n-ide", "n-gw", "Completions"),
          e("e2", "n-ide", "n-metrics", "Accept events"),
          e("e3", "n-metrics", "n-warehouse", "Broken ETL"),
          e("e4", "n-gw", "n-dash", "Uptime only"),
        ],
      },
      incident: { nodeIds: ["n-metrics", "n-warehouse"], edgeIds: ["e2", "e3"], headline: "Client quality telemetry pipeline stalled while uptime metrics mask regressions" },
      referenceFix:
        "Fix schema contract for accept events, monitor pipeline freshness, pair availability with quality SLOs, and alert when accept rate or edit distance shifts by segment.",
    },
    "deep.serving": {
      slug: "gpu-preempt-cold-start",
      title: "Cold GPU workers cause completion timeouts after scale-up",
      symptoms:
        "After autoscaling added GPUs, 12% of requests timed out at 30 s. New pods spent 25 s loading weights from object storage before accepting traffic.",
      interviewerSetup:
        "Kubernetes readiness flips true when the process starts, not when weights are loaded. Load balancer sends traffic immediately to fresh pods.",
      opener:
        "Scale-out made things worse—the serving and load-balancer path is highlighted. Why are new GPUs timing out?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-lb", 80, 120, "load-balancer", "Load balancer"),
          n("n-pod", 280, 120, "gpu", "Inference pod"),
          n("n-store", 280, 280, "storage", "Weight bucket"),
          n("n-cache", 480, 120, "cache", "Warm pod pool"),
        ],
        edges: [
          e("e1", "n-lb", "n-pod", "Immediate traffic"),
          e("e2", "n-pod", "n-store", "Download weights"),
          e("e3", "n-lb", "n-cache", "Skip warm pool"),
        ],
      },
      incident: { nodeIds: ["n-lb", "n-pod"], edgeIds: ["e1", "e2"], headline: "Traffic routed before model weights finish loading" },
      referenceFix:
        "Readiness after weight load or cache hit, pre-warm standby pods, snapshot weights to local SSD on node, slow-start new instances, and use a warm pool for burst traffic.",
    },
  },
  "collaborative-editor": {
    "deep.conflict": {
      slug: "convergence-split-brain",
      title: "Two users see different document text after offline edits",
      symptoms:
        "Support tickets report divergent paragraph text for the same doc link. OT engine logs show conflicting transform branches without a single canonical snapshot.",
      interviewerSetup:
        "Clients apply local ops while offline, then reconnect with last-write-wins on server clock skew instead of CRDT/OT merge against authoritative history.",
      opener:
        "Two editors disagree on the same paragraph—the sync and history path is highlighted. What failed and how do you restore convergence?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 60, 80, "desktop", "Client A"),
          n("n-b", 60, 200, "desktop", "Client B"),
          n("n-ws", 280, 140, "websocket", "Sync service"),
          n("n-ot", 480, 140, "service", "OT engine"),
          n("n-db", 680, 140, "database", "Doc store"),
        ],
        edges: [
          e("e1", "n-a", "n-ws", "Ops stream"),
          e("e2", "n-b", "n-ws", "Offline replay"),
          e("e3", "n-ws", "n-ot", "Transform"),
          e("e4", "n-ot", "n-db", "Persist snapshot"),
        ],
      },
      incident: { nodeIds: ["n-ot", "n-db"], edgeIds: ["e3", "e4"], headline: "Offline replay bypassed ordered operational transform" },
      referenceFix:
        "Require server-assigned revision, replay client ops against canonical history with OT/CRDT, reject out-of-order snapshots, and expose merge diagnostics to users.",
    },
    "deep.storage": {
      slug: "snapshot-bloat-slow-load",
      title: "Opening large docs takes minutes due to snapshot bloat",
      symptoms:
        "Enterprise docs above 2 MB take 90 s to open. Storage costs for document history grew 8× after switching to full snapshot on every keystroke batch.",
      interviewerSetup:
        "The doc store writes entire JSON snapshots every 500 ms instead of append-only ops with periodic compaction.",
      opener:
        "Load times exploded—the persistence path is highlighted. How should storage evolve without losing history?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 40, 120, "desktop", "Editor"),
          n("n-api", 240, 120, "app-server", "Doc API"),
          n("n-snap", 440, 120, "storage", "Snapshot bucket"),
          n("n-oplog", 440, 260, "database", "Op log"),
        ],
        edges: [
          e("e1", "n-client", "n-api", "Open doc"),
          e("e2", "n-api", "n-snap", "Download full snapshot"),
          e("e3", "n-api", "n-oplog", "Unused tail"),
        ],
      },
      incident: { nodeIds: ["n-api", "n-snap"], edgeIds: ["e2"], headline: "Full snapshot reads dominate open latency" },
      referenceFix:
        "Store append-only ops, periodic compacted checkpoints, delta sync from last known revision, and cap snapshot frequency with background compaction jobs.",
    },
    "deep.reconnect": {
      slug: "reconnect-storm-duplicates",
      title: "Reconnect storm duplicates paragraphs after Wi-Fi flap",
      symptoms:
        "After a brief CDN outage, documents contain repeated bullet lists. Metrics show 40k reconnects/min replaying the same buffered ops twice.",
      interviewerSetup:
        "Clients resend all pending ops on reconnect without idempotency keys; server applies duplicates because acks were lost mid-flight.",
      opener:
        "Wi-Fi blip left duplicate sections—the reconnect buffer path is highlighted. How do you make replay safe?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 60, 140, "mobile", "Mobile editor"),
          n("n-ws", 260, 140, "websocket", "Realtime gateway"),
          n("n-queue", 460, 140, "queue", "Inbound ops"),
          n("n-doc", 660, 140, "database", "Document"),
        ],
        edges: [
          e("e1", "n-client", "n-ws", "Reconnect burst"),
          e("e2", "n-ws", "n-queue", "Enqueue"),
          e("e3", "n-queue", "n-doc", "Apply twice"),
        ],
      },
      incident: { nodeIds: ["n-ws", "n-queue"], edgeIds: ["e2", "e3"], headline: "Non-idempotent replay duplicates operations" },
      referenceFix:
        "Client op ids with server dedupe table, ack cursors persisted before apply, at-least-once transport with idempotent merge, and rate-limit replay batches.",
    },
    "deep.history": {
      slug: "undo-cross-user-leak",
      title: "Undo stack reverts another user's edits",
      symptoms:
        "Designers report undo removed a coworker's paragraph from an hour ago. Audit logs show shared global undo stack keyed only by document id.",
      interviewerSetup:
        "Undo metadata stored per document rather than per session; OT inverse ops applied without author scoping.",
      opener:
        "Undo affected someone else's work—the history stack path is highlighted. What design fix prevents cross-user undo?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 80, 80, "user", "User A"),
          n("n-b", 80, 200, "user", "User B"),
          n("n-srv", 300, 140, "service", "Edit service"),
          n("n-hist", 520, 140, "database", "Global undo stack"),
        ],
        edges: [
          e("e1", "n-a", "n-srv", "Edit"),
          e("e2", "n-b", "n-srv", "Edit"),
          e("e3", "n-srv", "n-hist", "Push inverse"),
          e("e4", "n-a", "n-hist", "Undo pop"),
        ],
      },
      incident: { nodeIds: ["n-hist"], edgeIds: ["e3", "e4"], headline: "Shared undo stack crosses author boundaries" },
      referenceFix:
        "Per-client undo stacks referencing revision ids, scope undo to own ops or explicit lock regions, and store author id on every inverse op.",
    },
    "deep.failure": {
      slug: "split-brain-primary",
      title: "Two primaries accept writes during network partition",
      symptoms:
        "Document corruption alerts fired in EU region. Two sync nodes both advertised primary, accepting conflicting writes for 90 seconds during a switch failover.",
      interviewerSetup:
        "Primary election uses a short lease without fencing tokens; stale primary kept accepting ops after partition healed.",
      opener:
        "We briefly had two writers—the election and doc store path is highlighted. How do you prevent split-brain writes?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 100, 80, "service", "Sync node A"),
          n("n-b", 100, 200, "service", "Sync node B"),
          n("n-lock", 320, 140, "database", "Lease store"),
          n("n-doc", 540, 140, "database", "Doc shards"),
        ],
        edges: [
          e("e1", "n-a", "n-lock", "Hold lease"),
          e("e2", "n-b", "n-lock", "Stale lease"),
          e("e3", "n-a", "n-doc", "Writes"),
          e("e4", "n-b", "n-doc", "Conflicting writes"),
        ],
      },
      incident: { nodeIds: ["n-a", "n-b", "n-lock"], edgeIds: ["e1", "e2", "e4"], headline: "Stale primary kept writing without fencing" },
      referenceFix:
        "Use consensus or lease with fencing tokens checked by storage, stop writes when lease lost, quiesce before promotion, and run reconciliation jobs after failover.",
    },
  },
  "collaborative-whiteboard": {
    "deep.conflict": {
      slug: "criss-cross-strokes-lost",
      title: "Crossing strokes disappear for remote users",
      symptoms:
        "Design review boards lose ink when two people draw overlapping lines. Remote clients see gaps while the local author still sees their stroke.",
      interviewerSetup:
        "CRDT layer uses last-writer-wins on bounding boxes instead of stroke-level merge; ordering depends on wall clock.",
      opener:
        "Overlapping drawing caused missing ink—the CRDT merge path is highlighted. How do you fix convergence for strokes?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 60, 100, "tablet", "Tablet A"),
          n("n-b", 60, 220, "desktop", "Desktop B"),
          n("n-realtime", 280, 160, "websocket", "Realtime hub"),
          n("n-crdt", 480, 160, "service", "Stroke CRDT"),
        ],
        edges: [
          e("e1", "n-a", "n-realtime", "Stroke ops"),
          e("e2", "n-b", "n-realtime", "Stroke ops"),
          e("e3", "n-realtime", "n-crdt", "LWW merge"),
        ],
      },
      incident: { nodeIds: ["n-crdt"], edgeIds: ["e3"], headline: "Last-writer-wins drops concurrent stroke segments" },
      referenceFix:
        "Stroke-id CRDT with causal ordering, lamport clocks, retain tombstones until all peers ack, and visual merge tests for overlapping paths.",
    },
    "deep.rendering": {
      slug: "frame-drop-thousand-strokes",
      title: "Board freezes when importing a dense PDF overlay",
      symptoms:
        "Importing a 200-page PDF to the whiteboard drops client FPS to 2 and WebGL context crashes on mid-tier laptops.",
      interviewerSetup:
        "Renderer draws every vector stroke each frame with no tiling, level-of-detail, or GPU batching; PDF vectors converted to individual paths.",
      opener:
        "PDF import killed performance—the render pipeline is highlighted. How would you keep pan/zoom smooth?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 40, 140, "desktop", "Browser client"),
          n("n-canvas", 260, 140, "service", "Render engine"),
          n("n-tile", 480, 80, "cache", "Tile cache"),
          n("n-store", 480, 220, "storage", "PDF assets"),
        ],
        edges: [
          e("e1", "n-client", "n-canvas", "Draw all strokes"),
          e("e2", "n-canvas", "n-store", "Load vectors"),
          e("e3", "n-canvas", "n-tile", "Skip tiling"),
        ],
      },
      incident: { nodeIds: ["n-client", "n-canvas"], edgeIds: ["e1", "e2"], headline: "Full-scene redraw without tiling overloads the client" },
      referenceFix:
        "Tile-based rendering with LOD, rasterize static PDF layer to textures, batch strokes in GPU buffers, and progressively load offscreen content.",
    },
    "deep.presence": {
      slug: "ghost-cursors-after-leave",
      title: "Ghost cursors linger after users leave the board",
      symptoms:
        "Workshops show 30+ cursors though only eight people are connected. Presence badges confuse facilitators about who is active.",
      interviewerSetup:
        "Presence heartbeats expire slowly and disconnect events are missed when tabs sleep; no server-side sweep on websocket close.",
      opener:
        "Facilitators see ghost cursors—the presence channel is highlighted. How do you keep presence accurate?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-users", 60, 140, "users", "Participants"),
          n("n-ws", 260, 140, "websocket", "Board gateway"),
          n("n-pres", 460, 140, "session-store", "Presence store"),
          n("n-bcast", 660, 140, "t-pubsub", "Presence fanout"),
        ],
        edges: [
          e("e1", "n-users", "n-ws", "Heartbeats"),
          e("e2", "n-ws", "n-pres", "Update cursor"),
          e("e3", "n-pres", "n-bcast", "Stale entries"),
        ],
      },
      incident: { nodeIds: ["n-pres", "n-bcast"], edgeIds: ["e2", "e3"], headline: "Stale presence entries never expire on missed disconnect" },
      referenceFix:
        "Short TTL with websocket close hooks, server sweeper, versioned presence epoch on reconnect, and debounced broadcast diffs.",
    },
    "deep.reconnection": {
      slug: "board-blank-after-resume",
      title: "Board appears empty after laptop sleep",
      symptoms:
        "Users returning from sleep see a blank canvas until hard refresh. Console shows websocket reconnected but snapshot fetch 404 on stale revision token.",
      interviewerSetup:
        "Client reconnect uses old revision cookie while server compacted history; fallback fetch not implemented.",
      opener:
        "After sleep the board is empty—the reconnect and snapshot path is highlighted. What should happen on resume?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 60, 140, "desktop", "Client"),
          n("n-ws", 260, 140, "websocket", "Gateway"),
          n("n-snap", 460, 140, "storage", "Board snapshots"),
          n("n-op", 460, 260, "stream", "Op stream"),
        ],
        edges: [
          e("e1", "n-client", "n-ws", "Reconnect"),
          e("e2", "n-ws", "n-snap", "Fetch stale rev"),
          e("e3", "n-ws", "n-op", "Missing catch-up"),
        ],
      },
      incident: { nodeIds: ["n-client", "n-snap"], edgeIds: ["e2"], headline: "Client cannot catch up after snapshot compaction" },
      referenceFix:
        "Negotiate revision on reconnect, stream ops since last ack or send latest checkpoint, keep bounded op log per board, and client-side backoff with full reload fallback.",
    },
    "deep.persistence": {
      slug: "autosave-lost-on-tab-crash",
      title: "Hours of whiteboard work lost when browser tab crashes",
      symptoms:
        "Teachers report entire lessons missing after Chrome killed a tab. Autosave metrics show last successful persist was 45 minutes before crash.",
      interviewerSetup:
        "Persistence batches to server every 30 minutes; local IndexedDB buffer disabled to reduce complexity.",
      opener:
        "A tab crash wiped the board—the persistence path is highlighted. How do you bound data loss?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 60, 140, "client", "Browser"),
          n("n-local", 260, 260, "t-sqlite", "Local buffer"),
          n("n-api", 260, 140, "app-server", "Save API"),
          n("n-store", 480, 140, "storage", "Board archive"),
        ],
        edges: [
          e("e1", "n-client", "n-api", "30-min batch"),
          e("e2", "n-client", "n-local", "Disabled"),
          e("e3", "n-api", "n-store", "Write"),
        ],
      },
      incident: { nodeIds: ["n-client", "n-api"], edgeIds: ["e1"], headline: "Infrequent server autosave with no local durability" },
      referenceFix:
        "Enable IndexedDB write-through, debounced server saves every few seconds, op log tail on crash recovery, and visible save status for users.",
    },
  },
  "config-control-plane": {
    "deep.validation": {
      slug: "bad-config-takes-down-fleet",
      title: "Invalid config YAML crashes every edge agent",
      symptoms:
        "All CDN edge agents restarted in a loop after a config publish. Global error rate hit 40% until rollback; schema allowed a negative TTL field that agents parse as crash.",
      interviewerSetup:
        "Control plane accepts uploads without server-side schema validation or canary; agents hot-reload and panic on bad values.",
      opener:
        "One config edit brick the fleet—the validation and rollout path is highlighted. How do you prevent bad config from reaching everyone?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-op", 60, 120, "admin", "Operator"),
          n("n-cp", 260, 120, "config", "Control plane"),
          n("n-val", 260, 260, "service", "Validator"),
          n("n-agent", 480, 120, "web-server", "Edge agents"),
        ],
        edges: [
          e("e1", "n-op", "n-cp", "Publish"),
          e("e2", "n-cp", "n-agent", "Push unvalidated"),
          e("e3", "n-cp", "n-val", "Skipped"),
        ],
      },
      incident: { nodeIds: ["n-cp", "n-agent"], edgeIds: ["e2"], headline: "Unvalidated config propagated globally" },
      referenceFix:
        "Strict schema validation, semantic checks, signed bundles, canary cohorts, automatic rollback on agent health signals, and dry-run against shadow agents.",
    },
    "deep.rollout": {
      slug: "stuck-canary-never-promotes",
      title: "Canary stuck at 5% while bug fix waits days",
      symptoms:
        "A critical TLS fix remains on 5% of agents for 72 hours. Promotion pipeline blocked because canary metrics compare to wrong baseline window.",
      interviewerSetup:
        "Rollout controller requires manual approval but alert noise hides the promotion gate; version skew causes mixed behavior on same POP.",
      opener:
        "The fix is canaried but never promotes—the rollout controller path is highlighted. What's stuck?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-cp", 80, 140, "config", "Control plane"),
          n("n-roll", 280, 140, "deployer", "Rollout controller"),
          n("n-can", 480, 80, "cluster", "Canary agents"),
          n("n-prod", 480, 200, "cluster", "Prod agents"),
        ],
        edges: [
          e("e1", "n-cp", "n-roll", "New version"),
          e("e2", "n-roll", "n-can", "5% traffic"),
          e("e3", "n-roll", "n-prod", "Blocked promote"),
        ],
      },
      incident: { nodeIds: ["n-roll"], edgeIds: ["e2", "e3"], headline: "Promotion gate never clears on noisy canary metrics" },
      referenceFix:
        "Fix baseline comparisons, auto-promote on SLO with manual override, cap max canary duration, and alert on version skew per POP.",
    },
    "deep.rollback": {
      slug: "rollback-races-forward-deploy",
      title: "Rollback overwritten by overlapping deploy job",
      symptoms:
        "Operators rolled back a bad release but five minutes later the broken version returned. Two CI jobs raced writing the same config channel.",
      interviewerSetup:
        "Rollback sets pointer without monotonic revision; forward deploy job lacked check on rollback flag.",
      opener:
        "Rollback didn't stick—the revision pointer path is highlighted. How do you make rollback win?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ci", 60, 120, "service", "CI publisher"),
          n("n-cp", 260, 120, "config", "Config store"),
          n("n-ag", 480, 120, "web-server", "Agents"),
        ],
        edges: [
          e("e1", "n-ci", "n-cp", "Deploy v2"),
          e("e2", "n-cp", "n-ag", "Apply v2"),
          e("e3", "n-ci", "n-cp", "Race after rollback"),
        ],
      },
      incident: { nodeIds: ["n-cp"], edgeIds: ["e1", "e3"], headline: "Non-monotonic revisions allow rollback to be clobbered" },
      referenceFix:
        "Monotonic config revision with compare-and-swap, freeze channel on rollback, require explicit unfreeze to forward deploy, audit trail of publishers.",
    },
    "deep.resilience": {
      slug: "cp-outage-stops-data-plane",
      title: "Config service outage stalls all data plane requests",
      symptoms:
        "When the control plane API blipped for three minutes, every API request blocked waiting for fresh route tables. p99 latency hit 12 s.",
      interviewerSetup:
        "Data plane fetches config synchronously per request with no local snapshot or TTL cache.",
      opener:
        "A brief control plane blip froze traffic—the fetch path is highlighted. How do you decouple?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-client", 40, 120, "client", "Clients"),
          n("n-dp", 240, 120, "api-gateway", "Data plane"),
          n("n-cp", 240, 260, "config", "Control plane"),
          n("n-backend", 460, 120, "microservice", "Services"),
        ],
        edges: [
          e("e1", "n-client", "n-dp", "Requests"),
          e("e2", "n-dp", "n-cp", "Sync lookup"),
          e("e3", "n-dp", "n-backend", "Blocked proxy"),
        ],
      },
      incident: { nodeIds: ["n-dp", "n-cp"], edgeIds: ["e2"], headline: "Synchronous config lookup on hot path" },
      referenceFix:
        "Last-known-good snapshot in memory with background refresh, push updates over stream, fail open on stale within bounds, separate liveness from config freshness metrics.",
    },
    "deep.datamodel": {
      slug: "key-collision-overwrites-tenant",
      title: "Shared config key overwrites another tenant's routes",
      symptoms:
        "Tenant B suddenly routed to Tenant A's payment service after an operator typo in a shared namespace key. Blast radius crossed isolation boundary.",
      interviewerSetup:
        "Flat key namespace without tenant prefix enforcement; UI allows editing global keys with insufficient RBAC.",
      opener:
        "One typo crossed tenants—the config key model is highlighted. How do you enforce isolation?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-op", 60, 140, "admin", "Operator"),
          n("n-cp", 260, 140, "config", "Config API"),
          n("n-kv", 460, 140, "kv-store", "Config KV"),
          n("n-a", 660, 80, "microservice", "Tenant A svc"),
          n("n-b", 660, 200, "microservice", "Tenant B svc"),
        ],
        edges: [
          e("e1", "n-op", "n-cp", "Edit key"),
          e("e2", "n-cp", "n-kv", "Write routes/payment"),
          e("e3", "n-kv", "n-a", "Wrong binding"),
          e("e4", "n-kv", "n-b", "Wrong binding"),
        ],
      },
      incident: { nodeIds: ["n-kv"], edgeIds: ["e2", "e4"], headline: "Flat namespace allows cross-tenant config overwrite" },
      referenceFix:
        "Mandatory tenant-scoped keys, validation on write, RBAC per namespace, preview diff showing affected services, and audit on shared keys.",
    },
  },
  "content-moderation": {
    "deep.thresholds": {
      slug: "threshold-shift-blocks-feed",
      title: "Aggressive threshold blocks 30% of benign posts",
      symptoms:
        "After tuning NSFW model threshold down, creator reach dropped sharply and appeals queue grew 10×. False positive rate jumped while recall barely improved.",
      interviewerSetup:
        "Single global threshold applied to all locales; no shadow mode before production cutover.",
      opener:
        "The feed suddenly empty for many creators—the classifier threshold path is highlighted. What went wrong?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-post", 60, 140, "mobile", "Upload client"),
          n("n-ing", 260, 140, "app-server", "Ingest"),
          n("n-clf", 460, 140, "model-serving", "NSFW classifier"),
          n("n-feed", 660, 140, "service", "Feed builder"),
        ],
        edges: [
          e("e1", "n-post", "n-ing", "New post"),
          e("e2", "n-ing", "n-clf", "Score"),
          e("e3", "n-clf", "n-feed", "Hard block"),
        ],
      },
      incident: { nodeIds: ["n-clf", "n-feed"], edgeIds: ["e2", "e3"], headline: "Global threshold change spiked false positives" },
      referenceFix:
        "Shadow evaluate new thresholds, per-locale calibration, human review queue for borderline scores, rollback switches, and monitor precision/recall by segment.",
    },
    "deep.review": {
      slug: "review-queue-sla-breach",
      title: "Human review backlog lets harmful content stay live",
      symptoms:
        "Average time-to-decision in the review queue hit 18 hours during a protest event. Reported content stayed visible while moderators worked FIFO without risk scoring.",
      interviewerSetup:
        "Queue sorted by arrival time only; no priority by virality, reports, or model confidence.",
      opener:
        "Harmful posts stayed up because review couldn't keep up—the queue path is highlighted. How do you prioritize?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 40, 120, "user", "Reporters"),
          n("n-q", 240, 120, "queue", "Review queue"),
          n("n-mod", 440, 120, "admin", "Moderators"),
          n("n-feed", 640, 120, "service", "Public feed"),
        ],
        edges: [
          e("e1", "n-user", "n-q", "Reports"),
          e("e2", "n-q", "n-mod", "FIFO"),
          e("e3", "n-feed", "n-q", "Live content"),
        ],
      },
      incident: { nodeIds: ["n-q"], edgeIds: ["e2"], headline: "FIFO review queue ignores risk and velocity" },
      referenceFix:
        "Priority by report count, model score, and spread velocity; temporary visibility limits for uncertain content; surge staffing hooks; SLA alerts on queue age.",
    },
    "deep.labels": {
      slug: "label-schema-breaks-training",
      title: "Label taxonomy change silently breaks retraining",
      symptoms:
        "Weekly retrain job accuracy collapsed after moderators started using a new 'borderline' label not mapped in the training pipeline. Production still serves old model unaware.",
      interviewerSetup:
        "Label enum extended in UI without versioning training data contract; ETL defaults unknown labels to negative class.",
      opener:
        "Moderators added labels but the model got worse—the label pipeline is highlighted. What broke?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-mod", 60, 140, "admin", "Moderators"),
          n("n-ui", 260, 140, "app-server", "Label UI"),
          n("n-etl", 460, 140, "service", "Label ETL"),
          n("n-train", 660, 140, "training", "Retrain job"),
        ],
        edges: [
          e("e1", "n-mod", "n-ui", "New label"),
          e("e2", "n-ui", "n-etl", "Export"),
          e("e3", "n-etl", "n-train", "Mis-mapped"),
        ],
      },
      incident: { nodeIds: ["n-etl", "n-train"], edgeIds: ["e2", "e3"], headline: "Unversioned label schema corrupted training labels" },
      referenceFix:
        "Version label taxonomy, block export on unknown labels, mapping table with tests, notify ML on schema change, and monitor label distribution drift.",
    },
    "deep.adversarial": {
      slug: "adversarial-images-bypass-filter",
      title: "Adversarial padding fools image moderator",
      symptoms:
        "A coordinated spam campaign used thin noise borders to drop NSFW scores just below threshold. Automated removal rate fell 60% for two days.",
      interviewerSetup:
        "Classifier runs on downscaled center crop; attackers add border patterns outside crop region.",
      opener:
        "Spam images evaded the model—the inference preprocessing path is highlighted. How do you harden?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-up", 60, 140, "mobile", "Uploader"),
          n("n-pre", 260, 140, "service", "Preprocessor"),
          n("n-clf", 460, 140, "model-serving", "Vision model"),
          n("n-act", 660, 140, "service", "Enforcement"),
        ],
        edges: [
          e("e1", "n-up", "n-pre", "Image bytes"),
          e("e2", "n-pre", "n-clf", "Center crop only"),
          e("e3", "n-clf", "n-act", "Low score pass"),
        ],
      },
      incident: { nodeIds: ["n-pre", "n-clf"], edgeIds: ["e2"], headline: "Crop-based preprocessing misses border adversarial patterns" },
      referenceFix:
        "Multi-scale and full-frame scoring, ensemble models, hash blocklists, rate limits on similar uploads, and rapid adversarial retraining loop.",
    },
    "deep.measure": {
      slug: "metric-gap-hides-harm-spike",
      title: "Dashboards miss harm spike due to wrong denominator",
      symptoms:
        "Leadership dashboards show flat violation rate while user reports tripled. Denominator uses impressions instead of viewed posts, hiding surge in smaller creators.",
      interviewerSetup:
        "Metrics pipeline joins moderation decisions to ad impressions rather than content views; segment breakdown missing.",
      opener:
        "Reports say harm is up but dashboards disagree—the metrics join is highlighted. What's wrong?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-mod", 60, 120, "service", "Moderation svc"),
          n("n-metrics", 280, 120, "metrics", "Metrics ETL"),
          n("n-wh", 480, 120, "warehouse", "Warehouse"),
          n("n-dash", 680, 120, "dashboard", "Exec dashboard"),
        ],
        edges: [
          e("e1", "n-mod", "n-metrics", "Decisions"),
          e("e2", "n-metrics", "n-wh", "Wrong join"),
          e("e3", "n-wh", "n-dash", "Flat rate"),
        ],
      },
      incident: { nodeIds: ["n-metrics", "n-wh"], edgeIds: ["e2"], headline: "Incorrect denominator masks rising harm" },
      referenceFix:
        "Define metrics on viewed content per segment, document denominators, add report-to-view ratio alerts, and validate dashboards against sampled audits.",
    },
  },
  "data-alerting": {
    "deep.evaluator": {
      slug: "evaluator-storm-drops-alerts",
      title: "Metric flap triggers evaluator storm and dropped pages",
      symptoms:
        "During a deploy, CPU metric flapped every 30 s causing 12,000 alert evaluations per minute. PagerDuty throttled and real outages went unpageable.",
      interviewerSetup:
        "Evaluator reruns on every raw sample with no hysteresis or grouping window; state store writes synchronously on each flap.",
      opener:
        "Alerts stopped firing when metrics flapped—the evaluator loop is highlighted. What failed?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ts", 60, 140, "metrics", "Time series DB"),
          n("n-eval", 280, 140, "service", "Rule evaluator"),
          n("n-state", 280, 280, "database", "Alert state"),
          n("n-page", 500, 140, "service", "Pager"),
        ],
        edges: [
          e("e1", "n-ts", "n-eval", "Raw samples"),
          e("e2", "n-eval", "n-state", "Flip each flap"),
          e("e3", "n-eval", "n-page", "Flood pages"),
        ],
      },
      incident: { nodeIds: ["n-eval", "n-state"], edgeIds: ["e1", "e2"], headline: "No hysteresis causes alert state thrashing" },
      referenceFix:
        "For-duration conditions, grouping windows, alert suppression during known deploys, rate-limit pages, and async state updates with debouncing.",
    },
    "deep.state_dedupe": {
      slug: "duplicate-pages-same-incident",
      title: "Same incident pages on-call twenty times",
      symptoms:
        "Database failover generated 22 identical PagerDuty incidents because each shard evaluator opened a new alert key instead of deduping on correlation id.",
      interviewerSetup:
        "Alert fingerprint excludes service and shard labels; dedupe TTL too short for long incidents.",
      opener:
        "One DB incident woke everyone repeatedly—the dedupe path is highlighted. How do you correlate?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-shards", 60, 120, "database", "DB shards"),
          n("n-eval", 280, 120, "service", "Evaluators"),
          n("n-dedupe", 480, 120, "kv-store", "Dedupe store"),
          n("n-pd", 680, 120, "service", "Paging API"),
        ],
        edges: [
          e("e1", "n-shards", "n-eval", "Errors"),
          e("e2", "n-eval", "n-dedupe", "New keys"),
          e("e3", "n-dedupe", "n-pd", "Duplicate incidents"),
        ],
      },
      incident: { nodeIds: ["n-dedupe"], edgeIds: ["e2", "e3"], headline: "Weak fingerprinting prevents incident deduplication" },
      referenceFix:
        "Stable alert fingerprint on root cause labels, correlation ids from traces, merge windows, and inhibit rules linking shard alerts to parent.",
    },
    "deep.grouping": {
      slug: "alert-fatigue-from-shard-sprawl",
      title: "On-call drowned in per-shard CPU alerts",
      symptoms:
        "Night shift received 400 CPU alerts from individual Kafka brokers though cluster capacity was fine. Mean time to acknowledge rose above 30 minutes.",
      interviewerSetup:
        "Rules fire per broker without roll-up; no top-N or cluster-level aggregation.",
      opener:
        "Brokers spammed pages but the cluster was healthy—the grouping path is highlighted. How do you roll up?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-brokers", 40, 140, "cluster", "Kafka brokers"),
          n("n-rules", 260, 140, "service", "Alert rules"),
          n("n-group", 460, 140, "service", "Grouping layer"),
          n("n-oncall", 660, 140, "user", "On-call"),
        ],
        edges: [
          e("e1", "n-brokers", "n-rules", "Per-host CPU"),
          e("e2", "n-rules", "n-group", "Bypassed"),
          e("e3", "n-rules", "n-oncall", "400 pages"),
        ],
      },
      incident: { nodeIds: ["n-rules"], edgeIds: ["e2", "e3"], headline: "Missing roll-up groups shard noise into fatigue" },
      referenceFix:
        "Multi-level rules with cluster roll-up, inhibition when parent fires, dynamic top-N offenders, and on-call policies requiring grouped incidents.",
    },
    "deep.testing": {
      slug: "silent-rule-regression",
      title: "Deploy broke alert rule without anyone noticing",
      symptoms:
        "A typo in label matcher stopped all payment error alerts for six days until finance noticed reconciliation gaps. CI had no alert rule tests.",
      interviewerSetup:
        "Rules edited via UI without version control; staging environment lacks representative metrics for dry-run.",
      opener:
        "Payment alerts silently stopped—the rule testing path is highlighted. How do you catch regressions?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-op", 60, 140, "admin", "Operator"),
          n("n-ui", 260, 140, "app-server", "Rule editor"),
          n("n-prod", 480, 140, "metrics", "Prod metrics"),
          n("n-test", 480, 280, "service", "Rule tester"),
        ],
        edges: [
          e("e1", "n-op", "n-ui", "Edit matcher"),
          e("e2", "n-ui", "n-prod", "Deploy rule"),
          e("e3", "n-ui", "n-test", "Skipped"),
        ],
      },
      incident: { nodeIds: ["n-ui", "n-prod"], edgeIds: ["e2"], headline: "Untested rule change silenced critical alerts" },
      referenceFix:
        "Git-backed rules, unit tests with fixture time series, staging dry-run on replayed data, canary notifications, and synthetic alert probes.",
    },
    "deep.anomaly": {
      slug: "seasonality-blind-anomaly",
      title: "Friday traffic spike pages false anomaly",
      symptoms:
        "Every Friday evening on-call gets paged for 'anomaly' on signups though pattern is normal weekly seasonality. Trust in anomaly alerts eroded.",
      interviewerSetup:
        "Anomaly detector uses fixed z-score without day-of-week baseline; training window too short.",
      opener:
        "Predictable Friday spikes page people—the anomaly model path is highlighted. How do you fix signal?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-events", 60, 140, "stream", "Signup stream"),
          n("n-det", 280, 140, "service", "Anomaly detector"),
          n("n-base", 280, 280, "database", "Baseline store"),
          n("n-page", 500, 140, "service", "Pager"),
        ],
        edges: [
          e("e1", "n-events", "n-det", "Live counts"),
          e("e2", "n-det", "n-base", "Static mean"),
          e("e3", "n-det", "n-page", "False pages"),
        ],
      },
      incident: { nodeIds: ["n-det", "n-base"], edgeIds: ["e2"], headline: "Baseline ignores weekly seasonality" },
      referenceFix:
        "Seasonal baselines by hour and weekday, robust statistics, alert only on residual after deseasoning, and feedback loop to tune sensitivity.",
    },
  },
  "data-quality": {
    "deep.circuit_breaker": {
      slug: "bad-partition-poisons-warehouse",
      title: "Bad upstream partition blocked entire nightly load",
      symptoms:
        "Warehouse load failed at 2 a.m. because one Kafka partition had corrupt JSON for three hours. Downstream marts empty for morning dashboards.",
      interviewerSetup:
        "ETL aborts whole batch on first poison message without quarantine or circuit breaker per partition.",
      opener:
        "One bad partition stopped the whole pipeline—the ingest path is highlighted. How do you isolate failure?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-kafka", 60, 140, "t-kafka", "Kafka topic"),
          n("n-etl", 280, 140, "service", "Load job"),
          n("n-quar", 480, 140, "queue", "Quarantine"),
          n("n-wh", 480, 280, "warehouse", "Warehouse"),
        ],
        edges: [
          e("e1", "n-kafka", "n-etl", "All partitions"),
          e("e2", "n-etl", "n-wh", "Abort"),
          e("e3", "n-etl", "n-quar", "Unused"),
        ],
      },
      incident: { nodeIds: ["n-etl"], edgeIds: ["e1", "e2"], headline: "All-or-nothing batch fails on single poison record" },
      referenceFix:
        "Per-partition circuit breakers, quarantine bad records with alerts, continue healthy partitions, replay quarantine after fix, and SLAs on loaded row counts.",
    },
    "deep.lineage": {
      slug: "unknown-column-breaks-executive-report",
      title: "Renamed column broke report with no lineage alert",
      symptoms:
        "CEO dashboard showed blank revenue for a day after an engineer renamed a field in the raw layer. No alert fired because downstream job silently null-filled.",
      interviewerSetup:
        "Lineage graph exists but breaking schema changes don't trigger consumers; jobs coerce missing fields to null.",
      opener:
        "A rename blanked revenue—the lineage and contract path is highlighted. How do you catch this pre-deploy?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-src", 60, 140, "database", "Raw table"),
          n("n-line", 260, 140, "service", "Lineage registry"),
          n("n-dbt", 460, 140, "service", "Transform job"),
          n("n-bi", 660, 140, "dashboard", "CEO dashboard"),
        ],
        edges: [
          e("e1", "n-src", "n-dbt", "Schema change"),
          e("e2", "n-src", "n-line", "Untriggered"),
          e("e3", "n-dbt", "n-bi", "Null revenue"),
        ],
      },
      incident: { nodeIds: ["n-src", "n-dbt"], edgeIds: ["e1", "e3"], headline: "Schema change without consumer contract notification" },
      referenceFix:
        "Contract tests on producers, block deploy breaking dependents, lineage-driven notifications, and non-null assertions on critical metrics.",
    },
    "deep.anomaly": {
      slug: "silent-null-spike",
      title: "Null rate spike unnoticed for a week",
      symptoms:
        "Customer age field became 90% null after a mobile bug but quality checks only ran monthly. Segmentation models degraded silently.",
      interviewerSetup:
        "Profiling job weekly; no streaming checks on null rate or distribution drift.",
      opener:
        "A mobile bug nulled a column for days—the profiling path is highlighted. How do you detect faster?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-mobile", 60, 140, "mobile", "Mobile app"),
          n("n-ing", 260, 140, "stream", "Ingest stream"),
          n("n-prof", 460, 140, "service", "Profiler"),
          n("n-alert", 660, 140, "metrics", "Quality alerts"),
        ],
        edges: [
          e("e1", "n-mobile", "n-ing", "Events"),
          e("e2", "n-ing", "n-prof", "Weekly only"),
          e("e3", "n-prof", "n-alert", "Late detect"),
        ],
      },
      incident: { nodeIds: ["n-prof"], edgeIds: ["e2"], headline: "Infrequent profiling missed null spike" },
      referenceFix:
        "Streaming expectations on null rate and cardinality, anomaly detection on profiles, block releases when checks fail, tie to owner dashboards.",
    },
    "deep.contracts": {
      slug: "producer-breaks-consumer-contract",
      title: "Producer shipped extra enum value crashing consumer",
      symptoms:
        "Payments pipeline stalled because a new status enum value appeared without consumer update. Spark job threw enum parse exceptions for 6 hours.",
      interviewerSetup:
        "Avro schema marked compatible but semantic enum extension not coordinated; consumers use strict pattern match.",
      opener:
        "A new enum value stopped Spark—the contract path is highlighted. How do you evolve safely?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-prod", 60, 140, "microservice", "Payments svc"),
          n("n-reg", 260, 140, "service", "Schema registry"),
          n("n-cons", 460, 140, "service", "Spark consumer"),
          n("n-dlq", 660, 140, "queue", "Dead letter"),
        ],
        edges: [
          e("e1", "n-prod", "n-reg", "Publish schema"),
          e("e2", "n-reg", "n-cons", "New enum"),
          e("e3", "n-cons", "n-dlq", "Fail batch"),
        ],
      },
      incident: { nodeIds: ["n-reg", "n-cons"], edgeIds: ["e2", "e3"], headline: "Backward incompatible semantic change passed registry" },
      referenceFix:
        "Consumer-driven contracts, semantic compatibility tests, default unknown handling, coordinated rollout with feature flags, and DLQ replay after fix.",
    },
    "deep.storage": {
      slug: "hot-partition-skews-quality-scan",
      title: "Quality scan times out on skewed partition",
      symptoms:
        "Daily quality scan missed SLA because one huge tenant partition dominated scan time; other partitions finished in minutes.",
      interviewerSetup:
        "Scan job uses single thread per table without salting or parallel split on tenant key.",
      opener:
        "Quality job timed out on one giant tenant—the scan path is highlighted. How do you scale checks?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-wh", 60, 140, "warehouse", "Fact table"),
          n("n-scan", 280, 140, "service", "Quality scan"),
          n("n-split", 480, 140, "service", "Partition planner"),
          n("n-metrics", 660, 140, "metrics", "Scan metrics"),
        ],
        edges: [
          e("e1", "n-wh", "n-scan", "Full table"),
          e("e2", "n-scan", "n-split", "Skipped"),
          e("e3", "n-scan", "n-metrics", "Timeout"),
        ],
      },
      incident: { nodeIds: ["n-scan"], edgeIds: ["e1"], headline: "Unpartitioned scan skewed on hot tenant" },
      referenceFix:
        "Split scans by partition key ranges, sample heavy tenants separately, adaptive parallelism, track per-partition duration, and incremental checks on deltas.",
    },
  },
  "deployment-platform": {
    "deep.progressive": {
      slug: "canary-missing-rollback-auto",
      title: "Bad canary promoted before error budget burned",
      symptoms:
        "A memory leak canary reached 50% fleet before anyone noticed RSS climb; auto-promotion continued because HTTP 500 rate stayed flat while OOM kills rose.",
      interviewerSetup:
        "Progressive delivery gates only on 5xx, ignoring process restarts and memory; promotion cron runs regardless of canary health.",
      opener:
        "The canary should never have promoted—the progressive delivery controller is highlighted. What signals were missing?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-ci", 60, 120, "service", "CI pipeline"),
          n("n-dep", 280, 120, "deployer", "Progressive controller"),
          n("n-can", 480, 80, "cluster", "Canary pods"),
          n("n-prod", 480, 200, "cluster", "Stable pods"),
        ],
        edges: [
          e("e1", "n-ci", "n-dep", "Release v42"),
          e("e2", "n-dep", "n-can", "Advance %"),
          e("e3", "n-dep", "n-prod", "Auto promote"),
        ],
      },
      incident: { nodeIds: ["n-dep"], edgeIds: ["e2", "e3"], headline: "Promotion relied on incomplete health signals" },
      referenceFix:
        "Multi-signal gates (OOM, restarts, latency, custom metrics), automatic halt and rollback, manual approval for large steps, and compare canary to stable cohort.",
    },
    "deep.database": {
      slug: "migrate-job-blocks-deploy",
      title: "Long DB migration blocked all deploys for six hours",
      symptoms:
        "Engineering could not ship hotfixes because deployment pipeline waits on a synchronous additive column migration on a 40 TB table.",
      interviewerSetup:
        "Platform runs expand migration in deploy hook with global lock; no expand-contract pattern or online schema change tool.",
      opener:
        "Hotfixes stuck behind a migration—the deploy and database path is highlighted. How do you unblock?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-dep", 80, 140, "deployer", "Deploy controller"),
          n("n-mig", 280, 140, "service", "Migration job"),
          n("n-db", 480, 140, "database", "Primary DB"),
          n("n-app", 480, 280, "app-server", "Waiting services"),
        ],
        edges: [
          e("e1", "n-dep", "n-mig", "Gate deploy"),
          e("e2", "n-mig", "n-db", "Table rewrite"),
          e("e3", "n-dep", "n-app", "Blocked rollout"),
        ],
      },
      incident: { nodeIds: ["n-dep", "n-mig"], edgeIds: ["e1", "e2"], headline: "Synchronous migration on critical path blocks releases" },
      referenceFix:
        "Expand-contract migrations, online schema change tools, decouple app deploy from backfill, run heavy migrations asynchronously with feature flags.",
    },
    "deep.analysis": {
      slug: "bad-analysis-promotes-regression",
      title: "Automated analysis promoted a latency regression",
      symptoms:
        "Release analysis compared canary p99 latency to the wrong baseline window (deploy day vs prior week), green-lighting a 40 ms regression.",
      interviewerSetup:
        "Analysis service uses calendar day baseline without excluding holidays or deploy noise; statistical test underpowered.",
      opener:
        "Stats said ship but latency regressed—the analysis path is highlighted. What went wrong?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-can", 60, 140, "cluster", "Canary"),
          n("n-metrics", 260, 140, "metrics", "Metrics store"),
          n("n-an", 460, 140, "service", "Release analysis"),
          n("n-dep", 660, 140, "deployer", "Promote"),
        ],
        edges: [
          e("e1", "n-can", "n-metrics", "Latency series"),
          e("e2", "n-metrics", "n-an", "Wrong baseline"),
          e("e3", "n-an", "n-dep", "Approve"),
        ],
      },
      incident: { nodeIds: ["n-an"], edgeIds: ["e2", "e3"], headline: "Flawed baseline selection hid latency regression" },
      referenceFix:
        "Compare to stable cohort and pre-deploy window, use sequential testing with minimum sample, human review for large shifts, and block promote on SLO burn.",
    },
    "deep.provenance": {
      slug: "unknown-artifact-in-prod",
      title: "Mystery container digest running in production",
      symptoms:
        "Security audit found 12 pods running an image digest with no build record. Incident response cannot map artifact to git commit or SBOM.",
      interviewerSetup:
        "Emergency manual deploy pushed `:latest` tag bypassing provenance signing and attestation store.",
      opener:
        "Prod runs an untraceable image—the provenance chain is highlighted. How do you prevent this?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-dev", 60, 120, "user", "Engineer"),
          n("n-reg", 260, 120, "storage", "Image registry"),
          n("n-prov", 260, 260, "service", "Provenance store"),
          n("n-k8s", 480, 120, "cluster", "Production"),
        ],
        edges: [
          e("e1", "n-dev", "n-reg", "Push latest"),
          e("e2", "n-reg", "n-k8s", "Deploy"),
          e("e3", "n-reg", "n-prov", "No attestation"),
        ],
      },
      incident: { nodeIds: ["n-reg", "n-prov"], edgeIds: ["e1", "e3"], headline: "Deploy bypassed signed provenance requirements" },
      referenceFix:
        "Require signed images and SBOM in admission controller, immutable digests only, link digest to git SHA in deploy API, block manual tag pushes.",
    },
    "deep.scale": {
      slug: "controller-reconcile-storm",
      title: "Deploy controller falls behind during large rollout",
      symptoms:
        "Updating 8,000 microservices caused reconcile queue depth of 2M; new deploys stuck pending for hours while controller CPU pegged.",
      interviewerSetup:
        "Single-threaded reconcile loop lists all objects every tick; no sharding or work queue prioritization.",
      opener:
        "Fleet-wide rollout choked the controller—the reconcile loop is highlighted. How do you scale control?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-api", 60, 140, "api-gateway", "Deploy API"),
          n("n-ctrl", 280, 140, "service", "Controller"),
          n("n-q", 480, 140, "queue", "Reconcile queue"),
          n("n-agents", 660, 140, "cluster", "Cluster agents"),
        ],
        edges: [
          e("e1", "n-api", "n-ctrl", "Bulk update"),
          e("e2", "n-ctrl", "n-q", "Enqueue all"),
          e("e3", "n-q", "n-agents", "Slow apply"),
        ],
      },
      incident: { nodeIds: ["n-ctrl", "n-q"], edgeIds: ["e2"], headline: "Unsharded reconcile queue cannot keep up with fleet size" },
      referenceFix:
        "Shard controllers by namespace/region, level-triggered events instead of full scans, priority queues for hotfixes, backoff and rate limits, horizontal scale with leader election.",
    },
  },
  "distributed-cache": {
    "deep.hashing": {
      slug: "mod-n-remap-storm",
      title: "Adding cache nodes causes massive remapping storm",
      symptoms:
        "Expanding the memcached ring from 20 to 22 nodes dropped hit ratio from 92% to 40% for an hour. Origin DB CPU doubled during remapping.",
      interviewerSetup:
        "Clients use naive hash mod N without consistent hashing or virtual nodes; key ownership reshuffles entirely on scale-out.",
      opener:
        "Adding two nodes melted the database—the client hashing path is highlighted. Why and how do you fix it?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "app-server", "App tier"),
          n("n-c1", 280, 80, "cache", "Cache A"),
          n("n-c2", 280, 200, "cache", "Cache B"),
          n("n-db", 480, 140, "database", "Origin DB"),
        ],
        edges: [
          e("e1", "n-app", "n-c1", "mod N keys"),
          e("e2", "n-app", "n-c2", "Remapped misses"),
          e("e3", "n-app", "n-db", "Thundering herd"),
        ],
      },
      incident: { nodeIds: ["n-app"], edgeIds: ["e1", "e2", "e3"], headline: "Mod-N hashing remaps most keys on topology change" },
      referenceFix:
        "Consistent hashing with many virtual nodes, gradual weight changes, client-side proactive migration, and warmup before cutting traffic.",
    },
    "deep.replication": {
      slug: "async-replica-serves-stale",
      title: "Users see stale settings after update",
      symptoms:
        "Feature flag updates take up to five minutes to appear. Incidents traced to reads served from async replica lagging 200k writes behind primary.",
      interviewerSetup:
        "Cache layer reads from nearest replica for latency; writes go to primary with async replication and no read-your-writes guarantee.",
      opener:
        "Config updates lag for minutes—the replication path is highlighted. How do you tighten consistency?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "app-server", "App"),
          n("n-primary", 280, 80, "cache", "Primary shard"),
          n("n-replica", 280, 200, "cache", "Async replica"),
          n("n-user", 480, 140, "user", "Users"),
        ],
        edges: [
          e("e1", "n-app", "n-primary", "Write"),
          e("e2", "n-app", "n-replica", "Read local"),
          e("e3", "n-primary", "n-replica", "Replication lag"),
          e("e4", "n-replica", "n-user", "Stale response"),
        ],
      },
      incident: { nodeIds: ["n-replica"], edgeIds: ["e2", "e4"], headline: "Local replica reads miss recent writes" },
      referenceFix:
        "Read-your-writes via primary pin or version tokens, synchronous replicate for critical keys, track replication lag and route reads, or client sticky routing.",
    },
    "deep.hotkeys": {
      slug: "celebrity-key-melts-shard",
      title: "Viral product page melts one cache shard",
      symptoms:
        "Flash sale SKU drove 500k RPS against one memcached instance while siblings idle. p99 product page latency hit 2 s though overall traffic normal.",
      interviewerSetup:
        "Hot key detection disabled; no local L1 or key splitting for mega-hot entries.",
      opener:
        "One SKU hammered a single shard—the hot key path is highlighted. What would you do mid-incident?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-users", 40, 120, "users", "Shoppers"),
          n("n-app", 220, 120, "app-server", "Product API"),
          n("n-hot", 420, 80, "cache", "Hot shard"),
          n("n-cold", 420, 200, "cache", "Other shards"),
        ],
        edges: [
          e("e1", "n-users", "n-app", "Product views"),
          e("e2", "n-app", "n-hot", "Single key"),
          e("e3", "n-app", "n-cold", "Idle"),
        ],
      },
      incident: { nodeIds: ["n-hot"], edgeIds: ["e2"], headline: "Unmitigated hot key saturates one shard" },
      referenceFix:
        "Hot key detection, local in-process cache, random suffix replicas of hot key, proactive replication, and request coalescing on miss.",
    },
    "deep.eviction": {
      slug: "ttl-sync-mass-eviction",
      title: "Synchronized TTLs cause synchronized miss storm",
      symptoms:
        "Every hour on the hour, cache hit ratio drops from 95% to 60% and database IOPS spike. Metrics show mass key expiry at :00.",
      interviewerSetup:
        "All keys set TTL at insert without jitter; cron bulk refresh resets identical expiry times.",
      opener:
        "The clock hits :00 and the DB spikes—the eviction timing path is highlighted. How do you smooth it?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "app-server", "Services"),
          n("n-cache", 280, 140, "cache", "Redis cluster"),
          n("n-db", 480, 140, "database", "Database"),
          n("n-cron", 280, 280, "service", "Refresh job"),
        ],
        edges: [
          e("e1", "n-app", "n-cache", "Reads"),
          e("e2", "n-cache", "n-db", "Hourly misses"),
          e("e3", "n-cron", "n-cache", "Align TTL"),
        ],
      },
      incident: { nodeIds: ["n-cache", "n-cron"], edgeIds: ["e2", "e3"], headline: "Correlated TTL expiry causes periodic miss storm" },
      referenceFix:
        "TTL jitter on write, stagger refresh jobs, lazy refresh before expiry, monitor expiry rate, and separate hot key TTL policy.",
    },
    "deep.membership": {
      slug: "ghost-node-receives-traffic",
      title: "Dead cache node still receives keys after slow failure",
      symptoms:
        "Intermittent cache misses and timeouts after a rack power event. Gossip still lists a dead node for 90 s while clients keep routing keys there.",
      interviewerSetup:
        "Membership propagation delay with no health checks; clients trust stale ring state.",
      opener:
        "A dead node stayed in the ring—the membership path is highlighted. How do you detect and remove it fast?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "app-server", "Clients"),
          n("n-gossip", 260, 140, "service", "Membership gossip"),
          n("n-dead", 460, 80, "cache", "Dead node"),
          n("n-live", 460, 200, "cache", "Live nodes"),
        ],
        edges: [
          e("e1", "n-app", "n-gossip", "Ring state"),
          e("e2", "n-app", "n-dead", "Stale routes"),
          e("e3", "n-gossip", "n-live", "Delayed update"),
        ],
      },
      incident: { nodeIds: ["n-gossip", "n-dead"], edgeIds: ["e1", "e2"], headline: "Stale membership routes traffic to failed node" },
      referenceFix:
        "Aggressive health probes, suspicion timeouts, client-side retry on error to alternate replicas, and faster failure detector with operator override.",
    },
  },
  "distributed-lock-service": {
    "deep.consensus": {
      slug: "split-vote-during-partition",
      title: "Network partition elects two lock masters",
      symptoms:
        "Two clients both believed they held the global inventory lock during a zone partition. Oversell of 1,200 units resulted before merge.",
      interviewerSetup:
        "Lock service uses primary-backup with manual failover lacking quorum; fence tokens not checked by storage.",
      opener:
        "Two writers thought they owned the lock—the consensus path is highlighted. How do you prevent dual masters?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 80, 80, "service", "Lock node A"),
          n("n-b", 80, 200, "service", "Lock node B"),
          n("n-q", 300, 140, "t-etcd", "Quorum store"),
          n("n-app1", 520, 80, "app-server", "Client 1"),
          n("n-app2", 520, 200, "app-server", "Client 2"),
        ],
        edges: [
          e("e1", "n-a", "n-q", "Lost quorum"),
          e("e2", "n-b", "n-q", "Split brain"),
          e("e3", "n-app1", "n-a", "Granted lock"),
          e("e4", "n-app2", "n-b", "Granted lock"),
        ],
      },
      incident: { nodeIds: ["n-a", "n-b", "n-q"], edgeIds: ["e1", "e2", "e3", "e4"], headline: "Partition caused two lock grantors without fencing" },
      referenceFix:
        "Require majority quorum for grants, monotonic fencing tokens enforced by storage, stop granting when cannot reach quorum, and lease TTL with safe renewal.",
    },
    "deep.crashed_client": {
      slug: "lock-held-after-crash",
      title: "Crashed worker holds lock until TTL expires",
      symptoms:
        "Batch pipeline stalled 30 minutes because a worker died holding the shard lock. No other worker could proceed until lease expired.",
      interviewerSetup:
        "Lock lease TTL set to 30 minutes for safety; no heartbeat or session-bound lock tied to worker liveness.",
      opener:
        "A dead worker blocked the pipeline—the lock lease path is highlighted. How do you shorten recovery?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-w1", 60, 120, "app-server", "Worker (crashed)"),
          n("n-lock", 280, 120, "service", "Lock service"),
          n("n-w2", 480, 120, "app-server", "Waiting worker"),
          n("n-store", 280, 260, "database", "Job metadata"),
        ],
        edges: [
          e("e1", "n-w1", "n-lock", "Hold lease"),
          e("e2", "n-lock", "n-w2", "Deny acquire"),
          e("e3", "n-w1", "n-store", "Stopped heartbeats"),
        ],
      },
      incident: { nodeIds: ["n-lock"], edgeIds: ["e1", "e2"], headline: "Long TTL without liveness heartbeats delays failover" },
      referenceFix:
        "Short TTL with automatic renewal while process alive, session id tied to worker health checks, watchdog to release on heartbeat loss, and fencing on storage writes.",
    },
    "deep.paused_client": {
      slug: "gc-pause-loses-lock",
      title: "Long GC pause causes duplicate work after lock expiry",
      symptoms:
        "Payment settlement job double-charged accounts after a JVM GC pause exceeded lock TTL. Two workers processed the same batch concurrently.",
      interviewerSetup:
        "Worker pauses during full GC; lock expires and another worker acquires; first worker resumes without checking lock validity.",
      opener:
        "GC pause led to double processing—the client lock handling is highlighted. What safeguards are missing?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-w1", 80, 140, "app-server", "Worker A"),
          n("n-lock", 300, 140, "service", "Lock service"),
          n("n-w2", 480, 140, "app-server", "Worker B"),
          n("n-db", 300, 280, "database", "Ledger"),
        ],
        edges: [
          e("e1", "n-w1", "n-lock", "Lease expires"),
          e("e2", "n-w2", "n-lock", "New lease"),
          e("e3", "n-w1", "n-db", "Duplicate write"),
          e("e4", "n-w2", "n-db", "Duplicate write"),
        ],
      },
      incident: { nodeIds: ["n-w1", "n-lock"], edgeIds: ["e1", "e3"], headline: "Client resumed after pause without validating lock or fencing storage" },
      referenceFix:
        "Fencing tokens on every write, stop work if lock lost, use generation counters, shorter TTL with jitter, and idempotent ledger operations.",
    },
    "deep.waiters": {
      slug: "waiter-queue-explodes",
      title: "Lock waiters pile up and timeout together",
      symptoms:
        "Black Friday checkout saw 50k threads blocked on the same promo lock; when holder released, thundering herd crashed payment service.",
      interviewerSetup:
        "Fair queue wakes all waiters at once; no limit on waiters or gradual handoff.",
      opener:
        "Everyone waited on one lock then stampeded—the waiter queue is highlighted. How do you design fair but safe waiting?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-hold", 60, 140, "app-server", "Lock holder"),
          n("n-lock", 280, 140, "service", "Lock service"),
          n("n-wait", 480, 140, "users", "Waiting clients"),
          n("n-pay", 480, 280, "microservice", "Payments"),
        ],
        edges: [
          e("e1", "n-hold", "n-lock", "Release"),
          e("e2", "n-wait", "n-lock", "Queue depth 50k"),
          e("e3", "n-wait", "n-pay", "Thundering herd"),
        ],
      },
      incident: { nodeIds: ["n-lock", "n-wait"], edgeIds: ["e2", "e3"], headline: "Broadcast wakeup of all waiters caused herd on downstream" },
      referenceFix:
        "Hand off lock to one waiter at a time, cap queue length with fail-fast, use try-lock with backoff, shard locks by promo id, and rate-limit acquirers.",
    },
    "deep.clocks": {
      slug: "clock-skew-premature-expiry",
      title: "Clock skew causes premature lock expiry",
      symptoms:
        "Rare duplicate cron runs at midnight when NTP drift caused lock service to think lease expired 400 ms early on two nodes.",
      interviewerSetup:
        "Lock expiry computed from wall clock without bounded skew tolerance; cron uses same lock name globally.",
      opener:
        "Two crons ran because locks expired early—the clock skew path is highlighted. How do you make leases safe?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-c1", 80, 80, "app-server", "Cron A"),
          n("n-c2", 80, 200, "app-server", "Cron B"),
          n("n-lock", 300, 140, "service", "Lock service"),
          n("n-ntp", 300, 280, "service", "NTP drift"),
        ],
        edges: [
          e("e1", "n-c1", "n-lock", "Acquire"),
          e("e2", "n-c2", "n-lock", "Also acquire"),
          e("e3", "n-lock", "n-ntp", "Skewed expiry"),
        ],
      },
      incident: { nodeIds: ["n-lock"], edgeIds: ["e3"], headline: "Wall-clock lease expiry unsafe under skew" },
      referenceFix:
        "Use monotonic clocks for lease duration, require bounded skew monitoring, add guard band to TTL, and fencing tokens on side effects.",
    },
  },
  "distributed-message-queue": {
    "deep.partitioning": {
      slug: "key-skew-hot-partition",
      title: "Hot customer id saturates one Kafka partition",
      symptoms:
        "Enterprise customer ingestion lagged hours while other partitions empty. Consumer lag dashboard showed partition 7 at 50M messages.",
      interviewerSetup:
        "Producer keys only on tenant id without salting; mega-tenant dominates one partition.",
      opener:
        "One tenant stalled the whole topic—the partitioning strategy is highlighted. How do you fix throughput fairness?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-prod", 60, 140, "app-server", "Producers"),
          n("n-kafka", 280, 140, "t-kafka", "Topic"),
          n("n-p7", 480, 80, "stream", "Hot partition"),
          n("n-cons", 480, 200, "service", "Consumer group"),
        ],
        edges: [
          e("e1", "n-prod", "n-kafka", "Keyed produce"),
          e("e2", "n-kafka", "n-p7", "Skewed"),
          e("e3", "n-p7", "n-cons", "Lag"),
        ],
      },
      incident: { nodeIds: ["n-kafka", "n-p7"], edgeIds: ["e1", "e2"], headline: "Partition key skew concentrates mega-tenant traffic" },
      referenceFix:
        "Compound keys with salt buckets for large tenants, dedicated topics for whales, adaptive partition count, and monitor per-partition lag SLOs.",
    },
    "deep.replication": {
      slug: "under-replicated-partition-writes",
      title: "Under-replicated partition accepted writes during rack failure",
      symptoms:
        "After a rack outage, brokers accepted produce acks with min.insync.replicas not met; consumers read truncated log losing 30 seconds of orders.",
      interviewerSetup:
        "Producer acks=1 during incident override; cluster policy allowed unclean leader election.",
      opener:
        "Orders vanished after failover—the replication and ack path is highlighted. What settings failed?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-prod", 60, 140, "app-server", "Order service"),
          n("n-lead", 280, 80, "t-kafka", "Leader broker"),
          n("n-repl", 280, 200, "t-kafka", "Offline replica"),
          n("n-cons", 480, 140, "service", "Fulfillment consumer"),
        ],
        edges: [
          e("e1", "n-prod", "n-lead", "acks=1"),
          e("e2", "n-lead", "n-repl", "Under-replicated"),
          e("e3", "n-lead", "n-cons", "Truncated log"),
        ],
      },
      incident: { nodeIds: ["n-lead", "n-repl"], edgeIds: ["e1", "e2"], headline: "Weak acks and under-replication allowed data loss on failover" },
      referenceFix:
        "Enforce acks=all with min.insync.replicas, disable unclean election, alert on under-replicated partitions, and pause producers when ISR too small.",
    },
    "deep.leaderelection": {
      slug: "flapping-leader-rebalances",
      title: "Broker leader flapping triggers constant rebalance",
      symptoms:
        "Consumer processing stalled 40% of the day as group rebalanced every few minutes when partition leaders oscillated between two brokers.",
      interviewerSetup:
        "Unstable network between racks triggers repeated leader election; consumers use long session timeout but rebalance on metadata change.",
      opener:
        "Leaders keep flipping and consumers never catch up—the election path is highlighted. How do you stabilize?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-b1", 80, 80, "t-kafka", "Broker 1"),
          n("n-b2", 80, 200, "t-kafka", "Broker 2"),
          n("n-zk", 280, 140, "t-etcd", "Controller"),
          n("n-cons", 480, 140, "service", "Consumer group"),
        ],
        edges: [
          e("e1", "n-b1", "n-zk", "Leader fight"),
          e("e2", "n-b2", "n-zk", "Leader fight"),
          e("e3", "n-zk", "n-cons", "Rebalance storm"),
        ],
      },
      incident: { nodeIds: ["n-zk", "n-cons"], edgeIds: ["e3"], headline: "Leader instability cascades to consumer rebalance storms" },
      referenceFix:
        "Fix network and broker GC, tune election backoff, use cooperative sticky assignor, increase replica lag monitoring, and isolate flaky brokers.",
    },
    "deep.offsets": {
      slug: "duplicate-processing-after-reset",
      title: "Manual offset reset duplicated week of charges",
      symptoms:
        "Operator reset consumer group offset to earliest during debugging; billing service reprocessed seven days of events duplicating invoices.",
      interviewerSetup:
        "No guardrails on offset admin API; billing consumer not idempotent.",
      opener:
        "Resetting offsets doubled charges—the consumer offset path is highlighted. How do you prevent and recover?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-op", 60, 140, "admin", "Operator"),
          n("n-kafka", 280, 140, "t-kafka", "Topic"),
          n("n-cons", 480, 140, "service", "Billing consumer"),
          n("n-db", 480, 280, "database", "Invoices"),
        ],
        edges: [
          e("e1", "n-op", "n-kafka", "Reset offsets"),
          e("e2", "n-kafka", "n-cons", "Replay week"),
          e("e3", "n-cons", "n-db", "Duplicate rows"),
        ],
      },
      incident: { nodeIds: ["n-kafka", "n-cons"], edgeIds: ["e1", "e2", "e3"], headline: "Unsafe offset reset on non-idempotent consumer" },
      referenceFix:
        "RBAC and confirmation on offset changes, idempotent processing with business keys, dry-run replay in shadow, and compacted dedupe store.",
    },
    "deep.semantics": {
      slug: "at-least-once-without-idempotency",
      title: "Retry storm duplicates shipment events",
      symptoms:
        "Warehouse shipped duplicate packages after consumer retries on transient DB errors. Exactly-once claim but no idempotency keys on write path.",
      interviewerSetup:
        "Consumer auto-commit offsets before downstream DB commit; on crash replays last batch.",
      opener:
        "Retries duplicated shipments—the delivery semantics path is highlighted. What guarantee do you actually have?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-kafka", 60, 140, "t-kafka", "Ship events"),
          n("n-cons", 280, 140, "service", "Consumer"),
          n("n-db", 480, 140, "database", "Shipments DB"),
          n("n-wh", 480, 280, "warehouse", "Fulfillment"),
        ],
        edges: [
          e("e1", "n-kafka", "n-cons", "Poll batch"),
          e("e2", "n-cons", "n-db", "Insert twice"),
          e("e3", "n-db", "n-wh", "Duplicate picks"),
        ],
      },
      incident: { nodeIds: ["n-cons", "n-db"], edgeIds: ["e2"], headline: "At-least-once consumption without idempotent writes" },
      referenceFix:
        "Transactional outbox or consume-transform-produce with EOS where supported, idempotency keys on shipment id, commit offsets after commit, and dedupe table.",
    },
  },
  "document-ingestion": {
    "deep.parsing": {
      slug: "parser-oom-on-scanned-pdf",
      title: "Scanned PDF upload OOMs parser workers",
      symptoms:
        "Ingestion queue depth hit 200k after customers bulk-uploaded 400-page scanned PDFs. Parser pods OOMKilled looping retries on the same files.",
      interviewerSetup:
        "Parser loads entire PDF into memory with OCR on main thread; no size limits or streaming page pipeline.",
      opener:
        "Bulk scans killed parser pods—the parsing pipeline is highlighted. How do you make ingestion safe?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-up", 60, 140, "client", "Upload client"),
          n("n-q", 260, 140, "queue", "Ingest queue"),
          n("n-parse", 460, 140, "service", "Parser workers"),
          n("n-blob", 460, 280, "storage", "Object storage"),
        ],
        edges: [
          e("e1", "n-up", "n-q", "Large PDFs"),
          e("e2", "n-q", "n-parse", "Unbounded"),
          e("e3", "n-parse", "n-blob", "Load whole file"),
        ],
      },
      incident: { nodeIds: ["n-parse"], edgeIds: ["e2", "e3"], headline: "Memory-unbounded parsing on huge scanned PDFs" },
      referenceFix:
        "Page-streaming OCR, file size and page caps, sandboxed workers with memory limits, dead-letter toxic docs, and async progress to users.",
    },
    "deep.versions": {
      slug: "version-fork-lost-updates",
      title: "Concurrent edits create conflicting document versions",
      symptoms:
        "Legal team sees two 'latest' versions of the same contract after parallel uploads. Search index shows both as current without merge.",
      interviewerSetup:
        "Version ids are client-generated timestamps; server accepts last write without vector clock or content hash dedupe.",
      opener:
        "Two versions both marked latest—the versioning path is highlighted. How do you linearize history?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-a", 80, 80, "desktop", "Client A"),
          n("n-b", 80, 200, "desktop", "Client B"),
          n("n-api", 300, 140, "app-server", "Doc API"),
          n("n-meta", 520, 140, "database", "Version metadata"),
        ],
        edges: [
          e("e1", "n-a", "n-api", "Upload v3"),
          e("e2", "n-b", "n-api", "Upload v3"),
          e("e3", "n-api", "n-meta", "Both latest"),
        ],
      },
      incident: { nodeIds: ["n-meta"], edgeIds: ["e3"], headline: "LWW versioning without conflict detection" },
      referenceFix:
        "Server-assigned monotonic version, optimistic concurrency tokens, branch conflicts for human merge, content-hash dedupe, and single latest pointer per doc.",
    },
    "deep.deletes": {
      slug: "tombstone-never-compacted",
      title: "Deletes not propagated to search index",
      symptoms:
        "GDPR erasure requests completed in primary store but documents still appear in search results weeks later. Tombstone stream consumer lagging 14 days.",
      interviewerSetup:
        "Delete writes tombstone to OLTP but search indexer on separate backlog without SLA; compactor job disabled.",
      opener:
        "Users deleted data but search still finds it—the delete propagation path is highlighted. What's broken?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-api", 60, 140, "app-server", "Doc API"),
          n("n-oltp", 260, 140, "database", "Primary store"),
          n("n-stream", 260, 280, "stream", "Change stream"),
          n("n-search", 480, 140, "t-elasticsearch", "Search index"),
        ],
        edges: [
          e("e1", "n-api", "n-oltp", "Tombstone write"),
          e("e2", "n-oltp", "n-stream", "CDC event"),
          e("e3", "n-stream", "n-search", "Lag 14d"),
        ],
      },
      incident: { nodeIds: ["n-stream", "n-search"], edgeIds: ["e3"], headline: "Search indexer lag left deleted docs discoverable" },
      referenceFix:
        "SLA on delete propagation, priority consumer for tombstones, periodic reconcile job, block erasure completion until index confirms, and monitor lag alerts.",
    },
    "deep.backfill": {
      slug: "backfill-overwrites-live-index",
      title: "Historical backfill clobbered live search index",
      symptoms:
        "Night backfill job rewrote entire Elasticsearch index using old snapshot, dropping a day of new documents from search.",
      interviewerSetup:
        "Backfill pipeline uses same index alias as live writer without isolated rebuild and alias swap.",
      opener:
        "Search lost a day of docs after backfill—the indexing path is highlighted. How should backfill run safely?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-live", 60, 120, "service", "Live indexer"),
          n("n-back", 60, 240, "service", "Backfill job"),
          n("n-es", 300, 140, "t-elasticsearch", "Search cluster"),
          n("n-alias", 520, 140, "service", "Index alias"),
        ],
        edges: [
          e("e1", "n-live", "n-es", "Live writes"),
          e("e2", "n-back", "n-es", "Bulk overwrite"),
          e("e3", "n-es", "n-alias", "Users query"),
        ],
      },
      incident: { nodeIds: ["n-back", "n-es"], edgeIds: ["e2"], headline: "Backfill wrote directly to live index alias" },
      referenceFix:
        "Build new index offline, dual-write or catch-up delta, atomic alias swap, freeze backfill from touching production alias, and validate doc counts before cutover.",
    },
    "deep.security": {
      slug: "malware-in-zip-bypass",
      title: "Zip bomb slipped through ingestion sandbox",
      symptoms:
        "Parser cluster outage after nested zip expanded to 800 GB logical size. Antivirus scan skipped for 'trusted' enterprise uploads.",
      interviewerSetup:
        "Sandbox trusts tenant flag bypassing depth and compression ratio checks.",
      opener:
        "One upload expanded to hundreds of GB—the security scan path is highlighted. How do you contain it?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-up", 60, 140, "client", "Enterprise uploader"),
          n("n-ing", 260, 140, "app-server", "Ingest gateway"),
          n("n-av", 260, 280, "service", "AV scanner"),
          n("n-parse", 480, 140, "container", "Parser sandbox"),
        ],
        edges: [
          e("e1", "n-up", "n-ing", "Trusted zip"),
          e("e2", "n-ing", "n-av", "Bypassed"),
          e("e3", "n-ing", "n-parse", "Expand bomb"),
        ],
      },
      incident: { nodeIds: ["n-ing", "n-parse"], edgeIds: ["e2", "e3"], headline: "Trusted bypass skipped compression bomb checks" },
      referenceFix:
        "Always enforce max depth, ratio, and extracted bytes limits, run AV in isolated workers, quota per tenant, and kill switches on anomalous expansion.",
    },
  },
  "dynamic-pricing": {
    "deep.elasticity": {
      slug: "elasticity-model-overshoot",
      title: "Price hike collapsed conversion overnight",
      symptoms:
        "Dynamic pricing raised rides 25% in a dense city; completed trips fell 40% while competitors held flat. Elasticity model trained on pre-pandemic data.",
      interviewerSetup:
        "Pricing engine applies global elasticity coefficient without segment or time-of-day adjustment; no guardrails on max delta.",
      opener:
        "Conversion crashed after an automatic price bump—the elasticity model path is highlighted. What failed?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 60, 140, "mobile", "Rider app"),
          n("n-price", 280, 140, "model-serving", "Pricing model"),
          n("n-rules", 280, 280, "service", "Rule engine"),
          n("n-trip", 480, 140, "service", "Trip service"),
        ],
        edges: [
          e("e1", "n-user", "n-price", "Quote"),
          e("e2", "n-price", "n-rules", "Apply +25%"),
          e("e3", "n-rules", "n-trip", "Low accept"),
        ],
      },
      incident: { nodeIds: ["n-price", "n-rules"], edgeIds: ["e2"], headline: "Stale elasticity estimate caused excessive price increase" },
      referenceFix:
        "Segmented elasticity with recent data, cap per-interval price change, shadow mode evaluation, rollback on conversion SLO, and human approval for large shifts.",
    },
    "deep.experiments": {
      slug: "experiment-leak-contaminated",
      title: "Pricing experiment leaked to control users",
      symptoms:
        "Finance noticed control city revenue drop matching treatment algorithm. Feature flag misconfigured to 100% rollout in neighboring geofence.",
      interviewerSetup:
        "Experiment assignment uses IP geolocation with overlapping polygons; cache serves stale assignment bucket.",
      opener:
        "Control users got treatment prices—the experiment assignment path is highlighted. How do you contain leakage?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 60, 140, "user", "Riders"),
          n("n-flag", 260, 140, "service", "Experiment service"),
          n("n-cache", 260, 280, "cache", "Assignment cache"),
          n("n-price", 480, 140, "model-serving", "Pricing engine"),
        ],
        edges: [
          e("e1", "n-user", "n-flag", "Bucket lookup"),
          e("e2", "n-flag", "n-cache", "Stale 100%"),
          e("e3", "n-flag", "n-price", "Treatment algo"),
        ],
      },
      incident: { nodeIds: ["n-flag", "n-cache"], edgeIds: ["e2", "e3"], headline: "Misconfigured geofence and cache leaked experiment" },
      referenceFix:
        "Hard isolation by user id hash, geofence validation tests, short TTL on assignment cache, real-time exposure logging, and automatic kill switch on SRM.",
    },
    "deep.smoothing": {
      slug: "price-jitter-complaints",
      title: "Quote flickers every refresh anger users",
      symptoms:
        "Support tickets spiked about 'bait price' when quotes changed 15% between two refreshes seconds apart. Smoothing filter disabled during load test leftover flag.",
      interviewerSetup:
        "Raw model output surfaced without exponential smoothing or minimum time between visible changes.",
      opener:
        "Prices jump on every refresh—the smoothing path is highlighted. How do you stabilize quotes?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "mobile", "App"),
          n("n-quote", 260, 140, "app-server", "Quote API"),
          n("n-model", 460, 140, "model-serving", "Surge model"),
          n("n-smooth", 460, 280, "service", "Smoothing (off)"),
        ],
        edges: [
          e("e1", "n-app", "n-quote", "Refresh"),
          e("e2", "n-quote", "n-model", "Raw score"),
          e("e3", "n-quote", "n-smooth", "Bypassed"),
        ],
      },
      incident: { nodeIds: ["n-quote", "n-smooth"], edgeIds: ["e2", "e3"], headline: "Disabled smoothing exposed volatile model output" },
      referenceFix:
        "Exponential smoothing with max delta per minute, sticky quote token for session, show band not point estimate, and monitor quote variance metrics.",
    },
    "deep.safeguards": {
      slug: "runaway-surge-cap-missing",
      title: "Runaway surge multiplier during outage",
      symptoms:
        "During partial dispatch outage, surge hit 8× normal while supply recovered; regulators contacted about price gouging. Hard cap feature flag off in prod.",
      interviewerSetup:
        "Surge feedback loop uses demand/supply ratio without ceiling; safeguards only in staging config.",
      opener:
        "Surge hit 8× when supply glitched—the safeguards path is highlighted. What caps were missing?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-demand", 60, 140, "stream", "Demand signal"),
          n("n-supply", 60, 280, "stream", "Supply signal"),
          n("n-surge", 300, 140, "service", "Surge calculator"),
          n("n-cap", 300, 280, "config", "Cap config"),
          n("n-user", 520, 140, "user", "Riders"),
        ],
        edges: [
          e("e1", "n-demand", "n-surge", "High demand"),
          e("e2", "n-supply", "n-surge", "Low supply glitch"),
          e("e3", "n-cap", "n-surge", "Disabled"),
          e("e4", "n-surge", "n-user", "8× price"),
        ],
      },
      incident: { nodeIds: ["n-surge", "n-cap"], edgeIds: ["e3", "e4"], headline: "Missing surge ceiling during bad supply telemetry" },
      referenceFix:
        "Hard max multiplier, anomaly detection on supply feed, manual override dashboard, regulatory caps by region, and automatic freeze on data quality alerts.",
    },
    "deep.drivers": {
      slug: "stale-supply-signal-surge",
      title: "Stale driver GPS caused false surge",
      symptoms:
        "Surge pricing activated citywide though plenty of drivers were online. Location pipeline lagged 12 minutes dropping available supply counts.",
      interviewerSetup:
        "Pricing reads aggregated supply from batch table updated every 10 minutes instead of realtime stream.",
      opener:
        "Surge fired with drivers sitting idle—the supply signal path is highlighted. Why was supply wrong?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-drivers", 40, 140, "mobile", "Driver apps"),
          n("n-gps", 240, 140, "stream", "GPS stream"),
          n("n-batch", 240, 280, "warehouse", "Batch aggregate"),
          n("n-price", 460, 140, "model-serving", "Pricing"),
        ],
        edges: [
          e("e1", "n-drivers", "n-gps", "Live locations"),
          e("e2", "n-batch", "n-price", "Stale supply"),
          e("e3", "n-gps", "n-batch", "12m lag"),
        ],
      },
      incident: { nodeIds: ["n-batch", "n-price"], edgeIds: ["e2"], headline: "Pricing consumed stale batch supply counts" },
      referenceFix:
        "Feed pricing from streaming supply with freshness SLA, fallback when lag exceeds threshold, compare stream vs batch monitors, and disable surge on stale inputs.",
    },
  },
  "ecommerce-warehouse": {
    "deep.grain": {
      slug: "duplicate-order-lines-in-fact",
      title: "Duplicate order lines inflate revenue fact table",
      symptoms:
        "Daily revenue KPI jumped 12% without sales growth. Analysts found duplicate line items per order after replaying checkout events twice.",
      interviewerSetup:
        "Fact table grain is order line but ETL dedupes only on order id not line id; at-least-once ingest replay duplicated rows.",
      opener:
        "Revenue KPI inflated—the fact grain and dedupe path is highlighted. What grain should the fact have?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-checkout", 60, 140, "stream", "Checkout events"),
          n("n-etl", 280, 140, "service", "Fact ETL"),
          n("n-fact", 480, 140, "fact-table", "Order fact"),
          n("n-bi", 480, 280, "dashboard", "Revenue KPI"),
        ],
        edges: [
          e("e1", "n-checkout", "n-etl", "Replay dupes"),
          e("e2", "n-etl", "n-fact", "Append lines"),
          e("e3", "n-fact", "n-bi", "Inflated sum"),
        ],
      },
      incident: { nodeIds: ["n-etl", "n-fact"], edgeIds: ["e1", "e2"], headline: "Wrong dedupe key duplicated fact rows" },
      referenceFix:
        "Define grain as order_line_id, idempotent merge on natural key, track ingest offsets, reconcile counts to OLTP, and assert uniqueness constraints.",
    },
    "deep.history": {
      slug: "scd2-gap-lost-history",
      title: "Product rename broke historical reporting",
      symptoms:
        "Category performance YoY report shows NULL category for half of last year after SKU merge. SCD2 effective dates have a gap day without overlap handling.",
      interviewerSetup:
        "Dimension update closed old row at midnight UTC but new row started next day leaving gap; reports use inner join.",
      opener:
        "Historical category report has holes—the SCD2 timeline is highlighted. How do you fix history?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-pim", 60, 140, "service", "Product master"),
          n("n-etl", 280, 140, "service", "SCD2 loader"),
          n("n-dim", 480, 140, "dimension-table", "Product dim"),
          n("n-rpt", 480, 280, "dashboard", "Category report"),
        ],
        edges: [
          e("e1", "n-pim", "n-etl", "Rename SKU"),
          e("e2", "n-etl", "n-dim", "Gap day"),
          e("e3", "n-dim", "n-rpt", "NULL join"),
        ],
      },
      incident: { nodeIds: ["n-dim"], edgeIds: ["e2"], headline: "SCD2 effective date gap lost dimension history" },
      referenceFix:
        "Close prior row at T, open new row at T with no gaps, use inclusive/exclusive bounds consistently, test overlap queries, and backfill gap rows.",
    },
    "deep.incremental": {
      slug: "incremental-miss-late-events",
      title: "Incremental load missed late-arriving returns",
      symptoms:
        "Weekly inventory snapshot understated returns by $2M because incremental job cut off at warehouse close while returns arrived from stores until 3 a.m.",
      interviewerSetup:
        "Incremental watermark uses batch end time without lookback window for late events.",
      opener:
        "Returns after midnight never landed—the incremental watermark is highlighted. How do you handle lateness?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-pos", 60, 140, "stream", "Store returns"),
          n("n-inc", 280, 140, "service", "Incremental job"),
          n("n-wh", 480, 140, "warehouse", "Inventory mart"),
          n("n-clock", 280, 280, "service", "Cutoff watermark"),
        ],
        edges: [
          e("e1", "n-pos", "n-inc", "Late events"),
          e("e2", "n-clock", "n-inc", "Hard cutoff"),
          e("e3", "n-inc", "n-wh", "Undercount"),
        ],
      },
      incident: { nodeIds: ["n-inc", "n-clock"], edgeIds: ["e2"], headline: "Strict watermark excluded late-arriving facts" },
      referenceFix:
        "Sliding lookback window, merge job for corrections, event-time vs processing-time watermarks, and monitor lateness histogram.",
    },
    "deep.refunds": {
      slug: "refund-double-count",
      title: "Refunds counted as revenue and adjustment",
      symptoms:
        "Finance close double-subtracted refunds appearing in both gross revenue and refund fact without netting logic. Net revenue off by $800k for the month.",
      interviewerSetup:
        "Separate refund stream loaded into same metric column as positive orders; reports sum both without sign convention.",
      opener:
        "Refunds hit revenue twice—the refund modeling path is highlighted. How should facts represent refunds?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-orders", 60, 120, "stream", "Orders"),
          n("n-ref", 60, 240, "stream", "Refunds"),
          n("n-etl", 300, 140, "service", "Transform"),
          n("n-fact", 520, 140, "fact-table", "Sales fact"),
        ],
        edges: [
          e("e1", "n-orders", "n-etl", "Positive"),
          e("e2", "n-ref", "n-etl", "Also positive column"),
          e("e3", "n-etl", "n-fact", "Double impact"),
        ],
      },
      incident: { nodeIds: ["n-etl", "n-fact"], edgeIds: ["e2", "e3"], headline: "Refunds loaded with wrong sign and double counted" },
      referenceFix:
        "Model refunds as negative facts or separate adjustment table with clear join keys, net metrics view, reconciliation to payments ledger, and unit tests on sign.",
    },
    "deep.layout": {
      slug: "wide-table-scan-cost",
      title: "Ad-hoc query scan cost exploded after wide denormalized table",
      symptoms:
        "Analyst query costs 10× after mart denormalized 300 columns into one table. BigQuery bytes scanned per dashboard refresh exceeded budget.",
      interviewerSetup:
        "Layout optimized for single-table convenience without clustering or column pruning; dashboards select star.",
      opener:
        "Queries scan terabytes after the wide mart change—the table layout path is highlighted. How would you reorganize?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-bi", 60, 140, "dashboard", "Looker dashboards"),
          n("n-wide", 280, 140, "fact-table", "Wide mart"),
          n("n-star", 280, 280, "warehouse", "Star schema"),
          n("n-engine", 480, 140, "t-bigquery", "Query engine"),
        ],
        edges: [
          e("e1", "n-bi", "n-engine", "SELECT *"),
          e("e2", "n-engine", "n-wide", "Full scan"),
          e("e3", "n-star", "n-wide", "Bypassed"),
        ],
      },
      incident: { nodeIds: ["n-wide"], edgeIds: ["e2"], headline: "Wide denormalized layout forced massive scans" },
      referenceFix:
        "Return to star schema or nested records, partition and cluster on filter columns, expose curated narrow views, and enforce SELECT column lists in BI.",
    },
  },
  "eta-prediction": {
    "deep.features": {
      slug: "stale-traffic-features",
      title: "ETA wrong after sudden road closure",
      symptoms:
        "ETAs underestimated by 18 minutes across a corridor after bridge closure. Traffic feature pipeline still served pre-closure speeds for 45 minutes.",
      interviewerSetup:
        "Online features refresh every 30 minutes from batch table; closure events not wired to streaming override.",
      opener:
        "Drivers routed into a closed bridge—the traffic feature path is highlighted. How do you freshness-fix ETAs?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-map", 60, 140, "service", "Routing requests"),
          n("n-fs", 280, 140, "feature-store", "Feature store"),
          n("n-batch", 280, 280, "warehouse", "Traffic batch"),
          n("n-model", 480, 140, "model-serving", "ETA model"),
        ],
        edges: [
          e("e1", "n-map", "n-model", "Predict"),
          e("e2", "n-model", "n-fs", "Segment speeds"),
          e("e3", "n-fs", "n-batch", "Stale 45m"),
        ],
      },
      incident: { nodeIds: ["n-fs", "n-batch"], edgeIds: ["e3"], headline: "Batch traffic features lagged real-world closure" },
      referenceFix:
        "Stream closure and incident feeds into online store, lower TTL on corridor features, fallback to live probe data, and alert when feature age exceeds SLO.",
    },
    "deep.uncertainty": {
      slug: "overconfident-narrow-window",
      title: "Overconfident ETA window anger customers",
      symptoms:
        "Complaints rose when meals arrived outside the 5-minute quoted window though model RMSE was fine. Interval always ±3 minutes regardless of route variance.",
      interviewerSetup:
        "Serving returns point estimate with fixed margin; quantile model outputs ignored in API layer.",
      opener:
        "Customers distrust ETAs—the uncertainty presentation path is highlighted. How should intervals work?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 60, 140, "mobile", "Customer app"),
          n("n-api", 260, 140, "app-server", "ETA API"),
          n("n-model", 460, 140, "model-serving", "Quantile model"),
          n("n-fix", 460, 280, "service", "Fixed ±3m"),
        ],
        edges: [
          e("e1", "n-user", "n-api", "Show ETA"),
          e("e2", "n-api", "n-model", "p50 only"),
          e("e3", "n-api", "n-fix", "Fixed band"),
        ],
      },
      incident: { nodeIds: ["n-api", "n-fix"], edgeIds: ["e3"], headline: "Fixed uncertainty band ignored route-specific variance" },
      referenceFix:
        "Serve p10/p90 from quantile model, widen on long routes and bad weather features, calibrate intervals to hit coverage targets, and show honest ranges in UI.",
    },
    "deep.searchscale": {
      slug: "route-matrix-timeout",
      title: "Batch route matrix job timeouts at city scale",
      symptoms:
        "Nightly ETA retrain failed after city expansion; all-pairs shortest path matrix exceeded memory on single Spark driver.",
      interviewerSetup:
        "Matrix built globally in one stage without graph partitioning or hierarchical contraction.",
      opener:
        "City scale broke the route matrix job—the search scale path is highlighted. How do you scale graph features?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-graph", 60, 140, "database", "Road graph"),
          n("n-spark", 280, 140, "t-spark", "Spark job"),
          n("n-mat", 480, 140, "storage", "Distance matrix"),
          n("n-train", 480, 280, "training", "Retrain"),
        ],
        edges: [
          e("e1", "n-graph", "n-spark", "All-pairs"),
          e("e2", "n-spark", "n-mat", "OOM"),
          e("e3", "n-mat", "n-train", "Blocked"),
        ],
      },
      incident: { nodeIds: ["n-spark"], edgeIds: ["e1", "e2"], headline: "Monolithic all-pairs matrix exceeded compute limits" },
      referenceFix:
        "Partition graph by region, use contraction hierarchies or sampling for far pairs, incremental updates for changed edges, and distributed storage of blocks.",
    },
    "deep.model": {
      slug: "train-serve-skew",
      title: "Training-serving skew on route encoding",
      symptoms:
        "Live ETA bias spiked after deploy though offline eval looked good. Serving hash encodes road segments differently than training pipeline after library upgrade.",
      interviewerSetup:
        "Training uses Python 3.10 feature job; serving C++ encoder lags one version on polyline splitting.",
      opener:
        "Offline metrics fine but live ETAs biased—the train/serve path is highlighted. Where is skew?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-train", 60, 140, "training", "Training pipeline"),
          n("n-reg", 280, 140, "model-registry", "Registry"),
          n("n-serve", 480, 140, "model-serving", "Online scorer"),
          n("n-enc", 480, 280, "service", "Route encoder"),
        ],
        edges: [
          e("e1", "n-train", "n-reg", "Publish"),
          e("e2", "n-reg", "n-serve", "Deploy"),
          e("e3", "n-serve", "n-enc", "Different hash"),
        ],
      },
      incident: { nodeIds: ["n-serve", "n-enc"], edgeIds: ["e3"], headline: "Encoder version mismatch between train and serve" },
      referenceFix:
        "Shared feature spec artifact, contract tests on sample routes in CI, shadow compare train vs serve outputs, and block deploy on skew alerts.",
    },
    "deep.monitoring": {
      slug: "silent-drift-unalerted",
      title: "ETA drift went unalerted for two weeks",
      symptoms:
        "Mean absolute error crept up 30% over two weeks after map vendor change. Monitoring dashboard only tracked p95 latency not error vs actuals.",
      interviewerSetup:
        "Ground truth feedback loop broken when trip completion events stopped emitting to metrics topic.",
      opener:
        "ETAs got worse but nobody noticed—the monitoring path is highlighted. What should alert?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-trip", 60, 140, "stream", "Completed trips"),
          n("n-metrics", 280, 140, "metrics", "Quality metrics"),
          n("n-dash", 480, 140, "dashboard", "Ops dashboard"),
          n("n-model", 480, 280, "model-serving", "ETA service"),
        ],
        edges: [
          e("e1", "n-trip", "n-metrics", "Broken feed"),
          e("e2", "n-metrics", "n-dash", "Latency only"),
          e("e3", "n-model", "n-dash", "Green p95"),
        ],
      },
      incident: { nodeIds: ["n-metrics"], edgeIds: ["e1", "e2"], headline: "Missing ground-truth feed left accuracy unmonitored" },
      referenceFix:
        "Stream actual vs predicted into error metrics by segment, alert on drift, page when feedback pipeline stalls, and weekly calibration reviews.",
    },
  },
  "etl-framework": {
    "deep.idempotency": {
      slug: "retry-duplicates-fact-rows",
      title: "Framework retry duplicated warehouse rows",
      symptoms:
        "Job retry after worker kill inserted duplicate fact rows doubling inventory counts. Framework marks stage complete before commit flush.",
      interviewerSetup:
        "ETL framework retries entire batch without idempotent write keys; destination lacks merge semantics.",
      opener:
        "A retry doubled rows—the idempotent write path is highlighted. How should the framework behave?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-worker", 60, 140, "service", "ETL worker"),
          n("n-fw", 280, 140, "service", "ETL framework"),
          n("n-stage", 480, 140, "database", "Stage table"),
          n("n-wh", 480, 280, "warehouse", "Fact table"),
        ],
        edges: [
          e("e1", "n-fw", "n-worker", "Retry batch"),
          e("e2", "n-worker", "n-stage", "Write"),
          e("e3", "n-stage", "n-wh", "Append dupes"),
        ],
      },
      incident: { nodeIds: ["n-fw", "n-worker"], edgeIds: ["e1", "e3"], headline: "Non-idempotent retry duplicated committed facts" },
      referenceFix:
        "Exactly-once semantics via merge on run id and natural keys, two-phase commit, mark job complete only after publish, and dedupe tests in framework.",
    },
    "deep.backfilling": {
      slug: "backfill-starves-live-jobs",
      title: "Historical backfill starved live SLA jobs",
      symptoms:
        "Same-day sales mart missed SLA while backfill consumed all Spark executors for 48 hours. Live jobs queued behind low-priority backfill flag mis-set.",
      interviewerSetup:
        "Shared cluster without fair scheduler; backfill submitted with default high priority.",
      opener:
        "Live pipelines missed SLA during backfill—the scheduler path is highlighted. How do you isolate workloads?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-live", 60, 120, "service", "Live ETL jobs"),
          n("n-back", 60, 240, "service", "Backfill job"),
          n("n-sched", 300, 140, "service", "Cluster scheduler"),
          n("n-spark", 520, 140, "t-spark", "Spark cluster"),
        ],
        edges: [
          e("e1", "n-back", "n-sched", "High priority"),
          e("e2", "n-live", "n-sched", "Starved"),
          e("e3", "n-sched", "n-spark", "All executors"),
        ],
      },
      incident: { nodeIds: ["n-sched"], edgeIds: ["e1", "e2"], headline: "Backfill priority starved live ETL on shared cluster" },
      referenceFix:
        "Separate pools or queues, cap backfill concurrency, preemptible lower priority, schedule backfill off-peak, and SLO alerts on live job wait time.",
    },
    "deep.isolation": {
      slug: "noisy-neighbor-oom",
      title: "Noisy neighbor job OOM killed critical pipeline",
      symptoms:
        "Payments fact job killed when adjacent team's experimental job spiked memory on shared Kubernetes node without limits.",
      interviewerSetup:
        "ETL workers share nodes without resource quotas or cgroup limits; framework spawns unlimited Python workers per job.",
      opener:
        "A sandbox job took down payments ETL—the isolation path is highlighted. How do you isolate tenants?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-pay", 60, 120, "service", "Payments ETL"),
          n("n-exp", 60, 240, "service", "Experimental job"),
          n("n-k8s", 300, 140, "t-kubernetes", "Worker node"),
          n("n-fw", 520, 140, "service", "ETL framework"),
        ],
        edges: [
          e("e1", "n-exp", "n-k8s", "Memory spike"),
          e("e2", "n-pay", "n-k8s", "OOM killed"),
          e("e3", "n-fw", "n-k8s", "No limits"),
        ],
      },
      incident: { nodeIds: ["n-k8s"], edgeIds: ["e1", "e2"], headline: "Missing resource isolation allowed noisy neighbor failure" },
      referenceFix:
        "Per-job CPU/memory limits, separate node pools for prod vs sandbox, OOM retry with backoff, and quota enforcement in framework submit API.",
    },
    "deep.lineage": {
      slug: "unknown-upstream-change",
      title: "Silent upstream rename broke downstream KPI",
      symptoms:
        "Marketing funnel KPI flatlined after upstream renamed event field. ETL framework lineage graph outdated; no impact analysis ran on schema change.",
      interviewerSetup:
        "Lineage captured once at deploy; producer schema evolved without notification hook to framework.",
      opener:
        "A renamed field zeroed a KPI—the lineage and impact path is highlighted. How do you prevent surprise breaks?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-prod", 60, 140, "stream", "Event producer"),
          n("n-line", 260, 140, "service", "Lineage graph"),
          n("n-etl", 460, 140, "service", "ETL job"),
          n("n-kpi", 660, 140, "dashboard", "Funnel KPI"),
        ],
        edges: [
          e("e1", "n-prod", "n-etl", "Renamed field"),
          e("e2", "n-prod", "n-line", "Not updated"),
          e("e3", "n-etl", "n-kpi", "Null funnel"),
        ],
      },
      incident: { nodeIds: ["n-line"], edgeIds: ["e2"], headline: "Stale lineage missed downstream impact of schema rename" },
      referenceFix:
        "Live lineage from registry webhooks, automated impact reports on schema change, contract tests in framework CI, and block producer deploy breaking subscribers.",
    },
    "deep.credentials": {
      slug: "rotated-secret-broke-jobs",
      title: "Credential rotation broke all nightly jobs",
      symptoms:
        "Every warehouse load failed at midnight after DB password rotation. Framework still mounted old secret volume until manual pod restart.",
      interviewerSetup:
        "Long-lived pods cache credentials at startup; secret manager rotated but Kubernetes secret update not wired to reload.",
      opener:
        "Password rotated and every job failed—the credentials path is highlighted. How should ETL pick up rotation?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-vault", 60, 140, "t-vault", "Secret store"),
          n("n-k8s", 260, 140, "t-kubernetes", "Job pods"),
          n("n-fw", 460, 140, "service", "ETL framework"),
          n("n-db", 460, 280, "database", "Warehouse"),
        ],
        edges: [
          e("e1", "n-vault", "n-k8s", "New secret"),
          e("e2", "n-k8s", "n-fw", "Cached old pwd"),
          e("e3", "n-fw", "n-db", "Auth fail"),
        ],
      },
      incident: { nodeIds: ["n-k8s", "n-fw"], edgeIds: ["e2", "e3"], headline: "Long-lived workers kept stale DB credentials after rotation" },
      referenceFix:
        "Fetch credentials per job or reload on SIGHUP, use short-lived tokens, restart workers on secret version change, and canary job after rotation.",
    },
  },
  "experimentation-analytics": {
    "deep.exposure": {
      slug: "exposure-logging-gap",
      title: "Experiment exposure undercounted breaking analysis",
      symptoms:
        "Launch review showed neutral results but product saw lift. Exposure logs dropped 35% of mobile sessions after SDK upgrade missed assignment callback.",
      interviewerSetup:
        "Analysis joins outcomes to exposure table with inner join; missing exposure rows treated as never exposed.",
      opener:
        "Results look flat but product metrics moved—the exposure logging path is highlighted. What bias crept in?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-app", 60, 140, "mobile", "Mobile app"),
          n("n-assign", 260, 140, "service", "Assignment svc"),
          n("n-exp", 260, 280, "stream", "Exposure log"),
          n("n-an", 480, 140, "service", "Experiment analysis"),
        ],
        edges: [
          e("e1", "n-app", "n-assign", "Bucket"),
          e("e2", "n-assign", "n-exp", "Missing callback"),
          e("e3", "n-exp", "n-an", "Inner join bias"),
        ],
      },
      incident: { nodeIds: ["n-exp"], edgeIds: ["e2", "e3"], headline: "Under-logged exposure biased experiment analysis" },
      referenceFix:
        "Log exposure at assignment time with retry, monitor exposure/outcome ratio, use intent-to-treat analysis, and alert when exposure rate drops vs traffic.",
    },
    "deep.aggregates": {
      slug: "wrong-ratio-metric",
      title: "Click-through computed with wrong denominator",
      symptoms:
        "Experiment declared winner on 20% CTR lift but metric divided clicks by sessions instead of impressions, overstating lift for heavy users.",
      interviewerSetup:
        "Aggregate job reused session-level rollup for an impression-based metric; analysts did not validate definition.",
      opener:
        "The winning variant looks too good—the aggregate definition is highlighted. Is CTR computed correctly?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-events", 60, 140, "stream", "Click events"),
          n("n-agg", 280, 140, "service", "Aggregate job"),
          n("n-wh", 480, 140, "warehouse", "Experiment mart"),
          n("n-dash", 480, 280, "dashboard", "Results dashboard"),
        ],
        edges: [
          e("e1", "n-events", "n-agg", "Rollup"),
          e("e2", "n-agg", "n-wh", "Wrong ratio"),
          e("e3", "n-wh", "n-dash", "False winner"),
        ],
      },
      incident: { nodeIds: ["n-agg", "n-wh"], edgeIds: ["e2"], headline: "Incorrect denominator inflated treatment lift" },
      referenceFix:
        "Document metric definitions, unit tests on sample data, separate impression and session grains, peer review before launch readout, and reconcile to source counts.",
    },
    "deep.srm": {
      slug: "sample-ratio-mismatch",
      title: "Sample ratio mismatch invalidated experiment",
      symptoms:
        "After launch, chi-square test shows 54/46 split instead of 50/50 with p-value 0.001. Browser bug sent more Chrome users to treatment.",
      interviewerSetup:
        "Assignment hash accidentally included user-agent in salt for one variant bucket; SRM check ran manually weekly not continuously.",
      opener:
        "Traffic split isn't 50/50—the assignment path is highlighted. How do you detect and handle SRM?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-user", 60, 140, "client", "Browsers"),
          n("n-assign", 280, 140, "service", "Assignment"),
          n("n-log", 480, 140, "stream", "Exposure log"),
          n("n-check", 480, 280, "service", "SRM monitor"),
        ],
        edges: [
          e("e1", "n-user", "n-assign", "Skewed hash"),
          e("e2", "n-assign", "n-log", "Imbalanced"),
          e("e3", "n-log", "n-check", "Late detect"),
        ],
      },
      incident: { nodeIds: ["n-assign"], edgeIds: ["e1", "e2"], headline: "Biased assignment hash caused sample ratio mismatch" },
      referenceFix:
        "Stable hash on user id only, automated continuous SRM tests, halt experiment on mismatch, and root-cause assignment bugs before trusting lifts.",
    },
    "deep.peeking": {
      slug: "peeking-stopped-early",
      title: "Peeking at results stopped experiment too early",
      symptoms:
        "Team stopped experiment at 95% significance day three; effect disappeared by week two. No sequential testing correction applied.",
      interviewerSetup:
        "Dashboard refreshes p-values daily; PM instructed to ship on first significant day.",
      opener:
        "You peeked daily and shipped early—the analysis policy path is highlighted. Why is that dangerous?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-dash", 60, 140, "dashboard", "Live results"),
          n("n-stats", 280, 140, "service", "Stats engine"),
          n("n-exp", 480, 140, "experiment", "Experiment"),
          n("n-pm", 480, 280, "user", "PM"),
        ],
        edges: [
          e("e1", "n-exp", "n-stats", "Daily p-value"),
          e("e2", "n-stats", "n-dash", "Significant day 3"),
          e("e3", "n-dash", "n-pm", "Stop early"),
        ],
      },
      incident: { nodeIds: ["n-stats", "n-dash"], edgeIds: ["e2", "e3"], headline: "Repeated peeking without correction inflated false positive rate" },
      referenceFix:
        "Pre-register fixed horizon or sequential methods, hide daily p-values from decision makers, require minimum runtime, and use holdout validation after ship.",
    },
    "deep.identity": {
      slug: "cross-device-double-count",
      title: "Same user counted twice across devices",
      symptoms:
        "Experiment exposure counts exceeded unique users by 22% because assignment used device id while outcomes joined on account id created after login.",
      interviewerSetup:
        "Anonymous browsing assigns bucket on device; conversion logged on account without stable identity bridge.",
      opener:
        "Exposure and outcomes don't line up on identity—the join path is highlighted. How do you unify users?",
      diagram: {
        viewport: vp,
        nodes: [
          n("n-dev", 60, 120, "mobile", "Device id"),
          n("n-acct", 60, 240, "user", "Account id"),
          n("n-id", 280, 140, "service", "Identity graph"),
          n("n-an", 480, 140, "service", "Analysis"),
        ],
        edges: [
          e("e1", "n-dev", "n-an", "Exposure"),
          e("e2", "n-acct", "n-an", "Outcomes"),
          e("e3", "n-id", "n-an", "Not used"),
        ],
      },
      incident: { nodeIds: ["n-an"], edgeIds: ["e1", "e2"], headline: "Mismatched identity keys biased experiment joins" },
      referenceFix:
        "Assign on stable user id with anonymous cookie bridge, identity graph linking device to account, intent-to-treat on assignment id, and monitor join rates.",
    },
  },
};
