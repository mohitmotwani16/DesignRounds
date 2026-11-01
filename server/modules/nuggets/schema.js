import crypto from "node:crypto";
import { z } from "zod";
import { dimensionIds } from "../ai/rubric.js";
import { integer, list, oneOf, text } from "../ai/schema.js";
import { STAGES as PACK_STAGES } from "../pks/schema.js";

export const NUGGET_SCHEMA_VERSION = 1;
export const MAX_NUGGETS_PER_PARENT = 5;
const ID = /^[a-z][a-z0-9_.-]{1,63}$/;

const finite = z.number().finite().min(-1e6).max(1e6);
const nodeId = z.string().min(1).max(80);

const columnSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.string().max(40).optional(),
  keys: z.array(z.enum(["pk", "fk", "part", "sort"])).max(4).optional(),
  ref: z.string().max(120).optional(),
});

const nodeSchema = z.object({
  id: nodeId,
  type: z.enum(["systemNode", "groupNode", "textNode", "noteNode", "tableNode", "pointNode"]),
  position: z.object({ x: finite, y: finite }),
  width: z.number().finite().min(20).max(4000).optional(),
  height: z.number().finite().min(20).max(4000).optional(),
  zIndex: z.number().int().min(-10).max(1000).optional(),
  data: z.object({
    kind: z.string().max(64),
    label: z.string().max(120),
    subtitle: z.string().max(120).optional(),
    note: z.string().max(2000).optional(),
    color: z.string().max(24).optional(),
    columns: z.array(columnSchema).max(60).optional(),
  }),
});

const edgeSchema = z.object({
  id: nodeId,
  source: nodeId,
  target: nodeId,
  sourceHandle: z.string().max(40).nullable().optional(),
  targetHandle: z.string().max(40).nullable().optional(),
  label: z.string().max(80).optional(),
  data: z.object({
    style: z.enum(["sync", "async"]).optional(),
    bidirectional: z.boolean().optional(),
    bend: z.object({ x: finite, y: finite }).optional(),
  }).optional(),
});

export const diagramSchema = z.object({
  nodes: z.array(nodeSchema).max(400),
  edges: z.array(edgeSchema).max(800),
  viewport: z.object({ x: finite, y: finite, zoom: z.number().finite().min(0.05).max(8) }).optional(),
}).superRefine((diagram, ctx) => {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  if (nodeIds.size !== diagram.nodes.length) ctx.addIssue({ code: "custom", message: "duplicate node id" });
  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      ctx.addIssue({ code: "custom", message: `edge ${edge.id} references a missing node` });
    }
  }
});

const miniAgendaItem = z.object({
  id: z.string().regex(ID),
  stage: z.literal("incident"),
  dimension: oneOf(dimensionIds, "Rubric dimension for this drill."),
  weight: integer(1, 3, "Weight for scoring context."),
  required: z.literal(true),
  goal: text(300, "What a strong fix achieves."),
  opener: text(400, "How the interviewer opens the drill."),
  evidence: z.object({
    strong: text(400),
    adequate: text(400),
    weak: text(400),
  }),
  misconceptions: list(z.object({
    id: z.string().regex(ID),
    pattern: text(240),
    challenge: text(300),
  }), { max: 3 }).default([]),
  probes: list(text(300), { min: 1, max: 3 }),
  hints: list(text(300), { min: 1, max: 2 }),
  referenceFix: text(800, "Private: what a strong fix looks like, for debrief."),
});

export const miniPackSchema = z.object({
  agenda: z.tuple([miniAgendaItem]),
  pacing: z.object({
    incident: z.number().min(0.5).max(1),
    wrap_up: z.number().min(0).max(0.5),
  }),
});

export const nuggetSchema = z.object({
  id: z.string().min(3).max(120),
  title: text(120, "Short title for the incident."),
  minutes: z.number().int().min(2).max(5),
  parentAgendaItemId: z.string().regex(ID).optional(),
  scenario: z.object({
    symptoms: text(600, "What the learner sees in the UI."),
    interviewerSetup: text(800, "Private context for the model."),
  }),
  diagram: diagramSchema,
  incident: z.object({
    nodeIds: list(nodeId, { min: 1, max: 12 }),
    edgeIds: list(nodeId, { max: 12 }).default([]),
    headline: text(200, "One-line failure summary."),
  }),
  miniPack: miniPackSchema,
  status: z.enum(["draft", "published"]).default("published"),
  source: z.enum(["hand", "generated", "cursor"]).default("hand"),
});

export const parentFileSchema = z.object({
  promptId: z.string().min(1).max(80),
  packVersion: z.string().optional(),
  inputsFingerprint: z.string().optional(),
  nuggets: list(nuggetSchema, { min: 1, max: MAX_NUGGETS_PER_PARENT }),
});

export function validateNuggetFile(raw) {
  const file = parentFileSchema.parse(raw);
  const ids = new Set();
  for (const nugget of file.nuggets) {
    if (!nugget.id.startsWith(`${file.promptId}/`) || nugget.id.length <= file.promptId.length + 1) {
      throw new Error(`nugget id ${nugget.id} must be ${file.promptId}/<slug>`);
    }
    if (ids.has(nugget.id)) throw new Error(`duplicate nugget id ${nugget.id}`);
    ids.add(nugget.id);
    const nodeIds = new Set(nugget.diagram.nodes.map((node) => node.id));
    for (const id of nugget.incident.nodeIds) {
      if (!nodeIds.has(id)) throw new Error(`${nugget.id}: incident node ${id} not in diagram`);
    }
    for (const id of nugget.incident.edgeIds) {
      if (!nugget.diagram.edges.some((edge) => edge.id === id)) throw new Error(`${nugget.id}: incident edge ${id} not in diagram`);
    }
  }
  return file;
}

export function nuggetContentVersion(nugget) {
  const { status: _s, ...rest } = nugget;
  const json = JSON.stringify(rest, Object.keys(rest).sort());
  return `nugget-${crypto.createHash("sha256").update(json).digest("hex").slice(0, 8)}`;
}

/** Map a nugget miniPack into a Problem Pack shape the Conductor already understands. */
export function miniPackAsProblemPack(nugget) {
  const item = nugget.miniPack.agenda[0];
  return {
    opening: nugget.scenario.symptoms,
    clarifications: [],
    clarificationPolicy: "This is a short incident drill. Do not reveal the full fix; coach the learner toward it.",
    agenda: [{
      ...item,
      stage: "deep_dive",
      triggers: { componentKinds: [], keywords: [] },
      moveOnSummary: item.referenceFix.slice(0, 300),
      learnTopics: [],
    }],
    curveballs: [],
    vocabulary: [],
    alternatives: [],
    exemplars: [],
    pacing: { requirements: 0, high_level: 0, deep_dive: nugget.miniPack.pacing.incident, wrap_up: nugget.miniPack.pacing.wrap_up },
  };
}

export const INCIDENT_STAGE = "deep_dive";
