"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getStorageSettings, saveStorageSettings } from "@/lib/settings";
import {
  DEFAULT_PORTS,
  isStorageDriver,
  type StorageSettings,
} from "@/lib/settings-types";
import { closeStore, probeStore } from "@/lib/store/driver";
import { importDocumentsFromFiles } from "@/lib/store";

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
  await requireAuth();
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
  await requireAuth();
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
  revalidatePath("/settings/storage");
  return { saved: true };
}

/** Copy the file-backed documents into the configured database. */
export async function importDocumentsAction(): Promise<ImportDocumentsResult> {
  await requireAuth();
  try {
    const { imported, skipped } = await importDocumentsFromFiles();
    revalidatePath("/");
    return { ok: true, imported, skipped };
  } catch (err) {
    return { ok: false, error: connectionError(err) };
  }
}

export async function currentStorageSettings() {
  await requireAuth();
  return getStorageSettings();
}
