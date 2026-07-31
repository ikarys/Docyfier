"use client";

import { REASONING_EFFORTS } from "@/domain/configuration/ai-provider";
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

      <label className="field">
        <span className="field-label">Reasoning effort</span>
        <select
          className="field-input"
          name="reasoningEffort"
          defaultValue={initial.reasoningEffort ?? "default"}
        >
          {REASONING_EFFORTS.map((effort) => (
            <option key={effort} value={effort}>
              {effort === "default" ? "Model's own default" : effort}
            </option>
          ))}
        </select>
        <span className="field-help">
          Reasoning models think before they answer, and that thinking is most
          of the wait: several seconds before the first word, on every action.
          Formatting work rarely needs it — lower it here. A server that does
          not support the setting ignores it.
        </span>
      </label>
    </>
  );
}
