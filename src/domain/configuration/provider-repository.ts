import type { ProviderCatalog } from "./provider-catalog";

/**
 * Where the configured providers are kept — the port, not a backend.
 *
 * An implementation moves a catalog and nothing else: the defaults an empty
 * instance starts from, the migration of an older file layout and the
 * encryption of the keys are its business, none of which a use case may see.
 * The catalog it returns always carries usable keys.
 */
export interface AiProviderRepository {
  load(): Promise<ProviderCatalog>;
  save(catalog: ProviderCatalog): Promise<void>;
}
