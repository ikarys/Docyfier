import "server-only";
import type { StorageDeps } from "@/application/configuration/deps";
import {
  probeConnection,
  saveConnection,
  storageConnection,
  storagePassword,
  storageSummary,
  type ConnectionFormInput,
} from "@/application/configuration/manage-storage";
import type {
  StorageConnectionRecord,
  StorageConnectionSummary,
} from "@/domain/configuration/storage-connection";
import { aesGcmCipher } from "@/infrastructure/configuration/aes-gcm-cipher";
import { FileStorageRepository } from "@/infrastructure/configuration/file-storage-repository";
import { storeProbe } from "@/infrastructure/configuration/store-probe";

/**
 * Composition root for the document store's own connection.
 *
 * File-backed whatever the driver: these settings cannot be read from the
 * database they configure. The password is encrypted by the adapter and comes
 * back usable here — never to a client component.
 */

export type { ConnectionFormInput };
export type StorageSettings = StorageConnectionRecord;
export type StorageSettingsSummary = StorageConnectionSummary;

function deps(): StorageDeps {
  return { connections: new FileStorageRepository(aesGcmCipher), probe: storeProbe };
}

/** The connection to use, password in clear. Server-side only. */
export async function getStorageSettings(): Promise<StorageSettings> {
  return storageConnection(deps());
}

/** The connection for the settings page: no password crosses to the browser. */
export async function getStorageSummary(): Promise<StorageSettingsSummary> {
  return storageSummary(deps());
}

/** The stored password, for a connection test the browser cannot carry one for. */
export async function getStoragePassword(): Promise<string> {
  return storagePassword(deps());
}

/** Reach a store the user is describing, and report what it holds. */
export async function testStorageConnection(input: ConnectionFormInput): Promise<number> {
  return probeConnection(deps(), input);
}

/** Save a connection, once it has been proven to answer. */
export async function saveStorageSettings(input: ConnectionFormInput): Promise<void> {
  return saveConnection(deps(), input);
}
