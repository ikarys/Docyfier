import "server-only";
import type { DocumentDeps } from "@/application/documents/deps";
import { importDocuments } from "@/application/documents/import-documents";
import * as read from "@/application/documents/read-documents";
import * as write from "@/application/documents/write-documents";
import type { DocumentRecord } from "@/domain/documents/document";
import type { DocumentSummary } from "@/domain/documents/repository";
import {
  activeRepository,
  fileRepository,
} from "@/infrastructure/documents/repository-factory";
import { systemClock, uuidIds } from "@/infrastructure/shared/system-clock";

/**
 * Composition root for documents.
 *
 * The use cases (`src/application/documents/`) take their repository, clock and
 * id source as arguments; this is the one module that decides what those are in
 * a running app — the configured backend, the real clock, real UUIDs. Routes,
 * server actions and pages call these functions and never see an adapter.
 *
 * It hands back records rather than `Document` instances on purpose: what
 * crosses into a React Server Component has to be plain serializable data.
 */

export type { DocumentRecord, DocumentSummary };

async function deps(): Promise<DocumentDeps> {
  return { repository: await activeRepository(), clock: systemClock, ids: uuidIds };
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  return read.listDocuments(await deps());
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const document = await read.getDocument(await deps(), id);
  return document?.toRecord() ?? null;
}

export async function createDocument(
  content?: unknown,
  theme?: unknown,
): Promise<DocumentRecord> {
  const document = await write.createDocument(await deps(), { body: content, theme });
  return document.toRecord();
}

/** Persist edited content. The title follows it unless a rename froze it. */
export async function updateDocument(
  id: string,
  content: unknown,
): Promise<DocumentRecord | null> {
  const document = await write.saveDocument(await deps(), id, content);
  return document?.toRecord() ?? null;
}

/** Rename. An empty title hands the name back to the content. */
export async function renameDocument(
  id: string,
  title: string,
): Promise<DocumentRecord | null> {
  const document = await write.renameDocument(await deps(), id, title);
  return document?.toRecord() ?? null;
}

export async function duplicateDocument(id: string): Promise<DocumentRecord | null> {
  const document = await write.duplicateDocument(await deps(), id);
  return document?.toRecord() ?? null;
}

/** Update only the presentation theme, leaving content untouched. */
export async function setDocumentTheme(
  id: string,
  theme: unknown,
): Promise<DocumentRecord | null> {
  const document = await write.setDocumentTheme(await deps(), id, theme);
  return document?.toRecord() ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
  await write.deleteDocument(await deps(), id);
}

/** Copy the file-backed documents into the active store, so switching to a
 * database does not hide existing work. */
export async function importDocumentsFromFiles(): Promise<{
  imported: number;
  skipped: number;
}> {
  return importDocuments(await deps(), fileRepository());
}
