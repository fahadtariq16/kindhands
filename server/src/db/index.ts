import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA_SQL } from "./schema.js";

/** Minimal query interface shared by real Postgres (pg) and embedded Postgres (PGlite). */
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Runs fn inside a transaction. Rolls back if fn throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PgDb implements Db {
  constructor(private pool: pg.Pool) {}

  async query<T>(sql: string, params: unknown[] = []) {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async tx<T>(fn: (q: Queryable) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const q: Queryable = {
        query: async <R>(sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as R[],
      };
      const result = await fn(q);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}

class PgliteDb implements Db {
  constructor(private db: PGlite) {}

  async query<T>(sql: string, params: unknown[] = []) {
    return (await this.db.query<T>(sql, params)).rows;
  }

  tx<T>(fn: (q: Queryable) => Promise<T>) {
    return this.db.transaction(async (t) =>
      fn({ query: async <R>(sql: string, params: unknown[] = []) => (await t.query<R>(sql, params)).rows }),
    );
  }

  close() {
    return this.db.close();
  }
}

/**
 * databaseUrl set  → real PostgreSQL (production).
 * databaseUrl empty → embedded Postgres in `dir` ("memory://" for tests).
 */
export async function createDb(opts: { databaseUrl: string; pgliteDir?: string }): Promise<Db> {
  let db: Db;
  if (opts.databaseUrl) {
    db = new PgDb(new pg.Pool({ connectionString: opts.databaseUrl }));
  } else {
    const dir = opts.pgliteDir ?? "memory://";
    if (dir !== "memory://") console.warn(`[db] DATABASE_URL not set — using embedded Postgres in ${dir}`);
    db = new PgliteDb(await PGlite.create(dir === "memory://" ? undefined : dir));
  }
  await migrate(db);
  return db;
}

async function migrate(db: Db) {
  for (const statement of SCHEMA_SQL.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await db.query(statement);
  }
}
