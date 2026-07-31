"use client";

import type { AiProviderSummary } from "@/lib/settings-types";
import { effortChoices } from "./reasoning-labels";

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
          {effortChoices().map((choice) => (
            <option key={choice.value} value={choice.value} title={choice.hint}>
              {choice.label}
            </option>
          ))}
        </select>
        <span className="field-help">
          Reasoning models think before they answer, and that thinking is most
          of the wait: minutes before the first word, on every action.
          Formatting work rarely needs it — lower it here. Not every server
          ignores a setting it does not support: some stall on it instead, so
          &quot;Off&quot; is what to try when answers never arrive.
        </span>
      </label>
    </>
  );
}
