// Long-running server: local development and any Node host that runs a process.
// (Vercel uses api/index.js instead.)
import { createApp } from "./app.js";
import { close, driver } from "./db.js";
import { deliveryMode } from "./email.js";
import { devToolsEnabled, isProduction } from "./flags.js";
import { describeAi } from "./modules/ai/config.js";
import { describeSpeech } from "./modules/ai/speech.js";
import { startAnswerPoolWorker } from "./modules/answers/worker.js";

const port = Number(process.env.PORT || 8787);
const app = await createApp();
// Development only queues new questions. Building fetches public pages and may
// call the model, so it runs in production, or locally when ANSWER_POOLS=build.
const buildAnswerPools = process.env.ANSWER_POOLS === "build" || (isProduction && process.env.ANSWER_POOLS !== "off");
const stopAnswerPools = buildAnswerPools ? startAnswerPoolWorker() : () => {};

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}  db=${driver()}  email=${deliveryMode()}  ai=${describeAi()}  stt=${describeSpeech()}${devToolsEnabled ? "  dev-tools=on" : ""}`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish (up
// to a limit), then close the database cleanly so the embedded Postgres doesn't need
// crash recovery. Closing it first would fail requests that are still running.
const SHUTDOWN_GRACE_MS = 8000;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopAnswerPools();
    const finish = () => close().finally(() => process.exit(0));
    const force = setTimeout(() => { server.closeAllConnections(); finish(); }, SHUTDOWN_GRACE_MS);
    server.close(() => { clearTimeout(force); finish(); });
    server.closeIdleConnections();
  });
}
