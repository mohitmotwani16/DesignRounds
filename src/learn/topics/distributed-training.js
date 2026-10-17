export default {
  blocks: [
    { type: "p", text: "**Distributed training** spreads model training across many GPUs or machines, either because the data is too large to process in reasonable time on one device or because the model itself doesn't fit in one device's memory. The main strategies are **data parallelism** (every worker has a full copy of the model and trains on different data), **model or tensor parallelism** (each worker holds part of each layer) and **pipeline parallelism** (each worker holds different layers). Large models combine all three." },

    { type: "h2", text: "Data parallelism" },
    { type: "p", text: "Each worker holds a full copy of the model, processes a different slice of each batch, computes gradients, and then all workers **average their gradients** before updating the weights, so every copy stays identical. The averaging step is an **all-reduce**, usually implemented as a ring or tree over fast interconnects so each worker sends and receives about the same amount of data regardless of how many workers there are." },
    { type: "diagram", kind: "flow", caption: "Synchronous data parallelism: workers compute gradients on different shards of the batch, all-reduce them, then apply the same update.", nodes: [
      { id: "data", label: "Training data", sub: "sharded", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "w1", label: "GPU 1", sub: "full model", col: 1.4, row: 0 },
      { id: "w2", label: "GPU 2", sub: "full model", col: 1.4, row: 1 },
      { id: "w3", label: "GPU 3", sub: "full model", col: 1.4, row: 2 },
      { id: "ar", label: "All-reduce", sub: "average gradients", col: 2.8, row: 1, tone: "accent" },
      { id: "ck", label: "Checkpoints", sub: "object storage", col: 4.1, row: 1, shape: "db", tone: "cache" },
    ], edges: [
      { from: "data", to: "w1" }, { from: "data", to: "w2" }, { from: "data", to: "w3" },
      { from: "w1", to: "ar" }, { from: "w2", to: "ar" }, { from: "w3", to: "ar" }, { from: "ar", to: "ck", dashed: true, label: "periodic" },
    ] },
    { type: "ul", items: [
      "**Synchronous** training (all workers wait for the all-reduce) is the norm: it's deterministic and converges like single-device training with a larger batch.",
      "Scaling the global batch usually requires adjusting the learning rate and warm-up.",
      "The slowest worker sets the pace (**stragglers**), so homogeneous hardware and balanced data loading matter.",
    ] },

    { type: "h2", text: "When the model doesn't fit: sharding and model parallelism" },
    { type: "table", head: ["Technique", "What's split", "Cost"], rows: [
      ["Sharded data parallelism (ZeRO, FSDP)", "Optimizer state, gradients and optionally weights are sharded across data-parallel workers and gathered when needed", "Extra communication; often the first step for models that almost fit"],
      ["Tensor (model) parallelism", "Each layer's matrices are split across devices, which compute parts of every layer", "Heavy communication every layer; needs very fast links, usually within one machine"],
      ["Pipeline parallelism", "Groups of layers live on different devices; micro-batches flow through like an assembly line", "Pipeline bubbles (idle time) at the start and end of each batch"],
      ["Mixed precision and activation checkpointing", "Lower-precision numbers; recompute activations instead of storing them", "Some compute overhead for large memory savings"],
    ] },
    { type: "p", text: "Very large models use **3D parallelism**: tensor parallelism within a machine, pipeline parallelism across a few machines, and data parallelism across groups of those." },

    { type: "h2", text: "Input pipelines" },
    { type: "p", text: "Accelerators are expensive, and an idle GPU waiting for data is wasted money. Prefetch and decode data in parallel with training, store training data in large sequential files or shards rather than millions of small objects, shuffle across shards, and make sure each worker reads a disjoint shard of each epoch." },

    { type: "h2", text: "Failures and checkpointing" },
    { type: "p", text: "With thousands of GPUs running for weeks, hardware failures are routine. A synchronous job stops when any worker fails, so recovery is built around **checkpoints**:" },
    { type: "ul", items: [
      "Save model weights, optimizer state, data-loader position and random seeds periodically to durable storage.",
      "Choose the interval from the failure rate: checkpoint too rarely and a failure loses hours; too often and saving dominates. Asynchronous and sharded checkpointing reduce the pause.",
      "Restart automatically on healthy nodes, ideally with spare capacity on standby, and resume from the last checkpoint.",
      "Detect slow or faulty nodes (not just dead ones) and replace them, since one bad GPU slows every step.",
    ] },

    { type: "h2", text: "The training platform around it" },
    { type: "ul", items: [
      "**Scheduling:** gang scheduling (all workers of a job start together), quotas per team, and topology-aware placement on well-connected nodes.",
      "**Reproducibility:** record code version, data snapshot, configuration and seeds for each run in an [experiment tracker and model registry](/learn/mlops-model-registry).",
      "**Cost control:** preemptible capacity for fault-tolerant jobs, utilisation dashboards, and stopping runs whose loss curves have diverged.",
    ] },
  ],
  uses: [
    { name: "Large language models", text: "Combine tensor, pipeline and sharded data parallelism across thousands of accelerators with frequent checkpoints." },
    { name: "Recommendation models", text: "Huge embedding tables are sharded across devices while the dense layers use data parallelism." },
    { name: "Vision and speech models", text: "Data parallelism across a few machines speeds up training on large datasets." },
  ],
  interview: [
    "Start with data parallelism and explain all-reduce.",
    "Move to sharding, tensor or pipeline parallelism only when the model doesn't fit.",
    "Design checkpointing and automatic restart from the failure rate.",
    "Keep accelerators busy with a fast input pipeline and gang scheduling.",
  ],
  related: ["mlops-model-registry", "machine-learning-system-architecture", "model-serving", "object-storage", "llm-inference-serving"],
  practice: ["training-platform"],
  reading: [
    { title: "PyTorch: Getting started with Fully Sharded Data Parallel", publisher: "PyTorch documentation", url: "https://pytorch.org/tutorials/intermediate/FSDP_tutorial.html" },
    { title: "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models", publisher: "Rajbhandari et al., arXiv", url: "https://arxiv.org/abs/1910.02054" },
  ],
};
