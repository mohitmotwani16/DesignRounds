// AI allowances per plan, shared by the server (which enforces them before any model
// call) and the client (which describes them on the pricing section). Product
// entitlements are never decided by the client or the model.
export const aiLimits = {
  free: { reviewsPerRound: 1, reviewsPerMonth: 5, interviewTurnsPerRound: 0, interviewTurnsPerMonth: 0, hintsPerRound: 0, proactiveChecksPerRound: 0 },
  plus: { reviewsPerRound: 3, reviewsPerMonth: 60, interviewTurnsPerRound: 40, interviewTurnsPerMonth: 800, hintsPerRound: 3, proactiveChecksPerRound: 25 },
};

// What a review scores, in the server rubric's order (server/modules/ai/rubric.js),
// worded for learners. Each dimension links to the guide that helps most with it.
export const RUBRIC = [
  { id: "requirements", name: "Requirements and scope", text: "Pin down the users, the scale and what's out of scope before drawing anything.", guide: "back-of-the-envelope-estimation", guideTitle: "Capacity estimation" },
  { id: "architecture", name: "High-level architecture", text: "The right components for this problem, connected the right way, and nothing it doesn't need.", guide: "system-design-interview", guideTitle: "The interview framework" },
  { id: "data", name: "Data model and storage", text: "A schema shaped by the access patterns, and a store chosen for them.", guide: "sql-vs-nosql", guideTitle: "SQL vs NoSQL" },
  { id: "scalability", name: "Scale and performance", text: "Where the design bottlenecks under ten times the load, and how caches, shards and replicas carry it.", guide: "sharding", guideTitle: "Sharding" },
  { id: "reliability", name: "Reliability and security", text: "What happens when a node dies, a dependency slows down or a client misbehaves.", guide: "circuit-breaker", guideTitle: "Circuit breakers" },
  { id: "tradeoffs", name: "Trade-offs and reasoning", text: "Every choice explained: what you gave up, and why it was worth it here.", guide: "cap-theorem", guideTitle: "CAP theorem" },
];

// How the interviewer judges the way you explain, separately from the design itself
// (server/modules/ai/communication.js). Plus only, since it needs the conversation.
export const COMMUNICATION = [
  { name: "Clarity", text: "Is the main idea easy to follow?" },
  { name: "Structure", text: "Do you give the answer or an overview first, then the detail?" },
  { name: "Concision", text: "Do you say what the question needs and stop, without rambling or repeating yourself?" },
  { name: "Commitment", text: "Do you choose and state your assumptions, instead of hedging or giving up?" },
];

// What Plus adds, for the pricing section and the Plus page.
export const PLUS_FEATURES = [
  { title: "Every round in the library", text: "All disciplines and levels, from a first URL shortener to staff-level distributed systems." },
  { title: "A live AI interviewer", text: "Talk through your design by voice or text. It asks why, pushes on weak spots, answers questions about the brief and moves you through the stages of a real round." },
  { title: "Feedback on how you communicate", text: "Alongside the design score, see how clearly, concisely and confidently you explained it, answer by answer." },
  { title: "Hints when you're stuck", text: "A nudge in the right direction without giving the design away." },
  { title: "More reviews per round", text: "Fix what the review found and submit again, to see the score move." },
  { title: "Coaching on every decision", text: "Detailed notes on each component and connection: what works, what breaks, and what a stronger answer looks like." },
];
