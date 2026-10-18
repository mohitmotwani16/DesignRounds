// Builds Problem Packs with the configured provider and writes them as hand-authored
// pack files (server/content/packs/<prompt-id>.json) for review in a pull request.
// Files are validated on every boot and published when imported.
//   npm run packs:build -- url-shortener chat-system
import "../server/env.js";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { close, connect } from "../server/db.js";
import { describeAi } from "../server/modules/ai/config.js";

const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!ids.length) {
  console.error("Usage: npm run packs:build -- <prompt-id> [<prompt-id> ...]");
  process.exit(1);
}

await connect();
const { inputsFor } = await import("../server/modules/pks/inputs.js");
const { buildPack } = await import("../server/modules/pks/builder.js");
const packsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "content", "packs");

console.log(`Building ${ids.length} pack(s) with ${describeAi()}\n`);
let failed = 0;
for (const id of ids) {
  const started = Date.now();
  try {
    const inputs = await inputsFor(id);
    if (!inputs) throw new Error("unknown question");
    if (!inputs.guide) throw new Error("no interviewer guide");
    const { pack, warnings, consistency } = await buildPack(inputs);
    // The file holds the content only; identity and version are computed when imported.
    const { schemaVersion: _s, promptId: _p, version: _v, inputsFingerprint: _i, builder: _b, ...content } = pack;
    writeFileSync(path.join(packsDir, `${id}.json`), `${JSON.stringify(content, null, 2)}\n`);
    const stages = ["requirements", "high_level", "deep_dive", "wrap_up"].map((stage) => pack.agenda.filter((item) => item.stage === stage).length).join("/");
    console.log(`  ok  ${id}: ${pack.agenda.length} items (${stages}), ${pack.clarifications.length} facts, ${pack.curveballs.length} curveballs, ${Math.round((Date.now() - started) / 1000)}s`);
    for (const warning of warnings) console.log(`      warning: ${warning}`);
    if (consistency && !consistency.consistent) for (const conflict of consistency.conflicts) console.log(`      conflict: ${conflict}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAILED ${id}: ${error.code || ""} ${error.message}`);
  }
}
await close();
process.exit(failed ? 1 : 0);
