import "server-only";
import type { DocumentRecord, DocumentStore, DocumentSummary } from "./types";

/**
 * Backend-agnostic half of the SQL drivers. PostgreSQL and MySQL differ only in
 * their connection library, placeholder syntax and upsert clause, so those live
 * in ./pg.ts and ./mysql.ts and everything else — schema shape, row mapping —
 * is shared here.
 */

/** Minimal client surface both `pg` and `mysql2` can satisfy. */
export interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  close(): Promise<void>;
}

export interface SqlStatements {
  /** DDL run on connect, in order. Must be idempotent — an `ADD COLUMN` that
   * the table already has is tolerated (see `ensureSchema`). */
  schema: string[];
  list: string;
  get: string;
  /** Upsert taking id, title, title_override, content, theme, created_at,
   * updated_at. */
  put: string;
  remove: string;
}

/** Drivers hand back JSON columns as objects (already parsed) or as strings,
 * depending on the library and column type. */
function parseJson<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

/** Timestamps live in the app as ISO strings; SQL hands back `Date` (or a
 * string, for drivers configured to skip date parsing). */
function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function toRecord(row: Record<string, unknown>): DocumentRecord {
  const doc: DocumentRecord = {
    id: String(row.id),
    title: String(row.title),
    content: parseJson(row.content),
    theme: parseJson(row.theme),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
  if (row.title_override != null) doc.titleOverride = String(row.title_override);
  return doc;
}

/** MySQL has no `ADD COLUMN IF NOT EXISTS`: on an existing table the column is
 * already there, which is the expected outcome, not a failure. */
function isDuplicateColumn(err: unknown): boolean {
  const { code, errno } = (err ?? {}) as { code?: unknown; errno?: unknown };
  return code === "ER_DUP_FIELDNAME" || errno === 1060;
}

async function ensureSchema(client: SqlClient, statements: SqlStatements): Promise<void> {
  for (const ddl of statements.schema) {
    try {
      await client.query(ddl);
    } catch (err) {
      if (!isDuplicateColumn(err)) throw err;
    }
  }
}

/** PostgreSQL `undefined_table`, MySQL `ER_NO_SUCH_TABLE`. */
function isMissingTable(err: unknown): boolean {
  const { code, errno } = (err ?? {}) as { code?: unknown; errno?: unknown };
  return code === "42P01" || code === "ER_NO_SUCH_TABLE" || errno === 1146;
}

/** Wrap a connected client into a store. The caller has already run `schema`.
 *
 * Pools outlive the database they point at: a restored backup or a recreated
 * container leaves a live connection with no `documents` table, which would
 * otherwise fail every request until the process restarts. Recreating the
 * schema on that one error makes the store self-heal. */
export function sqlStore(client: SqlClient, statements: SqlStatements): DocumentStore {
  async function query(
    sql: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[]> {
    try {
      return await client.query(sql, params);
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      await ensureSchema(client, statements);
      return client.query(sql, params);
    }
  }

  return {
    async list(): Promise<DocumentSummary[]> {
      const rows = await query(statements.list);
      return rows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        updatedAt: toIso(row.updated_at),
      }));
    },

    async get(id: string): Promise<DocumentRecord | null> {
      const rows = await query(statements.get, [id]);
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async put(doc: DocumentRecord): Promise<void> {
      await query(statements.put, [
        doc.id,
        doc.title,
        doc.titleOverride ?? null,
        JSON.stringify(doc.content),
        JSON.stringify(doc.theme),
        new Date(doc.createdAt),
        new Date(doc.updatedAt),
      ]);
    },

    async remove(id: string): Promise<void> {
      await query(statements.remove, [id]);
    },

    close: () => client.close(),
  };
}

/** Run the idempotent DDL, then build the store. Failing here surfaces a bad
 * connection at configuration time rather than on the first page load. */
export async function connectSqlStore(
  client: SqlClient,
  statements: SqlStatements,
): Promise<DocumentStore> {
  try {
    await ensureSchema(client, statements);
  } catch (err) {
    await client.close().catch(() => {});
    throw err;
  }
  return sqlStore(client, statements);
}
