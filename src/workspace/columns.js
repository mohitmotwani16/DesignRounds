// Columns of data model tables (tableNode): what is saved, and the one-column-per-line
// text form the inspector offers for typing or pasting a schema. No React Flow imports,
// so the server-side tests can run it.

// A client-side key for list rendering; never saved.
export const columnId = () => `col-${Math.random().toString(36).slice(2, 9)}`;

const COLUMN_KEY_IDS = new Set(["pk", "fk", "part", "sort"]);
export const MAX_COLUMNS = 60;

// The persisted form of a table's columns: named columns only, known keys, bounded text.
export function cleanColumns(columns) {
  return (Array.isArray(columns) ? columns : [])
    .filter((column) => column && String(column.name ?? "").trim())
    .slice(0, MAX_COLUMNS)
    .map((column) => {
      const keys = [...new Set((column.keys ?? []).filter((key) => COLUMN_KEY_IDS.has(key)))];
      return {
        name: String(column.name).trim().slice(0, 64),
        type: String(column.type ?? "").trim().slice(0, 40) || undefined,
        keys: keys.length ? keys : undefined,
        ref: keys.includes("fk") && String(column.ref ?? "").trim() ? String(column.ref).trim().slice(0, 120) : undefined,
      };
    });
}

// Columns as editable text, one per line: "name type pk fk -> table.column".
export function columnsToText(columns) {
  return (columns ?? []).map((column) => [column.name, column.type, ...(column.keys ?? []), column.ref ? `-> ${column.ref}` : ""].filter(Boolean).join(" ")).join("\n");
}

const KEY_WORDS = { pk: "pk", primary: "pk", fk: "fk", foreign: "fk", part: "part", partition: "part", shard: "part", sort: "sort", cluster: "sort", range: "sort" };
export function columnsFromText(text) {
  return String(text ?? "").split(/\r?\n/).map((line) => line.trim().replace(/[,;]$/, "")).filter(Boolean).slice(0, MAX_COLUMNS).map((line) => {
    const [main, ref = ""] = line.split(/\s*(?:->|→|\breferences\b)\s*/i);
    const [name, ...rest] = main.split(/[\s:]+/).filter(Boolean);
    const keys = [];
    const type = [];
    for (const word of rest) {
      const key = KEY_WORDS[word.toLowerCase().replace(/[()]/g, "")];
      if (key) keys.push(key);
      else if (!/^(key|keys)$/i.test(word)) type.push(word);
    }
    if (ref.trim() && !keys.includes("fk")) keys.push("fk");
    return { id: columnId(), name: name ?? "", type: type.join(" "), keys: [...new Set(keys)], ref: ref.trim() };
  });
}
