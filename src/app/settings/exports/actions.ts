"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getExportSummary, saveExportSettings } from "@/lib/settings";
import { InvalidPublicUrl } from "@/domain/publishing/export-configuration";
import type {
  ExportSettings,
  ExportTargetSettings,
} from "@/domain/publishing/export-configuration";
import { EXPORT_TARGETS, secretOptionIds } from "@/lib/export/registry";

export type SaveExportsState = { saved: boolean; error?: string } | null;

/**
 * Read the form against the registry rather than against the submitted keys:
 * only declared targets and declared options are stored, so a hand-crafted POST
 * cannot grow the settings file with fields nothing reads.
 *
 * A credential field left untouched submits nothing at all — that is how the
 * stored one survives; only an explicit clear sends an empty string.
 */
function settingsFromForm(formData: FormData): ExportSettings {
  const targets: Record<string, ExportTargetSettings> = {};
  for (const target of EXPORT_TARGETS) {
    const options: Record<string, string> = {};
    for (const option of target.options ?? []) {
      const field = `${target.id}.${option.id}`;
      if (option.type === "toggle") {
        options[option.id] = formData.get(field) === "on" ? "on" : "off";
        continue;
      }
      if (option.type === "secret") {
        const typed = String(formData.get(field) ?? "").trim();
        const cleared = formData.get(`${field}.cleared`) === "1";
        if (typed || cleared) options[option.id] = typed;
        continue;
      }
      options[option.id] = String(formData.get(field) ?? option.default);
    }
    targets[target.id] = {
      enabled: formData.get(`${target.id}.enabled`) === "on",
      options,
    };
  }
  return {
    targets,
    publicBaseUrl: String(formData.get("publicBaseUrl") ?? ""),
  };
}

export async function saveExportSettingsAction(
  _prev: SaveExportsState,
  formData: FormData,
): Promise<SaveExportsState> {
  await requireAuth();
  try {
    await saveExportSettings(settingsFromForm(formData), secretOptionIds());
  } catch (err) {
    if (err instanceof InvalidPublicUrl) return { saved: false, error: err.message };
    throw err;
  }
  revalidatePath("/settings/exports");
  return { saved: true };
}

export async function currentExportSettings() {
  await requireAuth();
  return getExportSummary(secretOptionIds());
}
