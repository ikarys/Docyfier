"use server";

import { revalidatePath } from "next/cache";
import {
  getAiSettings,
  getStorageSettings,
  saveAiSettings,
  saveStorageSettings,
} from "@/lib/settings";
import {
  DEFAULT_PORTS,
  isStorageDriver,
  type StorageSettings,
} from "@/lib/settings-types";
import { closeStore, probeStore } from "@/lib/store/driver";
import { importDocumentsFromFiles } from "@/lib/store";
import {
  listModels,
  pingChatCompletion,
  clearDetectedModels,
  ModelsEndpointError,
  type ModelInfo,
} from "@/lib/ai/provider";

export type SaveSettingsState = { saved: boolean; error?: string } | null;

export type ListModelsResult =
  | { ok: true; models: ModelInfo[] }
  | { ok: false; error: string; status?: number };

export async function saveAiSettingsAction(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  if (!baseUrl) return { saved: false, error: "Base URL is required." };
  try {
    new URL(baseUrl);
  } catch {
    return { saved: false, error: "Base URL is not a valid URL." };
  }

  const maxOutputTokens = Number(formData.get("maxOutputTokens"));
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256) {
    return {
      saved: false,
      error: "Max output tokens must be an integer ≥ 256.",
    };
  }

  await saveAiSettings({
    baseUrl,
    model: String(formData.get("model") ?? "").trim(),
    apiKey: String(formData.get("apiKey") ?? "").trim(),
    maxOutputTokens,
    structuredOutput: formData.get("structuredOutput") === "on",
  });
  clearDetectedModels();
  revalidatePath("/settings");
  return { saved: true };
}

/** Probe an OpenAI-compatible server and list its models ("test connection"). */
export async function listModelsAction(
  baseUrl: string,
  apiKey: string,
): Promise<ListModelsResult> {
  try {
    return { ok: true, models: await listModels(baseUrl.trim(), apiKey.trim()) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
      status: err instanceof ModelsEndpointError ? err.status : undefined,
    };
  }
}

export type TestChatResult = { ok: true } | { ok: false; error: string };

/** Validate a server + model via a minimal chat completion ("test connection"
 * for servers without a /models endpoint). */
export async function testChatAction(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<TestChatResult> {
  if (!model.trim()) {
    return { ok: false, error: "Enter a model id to test." };
  }
  try {
    await pingChatCompletion(baseUrl.trim(), apiKey.trim(), model.trim());
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Chat test failed",
    };
  }
}

export async function currentAiSettings() {
  return getAiSettings();
}

/* --- Document storage ---------------------------------------------------- */

export type SaveStorageState = { saved: boolean; error?: string } | null;

export type TestStorageResult =
  | { ok: true; documents: number }
  | { ok: false; error: string };

export type ImportDocumentsResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

/** Validate an untrusted storage config (form or client action argument). */
function parseStorage(
  raw: Partial<StorageSettings>,
): { settings: StorageSettings } | { error: string } {
  const driver = isStorageDriver(raw.driver) ? raw.driver : null;
  if (!driver) return { error: "Unknown storage driver." };

  if (driver === "files") {
    return {
      settings: {
        driver,
        host: "",
        port: 0,
        user: "",
        password: "",
        database: "",
        ssl: false,
      },
    };
  }

  const host = String(raw.host ?? "").trim();
  if (!host) return { error: "Host is required." };
  const port = Number(raw.port ?? DEFAULT_PORTS[driver]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: "Port must be an integer between 1 and 65535." };
  }
  const user = String(raw.user ?? "").trim();
  if (!user) return { error: "User is required." };
  const database = String(raw.database ?? "").trim();
  if (!database) return { error: "Database name is required." };

  return {
    settings: {
      driver,
      host,
      port,
      user,
      password: String(raw.password ?? ""),
      database,
      ssl: Boolean(raw.ssl),
    },
  };
}

function storageFromForm(formData: FormData): Partial<StorageSettings> {
  return {
    driver: formData.get("driver") as StorageSettings["driver"],
    host: String(formData.get("host") ?? ""),
    port: Number(formData.get("port")),
    user: String(formData.get("user") ?? ""),
    password: String(formData.get("password") ?? ""),
    database: String(formData.get("database") ?? ""),
    ssl: formData.get("ssl") === "on",
  };
}

function connectionError(err: unknown): string {
  return err instanceof Error ? err.message : "Connection failed";
}

/** Connect, create the schema if missing, and report how many documents the
 * backend already holds ("test connection"). */
export async function testStorageAction(
  raw: Partial<StorageSettings>,
): Promise<TestStorageResult> {
  const parsed = parseStorage(raw);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    return { ok: true, documents: await probeStore(parsed.settings) };
  } catch (err) {
    return { ok: false, error: connectionError(err) };
  }
}

/** Save the storage config. A database that cannot be reached is refused
 * rather than saved: a typo here would otherwise take the whole app down on the
 * next page load. */
export async function saveStorageSettingsAction(
  _prev: SaveStorageState,
  formData: FormData,
): Promise<SaveStorageState> {
  const parsed = parseStorage(storageFromForm(formData));
  if ("error" in parsed) return { saved: false, error: parsed.error };

  if (parsed.settings.driver !== "files") {
    try {
      await probeStore(parsed.settings);
    } catch (err) {
      return { saved: false, error: connectionError(err) };
    }
  }

  await saveStorageSettings(parsed.settings);
  await closeStore();
  revalidatePath("/");
  revalidatePath("/settings");
  return { saved: true };
}

/** Copy the file-backed documents into the configured database. */
export async function importDocumentsAction(): Promise<ImportDocumentsResult> {
  try {
    const { imported, skipped } = await importDocumentsFromFiles();
    revalidatePath("/");
    return { ok: true, imported, skipped };
  } catch (err) {
    return { ok: false, error: connectionError(err) };
  }
}

export async function currentStorageSettings() {
  return getStorageSettings();
}
