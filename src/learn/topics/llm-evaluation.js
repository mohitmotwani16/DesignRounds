export default {
  blocks: [
    { type: "p", text: "**LLM evaluation** is how you know whether a prompt change, a new model or a retrieval tweak made your application better or worse. Outputs are open-ended text, so classic accuracy rarely applies; instead you combine **golden datasets**, **code-based checks**, **LLM-as-a-judge** graders calibrated against humans, **human review**, and **online signals**, and you gate releases on the results. It's the step interviewers most often find missing from AI system designs." },

    { type: "h2", text: "The evaluation loop" },
    { type: "diagram", kind: "flow", caption: "Evaluation runs offline before every release and online after it. Production failures flow back into the golden set, so the same mistake can't ship twice.", nodes: [
      { id: "gold", label: "Golden dataset", sub: "inputs + references", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "run", label: "Run candidate", sub: "prompt · model · config", col: 1.4, row: 1, tone: "accent", w: 160 },
      { id: "grade", label: "Graders", sub: "code · LLM judge · human", col: 2.9, row: 1, tone: "ok", w: 170 },
      { id: "gate", label: "Release gate", sub: "vs baseline per slice", col: 4.4, row: 1, w: 160 },
      { id: "prod", label: "Production", sub: "canary → full", col: 5.8, row: 1, shape: "pill" },
      { id: "fb", label: "Online signals", sub: "feedback · traces", col: 4.4, row: 2.3, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "gold", to: "run" }, { from: "run", to: "grade" }, { from: "grade", to: "gate" }, { from: "gate", to: "prod", label: "pass" },
      { from: "prod", to: "fb" }, { from: "fb", to: "gold", dashed: true, label: "new failure cases" },
    ] },

    { type: "h2", text: "Building a golden dataset" },
    { type: "ul", items: [
      "**Start small and real:** 50-200 cases drawn from real or realistic user inputs beat thousands of synthetic ones. Grow it from production.",
      "**Cover slices:** common requests, hard ones, edge cases, adversarial inputs (injection attempts, off-topic, unsafe), each language and customer type that matters.",
      "**Store what \"good\" means:** a reference answer, the key facts that must appear, the documents that should be retrieved, or a rubric.",
      "**Version it** and never train or tune prompts on the held-out portion.",
      "**Synthetic expansion:** an LLM can generate variations of real cases; review a sample before trusting them.",
    ] },

    { type: "h2", text: "Kinds of graders" },
    { type: "table", head: ["Grader", "Checks", "Strength", "Weakness"], rows: [
      ["Code-based (deterministic)", "Valid JSON, schema, contains required fields, exact match, regex, tool called correctly, SQL runs", "Cheap, fast, reproducible", "Can't judge meaning or tone"],
      ["Reference-based metrics", "Overlap or semantic similarity with a reference answer", "Automatic", "Penalise correct answers phrased differently"],
      ["LLM-as-a-judge", "Rubric scores: correctness, groundedness, helpfulness, tone; or pairwise preference", "Scales to open-ended output", "Biased and noisy unless calibrated"],
      ["Human review", "Expert judgment on samples", "Ground truth for hard cases", "Slow and expensive"],
      ["Outcome checks", "Did the agent's action actually succeed in the system?", "Measures what matters", "Needs sandboxed environments"],
    ] },
    { type: "p", text: "Use the cheapest grader that's reliable for each dimension: code checks wherever possible, LLM judges for meaning, humans to calibrate the judges and for the highest-stakes slices." },

    { type: "h2", text: "LLM-as-a-judge done carefully" },
    { type: "ul", items: [
      "**Specific rubrics:** \"Score 1 if every factual claim is supported by the provided documents, else 0\" beats \"rate quality 1-10\". Binary or 3-level scales agree with humans more than wide scales.",
      "**Calibrate:** have humans label a few hundred outputs, measure agreement with the judge per dimension and slice, and only trust dimensions where agreement is high.",
      "**Control known biases:** judges favour the first answer in pairwise comparisons (randomise order), longer answers (control length), and their own model family's style.",
      "**Give the judge the evidence:** the retrieved documents and reference facts, not just the answer.",
      "**Re-calibrate** whenever the judge model, its prompt or the task changes.",
    ] },

    { type: "h2", text: "Evaluating RAG: retrieval and generation separately" },
    { type: "diagram", kind: "flow", caption: "RAG has two places to fail, so measure both: retrieval metrics against labelled relevant passages, and generation metrics for faithfulness to the retrieved context and relevance to the question.", nodes: [
      { id: "q", label: "Question", col: 0, row: 1, shape: "pill" },
      { id: "ret", label: "Retrieved chunks", col: 1.5, row: 1, shape: "db", tone: "store" },
      { id: "ans", label: "Answer", col: 3, row: 1, tone: "accent" },
      { id: "m1", label: "Retrieval metrics", sub: "recall@k · precision · MRR", col: 1.5, row: 2.3, tone: "ok", w: 180 },
      { id: "m2", label: "Faithfulness", sub: "claims supported?", col: 3, row: 2.3, tone: "ok" },
      { id: "m3", label: "Answer relevance + correctness", col: 4.5, row: 1, tone: "ok", w: 190 },
    ], edges: [
      { from: "q", to: "ret" }, { from: "ret", to: "ans" }, { from: "ret", to: "m1", dashed: true }, { from: "ans", to: "m2", dashed: true }, { from: "ans", to: "m3", dashed: true },
    ] },
    { type: "table", head: ["Metric", "Question it answers"], rows: [
      ["Context recall (recall@k)", "Did retrieval find the passages needed to answer?"],
      ["Context precision", "How much of what was retrieved is relevant?"],
      ["Faithfulness / groundedness", "Is every claim in the answer supported by the retrieved context?"],
      ["Answer relevance", "Does the answer address the question asked?"],
      ["Correctness", "Does it match the reference facts?"],
      ["Citation accuracy", "Do citations point to passages that support the cited claims?"],
    ] },

    { type: "h2", text: "Evaluating agents" },
    { type: "ul", items: [
      "**Task success** verified in a sandboxed system (the refund exists, the test suite passes).",
      "**Trajectory checks:** right tools, valid arguments, no forbidden actions, no needless steps.",
      "**Efficiency:** steps, tokens, cost and latency per successful task.",
      "**Repeated trials:** run each case several times and report the pass rate; one lucky pass proves little.",
    ] },

    { type: "h2", text: "Release gates and online evaluation" },
    { type: "code", code: `Release gate for prompt v15 vs v14 (golden set: 420 cases, 3 runs each)
  groundedness (judge, calibrated 92% agreement)   0.94 → 0.95   ✓ no regression
  correctness on billing slice                    0.88 → 0.91   ✓
  refusal on unsafe slice                         1.00 → 1.00   ✓ must stay 1.00
  JSON validity (code)                            0.998 → 0.999 ✓
  p95 latency                                     3.1 s → 3.0 s ✓
  cost per conversation                           $0.021 → $0.024  ⚠ +14%, review
→ ship to 5% canary; watch thumbs-down rate, escalations and cost per resolution` },
    { type: "ul", items: [
      "Online signals: explicit feedback (thumbs, ratings), implicit (copying the answer, rephrasing the question, escalating to a human), and business outcomes (resolution rate).",
      "Sample production traces for regular judge and human review, to catch drift the golden set doesn't cover.",
      "A/B test larger changes; see [A/B testing](/learn/ab-testing-experimentation).",
    ] },
  ],
  uses: [
    { name: "RAG assistants", text: "Retrieval recall and faithfulness tracked separately, with citation checks." },
    { name: "Agents", text: "Sandboxed task-success suites with repeated trials and trajectory checks gate every release." },
    { name: "Model upgrades", text: "The same golden suite decides whether a new model version replaces the current one." },
  ],
  interview: [
    "Define the eval plan early: dataset, graders per dimension, release gate.",
    "Prefer code checks; use calibrated LLM judges for meaning; humans for calibration.",
    "Evaluate RAG retrieval and generation separately.",
    "Feed production failures back into the golden set.",
  ],
  related: ["llmops-observability", "prompt-engineering", "retrieval-augmented-generation", "ai-agent-architecture", "ml-evaluation-metrics", "choosing-an-llm"],
  practice: ["llm-eval-platform", "rag-search", "model-monitoring"],
  reading: [
    { title: "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", publisher: "Zheng et al., NeurIPS 2023", url: "https://arxiv.org/abs/2306.05685" },
    { title: "RAGAS: Automated Evaluation of Retrieval Augmented Generation", publisher: "Es et al., 2023", url: "https://arxiv.org/abs/2309.15217" },
  ],
};
