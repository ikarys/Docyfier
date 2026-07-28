/**
 * Document themes (PLAN.md STEP 2b, tokenized in STEP U3).
 *
 * A theme is presentation only: it never touches document content. A theme is a
 * **preset** (a full token set) plus optional per-document **overrides**, so the
 * four presets are starting points rather than fixed skins.
 *
 * The vocabulary and the rules live here because a document *has* a theme —
 * it is part of what the entity guarantees. Turning resolved tokens into CSS is
 * not: that is `src/lib/themes.ts`, on the presentation side.
 */

export type ThemeRadius = "sharp" | "soft" | "round";
export type ThemeDensity = "compact" | "normal" | "airy";

export interface ThemeTokens {
  /** Document accent, `#rrggbb`. Everything else derives from it. */
  accent: string;
  /** Id of a pair in FONT_PAIRS. */
  fontPair: string;
  radius: ThemeRadius;
  density: ThemeDensity;
}

/** What a document stores: a preset id plus the tokens the user changed. */
export interface DocumentTheme {
  preset: string;
  overrides?: Partial<ThemeTokens>;
}

export interface Theme {
  id: string;
  label: string;
  /** One-line description shown in the picker. */
  hint: string;
  tokens: ThemeTokens;
}

export interface FontPair {
  id: string;
  label: string;
  /** CSS font-family values — the variables declared in `app/layout.tsx`. */
  heading: string;
  body: string;
}

const SANS_FALLBACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF_FALLBACK =
  '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

/** Curated heading + body pairs. Loaded once in `layout.tsx` via `next/font`. */
export const FONT_PAIRS: readonly FontPair[] = [
  {
    id: "sans",
    label: "Modern sans",
    heading: `var(--font-inter), ${SANS_FALLBACK}`,
    body: `var(--font-inter), ${SANS_FALLBACK}`,
  },
  {
    id: "grotesk",
    label: "Grotesk",
    heading: `var(--font-space-grotesk), ${SANS_FALLBACK}`,
    body: `var(--font-inter), ${SANS_FALLBACK}`,
  },
  {
    id: "humanist",
    label: "Humanist",
    heading: `var(--font-source-sans), ${SANS_FALLBACK}`,
    body: `var(--font-source-serif), ${SERIF_FALLBACK}`,
  },
  {
    id: "editorial",
    label: "Editorial",
    heading: `var(--font-playfair), ${SERIF_FALLBACK}`,
    body: `var(--font-source-serif), ${SERIF_FALLBACK}`,
  },
  {
    id: "serif",
    label: "Classic serif",
    heading: `var(--font-lora), ${SERIF_FALLBACK}`,
    body: `var(--font-source-serif), ${SERIF_FALLBACK}`,
  },
  {
    id: "expressive",
    label: "Expressive",
    heading: `var(--font-fraunces), ${SERIF_FALLBACK}`,
    body: `var(--font-inter), ${SANS_FALLBACK}`,
  },
] as const;

export const THEMES: readonly Theme[] = [
  {
    id: "editorial",
    label: "Editorial",
    hint: "Neutral, print-first — the classic document look.",
    tokens: {
      accent: "#3b5bdb",
      fontPair: "humanist",
      radius: "soft",
      density: "normal",
    },
  },
  {
    id: "corporate",
    label: "Corporate",
    hint: "Confident blue, structured, business-ready.",
    tokens: {
      accent: "#2563eb",
      fontPair: "sans",
      radius: "soft",
      density: "normal",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Monochrome, airy, understated.",
    tokens: {
      accent: "#111827",
      fontPair: "grotesk",
      radius: "sharp",
      density: "airy",
    },
  },
  {
    id: "vivid",
    label: "Vivid",
    hint: "Colorful and rounded — for a web-native feel.",
    tokens: {
      accent: "#7c3aed",
      fontPair: "expressive",
      radius: "round",
      density: "normal",
    },
  },
] as const;

export const DEFAULT_PRESET = "editorial";

/** A few accent choices that read well on paper, offered next to the picker. */
export const ACCENT_SWATCHES: readonly string[] = [
  "#3b5bdb",
  "#2563eb",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#111827",
];

export function findPreset(id: unknown): Theme {
  return (
    THEMES.find((t) => t.id === id) ??
    THEMES.find((t) => t.id === DEFAULT_PRESET)!
  );
}

export function findFontPair(id: unknown): FontPair {
  return FONT_PAIRS.find((p) => p.id === id) ?? FONT_PAIRS[0];
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Keep only the overrides that are valid tokens; drop anything else. */
function sanitizeOverrides(value: unknown): Partial<ThemeTokens> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  const out: Partial<ThemeTokens> = {};
  if (typeof raw.accent === "string" && HEX.test(raw.accent)) out.accent = raw.accent;
  if (FONT_PAIRS.some((p) => p.id === raw.fontPair)) out.fontPair = raw.fontPair as string;
  if (raw.radius === "sharp" || raw.radius === "soft" || raw.radius === "round") {
    out.radius = raw.radius;
  }
  if (raw.density === "compact" || raw.density === "normal" || raw.density === "airy") {
    out.density = raw.density;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Coerce anything found on disk into a usable theme. Accepts the legacy string
 * form written before U3 (`"corporate"` → `{ preset: "corporate" }`); unknown
 * presets and garbage overrides silently fall back to the defaults.
 */
export function normalizeTheme(theme: unknown): DocumentTheme {
  if (typeof theme === "string") return { preset: findPreset(theme).id };
  if (typeof theme === "object" && theme !== null) {
    const raw = theme as Record<string, unknown>;
    const overrides = sanitizeOverrides(raw.overrides);
    return overrides
      ? { preset: findPreset(raw.preset).id, overrides }
      : { preset: findPreset(raw.preset).id };
  }
  return { preset: DEFAULT_PRESET };
}

/** Preset tokens with the document's overrides applied on top. */
export function resolveTokens(theme: DocumentTheme): ThemeTokens {
  return { ...findPreset(theme.preset).tokens, ...(theme.overrides ?? {}) };
}
