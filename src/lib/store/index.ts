import "server-only";
import { randomUUID } from "node:crypto";
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_PRESET, normalizeTheme } from "@/lib/themes";
import { getStore } from "./driver";
import { fsStore } from "./fs";
import type { DocumentRecord, DocumentSummary } from "./types";

/**
 * Document store. Documents are ProseMirror JSON — the product's internal
 * format (see PLAN.md STEP 0) — kept in files, PostgreSQL or MySQL depending on
 * the storage settings (STEP 4). Everything that is not raw persistence lives
 * here, so all backends behave identically; see ./types.ts for the driver
 * contract.
 */

export type { DocumentRecord, DocumentSummary };

/** A document is empty of typed text but always has a valid doc shape. */
export function emptyContent(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Derive a display title from the first heading, else the first text, else Untitled. */
export function deriveTitle(content: JSONContent): string {
  const heading = content.content?.find((n) => n.type === "heading");
  const fromHeading = heading && collectText(heading).trim();
  if (fromHeading) return fromHeading;
  const firstText = content.content?.map(collectText).find((t) => t.trim());
  return firstText?.trim().slice(0, 80) || "Untitled document";
}

function collectText(node: JSONContent): string {
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(collectText).join("");
  return "";
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const store = await getStore();
  return store.list();
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const store = await getStore();
  const doc = await store.get(id);
  if (!doc) return null;
  // Older documents predate themes, or store the pre-U3 string form: both
  // normalize to a full DocumentTheme here, never at the render site.
  doc.theme = normalizeTheme(doc.theme);
  return doc;
}

export async function createDocument(
  content: JSONContent = emptyContent(),
): Promise<DocumentRecord> {
  const store = await getStore();
  const now = new Date().toISOString();
  const doc: DocumentRecord = {
    id: randomUUID(),
    title: deriveTitle(content),
    content,
    theme: { preset: DEFAULT_PRESET },
    createdAt: now,
    updatedAt: now,
  };
  await store.put(doc);
  return doc;
}

export async function updateDocument(
  id: string,
  content: JSONContent,
): Promise<DocumentRecord | null> {
  const existing = await getDocument(id);
  if (!existing) return null;
  const store = await getStore();
  const updated: DocumentRecord = {
    ...existing,
    content,
    title: deriveTitle(content),
    updatedAt: new Date().toISOString(),
  };
  await store.put(updated);
  return updated;
}

/** Update only the presentation theme, leaving content untouched. */
export async function setDocumentTheme(
  id: string,
  theme: unknown,
): Promise<DocumentRecord | null> {
  const existing = await getDocument(id);
  if (!existing) return null;
  const store = await getStore();
  const updated: DocumentRecord = {
    ...existing,
    theme: normalizeTheme(theme),
    updatedAt: new Date().toISOString(),
  };
  await store.put(updated);
  return updated;
}

export async function deleteDocument(id: string): Promise<void> {
  const store = await getStore();
  await store.remove(id);
}

/**
 * Copy the file-backed documents into the active store, so switching to a
 * database does not hide existing work. Ids already there are skipped and the
 * source files are never touched: the import can be re-run, and switching back
 * to the file store still shows the originals.
 */
export async function importDocumentsFromFiles(): Promise<{
  imported: number;
  skipped: number;
}> {
  const store = await getStore();
  if (store === fsStore) return { imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;
  for (const summary of await fsStore.list()) {
    const doc = await fsStore.get(summary.id);
    if (!doc) continue;
    if (await store.get(doc.id)) {
      skipped += 1;
      continue;
    }
    // Legacy documents carry the pre-U3 theme form; normalize on the way in so
    // the database never holds a shape the readers have to repair.
    await store.put({ ...doc, theme: normalizeTheme(doc.theme) });
    imported += 1;
  }
  return { imported, skipped };
}
