import type { DocumentRecord } from "./document";

/**
 * Where documents are kept — the port, not a backend.
 *
 * An implementation moves records and nothing else. Ids, titles, timestamps and
 * theme repair belong to the entity and to the use cases, so every backend
 * behaves identically and a new one stays cheap to add. The contract is pinned
 * by one shared suite (`repository-contract.ts`) that every adapter runs.
 */

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DocumentRepository {
  /** Summaries, most recently updated first. */
  list(): Promise<DocumentSummary[]>;
  /** The stored record, or null when there is none under that id. */
  get(id: string): Promise<DocumentRecord | null>;
  /** Insert or replace; the caller never distinguishes create from update. */
  put(record: DocumentRecord): Promise<void>;
  /** Remove, or do nothing when the id is unknown. */
  remove(id: string): Promise<void>;
  /** Release the connection pool, if this implementation holds one. */
  close?(): Promise<void>;
}
