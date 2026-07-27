import "server-only";
import type { StorageSettings } from "@/lib/settings-types";
import { connectSqlRepository, type SqlClient, type SqlStatements } from "./sql-repository";
import type { DocumentRepository } from "@/domain/documents/repository";

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
    // Added in STEP U5; tables created before it get the column here.
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS title_override TEXT`,
  ],
  list: `SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC`,
  get: `SELECT id, title, title_override, content, theme, created_at, updated_at
          FROM documents WHERE id = $1`,
  put: `INSERT INTO documents (id, title, title_override, content, theme, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              title_override = EXCLUDED.title_override,
              content = EXCLUDED.content,
              theme = EXCLUDED.theme,
              updated_at = EXCLUDED.updated_at`,
  remove: `DELETE FROM documents WHERE id = $1`,
};

export async function createPostgresRepository(
  settings: StorageSettings,
): Promise<DocumentRepository> {
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
  return connectSqlRepository(client, STATEMENTS);
}
