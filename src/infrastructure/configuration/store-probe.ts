import "server-only";
import type { StorageConnection } from "@/domain/configuration/storage-connection";
import type { StorageProbe } from "@/domain/configuration/storage-repository";
import { probeRepository } from "@/infrastructure/documents/repository-factory";

/**
 * The `StorageProbe` adapter: connects with an explicit configuration, creates
 * the schema if it is missing and counts what is there — without disturbing the
 * pool the running app uses.
 */
export const storeProbe: StorageProbe = {
  countDocuments(connection: StorageConnection): Promise<number> {
    return probeRepository(connection.toRecord());
  },
};
