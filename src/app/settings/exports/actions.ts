"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getExportSettings, getExportSummary, saveExportSettings } from "@/lib/settings";
import type { ExportTargetSettings } from "@/lib/settings-types";
import { EXPORT_TARGETS } from "@/lib/export/registry";

export type SaveExportsState = { saved: boolean; error?: string } | null;

/**
 * Read the form against the registry rather than against the submitted keys:
 * only declared targets and declared options are stored, so a hand-crafted
 * POST cannot grow the settings file with fields nothing reads.
 */
export async function saveExportSettingsAction(
  _prev: SaveExportsState,
  formData: FormData,
): Promise<SaveExportsState> {
  await requireAuth();

  const publicBaseUrl = String(formData.get("publicBaseUrl") ?? "").trim();
  if (publicBaseUrl) {
    try {
      new URL(publicBaseUrl);
    } catch {
      return { saved: false, error: "Public URL is not a valid URL." };
    }
  }

  // Secrets never reach the browser, so an empty field means "unchanged".
  const previous = await getExportSettings();

  const targets: Record<string, ExportTargetSettings> = {};
  const secretOptions: Record<string, string[]> = {};
  for (const target of EXPORT_TARGETS) {
    const options: Record<string, string> = {};
    for (const option of target.options ?? []) {
      const field = `${target.id}.${option.id}`;
      if (option.type === "toggle") {
        options[option.id] = formData.get(field) === "on" ? "on" : "off";
        continue;
      }
      if (option.type === "secret") {
        (secretOptions[target.id] ??= []).push(option.id);
        const typed = String(formData.get(field) ?? "").trim();
        const cleared = formData.get(`${field}.cleared`) === "1";
        options[option.id] = typed || (cleared ? "" : (previous.targets[target.id]?.options[option.id] ?? ""));
        continue;
      }
      options[option.id] = String(formData.get(field) ?? option.default);
    }
    targets[target.id] = {
      enabled: formData.get(`${target.id}.enabled`) === "on",
      options,
    };
  }

  await saveExportSettings({ targets, publicBaseUrl }, secretOptions);
  revalidatePath("/settings/exports");
  return { saved: true };
}

export async function currentExportSettings() {
  await requireAuth();
  return getExportSummary();
}
