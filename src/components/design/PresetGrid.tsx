"use client";

import { THEMES, findPreset, type DocumentTheme } from "@/lib/themes";

/**
 * The starting points: a preset is a full token set, and picking one keeps the
 * overrides made on top of it. "Reset" is the way back to the preset alone.
 */
export function PresetGrid({
  theme,
  onChange,
}: {
  theme: DocumentTheme;
  onChange: (theme: DocumentTheme) => void;
}) {
  const hasOverrides = Boolean(theme.overrides && Object.keys(theme.overrides).length);

  return (
    <section className="design-section">
      <h3 className="design-label">Preset</h3>
      <div className="preset-grid">
        {THEMES.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={
              preset.id === theme.preset ? "preset-card is-active" : "preset-card"
            }
            title={preset.hint}
            onClick={() => onChange({ ...theme, preset: preset.id })}
          >
            <span
              className="preset-swatch"
              style={{ background: preset.tokens.accent }}
              aria-hidden
            />
            <span className="preset-name">{preset.label}</span>
          </button>
        ))}
      </div>
      {hasOverrides && (
        <button
          type="button"
          className="chip design-reset"
          onClick={() => onChange({ preset: theme.preset })}
        >
          Reset to {findPreset(theme.preset).label}
        </button>
      )}
    </section>
  );
}
