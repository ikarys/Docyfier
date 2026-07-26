import "server-only";
import type { StorageSettings } from "@/lib/settings-types";
import { connectSqlStore, type SqlClient, type SqlStatements } from "./sql";
import type { DocumentStore } from "./types";

/** PostgreSQL driver. `pg` is imported lazily so the unused backend never
 * loads. */

const STATEMENTS: SqlStatements = {
  schema: [
    `CREATE TABLE IF NOT EXISTS documents (
       id         TEXT PRIMARY KEY,
       title      TEXT NOT NULL,
       content    JSONB NOT NULL,
       theme      JSONB NOT NULL,
       created_at TIMESTAMPTZ NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL
     )`,
    `CREATE INDEX IF NOT EXISTS documents_updated_at_idx
       ON documents (updated_at DESC)`,
  ],
  list: `SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC`,
  get: `SELECT id, title, content, theme, created_at, updated_at
          FROM documents WHERE id = $1`,
  put: `INSERT INTO documents (id, title, content, theme, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              content = EXCLUDED.content,
              theme = EXCLUDED.theme,
              updated_at = EXCLUDED.updated_at`,
  remove: `DELETE FROM documents WHERE id = $1`,
};

export async function createPostgresStore(
  settings: StorageSettings,
): Promise<DocumentStore> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    host: settings.host,
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: settings.database,
    // `true` keeps certificate verification on; servers with a self-signed
    // certificate need their CA in the system trust store.
    ssl: settings.ssl || undefined,
    max: 5,
    connectionTimeoutMillis: 10_000,
  });
  // An idle pool must not crash the server when the database drops a
  // connection; queries surface the error on their own.
  pool.on("error", () => {});

  const client: SqlClient = {
    query: async (sql, params) => (await pool.query(sql, params)).rows,
    close: () => pool.end(),
  };
  return connectSqlStore(client, STATEMENTS);
}
