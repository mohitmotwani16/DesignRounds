import { MarkerType } from "@xyflow/react";
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

// Applies presentation (arrows, dashes) from the edge's semantic data.
export function decorateEdge(edge) {
  const async = edge.data?.style === "async";
  const marker = { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 };
  return {
    ...edge,
    type: "smoothstep",
    markerEnd: marker,
    markerStart: edge.data?.bidirectional ? marker : undefined,
    style: { stroke: EDGE_COLOR, strokeWidth: 1.6, strokeDasharray: async ? "6 5" : undefined },
    labelStyle: { fill: "#4e5a6c", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#ffffff" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  };
}

const round = (value) => Math.round(value * 10) / 10;

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
      data: edge.data?.style || edge.data?.bidirectional ? { style: edge.data.style, bidirectional: edge.data.bidirectional || undefined } : undefined,
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
