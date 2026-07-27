import type { StorageConnection } from "./storage-connection";

/**
 * Where the document store's own connection is kept — the port, not a backend.
 *
 * Whatever implements it is file-backed in practice: connection settings cannot
 * be read from the database they configure. The password it hands back is
 * usable; how it was protected on the way there is the adapter's business.
 */
export interface StorageConnectionRepository {
  load(): Promise<StorageConnection>;
  save(connection: StorageConnection): Promise<void>;
}

/**
 * Reaching a store before trusting it. A connection is proven, not assumed: a
 * typo saved blind takes the whole app down on the next page load.
 */
export interface StorageProbe {
  /** Connect, create the schema if missing, and count the documents held. */
  countDocuments(connection: StorageConnection): Promise<number>;
}
