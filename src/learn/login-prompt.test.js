import assert from "node:assert/strict";
import test from "node:test";
import { RULES, nextAsk, parseState, withAsk, withRead } from "./login-prompt.js";

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const reading = { slug: "caching", progress: 0.4, engagedMs: 30_000, now: NOW };
const after = (state, ms, overrides = {}) => nextAsk(state, { ...reading, now: state.lastAskAt + ms, ...overrides });
const asked = (asks, slug = "caching", read = [slug]) => ({ asks, lastAskAt: NOW, lastAskSlug: slug, read });

test("nothing is asked before the reader is clearly reading", () => {
  const fresh = parseState("{}");
  assert.equal(nextAsk(fresh, { ...reading, progress: 0.1 }), null);
  assert.equal(nextAsk(fresh, { ...reading, engagedMs: 5_000 }), null);
  // A crawler or a tab left open has neither scroll depth nor engaged time.
  assert.equal(nextAsk(fresh, { ...reading, progress: 1, engagedMs: 0 }), null);
});

test("a long article counts as being read well before 30% of it", () => {
  const fresh = parseState("{}");
  const early = { ...reading, progress: 0.12 };
  assert.equal(nextAsk(fresh, { ...early, screens: 0.5 }), null, "barely scrolled, 30 seconds");
  assert.equal(nextAsk(fresh, { ...early, screens: 1.5 }).number, 1, "a screen and a half");
  assert.equal(nextAsk(fresh, { ...early, screens: 1.5, engagedMs: 10_000 }), null, "too quick to be reading");
  assert.equal(nextAsk(fresh, { ...early, screens: 0.2, engagedMs: 60_000 }).number, 1, "a minute at any depth");
});

test("the first ask is a small card", () => {
  assert.deepEqual(nextAsk(parseState("{}"), reading), { number: 1, style: "card", moment: "reading" });
});

test("the second ask waits for the end of the article or another article", () => {
  const state = asked(1);
  assert.equal(after(state, 5 * MINUTE), null, "same article, not finished");
  assert.equal(after(state, 10_000, { progress: 0.95 }), null, "too soon after the first");
  assert.deepEqual(after(state, 5 * MINUTE, { progress: 0.9 }), { number: 2, style: "card", moment: "finished" });
  assert.deepEqual(after(state, 5 * MINUTE, { slug: "cdn" }), { number: 2, style: "card", moment: "reading" });
  assert.deepEqual(after(state, 5 * MINUTE, { engagedMs: 3 * MINUTE }), { number: 2, style: "card", moment: "reading" }, "stayed on one long article");
});

test("the third ask is the larger banner, after two articles or a day", () => {
  const oneArticle = asked(2);
  const twoArticles = asked(2, "caching", ["caching", "cdn"]);
  assert.equal(after(twoArticles, 5 * MINUTE), null, "two articles but too soon");
  assert.equal(after(oneArticle, 2 * 60 * MINUTE), null, "one article, same day");
  assert.equal(after(twoArticles, RULES.thirdAskGapMs).style, "banner");
  assert.equal(after(oneArticle, DAY).style, "banner");
});

test("after the ladder, one ask every two weeks", () => {
  const state = asked(3);
  assert.equal(after(state, 13 * DAY), null);
  assert.deepEqual(after(state, 14 * DAY), { number: 4, style: "banner", moment: "reading" });
  assert.equal(after(asked(4), 14 * DAY).number, 5);
});

test("a whole sitting asks at most twice before a thirty minute gap", () => {
  let state = parseState("{}");
  let now = NOW;
  let shown = 0;
  for (const slug of ["a", "b", "c", "d", "e"]) {
    for (const progress of [0.4, 0.9]) {
      now += MINUTE * 2;
      state = withRead(state, slug);
      const ask = nextAsk(state, { slug, progress, engagedMs: 60_000, now });
      if (ask) { shown += 1; state = withAsk(state, ask, slug, now); }
    }
  }
  assert.equal(shown, 2, "twenty minutes across five articles");
});

test("reads are counted once per article", () => {
  const state = withRead(withRead(parseState("{}"), "caching"), "caching");
  assert.deepEqual(state.read, ["caching"]);
});

test("damaged storage starts the ladder from the beginning", () => {
  for (const raw of ["not json", "null", "[]", '{"asks":"many","read":"x","lastAskAt":"y"}', '{"asks":-2}']) {
    const state = parseState(raw);
    assert.equal(state.asks, 0, raw);
    assert.deepEqual(state.read, [], raw);
    assert.equal(state.lastAskAt, 0, raw);
  }
});
