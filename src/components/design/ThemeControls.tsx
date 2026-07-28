"use client";

import {
  ChipChoice,
  DENSITY_CHOICES,
  RADIUS_CHOICES,
} from "@/components/design/ChipChoice";
import { PresetGrid } from "@/components/design/PresetGrid";
import {
  ACCENT_SWATCHES,
  FONT_PAIRS,
  resolveTokens,
  type DocumentTheme,
  type Theme,
  type ThemeTokens,
} from "@/lib/themes";

/**
 * The four token controls, wherever a theme is edited: the Design panel of a
 * document, and the instance's own identity in Settings. Editing a theme is one
 * piece of knowledge, so it has one home.
 *
 * `presets` are the ones this instance saved; the built-ins come with the grid.
 */
export function ThemeControls({
  theme,
  presets,
  onChange,
}: {
  theme: DocumentTheme;
  presets: Theme[];
  onChange: (theme: DocumentTheme) => void;
}) {
  const tokens = resolveTokens(theme, presets);

  const set = <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) =>
    onChange({ ...theme, overrides: { ...theme.overrides, [key]: value } });

  return (
    <>
      <PresetGrid theme={theme} presets={presets} onChange={onChange} />

      <section className="design-section">
        <h3 className="design-label">Accent</h3>
        <div className="accent-row">
          {ACCENT_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              className={
                hex.toLowerCase() === tokens.accent.toLowerCase()
                  ? "accent-dot is-active"
                  : "accent-dot"
              }
              style={{ background: hex }}
              title={hex}
              onClick={() => set("accent", hex)}
            />
          ))}
          <input
            type="color"
            className="accent-picker"
            value={tokens.accent}
            title="Custom accent"
            onChange={(e) => set("accent", e.target.value)}
          />
        </div>
      </section>

      <section className="design-section">
        <h3 className="design-label">Typeface</h3>
        <select
          className="tb-select design-select"
          value={tokens.fontPair}
          onChange={(e) => set("fontPair", e.target.value)}
        >
          {FONT_PAIRS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </section>

      <ChipChoice
        label="Density"
        choices={DENSITY_CHOICES}
        value={tokens.density}
        onChange={(density) => set("density", density)}
      />

      <ChipChoice
        label="Corners"
        choices={RADIUS_CHOICES}
        value={tokens.radius}
        onChange={(radius) => set("radius", radius)}
      />
    </>
  );
}
