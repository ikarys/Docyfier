import type { Brand } from "./brand";

/**
 * Where the instance's visual identity is kept — the port, not a backend.
 *
 * It is deliberately separate from the document repository: a brand configures
 * how documents look, so it cannot live in a store the user may switch, and it
 * has to be readable before any document is.
 */
export interface BrandRepository {
  /** The stored brand, or an empty one when nothing was ever configured. */
  load(): Promise<Brand>;
  save(brand: Brand): Promise<void>;
}
