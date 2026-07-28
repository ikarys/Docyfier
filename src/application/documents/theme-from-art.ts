import type { ArtDirection } from "@/domain/authoring/art-direction";
import { findPreset, normalizeTheme, type DocumentTheme } from "@/domain/documents/theme";

/**
 * The seam between what the model proposed and what a document wears.
 *
 * `authoring` names a dress in its own words and `documents` owns themes; this
 * is where one becomes the other, in the layer whose job is to orchestrate both
 * contexts. An override the app has no value for falls back exactly as one read
 * off disk would, and the preset is resolved against the built-ins the model was
 * offered: unlike a stored theme, a name here is a proposal, so one the
 * vocabulary never contained is an invention rather than a saved preset.
 */
export function themeFromArt(art: ArtDirection | null): DocumentTheme | null {
  if (!art) return null;
  const { preset, ...overrides } = art;
  return normalizeTheme({ preset: findPreset(preset).id, overrides });
}
