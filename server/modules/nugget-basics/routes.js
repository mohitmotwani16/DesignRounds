import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { HttpError, parse, route } from "../../http.js";
import { assertHuman, turnstileRequired } from "../../turnstile.js";
import { promptById } from "../rounds.js";
import {
  assertGuestCanCreate,
  guestCookieOptions,
  hashGuestToken,
  isBasicsSession,
  loadGuest,
  NUGGET_BASICS_PARENT,
  newGuestToken,
} from "../guest.js";
import { assertCanCreateRound } from "../practice.js";
import { nuggetsForParent, pickNugget, publicNuggetSummary } from "../nuggets/index.js";
import { queryOne } from "../../db.js";
import { createNuggetBasicsSession, getSessionForActor, sessionResponse } from "./sessions.js";

const startBody = z.object({
  nuggetId: z.string().trim().min(1).max(120),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
});
const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(here, "..", "..", "content", "nugget-basics", "catalog.json");

export const nuggetBasicsRouter = express.Router();
nuggetBasicsRouter.use(loadGuest);

function loadCatalogMeta() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  return { meta: catalog.meta, tracks: catalog.tracks };
}

nuggetBasicsRouter.get("/nugget-basics/catalog", route(async (_req, res) => {
  const items = nuggetsForParent(NUGGET_BASICS_PARENT).map(publicNuggetSummary);
  items.sort((a, b) => {
    const ao = a.basicsOnboardingOrder ?? 999;
    const bo = b.basicsOnboardingOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return (a.track || "").localeCompare(b.track || "") || (a.basicsComponentId || "").localeCompare(b.basicsComponentId || "")
      || String(a.basicsDifficulty || "").localeCompare(String(b.basicsDifficulty || ""));
  });
  const { meta, tracks } = loadCatalogMeta();
  res.set("Cache-Control", "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400");
  res.json({ meta, tracks, items });
}));

nuggetBasicsRouter.post("/nugget-basics/sessions", route(async (req, res) => {
  const { nuggetId, turnstileToken } = parse(startBody, req.body);
  let nugget;
  try {
    nugget = pickNugget(req.user ?? null, { nuggetId });
  } catch (error) {
    if (error.message === "NOT_FOUND") throw new HttpError(404, "NOT_FOUND", "Unknown drill.");
    throw error;
  }
  if (nugget.parentPromptId !== NUGGET_BASICS_PARENT) {
    throw new HttpError(400, "INVALID_REQUEST", "That drill is not part of Nugget-basics.");
  }

  let guestTokenHash = req.guestTokenHash ?? null;
  let newToken = null;

  if (req.user) {
    await assertCanCreateRound(req.user);
    const existing = await queryOne(
      "select * from practice_sessions where user_id = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'",
      [req.user.id, nugget.id],
    );
    if (existing) {
      const prompt = promptById.get(NUGGET_BASICS_PARENT);
      return res.json({ session: sessionResponse(existing, { brief: null, resumed: true, guest: false }), resumed: true });
    }
  } else {
    if (turnstileRequired()) await assertHuman(req, turnstileToken, "nugget-basics-start");
    await assertGuestCanCreate(req);
    if (!guestTokenHash) {
      newToken = newGuestToken();
      guestTokenHash = hashGuestToken(newToken);
    }
    const existing = await queryOne(
      "select * from practice_sessions where guest_token_hash = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'",
      [guestTokenHash, nugget.id],
    );
    if (existing) {
      if (newToken) res.cookie("dr_guest", newToken, guestCookieOptions());
      return res.json({ session: sessionResponse(existing, { brief: null, resumed: true, guest: true }), resumed: true });
    }
  }

  let created;
  try {
    created = await createNuggetBasicsSession({
      userId: req.user?.id ?? null,
      guestTokenHash: req.user ? null : guestTokenHash,
      nugget,
    });
  } catch (error) {
    if (error.code !== "23505") throw error;
    const existing = req.user
      ? await queryOne(
        "select * from practice_sessions where user_id = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'",
        [req.user.id, nugget.id],
      )
      : await queryOne(
        "select * from practice_sessions where guest_token_hash = $1 and nugget_id = $2 and status = 'in_progress' and session_kind = 'nugget'",
        [guestTokenHash, nugget.id],
      );
    if (!existing) throw error;
    if (newToken) res.cookie("dr_guest", newToken, guestCookieOptions());
    return res.json({
      session: sessionResponse(existing, { brief: null, resumed: true, guest: !req.user }),
      resumed: true,
    });
  }

  if (newToken) res.cookie("dr_guest", newToken, guestCookieOptions());

  res.status(201).json({
    session: sessionResponse(created, { brief: null, resumed: false, guest: !req.user }),
    resumed: false,
  });
}));

nuggetBasicsRouter.get("/nugget-basics/sessions/:sessionId", route(async (req, res) => {
  const row = await getSessionForActor(req);
  if (!isBasicsSession(row)) throw new HttpError(404, "NOT_FOUND", "Practice round not found.");
  res.json({ session: sessionResponse(row, { brief: null, resumed: undefined, guest: !row.user_id }) });
}));