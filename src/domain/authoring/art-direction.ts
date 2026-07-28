/**
 * How a document should be dressed, in the authoring context's own words.
 *
 * The `documents` context owns themes; this one only ever *proposes* one, so it
 * names the choice rather than importing it. The words it may use are handed in
 * as a vocabulary — the application builds it from the real presets and font
 * pairs — which keeps the two contexts apart and keeps the list of legal values
 * in exactly one place.
 */

export interface ArtChoice {
  id: string;
  /** One line describing what the choice feels like — the model reads it. */
  hint: string;
}

export interface ArtVocabulary {
  presets: readonly ArtChoice[];
  fontPairs: readonly ArtChoice[];
  radii: readonly string[];
  densities: readonly string[];
}

export interface ArtDirection {
  preset: string;
  /** `#rrggbb`, lowercase. */
  accent?: string;
  fontPair?: string;
  radius?: string;
  density?: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

function known(value: unknown, ids: readonly string[]): string | undefined {
  return typeof value === "string" && ids.includes(value) ? value : undefined;
}

function accentOf(value: unknown): string | undefined {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : undefined;
}

/**
 * A model answer as a direction, or `null` when it named no preset we have —
 * the caller then keeps the one its recipe carries. Every override survives on
 * its own: an unusable accent costs the accent, never the direction.
 */
export function readArtDirection(
  json: unknown,
  vocabulary: ArtVocabulary,
): ArtDirection | null {
  if (typeof json !== "object" || json === null) return null;
  const raw = json as Record<string, unknown>;
  const preset = known(raw.preset, vocabulary.presets.map((p) => p.id));
  if (!preset) return null;

  const direction: ArtDirection = { preset };
  const accent = accentOf(raw.accent);
  const fontPair = known(raw.fontPair, vocabulary.fontPairs.map((p) => p.id));
  const radius = known(raw.radius, vocabulary.radii);
  const density = known(raw.density, vocabulary.densities);
  if (accent) direction.accent = accent;
  if (fontPair) direction.fontPair = fontPair;
  if (radius) direction.radius = radius;
  if (density) direction.density = density;
  return direction;
}
