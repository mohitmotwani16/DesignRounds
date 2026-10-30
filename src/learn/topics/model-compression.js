export default {
  blocks: [
    { type: "p", text: "**Model compression** makes a trained model smaller and faster so it fits a latency budget, runs on cheaper hardware or ships to a phone. The three main techniques are **quantization** (fewer bits per number), **pruning** (fewer weights) and **knowledge distillation** (a small model learns from a big one). In system design they are how you answer \"this model is too slow or too expensive to serve\" without giving up the model." },

    { type: "h2", text: "Why compress" },
    { type: "ul", items: [
      "**Latency:** a ranker scoring 500 candidates in 30 ms, or an LLM generating tokens fast enough to stream.",
      "**Cost:** serving cost scales with compute and memory; a 4× smaller model can mean a quarter of the GPUs.",
      "**Memory:** large embedding tables or LLM weights may not fit on one device without it.",
      "**On-device ML:** keyboards, cameras and offline features need models of a few megabytes that run on a phone's NPU.",
    ] },

    { type: "h2", text: "Quantization" },
    { type: "p", text: "Store weights (and sometimes activations) in lower precision: from 32-bit floats to 16-bit, 8-bit or 4-bit numbers. Memory and bandwidth shrink proportionally, and integer arithmetic is faster on most accelerators." },
    { type: "diagram", kind: "bars", caption: "Weight memory for a 7-billion-parameter model at different precisions. Halving the bits halves the memory, which is often the difference between needing two GPUs and one.", unit: "GB", values: [
      { label: "FP32", value: 28, display: "28 GB", tone: "danger" },
      { label: "FP16 / BF16", value: 14, display: "14 GB", tone: "cache" },
      { label: "INT8", value: 7, display: "7 GB", tone: "store" },
      { label: "INT4", value: 3.5, display: "3.5 GB", tone: "ok" },
    ] },
    { type: "table", head: ["Approach", "How", "Trade-off"], rows: [
      ["Post-training quantization (PTQ)", "Quantize a trained model, calibrating ranges on a small sample of data", "Minutes of work; small accuracy loss at 8 bits, more at 4 bits"],
      ["Quantization-aware training (QAT)", "Simulate low precision during training so the model adapts", "Best accuracy at low bits; needs a training run"],
      ["Weight-only quantization", "Quantize weights, keep activations in 16-bit", "Common for LLMs, where loading weights is the bottleneck"],
      ["Mixed precision", "Keep sensitive layers (first, last, outlier channels) in higher precision", "Recovers accuracy at a small size cost"],
    ] },

    { type: "h2", text: "Pruning" },
    { type: "p", text: "Remove weights that contribute little. **Unstructured pruning** zeroes individual weights (high sparsity, but needs sparse kernels to see a speed-up). **Structured pruning** removes whole neurons, attention heads, channels or layers, which shrinks the dense model and speeds it up on ordinary hardware. Prune gradually and fine-tune afterwards to recover accuracy." },

    { type: "h2", text: "Knowledge distillation" },
    { type: "p", text: "Train a small **student** to imitate a large **teacher**. The student learns from the teacher's soft probabilities (\"70% cat, 25% fox\"), which carry more information than hard labels, and often reaches most of the teacher's quality at a fraction of the size. The teacher can also label unlabelled data, giving the student far more training examples." },
    { type: "diagram", kind: "flow", caption: "Distillation: the student is trained on both the true labels and the teacher's soft predictions. Only the student is served.", nodes: [
      { id: "data", label: "Training data", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "t", label: "Teacher", sub: "large, slow", col: 1.4, row: 0, tone: "muted" },
      { id: "s", label: "Student", sub: "small, fast", col: 1.4, row: 2, tone: "accent" },
      { id: "soft", label: "Soft targets", col: 2.8, row: 0, shape: "pill" },
      { id: "loss", label: "Combined loss", sub: "labels + soft targets", col: 2.8, row: 2, tone: "accent", w: 160 },
      { id: "serve", label: "Serve the student", col: 4.3, row: 2, tone: "ok", shape: "pill" },
    ], edges: [
      { from: "data", to: "t" }, { from: "data", to: "s" }, { from: "t", to: "soft" }, { from: "soft", to: "loss" }, { from: "s", to: "loss" }, { from: "loss", to: "s", dashed: true, label: "update" }, { from: "s", to: "serve" },
    ] },

    { type: "h2", text: "Other ways to cut serving cost" },
    { type: "ul", items: [
      "**Cascades:** a small model handles easy cases and passes uncertain ones to a big model; see [two-stage processing](/learn/two-stage-processing).",
      "**Caching** predictions or embeddings for repeated inputs.",
      "**Compiled runtimes** (ONNX Runtime, TensorRT and similar) that fuse operations for the target hardware.",
      "**Batching** requests on GPUs; see [model serving](/learn/model-serving).",
      "**Low-rank factorisation** of large weight matrices.",
    ] },

    { type: "h2", text: "On-device vs server-side" },
    { type: "table", head: ["", "On-device", "Server-side"], rows: [
      ["Latency", "No network round trip", "Network plus queueing"],
      ["Privacy", "Data stays on the phone", "Data sent to servers"],
      ["Model size", "Megabytes; heavily compressed", "Gigabytes are fine"],
      ["Updates", "Ship with app releases or downloads", "Deploy any time"],
      ["Cost", "User's battery and chip", "Your servers"],
    ] },
    { type: "p", text: "Hybrid designs are common: a small on-device model for instant suggestions, a larger server model when the network allows." },

    { type: "h2", text: "Validating a compressed model" },
    { type: "ol", items: [
      "Compare offline metrics with the original on the same test set, overall **and per slice**; compression often hurts rare classes first.",
      "Check calibration; quantized models can shift probabilities.",
      "Measure real latency and memory on the target hardware at production batch sizes.",
      "Shadow-test against the uncompressed model before switching traffic.",
    ] },
  ],
  uses: [
    { name: "LLM serving", text: "Weight-only 8-bit and 4-bit quantization lets large models fit on fewer GPUs; see [LLM serving](/learn/llm-inference-serving)." },
    { name: "Mobile keyboards and cameras", text: "Distilled, quantized models run on the phone's neural processor for instant, private predictions." },
    { name: "Ranking", text: "A distilled ranker replaces a heavy one inside a tight latency budget, with the heavy model used only offline as teacher." },
  ],
  interview: [
    "When latency or cost is too high, propose quantization, distillation or a cascade before a weaker model.",
    "Quote the memory arithmetic: parameters × bytes per parameter.",
    "Say how you'd validate accuracy per slice and calibration after compressing.",
    "Weigh on-device against server-side for latency, privacy and update speed.",
  ],
  related: ["model-serving", "llm-inference-serving", "ml-model-selection", "two-stage-processing", "llm-cost-optimization"],
  practice: ["model-serving"],
  reading: [
    { title: "Distilling the Knowledge in a Neural Network", publisher: "Hinton, Vinyals and Dean, 2015", url: "https://arxiv.org/abs/1503.02531" },
    { title: "A White Paper on Neural Network Quantization", publisher: "Nagel et al., Qualcomm AI Research, 2021", url: "https://arxiv.org/abs/2106.08295" },
  ],
};
