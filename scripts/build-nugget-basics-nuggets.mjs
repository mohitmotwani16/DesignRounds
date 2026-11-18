/**
 * Converts server/content/nugget-basics/catalog.json into published nugget JSON
 * files under server/content/nuggets/nugget-basics.*.json
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateNuggetFile } from "../server/modules/nuggets/schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "server", "content", "nugget-basics", "catalog.json");
const nuggetsDir = path.join(root, "server", "content", "nuggets");

const DIMENSIONS = ["scalability", "reliability", "data", "architecture", "tradeoffs"];
const DIMENSION_FOR = {
  cache: "scalability",
  database: "data",
  "load-balancer": "scalability",
  ingestion: "data",
  "feature-store": "data",
  "retrieval-index": "architecture",
  observability: "reliability",
  replication: "reliability",
  partitioning: "scalability",
  "offline-sync": "reliability",
};

function pickDimension(drill) {
  return DIMENSION_FOR[drill.componentId] ?? DIMENSIONS[[...drill.id].reduce((s, c) => s + c.charCodeAt(0), 0) % DIMENSIONS.length];
}

function diagramFor(drill) {
  if (drill.format === "text-only") {
    return {
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [{
        id: "n-scenario",
        type: "noteNode",
        position: { x: 40, y: 40 },
        width: 320,
        height: 120,
        data: { kind: "note", label: "Scenario", note: drill.symptoms.slice(0, 200) },
      }],
      edges: [],
    };
  }
  const hot = drill.format === "diagram" ? "n-focus" : "n-scenario";
  return {
    viewport: { x: 0, y: 0, zoom: 0.9 },
    nodes: [
      { id: "n-users", type: "systemNode", position: { x: 40, y: 120 }, data: { kind: "users", label: "Users" } },
      { id: "n-app", type: "systemNode", position: { x: 240, y: 120 }, data: { kind: "app-server", label: "App" } },
      { id: "n-focus", type: "systemNode", position: { x: 440, y: 120 }, data: { kind: "database", label: drill.componentLabel || drill.componentId } },
    ],
    edges: [
      { id: "e1", source: "n-users", target: "n-app", label: "Traffic" },
      { id: "e2", source: "n-app", target: "n-focus", label: "Issue path" },
    ],
    _hot: hot,
  };
}

function incidentFor(drill, diagram) {
  const headline = drill.title.length <= 200 ? drill.title : drill.title.slice(0, 197) + "...";
  if (drill.format === "text-only") {
    return { nodeIds: ["n-scenario"], edgeIds: [], headline };
  }
  return { nodeIds: ["n-focus"], edgeIds: ["e2"], headline };
}

function miniPackFor(drill) {
  const dimension = pickDimension(drill);
  const reference = drill.referenceFix;
  return {
    agenda: [{
      id: "incident.fix",
      stage: "incident",
      dimension,
      weight: 2,
      required: true,
      goal: reference.slice(0, 280),
      opener: drill.opener,
      evidence: {
        strong: reference.slice(0, 380),
        adequate: `Names a reasonable fix direction related to ${drill.componentId.replace(/-/g, " ")}.`,
        weak: "Restates the symptom without a concrete fix or misidentifies the failing part.",
      },
      misconceptions: [],
      probes: drill.probes?.length ? drill.probes.slice(0, 2) : [`What trade-off does your fix introduce?`],
      hints: [`Think about the highlighted path in the diagram.`, `What building block usually addresses this symptom?`],
      referenceFix: reference.slice(0, 750),
    }],
    pacing: { incident: 0.85, wrap_up: 0.15 },
  };
}

function nuggetFromDrill(drill) {
  const diagramRaw = diagramFor(drill);
  const hot = diagramRaw._hot;
  delete diagramRaw._hot;
  return {
    id: drill.id,
    title: drill.title,
    minutes: drill.minutes ?? 2,
    scenario: {
      symptoms: drill.symptoms,
      interviewerSetup: `Nugget-basics warm-up (${drill.difficulty}). Component: ${drill.componentId}. ${drill.referenceFix}`,
    },
    diagram: diagramRaw,
    incident: incidentFor(drill, diagramRaw),
    miniPack: miniPackFor(drill),
    status: "published",
    source: "hand",
    basics: {
      format: drill.format,
      difficulty: drill.difficulty,
      track: drill.track,
      componentId: drill.componentId,
      onboardingOrder: drill.onboardingOrder ?? null,
    },
  };
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const groups = new Map();

for (const drill of catalog.drills) {
  const key = drill.format === "text-only" ? "onboarding" : drill.track;
  const list = groups.get(key) ?? [];
  list.push(nuggetFromDrill(drill));
  groups.set(key, list);
}

for (const name of readdirSync(nuggetsDir).filter((f) => f.startsWith("nugget-basics.") && f.endsWith(".json"))) {
  unlinkSync(path.join(nuggetsDir, name));
}

for (const [key, nuggets] of groups.entries()) {
  const fileName = key === "onboarding" ? "nugget-basics.onboarding.json" : `nugget-basics.${key}.json`;
  const payload = { promptId: "nugget-basics", packVersion: "basics-v1", nuggets };
  validateNuggetFile(payload);
  writeFileSync(path.join(nuggetsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`  wrote ${fileName} (${nuggets.length} nuggets)`);
}

console.log(`Nugget-basics nuggets OK (${catalog.drills.length} total)`);