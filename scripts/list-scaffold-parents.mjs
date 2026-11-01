#!/usr/bin/env node
/** Lists parent prompt IDs whose nuggets still use the offline fake scaffold marker. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCAFFOLD_MARKER } from "../server/modules/nuggets/live.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "content", "nuggets");
const ids = [];
for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const raw = readFileSync(path.join(dir, file), "utf8");
  if (raw.includes(SCAFFOLD_MARKER)) ids.push(file.replace(/\.json$/, ""));
}
console.log(ids.join("\n"));
console.error(`\n${ids.length} parent(s) with scaffold nuggets`);
