/** Shared shape of the AI settings (importable from client components). */
export interface AiSettings {
  /** OpenAI-compatible endpoint, e.g. http://localhost:1234/v1 */
  baseUrl: string;
  /** Model id; empty string = auto-detect (first model on the server). */
  model: string;
  /** API key; LM Studio ignores it, other providers may require it. */
  apiKey: string;
  /** Max tokens the model may generate per response (whole-document edits need room). */
  maxOutputTokens: number;
  /** Ask the provider for JSON-schema-constrained output instead of parsing
   * fences and prose out of free text. Only some servers implement it. */
  structuredOutput: boolean;
}

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
