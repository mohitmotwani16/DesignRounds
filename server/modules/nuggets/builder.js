import { z } from "zod";
import { componentKinds } from "../ai/components.js";
import { clean } from "../ai/context.js";
import { dimensionIds } from "../ai/rubric.js";
import { runTask } from "../ai/run.js";
import { integer, list, oneOf, text } from "../ai/schema.js";
import { inputsFor } from "../pks/inputs.js";
import { finishPack } from "../pks/schema.js";
import { getPack, publishedVersion, readPackFiles } from "../pks/index.js";
import { validateNuggetFile, MAX_NUGGETS_PER_PARENT } from "./schema.js";

export const NUGGET_BUILDER = "nugget-builder-v1";

const diagramNode = z.object({
  id: text(80, "Unique node id"),
  type: z.enum(["systemNode"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    kind: text(64, "Component kind from component_kinds"),
    label: text(120, "Short label on the canvas"),
  }),
});

const diagramEdge = z.object({
  id: text(80, "Unique edge id"),
  source: text(80, "Source node id"),
  target: text(80, "Target node id"),
  label: text(80, "Edge label; use empty string if none"),
});

const miniAgendaItem = z.object({
  id: text(40, "Usually incident.fix"),
  stage: z.enum(["incident"]),
  dimension: oneOf(dimensionIds, "Rubric dimension"),
  weight: integer(1, 3, "Weight 1-3"),
  goal: text(300, "What a strong fix achieves"),
  opener: text(400, "Interviewer opening question"),
  evidence: z.object({
    strong: text(400),
    adequate: text(400),
    weak: text(400),
  }),
  misconceptions: list(z.object({
    id: text(40),
    pattern: text(240),
    challenge: text(300),
  }), { min: 0, max: 3 }, "Up to 3 misconceptions"),
  probes: list(text(300), { min: 1, max: 3 }, "Follow-up probes"),
  hints: list(text(300), { min: 1, max: 2 }, "Hint ladder"),
  referenceFix: text(800, "Private strong fix for debrief"),
});

const nuggetOutput = z.object({
  nuggets: list(z.object({
    id: text(80, "Slug only or full id promptId/slug"),
    title: text(120),
    minutes: integer(2, 5, "Drill length in minutes"),
    parentAgendaItemId: text(40, "Matching deep_dive agenda item id, or empty string"),
    scenario: z.object({ symptoms: text(600), interviewerSetup: text(800) }),
    diagram: z.object({
      nodes: list(diagramNode, { min: 3, max: 16 }, "systemNode diagram"),
      edges: list(diagramEdge, { min: 2, max: 24 }, "Connections between nodes"),
      viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
    }),
    incident: z.object({
      nodeIds: list(text(80), { min: 1, max: 8 }, "Highlighted broken node ids"),
      edgeIds: list(text(80), { min: 0, max: 12 }, "Highlighted edge ids"),
      headline: text(200),
    }),
    miniPack: z.object({
      agenda: list(miniAgendaItem, { min: 1, max: 1 }, "Exactly one agenda item"),
      pacing: z.object({ incident: z.number(), wrap_up: z.number() }),
    }),
  }), { min: 1, max: MAX_NUGGETS_PER_PARENT }, "Generated nuggets"),
});

function normalizePacing(pacing) {
  let incident = Number(pacing?.incident);
  let wrap_up = Number(pacing?.wrap_up);
  if (!Number.isFinite(incident) || incident > 1 || incident < 0.5) incident = 0.85;
  if (!Number.isFinite(wrap_up) || wrap_up > 0.5) wrap_up = 0.15;
  if (incident + wrap_up > 1.01) {
    incident = 0.85;
    wrap_up = 0.15;
  }
  return { incident, wrap_up };
}

function incidentTitle(goal) {
  const line = String(goal ?? "").replace(/\s+/g, " ").trim();
  const short = line.split(/[.:;]/)[0]?.trim() || line;
  return short.length > 100 ? `${short.slice(0, 97)}…` : short;
}

function fakeNuggets({ inputs, pack, promptId }) {
  const deepItems = pack.agenda.filter((item) => item.stage === "deep_dive").slice(0, MAX_NUGGETS_PER_PARENT);
  const items = deepItems.length ? deepItems : pack.agenda.slice(0, MAX_NUGGETS_PER_PARENT);
  return items.map((item, index) => {
    const nId = `${promptId}/${item.id.replace(/\./g, "-")}`;
    const cache = `n-cache-${index}`;
    const app = `n-app-${index}`;
    const db = `n-db-${index}`;
    const headline = incidentTitle(item.goal);
    return {
      id: nId,
      title: headline,
      minutes: Math.min(5, Math.max(2, 3 + (index % 3))),
      parentAgendaItemId: item.id,
      scenario: {
        symptoms: `Production metrics degraded on ${inputs.brief.title}: elevated latency, errors, or saturation aligned with ${item.id}.`,
        interviewerSetup: item.moveOnSummary || item.goal,
      },
      diagram: {
        viewport: { x: 0, y: 0, zoom: 0.85 },
        nodes: [
          { id: "n-user", type: "systemNode", position: { x: 40, y: 120 }, data: { kind: "user", label: "Users" } },
          { id: app, type: "systemNode", position: { x: 280, y: 120 }, data: { kind: "app-server", label: "Service" } },
          { id: cache, type: "systemNode", position: { x: 480, y: 40 }, data: { kind: "cache", label: "Cache" } },
          { id: db, type: "systemNode", position: { x: 480, y: 200 }, data: { kind: "database", label: "Store" } },
        ],
        edges: [
          { id: `e1-${index}`, source: "n-user", target: app },
          { id: `e2-${index}`, source: app, target: cache },
          { id: `e3-${index}`, source: app, target: db },
        ],
      },
      incident: { nodeIds: [cache, db], edgeIds: [`e2-${index}`, `e3-${index}`], headline },
      miniPack: {
        agenda: [{
          id: "incident.fix",
          stage: "incident",
          dimension: item.dimension,
          weight: 3,
          required: true,
          goal: item.goal,
          opener: item.opener,
          evidence: item.evidence,
          misconceptions: (item.misconceptions ?? []).slice(0, 3),
          probes: item.probes.slice(0, 3),
          hints: item.hints.slice(0, 2),
          referenceFix: item.moveOnSummary,
        }],
        pacing: { incident: 0.85, wrap_up: 0.15 },
      },
      status: "published",
      source: "generated",
    };
  });
}

async function packForBuild(promptId) {
  const version = await publishedVersion(promptId);
  if (version) {
    const { pack } = await getPack(promptId, version);
    return { pack, version };
  }
  const file = readPackFiles().find((entry) => entry.promptId === promptId);
  if (!file) throw new Error("no Problem Pack (missing server/content/packs file and nothing published in the database)");
  const inputs = await inputsFor(promptId);
  const pack = finishPack(file.content, { promptId, inputsFingerprint: inputs.fingerprint, builder: "manual" });
  return { pack, version: pack.version };
}

async function nuggetBuildTask() {
  return {
    name: "nugget_build",
    system: "You generate incident drill nuggets for system design practice. Output valid JSON only.",
    buildUser: ({ inputs, pack, promptId }) => [
      `<brief>${clean(inputs.brief.title)}</brief>`,
      `<agenda_deep_dive>${JSON.stringify(pack.agenda.filter((item) => item.stage === "deep_dive").slice(0, MAX_NUGGETS_PER_PARENT))}</agenda_deep_dive>`,
      `<component_kinds>${[...componentKinds()].sort().join(", ")}</component_kinds>`,
      `<prompt_id>${promptId}</prompt_id>`,
      "Generate up to 5 nuggets. Each needs a diagram using systemNode types and kinds from component_kinds, an incident subset, and miniPack with one agenda item.",
    ].join("\n"),
    output: nuggetOutput,
    fake: ({ inputs, pack, promptId }) => ({ nuggets: fakeNuggets({ inputs, pack, promptId }) }),
  };
}

export async function buildNuggetsForPrompt(promptId, { fake = false, publish = false } = {}) {
  const inputs = await inputsFor(promptId);
  if (!inputs) throw new Error("unknown question");
  const { pack, version } = await packForBuild(promptId);
  const task = await nuggetBuildTask();
  const result = fake
    ? task.fake({ inputs, pack, promptId })
    : (await runTask(task, { inputs, pack, promptId }, { userId: null, sessionId: null })).data;
  const file = {
    promptId,
    packVersion: version,
    inputsFingerprint: inputs.fingerprint,
    nuggets: result.nuggets.map((nugget) => {
      const parentAgendaItemId = nugget.parentAgendaItemId?.trim() || undefined;
      const edges = nugget.diagram.edges.map(({ label, ...edge }) => (label?.trim() ? { ...edge, label: label.trim() } : edge));
      return {
        ...nugget,
        ...(parentAgendaItemId ? { parentAgendaItemId } : {}),
        diagram: {
          ...nugget.diagram,
          edges,
          viewport: nugget.diagram.viewport ?? { x: 0, y: 0, zoom: 0.85 },
        },
        miniPack: {
          ...nugget.miniPack,
          pacing: normalizePacing(nugget.miniPack.pacing),
          agenda: nugget.miniPack.agenda.map((item) => ({ ...item, required: true })),
        },
        id: nugget.id.includes("/") ? nugget.id : `${promptId}/${nugget.id}`,
        status: publish ? "published" : (nugget.status ?? "draft"),
        source: "generated",
      };
    }),
  };
  validateNuggetFile(file);
  return file;
}
