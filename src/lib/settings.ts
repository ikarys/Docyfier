import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_PORTS,
  isStorageDriver,
  type AiSettings,
  type ExportSettings,
  type ExportTargetSettings,
  type StorageSettings,
} from "./settings-types";

/**
 * App settings, file-backed even when documents live in a database: the
 * connection settings cannot be read from the database they configure.
 * Resolution order for each value: settings file > env > default.
 */

export type { AiSettings, ExportSettings, StorageSettings };

const AI_DEFAULTS: AiSettings = {
  baseUrl: "http://localhost:1234/v1",
  model: "",
  apiKey: "",
  maxOutputTokens: 32768,
  structuredOutput: false,
};

const STORAGE_DEFAULTS: StorageSettings = {
  driver: "files",
  host: "localhost",
  port: DEFAULT_PORTS.postgres,
  user: "",
  password: "",
  database: "",
  ssl: false,
};

/** On-disk shape: AI keys stayed flat when storage settings were added, so
 * files written before this STEP keep loading unchanged. */
type SettingsFile = Partial<AiSettings> & {
  storage?: Partial<StorageSettings>;
  exports?: Partial<ExportSettings>;
};

function settingsFile(): string {
  const dir =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(dir), "settings.json");
}

async function readSettingsFile(): Promise<SettingsFile> {
  try {
    return JSON.parse(await readFile(settingsFile(), "utf8")) as SettingsFile;
  } catch {
    return {};
  }
}

/** Merge a partial update into the file. Sections must not clobber each other:
 * saving AI settings has to leave `storage` intact, and vice versa. */
async function writeSettingsFile(patch: SettingsFile): Promise<void> {
  const file = settingsFile();
  const merged = { ...(await readSettingsFile()), ...patch };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(merged, null, 2), "utf8");
}

function aiEnvDefaults(): AiSettings {
  const envMax = Number(process.env.DOCYFIER_LLM_MAX_TOKENS);
  return {
    baseUrl: process.env.DOCYFIER_LLM_BASE_URL ?? AI_DEFAULTS.baseUrl,
    model: process.env.DOCYFIER_LLM_MODEL ?? AI_DEFAULTS.model,
    apiKey: process.env.DOCYFIER_LLM_API_KEY ?? AI_DEFAULTS.apiKey,
    maxOutputTokens:
      Number.isInteger(envMax) && envMax > 0 ? envMax : AI_DEFAULTS.maxOutputTokens,
    structuredOutput:
      process.env.DOCYFIER_LLM_STRUCTURED === "1" || AI_DEFAULTS.structuredOutput,
  };
}

function storageEnvDefaults(): StorageSettings {
  const driver = isStorageDriver(process.env.DOCYFIER_DB_DRIVER)
    ? process.env.DOCYFIER_DB_DRIVER
    : STORAGE_DEFAULTS.driver;
  const envPort = Number(process.env.DOCYFIER_DB_PORT);
  return {
    driver,
    host: process.env.DOCYFIER_DB_HOST ?? STORAGE_DEFAULTS.host,
    port:
      Number.isInteger(envPort) && envPort > 0
        ? envPort
        : (DEFAULT_PORTS[driver] || STORAGE_DEFAULTS.port),
    user: process.env.DOCYFIER_DB_USER ?? STORAGE_DEFAULTS.user,
    password: process.env.DOCYFIER_DB_PASSWORD ?? STORAGE_DEFAULTS.password,
    database: process.env.DOCYFIER_DB_NAME ?? STORAGE_DEFAULTS.database,
    ssl: process.env.DOCYFIER_DB_SSL === "1" || STORAGE_DEFAULTS.ssl,
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const fallback = aiEnvDefaults();
  const saved = await readSettingsFile();
  return {
    baseUrl: saved.baseUrl?.trim() || fallback.baseUrl,
    model: saved.model?.trim() ?? fallback.model,
    apiKey: saved.apiKey ?? fallback.apiKey,
    maxOutputTokens:
      Number.isInteger(saved.maxOutputTokens) && (saved.maxOutputTokens as number) > 0
        ? (saved.maxOutputTokens as number)
        : fallback.maxOutputTokens,
    structuredOutput: saved.structuredOutput ?? fallback.structuredOutput,
  };
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await writeSettingsFile(settings);
}

export async function getStorageSettings(): Promise<StorageSettings> {
  const fallback = storageEnvDefaults();
  const saved = (await readSettingsFile()).storage ?? {};
  const driver = isStorageDriver(saved.driver) ? saved.driver : fallback.driver;
  return {
    driver,
    host: saved.host?.trim() || fallback.host,
    port:
      Number.isInteger(saved.port) && (saved.port as number) > 0
        ? (saved.port as number)
        : (DEFAULT_PORTS[driver] || fallback.port),
    user: saved.user ?? fallback.user,
    password: saved.password ?? fallback.password,
    database: saved.database?.trim() || fallback.database,
    ssl: saved.ssl ?? fallback.ssl,
  };
}

export async function saveStorageSettings(storage: StorageSettings): Promise<void> {
  await writeSettingsFile({ storage });
}

/* --- Exports -------------------------------------------------------------- */

/** Targets enabled out of the box, e.g. `DOCYFIER_EXPORTS=confluence,notion`,
 * so a deployment can ship them without a first visit to Settings. */
function exportEnvDefaults(): string[] {
  return (process.env.DOCYFIER_EXPORTS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Drop anything the file holds for a target this build no longer ships, and
 * keep the values as strings — the shape comes from the target, not from here. */
function parseTargets(raw: unknown): Record<string, ExportTargetSettings> {
  const source = (raw ?? {}) as Record<string, Partial<ExportTargetSettings>>;
  const out: Record<string, ExportTargetSettings> = {};
  for (const [id, value] of Object.entries(source)) {
    const options = (value?.options ?? {}) as Record<string, unknown>;
    out[id] = {
      enabled: Boolean(value?.enabled),
      options: Object.fromEntries(
        Object.entries(options).map(([key, val]) => [key, String(val ?? "")]),
      ),
    };
  }
  return out;
}

export async function getExportSettings(): Promise<ExportSettings> {
  const saved = (await readSettingsFile()).exports ?? {};
  const targets = parseTargets(saved.targets);
  for (const id of exportEnvDefaults()) {
    targets[id] = { enabled: true, options: targets[id]?.options ?? {} };
  }
  return {
    targets,
    publicBaseUrl:
      saved.publicBaseUrl?.trim() || (process.env.DOCYFIER_PUBLIC_URL ?? "").trim(),
  };
}

export async function saveExportSettings(exports: ExportSettings): Promise<void> {
  await writeSettingsFile({ exports });
}
