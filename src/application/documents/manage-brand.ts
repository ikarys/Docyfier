import type { Brand, BrandRecord, SavePresetInput } from "@/domain/documents/brand";
import type { DocumentTheme, Theme } from "@/domain/documents/theme";
import type { BrandDeps } from "./deps";

/**
 * Configuring the instance's visual identity (PLAN.md STEP 9).
 *
 * Each command is the same three steps — load, ask the brand for the next
 * state, store it — because every rule about what a brand accepts belongs to
 * the entity. What is left here is the order, and handing back plain data:
 * what crosses into a page is a record, never an entity.
 */

export async function brandRecord(deps: BrandDeps): Promise<BrandRecord> {
  return (await deps.brand.load()).toRecord();
}

/** The saved presets, for whoever has to resolve a document's theme. */
export async function savedPresets(deps: BrandDeps): Promise<Theme[]> {
  return [...(await deps.brand.load()).presets];
}

/** The dress a document created right now wears. */
export async function themeForNewDocument(deps: BrandDeps): Promise<DocumentTheme> {
  return (await deps.brand.load()).themeForNewDocument();
}

async function change(
  deps: BrandDeps,
  next: (brand: Brand) => Brand,
): Promise<BrandRecord> {
  const brand = next(await deps.brand.load());
  await deps.brand.save(brand);
  return brand.toRecord();
}

/** Set the dress new documents start in; `null` hands it back to the built-in
 * default. */
export function setBrandTheme(
  deps: BrandDeps,
  theme: unknown | null,
): Promise<BrandRecord> {
  return change(deps, (brand) =>
    theme === null ? brand.withoutDefaultTheme() : brand.withDefaultTheme(theme),
  );
}

/** Add a preset, or replace the one the id names. */
export function saveBrandPreset(
  deps: BrandDeps,
  input: SavePresetInput,
): Promise<BrandRecord> {
  return change(deps, (brand) => brand.savePreset(input));
}

export function removeBrandPreset(deps: BrandDeps, id: string): Promise<BrandRecord> {
  return change(deps, (brand) => brand.removePreset(id));
}
