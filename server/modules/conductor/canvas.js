import crypto from "node:crypto";
import { isAnonymousKind } from "../ai/components.js";
import { isDataModelKind, isTable, tableText } from "../ai/data-model.js";

// Canvas signals for the planner: pure functions of the diagram and the conversation.
// A real interviewer keeps the candidate drawing, doesn't ask for a part that's already
// on the board, starts a deep dive only on something drawn, and lets the candidate's
// own focus steer which part gets the deep dive.

const lower = (value) => String(value ?? "").toLowerCase();

// Components and data model tables; a table's text includes its columns, so a
// "valid_from" column is evidence for an item about validity dates.
export function canvasComponents(diagram) {
  return (diagram?.nodes ?? [])
    .filter((node) => node.type === "systemNode" || node.type === "tableNode" || !node.type)
    .map((node) => ({
      id: node.id,
      kind: node.data?.kind,
      table: isTable(node),
      text: lower(node.type === "tableNode" ? tableText(node) : `${node.data?.label ?? ""} ${node.data?.subtitle ?? ""} ${node.data?.note ?? ""}`),
    }));
}

// An agenda item is about the data model when the pack ties it to data model kinds
// (table, fact-table, ...). Such an item is drawn only once a table is on the canvas:
// a warehouse box is not a schema.
export const needsDataModel = (item) => (item?.triggers?.componentKinds ?? []).some(isDataModelKind);

export function canvasStats(diagram) {
  return { components: canvasComponents(diagram).length, connections: (diagram?.edges ?? []).length };
}

// An item needs drawing when it's a design part (high-level or deep-dive) the pack ties
// to canvas components. Decisions with no component (a 301 versus a 302) don't.
export function needsDrawing(item) {
  return (item.stage === "high_level" || item.stage === "deep_dive") && (item.triggers?.componentKinds?.length ?? 0) > 0;
}

// A single-word keyword matches its word forms too ("generate" matches "ID generator");
// a phrase must appear whole.
function keywordMatches(keyword, text) {
  const wanted = lower(keyword).trim();
  if (wanted.length < 3) return false;
  if (text.includes(wanted)) return true;
  if (/\s/.test(wanted) || wanted.length < 6) return false;
  return text.includes(wanted.slice(0, Math.max(5, wanted.length - 2)));
}
const keywordHit = (item, text) => (item.triggers?.keywords ?? []).some((keyword) => keywordMatches(keyword, text));

// Drawn: a component of one of the item's kinds is on the canvas. A generic kind (a
// plain service, a client) counts only when its label or note names the item.
export function itemDrawn(item, components) {
  if (needsDataModel(item)) return components.some((component) => component.table);
  const kinds = new Set(item.triggers?.componentKinds ?? []);
  return components.some((component) => kinds.has(component.kind) && (!isAnonymousKind(component.kind) || keywordHit(item, component.text)))
    || components.some((component) => !isAnonymousKind(component.kind) && keywordHit(item, component.text));
}

// How much the candidate has gravitated towards each item: the item's keywords in what
// they said, and in the labels and notes they wrote on the canvas. (Merely having the
// item's kind drawn is the planner's separate "drawn" bonus, so an item listing many
// kinds doesn't win just for listing them.)
export function emphasisScores(agenda, learnerTexts, components) {
  const said = lower(learnerTexts.join(" "));
  const scores = new Map();
  for (const item of agenda) {
    const keywords = (item.triggers?.keywords ?? []).filter((keyword) => keyword.length >= 3);
    const spoken = keywords.filter((keyword) => said.includes(lower(keyword))).length;
    const noted = components.filter((component) => keywordHit(item, component.text)).length;
    scores.set(item.id, spoken + 0.75 * Math.min(noted, 2));
  }
  return scores;
}

// A stable random number in [0, 1) per round and item: different rounds get different
// deep dives, and the same round always makes the same choice (so it can be tested).
export function seededJitter(seed, itemId) {
  return Number.parseInt(crypto.createHash("sha256").update(`${seed}\0${itemId}`).digest("hex").slice(0, 8), 16) / 0x1_0000_0000;
}

// Everything the planner needs about the canvas this turn.
// `drawAsks` are the round's draw requests ({ itemId, components }): a candidate who adds
// to the canvas after being asked to draw a part has drawn it, whatever they named it.
// The pack's kinds and keywords can't foresee every way to draw a part, and asking again
// for something already on the board is the one thing a real interviewer wouldn't do.
export function canvasSignals({ agenda, diagram, learnerTexts, seed, learnerTurnsSinceAsk, drawAsks = [] }) {
  const components = canvasComponents(diagram);
  const needs = new Set(agenda.filter(needsDrawing).map((item) => item.id));
  const drewWhenAsked = (item) => drawAsks.some((ask) => ask.itemId === item.id && Number.isInteger(ask.components) && components.length > ask.components);
  const drawn = new Set(agenda.filter((item) => needs.has(item.id) && (itemDrawn(item, components) || drewWhenAsked(item))).map((item) => item.id));
  return {
    components: components.length,
    connections: (diagram?.edges ?? []).length,
    tables: components.filter((component) => component.table).length,
    dataModelItems: new Set(agenda.filter(needsDataModel).map((item) => item.id)),
    needs,
    drawn,
    emphasis: emphasisScores(agenda, learnerTexts, components),
    seed,
    learnerTurnsSinceAsk,
  };
}
