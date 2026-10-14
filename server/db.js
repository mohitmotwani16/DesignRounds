import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isProduction } from "./flags.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "migrations");

// Postgres major version embedded by the pinned @electric-sql/pglite (0.4.x); keep in
// step with production (Supabase runs 17).
const PGLITE_PG_MAJOR = "17";

let client;
let driverName;

// One query interface for both drivers: `query(sql, params) -> rows`.
// Local development uses PGlite (embedded Postgres persisted to .data/), so no
// database install is required. Setting DATABASE_URL switches to a real Postgres
// server such as Neon or Supabase, with identical SQL.
//
// `migrate: false` skips the migration check; serverless deployments apply migrations
// once per deploy (scripts/migrate.js) instead of on every cold start.
export async function connect({ url = process.env.DATABASE_URL, migrate: runMigrations = true } = {}) {
  if (client) return client;
  if (!url && isProduction) throw new Error("DATABASE_URL must be set in production; the embedded database is for local development only.");
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({
      connectionString: url,
      // Small per-instance pools: on serverless every warm instance holds its own, and
      // the provider's pooler (e.g. Supabase Supavisor) multiplexes them onto Postgres.
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "designrounds",
      ssl: /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
    // An idle client dropped by the server must not crash the process.
    pool.on("error", (error) => console.error("[db] idle client error:", error.message));
    // On Vercel, keeps a suspending instance alive just long enough to close idle
    // connections instead of leaking them on the database side. A no-op elsewhere.
    if (process.env.VERCEL) {
      const { attachDatabasePool } = await import("@vercel/functions");
      attachDatabasePool(pool);
    }
    client = {
      query: (sql, params) => pool.query(sql, params),
      exec: (sql) => pool.query(sql),
      close: () => pool.end(),
      transaction: async (fn) => {
        const connection = await pool.connect();
        try {
          await connection.query("begin");
          const result = await fn(connection);
          await connection.query("commit");
          return result;
        } catch (error) {
          await connection.query("rollback").catch(() => {});
          throw error;
        } finally {
          connection.release();
        }
      },
    };
    driverName = "postgres";
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = process.env.PGLITE_DIR || path.resolve(here, "..", ".data", "pglite");
    await mkdir(dataDir, { recursive: true });
    // PGlite's filesystem honours the write bit, and a read-only folder (e.g. one that
    // OneDrive has marked read-only after syncing it) fails with an opaque error.
    if (((await stat(dataDir)).mode & 0o200) === 0) {
      throw new Error(`The local database folder ${dataDir} is read-only. Clear the flag and restart: on Windows run  attrib -R "${dataDir}" /S /D  (or set PGLITE_DIR to a folder outside OneDrive).`);
    }
    let db;
    try {
      db = new PGlite(dataDir);
      await db.waitReady;
    } catch (error) {
      // PGlite can't open a data directory written by another Postgres major version.
      const createdBy = await readFile(path.join(dataDir, "PG_VERSION"), "utf8").then((text) => text.trim(), () => null);
      if (createdBy && createdBy !== PGLITE_PG_MAJOR) {
        throw new Error(`The local database in ${dataDir} was created by Postgres ${createdBy}, but this version of the app embeds Postgres ${PGLITE_PG_MAJOR}. Rename or delete that folder to start a fresh local database (local development data only).`);
      }
      throw new Error(`Could not open the local database in ${dataDir}. If it was interrupted while being created, delete that folder to start fresh. (${error.message})`);
    }
    client = {
      query: (sql, params) => db.query(sql, params),
      exec: (sql) => db.exec(sql),
      close: () => db.close(),
      transaction: (fn) => db.transaction((tx) => fn(tx)),
    };
    driverName = `pglite (${path.relative(process.cwd(), dataDir) || dataDir})`;
  }
  if (runMigrations) await migrate();
  return client;
}

export function driver() {
  return driverName;
}

export async function query(sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// Runs `fn` inside one transaction on a single connection. `fn` receives the
// same `query` / `queryOne` helpers, bound to that connection.
export function transaction(fn) {
  return client.transaction((connection) => fn({
    query: async (sql, params = []) => (await connection.query(sql, params)).rows,
    queryOne: async (sql, params = []) => (await connection.query(sql, params)).rows[0] ?? null,
  }));
}

// Arbitrary constant identifying the migration lock.
const MIGRATION_LOCK_ID = 7_340_201;

// Applies pending migrations in order, each in its own transaction on one connection.
// A transaction-scoped advisory lock serialises concurrent runners (parallel deploys or
// cold starts), and each runner re-checks under the lock, so a migration is never
// applied twice. Transaction-scoped locks also work through transaction-mode poolers.
// Returns the names of the migrations this call applied.
export async function migrate() {
  await client.exec(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set((await client.query("select name from schema_migrations")).rows.map((row) => row.name));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const done = [];
  for (const file of files.filter((name) => !applied.has(name))) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const ran = await client.transaction(async (conn) => {
      await conn.query(`select pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`);
      if ((await conn.query("select 1 from schema_migrations where name = $1", [file])).rows.length) return false;
      // Multi-statement SQL: PGlite needs exec(); node-postgres runs it via a parameterless query().
      await (conn.exec ? conn.exec(sql) : conn.query(sql));
      await conn.query("insert into schema_migrations (name) values ($1)", [file]);
      return true;
    }).catch((error) => {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    });
    if (ran) {
      done.push(file);
      console.log(`[db] applied migration ${file}`);
    }
  }
  return done;
}

export async function close() {
  if (client) await client.close();
  client = undefined;
}
