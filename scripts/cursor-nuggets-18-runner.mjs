import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateNuggetFile, MAX_NUGGETS_PER_PARENT } from "../server/modules/nuggets/schema.js";
import { INCIDENTS } from "./cursor-nuggets-18-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = path.join(root, "server", "content", "packs");
const nuggetsDir = path.join(root, "server", "content", "nuggets");

const PROMPT_IDS = [
  "ad-click-prediction",
  "code-assistant",
  "collaborative-editor",
  "collaborative-whiteboard",
  "config-control-plane",
  "content-moderation",
  "data-alerting",
  "data-quality",
  "deployment-platform",
  "distributed-cache",
  "distributed-lock-service",
  "distributed-message-queue",
  "document-ingestion",
  "dynamic-pricing",
  "ecommerce-warehouse",
  "eta-prediction",
  "etl-framework",
  "experimentation-analytics",
];

function slug(parentId) {
  return parentId.replace(/^deep\./, "").replace(/\./g, "-");
}

function loadHeader(promptId) {
  const existing = JSON.parse(readFileSync(path.join(nuggetsDir, `${promptId}.json`), "utf8"));
  return { packVersion: existing.packVersion, inputsFingerprint: existing.inputsFingerprint };
}

function buildNugget(promptId, agendaItem, incident) {
  const id = `${promptId}/${incident.slug ?? slug(agendaItem.id)}`;
  return {
    id,
    title: incident.title,
    minutes: incident.minutes ?? 3,
    parentAgendaItemId: agendaItem.id,
    scenario: {
      symptoms: incident.symptoms,
      interviewerSetup: incident.interviewerSetup,
    },
    diagram: incident.diagram,
    incident: incident.incident,
    miniPack: {
      agenda: [
        {
          id: incident.agendaId ?? "incident.fix",
          stage: "incident",
          dimension: agendaItem.dimension,
          weight: 3,
          required: true,
          goal: agendaItem.goal,
          opener: incident.opener ?? agendaItem.opener,
          evidence: agendaItem.evidence,
          misconceptions: (agendaItem.misconceptions ?? []).slice(0, 3),
          probes: agendaItem.probes.slice(0, 3),
          hints: agendaItem.hints.slice(0, 2),
          referenceFix: incident.referenceFix ?? agendaItem.moveOnSummary,
        },
      ],
      pacing: { incident: 0.85, wrap_up: 0.15 },
    },
    status: "published",
    source: "cursor",
  };
}

const written = [];
const failures = [];

for (const promptId of PROMPT_IDS) {
  try {
    const pack = JSON.parse(readFileSync(path.join(packsDir, `${promptId}.json`), "utf8"));
    const deepItems = pack.agenda.filter((item) => item.stage === "deep_dive").slice(0, MAX_NUGGETS_PER_PARENT);
    const byParent = INCIDENTS[promptId] ?? {};
    const nuggets = deepItems.map((item) => {
      const incident = byParent[item.id];
      if (!incident) throw new Error(`missing incident for ${promptId} ${item.id}`);
      return buildNugget(promptId, item, incident);
    });
    const header = loadHeader(promptId);
    const file = { promptId, ...header, nuggets };
    validateNuggetFile(file);
    writeFileSync(path.join(nuggetsDir, `${promptId}.json`), `${JSON.stringify(file, null, 2)}\n`);
    written.push(`${promptId}.json (${nuggets.length} nuggets)`);
  } catch (error) {
    failures.push(`${promptId}: ${error.message}`);
  }
}

console.log("Written:");
for (const line of written) console.log(`  - ${line}`);
if (failures.length) {
  console.error("\nFailures:");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
