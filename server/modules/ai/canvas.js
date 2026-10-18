import { clean } from "./context.js";

// Position-free shape of the canvas, to tell what changed since the interviewer last
// looked. Shared by the v2 interviewer and the v3 Conductor.
export function snapshotOf(diagram) {
  const components = {};
  for (const node of diagram?.nodes ?? []) {
    if (node.type === "systemNode" || !node.type) components[node.id] = node.data.kind;
  }
  return { components, edges: (diagram?.edges ?? []).map((edge) => `${edge.source}>${edge.target}`).sort() };
}

export function diffSnapshots(previous, current, diagram) {
  const before = previous ?? { components: {}, edges: [] };
  const nodes = new Map((diagram?.nodes ?? []).map((node) => [node.id, node]));
  const added = Object.keys(current.components).filter((id) => !(id in before.components)).map((id) => {
    const node = nodes.get(id);
    return { id, kind: node.data.kind, label: clean(node.data.label, 120) || node.data.kind, hasNote: Boolean(node.data.note?.trim()) };
  });
  const removed = Object.keys(before.components).filter((id) => !(id in current.components));
  const beforeEdges = new Set(before.edges);
  const afterEdges = new Set(current.edges);
  const edgeChanges = current.edges.filter((edge) => !beforeEdges.has(edge)).length + before.edges.filter((edge) => !afterEdges.has(edge)).length;
  return { added, removed, edgeChanges };
}

// Every "why" note and decision note on the canvas, as quotable learner text.
export function canvasNotes(diagram) {
  const notes = [];
  for (const node of diagram?.nodes ?? []) {
    if (node.data?.note?.trim()) notes.push(node.data.note);
    if (node.type === "noteNode" && node.data?.label?.trim()) notes.push(node.data.label);
  }
  return notes;
}
