import express from "express";
import { z } from "zod";
import { queryOne } from "../db.js";
import { parse, route } from "../http.js";
import { devToolsEnabled } from "../flags.js";
import { requireUser, toPublicUser } from "./identity.js";

// Developer-only routes, mounted only when devToolsEnabled (never in production).
export { devToolsEnabled };

const planBody = z.object({ plan: z.enum(["free", "plus"]) }).strict();

export const devRouter = express.Router();
devRouter.use(requireUser);

devRouter.post("/dev/plan", route(async (req, res) => {
  const { plan } = parse(planBody, req.body);
  const user = await queryOne(
    "update users set plan = $1, plan_expires_at = case when $1 = 'plus' then date '2099-12-31' else null end, updated_at = now() where id = $2 returning *",
    [plan, req.user.id]
  );
  console.log(`[dev] ${user.email} switched to ${plan}`);
  res.json({ user: toPublicUser(user) });
}));
