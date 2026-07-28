import {
  DEFAULT_PRESET,
  THEMES,
  findPreset,
  isPresetId,
  normalizeTheme,
  themeTokens,
  type DocumentTheme,
  type Theme,
  type ThemeTokens,
} from "./theme";

/**
 * The instance's visual identity (PLAN.md STEP 9) — the dress every new
 * document starts in, and the presets this instance saved for itself.
 *
 * A saved preset is referenced by id, never copied into the documents that use
 * it: changing the house accent is meant to repaint the documents already
 * written in it, which is the whole point of a corporate identity. What that
 * costs is a preset that outlives its documents, so resolution falls back
 * rather than failing — see `findPreset`.
 *
 * Instances are immutable: every change returns a new brand.
 */

/** Rejected input, when a user is saving a preset and can be told why. */
export class InvalidBrandPreset extends Error {
  constructor(
    readonly field: "label" | "count",
    message: string,
  ) {
    super(message);
    this.name = "InvalidBrandPreset";
  }
}

/** As many as a picker shows without becoming a list to scroll. */
const MAX_PRESETS = 12;
const MAX_LABEL = 40;
const SAVED_HINT = "Saved on this instance.";

/** The persisted shape — what a brand repository reads and writes. */
export interface BrandPresetRecord {
  id: string;
  label: string;
  /** The built-in preset this one borrows its untokenized look from. */
  base: string;
  tokens: ThemeTokens;
}

export interface BrandRecord {
  /** Null while new documents follow the built-in default. */
  defaultTheme: DocumentTheme | null;
  presets: BrandPresetRecord[];
}

export interface SavePresetInput {
  /** Set to update a preset; absent creates one. */
  id?: string;
  label: string;
  base?: string;
  tokens: unknown;
}

function requireLabel(value: string): string {
  const label = value.trim();
  if (!label || label.length > MAX_LABEL) {
    throw new InvalidBrandPreset(
      "label",
      `A preset needs a name of 1 to ${MAX_LABEL} characters.`,
    );
  }
  return label;
}

/** An id from a label. A label written in a script with no ASCII letters still
 * has to yield an id, so it lands on a generic one and the suffix separates. */
function slugOf(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
  return isPresetId(slug) ? slug : "preset";
}

function freeId(wanted: string, taken: readonly string[]): string {
  const used = new Set([...THEMES.map((theme) => theme.id), ...taken]);
  if (!used.has(wanted)) return wanted;
  let n = 2;
  while (used.has(`${wanted}-${n}`)) n++;
  return `${wanted}-${n}`;
}

/** The built-in whose look a saved preset borrows. */
function baseOf(value: unknown): string {
  return THEMES.some((theme) => theme.id === value) ? (value as string) : DEFAULT_PRESET;
}

function presetOf(id: string, label: string, base: string, tokens: unknown): Theme {
  return {
    id,
    label,
    hint: SAVED_HINT,
    skin: base,
    tokens: themeTokens(tokens, findPreset(base).tokens),
  };
}

/** One stored preset, or nothing when what was stored cannot be one. */
function readPreset(raw: unknown, taken: readonly string[]): Theme | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Partial<BrandPresetRecord>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!label || !isPresetId(record.id) || taken.includes(record.id)) return null;
  return presetOf(record.id, label.slice(0, MAX_LABEL), baseOf(record.base), record.tokens);
}

export class Brand {
  private constructor(
    /** The theme new documents start in, or null for the built-in default. */
    readonly defaultTheme: DocumentTheme | null,
    /** Ready to hand to `findPreset` / `resolveTokens` alongside the built-ins. */
    readonly presets: readonly Theme[],
  ) {}

  static empty(): Brand {
    return new Brand(null, []);
  }

  /** A brand as it was stored. Anything unusable is dropped, never thrown: the
   * settings page has to open even when the file was edited by hand. */
  static restore(raw: unknown): Brand {
    const record = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<BrandRecord>;
    const presets: Theme[] = [];
    for (const entry of Array.isArray(record.presets) ? record.presets : []) {
      if (presets.length === MAX_PRESETS) break;
      const preset = readPreset(
        entry,
        presets.map((saved) => saved.id),
      );
      if (preset) presets.push(preset);
    }
    const defaultTheme =
      record.defaultTheme === null || record.defaultTheme === undefined
        ? null
        : normalizeTheme(record.defaultTheme);
    return new Brand(defaultTheme, presets);
  }

  /** What a document created right now wears. */
  themeForNewDocument(): DocumentTheme {
    return this.defaultTheme ?? { preset: DEFAULT_PRESET };
  }

  withDefaultTheme(theme: unknown): Brand {
    return new Brand(normalizeTheme(theme), this.presets);
  }

  withoutDefaultTheme(): Brand {
    return new Brand(null, this.presets);
  }

  /** Add a preset, or replace the one the id names. Refused input is refused,
   * not fixed: the user is in front of the form and can be told. */
  savePreset(input: SavePresetInput): Brand {
    const label = requireLabel(input.label);
    const base = baseOf(input.base);
    const index = this.presets.findIndex((preset) => preset.id === input.id);
    if (index >= 0) {
      const updated = [...this.presets];
      updated[index] = presetOf(this.presets[index].id, label, base, input.tokens);
      return new Brand(this.defaultTheme, updated);
    }
    if (this.presets.length >= MAX_PRESETS) {
      throw new InvalidBrandPreset(
        "count",
        `This instance already holds ${MAX_PRESETS} presets — remove one first.`,
      );
    }
    const id = freeId(
      slugOf(label),
      this.presets.map((preset) => preset.id),
    );
    return new Brand(this.defaultTheme, [...this.presets, presetOf(id, label, base, input.tokens)]);
  }

  /** Remove a preset. Documents wearing it fall back to the default look. */
  removePreset(id: string): Brand {
    return new Brand(
      this.defaultTheme,
      this.presets.filter((preset) => preset.id !== id),
    );
  }

  toRecord(): BrandRecord {
    return {
      defaultTheme: this.defaultTheme,
      presets: this.presets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        base: preset.skin ?? DEFAULT_PRESET,
        tokens: preset.tokens,
      })),
    };
  }
}
