"use client";

import { useActionState, useState } from "react";
import {
  importDocumentsAction,
  saveStorageSettingsAction,
  testStorageAction,
} from "@/app/settings/storage/actions";
import {
  DEFAULT_PORTS,
  type StorageDriver,
  type StorageSettings,
} from "@/lib/settings-types";

type Probe =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; documents: number }
  | { state: "error"; message: string };

type Import =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; imported: number; skipped: number }
  | { state: "error"; message: string };

const DRIVER_LABELS: Record<StorageDriver, string> = {
  files: "Files on disk (default)",
  postgres: "PostgreSQL",
  mysql: "MySQL",
};

/** Where documents are stored: on disk, or in a PostgreSQL / MySQL database. */
export function StorageForm({ initial }: { initial: StorageSettings }) {
  const [saveState, formAction, saving] = useActionState(
    saveStorageSettingsAction,
    null,
  );
  const [driver, setDriver] = useState<StorageDriver>(initial.driver);
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(String(initial.port || DEFAULT_PORTS.postgres));
  const [user, setUser] = useState(initial.user);
  const [password, setPassword] = useState(initial.password);
  const [database, setDatabase] = useState(initial.database);
  const [ssl, setSsl] = useState(initial.ssl);
  const [probe, setProbe] = useState<Probe>({ state: "idle" });
  const [imported, setImported] = useState<Import>({ state: "idle" });

  const isSql = driver !== "files";

  /** Follow the driver's default port unless the user typed their own. */
  const changeDriver = (next: StorageDriver) => {
    const wasDefault = Object.values(DEFAULT_PORTS).includes(Number(port));
    setDriver(next);
    if (next !== "files" && wasDefault) setPort(String(DEFAULT_PORTS[next]));
  };

  const test = async () => {
    setProbe({ state: "loading" });
    const res = await testStorageAction({
      driver,
      host,
      port: Number(port),
      user,
      password,
      database,
      ssl,
    });
    setProbe(
      res.ok
        ? { state: "ok", documents: res.documents }
        : { state: "error", message: res.error },
    );
  };

  const runImport = async () => {
    setImported({ state: "loading" });
    const res = await importDocumentsAction();
    setImported(
      res.ok
        ? { state: "ok", imported: res.imported, skipped: res.skipped }
        : { state: "error", message: res.error },
    );
  };

  return (
    <form action={formAction} className="settings-card">
      <label className="field">
        <span className="field-label">Backend</span>
        <select
          className="field-input"
          name="driver"
          value={driver}
          onChange={(e) => changeDriver(e.target.value as StorageDriver)}
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

      {isSql && (
        <>
          <label className="field">
            <span className="field-label">Host</span>
            <input
              className="field-input"
              name="host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span className="field-label">Port</span>
            <input
              className="field-input"
              name="port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">User</span>
            <input
              className="field-input"
              name="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="field-label">Database</span>
            <input
              className="field-input"
              name="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="docyfier"
              spellCheck={false}
            />
            <span className="field-help">
              The database must already exist. Docyfier creates its
              <code> documents </code> table on first connection.
            </span>
          </label>

          <div className="field">
            <span className="field-label">TLS</span>
            <label className="field-help field-checkbox">
              <input
                type="checkbox"
                name="ssl"
                checked={ssl}
                onChange={(e) => setSsl(e.target.checked)}
              />
              Connect over TLS (required by most hosted databases)
            </label>
            <span className="field-help">
              Certificates are verified: a self-signed certificate must be
              trusted by the system.
            </span>
          </div>
        </>
      )}

      <div className="field">
        <div className="field-row">
          <button
            type="button"
            className="btn"
            disabled={probe.state === "loading"}
            onClick={() => void test()}
          >
            {probe.state === "loading" ? (
              <>
                <span className="spinner" aria-hidden /> Testing…
              </>
            ) : (
              "Test connection"
            )}
          </button>
        </div>
        {probe.state === "ok" && (
          <span className="field-help field-ok">
            ✓ Connected — {probe.documents} document
            {probe.documents === 1 ? "" : "s"} in this backend
          </span>
        )}
        {probe.state === "error" && (
          <span className="field-help field-error">✕ {probe.message}</span>
        )}
      </div>

      <div className="settings-actions">
        {saveState?.error && <span className="field-error">{saveState.error}</span>}
        {saveState?.saved && !saving && <span className="field-ok">Saved ✓</span>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save storage settings"}
        </button>
      </div>

      {initial.driver !== "files" && (
        <div className="field">
          <span className="field-label">Import from files</span>
          <div className="field-row">
            <button
              type="button"
              className="btn"
              disabled={imported.state === "loading"}
              onClick={() => void runImport()}
            >
              {imported.state === "loading" ? (
                <>
                  <span className="spinner" aria-hidden /> Importing…
                </>
              ) : (
                "Import documents from files"
              )}
            </button>
          </div>
          <span className="field-help">
            Copies the documents still stored on disk into the database.
            Documents already there are skipped, and the files are never
            deleted.
          </span>
          {imported.state === "ok" && (
            <span className="field-help field-ok">
              ✓ {imported.imported} imported, {imported.skipped} already present
            </span>
          )}
          {imported.state === "error" && (
            <span className="field-help field-error">✕ {imported.message}</span>
          )}
        </div>
      )}
    </form>
  );
}
