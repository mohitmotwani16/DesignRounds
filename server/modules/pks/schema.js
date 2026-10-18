import crypto from "node:crypto";
import { z } from "zod";
import { TOPICS } from "../../../src/learn/catalog.js";
import { componentKinds, isAnonymousKind } from "../ai/components.js";
import { dimensionIds } from "../ai/rubric.js";
import { integer, list, oneOf, text } from "../ai/schema.js";

// The Problem Pack (docs/design/problem-knowledge-service.md, section 4): everything
// known about one question, as validated JSON. `packContent` is what the builder model
// writes; `finishPack` adds identity fields and the content-hash version.

export const STAGES = ["requirements", "high_level", "deep_dive", "wrap_up"];
export const BANDS = ["strong", "adequate", "weak"];
export const PACK_SCHEMA_VERSION = 1;

const ID = /^[a-z][a-z0-9_.-]{1,39}$/;
const id = (description) => text(40, description);

const agendaItem = z.object({
  id: id("Short dotted slug, unique in the pack, e.g. req.scale or deep.codegen."),
  stage: oneOf(STAGES, "The interview stage this item belongs to."),
  dimension: oneOf(dimensionIds, "The rubric dimension this item evidences."),
  weight: integer(1, 3, "3 = central to this question."),
  required: z.boolean().describe("True when any passing answer must reach this item."),
  triggers: z.object({
    componentKinds: list(z.string(), { max: 8 }, "Canvas component kinds that suggest this item."),
    keywords: list(z.string(), { max: 10 }, "Words in the candidate's answer that suggest this item."),
  }),
  goal: text(300, "What this item must achieve, judged by outcome."),
  opener: text(300, "The question that starts this item. One question, no hints."),
  evidence: z.object({
    strong: text(400, "Observable behaviour of a strong answer."),
    adequate: text(400, "Observable behaviour of an adequate answer."),
    weak: text(400, "Observable behaviour of a weak answer."),
  }),
  misconceptions: list(z.object({
    id: id("Short slug for the misconception."),
    pattern: text(240, "The wrong belief."),
    challenge: text(300, "One counterexample question that tests it."),
  }), { max: 3 }, "Common wrong beliefs for this item."),
  probes: list(text(300, "A follow-up question for a vague answer."), { min: 1, max: 3 }, "Follow-ups."),
  hints: list(text(300, "A hint."), { min: 1, max: 3 }, "A ladder from gentle to specific."),
  moveOnSummary: text(300, "One sentence naming a standard answer, used privately."),
  learnTopics: list(z.string(), { max: 4 }, "Learn handbook slugs from the list given."),
});

export const packContent = z.object({
  opening: text(400, "A realistic, deliberately vague first line."),
  clarifications: list(z.object({
    id: id("Short slug for the fact, e.g. scale.writes."),
    topics: list(z.string(), { min: 1, max: 8 }, "Keywords a candidate's question would contain."),
    answer: text(300, "The fact, stated as the interviewer would say it."),
  }), { min: 1, max: 14 }, "Hidden facts revealed only when asked."),
  clarificationPolicy: text(300, "How to decide anything not listed."),
  agenda: list(agendaItem, { min: 6, max: 16 }, "Topics a strong interview touches, across the four stages."),
  curveballs: list(z.object({
    id: id("Short slug."),
    after: id("The agenda item id this curveball follows."),
    prompt: text(300, "What the interviewer says."),
    agendaItemId: id("The agenda item this curveball opens."),
  }), { max: 3 }, "Harder twists for a strong deep dive."),
  vocabulary: list(z.string(), { max: 30 }, "Domain terms speech-to-text may mis-hear."),
  alternatives: list(z.object({
    choice: text(200, "A valid alternative approach."),
    whenBetter: text(300, "When it's the better choice."),
  }), { max: 6 }, "Alternatives a reviewer should credit."),
  exemplars: list(z.object({
    band: oneOf(BANDS, "Band of this exemplar."),
    label: text(120, "Short label."),
    outline: text(1200, "Outline of the answer, in your own words."),
  }), { max: 3 }, "Short outlines for the final review only."),
  pacing: z.object({
    requirements: z.number().min(0).max(1).describe("Share of the round."),
    high_level: z.number().min(0).max(1).describe("Share of the round."),
    deep_dive: z.number().min(0).max(1).describe("Share of the round."),
    wrap_up: z.number().min(0).max(1).describe("Share of the round."),
  }).describe("Shares of the round per stage; they sum to 1."),
});

// Canonical JSON: sorted keys, so the same pack always hashes and renders the same.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function packVersion(pack) {
  const { version: _version, ...rest } = pack;
  return `pack-${crypto.createHash("sha256").update(canonicalJson(rest)).digest("hex").slice(0, 8)}`;
}

export function finishPack(content, { promptId, inputsFingerprint, builder }) {
  const pack = { schemaVersion: PACK_SCHEMA_VERSION, promptId, inputsFingerprint, builder, ...packContent.parse(content) };
  return { ...pack, version: packVersion(pack) };
}

const learnSlugs = new Set(TOPICS.map((topic) => topic.slug));

// Drops references a model can plausibly get wrong but that don't change the pack's
// meaning (an unknown Learn slug or component kind), and reports each as a warning.
export function sanitizeContent(content) {
  const kinds = componentKinds();
  const warnings = [];
  const agenda = (content.agenda ?? []).map((item) => {
    const unknownTopics = (item.learnTopics ?? []).filter((slug) => !learnSlugs.has(slug));
    const unknownKinds = (item.triggers?.componentKinds ?? []).filter((kind) => !kinds.has(kind));
    if (unknownTopics.length) warnings.push(`${item.id}: dropped unknown Learn topics ${unknownTopics.join(", ")}`);
    if (unknownKinds.length) warnings.push(`${item.id}: dropped unknown component kinds ${unknownKinds.join(", ")}`);
    return {
      ...item,
      learnTopics: (item.learnTopics ?? []).filter((slug) => learnSlugs.has(slug)),
      triggers: { ...item.triggers, componentKinds: (item.triggers?.componentKinds ?? []).filter((kind) => kinds.has(kind)) },
    };
  });
  return { content: { ...content, agenda }, warnings };
}

// Numbers that carry a fact ("100 million", "100:1", "50ms", "99.9%"), normalised. Single
// digits and bare "10x"-style multipliers are too common to signal a leak.
const SCALE_WORDS = { thousand: "k", k: "k", million: "m", m: "m", mn: "m", billion: "b", b: "b", bn: "b" };
export function factNumbersIn(text) {
  const found = [];
  const source = String(text ?? "").toLowerCase().replace(/(?<=\d),(?=\d{3}\b)/g, "");
  for (const match of source.matchAll(/(\d+(?:\.\d+)?)\s*(:\s*\d+|%|ms|thousand|million|billion|mn|bn|[kmb]\b)?/g)) {
    const [, number, unit = ""] = match;
    const suffix = unit.replace(/\s/g, "");
    if (number.length < 2 && !suffix) continue;
    if (/^\d+x$/.test(`${number}${source[match.index + match[0].length] ?? ""}`)) continue;
    found.push(`${number}${SCALE_WORDS[suffix] ?? suffix}`);
  }
  return found;
}

// Sentences long enough that finding one elsewhere means it was copied.
const sentences = (value) => String(value).split(/(?<=[.!?])\s+/).map((part) => part.trim().toLowerCase()).filter((part) => part.length >= 40);

// Structural rules beyond the schema. Returns problems as strings; empty means valid.
export function validatePack(pack) {
  const errors = [];
  const kinds = componentKinds();
  const unique = (label, ids) => {
    const seen = new Set();
    for (const value of ids) {
      if (!ID.test(value)) errors.push(`${label} id "${value}" must be a short lowercase slug`);
      if (seen.has(value)) errors.push(`${label} id "${value}" is not unique`);
      seen.add(value);
    }
  };
  unique("agenda item", pack.agenda.map((item) => item.id));
  unique("clarification", pack.clarifications.map((item) => item.id));
  unique("curveball", pack.curveballs.map((item) => item.id));
  for (const item of pack.agenda) unique(`${item.id} misconception`, item.misconceptions.map((entry) => entry.id));

  const itemIds = new Set(pack.agenda.map((item) => item.id));
  for (const stage of STAGES) {
    if (!pack.agenda.some((item) => item.stage === stage && item.required)) errors.push(`stage ${stage} has no required item`);
  }
  for (const item of pack.agenda) {
    for (const band of BANDS) if (!item.evidence[band]) errors.push(`${item.id} has no ${band} evidence`);
    if (!item.goal || !item.opener || !item.moveOnSummary) errors.push(`${item.id} needs a goal, an opener and a move-on summary`);
    for (const slug of item.learnTopics) if (!learnSlugs.has(slug)) errors.push(`${item.id} links unknown Learn topic "${slug}"`);
    for (const kind of item.triggers.componentKinds) if (!kinds.has(kind)) errors.push(`${item.id} triggers on unknown component kind "${kind}"`);
  }
  const byId = new Map(pack.agenda.map((item) => [item.id, item]));
  for (const curveball of pack.curveballs) {
    if (!itemIds.has(curveball.agendaItemId)) errors.push(`curveball ${curveball.id} opens unknown item ${curveball.agendaItemId}`);
    if (!itemIds.has(curveball.after)) errors.push(`curveball ${curveball.id} follows unknown item ${curveball.after}`);
    // A curveball raises the bar: it opens a new, optional deep-dive item, never the one it follows.
    if (curveball.agendaItemId === curveball.after) errors.push(`curveball ${curveball.id} must open a different item than the one it follows`);
    const target = byId.get(curveball.agendaItemId);
    if (target && (target.stage !== "deep_dive" || target.required)) errors.push(`curveball ${curveball.id} must open an optional deep_dive item`);
  }

  // Hidden facts are told only when asked: no number from a clarification may appear in
  // anything the interviewer says unprompted.
  const factNumbers = new Set(pack.clarifications.flatMap((fact) => factNumbersIn(fact.answer)));
  const unprompted = [["opening", pack.opening], ...pack.agenda.flatMap((item) => [[`${item.id} opener`, item.opener], ...item.probes.map((probe) => [`${item.id} probe`, probe]), ...item.hints.map((hint) => [`${item.id} hint`, hint])])];
  for (const [where, value] of unprompted) {
    const leaked = factNumbersIn(value).filter((number) => factNumbers.has(number));
    if (leaked.length) errors.push(`${where} reveals hidden fact ${leaked.join(", ")}`);
  }
  // Adaptive, varied deep dives need options, and the canvas check needs names to look for.
  const deepDive = pack.agenda.filter((item) => item.stage === "deep_dive");
  if (deepDive.length < 4) errors.push(`the deep_dive stage needs at least 4 items (has ${deepDive.length}) so the deep dive can follow the candidate`);
  if (deepDive.filter((item) => item.required).length > 3) errors.push("at most 3 deep_dive items may be required");
  const drawable = deepDive.filter((item) => item.triggers.componentKinds.some((kind) => !isAnonymousKind(kind)));
  if (drawable.length < 3) errors.push(`at least 3 deep_dive items need a specific component kind to be drawn (has ${drawable.length})`);
  for (const item of pack.agenda.filter((entry) => entry.stage === "high_level" || entry.stage === "deep_dive")) {
    if (item.triggers.keywords.length < 3) errors.push(`${item.id} needs at least 3 trigger keywords`);
    if (item.triggers.componentKinds.length && !item.triggers.componentKinds.some((kind) => !isAnonymousKind(kind)) && item.triggers.keywords.length < 3) errors.push(`${item.id} lists only generic component kinds and too few keywords to recognise it on the canvas`);
  }
  const shares = STAGES.map((stage) => pack.pacing[stage]);
  if (shares.some((share) => !(share > 0))) errors.push("every stage needs a positive pacing share");
  if (Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1) > 0.01) errors.push("pacing shares must sum to 1");
  if (!pack.opening) errors.push("the pack needs an opening line");

  // Leakage: nothing the candidate can hear may copy an exemplar or a move-on summary.
  const secret = [...pack.exemplars.flatMap((exemplar) => sentences(exemplar.outline)), ...pack.agenda.map((item) => item.moveOnSummary.trim().toLowerCase()).filter((summary) => summary.length >= 40)];
  const spoken = [
    ["opening", pack.opening],
    ...pack.agenda.flatMap((item) => [[`${item.id} opener`, item.opener], ...item.probes.map((probe) => [`${item.id} probe`, probe]), ...item.hints.map((hint) => [`${item.id} hint`, hint])]),
  ];
  for (const [where, value] of spoken) {
    const lower = String(value).toLowerCase();
    if (secret.some((sentence) => lower.includes(sentence))) errors.push(`${where} copies exemplar or move-on text`);
  }
  return errors;
}

// Full check of a stored or hand-authored pack: schema, identity and rules.
export function checkPack(pack) {
  const problems = [];
  const parsed = packContent.safeParse(pack);
  if (!parsed.success) return parsed.error.issues.slice(0, 12).map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  if (pack.schemaVersion !== PACK_SCHEMA_VERSION) problems.push(`schemaVersion must be ${PACK_SCHEMA_VERSION}`);
  if (!pack.promptId) problems.push("promptId is required");
  if (pack.version !== packVersion(pack)) problems.push(`version ${pack.version} does not match the content hash ${packVersion(pack)}`);
  return [...problems, ...validatePack({ ...pack, ...parsed.data })];
}
