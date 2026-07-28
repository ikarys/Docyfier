import type { DocumentRecord } from "@/domain/documents/document";
import type {
  DocumentRepository,
  DocumentSummary,
} from "@/domain/documents/repository";

/**
 * A document repository that keeps everything in memory.
 *
 * Written for the tests, and deliberately not a mock: it enforces the same
 * contract as the real backends — records go in and out by value, never by
 * reference — so a use case that passes against it passes against PostgreSQL.
 * A mock would only prove which methods were called.
 */
export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly records = new Map<string, DocumentRecord>();

  constructor(seed: DocumentRecord[] = []) {
    for (const record of seed) this.records.set(record.id, structuredClone(record));
  }

  async list(): Promise<DocumentSummary[]> {
    return [...this.records.values()]
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<DocumentRecord | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async put(record: DocumentRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  /** Test-only convenience: how many documents are stored. */
  get size(): number {
    return this.records.size;
  }
}
