import { readdir, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "migrations");

let client;
let driverName;

// One query interface for both drivers: `query(sql, params) -> rows`.
// Local development uses PGlite (embedded Postgres persisted to .data/), so no
// database install is required. Setting DATABASE_URL switches to a real Postgres
// server such as Neon or Supabase, with identical SQL.
export async function connect() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      ssl: /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
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
    let db;
    try {
      db = new PGlite(dataDir);
      await db.waitReady;
    } catch (error) {
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
  await migrate();
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

async function migrate() {
  await client.exec(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set((await client.query("select name from schema_migrations")).rows.map((row) => row.name));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await client.exec(`begin;\n${sql}\ninsert into schema_migrations (name) values ('${file.replace(/'/g, "''")}');\ncommit;`);
    console.log(`[db] applied migration ${file}`);
  }
}

export async function close() {
  if (client) await client.close();
  client = undefined;
}
