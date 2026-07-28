"use client";

import { useActionState, useState } from "react";
import {
  saveStorageSettingsAction,
  testStorageAction,
} from "@/app/settings/storage/actions";
import type { StorageDriver, StorageSettingsSummary } from "@/lib/settings-types";
import { FilesImportSection } from "./FilesImportSection";
import { StorageConnectionFields } from "./StorageConnectionFields";
import { connectionFrom, withDriver } from "./connection-fields";
import { useAttempt } from "./useAttempt";

const DRIVER_LABELS: Record<StorageDriver, string> = {
  files: "Files on disk (default)",
  postgres: "PostgreSQL",
  mysql: "MySQL",
};

/** Where documents are stored: on disk, or in a PostgreSQL / MySQL database. */
export function StorageForm({ initial }: { initial: StorageSettingsSummary }) {
  const [saveState, formAction, saving] = useActionState(saveStorageSettingsAction, null);
  const [fields, setFields] = useState(() => connectionFrom(initial));
  const probe = useAttempt<{ documents: number }>();

  const test = () =>
    probe.run(() =>
      testStorageAction(
        { ...fields, port: Number(fields.port), password: fields.password.value },
        fields.password.cleared,
      ),
    );

  return (
    <form action={formAction} className="settings-card">
      <label className="field">
        <span className="field-label">Backend</span>
        <select
          className="field-input"
          name="driver"
          value={fields.driver}
          onChange={(e) => setFields(withDriver(fields, e.target.value as StorageDriver))}
        >
          {(Object.keys(DRIVER_LABELS) as StorageDriver[]).map((id) => (
            <option key={id} value={id}>
              {DRIVER_LABELS[id]}
            </option>
          ))}
        </select>
        <span className="field-help">
          Documents live as JSON files under the data directory, or as rows in a
          database. The connection below is always stored on disk — it cannot
          live in the database it configures.
        </span>
      </label>

      {fields.driver !== "files" && (
        <StorageConnectionFields
          fields={fields}
          hasSavedPassword={initial.hasPassword}
          change={setFields}
        />
      )}

      <div className="field">
        <div className="field-row">
          <button
            type="button"
            className="btn"
            disabled={probe.attempt.state === "running"}
            onClick={() => void test()}
          >
            {probe.attempt.state === "running" ? (
              <>
                <span className="spinner" aria-hidden /> Testing…
              </>
            ) : (
              "Test connection"
            )}
          </button>
        </div>
        {probe.attempt.state === "done" && (
          <span className="field-help field-ok">
            ✓ Connected — {probe.attempt.result.documents} document
            {probe.attempt.result.documents === 1 ? "" : "s"} in this backend
          </span>
        )}
        {probe.attempt.state === "failed" && (
          <span className="field-help field-error">✕ {probe.attempt.message}</span>
        )}
      </div>

      <div className="settings-actions">
        {saveState?.error && <span className="field-error">{saveState.error}</span>}
        {saveState?.saved && !saving && <span className="field-ok">Saved ✓</span>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save storage settings"}
        </button>
      </div>

      {initial.driver !== "files" && <FilesImportSection />}
    </form>
  );
}
