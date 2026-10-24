import { groupOf } from "./components.js";
import { dimensionIds } from "./rubric.js";

// Deterministic checks on the model's dimension scores. The model judges the design;
// these rules keep its numbers consistent with facts counted from the diagram, with its
// own structured judgements (decision ratings, gap severities) and, on interviewer
// rounds, with what the interview notepad verified. Rules only cap or floor a score,
// never invent one, and every change is recorded with a reason the learner can read.
// Bump `version` whenever a rule or threshold changes; it is part of the review's
// template version, so a cached review is never reused across rule changes.
export const scoringVersion = "constraints-v3";

const STORAGE_GROUPS = new Set(["databases", "cache", "storage", "data", "tech-data", "tech-analytics"]);
// A data store drawn with a generic kind still counts when its label says what it is.
// Client-side stores (IndexedDB, local storage) and coordination stores count too.
const STORAGE_WORDS = /\b(db|dbs|database|databases|datastore|storage|cache|postgres(ql)?|mysql|sql|sqlite|mongo(db)?|dynamo(db)?|cassandra|redis|memcached?|s3|bucket|blob|warehouse|data lake|elasticsearch|bigtable|spanner|hbase|key-value|kv store|indexeddb|localstorage|etcd|zookeeper|consul)\b/i;

const JUSTIFICATION = { "well-justified": 1, "partly-justified": 0.5, unexplained: 0, incorrect: 0 };
// What a notepad item says about its dimension, on the 0-10 scale. Items the round
// never reached (or never opened) say nothing, so they are left out.
const LEDGER_VALUE = { strong: 9, adequate: 7, weak: 4 };
const ASKED = new Set(["answered", "partial", "missed"]);
// A dimension stays within one band above, and three below, what the notepad verified.
const LEDGER_ABOVE = 1;
const LEDGER_BELOW = 3;

const clamp = (value) => Math.max(0, Math.min(10, value));
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const cap = (dimension, value, rule, reason) => ({ dimension, type: "cap", value: clamp(value), rule, reason });
const floor = (dimension, value, rule, reason) => ({ dimension, type: "floor", value: clamp(value), rule, reason });
const everyDimension = (make) => dimensionIds.map((id) => make(id));

export function hasStorage(components) {
  return components.some((component) => STORAGE_GROUPS.has(groupOf(component.kind)) || STORAGE_WORDS.test(`${component.kind} ${component.label}`));
}

function ledgerValue(item) {
  if (item.status === "missed") return 1;
  if (item.status === "partial") return LEDGER_VALUE.weak;
  return LEDGER_VALUE[item.band] ?? LEDGER_VALUE.adequate;
}

// Facts the rules work from, all counted rather than judged.
export function signals({ design, decisions = [], risks = [], ledgerItems = null, spoke = false }) {
  const rated = decisions.filter((decision) => decision.explanation in JUSTIFICATION);
  const ledger = ledgerItems
    ? Object.fromEntries(dimensionIds.map((id) => {
      const asked = ledgerItems.filter((item) => item.dimension === id && ASKED.has(item.status));
      const weight = asked.reduce((sum, item) => sum + (item.weight || 1), 0);
      const implied = weight ? asked.reduce((sum, item) => sum + ledgerValue(item) * (item.weight || 1), 0) / weight : null;
      return [id, { asked: asked.length, answered: asked.filter((item) => item.status === "answered").length, helped: asked.filter((item) => item.helped).length, implied }];
    }))
    : null;
  return {
    // A data model table with columns is part of the design, as much as a service is.
    components: design.componentCount + (design.filledTableCount ?? 0),
    services: design.componentCount,
    isolated: design.isolatedCount ?? 0,
    storage: hasStorage(design.components ?? []),
    statedReasons: design.explainedCount + design.decisionNoteCount + design.labelledEdgeCount,
    spoke,
    decisions: rated.length,
    // A choice the candidate reached only after the interviewer pointed out a problem
    // (a hint, a challenge, a follow-up exposing a flaw) counts as partly justified.
    wellJustified: rated.filter((decision) => decision.explanation === "well-justified" && decision.reached !== "corrected").length,
    partlyJustified: rated.filter((decision) => decision.explanation === "partly-justified").length,
    justification: rated.length ? rated.reduce((sum, decision) => sum + Math.min(JUSTIFICATION[decision.explanation], decision.reached === "corrected" ? 0.5 : 1), 0) / rated.length : null,
    overBuilt: decisions.filter((decision) => decision.sizing === "over-engineered" || decision.necessity === "unnecessary").length,
    underBuilt: decisions.filter((decision) => decision.sizing === "under-engineered").length,
    highRisks: Object.fromEntries(dimensionIds.map((id) => [id, risks.filter((risk) => risk.dimension === id && risk.severity === "high").length])),
    mediumRisks: Object.fromEntries(dimensionIds.map((id) => [id, risks.filter((risk) => risk.dimension === id && risk.severity === "medium").length])),
    lowRisks: Object.fromEntries(dimensionIds.map((id) => [id, risks.filter((risk) => risk.dimension === id && risk.severity === "low").length])),
    // An exceptional round: nothing beyond minor gaps, and nothing the interviewer had to help with.
    exceptional: !risks.some((risk) => risk.severity !== "low") && !(ledgerItems ?? []).some((item) => ASKED.has(item.status) && item.band !== "strong"),
    ledger,
  };
}

// Every constraint that applies to this review, before they are resolved per dimension.
export function constraints(facts) {
  const out = [];

  // Size of the design: a few boxes can't show any area in depth.
  if (facts.components <= 3) {
    out.push(...everyDimension((id) => cap(id, 5, "thin-design", `Your design has only ${plural(facts.components, "component")}, too few to show this area in depth.`)));
  } else if (facts.components <= 4) {
    out.push(...everyDimension((id) => cap(id, 7, "thin-design", `Your design has only ${plural(facts.components, "component")}, too few for the top band.`)));
  }

  // Disconnected boxes mean the request and data flow is incomplete.
  // Tables needn't join the request flow, so this compares services with services.
  const services = facts.services ?? facts.components;
  if (facts.isolated >= 2 && facts.isolated / services > 1 / 3) {
    out.push(cap("architecture", 5, "disconnected", `${facts.isolated} of ${services} components aren't connected to the rest of the design, so the flow is incomplete.`));
  }

  if (!facts.storage) out.push(cap("data", 4, "no-storage", "No data store appears in the diagram, so storage choices can only be partly credited."));

  // Trade-offs are about stated reasoning; with none anywhere there is little to credit.
  if (!facts.statedReasons && !facts.spoke) {
    out.push(cap("tradeoffs", 3, "no-reasoning", "No component notes, decision notes, connection labels or interview answers explain why the choices were made."));
  }

  // The trade-offs score must agree with how the review rated each key decision's reasoning.
  if (facts.justification !== null && facts.decisions >= 2) {
    const summary = `${facts.wellJustified} of ${plural(facts.decisions, "key decision")} ${facts.wellJustified === 1 ? "was" : "were"} well justified${facts.partlyJustified ? ` and ${facts.partlyJustified} partly` : ""}`;
    out.push(cap("tradeoffs", Math.round(3 + 7 * facts.justification), "decision-reasoning", `${summary}.`));
    if (facts.decisions >= 3) out.push(floor("tradeoffs", Math.round(10 * facts.justification) - 4, "decision-reasoning", `${summary}, which earns at least this.`));
  }

  // Proportionality shows in architecture; designs too simple for the scale in scalability.
  if (facts.overBuilt >= 2 && facts.overBuilt / facts.decisions >= 0.4) {
    out.push(cap("architecture", 6, "over-engineered", `${facts.overBuilt} of ${plural(facts.decisions, "key decision")} add complexity this problem doesn't need.`));
  }
  if (facts.underBuilt >= 2 && facts.underBuilt / facts.decisions >= 0.4) {
    out.push(cap("scalability", 6, "under-engineered", `${facts.underBuilt} of ${plural(facts.decisions, "key decision")} are too simple for the stated scale.`));
  }

  // A high-severity gap in an area rules out its top band; two rule out a solid one.
  for (const [id, count] of Object.entries(facts.highRisks)) {
    if (count >= 2) out.push(cap(id, 5, "high-severity-gaps", `${count} high-severity gaps were found in this area.`));
    else if (count === 1) out.push(cap(id, 7, "high-severity-gaps", "A high-severity gap was found in this area."));
  }
  // Any gap keeps an area out of the top of the scale: a medium one below 9, a minor one below 10.
  for (const id of dimensionIds) {
    if (facts.mediumRisks?.[id]) out.push(cap(id, 8, "gaps-found", `${plural(facts.mediumRisks[id], "medium-severity gap")} ${facts.mediumRisks[id] === 1 ? "was" : "were"} found in this area.`));
    else if (facts.lowRisks?.[id]) out.push(cap(id, 9, "gaps-found", "A minor gap was found in this area."));
  }
  // 10 is for exceptional rounds only.
  if (facts.exceptional === false) {
    out.push(...everyDimension((id) => cap(id, 9, "top-band", "A 10 is kept for rounds with no notable gaps where nothing needed the interviewer's help.")));
  }

  // On interviewer rounds the score stays within one band of what the notepad verified.
  for (const [id, entry] of Object.entries(facts.ledger ?? {})) {
    if (!entry.asked) continue;
    const implied = Math.round(entry.implied);
    const covered = `In the interview you answered ${entry.answered} of the ${plural(entry.asked, "question")} asked about this area`;
    const helped = entry.helped ? `, ${entry.helped} of them only after help from the interviewer` : "";
    out.push(cap(id, implied + LEDGER_ABOVE, "interview-notepad", `${covered}${helped}.`));
    out.push(floor(id, implied - LEDGER_BELOW, "interview-notepad", `${covered}, which earns at least this.`));
  }

  return out;
}

// Applies the constraints to the model's scores. Caps win over floors: missing evidence
// outweighs anything that would raise a score. Returns the final score per dimension
// and the adjustments made, each with the rule and reason that decided it.
export function constrainScores(modelScores, context) {
  const facts = signals(context);
  const all = constraints(facts);
  const scores = {};
  const adjustments = [];
  for (const id of dimensionIds) {
    const model = modelScores[id] ?? 0;
    const caps = all.filter((entry) => entry.dimension === id && entry.type === "cap");
    const floors = all.filter((entry) => entry.dimension === id && entry.type === "floor");
    const ceiling = caps.length ? Math.min(...caps.map((entry) => entry.value)) : 10;
    const minimum = floors.length ? Math.max(...floors.map((entry) => entry.value)) : 0;
    const final = Math.min(ceiling, Math.max(model, minimum));
    scores[id] = final;
    if (final === model) continue;
    // The tightest constraint that moved the score explains it.
    const binding = final < model ? caps.find((entry) => entry.value === ceiling) : floors.find((entry) => entry.value === minimum);
    adjustments.push({ dimension: id, from: model, to: final, rule: binding.rule, reason: binding.reason });
  }
  return { scores, adjustments, facts };
}
