import "server-only";
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
} from "@/infrastructure/configuration/aes-gcm-cipher";
import { patchSettings, readSettings } from "@/infrastructure/configuration/settings-file";
import {
  DEFAULT_PORTS,
  isStorageDriver,
  toStorageSummary,
  type StorageSettings,
  type StorageSettingsSummary,
} from "@/lib/settings-types";

/**
 * Where documents live. File-backed even when they live in a database: the
 * connection settings cannot be read from the database they configure.
 * Resolution order for each value: settings file > environment > default.
 */

export type { StorageSettings, StorageSettingsSummary };

const DEFAULTS: StorageSettings = {
  driver: "files",
  host: "localhost",
  port: DEFAULT_PORTS.postgres,
  user: "",
  password: "",
  database: "",
  ssl: false,
};

function environmentDefaults(): StorageSettings {
  const driver = isStorageDriver(process.env.DOCYFIER_DB_DRIVER)
    ? process.env.DOCYFIER_DB_DRIVER
    : DEFAULTS.driver;
  const envPort = Number(process.env.DOCYFIER_DB_PORT);
  return {
    driver,
    host: process.env.DOCYFIER_DB_HOST ?? DEFAULTS.host,
    port:
      Number.isInteger(envPort) && envPort > 0
        ? envPort
        : (DEFAULT_PORTS[driver] || DEFAULTS.port),
    user: process.env.DOCYFIER_DB_USER ?? DEFAULTS.user,
    password: process.env.DOCYFIER_DB_PASSWORD ?? DEFAULTS.password,
    database: process.env.DOCYFIER_DB_NAME ?? DEFAULTS.database,
    ssl: process.env.DOCYFIER_DB_SSL === "1" || DEFAULTS.ssl,
  };
}

/** The connection, password in clear. Same treatment as an LLM key: what sits
 * in the file is encrypted, what callers get is usable. */
export async function getStorageSettings(): Promise<StorageSettings> {
  const fallback = environmentDefaults();
  const saved = ((await readSettings()).storage ?? {}) as Partial<StorageSettings>;
  const driver = isStorageDriver(saved.driver) ? saved.driver : fallback.driver;
  return {
    driver,
    host: saved.host?.trim() || fallback.host,
    port:
      Number.isInteger(saved.port) && (saved.port as number) > 0
        ? (saved.port as number)
        : (DEFAULT_PORTS[driver] || fallback.port),
    user: saved.user ?? fallback.user,
    password: await decryptSecret(saved.password ?? fallback.password),
    database: saved.database?.trim() || fallback.database,
    ssl: saved.ssl ?? fallback.ssl,
  };
}

/** The connection for the settings page: no password crosses to the browser. */
export async function getStorageSummary(): Promise<StorageSettingsSummary> {
  return toStorageSummary(await getStorageSettings());
}

/** The stored password, for a connection test the browser can no longer carry. */
export async function getStoragePassword(): Promise<string> {
  return (await getStorageSettings()).password;
}

export async function saveStorageSettings(storage: StorageSettings): Promise<void> {
  const password = isEncrypted(storage.password)
    ? storage.password
    : await encryptSecret(storage.password);
  await patchSettings({ storage: { ...storage, password } });
}
