import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { decryptSecret, encryptSecret, isEncrypted } from "./secrets";
import {
  DEFAULT_PORTS,
  isStorageDriver,
  toStorageSummary,
  toSummary,
  type AiConfig,
  type AiProvider,
  type AiProviderSummary,
  type AiSettings,
  type ExportSettings,
  type ExportSettingsSummary,
  type ExportTargetSettings,
  type ExportTargetSummary,
  type StorageSettings,
  type StorageSettingsSummary,
} from "./settings-types";

/**
 * App settings, file-backed even when documents live in a database: the
 * connection settings cannot be read from the database they configure.
 * Resolution order for each value: settings file > env > default.
 */

export type {
  AiConfig,
  AiProvider,
  AiProviderSummary,
  AiSettings,
  ExportSettings,
  ExportSettingsSummary,
  StorageSettings,
  StorageSettingsSummary,
};

/** Id of the provider the legacy single-endpoint settings migrate into. It is
 * also the only one the environment can configure. */
const DEFAULT_PROVIDER_ID = "default";

const AI_DEFAULTS: AiProvider = {
  id: DEFAULT_PROVIDER_ID,
  label: "Default",
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

/** On-disk shape. The flat AI keys are the pre-multi-provider layout: they are
 * still read (and migrated into `ai.providers` on the next save) so files
 * written before this STEP keep loading unchanged. */
type SettingsFile = Partial<Omit<AiProvider, "id" | "label">> & {
  ai?: { providers?: Partial<AiProvider>[]; activeId?: string };
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

function aiEnvDefaults(): AiProvider {
  const envMax = Number(process.env.DOCYFIER_LLM_MAX_TOKENS);
  return {
    id: DEFAULT_PROVIDER_ID,
    label: AI_DEFAULTS.label,
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

/** A readable name for a provider the user never labelled: its host. */
function labelFromUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return AI_DEFAULTS.label;
  }
}

function normalizeProvider(saved: Partial<AiProvider>, fallback: AiProvider): AiProvider {
  const id = saved.id?.trim() || randomUUID();
  const baseUrl = saved.baseUrl?.trim() || fallback.baseUrl;
  return {
    id,
    label: saved.label?.trim() || labelFromUrl(baseUrl),
    baseUrl,
    model: saved.model?.trim() ?? fallback.model,
    // Environment credentials only back the provider the environment describes;
    // every other entry carries its own key or none at all.
    apiKey: saved.apiKey || (id === DEFAULT_PROVIDER_ID ? fallback.apiKey : ""),
    maxOutputTokens:
      Number.isInteger(saved.maxOutputTokens) && (saved.maxOutputTokens as number) > 0
        ? (saved.maxOutputTokens as number)
        : fallback.maxOutputTokens,
    structuredOutput: saved.structuredOutput ?? fallback.structuredOutput,
  };
}

/**
 * Every configured provider plus the active one. API keys come back **as
 * stored** — encrypted for anything saved through the app. Decryption happens
 * only where a key is actually used, so a rotated secret breaks the AI call
 * with a clear message instead of every page that lists providers.
 */
async function readAiConfig(): Promise<AiConfig> {
  const fallback = aiEnvDefaults();
  const saved = await readSettingsFile();
  const stored = saved.ai?.providers;
  const providers =
    Array.isArray(stored) && stored.length > 0
      ? stored.map((provider) => normalizeProvider(provider, fallback))
      : // Pre-multi-provider file (or none at all): the flat keys are the one provider.
        [normalizeProvider({ ...saved, id: DEFAULT_PROVIDER_ID }, fallback)];

  const activeId = saved.ai?.activeId;
  return {
    providers,
    activeId: providers.some((p) => p.id === activeId) ? activeId! : providers[0].id,
  };
}

/**
 * Persist the whole AI section and drop the flat pre-multi-provider fields.
 * Keys arrive in stored form — already encrypted, except the clear ones a file
 * written before this STEP still holds, which get encrypted here.
 */
async function writeAiConfig(config: AiConfig): Promise<void> {
  const providers = await Promise.all(
    config.providers.map(async (provider) => ({
      ...provider,
      apiKey: isEncrypted(provider.apiKey)
        ? provider.apiKey
        : await encryptSecret(provider.apiKey),
    })),
  );
  await writeSettingsFile({
    ai: { providers, activeId: config.activeId },
    baseUrl: undefined,
    model: undefined,
    apiKey: undefined,
    maxOutputTokens: undefined,
    structuredOutput: undefined,
  });
}

/** The providers, for the switcher and the settings list. Never carries a key. */
export async function listAiProviders(): Promise<{
  providers: AiProviderSummary[];
  activeId: string;
}> {
  const { providers, activeId } = await readAiConfig();
  return { providers: providers.map(toSummary), activeId };
}

/** The provider AI calls run against, key in clear. Unchanged signature: every
 * AI call site still asks for "the settings" and gets one endpoint. */
export async function getAiSettings(): Promise<AiSettings> {
  const { providers, activeId } = await readAiConfig();
  const active = providers.find((p) => p.id === activeId) ?? providers[0];
  return { ...active, apiKey: await decryptSecret(active.apiKey) };
}

/** The stored key of one provider, in clear — for server-side connection tests
 * where the browser never held the key to begin with. */
export async function getAiProviderKey(id: string): Promise<string> {
  const { providers } = await readAiConfig();
  const provider = providers.find((p) => p.id === id);
  return provider ? decryptSecret(provider.apiKey) : "";
}

/** Create (empty id) or update a provider, whose `apiKey` is in clear. Returns
 * the saved provider, whose id the caller needs after a creation. */
export async function saveAiProvider(provider: AiProvider): Promise<AiProvider> {
  const config = await readAiConfig();
  const id = provider.id.trim() || randomUUID();
  const stored: AiProvider = { ...provider, id, apiKey: await encryptSecret(provider.apiKey) };
  const index = config.providers.findIndex((p) => p.id === id);
  if (index === -1) {
    config.providers.push(stored);
  } else {
    config.providers[index] = stored;
  }
  await writeAiConfig(config);
  return { ...provider, id };
}

/** Remove a provider. The last one stays: the app always needs an endpoint. */
export async function deleteAiProvider(id: string): Promise<void> {
  const config = await readAiConfig();
  if (config.providers.length <= 1) {
    throw new Error("At least one provider must remain configured.");
  }
  const providers = config.providers.filter((p) => p.id !== id);
  if (providers.length === config.providers.length) return;
  await writeAiConfig({
    providers,
    activeId: providers.some((p) => p.id === config.activeId)
      ? config.activeId
      : providers[0].id,
  });
}

export async function setActiveAiProvider(id: string): Promise<void> {
  const config = await readAiConfig();
  if (!config.providers.some((p) => p.id === id)) {
    throw new Error("Unknown provider.");
  }
  await writeAiConfig({ ...config, activeId: id });
}

/** The connection, password in clear. Same treatment as an LLM key: what sits
 * in the file is encrypted, what callers get is usable. */
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
  await writeSettingsFile({ storage: { ...storage, password } });
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

/** Everything an export needs, secret options decrypted. Which options are
 * secret is the target's business, not this module's: an encrypted value says
 * so itself through its prefix. */
export async function getExportSettings(): Promise<ExportSettings> {
  const saved = (await readSettingsFile()).exports ?? {};
  const targets = parseTargets(saved.targets);
  for (const id of exportEnvDefaults()) {
    targets[id] = { enabled: true, options: targets[id]?.options ?? {} };
  }
  for (const target of Object.values(targets)) {
    for (const [key, value] of Object.entries(target.options)) {
      if (isEncrypted(value)) target.options[key] = await decryptSecret(value);
    }
  }
  return {
    targets,
    publicBaseUrl:
      saved.publicBaseUrl?.trim() || (process.env.DOCYFIER_PUBLIC_URL ?? "").trim(),
  };
}

/** The same settings for the settings page: stored secrets are replaced by the
 * fact that they exist. */
export async function getExportSummary(): Promise<ExportSettingsSummary> {
  const saved = (await readSettingsFile()).exports ?? {};
  const stored = parseTargets(saved.targets);
  const { targets, publicBaseUrl } = await getExportSettings();

  const summary: Record<string, ExportTargetSummary> = {};
  for (const [id, target] of Object.entries(targets)) {
    const savedSecrets = Object.entries(stored[id]?.options ?? {})
      .filter(([, value]) => isEncrypted(value))
      .map(([key]) => key);
    summary[id] = {
      enabled: target.enabled,
      options: Object.fromEntries(
        Object.entries(target.options).map(([key, value]) => [
          key,
          savedSecrets.includes(key) ? "" : value,
        ]),
      ),
      savedSecrets,
    };
  }
  return { targets: summary, publicBaseUrl };
}

/**
 * Persist export settings. `secretOptions` names, per target, the options whose
 * value is a credential: those are encrypted, the rest stay readable — a
 * toggle or a page id gains nothing from being ciphertext. The caller passes
 * them from the target registry, which this module deliberately does not import.
 */
export async function saveExportSettings(
  exports: ExportSettings,
  secretOptions: Record<string, string[]> = {},
): Promise<void> {
  const targets: Record<string, ExportTargetSettings> = {};
  for (const [id, target] of Object.entries(exports.targets)) {
    const options: Record<string, string> = {};
    for (const [key, value] of Object.entries(target.options)) {
      options[key] =
        secretOptions[id]?.includes(key) && value && !isEncrypted(value)
          ? await encryptSecret(value)
          : value;
    }
    targets[id] = { enabled: target.enabled, options };
  }
  await writeSettingsFile({ exports: { targets, publicBaseUrl: exports.publicBaseUrl } });
}
