import "server-only";
import type { BrandDeps } from "@/application/documents/deps";
import {
  brandRecord,
  removeBrandPreset as dropPreset,
  saveBrandPreset as persistPreset,
  savedPresets,
  setBrandTheme,
  themeForNewDocument,
} from "@/application/documents/manage-brand";
import type { BrandRecord, SavePresetInput } from "@/domain/documents/brand";
import type { DocumentTheme, Theme } from "@/domain/documents/theme";
import { FileBrandRepository } from "@/infrastructure/configuration/file-brand-repository";

/**
 * Composition root for the instance's visual identity. The use cases take the
 * repository as an argument; this is the one module that decides it is the
 * settings file.
 */

export type { BrandRecord };

function deps(): BrandDeps {
  return { brand: new FileBrandRepository() };
}

export async function getBrand(): Promise<BrandRecord> {
  return brandRecord(deps());
}

/** The saved presets, handed to the editor so a document pointing at one
 * resolves it. Plain data: it crosses into a client component. */
export async function getBrandPresets(): Promise<Theme[]> {
  return savedPresets(deps());
}

/** The theme a document created right now starts in. */
export async function getBrandTheme(): Promise<DocumentTheme> {
  return themeForNewDocument(deps());
}

export async function saveBrandTheme(theme: unknown | null): Promise<BrandRecord> {
  return setBrandTheme(deps(), theme);
}

export async function saveBrandPreset(input: SavePresetInput): Promise<BrandRecord> {
  return persistPreset(deps(), input);
}

export async function deleteBrandPreset(id: string): Promise<BrandRecord> {
  return dropPreset(deps(), id);
}
