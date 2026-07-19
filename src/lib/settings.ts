import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AiSettings } from "./settings-types";

/**
 * App settings, file-backed like the document store (stands in for the future
 * database). Resolution order for each value: settings file > env > default.
 */

export type { AiSettings };

const DEFAULTS: AiSettings = {
  baseUrl: "http://localhost:1234/v1",
  model: "",
  apiKey: "",
};

function settingsFile(): string {
  const dir =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(dir), "settings.json");
}

function envDefaults(): AiSettings {
  return {
    baseUrl: process.env.DOCYFIER_LLM_BASE_URL ?? DEFAULTS.baseUrl,
    model: process.env.DOCYFIER_LLM_MODEL ?? DEFAULTS.model,
    apiKey: process.env.DOCYFIER_LLM_API_KEY ?? DEFAULTS.apiKey,
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const fallback = envDefaults();
  try {
    const raw = await readFile(settingsFile(), "utf8");
    const saved = JSON.parse(raw) as Partial<AiSettings>;
    return {
      baseUrl: saved.baseUrl?.trim() || fallback.baseUrl,
      model: saved.model?.trim() ?? fallback.model,
      apiKey: saved.apiKey ?? fallback.apiKey,
    };
  } catch {
    return fallback;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  const file = settingsFile();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(settings, null, 2), "utf8");
}
