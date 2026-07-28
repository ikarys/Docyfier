"use server";

import { revalidatePath } from "next/cache";
import { InvalidBrandPreset, type BrandRecord } from "@/domain/documents/brand";
import type { DocumentTheme, ThemeTokens } from "@/domain/documents/theme";
import { requireAuth } from "@/lib/auth";
import {
  deleteBrandPreset,
  saveBrandPreset,
  saveBrandTheme,
  saveStyleParameters,
  type StyleParametersRecord,
} from "@/lib/settings";

/** The Style scope: the instance's visual identity and how it writes. */

export type BrandState = { brand: BrandRecord } | { error: string };

/** Set the theme new documents start in; `null` hands it back to the built-in
 * default. The theme is repaired by the entity, so nothing here validates. */
export async function saveBrandThemeAction(
  theme: DocumentTheme | null,
): Promise<BrandRecord> {
  await requireAuth();
  const brand = await saveBrandTheme(theme);
  revalidatePath("/settings/style");
  return brand;
}

export async function saveBrandPresetAction(input: {
  id?: string;
  label: string;
  base: string;
  tokens: ThemeTokens;
}): Promise<BrandState> {
  await requireAuth();
  try {
    const brand = await saveBrandPreset(input);
    revalidatePath("/settings/style");
    return { brand };
  } catch (err) {
    if (err instanceof InvalidBrandPreset) return { error: err.message };
    throw err;
  }
}

export async function deleteBrandPresetAction(id: string): Promise<BrandRecord> {
  await requireAuth();
  const brand = await deleteBrandPreset(id);
  revalidatePath("/settings/style");
  return brand;
}

export type WritingStyleState = { saved: boolean } | null;

export async function saveWritingStyleAction(
  _prev: WritingStyleState,
  formData: FormData,
): Promise<WritingStyleState> {
  await requireAuth();
  const input: StyleParametersRecord = {
    emoji: formData.get("emoji") === "on",
    autoBold: formData.get("autoBold") === "on",
    statusBadges: formData.get("statusBadges") === "on",
    language: String(formData.get("language") ?? ""),
  };
  await saveStyleParameters(input);
  revalidatePath("/settings/style");
  return { saved: true };
}
