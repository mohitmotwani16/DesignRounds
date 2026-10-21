import { getSmoothStepPath, MarkerType } from "@xyflow/react";
import { getItem } from "./catalog.jsx";

const EDGE_COLOR = "#8d9ab0";

export const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function createNode(kind, position) {
  const item = getItem(kind);
  const type = item?.nodeType || "systemNode";
  const node = {
    id: newId(kind),
    type,
    position,
    data: { kind, label: item?.label || "Component", color: item?.tech ? undefined : item?.color },
  };
  if (type === "groupNode") {
    Object.assign(node, { width: 380, height: 250, zIndex: -1 });
    node.data.label = "Zone";
  }
  if (type === "textNode") node.data.label = "Text";
  if (type === "noteNode") Object.assign(node.data, { label: "Decision", note: "" });
  return node;
}

export const POINT_SIZE = 14;

export function nodeCenter(node) {
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
}

// A free arrow end at a flow position, entered from the given side ("left", "top"...).
export function createPoint(at) {
  return { id: newId("point"), type: "pointNode", position: { x: at.x - POINT_SIZE / 2, y: at.y - POINT_SIZE / 2 }, data: { kind: "point", label: "" } };
}

// The side of a point an arrow coming from `from` should enter by.
export function entrySide(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "left" : "right";
  return dy >= 0 ? "top" : "bottom";
}

// The box (and side) a free arrow end dropped at `point` should attach to: one the end
// sits on or near, or a zone whose edge it's near. `skip` holds ids it mustn't join
// (the box the arrow already comes from). Dropped near one of a box's dots, it takes
// that dot (within `dot`); dropped on the box itself, the side facing `from` (where the
// arrow's other end is), like draw.io. Null when it's over bare canvas.
export function snapTarget(nodes, point, skip, from, radius = 28, dot = 12) {
  let best = null;
  for (const node of nodes) {
    if (node.type === "pointNode" || skip.has(node.id)) continue;
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const { x, y } = node.position;
    const sides = {
      top: { x: x + width / 2, y }, bottom: { x: x + width / 2, y: y + height },
      left: { x, y: y + height / 2 }, right: { x: x + width, y: y + height / 2 },
    };
    let side = null;
    let distance = Infinity;
    for (const [id, at] of Object.entries(sides)) {
      const d = Math.hypot(point.x - at.x, point.y - at.y);
      if (d < distance) { side = id; distance = d; }
    }
    const inside = point.x >= x - radius && point.x <= x + width + radius && point.y >= y - radius && point.y <= y + height + radius;
    // Zones are big; only their edge dots attach, so a drop inside a zone stays free.
    const hit = node.type === "groupNode" ? distance <= radius : inside;
    if (!hit) continue;
    const rank = (node.type === "groupNode" ? 1e6 : 0) + distance;
    if (best && rank >= best.rank) continue;
    if (distance > dot && from && width && height) {
      const dx = (from.x - (x + width / 2)) / width;
      const dy = (from.y - (y + height / 2)) / height;
      if (Math.abs(dx) >= Math.abs(dy)) side = dx < 0 ? "left" : "right";
      else side = dy < 0 ? "top" : "bottom";
    }
    best = { id: node.id, side, rank };
  }
  return best && { id: best.id, side: best.side };
}

// ---- Arrow routing ---------------------------------------------------------------
// Arrows are right-angled. Unbent, they take React Flow's stepped route. Bent (data.bend),
// one segment has been dragged aside, draw.io style: bend.x set means a vertical run at
// the route centre's x + bend.x; bend.y set means a horizontal run at centre y + bend.y.
// The ends stay attached, leaving and entering each box straight out of its side.
const STUB = 20;
const CORNER = 5;
const outward = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

// The unbent route's centre, which a bend is measured from.
export function routeCenter(ends) {
  const [, x, y] = getSmoothStepPath(ends);
  return { x, y };
}

export function routeEdge(ends, bend) {
  const [path, centerX, centerY] = getSmoothStepPath(ends);
  if (!bend?.x && !bend?.y) return { path, labelX: centerX, labelY: centerY };
  const [sdx, sdy] = outward[ends.sourcePosition] ?? outward.bottom;
  const [tdx, tdy] = outward[ends.targetPosition] ?? outward.top;
  const source = { x: ends.sourceX, y: ends.sourceY };
  const target = { x: ends.targetX, y: ends.targetY };
  const a = { x: source.x + sdx * STUB, y: source.y + sdy * STUB };
  const b = { x: target.x + tdx * STUB, y: target.y + tdy * STUB };
  if (bend.x) {
    const x = centerX + bend.x;
    return { path: roundedPath([source, a, { x, y: a.y }, { x, y: b.y }, b, target]), labelX: x, labelY: (a.y + b.y) / 2 };
  }
  const y = centerY + bend.y;
  return { path: roundedPath([source, a, { x: a.x, y }, { x: b.x, y }, b, target]), labelX: (a.x + b.x) / 2, labelY: y };
}

// An SVG path through right-angled points, with small rounded corners like the stepped route.
function roundedPath(input) {
  const same = (a, b) => Math.abs(a - b) < 0.5;
  const points = [];
  for (const point of input) {
    const last = points[points.length - 1];
    if (last && same(last.x, point.x) && same(last.y, point.y)) continue;
    // Drop the middle of three points on one line.
    const before = points[points.length - 2];
    if (before && ((same(before.x, last.x) && same(last.x, point.x)) || (same(before.y, last.y) && same(last.y, point.y)))) points.pop();
    points.push(point);
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [prev, corner, next] = [points[index - 1], points[index], points[index + 1]];
    const r = Math.min(CORNER, Math.hypot(corner.x - prev.x, corner.y - prev.y) / 2, Math.hypot(next.x - corner.x, next.y - corner.y) / 2);
    // The point `r` along the segment from the corner toward `other`.
    const toward = (other) => {
      const length = Math.hypot(other.x - corner.x, other.y - corner.y) || 1;
      return { x: corner.x + ((other.x - corner.x) / length) * r, y: corner.y + ((other.y - corner.y) / length) * r };
    };
    const enter = toward(prev);
    const leave = toward(next);
    d += ` L ${enter.x} ${enter.y} Q ${corner.x} ${corner.y} ${leave.x} ${leave.y}`;
  }
  const end = points[points.length - 1];
  return `${d} L ${end.x} ${end.y}`;
}

// Free arrow ends with no arrow left touching them.
export function strayPoints(nodes, edges) {
  const used = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return nodes.filter((node) => node.type === "pointNode" && !used.has(node.id));
}

// Applies presentation (arrows, dashes) from the edge's semantic data.
export function decorateEdge(edge) {
  const async = edge.data?.style === "async";
  const marker = { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 };
  return {
    ...edge,
    type: "bendable",
    // Dragging an arrow's line bends it (see Workspace), so it mustn't pan.
    className: "nopan",
    markerEnd: marker,
    markerStart: edge.data?.bidirectional ? marker : undefined,
    style: { stroke: EDGE_COLOR, strokeWidth: 1.6, strokeDasharray: async ? "6 5" : undefined },
    // CSS variables so edge labels follow the colour theme (see src/styles/theme.css).
    labelStyle: { fill: "var(--fg-4e5a6c)", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "var(--bg-ffffff)" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  };
}

const round = (value) => Math.round(value * 10) / 10;
const hasBend = (edge) => Boolean(edge.data?.bend && (edge.data.bend.x || edge.data.bend.y));

// Only semantic fields are persisted; React Flow's runtime fields are dropped.
export function serializeDiagram(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: round(node.position.x), y: round(node.position.y) },
      width: node.type === "groupNode" ? round(node.width ?? node.measured?.width ?? 380) : undefined,
      height: node.type === "groupNode" ? round(node.height ?? node.measured?.height ?? 250) : undefined,
      zIndex: node.type === "groupNode" ? -1 : undefined,
      data: {
        kind: node.data.kind,
        label: node.data.label ?? "",
        subtitle: node.data.subtitle || undefined,
        note: node.data.note || undefined,
        color: node.data.color || undefined,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      label: edge.label || undefined,
      data: edge.data?.style || edge.data?.bidirectional || hasBend(edge)
        ? { style: edge.data.style, bidirectional: edge.data.bidirectional || undefined, bend: hasBend(edge) ? edge.data.bend : undefined }
        : undefined,
    })),
  };
}

export function hydrateDiagram(diagram) {
  const nodes = (diagram?.nodes || []).map((node) => ({
    ...node,
    type: node.type || "systemNode",
    data: { ...node.data, kind: node.data?.kind || "service", label: node.data?.label ?? "" },
  }));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = (diagram?.edges || [])
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => decorateEdge({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      label: typeof edge.label === "string" ? edge.label : undefined,
      data: edge.data,
    }));
  return { nodes, edges };
}
