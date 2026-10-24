import { groupOf } from "./components.js";
import { clean } from "./context.js";

// Data model entities on the canvas: tableNode nodes (src/workspace/nodes.jsx) whose kind
// is in the catalog's "data-model" group (table, fact-table, dimension-table, collection,
// event-schema). Each lists columns with a type, keys (pk, fk, part, sort) and, for a
// foreign key, what it references.

export const isDataModelKind = (kind) => groupOf(kind) === "data-model";
export const isTable = (node) => node?.type === "tableNode" || isDataModelKind(node?.data?.kind);

// How a candidate adds a data model, worded for the interviewer to say. Keep it in step
// with the workspace: the "Data model" library section, the rail button and the D key.
export const DATA_MODEL_HOW_TO = "In the component library on the left, open Data model and add a Table (or a Fact, Dimension, Document or Event schema table), or press D. Name it, then list its columns in the panel on the right, with types and keys (PK, FK, partition, sort). Connect related tables with an arrow labelled 1:N.";

const KEY_LABELS = { pk: "PK", fk: "FK", part: "partition key", sort: "sort key" };

export function describeColumn(column) {
  const keys = (column.keys ?? []).map((key) => KEY_LABELS[key]).filter(Boolean);
  let line = clean(column.name, 64);
  if (column.type) line += ` ${clean(column.type, 40)}`;
  if (keys.length) line += ` [${keys.join(", ")}]`;
  if (column.ref) line += ` -> ${clean(column.ref, 120)}`;
  return line;
}

// The words a table offers for matching it to agenda items: its name, grain and columns.
export function tableText(node) {
  return [node.data?.label, node.data?.subtitle, node.data?.note, ...(node.data?.columns ?? []).map((column) => `${column.name} ${column.type ?? ""} ${column.ref ?? ""}`)].filter(Boolean).join(" ");
}
