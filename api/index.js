// Vercel Function entry point. vercel.json rewrites every /api/* request here; the
// Express app keeps the original URL, so routing is identical to the local server.
//
// The app is built once per instance and reused across requests. Migrations are not
// run here: they are applied once per deploy, before the build (scripts/migrate.js).
import { createApp } from "../server/app.js";

let ready;

export default async function handler(req, res) {
  ready ??= createApp({ migrate: false, serveFrontend: false }).catch((error) => {
    ready = undefined; // let the next request retry instead of caching the failure
    throw error;
  });
  let app;
  try {
    app = await ready;
  } catch (error) {
    console.error("[api] startup failed:", error);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: { code: "UNAVAILABLE", message: "DesignRounds is starting up or temporarily unavailable. Try again in a moment." } }));
    return;
  }
  return app(req, res);
}
