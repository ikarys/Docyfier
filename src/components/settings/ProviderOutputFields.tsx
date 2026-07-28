"use client";

import type { AiProviderSummary } from "@/lib/settings-types";

/** How much the model may answer, and how tightly its answer is constrained. */
export function ProviderOutputFields({ initial }: { initial: AiProviderSummary }) {
  return (
    <>
      <label className="field">
        <span className="field-label">Max output tokens</span>
        <input
          className="field-input"
          name="maxOutputTokens"
          type="number"
          min={256}
          step={256}
          defaultValue={initial.maxOutputTokens}
        />
        <span className="field-help">
          Ceiling per AI response. Whole-document edits need room: large
          documents may require 16k-64k. Higher = slower on local models.
        </span>
      </label>

      <div className="field">
        <span className="field-label">Structured output</span>
        <label className="field-help field-checkbox">
          <input
            type="checkbox"
            name="structuredOutput"
            defaultChecked={initial.structuredOutput}
          />
          Constrain answers with a JSON schema
        </label>
        <span className="field-help">
          Stops models that wrap their answer in fences or commentary — but only
          on servers that implement JSON-schema output. Docyfier falls back to
          plain text parsing when the provider refuses.
        </span>
      </div>
    </>
  );
}
