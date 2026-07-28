"use client";

import { useState } from "react";
import type { Theme } from "@/lib/themes";

/**
 * The presets this instance saved: what is stored, and how the tokens on
 * screen become one more. A preset is referenced by the documents that wear
 * it, so removing one is worth spelling out.
 */
export function SavedPresets({
  presets,
  busy,
  onSave,
  onDelete,
}: {
  presets: Theme[];
  busy: boolean;
  onSave: (label: string) => void;
  onDelete: (id: string) => void;
}) {
  const [label, setLabel] = useState("");

  const save = () => {
    onSave(label);
    setLabel("");
  };

  return (
    <section className="design-section">
      <h3 className="design-label">Saved presets</h3>

      {presets.length === 0 ? (
        <p className="field-help">
          None yet. Set the accent, typeface, density and corners above, then
          save them under a name to reuse them on any document.
        </p>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => (
            <li key={preset.id} className="preset-list-item">
              <span
                className="preset-swatch"
                style={{ background: preset.tokens.accent }}
                aria-hidden
              />
              <span className="preset-name">{preset.label}</span>
              <button
                type="button"
                className="link-button"
                disabled={busy}
                onClick={() => onDelete(preset.id)}
                title="Documents using it fall back to the default look"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="preset-save-row">
        <input
          className="field-input"
          type="text"
          value={label}
          placeholder="Name these tokens, e.g. Acme 2026"
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />
        <button
          type="button"
          className="btn"
          disabled={busy || !label.trim()}
          onClick={save}
        >
          Save as preset
        </button>
      </div>
    </section>
  );
}
