import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Which component kinds are "significant" design moves worth an interviewer question
// (data stores, caches, queues, gateways, ...). The canvas catalog lives in a JSX module
// the server can't import, so its group/kind structure is read from the source once at
// startup. Clients, plain services, observability, external systems, and shapes are minor.
const MINOR_GROUPS = new Set(["clients", "compute", "observability", "external", "tech-ops"]);
const catalogFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src", "workspace", "catalog.jsx");

function load() {
  const source = readFileSync(catalogFile, "utf8");
  const headers = [...source.matchAll(/id: "([a-z-]+)", label: "[^"]+", items: \[/g)];
  const kindToGroup = new Map();
  headers.forEach((header, index) => {
    const body = source.slice(header.index, headers[index + 1]?.index ?? source.length);
    for (const match of body.matchAll(/\b[ct]\("([^"]+)"/g)) kindToGroup.set(match[1], header[1]);
  });
  if (kindToGroup.size < 50) console.warn(`[ai] read only ${kindToGroup.size} component kinds from the catalog; treating unknown kinds as significant`);
  return kindToGroup;
}

const kindToGroup = load();

// Every kind on the canvas, for validating references to them (Problem Pack triggers).
export function componentKinds() {
  return new Set(kindToGroup.keys());
}

// Kinds that say nothing about a component's role: a client, a plain service or server.
// Drawing one is evidence for a part only when its label names that part. (A worker, an
// ID generator or a registry is a specific part, even if it's not "significant".)
const ANONYMOUS_KINDS = new Set(["client", "mobile", "desktop", "tablet", "user", "users", "admin", "service", "microservice", "web-server", "function", "container", "cluster", "vm", "bff", "group", "text", "note"]);
export function isAnonymousKind(kind) {
  return ANONYMOUS_KINDS.has(kind);
}

export function isSignificantKind(kind) {
  const group = kindToGroup.get(kind);
  return group ? !MINOR_GROUPS.has(group) : !["group", "text", "note"].includes(kind);
}
