"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getExportSettings, saveExportSettings } from "@/lib/settings";
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

  const targets: Record<string, ExportTargetSettings> = {};
  for (const target of EXPORT_TARGETS) {
    const options: Record<string, string> = {};
    for (const option of target.options ?? []) {
      const field = `${target.id}.${option.id}`;
      options[option.id] =
        option.type === "toggle"
          ? formData.get(field) === "on"
            ? "on"
            : "off"
          : String(formData.get(field) ?? option.default);
    }
    targets[target.id] = {
      enabled: formData.get(`${target.id}.enabled`) === "on",
      options,
    };
  }

  await saveExportSettings({ targets, publicBaseUrl });
  revalidatePath("/settings/exports");
  return { saved: true };
}

export async function currentExportSettings() {
  await requireAuth();
  return getExportSettings();
}
