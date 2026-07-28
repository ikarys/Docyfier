import { Document } from "@/domain/documents/document";
import type { DocumentRepository } from "@/domain/documents/repository";
import type { DocumentDeps } from "./deps";

export interface ImportOutcome {
  imported: number;
  skipped: number;
}

/**
 * Copy documents from another store into the active one, so switching to a
 * database does not hide existing work.
 *
 * Ids already present are skipped and the source is never touched: the import
 * can be re-run, and switching back still shows the originals. Records go
 * through the entity on the way in, so the destination never receives a shape
 * its readers would have to repair.
 */
export async function importDocuments(
  deps: DocumentDeps,
  source: DocumentRepository,
): Promise<ImportOutcome> {
  if (source === deps.repository) return { imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;
  for (const summary of await source.list()) {
    const record = await source.get(summary.id);
    if (!record) continue;
    if (await deps.repository.get(record.id)) {
      skipped += 1;
      continue;
    }
    await deps.repository.put(Document.restore(record).toRecord());
    imported += 1;
  }
  return { imported, skipped };
}
