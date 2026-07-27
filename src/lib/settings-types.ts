/** What a client component may see of a provider: never the key itself. */
export type { AiProviderSummary } from "@/domain/configuration/ai-provider";

/** Where documents live. `files` is the default on-disk store (STEP 0). */
export type StorageDriver = "files" | "postgres" | "mysql";

export const STORAGE_DRIVERS: StorageDriver[] = ["files", "postgres", "mysql"];

export const DEFAULT_PORTS: Record<StorageDriver, number> = {
  files: 0,
  postgres: 5432,
  mysql: 3306,
};

/** Connection settings for the document store. Always file-backed themselves:
 * they cannot be read from the database they configure. */
export interface StorageSettings {
  driver: StorageDriver;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

export function isStorageDriver(value: unknown): value is StorageDriver {
  return STORAGE_DRIVERS.includes(value as StorageDriver);
}

/** What the browser gets: the connection minus its password. */
export type StorageSettingsSummary = Omit<StorageSettings, "password"> & {
  hasPassword: boolean;
};

export function toStorageSummary(settings: StorageSettings): StorageSettingsSummary {
  const { password, ...rest } = settings;
  return { ...rest, hasPassword: password.length > 0 };
}

/** State of one export target: off until the user turns it on, plus whatever
 * options that target declares. */
export interface ExportTargetSettings {
  enabled: boolean;
  options: Record<string, string>;
}

/** Export settings, keyed by target id. `publicBaseUrl` is shared: every
 * target that emits images needs the same absolute origin. */
export interface ExportSettings {
  targets: Record<string, ExportTargetSettings>;
  /** Absolute origin of this instance, e.g. https://docs.example.com. Empty
   * means images stay relative and only resolve from inside. */
  publicBaseUrl: string;
}

/** One target's settings as the browser sees them: values of options declared
 * `secret` are blanked, and `savedSecrets` lists the ones that hold a value. */
export interface ExportTargetSummary extends ExportTargetSettings {
  savedSecrets: string[];
}

export interface ExportSettingsSummary {
  targets: Record<string, ExportTargetSummary>;
  publicBaseUrl: string;
}
