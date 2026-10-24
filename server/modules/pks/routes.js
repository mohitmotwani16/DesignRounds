import express from "express";
import { z } from "zod";
import { HttpError, afterResponse, parse, route } from "../../http.js";
import { requireAdmin } from "../identity.js";
import { listPacks, packDetail, processPackJobs, publishPack, requestBuild, retirePack, saveEditedPack } from "./index.js";

// Admin review of Problem Packs (docs/design/problem-knowledge-service.md, section 5):
// packs land as drafts and an admin publishes, rebuilds, retires or edits them.

export const packsRouter = express.Router();

const versionParam = /^pack-[0-9a-f]{8}$/;
const editBody = z.object({ pack: z.record(z.string(), z.unknown()) }).strict();

function checkVersion(version) {
  if (!versionParam.test(version)) throw new HttpError(400, "INVALID_REQUEST", "Not a pack version.");
}

packsRouter.get("/admin/packs", requireAdmin, route(async (_req, res) => {
  res.json({ packs: await listPacks() });
}));

packsRouter.get("/admin/packs/:promptId", requireAdmin, route(async (req, res) => {
  const detail = await packDetail(req.params.promptId);
  if (!detail) throw new HttpError(404, "NOT_FOUND", "No such question.");
  res.json(detail);
}));

// Queues a build and starts it after the response; the admin view polls the job.
packsRouter.post("/admin/packs/:promptId/build", requireAdmin, route(async (req, res) => {
  if (!(await requestBuild(req.params.promptId))) throw new HttpError(404, "NOT_FOUND", "No such question.");
  afterResponse(processPackJobs({ promptId: req.params.promptId }).catch((error) => console.error("[pks] build failed:", error.message)));
  res.status(202).json({ ok: true });
}));

packsRouter.post("/admin/packs/:promptId/versions/:version/publish", requireAdmin, route(async (req, res) => {
  checkVersion(req.params.version);
  const result = await publishPack(req.params.promptId, req.params.version, req.user.id);
  if (!result.ok && result.problems) throw new HttpError(422, "INVALID_PACK", `This pack can't be published: ${result.problems.slice(0, 3).join("; ")}`);
  if (!result.ok) throw new HttpError(404, "NOT_FOUND", "No such pack version.");
  res.json({ ok: true });
}));

packsRouter.post("/admin/packs/:promptId/versions/:version/retire", requireAdmin, route(async (req, res) => {
  checkVersion(req.params.version);
  if (!(await retirePack(req.params.promptId, req.params.version, req.user.id)).ok) throw new HttpError(404, "NOT_FOUND", "No such pack version.");
  res.json({ ok: true });
}));

// An edited draft becomes a new version (its content hash), built by "manual".
packsRouter.post("/admin/packs/:promptId/drafts", requireAdmin, route(async (req, res) => {
  const { pack } = parse(editBody, req.body);
  let result;
  try {
    result = await saveEditedPack(req.params.promptId, pack, req.user.id);
  } catch (error) {
    throw new HttpError(422, "INVALID_PACK", `This pack doesn't match the schema: ${error.issues?.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") ?? error.message}`);
  }
  if (!result.ok) throw new HttpError(422, "INVALID_PACK", `This pack breaks a rule: ${result.problems.slice(0, 3).join("; ")}`);
  res.status(201).json({ version: result.version });
}));
