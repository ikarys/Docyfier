"use client";

import type { Editor } from "@tiptap/react";
import {
  ChipChoice,
  DENSITY_CHOICES,
  RADIUS_CHOICES,
} from "@/components/design/ChipChoice";
import { PresetGrid } from "@/components/design/PresetGrid";
import { RestyleButton } from "@/components/design/RestyleButton";
import { useRestyle } from "@/components/editor/useRestyle";
import {
  ACCENT_SWATCHES,
  FONT_PAIRS,
  resolveTokens,
  type DocumentTheme,
  type ThemeTokens,
} from "@/lib/themes";

/**
 * Surface for STEP U3: the design side panel. It edits **tokens only** — the
 * document JSON is never touched, so switching a font or an accent can never
 * lose content. A change that equals the preset's own value is stored as an
 * override anyway; "Reset to preset" is the way back.
 *
 * The art direction the model proposes (STEP U7) arrives through the same
 * `onChange`: a suggestion, overridable by every control above it.
 */
export function DesignPanel({
  editor,
  theme,
  onChange,
  onClose,
}: {
  editor: Editor;
  theme: DocumentTheme;
  onChange: (theme: DocumentTheme) => void;
  onClose: () => void;
}) {
  const tokens = resolveTokens(theme);
  const restyle = useRestyle(editor, onChange);

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
        <PresetGrid theme={theme} onChange={onChange} />

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

        <RestyleButton restyle={restyle} />

        <p className="design-hint">
          Design is presentation only — none of these controls change the
          document&apos;s content, and every one of them prints.
        </p>
      </div>
    </aside>
  );
}
