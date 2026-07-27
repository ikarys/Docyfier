"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  getStorageSummary,
  saveStorageSettings,
  testStorageConnection,
  type ConnectionFormInput,
} from "@/lib/settings";
import { closeStore } from "@/lib/store/driver";
import { importDocumentsFromFiles } from "@/lib/store";

export type SaveStorageState = { saved: boolean; error?: string } | null;

export type TestStorageResult =
  | { ok: true; documents: number }
  | { ok: false; error: string };

export type ImportDocumentsResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

/** What went wrong, in the wording the user reads. Domain errors and connection
 * failures both arrive as messages; neither carries UI copy of its own. */
function failure(err: unknown): string {
  return err instanceof Error ? err.message : "Connection failed";
}

/**
 * The connection a form describes. An untouched password field sends nothing,
 * so the stored one is kept; an explicit clear sends an empty string.
 */
function connectionFromForm(formData: FormData): ConnectionFormInput {
  const typed = String(formData.get("password") ?? "");
  const cleared = formData.get("passwordCleared") === "1";
  return {
    driver: formData.get("driver"),
    host: String(formData.get("host") ?? ""),
    port: Number(formData.get("port")),
    user: String(formData.get("user") ?? ""),
    password: typed || (cleared ? "" : undefined),
    database: String(formData.get("database") ?? ""),
    ssl: formData.get("ssl") === "on",
  };
}

/** Connect, create the schema if missing, and report how many documents the
 * backend already holds ("test connection"). */
export async function testStorageAction(
  input: ConnectionFormInput,
  passwordCleared = false,
): Promise<TestStorageResult> {
  await requireAuth();
  const password = String(input.password ?? "");
  try {
    const documents = await testStorageConnection({
      ...input,
      password: password || (passwordCleared ? "" : undefined),
    });
    return { ok: true, documents };
  } catch (err) {
    return { ok: false, error: failure(err) };
  }
}

/** Save the storage config. A database that cannot be reached is refused rather
 * than saved: a typo here would otherwise take the whole app down on the next
 * page load. */
export async function saveStorageSettingsAction(
  _prev: SaveStorageState,
  formData: FormData,
): Promise<SaveStorageState> {
  await requireAuth();
  try {
    await saveStorageSettings(connectionFromForm(formData));
  } catch (err) {
    return { saved: false, error: failure(err) };
  }
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
    return { ok: false, error: failure(err) };
  }
}

export async function currentStorageSettings() {
  await requireAuth();
  return getStorageSummary();
}
