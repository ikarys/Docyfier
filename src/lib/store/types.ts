import type { JSONContent } from "@tiptap/react";
import type { DocumentTheme } from "@/lib/themes";

export interface DocumentRecord {
  id: string;
  /** Effective title: the override when the user renamed the document,
   * otherwise the one derived from the content. */
  title: string;
  /** Set by an explicit rename (STEP U5). While it is set the title stops
   * following the content; clearing it hands the title back to `deriveTitle`. */
  titleOverride?: string;
  content: JSONContent;
  /** Presentation theme (see src/lib/themes.ts). Content stays untouched.
   * Documents written before STEP U3 hold a bare preset id; `normalizeTheme`
   * upgrades them on read. */
  theme: DocumentTheme;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * A storage backend. Drivers move records and nothing else: ids, titles,
 * timestamps and theme normalization all live in the facade (`./index.ts`), so
 * every backend behaves identically and a new one stays cheap to add.
 */
export interface DocumentStore {
  list(): Promise<DocumentSummary[]>;
  /** Raw record as stored — the facade normalizes the theme. */
  get(id: string): Promise<DocumentRecord | null>;
  /** Insert or replace; the facade never distinguishes create from update. */
  put(doc: DocumentRecord): Promise<void>;
  remove(id: string): Promise<void>;
  /** Release the connection pool, if the driver holds one. */
  close?(): Promise<void>;
}
