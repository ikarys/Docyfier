import type { ArtDirection } from "@/domain/authoring/art-direction";
import { normalizeTheme, type DocumentTheme } from "@/domain/documents/theme";

/**
 * The seam between what the model proposed and what a document wears.
 *
 * `authoring` names a dress in its own words and `documents` owns themes; this
 * is where one becomes the other, in the layer whose job is to orchestrate both
 * contexts. `normalizeTheme` stays the single gate: a preset or an override the
 * app does not have falls back exactly as one read off disk would.
 */
export function themeFromArt(art: ArtDirection | null): DocumentTheme | null {
  if (!art) return null;
  const { preset, ...overrides } = art;
  return normalizeTheme({ preset, overrides });
}
