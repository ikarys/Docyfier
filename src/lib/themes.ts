import type { CSSProperties } from "react";
import {
  findFontPair,
  type ThemeDensity,
  type ThemeRadius,
  type ThemeTokens,
} from "@/domain/documents/theme";

/**
 * Themes, on the presentation side.
 *
 * The vocabulary and the rules belong to the document itself and live in
 * `src/domain/documents/theme.ts`; what is here is the one thing the domain
 * must not know — how resolved tokens become CSS. The re-exports keep a single
 * import path for the editor, the design panel and the layout, none of which
 * should care which side of the line a given symbol sits on.
 */

export {
  ACCENT_SWATCHES,
  DEFAULT_PRESET,
  FONT_PAIRS,
  THEMES,
  findFontPair,
  findPreset,
  normalizeTheme,
  presetSkin,
  resolveTokens,
} from "@/domain/documents/theme";

export type {
  DocumentTheme,
  FontPair,
  Theme,
  ThemeDensity,
  ThemeRadius,
  ThemeTokens,
} from "@/domain/documents/theme";

const RADIUS_PX: Record<ThemeRadius, string> = {
  sharp: "2px",
  soft: "10px",
  round: "18px",
};

/** Multiplier applied to the document's vertical rhythm and sheet padding. */
const DENSITY_SCALE: Record<ThemeDensity, string> = {
  compact: "0.78",
  normal: "1",
  airy: "1.28",
};

/** The resolved tokens as the CSS custom properties `globals.css` consumes. */
export function tokenStyle(tokens: ThemeTokens): CSSProperties {
  const pair = findFontPair(tokens.fontPair);
  return {
    "--doc-accent": tokens.accent,
    "--doc-font-heading": pair.heading,
    "--doc-font-body": pair.body,
    "--doc-radius": RADIUS_PX[tokens.radius],
    "--doc-space": DENSITY_SCALE[tokens.density],
  } as CSSProperties;
}
