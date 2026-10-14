// Applies pending database migrations, then exits. Runs on every Vercel deploy before
// the frontend build ("build:deploy"), so a failing migration fails the deploy and the
// previous release keeps serving. Usable by hand too: `npm run db:migrate`.
//
// Uses MIGRATION_DATABASE_URL when set (e.g. a session-mode or direct connection),
// otherwise DATABASE_URL. Because migrations land before the new code goes live, each
// one must keep working with the code that is currently deployed (add columns and
// tables first; remove old ones in a later release).
import "../server/env.js";
import { close, connect, driver, migrate } from "../server/db.js";

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

if (!url && process.env.VERCEL) {
  console.error("[migrate] DATABASE_URL is not set for this Vercel environment. Add it in Project Settings → Environment Variables.");
  process.exit(1);
}

try {
  await connect({ url, migrate: false });
  const applied = await migrate();
  console.log(`[migrate] ${driver()}: ${applied.length ? `applied ${applied.join(", ")}` : "already up to date"}`);
} catch (error) {
  console.error(`[migrate] failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await close();
}
