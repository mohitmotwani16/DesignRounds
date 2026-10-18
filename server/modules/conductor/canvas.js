import crypto from "node:crypto";
import { isAnonymousKind } from "../ai/components.js";

// Canvas signals for the planner: pure functions of the diagram and the conversation.
// A real interviewer keeps the candidate drawing, doesn't ask for a part that's already
// on the board, starts a deep dive only on something drawn, and lets the candidate's
// own focus steer which part gets the deep dive.

const lower = (value) => String(value ?? "").toLowerCase();

export function canvasComponents(diagram) {
  return (diagram?.nodes ?? [])
    .filter((node) => node.type === "systemNode" || !node.type)
    .map((node) => ({ id: node.id, kind: node.data?.kind, text: lower(`${node.data?.label ?? ""} ${node.data?.subtitle ?? ""} ${node.data?.note ?? ""}`) }));
}

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
export function canvasSignals({ agenda, diagram, learnerTexts, seed, learnerTurnsSinceAsk }) {
  const components = canvasComponents(diagram);
  const needs = new Set(agenda.filter(needsDrawing).map((item) => item.id));
  const drawn = new Set(agenda.filter((item) => needs.has(item.id) && itemDrawn(item, components)).map((item) => item.id));
  return {
    components: components.length,
    connections: (diagram?.edges ?? []).length,
    needs,
    drawn,
    emphasis: emphasisScores(agenda, learnerTexts, components),
    seed,
    learnerTurnsSinceAsk,
  };
}
