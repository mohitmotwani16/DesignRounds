import { isAnonymousKind } from "../ai/components.js";
import { canvasSignals } from "../conductor/canvas.js";
import { nextPendingItem } from "../conductor/plan.js";

// How a pack behaves in the planner, over many simulated rounds (no model calls):
//   variety      the first deep dive differs across rounds (no topic over 50%)
//   follows      each deep-dive topic wins when the candidate talks about it and draws it
//   recognisable each deep-dive topic's keywords mostly belong to it alone
// The builder repairs a pack that fails; npm run packs:audit reports on every pack file.

export const ROUNDS = 300;

const node = (kind, index) => ({ id: `n${index}`, type: "systemNode", position: { x: 0, y: 0 }, data: { kind, label: `Part ${index}` } });
const specific = (item) => item.triggers.componentKinds.filter((kind) => !isAnonymousKind(kind));

export function auditPack(promptId, pack) {
  const problems = [];
  const deep = pack.agenda.filter((item) => item.stage === "deep_dive");
  const items = pack.agenda.map((item, position) => ({ itemId: item.id, position, stage: item.stage, weight: item.weight, required: item.required, status: item.stage === "deep_dive" ? "pending" : "answered" }));
  const highLevelKinds = new Set(pack.agenda.filter((item) => item.stage === "high_level").flatMap(specific));
  const fullCanvas = [...new Set(pack.agenda.flatMap((item) => specific(item).slice(0, 1)))].map(node);
  const highLevelCanvas = [...highLevelKinds].map(node);

  // Variety on a canvas where everything is drawn: the seeded tie-break must spread.
  const firsts = {};
  for (let round = 0; round < ROUNDS; round += 1) {
    const canvas = canvasSignals({ agenda: pack.agenda, diagram: { nodes: fullCanvas, edges: [] }, learnerTexts: [], seed: `${promptId}-${round}`, learnerTurnsSinceAsk: 0 });
    const first = nextPendingItem(items, "deep_dive", null, canvas).itemId;
    firsts[first] = (firsts[first] ?? 0) + 1;
  }
  const [topItem, topCount] = Object.entries(firsts).sort((a, b) => b[1] - a[1])[0];
  if (topCount / ROUNDS > 0.5) problems.push(`variety: ${topItem} is the first deep dive in ${Math.round((100 * topCount) / ROUNDS)}% of rounds`);
  if (Object.keys(firsts).length < 3 && deep.length >= 3) problems.push(`variety: only ${Object.keys(firsts).length} topics ever come first`);

  for (const item of deep) {
    // Follows: talking about a topic (its keywords) and drawing it should win the deep dive.
    let wins = 0;
    const talk = [item.triggers.keywords.join(", "), `I'd focus on ${item.triggers.keywords.slice(0, 2).join(" and ")}`];
    const drawn = [...highLevelCanvas, ...specific(item).slice(0, 1).map((kind, index) => node(kind, 100 + index))];
    for (let round = 0; round < 60; round += 1) {
      const canvas = canvasSignals({ agenda: pack.agenda, diagram: { nodes: drawn, edges: [] }, learnerTexts: talk, seed: `${promptId}-f-${round}`, learnerTurnsSinceAsk: 0 });
      if (nextPendingItem(items, "deep_dive", null, canvas).itemId === item.id) wins += 1;
    }
    if (wins / 60 < 0.8) problems.push(`follows: a candidate focused on ${item.id} gets it only ${Math.round((100 * wins) / 60)}% of the time (keywords too generic or shared?)`);
    // Recognisable: keywords shared with many other items don't point at this one.
    const shared = item.triggers.keywords.filter((keyword) => deep.filter((other) => other.id !== item.id && other.triggers.keywords.some((theirs) => theirs.toLowerCase() === keyword.toLowerCase())).length >= 1);
    if (shared.length > item.triggers.keywords.length / 2) problems.push(`recognisable: most of ${item.id}'s keywords are shared with other deep dives (${shared.join(", ")})`);
  }
  return { firsts, problems };
}
