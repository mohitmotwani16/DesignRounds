#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { importNuggetFiles, publicCatalogJson } = await import(new URL("../server/modules/nuggets/index.js", import.meta.url).href);

const problems = [];
try {
  importNuggetFiles();
  const { validateNuggetFile } = await import(new URL("../server/modules/nuggets/schema.js", import.meta.url).href);
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  const dir = path.join(root, "server", "content", "nuggets");
  if (!existsSync(dir)) problems.push("missing server/content/nuggets/");
  else {
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      try {
        validateNuggetFile(JSON.parse(readFileSync(path.join(dir, file), "utf8")));
      } catch (error) {
        problems.push(`${file}: ${error.message}`);
      }
    }
  }
  writeFileSync(path.join(root, "src", "data", "nuggets.json"), `${publicCatalogJson()}\n`);
} catch (error) {
  problems.push(error.message);
}

if (problems.length) {
  console.error("Nugget check failed:\n", problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Nuggets OK (src/data/nuggets.json refreshed)");
