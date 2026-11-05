import express from "express";
import { z } from "zod";
import { HttpError, parse, route } from "../../http.js";
import { canAccessRound, promptById } from "../rounds.js";
import { eligibleParents, getNugget, nuggetsForParent, pickNugget, publicNuggetCatalog, publicNuggetSummary } from "./index.js";

const listQuery = z.object({
  parent: z.string().max(80).optional(),
  track: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  cursor: z.string().max(120).optional(),
});

export const nuggetsRouter = express.Router();

nuggetsRouter.get("/nuggets", route(async (req, res) => {
  const query = parse(listQuery, req.query);
  let items = publicNuggetCatalog();
  if (query.parent) items = items.filter((item) => item.parentPromptId === query.parent);
  if (query.track) items = items.filter((item) => item.track === query.track);
  items.sort((a, b) => a.parentTitle.localeCompare(b.parentTitle) || a.title.localeCompare(b.title));
  let start = 0;
  if (query.cursor) {
    const index = items.findIndex((item) => item.id === query.cursor);
    start = index >= 0 ? index + 1 : 0;
  }
  const page = items.slice(start, start + query.limit);
  res.json({
    items: page,
    total: items.length,
    nextCursor: start + query.limit < items.length ? page.at(-1)?.id ?? null : null,
  });
}));

nuggetsRouter.get("/nuggets/parents", route(async (req, res) => {
  const parents = eligibleParents(req.user ?? null, { forRandomPool: false })
    .filter((prompt) => nuggetsForParent(prompt.id).length > 0)
    .map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      track: prompt.track,
      access: prompt.access,
      nuggetCount: nuggetsForParent(prompt.id).length,
    }));
  res.json({ parents });
}));

nuggetsRouter.get("/nuggets/:nuggetId", route(async (req, res) => {
  const nugget = getNugget(req.params.nuggetId);
  if (!nugget) throw new HttpError(404, "NOT_FOUND", "No such nugget.");
  const parent = promptById.get(nugget.parentPromptId);
  if (!parent) throw new HttpError(404, "NOT_FOUND", "Parent round unavailable.");
  const canStart = req.user ? canAccessRound(req.user, parent) : parent.access === "free";
  res.json({
    nugget: {
      ...publicNuggetSummary(nugget),
      // A Plus drill's scenario stays with those who can open it; others get the preview.
      ...(canStart ? { symptoms: nugget.scenario.symptoms, incidentHeadline: nugget.incident.headline } : {}),
    },
    canStart,
  });
}));
