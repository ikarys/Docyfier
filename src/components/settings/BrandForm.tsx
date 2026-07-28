"use client";

import { ThemeControls } from "@/components/design/ThemeControls";
import { SavedPresets } from "@/components/settings/SavedPresets";
import { useBrandSettings } from "@/components/settings/useBrandSettings";
import type { BrandRecord } from "@/lib/settings-types";
import { tokenStyle, presetSkin, resolveTokens, type DocumentTheme } from "@/lib/themes";

/**
 * The instance's visual identity (PLAN.md need #17): the dress new documents
 * start in, and the presets saved for reuse. Nothing here touches an existing
 * document — except through a saved preset, which is the point of saving one.
 */
export function BrandForm({
  initial,
  fallback,
}: {
  initial: BrandRecord;
  fallback: DocumentTheme;
}) {
  const brand = useBrandSettings(initial, fallback);
  const following = initial.defaultTheme === null;

  return (
    <div className="settings-card">
      <div className="brand-preview" data-theme={presetSkin(brand.theme.preset, brand.presets)}>
        <div
          className="brand-preview-sheet"
          style={tokenStyle(resolveTokens(brand.theme, brand.presets))}
        >
          <h2 className="brand-preview-title">A document in this dress</h2>
          <p className="brand-preview-line">
            Headings, accents and spacing as a new document will carry them.
          </p>
        </div>
      </div>

      <ThemeControls
        theme={brand.theme}
        presets={brand.presets}
        onChange={brand.changeTheme}
      />

      <SavedPresets
        presets={brand.presets}
        busy={brand.busy}
        onSave={brand.savePreset}
        onDelete={brand.deletePreset}
      />

      <p className="field-help">
        {following
          ? "New documents currently follow the built-in default. Save to make the dress above theirs."
          : "New documents start in the dress above. A document created from a template keeps the template's own preset, and a generated one keeps the theme the model chose for it."}
      </p>

      <div className="settings-actions">
        {brand.error && <span className="field-error">{brand.error}</span>}
        {brand.saved && !brand.busy && <span className="field-ok">Saved ✓</span>}
        <button
          type="button"
          className="btn"
          disabled={brand.busy}
          onClick={brand.useBuiltInDefault}
        >
          Use the built-in default
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={brand.busy}
          onClick={brand.saveTheme}
        >
          {brand.busy ? "Saving…" : "Save as the default"}
        </button>
      </div>
    </div>
  );
}
