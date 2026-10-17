import { getTrack, prompts, tracks } from "./prompts.js";

// Catalog search shared by the API (server/modules/catalog.js), build-time
// prerendering and the library's instant first page. Pure and dependency-free so it
// runs the same in Node and the browser.

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_RANK = Object.fromEntries(LEVELS.map((level, index) => [level, index]));
export const DURATIONS = {
  short: (minutes) => minutes <= 35,
  medium: (minutes) => minutes > 35 && minutes <= 45,
  long: (minutes) => minutes > 45,
};
export const SORTS = {
  recommended: () => 0,
  shortest: (a, b) => a.minutes - b.minutes,
  easiest: (a, b) => LEVEL_RANK[a.difficulty] - LEVEL_RANK[b.difficulty] || a.minutes - b.minutes,
  hardest: (a, b) => LEVEL_RANK[b.difficulty] - LEVEL_RANK[a.difficulty] || b.minutes - a.minutes,
  title: (a, b) => a.title.localeCompare(b.title),
};

const TRACK_IDS = new Set(tracks.map((track) => track.id));

// Pull questions from the learner's roles to the front. Several roles are
// interleaved one-at-a-time so the top of the list is a mix, not one role
// followed by the next. Order inside each role is left as the sort produced it.
function mixPreferred(entries, prefer) {
  const wanted = [];
  const seen = new Set();
  for (const id of prefer) {
    if (TRACK_IDS.has(id) && !seen.has(id)) {
      seen.add(id);
      wanted.push(id);
    }
  }
  if (!wanted.length) return entries;
  const buckets = new Map(wanted.map((id) => [id, []]));
  const rest = [];
  for (const entry of entries) {
    const bucket = buckets.get(entry.card.track);
    if (bucket) bucket.push(entry);
    else rest.push(entry);
  }
  const mixed = [];
  const queues = wanted.map((id) => buckets.get(id));
  let pending = true;
  while (pending) {
    pending = false;
    for (const queue of queues) {
      if (queue.length) {
        mixed.push(queue.shift());
        pending = true;
      }
    }
  }
  return mixed.concat(rest);
}

// Lower-case, punctuation (hyphens, slashes, ...) as spaces, so "exactly-once",
// "exactly once" and "read/write" all match the same way.
const normalize = (text) => ` ${text.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;

// What a card needs, plus a normalized search haystack. Built once.
const catalog = prompts.map((prompt, order) => ({
  order,
  haystack: normalize(`${prompt.title} ${prompt.description} ${prompt.category} ${getTrack(prompt.track).label} ${prompt.requirements?.join(" ") ?? ""} ${prompt.considerations.join(" ")} ${prompt.prerequisites?.join(" ") ?? ""} ${prompt.expectedOutcome ?? ""}`),
  card: {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    track: prompt.track,
    access: prompt.access,
    category: prompt.category,
    difficulty: prompt.difficulty,
    minutes: prompt.minutes,
    icon: prompt.icon,
    color: prompt.color,
    popular: Boolean(prompt.popular),
    tags: prompt.considerations.slice(0, 2),
  },
}));

// Opaque page cursor: the offset in base 36.
const encodeCursor = (offset) => `c${offset.toString(36)}`;
function decodeCursor(cursor) {
  const match = /^c([0-9a-z]{1,6})$/.exec(cursor ?? "");
  return match ? parseInt(match[1], 36) : 0;
}

// Each facet is counted with every filter applied except its own, so a count says
// how many results picking that option would give.
function matches(entry, filters, skip) {
  const { card } = entry;
  if (filters.words.length && !filters.words.every((word) => entry.haystack.includes(word))) return false;
  if (skip !== "track" && filters.track !== "all" && card.track !== filters.track) return false;
  if (filters.level.length && !filters.level.includes(card.difficulty)) return false;
  if (filters.duration.length && !filters.duration.some((id) => DURATIONS[id](card.minutes))) return false;
  if (skip !== "topic" && filters.topic.length && !filters.topic.includes(card.category)) return false;
  if (filters.access !== "all" && card.access !== filters.access) return false;
  return true;
}

// input: { q, track, level[], duration[], topic[], access, sort, prefer[], cursor, limit }
// `prefer` is the learner's practice roles. It only changes the recommended
// order; an explicit sort (shortest, A–Z, …) stays exactly that sort.
export function searchCatalog({ q = "", track = "all", level = [], duration = [], topic = [], access = "all", sort = "recommended", prefer = [], cursor, limit = 12 }) {
  const filters = { track, level, duration, topic, access, words: normalize(q).split(" ").filter(Boolean) };
  let results = catalog.filter((entry) => matches(entry, filters))
    .sort((a, b) => (SORTS[sort] ?? SORTS.recommended)(a.card, b.card) || a.order - b.order);
  if ((SORTS[sort] ? sort : "recommended") === "recommended" && prefer.length) results = mixPreferred(results, prefer);
  const offset = Math.min(decodeCursor(cursor), results.length);
  const page = results.slice(offset, offset + limit);
  const next = offset + page.length;

  const trackCounts = { all: 0 };
  const topicCounts = {};
  for (const entry of catalog) {
    if (matches(entry, filters, "track")) {
      trackCounts.all += 1;
      trackCounts[entry.card.track] = (trackCounts[entry.card.track] || 0) + 1;
    }
    if (matches(entry, filters, "topic")) topicCounts[entry.card.category] = (topicCounts[entry.card.category] || 0) + 1;
  }

  return {
    items: page.map((entry) => entry.card),
    total: results.length,
    nextCursor: next < results.length ? encodeCursor(next) : null,
    facets: { tracks: trackCounts, topics: topicCounts },
  };
}
