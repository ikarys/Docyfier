"use client";

import {
  ACCENT_SWATCHES,
  FONT_PAIRS,
  THEMES,
  findPreset,
  resolveTokens,
  type DocumentTheme,
  type ThemeDensity,
  type ThemeRadius,
  type ThemeTokens,
} from "@/lib/themes";

const DENSITIES: { id: ThemeDensity; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "airy", label: "Airy" },
];

const RADII: { id: ThemeRadius; label: string }[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];

/**
 * Surface for STEP U3: the design side panel. It edits **tokens only** — the
 * document JSON is never touched, so switching a font or an accent can never
 * lose content. A change that equals the preset's own value is stored as an
 * override anyway; "Reset to preset" is the way back.
 */
export function DesignPanel({
  theme,
  onChange,
  onClose,
}: {
  theme: DocumentTheme;
  onChange: (theme: DocumentTheme) => void;
  onClose: () => void;
}) {
  const tokens = resolveTokens(theme);
  const hasOverrides = Boolean(theme.overrides && Object.keys(theme.overrides).length);

  const set = <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) =>
    onChange({ ...theme, overrides: { ...theme.overrides, [key]: value } });

  return (
    <aside className="ai-panel design-panel no-print">
      <div className="ai-panel-head">
        <span className="ai-panel-title">◐ Design</span>
        <button className="ai-panel-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="design-body">
        <section className="design-section">
          <h3 className="design-label">Preset</h3>
          <div className="preset-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  t.id === theme.preset ? "preset-card is-active" : "preset-card"
                }
                title={t.hint}
                onClick={() => onChange({ ...theme, preset: t.id })}
              >
                <span
                  className="preset-swatch"
                  style={{ background: t.tokens.accent }}
                  aria-hidden
                />
                <span className="preset-name">{t.label}</span>
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

        <section className="design-section">
          <h3 className="design-label">Density</h3>
          <div className="design-radio-row">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={d.id === tokens.density ? "chip is-active" : "chip"}
                onClick={() => set("density", d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-label">Corners</h3>
          <div className="design-radio-row">
            {RADII.map((r) => (
              <button
                key={r.id}
                type="button"
                className={r.id === tokens.radius ? "chip is-active" : "chip"}
                onClick={() => set("radius", r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <p className="design-hint">
          Design is presentation only — none of these controls change the
          document&apos;s content, and every one of them prints.
        </p>
      </div>
    </aside>
  );
}
