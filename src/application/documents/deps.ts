import type { BrandRepository } from "@/domain/documents/brand-repository";
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

/** What the brand use cases need: where the instance's identity is kept, and
 * nothing else — configuring it neither reads nor writes a document. */
export interface BrandDeps {
  brand: BrandRepository;
}
