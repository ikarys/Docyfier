import type { ArtVocabulary } from "@/domain/authoring/art-direction";
import {
  FONT_PAIRS,
  THEMES,
  THEME_DENSITIES,
  THEME_RADII,
} from "@/domain/documents/theme";

/**
 * The words the authoring context may use to dress a document.
 *
 * The `documents` context owns themes; `authoring` only proposes one. This is
 * the seam between them: the real presets and font pairs, handed over as plain
 * choices, so neither context imports the other and the list of legal values
 * has exactly one home.
 */
export function artVocabulary(): ArtVocabulary {
  return {
    presets: THEMES.map((theme) => ({ id: theme.id, hint: theme.hint })),
    fontPairs: FONT_PAIRS.map((pair) => ({ id: pair.id, hint: pair.label })),
    radii: THEME_RADII,
    densities: THEME_DENSITIES,
  };
}
