import type { AiProviderRepository } from "@/domain/configuration/provider-repository";
import type {
  StorageConnectionRepository,
  StorageProbe,
} from "@/domain/configuration/storage-repository";
import type { IdGenerator } from "@/domain/shared/clock";

/**
 * What a configuration use case needs from the outside world, handed to it
 * rather than reached for. Nothing here is a concrete backend: the settings
 * file in a running app, an in-memory catalog in a test.
 */
export interface AiProviderDeps {
  providers: AiProviderRepository;
  ids: IdGenerator;
}

export interface StorageDeps {
  connections: StorageConnectionRepository;
  probe: StorageProbe;
}
