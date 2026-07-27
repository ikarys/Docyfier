"use client";

import { useActionState, useState } from "react";
import { saveExportSettingsAction } from "@/app/settings/exports/actions";
import type { ExportTargetInfo } from "@/lib/export/types";
import type { ExportSettings } from "@/lib/settings-types";

/** One target: the enable switch, plus its own options once it is on. */
function TargetCard({
  target,
  enabled: initiallyEnabled,
  options,
}: {
  target: ExportTargetInfo;
  enabled: boolean;
  options: Record<string, string>;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);

  return (
    <div className="export-target">
      <label className="field-checkbox export-target-head">
        <input
          type="checkbox"
          name={`${target.id}.enabled`}
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <strong>{target.label}</strong>
          <span className="field-help">{target.description}</span>
        </span>
      </label>

      {enabled &&
        target.options.map((option) => {
          const field = `${target.id}.${option.id}`;
          const value = options[option.id] ?? option.default;
          return option.type === "toggle" ? (
            <div className="field export-option" key={option.id}>
              <label className="field-help field-checkbox">
                <input type="checkbox" name={field} defaultChecked={value === "on"} />
                {option.label}
              </label>
              {option.help && <span className="field-help">{option.help}</span>}
            </div>
          ) : (
            <label className="field export-option" key={option.id}>
              <span className="field-label">{option.label}</span>
              <select className="field-input" name={field} defaultValue={value}>
                {option.choices?.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
              {option.help && <span className="field-help">{option.help}</span>}
            </label>
          );
        })}
    </div>
  );
}

/** Which export targets this instance offers, and how each one renders. */
export function ExportsForm({
  targets,
  initial,
}: {
  targets: ExportTargetInfo[];
  initial: ExportSettings;
}) {
  const [state, formAction, saving] = useActionState(saveExportSettingsAction, null);

  return (
    <form action={formAction} className="settings-card">
      {targets.map((target) => (
        <TargetCard
          key={target.id}
          target={target}
          enabled={initial.targets[target.id]?.enabled ?? false}
          options={initial.targets[target.id]?.options ?? {}}
        />
      ))}

      <label className="field">
        <span className="field-label">Public URL of this instance</span>
        <input
          className="field-input"
          name="publicBaseUrl"
          type="url"
          placeholder="https://docs.example.com"
          defaultValue={initial.publicBaseUrl}
        />
        <span className="field-help">
          Images are exported as absolute URLs so the receiving tool can load
          them. Leave empty and images will only resolve from inside this
          instance.
        </span>
      </label>

      <div className="settings-actions">
        {state?.error && <span className="field-error">{state.error}</span>}
        {state?.saved && !saving && <span className="field-ok">Saved ✓</span>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
