// The rubric every final review is scored against. Bump `version` whenever a
// dimension, weight, or band changes; stored reviews keep the version they used.
export const rubric = {
  version: "general-v2",
  dimensions: [
    {
      id: "requirements",
      name: "Requirements & scope",
      weight: 15,
      guide: "Identifies who uses the system and what it must do; states scale, read/write mix, latency and consistency needs, and sensible scope limits. Evidence: requirement-shaped notes, labels, or components that reflect stated needs.",
    },
    {
      id: "architecture",
      name: "High-level architecture",
      weight: 20,
      guide: "A coherent end-to-end request and data flow that satisfies the functional requirements, with clear component responsibilities and correctly directed connections. The design is proportionate: no components the problem does not need, and nothing essential missing for the stated scale.",
    },
    {
      id: "data",
      name: "Data model & storage",
      weight: 15,
      guide: "Storage choices fit the access patterns; key entities, partitioning or indexing, and data lifecycle are considered where they matter.",
    },
    {
      id: "scalability",
      name: "Scale & performance",
      weight: 15,
      guide: "Handles the expected load: caching, horizontal scaling, asynchronous work, hot-spot and fan-out handling, and latency on the critical path.",
    },
    {
      id: "reliability",
      name: "Reliability & security",
      weight: 15,
      guide: "Failure modes, redundancy, retries and idempotency, delivery guarantees, observability, and basic security such as authentication and protection of sensitive data.",
    },
    {
      id: "tradeoffs",
      name: "Trade-offs & reasoning",
      weight: 20,
      guide: "Explains why each significant choice was made, how it works, when it would be the wrong choice, and what alternatives were rejected, mainly through component 'why' notes, decision notes, and connection labels. Reasons must be correct and tied to requirements or scale; naming a technology is not a reason. Unexplained choices earn little here even if they are good.",
    },
  ],
  bands: [
    { min: 8, rating: "strong", label: "Strong" },
    { min: 6, rating: "solid", label: "Solid" },
    { min: 4, rating: "developing", label: "Developing" },
    { min: 0, rating: "missing", label: "Needs work" },
  ],
};

export const dimensionIds = rubric.dimensions.map((dimension) => dimension.id);

export function bandFor(score) {
  return rubric.bands.find((band) => score >= band.min);
}

// Overall 0-100 score, computed here from the dimension scores rather than trusted from the model.
export function overallScore(scores) {
  const totalWeight = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const weighted = rubric.dimensions.reduce((sum, dimension) => sum + (scores[dimension.id] ?? 0) * dimension.weight, 0);
  return Math.round((weighted / totalWeight) * 10);
}
