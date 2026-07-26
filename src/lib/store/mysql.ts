import "server-only";
import type { StorageSettings } from "@/lib/settings-types";
import { connectSqlStore, type SqlClient, type SqlStatements } from "./sql";
import type { DocumentStore } from "./types";

/** MySQL driver. `mysql2` is imported lazily so the unused backend never
 * loads. */

const STATEMENTS: SqlStatements = {
  schema: [
    // MySQL has no `CREATE INDEX IF NOT EXISTS`, so the index is declared
    // inline and created with the table.
    `CREATE TABLE IF NOT EXISTS documents (
       id         VARCHAR(64) PRIMARY KEY,
       title      TEXT NOT NULL,
       content    JSON NOT NULL,
       theme      JSON NOT NULL,
       created_at DATETIME(3) NOT NULL,
       updated_at DATETIME(3) NOT NULL,
       title_override TEXT NULL,
       INDEX documents_updated_at_idx (updated_at DESC)
     )`,
    // Added in STEP U5. MySQL has no `ADD COLUMN IF NOT EXISTS`; on a table
    // that already has it the duplicate-column error is swallowed (see sql.ts).
    `ALTER TABLE documents ADD COLUMN title_override TEXT NULL`,
  ],
  list: `SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC`,
  get: `SELECT id, title, title_override, content, theme, created_at, updated_at
          FROM documents WHERE id = ?`,
  put: `INSERT INTO documents (id, title, title_override, content, theme, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          title_override = VALUES(title_override),
          content = VALUES(content),
          theme = VALUES(theme),
          updated_at = VALUES(updated_at)`,
  remove: `DELETE FROM documents WHERE id = ?`,
};

export async function createMysqlStore(
  settings: StorageSettings,
): Promise<DocumentStore> {
  const mysql = await import("mysql2/promise");
  const pool = mysql.createPool({
    host: settings.host,
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: settings.database,
    ssl: settings.ssl ? { rejectUnauthorized: true } : undefined,
    // DATETIME carries no zone: pinning the session to UTC keeps the ISO
    // timestamps the app stores identical to the ones it reads back.
    timezone: "Z",
    connectionLimit: 5,
    connectTimeout: 10_000,
  });

  const client: SqlClient = {
    query: async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    },
    close: () => pool.end(),
  };
  return connectSqlStore(client, STATEMENTS);
}
