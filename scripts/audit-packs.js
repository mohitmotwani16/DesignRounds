// Audits every Problem Pack file (server/modules/pks/audit.js says what is checked).
//   npm run packs:audit                 every pack file
//   npm run packs:audit -- chat-system  one pack
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUNDS, auditPack } from "../server/modules/pks/audit.js";

const packsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "content", "packs");
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

const files = readdirSync(packsDir).filter((file) => file.endsWith(".json") && (!only.length || only.includes(path.basename(file, ".json")))).sort();
let flagged = 0;
for (const file of files) {
  const promptId = path.basename(file, ".json");
  const { firsts, problems } = auditPack(promptId, JSON.parse(readFileSync(path.join(packsDir, file), "utf8")));
  if (problems.length) flagged += 1;
  console.log(`${problems.length ? "FLAG" : "ok  "}  ${promptId.padEnd(30)} first deep dive: ${Object.entries(firsts).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${Math.round((100 * n) / ROUNDS)}%`).join(", ")}`);
  for (const problem of problems) console.log(`        - ${problem}`);
}
console.log(`\n${files.length - flagged}/${files.length} packs pass the audit.`);
process.exit(flagged ? 1 : 0);
