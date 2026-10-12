import "./env.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";
import { close, connect, driver } from "./db.js";
import { deliveryMode } from "./email.js";
import { HttpError, sameOriginWrites } from "./http.js";
import { identityRouter, loadUser } from "./modules/identity.js";
import { practiceRouter } from "./modules/practice.js";
import { reviewsRouter } from "./modules/reviews.js";
import { interviewsRouter } from "./modules/interviews.js";
import { devRouter, devToolsEnabled } from "./modules/dev.js";
import { describeAi } from "./modules/ai/config.js";
import { guideFor } from "./modules/ai/guides.js";
import { prompts } from "../src/data/prompts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
const port = Number(process.env.PORT || 8787);

await connect();

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? true : process.env.TRUST_PROXY);

app.use((_req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" });
  next();
});

const api = express.Router();
api.use(express.json({ limit: "600kb" }));
api.use(cookieParser());
api.use(sameOriginWrites);
api.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
api.get("/health", (_req, res) => res.json({ ok: true }));
api.use(loadUser);
api.use("/v1", identityRouter);
api.use("/v1", practiceRouter);
api.use("/v1", reviewsRouter);
api.use("/v1", interviewsRouter);
if (devToolsEnabled) api.use("/v1", devRouter);
api.use((_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "No such endpoint.")));
api.use((error, _req, res, _next) => {
  if (error.type === "entity.too.large") return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "That design is too large to save." } });
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: { code: "INVALID_JSON", message: "Malformed JSON." } });
  if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on our side." } });
});
app.use("/api", api);

// In production the same process serves the built frontend.
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

const missingGuides = prompts.filter((prompt) => !guideFor(prompt.id)).map((prompt) => prompt.id);
if (missingGuides.length) console.warn(`[ai] no interviewer guide for: ${missingGuides.join(", ")}`);

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}  db=${driver()}  email=${deliveryMode()}  ai=${describeAi()}${devToolsEnabled ? "  dev-tools=on" : ""}`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish (up
// to a limit), then close the database cleanly so the embedded Postgres doesn't need
// crash recovery. Closing it first would fail requests that are still running.
const SHUTDOWN_GRACE_MS = 8000;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    const finish = () => close().finally(() => process.exit(0));
    const force = setTimeout(() => { server.closeAllConnections(); finish(); }, SHUTDOWN_GRACE_MS);
    server.close(() => { clearTimeout(force); finish(); });
    server.closeIdleConnections();
  });
}
