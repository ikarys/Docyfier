/**
 * Document themes (PLAN.md STEP 2b).
 *
 * A theme is presentation only: it never touches document content. Switching
 * theme just swaps the CSS token layer applied to the document (see the
 * `[data-theme="…"]` blocks in globals.css), so the same ProseMirror JSON can
 * render — and print — under any theme with zero content change.
 *
 * Client-safe: imported by both the editor (client) and the store (server).
 */

export interface Theme {
  id: string;
  label: string;
  /** One-line description shown in the picker. */
  hint: string;
}

export const THEMES: readonly Theme[] = [
  {
    id: "editorial",
    label: "Editorial",
    hint: "Neutral, print-first — the classic document look.",
  },
  {
    id: "corporate",
    label: "Corporate",
    hint: "Confident blue, structured, business-ready.",
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Monochrome, airy, understated.",
  },
  {
    id: "vivid",
    label: "Vivid",
    hint: "Colorful and rounded — for a web-native feel.",
  },
] as const;

export const DEFAULT_THEME = "editorial";

/** Return `theme` if it is a known theme id, else the default. */
export function normalizeTheme(theme: unknown): string {
  return typeof theme === "string" && THEMES.some((t) => t.id === theme)
    ? theme
    : DEFAULT_THEME;
}
