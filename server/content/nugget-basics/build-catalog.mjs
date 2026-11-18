import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onboardingDrills } from "./onboarding.js";
import * as softwareEngineering from "./tracks/software-engineering.js";
import * as dataEngineering from "./tracks/data-engineering.js";
import * as machineLearning from "./tracks/machine-learning.js";
import * as aiEngineering from "./tracks/ai-engineering.js";
import * as platformInfrastructure from "./tracks/platform-infrastructure.js";
import * as distributedSystems from "./tracks/distributed-systems.js";
import * as frontendMobile from "./tracks/frontend-mobile.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const trackModules = [
  softwareEngineering,
  dataEngineering,
  machineLearning,
  aiEngineering,
  platformInfrastructure,
  distributedSystems,
  frontendMobile,
];

const MINUTES = { easy: 2, medium: 3, hard: 3 };
const DIFFICULTIES = ["easy", "medium", "hard"];

function drillFromOnboarding(entry) {
  return {
    id: entry.id,
    parentPromptId: "nugget-basics",
    track: entry.track,
    componentId: entry.componentId,
    componentLabel: entry.componentId.replace(/-/g, " "),
    difficulty: "onboarding",
    format: "text-only",
    onboardingOrder: entry.onboardingOrder,
    minutes: 2,
    title: entry.title,
    failureClass: entry.failureClass,
    symptoms: entry.symptoms,
    opener: entry.opener,
    referenceFix: entry.referenceFix,
    probes: entry.probes,
    mapsTo: entry.mapsTo,
    locale: "en",
  };
}

function drillFromComponent(track, component, difficulty) {
  const tier = component[difficulty];
  return {
    id: `nugget-basics/${track}/${component.componentId}/${difficulty}`,
    parentPromptId: "nugget-basics",
    track,
    componentId: component.componentId,
    componentLabel: component.label,
    difficulty,
    format: "diagram",
    onboardingOrder: null,
    minutes: MINUTES[difficulty],
    title: tier.title,
    symptoms: tier.symptoms,
    opener: tier.opener,
    referenceFix: tier.referenceFix,
    probes: tier.probes,
    mapsTo: tier.mapsTo,
    locale: "en",
  };
}

const drills = onboardingDrills.map(drillFromOnboarding);

for (const mod of trackModules) {
  for (const component of mod.components) {
    for (const difficulty of DIFFICULTIES) {
      drills.push(drillFromComponent(mod.track, component, difficulty));
    }
  }
}

const catalog = {
  schemaVersion: 1,
  parentPromptId: "nugget-basics",
  productName: "Nugget-basics",
  locale: "en",
  meta: {
    onboardingTextOnlyCount: 5,
    matrixDrillCount: 168,
    totalDrillCount: drills.length,
    anonymousAccess: true,
    anonymousReview: "debrief_only",
    signedInReview: "full_drill_review",
    conductor: "full_with_probes",
    contentLanguage: "en-only-v1",
  },
  tracks: trackModules.map((mod) => ({
    id: mod.track,
    components: mod.components.map((c) => ({ id: c.componentId, label: c.label })),
  })),
  drills,
};

const outPath = path.join(root, "catalog.json");
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

const counts = new Map();
for (const d of drills) counts.set(d.track, (counts.get(d.track) ?? 0) + 1);
console.log(`Wrote ${drills.length} drills to ${outPath}`);
for (const [track, n] of [...counts.entries()].sort()) console.log(`  ${track}: ${n}`);