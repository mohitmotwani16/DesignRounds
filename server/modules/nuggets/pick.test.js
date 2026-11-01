import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { importNuggetFiles, pickNugget, reloadNuggets } from "./index.js";
import { prompts } from "../../../src/data/prompts.js";

const freeUser = { plan: "free" };
const plusUser = { plan: "plus", plan_expires_at: "2099-01-01" };

describe("nugget pick", () => {
  it("loads hand-authored nuggets", () => {
    reloadNuggets();
    importNuggetFiles();
    const nugget = pickNugget(freeUser, { nuggetId: "url-shortener/cache-stampede" });
    assert.equal(nugget.parentPromptId, "url-shortener");
  });

  it("mode A only uses free parents for free users", () => {
    reloadNuggets();
    importNuggetFiles();
    for (let i = 0; i < 20; i += 1) {
      const nugget = pickNugget(freeUser, { random: true });
      const parent = prompts.find((prompt) => prompt.id === nugget.parentPromptId);
      assert.equal(parent?.access, "free");
    }
  });

  it("rejects Plus parent for free user in mode B", () => {
    reloadNuggets();
    assert.throws(() => pickNugget(freeUser, { parentPromptId: "ai-answer-engine", random: true }), /PLAN_REQUIRED/);
  });
});
