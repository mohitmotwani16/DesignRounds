import express from "express";
import { z } from "zod";
import { getTrack, prompts, tracks } from "../../src/data/prompts.js";
import { parse, route } from "../http.js";

// Public, read-only practice catalog with server-side filtering, search, sorting,
// cursor pagination and facet counts. The library loads it page by page as the
// learner scrolls, so the payload stays small however large the catalog grows.
//
// The catalog only changes with a deploy and never touches the database, so
// responses are cacheable at the CDN (Vercel purges its cache on every deploy).

const PAGE_DEFAULT = 12;
const PAGE_MAX = 24;
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_RANK = Object.fromEntries(LEVELS.map((level, index) => [level, index]));
const DURATIONS = {
  short: (minutes) => minutes <= 35,
  medium: (minutes) => minutes > 35 && minutes <= 45,
  long: (minutes) => minutes > 45,
};
const SORTS = {
  recommended: () => 0,
  shortest: (a, b) => a.minutes - b.minutes,
  easiest: (a, b) => LEVEL_RANK[a.difficulty] - LEVEL_RANK[b.difficulty] || a.minutes - b.minutes,
  hardest: (a, b) => LEVEL_RANK[b.difficulty] - LEVEL_RANK[a.difficulty] || b.minutes - a.minutes,
  title: (a, b) => a.title.localeCompare(b.title),
};

// Built once: what a card needs, plus a lower-cased search haystack.
const catalog = prompts.map((prompt, order) => ({
  order,
  haystack: `${prompt.title} ${prompt.description} ${prompt.category} ${getTrack(prompt.track).label} ${prompt.requirements.join(" ")} ${prompt.considerations.join(" ")} ${prompt.prerequisites?.join(" ") ?? ""}`.toLowerCase(),
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
const trackIds = new Set(tracks.map((track) => track.id));

const csv = (allowed) => z.string().max(400).optional()
  .transform((value) => (value ? [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))] : []))
  .refine((values) => !allowed || values.every((value) => allowed.includes(value)), { message: "contains an unknown value" });

const querySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  track: z.string().optional().default("all").refine((value) => value === "all" || trackIds.has(value), { message: "unknown track" }),
  level: csv(LEVELS),
  duration: csv(Object.keys(DURATIONS)),
  topic: csv(null),
  access: z.enum(["all", "free", "paid"]).optional().default("all"),
  sort: z.enum(Object.keys(SORTS)).optional().default("recommended"),
  cursor: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_MAX).optional().default(PAGE_DEFAULT),
});

const encodeCursor = (offset) => Buffer.from(`o:${offset}`).toString("base64url");
function decodeCursor(cursor) {
  if (!cursor) return 0;
  const match = /^o:(\d{1,6})$/.exec(Buffer.from(cursor, "base64url").toString());
  return match ? Number(match[1]) : 0;
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

export function searchCatalog(input) {
  const filters = { ...input, words: input.q.toLowerCase().split(/\s+/).filter(Boolean) };
  const results = catalog.filter((entry) => matches(entry, filters))
    .sort((a, b) => SORTS[filters.sort](a.card, b.card) || a.order - b.order);
  const offset = Math.min(decodeCursor(input.cursor), results.length);
  const page = results.slice(offset, offset + input.limit);
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

export const catalogRouter = express.Router();

catalogRouter.get("/catalog/prompts", route(async (req, res) => {
  const input = parse(querySchema, req.query);
  res.set("Cache-Control", "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800");
  res.json(searchCatalog(input));
}));
