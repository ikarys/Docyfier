import { Document } from "@/domain/documents/document";
import type { DocumentSummary } from "@/domain/documents/repository";
import type { DocumentDeps } from "./deps";

/** Reading documents. No rule here beyond "what is stored comes back repaired". */

export async function listDocuments(deps: DocumentDeps): Promise<DocumentSummary[]> {
  return deps.repository.list();
}

/**
 * One document, or null when there is none. The record goes through the entity
 * on the way out, so a legacy theme or a body a driver could not return is
 * repaired here and never at a render site.
 */
export async function getDocument(
  deps: DocumentDeps,
  id: string,
): Promise<Document | null> {
  const record = await deps.repository.get(id);
  return record ? Document.restore(record) : null;
}
