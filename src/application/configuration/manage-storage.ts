import {
  StorageConnection,
  type ConnectionInput,
  type StorageConnectionRecord,
  type StorageConnectionSummary,
} from "@/domain/configuration/storage-connection";
import type { StorageDeps } from "./deps";

/**
 * Configuring where documents live.
 *
 * Two rules are enforced here rather than in a form: a database is reached
 * before it is saved, and a password the browser never received cannot be
 * resent — so an absent one means "keep the stored one" and only an explicit
 * empty string clears it.
 */

/** What a connection form submits. An absent `password` keeps the stored one. */
export type ConnectionFormInput = Omit<ConnectionInput, "password"> & {
  password?: string;
};

/** The connection to use, password included. Server-side only. */
export async function storageConnection(
  deps: StorageDeps,
): Promise<StorageConnectionRecord> {
  return (await deps.connections.load()).toRecord();
}

export async function storageSummary(
  deps: StorageDeps,
): Promise<StorageConnectionSummary> {
  return (await deps.connections.load()).toSummary();
}

/** The stored password, for a test the browser cannot carry a password for. */
export async function storagePassword(deps: StorageDeps): Promise<string> {
  return (await deps.connections.load()).password;
}

async function withStoredPassword(
  deps: StorageDeps,
  input: ConnectionFormInput,
): Promise<StorageConnection> {
  const entered = StorageConnection.create(input);
  if (input.password !== undefined) return entered;
  return entered.withPassword(await storagePassword(deps));
}

/** Connect, create the schema if missing, and report how many documents the
 * store already holds ("test connection"). */
export async function probeConnection(
  deps: StorageDeps,
  input: ConnectionFormInput,
): Promise<number> {
  return deps.probe.countDocuments(await withStoredPassword(deps, input));
}

/**
 * Save the connection. A database that cannot be reached is refused rather than
 * saved: a typo here would otherwise take the whole app down on the next page
 * load. The file store has nothing to reach and is saved as is.
 */
export async function saveConnection(
  deps: StorageDeps,
  input: ConnectionFormInput,
): Promise<void> {
  const connection = await withStoredPassword(deps, input);
  if (connection.needsConnecting) {
    await deps.probe.countDocuments(connection);
  }
  await deps.connections.save(connection);
}
