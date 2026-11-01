// Long-running server: local development and any Node host that runs a process.
// (Vercel uses api/index.js instead.)
import { createApp } from "./app.js";
import { close, driver } from "./db.js";
import { deliveryMode } from "./email.js";
import { devToolsEnabled, isProduction } from "./flags.js";
import { describeAi } from "./modules/ai/config.js";
import { describeSpeech } from "./modules/ai/speech.js";
import { describeObjectStorage } from "./object-storage.js";
import { describeTurnstile } from "./turnstile.js";
import { startAnswerPoolWorker } from "./modules/answers/worker.js";
import { buildPacksEnabled, describePacks, startPackWorker } from "./modules/pks/worker.js";

const port = Number(process.env.PORT || 8787);

// Register before connecting so `node --watch` restarts close PGlite even during startup.
let server;
const SHUTDOWN_GRACE_MS = 8000;
const shutdown = () => {
  const finish = () => close().finally(() => process.exit(0));
  if (!server) return finish();
  const force = setTimeout(() => { server.closeAllConnections(); finish(); }, SHUTDOWN_GRACE_MS);
  server.close(() => { clearTimeout(force); finish(); });
  server.closeIdleConnections();
};
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopAnswerPools?.();
    stopPacks?.();
    shutdown();
  });
}

const app = await createApp();
// Development only queues new questions. Building fetches public pages and may
// call the model, so it runs in production, or locally when ANSWER_POOLS=build.
const buildAnswerPools = process.env.ANSWER_POOLS === "build" || (isProduction && process.env.ANSWER_POOLS !== "off");
let stopAnswerPools = () => {};
let stopPacks = () => {};
stopAnswerPools = buildAnswerPools ? startAnswerPoolWorker() : () => {};
stopPacks = buildPacksEnabled() ? startPackWorker() : () => {};

server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}  db=${driver()}  email=${deliveryMode()}  storage=${describeObjectStorage()}  ai=${describeAi()}  stt=${describeSpeech()}  turnstile=${describeTurnstile()}  packs=${describePacks()}${devToolsEnabled ? "  dev-tools=on" : ""}`);
});
