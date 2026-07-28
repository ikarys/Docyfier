import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The JSON file every configuration adapter reads and writes.
 *
 * It is file-backed even when documents live in a database: the connection
 * settings cannot be read from the database they configure. One section per
 * scope, and a write merges — saving providers has to leave `storage` intact.
 */

export interface SettingsSections {
  ai?: { providers?: unknown; activeId?: unknown };
  storage?: Record<string, unknown>;
  exports?: Record<string, unknown>;
  /** The pre-multi-provider layout: one endpoint, flat at the root. Still read
   * so a file written before that STEP keeps loading. */
  baseUrl?: unknown;
  model?: unknown;
  apiKey?: unknown;
  maxOutputTokens?: unknown;
  structuredOutput?: unknown;
}

function settingsPath(): string {
  const dir =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(dir), "settings.json");
}

/** The stored sections, or none at all when nothing was ever configured. */
export async function readSettings(): Promise<SettingsSections> {
  try {
    return JSON.parse(await readFile(settingsPath(), "utf8")) as SettingsSections;
  } catch {
    return {};
  }
}

/** Merge one scope's section into the file, leaving the others untouched. */
export async function patchSettings(patch: SettingsSections): Promise<void> {
  const file = settingsPath();
  const merged = { ...(await readSettings()), ...patch };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(merged, null, 2), "utf8");
}
