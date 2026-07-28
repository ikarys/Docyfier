import type { DocumentRepository } from "@/domain/documents/repository";
import type { Clock, IdGenerator } from "@/domain/shared/clock";

/**
 * What a document use case needs from the outside world, handed to it rather
 * than reached for. Nothing here is a concrete backend: swapping PostgreSQL for
 * files, or freezing time in a test, is a different object, not a different
 * import.
 */
export interface DocumentDeps {
  repository: DocumentRepository;
  clock: Clock;
  ids: IdGenerator;
}
