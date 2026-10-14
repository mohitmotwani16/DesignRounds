import express from "express";
import { z } from "zod";
import { DURATIONS, LEVELS, SORTS, searchCatalog } from "../../src/data/catalog-search.js";
import { tracks } from "../../src/data/prompts.js";
import { parse, route } from "../http.js";

// Public, read-only practice catalog with server-side filtering, search, sorting,
// cursor pagination and facet counts. The library loads it page by page as the
// learner scrolls, so the payload stays small however large the catalog grows.
// The search itself is shared with prerendering and the client (src/data/catalog-search.js).
//
// The catalog only changes with a deploy and never touches the database, so
// responses are cacheable at the CDN (Vercel purges its cache on every deploy).

const PAGE_DEFAULT = 12;
const PAGE_MAX = 24;
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

export { searchCatalog };

export const catalogRouter = express.Router();

catalogRouter.get("/catalog/prompts", route(async (req, res) => {
  const input = parse(querySchema, req.query);
  res.set("Cache-Control", "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800");
  res.json(searchCatalog(input));
}));
