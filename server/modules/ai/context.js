import crypto from "node:crypto";
import { describeColumn } from "./data-model.js";

const MAX_TABLES = 30;
const MAX_TABLE_COLUMNS = 40;

// Learner-written text goes into prompts as data. Angle brackets are swapped so it
// can't close or open the tags that fence it, and whitespace is collapsed.
export function clean(value, max = 300) {
  return String(value ?? "").replace(/[<>]/g, (char) => (char === "<" ? "‹" : "›")).replace(/\s+/g, " ").trim().slice(0, max);
}

const quoted = (value, max) => `"${clean(value, max)}"`;

function zoneOf(node, zones) {
  // Smallest zone whose box contains the node's top-left corner.
  let best = null;
  for (const zone of zones) {
    const { x, y } = zone.position;
    const width = zone.width ?? 380;
    const height = zone.height ?? 250;
    if (node.position.x >= x && node.position.y >= y && node.position.x <= x + width && node.position.y <= y + height) {
      if (!best || width * height < (best.width ?? 380) * (best.height ?? 250)) best = zone;
    }
  }
  return best;
}

// Compact, position-free text form of a diagram for model context. Node ids are kept
// so the model can point back at components. Layout-only changes (moving things
// around) produce identical text, which also makes this a good change fingerprint.
export function describeDiagram(diagram) {
  const nodes = diagram?.nodes ?? [];
  const edges = diagram?.edges ?? [];
  const components = nodes.filter((node) => node.type === "systemNode" || !node.type);
  const zones = nodes.filter((node) => node.type === "groupNode");
  const texts = nodes.filter((node) => node.type === "textNode");
  const notes = nodes.filter((node) => node.type === "noteNode");
  const tables = nodes.filter((node) => node.type === "tableNode");
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const lines = [`Components (${components.length}):`];
  for (const node of [...components].sort((a, b) => a.id.localeCompare(b.id))) {
    const zone = zoneOf(node, zones);
    let line = `- [${node.id}] ${clean(node.data.kind, 64)}: ${quoted(node.data.label, 120)}`;
    if (node.data.subtitle) line += ` (${clean(node.data.subtitle, 120)})`;
    if (zone) line += ` in zone ${quoted(zone.data.label, 80)}`;
    lines.push(line);
    if (node.data.note) lines.push(`  why: ${quoted(node.data.note, 600)}`);
  }
  if (!components.length) lines.push("- (none)");

  lines.push("", `Connections (${edges.length}):`);
  const edgeLines = edges.map((edge) => {
    const arrow = edge.data?.bidirectional ? "<->" : "->";
    // A free arrow end (pointNode) is an arrow drawn to or from nothing.
    const end = (id) => (byId.get(id)?.type === "pointNode" ? "(nothing)" : id);
    let line = `- ${end(edge.source)} ${arrow} ${end(edge.target)}`;
    if (edge.data?.style === "async") line += " [async]";
    if (edge.label) line += ` ${quoted(edge.label, 80)}`;
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (source?.type === "groupNode" || target?.type === "groupNode") line += " (connects a zone)";
    return line;
  }).sort();
  lines.push(...(edgeLines.length ? edgeLines : ["- (none)"]));

  if (zones.length) lines.push("", `Zones: ${zones.map((zone) => quoted(zone.data.label, 80)).sort().join(", ")}`);
  if (notes.length) {
    lines.push("", "Decision notes:");
    for (const note of notes) lines.push(`- ${quoted(note.data.label, 120)}${note.data.note ? `: ${quoted(note.data.note, 800)}` : ""}`);
  }
  if (texts.length) lines.push("", `Text labels: ${texts.map((node) => quoted(node.data.label, 120)).sort().join(", ")}`);
  // Data model tables are the candidate's schema, not services: listed with their columns.
  if (tables.length) {
    lines.push("", `Data model (${tables.length} ${tables.length === 1 ? "table" : "tables"}):`);
    for (const node of [...tables].sort((a, b) => a.id.localeCompare(b.id)).slice(0, MAX_TABLES)) {
      const columns = node.data.columns ?? [];
      let line = `- [${node.id}] ${clean(node.data.kind, 64)} ${quoted(node.data.label, 120)}`;
      if (node.data.subtitle) line += ` (grain: ${clean(node.data.subtitle, 120)})`;
      lines.push(line, `  columns: ${columns.length ? columns.slice(0, MAX_TABLE_COLUMNS).map(describeColumn).join("; ") : "(none yet)"}${columns.length > MAX_TABLE_COLUMNS ? `; +${columns.length - MAX_TABLE_COLUMNS} more` : ""}`);
      if (node.data.note) lines.push(`  why: ${quoted(node.data.note, 600)}`);
    }
    if (tables.length > MAX_TABLES) lines.push(`- +${tables.length - MAX_TABLES} more tables`);
  }

  // A component is connected if an edge touches it or the zone it sits in.
  const endpoints = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const isolatedCount = components.filter((node) => !endpoints.has(node.id) && !endpoints.has(zoneOf(node, zones)?.id)).length;

  return {
    text: lines.join("\n"),
    componentCount: components.length,
    edgeCount: edges.length,
    // Ids the model may point at (components and tables); componentCount stays services only.
    componentIds: new Set([...components, ...tables].map((node) => node.id)),
    explainedCount: components.filter((node) => node.data.note?.trim()).length,
    decisionNoteCount: notes.length,
    labelledEdgeCount: edges.filter((edge) => edge.label?.trim()).length,
    labels: new Map([...components, ...tables].map((node) => [node.id, clean(node.data.label, 120) || clean(node.data.kind, 64)])),
    tableCount: tables.length,
    filledTableCount: tables.filter((node) => node.data.columns?.length).length,
    columnCount: tables.reduce((sum, node) => sum + (node.data.columns?.length ?? 0), 0),
    // For the deterministic score checks (ai/scoring.js); not part of the text above.
    components: components.map((node) => ({ id: node.id, kind: clean(node.data.kind, 64), label: clean(node.data.label, 120), note: clean(node.data.note, 600) })),
    isolatedCount,
  };
}

// Replaces "[node-id]" references in model text with the component's label, recursing
// through objects and arrays (except nodeIds fields, which must stay ids).
export function nameComponents(value, labels) {
  if (typeof value === "string") return value.replace(/\[([\w-]{1,80})\]/g, (match, id) => (labels.has(id) ? `"${labels.get(id)}"` : match));
  if (Array.isArray(value)) return value.map((entry) => nameComponents(entry, labels));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === "nodeIds" ? entry : nameComponents(entry, labels)]));
  return value;
}

export function fingerprint(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
