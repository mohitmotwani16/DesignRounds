import assert from "node:assert/strict";
import test from "node:test";
import { annotateLearnText, learnAllowlistSet, validateLearnAliases } from "./linkify.js";

test("LEARN_ALIASES reference catalog slugs", () => {
  validateLearnAliases();
});

test("longest phrase wins", () => {
  const allow = new Set(["slowly-changing-dimensions"]);
  const out = annotateLearnText("Study slowly changing dimensions before the interview.", allow);
  assert.match(out, /\[slowly changing dimensions\]\(\/learn\/slowly-changing-dimensions\)/);
});

test("respects allowlist", () => {
  const out = annotateLearnText("Add cache invalidation on every write.", new Set(["caching"]));
  assert.equal(out, "Add cache invalidation on every write.");
});

test("links cache invalidation when allowed", () => {
  const allow = learnAllowlistSet({ track: "software-engineering" });
  const out = annotateLearnText("Add explicit cache invalidation on every write.", allow);
  assert.match(out, /\[cache invalidation\]\(\/learn\/cache-invalidation\)/);
});

test("at most two links and no duplicate slug", () => {
  const allow = learnAllowlistSet({ track: "software-engineering" });
  const out = annotateLearnText("Use idempotency keys, cache invalidation, and rate limiting at the edge.", allow);
  const links = [...out.matchAll(/\[([^\]]+)\]\(\/learn\/([^)]+)\)/g)];
  assert.equal(links.length, 2);
  assert.equal(new Set(links.map((match) => match[2])).size, 2);
});

test("idempotency alias", () => {
  const allow = learnAllowlistSet({ track: "software-engineering" });
  const out = annotateLearnText("Send an idempotency key with every payment retry.", allow);
  assert.match(out, /\[idempotency key\]\(\/learn\/idempotency\)/);
});
