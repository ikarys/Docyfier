"use client";

import { useActionState, useState } from "react";
import { saveExportSettingsAction } from "@/app/settings/exports/actions";
import type { ExportTargetInfo } from "@/lib/export/types";
import type { ExportSettingsSummary } from "@/lib/settings-types";

/** A credential option: write-only, like every other secret in Settings. The
 * stored value never comes down, so an untouched field keeps it. */
function SecretOption({
  field,
  label,
  help,
  saved,
}: {
  field: string;
  label: string;
  help?: string;
  saved: boolean;
}) {
  const [value, setValue] = useState("");
  const [cleared, setCleared] = useState(false);

  return (
    <label className="field export-option">
      <span className="field-label">{label}</span>
      <input type="hidden" name={`${field}.cleared`} value={cleared ? "1" : "0"} />
      <input
        className="field-input"
        name={field}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (event.target.value) setCleared(false);
        }}
        placeholder={
          saved && !cleared ? "•••••••• saved — leave empty to keep it" : ""
        }
      />
      <span className="field-help">
        {help ? `${help} ` : ""}Stored encrypted; it never leaves the server.
        {saved && !cleared && !value && (
          <>
            {" "}
            <button
              type="button"
              className="link-button"
              onClick={() => setCleared(true)}
            >
              Remove the saved value
            </button>
          </>
        )}
        {cleared && " The saved value will be removed on save."}
      </span>
    </label>
  );
}

/** One target: the enable switch, plus its own options once it is on. */
function TargetCard({
  target,
  enabled: initiallyEnabled,
  options,
  savedSecrets,
}: {
  target: ExportTargetInfo;
  enabled: boolean;
  options: Record<string, string>;
  savedSecrets: string[];
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
          if (option.type === "secret") {
            return (
              <SecretOption
                key={option.id}
                field={field}
                label={option.label}
                help={option.help}
                saved={savedSecrets.includes(option.id)}
              />
            );
          }
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
  initial: ExportSettingsSummary;
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
          savedSecrets={initial.targets[target.id]?.savedSecrets ?? []}
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
