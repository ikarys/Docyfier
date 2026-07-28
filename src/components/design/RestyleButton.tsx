"use client";

import type { Restyle } from "@/components/editor/useRestyle";

/**
 * Hands the document's look to the model: it reads what the document is and
 * answers a preset, an accent, a typeface, a density and a corner style. The
 * content is not sent back and not changed — this button can only restyle.
 */
export function RestyleButton({ restyle }: { restyle: Restyle }) {
  return (
    <section className="design-section">
      <h3 className="design-label">Art direction</h3>
      <button
        type="button"
        className="btn design-restyle"
        disabled={restyle.busy}
        onClick={() => void restyle.run()}
      >
        {restyle.busy ? "Choosing a style…" : "✦ Style for me"}
      </button>
      {restyle.error && (
        <p className="design-hint design-error" role="alert">
          {restyle.error}
        </p>
      )}
    </section>
  );
}
