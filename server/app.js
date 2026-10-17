import "./env.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";
import { connect, query } from "./db.js";
import { HttpError, sameOriginWrites } from "./http.js";
import { identityRouter, loadUser } from "./modules/identity.js";
import { practiceRouter } from "./modules/practice.js";
import { reviewsRouter } from "./modules/reviews.js";
import { interviewsRouter } from "./modules/interviews.js";
import { articlesRouter } from "./modules/articles.js";
import { maintenanceRouter } from "./modules/maintenance.js";
import { catalogRouter } from "./modules/catalog.js";
import { roundsRouter } from "./modules/rounds.js";
import { devRouter, devToolsEnabled } from "./modules/dev.js";
import { guideFor } from "./modules/ai/guides.js";
import { prompts } from "../src/data/prompts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
const release = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local";

// Builds the HTTP application. Hosting is decided by the caller: server/index.js
// listens on a port (local development, any long-running Node host), and api/index.js
// hands requests to it as a Vercel Function.
//
// `migrate` controls whether connecting applies pending migrations; serverless
// deployments apply them once per deploy instead (scripts/migrate.js).
export async function createApp({ migrate = true, serveFrontend = true } = {}) {
  await connect({ migrate });

  const app = express();
  app.disable("x-powered-by");
  // Behind Vercel's edge, which overwrites X-Forwarded-For with the real client
  // address, so the left-most entry is trustworthy. Elsewhere it is opt-in.
  if (process.env.VERCEL) app.set("trust proxy", true);
  else if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? true : process.env.TRUST_PROXY);

  app.use((_req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY" });
    next();
  });

  const api = express.Router();
  api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  // Health checks come first: no body parsing, cookies, or session lookup.
  api.get("/health", (_req, res) => res.json({ ok: true, release }));
  api.get("/health/ready", async (_req, res) => {
    try {
      await query("select 1");
      res.json({ ok: true, release, database: "up" });
    } catch (error) {
      console.error("[health] database check failed:", error.message);
      res.status(503).json({ ok: false, release, database: "down" });
    }
  });
  // Public catalog: no cookies or session lookup, so it never touches the database.
  api.use("/v1", catalogRouter);
  // Voice answers carry base64 audio, so they get a larger limit than everything else
  // (a parsed body is skipped by the general parser below).
  api.use("/v1/sessions/:sessionId/interview/audio", express.json({ limit: "3mb" }));
  api.use(express.json({ limit: "600kb" }));
  api.use(cookieParser());
  api.use(sameOriginWrites);
  api.use("/v1", maintenanceRouter);
  api.use(loadUser);
  // Before the routers that require sign-in: round content answers visitors too.
  api.use("/v1", roundsRouter);
  // Before the routers that require sign-in for everything: published articles are public.
  api.use("/v1", articlesRouter);
  api.use("/v1", identityRouter);
  api.use("/v1", practiceRouter);
  api.use("/v1", reviewsRouter);
  api.use("/v1", interviewsRouter);
  if (devToolsEnabled) api.use("/v1", devRouter);
  api.use((_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "No such endpoint.")));
  api.use((error, req, res, _next) => {
    if (error.type === "entity.too.large") {
      const message = req.path.endsWith("/interview/audio") ? "That recording is too large to send." : "That design is too large to save.";
      return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message } });
    }
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: { code: "INVALID_JSON", message: "Malformed JSON." } });
    if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    // The platform request id ties a user's report to the matching log line.
    const requestId = req.get("x-vercel-id") || undefined;
    console.error(`[api] ${req.method} ${req.originalUrl} failed${requestId ? ` (request ${requestId})` : ""}:`, error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on our side.", requestId } });
  });
  app.use("/api", api);

  // A long-running server also serves the built frontend, mirroring vercel.json: clean
  // URLs for prerendered pages, the app shell for signed-in routes, and a real 404.
  // On Vercel the CDN serves all of this.
  if (serveFrontend && existsSync(distDir)) {
    // Clean URLs, like Vercel's cleanUrls: /library serves library.html, even though a
    // library/ folder (the discipline pages) also exists.
    app.use((req, res, next) => {
      if (req.method !== "GET" || path.extname(req.path) || req.path === "/") return next();
      const file = path.join(distDir, `${req.path.replace(/\/+$/, "")}.html`);
      if (!file.startsWith(distDir) || !existsSync(file)) return next();
      res.sendFile(file);
    });
    app.use(express.static(distDir, { redirect: false, maxAge: "1h" }));
    app.get(/^\/(signin|welcome|profile|start-free|start\/.+|workspace\/.+)$/, (_req, res) => {
      res.set("X-Robots-Tag", "noindex, nofollow").sendFile(path.join(distDir, "app.html"));
    });
    app.use((_req, res) => res.status(404).sendFile(path.join(distDir, "404.html")));
  }

  const missingGuides = prompts.filter((prompt) => !guideFor(prompt.id)).map((prompt) => prompt.id);
  if (missingGuides.length) console.warn(`[ai] no interviewer guide for: ${missingGuides.join(", ")}`);

  return app;
}
