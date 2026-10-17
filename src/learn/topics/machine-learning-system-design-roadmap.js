export default {
  blocks: [
    { type: "p", text: "This **ML system design roadmap** covers what machine learning interviews ask beyond modelling: how features are computed consistently for training and serving, how models are trained at scale and versioned, how predictions are served within a latency budget, how recommendation and ranking systems are structured, how you prove a model helps, and how you notice when it stops helping. The last step covers AI applications built on foundation models: retrieval-augmented generation, vector search and LLM serving." },
    { type: "callout", tone: "tip", text: "ML design rounds reward candidates who talk about data and feedback loops as much as models. If you can only spend time on two steps, make them step 2 (features) and step 6 (evaluation and monitoring)." },

    { type: "roadmap", id: "machine-learning" },

    { type: "h2", text: "The ML system design framework" },
    { type: "table", head: ["Phase", "Questions to answer", "Guide"], rows: [
      ["Problem framing", "What business metric moves? What does the model predict, and what's the label?", "[ML evaluation](/learn/ml-evaluation-metrics)"],
      ["Data and features", "Where do labels come from? Which features exist at prediction time?", "[Feature stores](/learn/feature-store)"],
      ["Model and training", "What's the simplest baseline? How often is it retrained, on what data?", "[Distributed training](/learn/distributed-training), [MLOps](/learn/mlops-model-registry)"],
      ["Serving", "Batch or online? What's the latency budget? What happens when the model is down?", "[Model serving](/learn/model-serving)"],
      ["Evaluation", "Which offline metric, which online metric, which guardrails?", "[A/B testing](/learn/ab-testing-experimentation)"],
      ["Monitoring", "How do you detect drift and broken features before users do?", "[Model monitoring](/learn/ml-model-monitoring)"],
    ] },

    { type: "h2", text: "Common ML design questions" },
    { type: "ul", items: [
      "[Design a recommendation system](/system-design/recommendation-engine): candidate generation, ranking and feedback loops ([guide](/learn/recommendation-system-design)).",
      "[Design a feature store](/system-design/feature-store): online and offline stores, point-in-time joins.",
      "[Design a model serving platform](/system-design/model-serving): batching, autoscaling GPUs, safe rollouts.",
      "[Design real-time fraud scoring](/system-design/online-fraud-model): streaming features, tight latency and imbalanced labels.",
      "[Design a RAG system](/system-design/rag-search): chunking, retrieval quality and grounded answers ([guide](/learn/retrieval-augmented-generation)).",
    ] },

    { type: "h2", text: "A five-week plan" },
    { type: "ol", items: [
      "**Week 1:** steps 1 and 2. Draw the end-to-end system for a feed ranking model and mark where training-serving skew could creep in.",
      "**Week 2:** steps 3 and 4. Explain how a model goes from a notebook to a canary deployment, and how you'd roll it back.",
      "**Week 3:** step 5. Design a recommender for a video app, with a two-tower retriever and a ranker.",
      "**Week 4:** step 6. For each design so far, name the offline metric, online metric, guardrails and the drift alerts.",
      "**Week 5:** step 7. Design an internal knowledge assistant with RAG, and estimate its cost per query.",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "How is ML system design different from regular system design?" },
    { type: "p", text: "Regular system design is about moving and storing data correctly at scale. ML system design adds the question of whether the system's *decisions* are good, which brings in labels, features, training, evaluation and feedback loops. You still need the regular building blocks for the serving and data paths." },
    { type: "h3", text: "Do I need deep learning knowledge?" },
    { type: "p", text: "Enough to choose sensible model families and explain their costs. The interview weighs the system around the model: a simple model with good data, evaluation and monitoring beats a sophisticated one nobody can debug." },
    { type: "h3", text: "Are LLM and RAG questions common now?" },
    { type: "p", text: "Increasingly, especially for AI engineering and applied ML roles. Step 7 covers the patterns they test: retrieval, grounding, evaluation and serving cost." },
  ],
  related: ["machine-learning-system-architecture", "feature-store", "recommendation-system-design", "model-serving", "retrieval-augmented-generation"],
  practice: ["recommendation-engine", "feature-store", "model-serving", "rag-search"],
  reading: [
    { title: "Rules of Machine Learning: Best Practices for ML Engineering", publisher: "Google for Developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
    { title: "Hidden Technical Debt in Machine Learning Systems", publisher: "Sculley et al., NeurIPS 2015", url: "https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html" },
    { title: "Designing Machine Learning Systems", publisher: "Chip Huyen, O'Reilly", url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" },
  ],
};
